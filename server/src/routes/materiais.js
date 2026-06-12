import { Router } from "express";
import { db } from "../db/index.js";

const r = Router();

r.get("/", (req, res) => {
  const { categoria } = req.query;
  let sql = "SELECT * FROM materiais";
  const params = [];
  if (categoria) {
    sql += " WHERE categoria = ?";
    params.push(categoria);
  }
  sql += " ORDER BY categoria, nome";
  res.json(db.prepare(sql).all(...params));
});

r.get("/categorias", (_req, res) => {
  res.json(db.prepare("SELECT DISTINCT categoria FROM materiais ORDER BY categoria").all().map((x) => x.categoria));
});

r.post("/", (req, res) => {
  const b = req.body;
  if (!b.nome) return res.status(400).json({ erro: "Informe o nome do material." });
  const info = db
    .prepare("INSERT INTO materiais (nome, categoria, unidade, preco_custo, fornecedor) VALUES (?,?,?,?,?)")
    .run(b.nome, b.categoria || "Outro", b.unidade || "un", b.preco_custo || 0, b.fornecedor);
  res.json(db.prepare("SELECT * FROM materiais WHERE id = ?").get(info.lastInsertRowid));
});

r.put("/:id", (req, res) => {
  const b = req.body;
  db.prepare("UPDATE materiais SET nome=?, categoria=?, unidade=?, preco_custo=?, fornecedor=?, ativo=? WHERE id=?")
    .run(b.nome, b.categoria, b.unidade, b.preco_custo || 0, b.fornecedor, b.ativo ? 1 : 0, req.params.id);
  res.json(db.prepare("SELECT * FROM materiais WHERE id = ?").get(req.params.id));
});

r.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM materiais WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default r;
