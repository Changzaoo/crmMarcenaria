import { Router } from "express";
import { db } from "../db/index.js";

// Rotas do arquiteto/suporte (autenticadas) para acompanhar os leads do 3D.
const r = Router();

const agora = () => new Date().toISOString().slice(0, 19).replace("T", " ");

const STATUS = ["Novo", "Em atendimento", "Projeto analisado", "Proposta enviada", "Fechado", "Perdido"];

r.get("/", (_req, res) => {
  const leads = db
    .prepare(
      `SELECT l.*, p.status AS projeto_status, p.atualizado_em AS projeto_atualizado_em
         FROM leads_3d l
         LEFT JOIN projetos_3d p ON p.id = l.projeto_id
        ORDER BY l.criado_em DESC`
    )
    .all();
  res.json(leads);
});

r.get("/:id", (req, res) => {
  const lead = db.prepare("SELECT * FROM leads_3d WHERE id = ?").get(req.params.id);
  if (!lead) return res.status(404).json({ erro: "Lead não encontrado." });
  const projeto = lead.projeto_id
    ? db.prepare("SELECT * FROM projetos_3d WHERE id = ?").get(lead.projeto_id)
    : null;
  if (projeto) {
    try {
      projeto.doc = projeto.doc ? JSON.parse(projeto.doc) : {};
    } catch {
      projeto.doc = {};
    }
  }
  res.json({ ...lead, projeto });
});

r.patch("/:id", (req, res) => {
  const b = req.body || {};
  const lead = db.prepare("SELECT * FROM leads_3d WHERE id = ?").get(req.params.id);
  if (!lead) return res.status(404).json({ erro: "Lead não encontrado." });

  db.prepare(
    "UPDATE leads_3d SET status = COALESCE(?, status), anotacoes = COALESCE(?, anotacoes), atualizado_em = ? WHERE id = ?"
  ).run(b.status ?? null, b.anotacoes ?? null, agora(), req.params.id);

  res.json(db.prepare("SELECT * FROM leads_3d WHERE id = ?").get(req.params.id));
});

r.get("/meta/status", (_req, res) => res.json({ status: STATUS }));

export default r;
