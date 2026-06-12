import { Router } from "express";
import { db } from "../db/index.js";

const r = Router();

// Atualiza status de parcelas vencidas antes de listar
function atualizarAtrasos() {
  const hoje = new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE parcelas SET status='atrasado' WHERE status='a_receber' AND vencimento < ?").run(hoje);
}

r.get("/parcelas", (req, res) => {
  atualizarAtrasos();
  const { projeto_id } = req.query;
  let sql = `SELECT pa.*, p.nome AS projeto_nome, e.nome_fantasia AS empresa_nome
             FROM parcelas pa
             JOIN projetos p ON p.id = pa.projeto_id
             LEFT JOIN empresas e ON e.id = p.empresa_id`;
  const params = [];
  if (projeto_id) {
    sql += " WHERE pa.projeto_id = ?";
    params.push(projeto_id);
  }
  sql += " ORDER BY pa.vencimento";
  res.json(db.prepare(sql).all(...params));
});

r.post("/parcelas", (req, res) => {
  const b = req.body;
  const info = db.prepare(
    "INSERT INTO parcelas (projeto_id, descricao, valor, vencimento, status, recebido_em) VALUES (?,?,?,?,?,?)"
  ).run(b.projeto_id, b.descricao || "Parcela", b.valor || 0, b.vencimento, b.status || "a_receber", b.recebido_em || null);
  res.json(db.prepare("SELECT * FROM parcelas WHERE id = ?").get(info.lastInsertRowid));
});

r.patch("/parcelas/:id", (req, res) => {
  const b = req.body;
  const recebido = b.status === "recebido" ? (b.recebido_em || new Date().toISOString().slice(0, 10)) : null;
  db.prepare("UPDATE parcelas SET descricao=COALESCE(?,descricao), valor=COALESCE(?,valor), vencimento=COALESCE(?,vencimento), status=COALESCE(?,status), recebido_em=? WHERE id=?")
    .run(b.descricao ?? null, b.valor ?? null, b.vencimento ?? null, b.status ?? null, recebido, req.params.id);
  res.json(db.prepare("SELECT * FROM parcelas WHERE id = ?").get(req.params.id));
});

r.delete("/parcelas/:id", (req, res) => {
  db.prepare("DELETE FROM parcelas WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default r;
