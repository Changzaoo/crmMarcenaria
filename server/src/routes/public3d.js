import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import { heartbeat, leave, pushDoc, getState } from "../lib/collab3d.js";

// Rotas PÚBLICAS do Orçamento 3D (sem autenticação) — usadas pelo visitante
// que monta o ambiente. Montadas em /api/public ANTES do middleware de auth.
const r = Router();

const agora = () => new Date().toISOString().slice(0, 19).replace("T", " ");

function lerProjeto(id) {
  const p = db.prepare("SELECT * FROM projetos_3d WHERE id = ?").get(id);
  if (!p) return null;
  let doc = {};
  try {
    doc = p.doc ? JSON.parse(p.doc) : {};
  } catch {
    doc = {};
  }
  return { ...p, doc };
}

// ---------- Lead obrigatório antes do 3D ----------
r.post("/leads-3d", (req, res) => {
  const b = req.body || {};
  if (!b.nome || !b.email || !b.whatsapp) {
    return res.status(400).json({ erro: "Preencha nome, e-mail e WhatsApp." });
  }
  if (!b.aceite) {
    return res.status(400).json({ erro: "É necessário aceitar o contato da equipe." });
  }

  const leadId = randomUUID();
  const projetoId = randomUUID();

  db.prepare(
    `INSERT INTO leads_3d (id, nome, email, whatsapp, cidade_estado, tipo_projeto, prazo, faixa_orcamento, descricao, aceite, projeto_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    leadId,
    b.nome,
    b.email || null,
    b.whatsapp || null,
    b.cidade_estado || null,
    b.tipo_projeto || null,
    b.prazo || null,
    b.faixa_orcamento || null,
    b.descricao || null,
    b.aceite ? 1 : 0,
    projetoId
  );

  const docInicial = JSON.stringify(b.doc || {});
  db.prepare(
    "INSERT INTO projetos_3d (id, lead_id, nome, doc, status) VALUES (?,?,?,?,?)"
  ).run(projetoId, leadId, b.tipo_projeto || "Projeto 3D", docInicial, "rascunho");

  res.json({ leadId, projetoId });
});

// ---------- Projeto 3D (carregar / salvar) ----------
r.get("/projetos-3d/:id", (req, res) => {
  const p = lerProjeto(req.params.id);
  if (!p) return res.status(404).json({ erro: "Projeto não encontrado." });
  res.json(p);
});

r.put("/projetos-3d/:id", (req, res) => {
  const b = req.body || {};
  const p = db.prepare("SELECT id FROM projetos_3d WHERE id = ?").get(req.params.id);
  if (!p) return res.status(404).json({ erro: "Projeto não encontrado." });

  const doc = JSON.stringify(b.doc || {});
  db.prepare(
    "UPDATE projetos_3d SET doc = ?, nome = COALESCE(?, nome), status = COALESCE(?, status), atualizado_em = ? WHERE id = ?"
  ).run(doc, b.nome || null, b.status || null, agora(), req.params.id);

  res.json(lerProjeto(req.params.id));
});

// ---------- Pré-orçamento / enviar para análise ----------
r.post("/projetos-3d/:id/enviar", (req, res) => {
  const b = req.body || {};
  const p = lerProjeto(req.params.id);
  if (!p) return res.status(404).json({ erro: "Projeto não encontrado." });

  if (b.doc) {
    db.prepare("UPDATE projetos_3d SET doc = ?, atualizado_em = ? WHERE id = ?").run(
      JSON.stringify(b.doc),
      agora(),
      req.params.id
    );
  }
  db.prepare("UPDATE projetos_3d SET status = ?, atualizado_em = ? WHERE id = ?").run(
    "enviado_analise",
    agora(),
    req.params.id
  );

  if (p.lead_id) {
    db.prepare("UPDATE leads_3d SET status = ?, atualizado_em = ? WHERE id = ?").run(
      "Projeto 3D enviado para análise",
      agora(),
      p.lead_id
    );
  }

  res.json({ ok: true });
});

// ---------- Sessão colaborativa (relay por polling) ----------
r.post("/sessao/:id/heartbeat", (req, res) => {
  res.json(heartbeat(req.params.id, req.body || {}));
});

r.get("/sessao/:id/state", (req, res) => {
  res.json(getState(req.params.id));
});

r.post("/sessao/:id/doc", (req, res) => {
  res.json(pushDoc(req.params.id, (req.body || {}).doc));
});

r.post("/sessao/:id/leave", (req, res) => {
  leave(req.params.id, (req.body || {}).peerId);
  res.json({ ok: true });
});

export default r;
