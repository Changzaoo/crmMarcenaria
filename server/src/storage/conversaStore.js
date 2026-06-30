// ============================================================
// conversaStore — persistência das conversas do Assistente de IA (chat do site).
// Toda conversa vira uma linha em `conversas`; cada turno vira `mensagens`.
// Quando o visitante é qualificado, a conversa é vinculada a um lead.
// ============================================================
import { randomUUID } from "crypto";
import { db } from "../db/index.js";

const novoId = () => randomUUID().replace(/-/g, "");
const agora = () => new Date().toISOString().slice(0, 19).replace("T", " ");

/** Cria uma conversa nova e retorna o id. */
export function criarConversa({ origem } = {}) {
  const id = novoId();
  db.prepare("INSERT INTO conversas (id, canal, origem) VALUES (?,?,?)").run(
    id,
    "chat-site",
    origem ? String(origem).slice(0, 300) : null
  );
  return id;
}

export function obterConversaRaw(id) {
  if (!id) return null;
  return db.prepare("SELECT * FROM conversas WHERE id = ? LIMIT 1").get(id) || null;
}

/** Garante uma conversa válida: usa a informada ou cria uma nova. */
export function garantirConversa(id, { origem } = {}) {
  const existing = obterConversaRaw(id);
  if (existing) return existing.id;
  return criarConversa({ origem });
}

/** Acrescenta uma mensagem à conversa e atualiza o carimbo. */
export function appendMensagem(conversaId, role, conteudo) {
  if (!conversaId || !conteudo) return;
  db.prepare(
    "INSERT INTO mensagens (id, conversa_id, role, conteudo, criado_em) VALUES (?,?,?,?,?)"
  ).run(novoId(), conversaId, role, String(conteudo).slice(0, 8000), agora());
  db.prepare("UPDATE conversas SET atualizado_em = ? WHERE id = ?").run(agora(), conversaId);
}

/** Atualiza campos da conversa (contato, status, vínculo de lead, resumo…). */
export function atualizarConversa(id, patch = {}) {
  const campos = ["lead_id", "nome", "email", "whatsapp", "cidade_estado", "tipo_projeto", "status", "resumo"];
  const sets = [];
  const vals = [];
  for (const c of campos) {
    if (patch[c] !== undefined) {
      sets.push(`${c} = ?`);
      vals.push(patch[c]);
    }
  }
  if (patch.convertida !== undefined) {
    sets.push("convertida = ?");
    vals.push(patch.convertida ? 1 : 0);
  }
  if (!sets.length) return;
  sets.push("atualizado_em = ?");
  vals.push(agora());
  vals.push(id);
  db.prepare(`UPDATE conversas SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

/** Marca a conversa como convertida e vincula o lead criado. */
export function vincularLead(conversaId, leadId, dados = {}) {
  atualizarConversa(conversaId, {
    lead_id: leadId,
    convertida: 1,
    status: "convertida",
    nome: dados.nome ?? undefined,
    email: dados.email ?? undefined,
    whatsapp: dados.whatsapp ?? undefined,
    cidade_estado: dados.cidade_estado ?? undefined,
    tipo_projeto: dados.tipo_projeto ?? undefined,
  });
}

/** Lista as conversas (mais recentes primeiro) com contagem e prévia. */
export function listarConversas() {
  const rows = db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM mensagens m WHERE m.conversa_id = c.id) AS total_mensagens,
              (SELECT m.conteudo FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.criado_em DESC, m.id DESC LIMIT 1) AS ultima_mensagem
         FROM conversas c
        ORDER BY c.atualizado_em DESC, c.criado_em DESC`
    )
    .all();
  return rows;
}

/** Retorna a conversa + todas as mensagens em ordem cronológica. */
export function obterConversaComMensagens(id) {
  const conversa = obterConversaRaw(id);
  if (!conversa) return null;
  const mensagens = db
    .prepare("SELECT id, role, conteudo, criado_em FROM mensagens WHERE conversa_id = ? ORDER BY criado_em ASC, id ASC")
    .all(id);
  return { ...conversa, mensagens };
}

/** Remove uma conversa e suas mensagens. */
export function removerConversa(id) {
  db.prepare("DELETE FROM mensagens WHERE conversa_id = ?").run(id);
  db.prepare("DELETE FROM conversas WHERE id = ?").run(id);
  return { ok: true };
}
