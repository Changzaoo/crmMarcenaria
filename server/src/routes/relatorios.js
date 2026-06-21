import { Router } from "express";
import { db } from "../db/index.js";
import {
  agregarFunil,
  agregarConversao,
  agregarReceita,
  agregarOrigem,
  agregarResumo,
} from "../lib/relatorios.js";

// =============================================================================
//  Relatórios analíticos (somente leitura, autenticado).
//
//  Cada rota faz a leitura agregada via SQL com PREPARED STATEMENTS (nunca
//  interpolação) e delega a agregação/derivação para funções puras em
//  ../lib/relatorios.js — que são cobertas por testes (server/test/relatorios.test.js).
//
//  Montado em /relatorios DEPOIS da hidratação do Firebase (ver routes/index.js),
//  para enxergar o snapshot mais recente do banco, igual às demais rotas do CRM.
// =============================================================================

const r = Router();

const hojeISO = () => new Date().toISOString().slice(0, 10);

// Lê e valida o parâmetro ?meses (1..36, padrão 6).
function lerMeses(req, padrao = 6) {
  const n = Number.parseInt(req.query.meses, 10);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(36, Math.max(1, n));
}

// Funil por etapa: contagem + valor estimado + valor ponderado por probabilidade.
r.get("/funil", (_req, res) => {
  const rows = db.prepare("SELECT etapa, valor_estimado, probabilidade FROM negocios").all();
  res.json({ etapas: agregarFunil(rows) });
});

// Conversão por mês: criados, ganhos, perdidos e taxa de conversão.
r.get("/conversao", (req, res) => {
  const meses = lerMeses(req);
  const criados = db.prepare("SELECT criado_em FROM negocios").all();
  const fechados = db
    .prepare(
      "SELECT etapa, fechado_em FROM negocios WHERE etapa IN ('Fechado (ganho)','Perdido') AND fechado_em IS NOT NULL"
    )
    .all();
  res.json({ meses: agregarConversao(criados, fechados, meses, new Date()) });
});

// Receita / fluxo de caixa por mês: recebido, a_receber e atrasado.
r.get("/receita", (req, res) => {
  const meses = lerMeses(req);
  const hoje = hojeISO();
  // Marca como atrasadas as parcelas vencidas ainda em aberto (mesma regra do dashboard).
  db.prepare("UPDATE parcelas SET status='atrasado' WHERE status='a_receber' AND vencimento < ?").run(hoje);
  const rows = db.prepare("SELECT valor, status, vencimento, recebido_em FROM parcelas").all();
  res.json({ meses: agregarReceita(rows, meses, new Date(), hoje) });
});

// Distribuição de negócios por origem (contagem + valor).
r.get("/origem", (_req, res) => {
  const rows = db.prepare("SELECT origem, valor_estimado FROM negocios").all();
  res.json({ origens: agregarOrigem(rows) });
});

// Resumo executivo: ticket médio, projetos por status, a receber e win rate.
r.get("/resumo", (_req, res) => {
  const hoje = hojeISO();
  db.prepare("UPDATE parcelas SET status='atrasado' WHERE status='a_receber' AND vencimento < ?").run(hoje);
  const projetos = db.prepare("SELECT valor, status FROM projetos").all();
  const negocios = db.prepare("SELECT etapa FROM negocios").all();
  const aReceber = db
    .prepare("SELECT COALESCE(SUM(valor),0) v FROM parcelas WHERE status IN ('a_receber','atrasado')")
    .get().v;
  res.json(agregarResumo(projetos, negocios, aReceber));
});

export default r;
