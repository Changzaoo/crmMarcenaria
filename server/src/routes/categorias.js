import { Router } from "express";
import { db } from "../db/index.js";
import { inferirModelo, MODELOS_CATEGORIA } from "../db/schema.js";

const r = Router();

r.get("/", (_req, res) => {
  res.json(db.prepare("SELECT * FROM categorias ORDER BY ordem, nome").all());
});

r.post("/", (req, res) => {
  const b = req.body || {};
  const nome = (b.nome || "").trim();
  if (!nome) return res.status(400).json({ erro: "Informe o nome da categoria." });
  if (db.prepare("SELECT id FROM categorias WHERE nome = ? COLLATE NOCASE").get(nome))
    return res.status(400).json({ erro: "Já existe uma categoria com esse nome." });
  const modelo = MODELOS_CATEGORIA.includes(b.modelo) ? b.modelo : inferirModelo(nome);
  const max = db.prepare("SELECT COALESCE(MAX(ordem), 0) m FROM categorias").get().m;
  const info = db
    .prepare("INSERT INTO categorias (nome, modelo, descricao, ordem) VALUES (?,?,?,?)")
    .run(nome, modelo, b.descricao || null, max + 1);
  res.json(db.prepare("SELECT * FROM categorias WHERE id = ?").get(info.lastInsertRowid));
});

r.put("/:id", (req, res) => {
  const b = req.body || {};
  const atual = db.prepare("SELECT * FROM categorias WHERE id = ?").get(req.params.id);
  if (!atual) return res.status(404).json({ erro: "Categoria não encontrada." });
  const nome = (b.nome || atual.nome).trim();
  if (!nome) return res.status(400).json({ erro: "Informe o nome da categoria." });
  if (nome.toLowerCase() !== atual.nome.toLowerCase()) {
    if (db.prepare("SELECT id FROM categorias WHERE nome = ? COLLATE NOCASE AND id != ?").get(nome, req.params.id))
      return res.status(400).json({ erro: "Já existe uma categoria com esse nome." });
    // Renomeia em cascata os materiais que usam o nome antigo.
    db.prepare("UPDATE materiais SET categoria = ? WHERE categoria = ?").run(nome, atual.nome);
  }
  const modelo = MODELOS_CATEGORIA.includes(b.modelo) ? b.modelo : atual.modelo;
  db.prepare("UPDATE categorias SET nome=?, modelo=?, descricao=? WHERE id=?")
    .run(nome, modelo, b.descricao ?? atual.descricao, req.params.id);
  res.json(db.prepare("SELECT * FROM categorias WHERE id = ?").get(req.params.id));
});

r.delete("/:id", (req, res) => {
  const atual = db.prepare("SELECT * FROM categorias WHERE id = ?").get(req.params.id);
  if (!atual) return res.json({ ok: true });
  const usados = db.prepare("SELECT COUNT(*) c FROM materiais WHERE categoria = ?").get(atual.nome).c;
  if (usados > 0)
    return res.status(400).json({ erro: `Há ${usados} material(is) nessa categoria. Mova-os antes de excluir.` });
  db.prepare("DELETE FROM categorias WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default r;
