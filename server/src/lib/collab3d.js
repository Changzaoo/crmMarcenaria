// Relay de sessão colaborativa do Orçamento 3D.
//
// Implementação inicial em MEMÓRIA com polling REST: simples, sem dependências
// novas e funcional para cliente + arquiteto no mesmo ambiente. A interface
// (join/leave/heartbeat/pushDoc/getState) foi desenhada para ser trocada por
// WebSocket/Supabase Realtime no futuro sem alterar as rotas nem o client.

const SESSIONS = new Map(); // projetoId -> { rev, doc, docRev, peers: Map<peerId, peer> }
const PEER_TTL_MS = 9000; // remove participante inativo

function getSession(projetoId) {
  let s = SESSIONS.get(projetoId);
  if (!s) {
    s = { rev: 0, doc: null, docRev: 0, peers: new Map() };
    SESSIONS.set(projetoId, s);
  }
  return s;
}

function prunePeers(session) {
  const agora = Date.now();
  let mudou = false;
  for (const [id, p] of session.peers) {
    if (agora - p.lastSeen > PEER_TTL_MS) {
      session.peers.delete(id);
      mudou = true;
    }
  }
  if (mudou) session.rev++;
}

function peersPublicos(session) {
  return [...session.peers.values()].map((p) => ({
    peerId: p.peerId,
    role: p.role,
    nome: p.nome,
    x: p.x,
    z: p.z,
    ry: p.ry,
    color: p.color,
    online: true,
  }));
}

// Heartbeat + posição do avatar. Retorna o estado consolidado da sessão.
export function heartbeat(projetoId, peer) {
  const session = getSession(projetoId);
  const existente = session.peers.get(peer.peerId) || {};
  session.peers.set(peer.peerId, {
    peerId: peer.peerId,
    role: peer.role || "cliente",
    nome: peer.nome || (peer.role === "arquiteto" ? "Arquiteto" : "Cliente"),
    x: typeof peer.x === "number" ? peer.x : existente.x ?? 0,
    z: typeof peer.z === "number" ? peer.z : existente.z ?? 0,
    ry: typeof peer.ry === "number" ? peer.ry : existente.ry ?? 0,
    color: peer.color || existente.color || null,
    lastSeen: Date.now(),
  });
  session.rev++;
  prunePeers(session);
  return getState(projetoId);
}

export function leave(projetoId, peerId) {
  const session = SESSIONS.get(projetoId);
  if (!session) return;
  if (session.peers.delete(peerId)) session.rev++;
}

// Publica o documento (ambiente + móveis). docRev cresce a cada alteração.
//
// seed=true: usado por quem ENTRA na sessão para semear o relay com o ambiente
// que já tem em mãos (carregado do banco). Só grava se a sessão ainda não tem
// documento — assim quem chega primeiro garante que o próximo a entrar veja o
// ambiente de imediato, sem clobberar edições ao vivo já presentes no relay.
export function pushDoc(projetoId, doc, { seed = false } = {}) {
  const session = getSession(projetoId);
  if (doc == null) return { docRev: session.docRev, seeded: false };
  if (seed && session.doc) return { docRev: session.docRev, seeded: false };
  session.doc = doc;
  session.docRev++;
  session.rev++;
  return { docRev: session.docRev, seeded: true };
}

export function getState(projetoId) {
  const session = getSession(projetoId);
  prunePeers(session);
  return {
    rev: session.rev,
    docRev: session.docRev,
    doc: session.doc,
    peers: peersPublicos(session),
    arquitetoOnline: peersPublicos(session).some((p) => p.role === "arquiteto"),
    clienteOnline: peersPublicos(session).some((p) => p.role === "cliente"),
  };
}
