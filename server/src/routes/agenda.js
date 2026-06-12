import { Router } from "express";
import { db } from "../db/index.js";

const r = Router();

r.get("/", (req, res) => {
  const rows = db.prepare(
    `SELECT a.*, n.titulo AS negocio_titulo, p.nome AS projeto_nome
     FROM eventos_agenda a
     LEFT JOIN negocios n ON n.id = a.negocio_id
     LEFT JOIN projetos p ON p.id = a.projeto_id
     ORDER BY a.data, a.hora`
  ).all();
  // marca conflitos (mesma data)
  const porData = {};
  for (const e of rows) porData[e.data] = (porData[e.data] || 0) + 1;
  for (const e of rows) e.conflito = porData[e.data] > 1;
  res.json(rows);
});

r.post("/", (req, res) => {
  const b = req.body;
  if (!b.titulo || !b.data) return res.status(400).json({ erro: "Informe título e data." });
  const info = db.prepare(
    `INSERT INTO eventos_agenda (titulo, tipo, data, hora, negocio_id, projeto_id, responsavel, observacoes)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(b.titulo, b.tipo || "reuniao", b.data, b.hora, b.negocio_id || null, b.projeto_id || null, b.responsavel, b.observacoes);
  res.json(db.prepare("SELECT * FROM eventos_agenda WHERE id = ?").get(info.lastInsertRowid));
});

r.put("/:id", (req, res) => {
  const b = req.body;
  db.prepare(
    `UPDATE eventos_agenda SET titulo=?, tipo=?, data=?, hora=?, negocio_id=?, projeto_id=?, responsavel=?, observacoes=?, concluido=? WHERE id=?`
  ).run(b.titulo, b.tipo, b.data, b.hora, b.negocio_id || null, b.projeto_id || null, b.responsavel, b.observacoes, b.concluido ? 1 : 0, req.params.id);
  res.json(db.prepare("SELECT * FROM eventos_agenda WHERE id = ?").get(req.params.id));
});

r.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM eventos_agenda WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default r;
