import { Router } from "express";
import { db } from "../db/index.js";

const r = Router();

r.get("/", (_req, res) => {
  res.json(db.prepare("SELECT * FROM funcionarios ORDER BY ativo DESC, nome").all());
});

r.post("/", (req, res) => {
  const b = req.body || {};
  const nome = (b.nome || "").trim();
  if (!nome) return res.status(400).json({ erro: "Informe o nome do funcionário." });
  const info = db
    .prepare("INSERT INTO funcionarios (nome, funcao, email, telefone, cor, ativo, observacoes) VALUES (?,?,?,?,?,?,?)")
    .run(nome, b.funcao || null, b.email || null, b.telefone || null, b.cor || null, b.ativo === 0 ? 0 : 1, b.observacoes || null);
  res.json(db.prepare("SELECT * FROM funcionarios WHERE id = ?").get(info.lastInsertRowid));
});

r.put("/:id", (req, res) => {
  const b = req.body || {};
  const atual = db.prepare("SELECT * FROM funcionarios WHERE id = ?").get(req.params.id);
  if (!atual) return res.status(404).json({ erro: "Funcionário não encontrado." });
  db.prepare(
    "UPDATE funcionarios SET nome=?, funcao=?, email=?, telefone=?, cor=?, ativo=?, observacoes=? WHERE id=?"
  ).run(
    (b.nome ?? atual.nome).trim() || atual.nome,
    b.funcao ?? atual.funcao,
    b.email ?? atual.email,
    b.telefone ?? atual.telefone,
    b.cor ?? atual.cor,
    b.ativo === undefined ? atual.ativo : b.ativo ? 1 : 0,
    b.observacoes ?? atual.observacoes,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM funcionarios WHERE id = ?").get(req.params.id));
});

r.delete("/:id", (req, res) => {
  // Desvincula das etapas antes de remover (sem FK, fazemos a limpeza aqui).
  db.prepare("UPDATE projeto_etapas SET funcionario_id = NULL WHERE funcionario_id = ?").run(req.params.id);
  db.prepare("DELETE FROM funcionarios WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default r;
