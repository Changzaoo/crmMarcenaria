import { db } from "../db/index.js";
import { listarLeads, obterLead } from "./leads3dStore.js";

/* ============================================================
   Sincroniza os Orçamentos 3D (leads/projetos do Estúdio 3D)
   com o FUNIL COMERCIAL (tabela `negocios`).

   Por que aqui e não na rota pública: o snapshot do Firebase
   (hidratação + persistência) só roda nas rotas AUTENTICADAS
   (/api). Criar o negócio direto na submissão pública (/api/public)
   seria perdido no Vercel (SQLite efêmero). Então o funil é
   sincronizado quando o time abre o CRM autenticado.

   Cada negócio criado guarda:
   - projeto_3d_id → vínculo com o projeto 3D (abre o ambiente);
   - dados_3d (JSON) → resumo com valores e lista de móveis.
   ============================================================ */

const agoraSqlite = () => new Date().toISOString().slice(0, 19).replace("T", " ");

function parseDoc(projeto) {
  let doc = projeto?.doc;
  if (typeof doc === "string") {
    try {
      doc = JSON.parse(doc);
    } catch {
      doc = {};
    }
  }
  return doc || {};
}

/** Constrói o resumo (valores + móveis) exibido no card/painel do funil. */
function montarDados3d(lead, projeto, doc) {
  const est = doc.estimativa || null;
  const moveis = Array.isArray(doc.furniture) ? doc.furniture : [];
  const totalMoveis = moveis.reduce((s, m) => s + (Number(m.preco) || 0), 0);
  return {
    projetoId: projeto?.id || lead.projeto_id,
    leadId: lead.id,
    nome: lead.nome,
    email: lead.email,
    whatsapp: lead.whatsapp,
    cidade_estado: lead.cidade_estado,
    tipo_projeto: lead.tipo_projeto,
    prazo: lead.prazo,
    faixa_orcamento: lead.faixa_orcamento,
    descricao: lead.descricao,
    status: projeto?.status || lead.status,
    arquiteto_solicitado: !!lead.arquiteto_solicitado,
    projectName: doc.projectName || null,
    leadScore: doc.leadScore || null,
    estimativa: est,
    ambiente: doc.environment || null,
    total: est?.total ?? totalMoveis,
    moveis: moveis.map((m) => ({
      nome: m.name,
      categoria: m.category,
      material: m.material,
      preco: Number(m.preco) || 0,
      largura_cm: Math.round((Number(m.width) || 0) * 100),
      altura_cm: Math.round((Number(m.height) || 0) * 100),
      profundidade_cm: Math.round((Number(m.depth) || 0) * 100),
      andar: m.floor ?? 0,
    })),
    atualizado_em: projeto?.atualizado_em || lead.atualizado_em || null,
  };
}

/** Valor de referência para o card do funil (R$). */
function valorEstimado(doc, dados) {
  const est = doc.estimativa;
  if (est && Number.isFinite(est.max) && est.max > 0) return Math.round(est.max);
  if (dados.total > 0) return Math.round(dados.total);
  return 0;
}

const isProposta = (lead) => (lead.origem || "").toString().toLowerCase().includes("proposta");

/** Decide se um lead merece virar card no funil. */
function elegivel(lead, doc) {
  const temMoveis = Array.isArray(doc.furniture) && doc.furniture.length > 0;
  const enviado = (lead.projeto_status || lead.status || "").toString().toLowerCase().includes("envi");
  // Solicitações de proposta (formulário do site) sempre entram como Lead.
  return temMoveis || enviado || !!lead.arquiteto_solicitado || isProposta(lead);
}

const selExistente = db.prepare("SELECT id, etapa FROM negocios WHERE projeto_3d_id = ?");
const maxOrdem = db.prepare("SELECT COALESCE(MAX(ordem),0)+1 o FROM negocios WHERE etapa = ?");
const insertNeg = db.prepare(
  `INSERT INTO negocios (titulo, segmento, origem, etapa, valor_estimado, probabilidade, ordem, projeto_3d_id, dados_3d)
   VALUES (?,?,?,?,?,?,?,?,?)`
);
const updateNeg = db.prepare(
  `UPDATE negocios SET titulo = ?, valor_estimado = ?, dados_3d = ? WHERE id = ?`
);

/** Sincroniza todos os leads 3D elegíveis com o funil. Idempotente. */
export async function sincronizarFunil3d() {
  const leads = await listarLeads();
  let criados = 0;
  let atualizados = 0;

  for (const leadResumo of leads) {
    if (!leadResumo.projeto_id) continue;
    const full = await obterLead(leadResumo.id);
    if (!full) continue;
    const lead = { ...leadResumo, ...full };
    const projeto = full.projeto || null;
    const doc = parseDoc(projeto);

    if (!elegivel(lead, doc)) continue;

    const dados = montarDados3d(lead, projeto, doc);
    const proposta = isProposta(lead);
    const padrao = proposta ? `Proposta — ${lead.nome || "Cliente"}` : `Orçamento 3D — ${lead.nome || "Cliente"}`;
    const titulo = (doc.projectName || padrao).slice(0, 120);
    const valor = valorEstimado(doc, dados);
    const dadosJson = JSON.stringify(dados);

    const existente = selExistente.get(lead.projeto_id);
    if (existente) {
      updateNeg.run(titulo, valor, dadosJson, existente.id);
      atualizados++;
    } else {
      const ordem = maxOrdem.get("Lead").o;
      const prob = lead.arquiteto_solicitado ? 50 : 30;
      insertNeg.run(
        titulo,
        lead.tipo_projeto || (proposta ? "Solicitação" : "Orçamento 3D"),
        lead.origem || "Orçamento 3D",
        "Lead",
        valor,
        prob,
        ordem,
        lead.projeto_id,
        dadosJson
      );
      criados++;
    }
  }

  return { criados, atualizados, total: criados + atualizados, em: agoraSqlite() };
}
