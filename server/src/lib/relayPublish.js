// Publicação no relay de tempo real (mesmo relay WebSocket usado pela landing).
//
// Habilita o caminho CRM -> cliente: quando o arquiteto salva/envia um projeto 3D,
// o servidor avisa o relay e o visitante conectado vê a mudança ao vivo.
//
// Em serverless (Vercel) não há socket persistente, então cada publicação abre uma
// conexão efêmera, envia e fecha. É fire-and-forget: NUNCA bloqueia a resposta HTTP
// nem lança. Fica inerte enquanto RELAY_URL não estiver definido (produção atual).

import { WebSocket } from "ws";

function relayUrl() {
  return (process.env.RELAY_URL || process.env.COLLAB_WS_URL || "").trim();
}

export function relayConfigured() {
  return !!relayUrl();
}

/**
 * Publica um evento num tópico do relay (broadcast pub/sub). Fire-and-forget.
 * @returns {boolean} true se tentou publicar (relay configurado), false se inerte.
 */
export function publishToRelay(topic, data) {
  const url = relayUrl();
  if (!url || !topic) return false;
  try {
    const ws = new WebSocket(url);
    const kill = () => {
      try {
        ws.terminate();
      } catch {
        /* noop */
      }
    };
    const timer = setTimeout(kill, 2500);
    if (timer.unref) timer.unref();
    ws.on("open", () => {
      try {
        ws.send(JSON.stringify({ t: "pub", topic, data }));
      } catch {
        /* noop */
      }
      setTimeout(() => {
        try {
          ws.close();
        } catch {
          /* noop */
        }
      }, 100);
    });
    ws.on("close", () => clearTimeout(timer));
    ws.on("error", () => {
      clearTimeout(timer);
      kill();
    });
    return true;
  } catch {
    return false;
  }
}

/** Atalho: notifica a sala colaborativa de um projeto que houve mudança vinda do CRM. */
export function notifyProjectUpdated(projetoId, payload = {}) {
  if (!projetoId) return false;
  return publishToRelay(`collab:${projetoId}`, {
    kind: "crm-update",
    projetoId,
    at: Date.now(),
    ...payload,
  });
}
