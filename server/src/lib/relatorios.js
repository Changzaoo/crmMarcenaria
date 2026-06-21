// =============================================================================
//  Agregações puras dos relatórios da NEXUS.
//
//  Tudo aqui é FUNÇÃO PURA: recebe linhas (já lidas do SQLite) e devolve os
//  agregados. Sem acesso ao banco e sem datas "agora" implícitas — quem chama
//  injeta a referência de hoje. Isso torna o módulo trivialmente testável
//  (ver server/test/relatorios.test.js) e mantém o SQL nas rotas, parametrizado.
// =============================================================================

import { ETAPAS_CRM } from "../db/schema.js";

export const ETAPA_GANHO = "Fechado (ganho)";
export const ETAPA_PERDIDO = "Perdido";

/** Etapas "em aberto" do funil (sem ganho/perdido). */
export const ETAPAS_ABERTAS = ETAPAS_CRM.filter((e) => e !== ETAPA_GANHO && e !== ETAPA_PERDIDO);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Arredonda para 2 casas (evita ruído de ponto flutuante em somas). */
const round2 = (n) => Math.round(num(n) * 100) / 100;

/** 'YYYY-MM' de uma string de data ('YYYY-MM-DD', ISO ou 'YYYY-MM-DD HH:MM:SS'). */
export function mesDe(dataStr) {
  if (!dataStr) return null;
  const s = String(dataStr);
  return s.length >= 7 ? s.slice(0, 7) : null;
}

/**
 * Lista dos últimos N meses (inclui o mês de referência), em ordem cronológica.
 * `refDate` é um Date; usamos UTC para evitar saltos por fuso/horário de verão.
 * Ex.: refDate=2026-06-21, meses=3 -> ['2026-04','2026-05','2026-06'].
 */
export function ultimosMeses(meses, refDate = new Date()) {
  const total = Math.max(1, Math.floor(num(meses) || 0) || 1);
  const ano = refDate.getUTCFullYear();
  const mes = refDate.getUTCMonth(); // 0-11
  const out = [];
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ano, mes - i, 1));
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    out.push(`${d.getUTCFullYear()}-${mm}`);
  }
  return out;
}

/** Rótulo curto pt-BR de um 'YYYY-MM' -> 'jun/26'. */
export function rotuloMes(ym) {
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  if (!ym || ym.length < 7) return ym || "";
  const [ano, mes] = ym.split("-");
  const idx = Number(mes) - 1;
  const nome = MESES[idx] || mes;
  return `${nome}/${String(ano).slice(2)}`;
}

/**
 * Funil por etapa do CRM.
 * Entrada: linhas de `negocios` { etapa, valor_estimado, probabilidade }.
 * Saída por etapa (na ordem oficial ETAPAS_CRM): contagem, soma de
 * valor_estimado e valor ponderado pela probabilidade (valor * prob/100).
 */
export function agregarFunil(rows = []) {
  const base = new Map(
    ETAPAS_CRM.map((etapa) => [etapa, { etapa, qtd: 0, valor: 0, valor_ponderado: 0 }])
  );
  for (const r of rows) {
    const etapa = r.etapa || "Lead";
    if (!base.has(etapa)) base.set(etapa, { etapa, qtd: 0, valor: 0, valor_ponderado: 0 });
    const acc = base.get(etapa);
    const valor = num(r.valor_estimado);
    const prob = num(r.probabilidade);
    acc.qtd += 1;
    acc.valor += valor;
    acc.valor_ponderado += valor * (prob / 100);
  }
  return [...base.values()].map((x) => ({
    ...x,
    valor: round2(x.valor),
    valor_ponderado: round2(x.valor_ponderado),
  }));
}

/**
 * Conversão mês a mês.
 * Entrada:
 *   - criados: linhas { criado_em } (todos os negócios criados no período);
 *   - fechados: linhas { etapa, fechado_em } (ganhos/perdidos do período).
 * O fechamento é contabilizado no mês em que ocorreu (fechado_em), não no de
 * criação — é assim que a taxa reflete o esforço comercial daquele mês.
 * Saída por mês: { mes, rotulo, criados, ganhos, perdidos, fechados, taxa }.
 * taxa = ganhos / (ganhos + perdidos) * 100 (0 quando não houve fechamentos).
 */
export function agregarConversao(criados = [], fechados = [], meses, refDate = new Date()) {
  const lista = ultimosMeses(meses, refDate);
  const set = new Set(lista);
  const map = new Map(
    lista.map((mes) => [mes, { mes, rotulo: rotuloMes(mes), criados: 0, ganhos: 0, perdidos: 0 }])
  );

  for (const r of criados) {
    const mes = mesDe(r.criado_em);
    if (mes && set.has(mes)) map.get(mes).criados += 1;
  }
  for (const r of fechados) {
    const mes = mesDe(r.fechado_em);
    if (!mes || !set.has(mes)) continue;
    if (r.etapa === ETAPA_GANHO) map.get(mes).ganhos += 1;
    else if (r.etapa === ETAPA_PERDIDO) map.get(mes).perdidos += 1;
  }

  return lista.map((mes) => {
    const m = map.get(mes);
    const fechadosMes = m.ganhos + m.perdidos;
    const taxa = fechadosMes ? Math.round((m.ganhos / fechadosMes) * 100) : 0;
    return { ...m, fechados: fechadosMes, taxa };
  });
}

/**
 * Fluxo de caixa mês a mês a partir das parcelas.
 * Entrada: linhas de `parcelas` { valor, status, vencimento, recebido_em }.
 *   - recebido: parcelas status='recebido', no mês de recebido_em
 *     (cai no mês de vencimento se recebido_em estiver vazio).
 *   - a_receber: parcelas em aberto cujo vencimento está no mês e ainda não venceu.
 *   - atrasado: parcelas em aberto com vencimento < hoje (no mês do vencimento).
 * `hojeISO` ('YYYY-MM-DD') define o corte de atraso; injetado por quem chama.
 * Saída por mês: { mes, rotulo, recebido, a_receber, atrasado }.
 */
export function agregarReceita(rows = [], meses, refDate = new Date(), hojeISO = null) {
  const lista = ultimosMeses(meses, refDate);
  const set = new Set(lista);
  const hoje = hojeISO || refDate.toISOString().slice(0, 10);
  const map = new Map(
    lista.map((mes) => [mes, { mes, rotulo: rotuloMes(mes), recebido: 0, a_receber: 0, atrasado: 0 }])
  );

  for (const r of rows) {
    const valor = num(r.valor);
    if (r.status === "recebido") {
      const mes = mesDe(r.recebido_em) || mesDe(r.vencimento);
      if (mes && set.has(mes)) map.get(mes).recebido += valor;
      continue;
    }
    // Em aberto (a_receber / atrasado) — classifica pelo vencimento.
    const mes = mesDe(r.vencimento);
    if (!mes || !set.has(mes)) continue;
    const venc = r.vencimento ? String(r.vencimento).slice(0, 10) : null;
    const atrasada = r.status === "atrasado" || (venc && venc < hoje);
    if (atrasada) map.get(mes).atrasado += valor;
    else map.get(mes).a_receber += valor;
  }

  return lista.map((mes) => {
    const m = map.get(mes);
    return {
      ...m,
      recebido: round2(m.recebido),
      a_receber: round2(m.a_receber),
      atrasado: round2(m.atrasado),
    };
  });
}

/**
 * Distribuição de negócios por origem.
 * Entrada: linhas { origem, valor_estimado }.
 * Saída ordenada por valor desc: { origem, qtd, valor }. Origem vazia -> 'Sem origem'.
 */
export function agregarOrigem(rows = []) {
  const map = new Map();
  for (const r of rows) {
    const origem = (r.origem && String(r.origem).trim()) || "Sem origem";
    if (!map.has(origem)) map.set(origem, { origem, qtd: 0, valor: 0 });
    const acc = map.get(origem);
    acc.qtd += 1;
    acc.valor += num(r.valor_estimado);
  }
  return [...map.values()]
    .map((x) => ({ ...x, valor: round2(x.valor) }))
    .sort((a, b) => b.valor - a.valor || b.qtd - a.qtd);
}

/**
 * Resumo executivo.
 * Entrada:
 *   - projetos: linhas { valor, status };
 *   - negocios: linhas { etapa } (todos, para o win rate geral);
 *   - aReceber: número (total em aberto + atrasado), já somado no SQL.
 * Saída: ticket_medio, projetos_por_status[], total_a_receber,
 *   win_rate (ganhos / (ganhos+perdidos) * 100) e contagens auxiliares.
 */
export function agregarResumo(projetos = [], negocios = [], aReceber = 0) {
  const valores = projetos.map((p) => num(p.valor)).filter((v) => v > 0);
  const ticketMedio = valores.length ? round2(valores.reduce((s, v) => s + v, 0) / valores.length) : 0;

  const statusMap = new Map();
  for (const p of projetos) {
    const st = (p.status && String(p.status).trim()) || "Sem status";
    statusMap.set(st, (statusMap.get(st) || 0) + 1);
  }
  const projetosPorStatus = [...statusMap.entries()]
    .map(([status, qtd]) => ({ status, qtd }))
    .sort((a, b) => b.qtd - a.qtd);

  let ganhos = 0;
  let perdidos = 0;
  for (const n of negocios) {
    if (n.etapa === ETAPA_GANHO) ganhos += 1;
    else if (n.etapa === ETAPA_PERDIDO) perdidos += 1;
  }
  const fechados = ganhos + perdidos;
  const winRate = fechados ? Math.round((ganhos / fechados) * 100) : 0;

  return {
    ticket_medio: ticketMedio,
    total_projetos: projetos.length,
    projetos_por_status: projetosPorStatus,
    total_a_receber: round2(aReceber),
    ganhos,
    perdidos,
    win_rate: winRate,
  };
}
