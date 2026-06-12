import { Router } from "express";
import { db } from "../db/index.js";
import { calcularOrcamento } from "../lib/calc.js";

const r = Router();

function carregarFull(id) {
  const orc = db.prepare("SELECT * FROM orcamentos WHERE id = ?").get(id);
  if (!orc) return null;
  const empresa = orc.empresa_id ? db.prepare("SELECT * FROM empresas WHERE id = ?").get(orc.empresa_id) : null;
  const ambientes = db.prepare("SELECT * FROM orcamento_ambientes WHERE orcamento_id = ? ORDER BY ordem, id").all(id);
  for (const amb of ambientes) {
    amb.itens = db.prepare("SELECT * FROM orcamento_itens WHERE ambiente_id = ? ORDER BY ordem, id").all(amb.id);
    for (const item of amb.itens) {
      item.materiais = db.prepare("SELECT * FROM orcamento_item_materiais WHERE item_id = ? ORDER BY id").all(item.id);
    }
  }
  const calc = calcularOrcamento(orc, ambientes);
  return { ...orc, empresa, ambientes: calc.ambientes, resumo: calc.resumo };
}

r.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, e.nome_fantasia AS empresa_nome, n.titulo AS negocio_titulo
       FROM orcamentos o
       LEFT JOIN empresas e ON e.id = o.empresa_id
       LEFT JOIN negocios n ON n.id = o.negocio_id
       ORDER BY o.criado_em DESC`
    )
    .all();
  res.json(rows);
});

r.get("/:id", (req, res) => {
  const full = carregarFull(req.params.id);
  if (!full) return res.status(404).json({ erro: "Orçamento não encontrado." });
  res.json(full);
});

r.post("/", (req, res) => {
  const b = req.body;
  if (!b.titulo) return res.status(400).json({ erro: "Informe um título para o orçamento." });
  const cfg = db.prepare("SELECT * FROM configuracoes WHERE id = 1").get();
  const info = db
    .prepare(
      `INSERT INTO orcamentos (negocio_id, empresa_id, titulo, versao, status, margem, impostos, perda, frete, condicoes_pagamento, validade_dias, observacoes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      b.negocio_id || null, b.empresa_id || null, b.titulo, b.versao || 1, b.status || "rascunho",
      b.margem ?? cfg.margem_padrao, b.impostos ?? cfg.impostos_padrao, b.perda ?? cfg.perda_padrao,
      b.frete || 0, b.condicoes_pagamento, b.validade_dias ?? 15, b.observacoes
    );
  res.json(carregarFull(info.lastInsertRowid));
});

r.put("/:id", (req, res) => {
  const b = req.body;
  db.prepare(
    `UPDATE orcamentos SET titulo=?, status=?, margem=?, impostos=?, perda=?, frete=?, condicoes_pagamento=?, validade_dias=?, observacoes=?, empresa_id=COALESCE(?,empresa_id) WHERE id=?`
  ).run(b.titulo, b.status, b.margem, b.impostos, b.perda, b.frete || 0, b.condicoes_pagamento, b.validade_dias, b.observacoes, b.empresa_id || null, req.params.id);
  res.json(carregarFull(req.params.id));
});

// Clona como nova versão
r.post("/:id/versao", (req, res) => {
  const id = req.params.id;
  const novoId = db.transaction(() => {
    const o = db.prepare("SELECT * FROM orcamentos WHERE id = ?").get(id);
    const maxV = db.prepare("SELECT COALESCE(MAX(versao),1) v FROM orcamentos WHERE negocio_id IS ? AND titulo = ?").get(o.negocio_id, o.titulo).v;
    const nid = db.prepare(
      `INSERT INTO orcamentos (negocio_id, empresa_id, titulo, versao, status, margem, impostos, perda, frete, condicoes_pagamento, validade_dias, observacoes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(o.negocio_id, o.empresa_id, o.titulo, maxV + 1, "rascunho", o.margem, o.impostos, o.perda, o.frete, o.condicoes_pagamento, o.validade_dias, o.observacoes).lastInsertRowid;
    const ambs = db.prepare("SELECT * FROM orcamento_ambientes WHERE orcamento_id = ?").all(id);
    for (const a of ambs) {
      const aid = db.prepare("INSERT INTO orcamento_ambientes (orcamento_id, nome, ordem) VALUES (?,?,?)").run(nid, a.nome, a.ordem).lastInsertRowid;
      const itens = db.prepare("SELECT * FROM orcamento_itens WHERE ambiente_id = ?").all(a.id);
      for (const it of itens) {
        const iid = db.prepare("INSERT INTO orcamento_itens (ambiente_id, descricao, quantidade, mao_de_obra, ordem) VALUES (?,?,?,?,?)").run(aid, it.descricao, it.quantidade, it.mao_de_obra, it.ordem).lastInsertRowid;
        const mats = db.prepare("SELECT * FROM orcamento_item_materiais WHERE item_id = ?").all(it.id);
        for (const m of mats) {
          db.prepare("INSERT INTO orcamento_item_materiais (item_id, material_id, nome, unidade, preco_custo, quantidade, aplica_perda) VALUES (?,?,?,?,?,?,?)")
            .run(iid, m.material_id, m.nome, m.unidade, m.preco_custo, m.quantidade, m.aplica_perda);
        }
      }
    }
    return nid;
  })();
  res.json(carregarFull(novoId));
});

r.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM orcamentos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ----- Ambientes -----
r.post("/:id/ambientes", (req, res) => {
  const ordem = db.prepare("SELECT COALESCE(MAX(ordem),0)+1 o FROM orcamento_ambientes WHERE orcamento_id = ?").get(req.params.id).o;
  db.prepare("INSERT INTO orcamento_ambientes (orcamento_id, nome, ordem) VALUES (?,?,?)").run(req.params.id, req.body.nome || "Novo ambiente", ordem);
  res.json(carregarFull(req.params.id));
});
r.put("/ambientes/:aid", (req, res) => {
  db.prepare("UPDATE orcamento_ambientes SET nome=? WHERE id=?").run(req.body.nome, req.params.aid);
  const orcId = db.prepare("SELECT orcamento_id FROM orcamento_ambientes WHERE id = ?").get(req.params.aid).orcamento_id;
  res.json(carregarFull(orcId));
});
r.delete("/ambientes/:aid", (req, res) => {
  const orcId = db.prepare("SELECT orcamento_id FROM orcamento_ambientes WHERE id = ?").get(req.params.aid).orcamento_id;
  db.prepare("DELETE FROM orcamento_ambientes WHERE id = ?").run(req.params.aid);
  res.json(carregarFull(orcId));
});

// ----- Itens -----
r.post("/ambientes/:aid/itens", (req, res) => {
  const b = req.body;
  const orcId = db.prepare("SELECT orcamento_id FROM orcamento_ambientes WHERE id = ?").get(req.params.aid).orcamento_id;
  const ordem = db.prepare("SELECT COALESCE(MAX(ordem),0)+1 o FROM orcamento_itens WHERE ambiente_id = ?").get(req.params.aid).o;
  db.prepare("INSERT INTO orcamento_itens (ambiente_id, descricao, quantidade, mao_de_obra, ordem) VALUES (?,?,?,?,?)")
    .run(req.params.aid, b.descricao || "Nova peça", b.quantidade || 1, b.mao_de_obra || 0, ordem);
  res.json(carregarFull(orcId));
});
r.put("/itens/:iid", (req, res) => {
  const b = req.body;
  db.prepare("UPDATE orcamento_itens SET descricao=?, quantidade=?, mao_de_obra=? WHERE id=?")
    .run(b.descricao, b.quantidade || 1, b.mao_de_obra || 0, req.params.iid);
  res.json(carregarFull(orcIdDoItem(req.params.iid)));
});
r.delete("/itens/:iid", (req, res) => {
  const orcId = orcIdDoItem(req.params.iid);
  db.prepare("DELETE FROM orcamento_itens WHERE id = ?").run(req.params.iid);
  res.json(carregarFull(orcId));
});

// ----- Materiais do item -----
r.post("/itens/:iid/materiais", (req, res) => {
  const b = req.body;
  let mat = null;
  if (b.material_id) mat = db.prepare("SELECT * FROM materiais WHERE id = ?").get(b.material_id);
  db.prepare("INSERT INTO orcamento_item_materiais (item_id, material_id, nome, unidade, preco_custo, quantidade, aplica_perda) VALUES (?,?,?,?,?,?,?)")
    .run(req.params.iid, mat ? mat.id : null, b.nome || (mat && mat.nome) || "Material",
      b.unidade || (mat && mat.unidade) || "un", b.preco_custo ?? (mat ? mat.preco_custo : 0),
      b.quantidade || 1, b.aplica_perda === false ? 0 : 1);
  res.json(carregarFull(orcIdDoItem(req.params.iid)));
});
r.put("/item-materiais/:mid", (req, res) => {
  const b = req.body;
  db.prepare("UPDATE orcamento_item_materiais SET nome=?, unidade=?, preco_custo=?, quantidade=?, aplica_perda=? WHERE id=?")
    .run(b.nome, b.unidade, b.preco_custo || 0, b.quantidade || 1, b.aplica_perda ? 1 : 0, req.params.mid);
  res.json(carregarFull(orcIdDoItemMaterial(req.params.mid)));
});
r.delete("/item-materiais/:mid", (req, res) => {
  const orcId = orcIdDoItemMaterial(req.params.mid);
  db.prepare("DELETE FROM orcamento_item_materiais WHERE id = ?").run(req.params.mid);
  res.json(carregarFull(orcId));
});

function orcIdDoItem(itemId) {
  return db.prepare(
    "SELECT a.orcamento_id o FROM orcamento_itens i JOIN orcamento_ambientes a ON a.id = i.ambiente_id WHERE i.id = ?"
  ).get(itemId).o;
}
function orcIdDoItemMaterial(mid) {
  return db.prepare(
    `SELECT a.orcamento_id o FROM orcamento_item_materiais m
     JOIN orcamento_itens i ON i.id = m.item_id
     JOIN orcamento_ambientes a ON a.id = i.ambiente_id WHERE m.id = ?`
  ).get(mid).o;
}

export default r;
