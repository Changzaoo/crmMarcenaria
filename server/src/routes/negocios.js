import { Router } from "express";
import { db } from "../db/index.js";
import { criarProjetoComEtapas } from "../lib/projetoFactory.js";
import { calcularOrcamento } from "../lib/calc.js";
import { sincronizarFunil3d } from "../storage/funil3dSync.js";

const r = Router();

// Importa os Orçamentos 3D (Estúdio 3D) para o funil como negócios.
// Roda na rota autenticada para que o snapshot do Firebase persista.
r.post("/sincronizar-3d", async (_req, res) => {
  try {
    const out = await sincronizarFunil3d();
    res.json(out);
  } catch (e) {
    console.error("[negocios] sincronizar-3d ->", e?.stack || e);
    res.status(500).json({ erro: e?.message || "Falha ao sincronizar Orçamentos 3D." });
  }
});

// Calcula o preço final de um orçamento (para usar como valor do projeto).
function valorDoOrcamento(orc) {
  const ambientes = db.prepare("SELECT * FROM orcamento_ambientes WHERE orcamento_id = ?").all(orc.id);
  for (const amb of ambientes) {
    amb.itens = db.prepare("SELECT * FROM orcamento_itens WHERE ambiente_id = ?").all(amb.id);
    for (const item of amb.itens) {
      item.materiais = db.prepare("SELECT * FROM orcamento_item_materiais WHERE item_id = ?").all(item.id);
    }
  }
  return calcularOrcamento(orc, ambientes).resumo.preco_final;
}

const baseSelect = `
  SELECT n.*, e.nome_fantasia AS empresa_nome, e.razao_social AS empresa_razao,
         c.nome AS contato_nome, c.telefone AS contato_telefone,
         (SELECT MIN(i.proximo_follow_up) FROM interacoes i
            WHERE i.negocio_id = n.id AND i.follow_up_concluido = 0 AND i.proximo_follow_up IS NOT NULL) AS proximo_follow_up
  FROM negocios n
  LEFT JOIN empresas e ON e.id = n.empresa_id
  LEFT JOIN contatos c ON c.id = n.contato_id
`;

r.get("/", (_req, res) => {
  res.json(db.prepare(baseSelect + " ORDER BY n.ordem, n.criado_em DESC").all());
});

r.get("/:id", (req, res) => {
  const n = db.prepare(baseSelect + " WHERE n.id = ?").get(req.params.id);
  if (!n) return res.status(404).json({ erro: "Negócio não encontrado." });
  n.interacoes = db.prepare("SELECT * FROM interacoes WHERE negocio_id = ? ORDER BY data DESC").all(req.params.id);
  n.orcamentos = db.prepare("SELECT * FROM orcamentos WHERE negocio_id = ? ORDER BY versao DESC").all(req.params.id);
  res.json(n);
});

r.post("/", (req, res) => {
  const b = req.body;
  if (!b.titulo) return res.status(400).json({ erro: "Informe um título para o negócio." });
  const maxOrdem = db.prepare("SELECT COALESCE(MAX(ordem),0)+1 o FROM negocios WHERE etapa = ?").get(b.etapa || "Lead").o;
  const info = db
    .prepare(
      `INSERT INTO negocios (titulo, empresa_id, contato_id, segmento, origem, etapa, valor_estimado, probabilidade, data_prevista, responsavel, ordem)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(b.titulo, b.empresa_id || null, b.contato_id || null, b.segmento, b.origem, b.etapa || "Lead",
      b.valor_estimado || 0, b.probabilidade ?? 50, b.data_prevista, b.responsavel, maxOrdem);
  res.json(db.prepare(baseSelect + " WHERE n.id = ?").get(info.lastInsertRowid));
});

r.put("/:id", (req, res) => {
  const b = req.body;
  db.prepare(
    `UPDATE negocios SET titulo=?, empresa_id=?, contato_id=?, segmento=?, origem=?, valor_estimado=?, probabilidade=?, data_prevista=?, responsavel=? WHERE id=?`
  ).run(b.titulo, b.empresa_id || null, b.contato_id || null, b.segmento, b.origem, b.valor_estimado || 0,
    b.probabilidade ?? 50, b.data_prevista, b.responsavel, req.params.id);
  res.json(db.prepare(baseSelect + " WHERE n.id = ?").get(req.params.id));
});

// Move no kanban (etapa + ordem). Trata regras de Perdido e Fechado (ganho).
r.patch("/:id/mover", (req, res) => {
  const { etapa, ordem, motivo_perda } = req.body;
  const neg = db.prepare("SELECT * FROM negocios WHERE id = ?").get(req.params.id);
  if (!neg) return res.status(404).json({ erro: "Negócio não encontrado." });

  if (etapa === "Perdido" && !motivo_perda) {
    return res.status(400).json({ erro: "Informe o motivo da perda.", precisaMotivo: true });
  }

  const fechadoEm = (etapa === "Fechado (ganho)" || etapa === "Perdido") ? new Date().toISOString().slice(0, 19).replace("T", " ") : null;

  db.transaction(() => {
    // Move o card para a nova etapa/posição
    db.prepare("UPDATE negocios SET etapa=?, ordem=?, motivo_perda=?, fechado_em=COALESCE(?, fechado_em) WHERE id=?")
      .run(etapa, ordem ?? 0, etapa === "Perdido" ? motivo_perda : null, fechadoEm, req.params.id);

    // Renumera todos os cards da coluna destino para eliminar colisões de ordem.
    // Em caso de empate na posição, o card movido vence (cai exatamente no índice
    // solicitado, empurrando o que estava ali para baixo); demais empates por criado_em.
    const cards = db.prepare(
      `SELECT id FROM negocios WHERE etapa=?
       ORDER BY (CASE WHEN id=? THEN ? ELSE ordem END),
                (CASE WHEN id=? THEN 0 ELSE 1 END),
                criado_em`
    ).all(etapa, req.params.id, ordem ?? 0, req.params.id);
    const upd = db.prepare("UPDATE negocios SET ordem=? WHERE id=?");
    cards.forEach((c, i) => upd.run(i, c.id));

    // Se o card saiu de outra etapa, renumera a coluna de origem também.
    if (neg.etapa !== etapa) {
      const origem = db.prepare("SELECT id FROM negocios WHERE etapa=? ORDER BY ordem, criado_em").all(neg.etapa);
      origem.forEach((c, i) => upd.run(i, c.id));
    }
  })();

  let projetoCriado = null;
  if (etapa === "Fechado (ganho)" && neg.etapa !== "Fechado (ganho)") {
    const jaTem = db.prepare("SELECT id FROM projetos WHERE negocio_id = ?").get(req.params.id);
    if (!jaTem) {
      const orc = db.prepare("SELECT * FROM orcamentos WHERE negocio_id = ? AND status='aprovado' ORDER BY versao DESC").get(req.params.id);
      const pid = criarProjetoComEtapas({
        negocio_id: neg.id,
        empresa_id: neg.empresa_id,
        orcamento_id: orc ? orc.id : null,
        nome: neg.titulo,
        valor: orc ? valorDoOrcamento(orc) : neg.valor_estimado,
        data_contrato: new Date().toISOString().slice(0, 10),
      });
      projetoCriado = pid;
    }
  }
  res.json({ ok: true, projetoCriado });
});

r.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM negocios WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Mapeia o tipo de projeto informado pelo lead para um segmento do CRM.
function inferirSegmento(tipo = "") {
  const t = tipo.toLowerCase();
  if (/loja|varejo|otica|óptica|boutique/.test(t)) return "loja";
  if (/franquia/.test(t)) return "franquia";
  if (/restaurante|bar|cafe|café|gastr/.test(t)) return "restaurante";
  if (/clinic|clínic|consult|odonto|estetic/.test(t)) return "clínica";
  if (/hotel|pousada|resort/.test(t)) return "hotel";
  if (/escrit|corporat|office/.test(t)) return "escritório";
  if (/quiosque/.test(t)) return "quiosque";
  if (/showroom/.test(t)) return "showroom";
  return "outro";
}

// Cria um cliente (empresa + contato principal) a partir dos dados que o lead
// preencheu (nome, e-mail, WhatsApp, cidade, tipo de projeto) e vincula ao negócio.
r.post("/:id/criar-cliente", (req, res) => {
  const neg = db.prepare("SELECT * FROM negocios WHERE id = ?").get(req.params.id);
  if (!neg) return res.status(404).json({ erro: "Negócio não encontrado." });
  if (neg.empresa_id) return res.status(400).json({ erro: "Este negócio já está vinculado a um cliente." });

  let d = {};
  try { d = neg.dados_3d ? JSON.parse(neg.dados_3d) : {}; } catch { d = {}; }
  const nome = String(d.nome || req.body?.nome || neg.titulo || "Cliente").trim().slice(0, 120) || "Cliente";
  const cidade = String(d.cidade_estado || "").trim();
  const observacoes = [
    d.tipo_projeto && `Projeto: ${d.tipo_projeto}`,
    d.prazo && `Prazo: ${d.prazo}`,
    d.faixa_orcamento && `Faixa: ${d.faixa_orcamento}`,
    neg.origem && `Origem: ${neg.origem}`,
    d.descricao && `Mensagem: ${d.descricao}`,
  ].filter(Boolean).join(" · ") || null;

  const out = db.transaction(() => {
    const empId = db.prepare(
      `INSERT INTO empresas (razao_social, nome_fantasia, segmento, is_arquiteto, cidade, observacoes)
       VALUES (?,?,?,?,?,?)`
    ).run(nome, nome, d.segmento || inferirSegmento(d.tipo_projeto), 0, cidade, observacoes).lastInsertRowid;
    const contId = db.prepare(
      `INSERT INTO contatos (empresa_id, nome, cargo, telefone, email, principal)
       VALUES (?,?,?,?,?,1)`
    ).run(empId, nome, "Contato principal", d.whatsapp || null, d.email || null).lastInsertRowid;
    db.prepare("UPDATE negocios SET empresa_id = ?, contato_id = ? WHERE id = ?").run(empId, contId, req.params.id);
    return { empId, contId };
  })();

  res.json({ ok: true, empresa_id: out.empId, contato_id: out.contId });
});

// ----- Interações / follow-ups -----
r.post("/:id/interacoes", (req, res) => {
  const b = req.body;
  const info = db
    .prepare("INSERT INTO interacoes (negocio_id, tipo, descricao, proximo_follow_up) VALUES (?,?,?,?)")
    .run(req.params.id, b.tipo || "nota", b.descricao, b.proximo_follow_up || null);
  res.json(db.prepare("SELECT * FROM interacoes WHERE id = ?").get(info.lastInsertRowid));
});
r.patch("/interacoes/:iid", (req, res) => {
  db.prepare("UPDATE interacoes SET follow_up_concluido=? WHERE id=?").run(req.body.follow_up_concluido ? 1 : 0, req.params.iid);
  res.json({ ok: true });
});
r.delete("/interacoes/:iid", (req, res) => {
  db.prepare("DELETE FROM interacoes WHERE id = ?").run(req.params.iid);
  res.json({ ok: true });
});

export default r;
