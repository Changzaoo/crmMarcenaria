import { Router } from "express";
import { db } from "../db/index.js";

const r = Router();

// Lista de empresas com contagem de contatos e (opcional) flag arquiteto
r.get("/", (req, res) => {
  const { arquiteto } = req.query;
  let sql = `SELECT e.*, (SELECT COUNT(*) FROM contatos c WHERE c.empresa_id = e.id) AS total_contatos
             FROM empresas e`;
  const params = [];
  if (arquiteto === "1") sql += " WHERE e.is_arquiteto = 1";
  sql += " ORDER BY e.razao_social";
  res.json(db.prepare(sql).all(...params));
});

// Detalhe completo do cliente
r.get("/:id", (req, res) => {
  const id = req.params.id;
  const empresa = db.prepare("SELECT * FROM empresas WHERE id = ?").get(id);
  if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });
  const contatos = db.prepare("SELECT * FROM contatos WHERE empresa_id = ? ORDER BY principal DESC, nome").all(id);
  const arquitetos = db
    .prepare(
      `SELECT e.id, e.nome_fantasia, e.razao_social FROM empresa_arquiteto ea
       JOIN empresas e ON e.id = ea.arquiteto_id WHERE ea.empresa_id = ?`
    )
    .all(id);
  const indicados = db
    .prepare(
      `SELECT e.id, e.nome_fantasia, e.razao_social FROM empresa_arquiteto ea
       JOIN empresas e ON e.id = ea.empresa_id WHERE ea.arquiteto_id = ?`
    )
    .all(id);
  const negocios = db.prepare("SELECT * FROM negocios WHERE empresa_id = ? ORDER BY criado_em DESC").all(id);
  const orcamentos = db.prepare("SELECT * FROM orcamentos WHERE empresa_id = ? ORDER BY criado_em DESC").all(id);
  const projetos = db.prepare("SELECT * FROM projetos WHERE empresa_id = ? ORDER BY criado_em DESC").all(id);
  const totalContratado = db
    .prepare("SELECT COALESCE(SUM(valor),0) v FROM projetos WHERE empresa_id = ?")
    .get(id).v;
  res.json({ ...empresa, contatos, arquitetos, indicados, negocios, orcamentos, projetos, totalContratado });
});

r.post("/", (req, res) => {
  const b = req.body;
  if (!b.razao_social) return res.status(400).json({ erro: "Informe a razão social." });
  const info = db
    .prepare(
      `INSERT INTO empresas (razao_social, nome_fantasia, cnpj, segmento, is_arquiteto, endereco, cidade, observacoes)
       VALUES (?,?,?,?,?,?,?,?)`
    )
    .run(b.razao_social, b.nome_fantasia, b.cnpj, b.segmento, b.is_arquiteto ? 1 : 0, b.endereco, b.cidade, b.observacoes);
  res.json(db.prepare("SELECT * FROM empresas WHERE id = ?").get(info.lastInsertRowid));
});

r.put("/:id", (req, res) => {
  const b = req.body;
  db.prepare(
    `UPDATE empresas SET razao_social=?, nome_fantasia=?, cnpj=?, segmento=?, is_arquiteto=?, endereco=?, cidade=?, observacoes=? WHERE id=?`
  ).run(b.razao_social, b.nome_fantasia, b.cnpj, b.segmento, b.is_arquiteto ? 1 : 0, b.endereco, b.cidade, b.observacoes, req.params.id);
  res.json(db.prepare("SELECT * FROM empresas WHERE id = ?").get(req.params.id));
});

r.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM empresas WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ----- Vínculo arquiteto (N:N) -----
r.post("/:id/arquitetos", (req, res) => {
  const { arquiteto_id } = req.body;
  db.prepare("INSERT OR IGNORE INTO empresa_arquiteto (empresa_id, arquiteto_id) VALUES (?,?)").run(req.params.id, arquiteto_id);
  res.json({ ok: true });
});
r.delete("/:id/arquitetos/:arqId", (req, res) => {
  db.prepare("DELETE FROM empresa_arquiteto WHERE empresa_id=? AND arquiteto_id=?").run(req.params.id, req.params.arqId);
  res.json({ ok: true });
});

// ----- Contatos -----
r.post("/:id/contatos", (req, res) => {
  const b = req.body;
  const info = db
    .prepare("INSERT INTO contatos (empresa_id, nome, cargo, telefone, email, principal) VALUES (?,?,?,?,?,?)")
    .run(req.params.id, b.nome, b.cargo, b.telefone, b.email, b.principal ? 1 : 0);
  res.json(db.prepare("SELECT * FROM contatos WHERE id = ?").get(info.lastInsertRowid));
});
r.put("/contatos/:cid", (req, res) => {
  const b = req.body;
  db.prepare("UPDATE contatos SET nome=?, cargo=?, telefone=?, email=?, principal=? WHERE id=?").run(
    b.nome, b.cargo, b.telefone, b.email, b.principal ? 1 : 0, req.params.cid
  );
  res.json(db.prepare("SELECT * FROM contatos WHERE id = ?").get(req.params.cid));
});
r.delete("/contatos/:cid", (req, res) => {
  db.prepare("DELETE FROM contatos WHERE id = ?").run(req.params.cid);
  res.json({ ok: true });
});

export default r;
