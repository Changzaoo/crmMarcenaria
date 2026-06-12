import { Router } from "express";
import { dumpDatabase, restoreDatabase } from "../db/snapshot.js";
import { db } from "../db/index.js";
import { firebaseDataStatus } from "../data/firebaseStore.js";

const r = Router();

// ----- Configurações -----
r.get("/", (_req, res) => {
  res.json(db.prepare("SELECT * FROM configuracoes WHERE id = 1").get());
});
r.put("/", (req, res) => {
  const b = req.body;
  db.prepare(
    `UPDATE configuracoes SET margem_padrao=?, impostos_padrao=?, perda_padrao=?, garantia_meses_padrao=?,
     empresa_nome=?, empresa_cnpj=?, empresa_telefone=?, empresa_email=?, empresa_endereco=?, empresa_slogan=? WHERE id=1`
  ).run(b.margem_padrao, b.impostos_padrao, b.perda_padrao, b.garantia_meses_padrao,
    b.empresa_nome, b.empresa_cnpj, b.empresa_telefone, b.empresa_email, b.empresa_endereco, b.empresa_slogan);
  res.json(db.prepare("SELECT * FROM configuracoes WHERE id = 1").get());
});

// ----- Templates WhatsApp -----
r.get("/templates", (_req, res) => {
  res.json(db.prepare("SELECT * FROM templates_whatsapp ORDER BY id").all());
});
r.post("/templates", (req, res) => {
  const b = req.body;
  const info = db.prepare("INSERT INTO templates_whatsapp (nome, mensagem) VALUES (?,?)").run(b.nome, b.mensagem);
  res.json(db.prepare("SELECT * FROM templates_whatsapp WHERE id = ?").get(info.lastInsertRowid));
});
r.put("/templates/:id", (req, res) => {
  const b = req.body;
  db.prepare("UPDATE templates_whatsapp SET nome=?, mensagem=? WHERE id=?").run(b.nome, b.mensagem, req.params.id);
  res.json(db.prepare("SELECT * FROM templates_whatsapp WHERE id = ?").get(req.params.id));
});
r.delete("/templates/:id", (req, res) => {
  db.prepare("DELETE FROM templates_whatsapp WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ----- Backup export / import -----
r.get("/backup", (_req, res) => {
  res.json(dumpDatabase());
});

r.post("/restore", (req, res) => {
  const dump = req.body;
  if (!dump || typeof dump !== "object") return res.status(400).json({ erro: "Arquivo de backup inválido." });
  try {
    restoreDatabase(dump);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: "Falha ao restaurar: " + e.message });
  }
});

r.get("/storage-status", (_req, res) => {
  res.json({ firebase: firebaseDataStatus() });
});

export default r;
