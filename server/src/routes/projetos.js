import { Router } from "express";
import { db } from "../db/index.js";
import { criarProjetoComEtapas } from "../lib/projetoFactory.js";

const r = Router();

function progresso(projetoId) {
  const row = db.prepare("SELECT COUNT(*) total, SUM(concluida) feitas FROM projeto_etapas WHERE projeto_id = ?").get(projetoId);
  if (!row.total) return 0;
  return Math.round(((row.feitas || 0) / row.total) * 100);
}

function carregar(id) {
  const p = db.prepare(
    `SELECT p.*, e.nome_fantasia AS empresa_nome, e.razao_social AS empresa_razao
     FROM projetos p LEFT JOIN empresas e ON e.id = p.empresa_id WHERE p.id = ?`
  ).get(id);
  if (!p) return null;
  p.progresso = progresso(id);
  p.etapas = db.prepare("SELECT * FROM projeto_etapas WHERE projeto_id = ? ORDER BY numero").all(id);
  for (const et of p.etapas) {
    et.checklist = db.prepare("SELECT * FROM etapa_checklist WHERE etapa_id = ? ORDER BY ordem, id").all(et.id);
  }
  p.parcelas = db.prepare("SELECT * FROM parcelas WHERE projeto_id = ? ORDER BY vencimento").all(id);
  p.contatos = p.empresa_id ? db.prepare("SELECT * FROM contatos WHERE empresa_id = ?").all(p.empresa_id) : [];
  return p;
}

r.get("/", (_req, res) => {
  const rows = db.prepare(
    `SELECT p.*, e.nome_fantasia AS empresa_nome FROM projetos p LEFT JOIN empresas e ON e.id = p.empresa_id ORDER BY p.criado_em DESC`
  ).all();
  for (const p of rows) p.progresso = progresso(p.id);
  res.json(rows);
});

r.get("/:id", (req, res) => {
  const p = carregar(req.params.id);
  if (!p) return res.status(404).json({ erro: "Projeto não encontrado." });
  res.json(p);
});

r.post("/", (req, res) => {
  const b = req.body;
  if (!b.nome) return res.status(400).json({ erro: "Informe o nome do projeto." });
  const pid = criarProjetoComEtapas(b);
  res.json(carregar(pid));
});

r.put("/:id", (req, res) => {
  const b = req.body;
  db.prepare(
    `UPDATE projetos SET nome=?, endereco_obra=?, valor=?, data_contrato=?, previsao_entrega=?, data_instalacao=?, status=?, responsavel=? WHERE id=?`
  ).run(b.nome, b.endereco_obra, b.valor || 0, b.data_contrato, b.previsao_entrega, b.data_instalacao, b.status, b.responsavel, req.params.id);
  res.json(carregar(req.params.id));
});

r.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM projetos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ----- Etapas -----
r.patch("/etapas/:eid", (req, res) => {
  const b = req.body;
  const etapa = db.prepare("SELECT * FROM projeto_etapas WHERE id = ?").get(req.params.eid);
  db.prepare("UPDATE projeto_etapas SET concluida=COALESCE(?,concluida), observacoes=COALESCE(?,observacoes), anexos=COALESCE(?,anexos) WHERE id=?")
    .run(b.concluida === undefined ? null : (b.concluida ? 1 : 0), b.observacoes ?? null, b.anexos ?? null, req.params.eid);
  // Se for a última etapa (Pós-entrega) concluída, sugere garantia/revisão
  if (b.concluida && etapa.numero === 10) {
    const proj = db.prepare("SELECT * FROM projetos WHERE id = ?").get(etapa.projeto_id);
    if (!proj.garantia_inicio) {
      const cfg = db.prepare("SELECT garantia_meses_padrao g FROM configuracoes WHERE id = 1").get();
      const hoje = new Date();
      const revisao = new Date();
      revisao.setMonth(revisao.getMonth() + 6);
      db.prepare("UPDATE projetos SET status='Concluído', garantia_meses=?, garantia_inicio=?, revisao_sugerida=? WHERE id=?")
        .run(cfg.g, hoje.toISOString().slice(0, 10), revisao.toISOString().slice(0, 10), etapa.projeto_id);
    }
  }
  res.json(carregar(etapa.projeto_id));
});

// ----- Checklist -----
r.post("/etapas/:eid/checklist", (req, res) => {
  const ordem = db.prepare("SELECT COALESCE(MAX(ordem),0)+1 o FROM etapa_checklist WHERE etapa_id = ?").get(req.params.eid).o;
  db.prepare("INSERT INTO etapa_checklist (etapa_id, texto, ordem) VALUES (?,?,?)").run(req.params.eid, req.body.texto || "Novo item", ordem);
  const pid = db.prepare("SELECT projeto_id FROM projeto_etapas WHERE id = ?").get(req.params.eid).projeto_id;
  res.json(carregar(pid));
});
r.patch("/checklist/:cid", (req, res) => {
  const b = req.body;
  db.prepare("UPDATE etapa_checklist SET concluido=COALESCE(?,concluido), texto=COALESCE(?,texto) WHERE id=?")
    .run(b.concluido === undefined ? null : (b.concluido ? 1 : 0), b.texto ?? null, req.params.cid);
  const pid = db.prepare(
    "SELECT e.projeto_id p FROM etapa_checklist c JOIN projeto_etapas e ON e.id = c.etapa_id WHERE c.id = ?"
  ).get(req.params.cid).p;
  res.json(carregar(pid));
});
r.delete("/checklist/:cid", (req, res) => {
  const pid = db.prepare(
    "SELECT e.projeto_id p FROM etapa_checklist c JOIN projeto_etapas e ON e.id = c.etapa_id WHERE c.id = ?"
  ).get(req.params.cid).p;
  db.prepare("DELETE FROM etapa_checklist WHERE id = ?").run(req.params.cid);
  res.json(carregar(pid));
});

// ----- Pós-venda: garantia -----
r.patch("/:id/pos-venda", (req, res) => {
  const b = req.body;
  db.prepare("UPDATE projetos SET garantia_meses=?, garantia_inicio=?, revisao_sugerida=?, potencial_novas_unidades=? WHERE id=?")
    .run(b.garantia_meses, b.garantia_inicio, b.revisao_sugerida, b.potencial_novas_unidades, req.params.id);
  res.json(carregar(req.params.id));
});

// Gera novo lead a partir do potencial de novas unidades
r.post("/:id/gerar-lead", (req, res) => {
  const p = db.prepare("SELECT * FROM projetos WHERE id = ?").get(req.params.id);
  const info = db.prepare(
    `INSERT INTO negocios (titulo, empresa_id, segmento, origem, etapa, valor_estimado, probabilidade, responsavel)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(`Novas unidades — ${p.empresa_nome || p.nome}`, p.empresa_id, null, "retorno de cliente", "Lead", 0, 30, p.responsavel);
  res.json({ ok: true, negocioId: info.lastInsertRowid });
});

export default r;
