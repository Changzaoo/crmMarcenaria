import { Router } from "express";
import { db } from "../db/index.js";
import { ETAPAS_CRM } from "../db/schema.js";

const r = Router();

r.get("/", (_req, res) => {
  const hoje = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const mesAtual = iso(hoje).slice(0, 7);
  const em14 = new Date(hoje);
  em14.setDate(em14.getDate() + 14);

  // Atualiza atrasos
  db.prepare("UPDATE parcelas SET status='atrasado' WHERE status='a_receber' AND vencimento < ?").run(iso(hoje));

  const abertas = ETAPAS_CRM.filter((e) => e !== "Fechado (ganho)" && e !== "Perdido");
  const placeholders = abertas.map(() => "?").join(",");
  const valorFunil = db.prepare(
    `SELECT COALESCE(SUM(valor_estimado),0) v FROM negocios WHERE etapa IN (${placeholders})`
  ).get(...abertas).v;

  const ganhosMes = db.prepare(
    "SELECT COUNT(*) c FROM negocios WHERE etapa='Fechado (ganho)' AND substr(fechado_em,1,7)=?"
  ).get(mesAtual).c;
  const perdidosMes = db.prepare(
    "SELECT COUNT(*) c FROM negocios WHERE etapa='Perdido' AND substr(fechado_em,1,7)=?"
  ).get(mesAtual).c;
  const totalFechadosMes = ganhosMes + perdidosMes;
  const conversao = totalFechadosMes ? Math.round((ganhosMes / totalFechadosMes) * 100) : 0;

  const emProducao = db.prepare(
    "SELECT COUNT(*) c FROM projetos WHERE status NOT IN ('Concluído','Cancelado')"
  ).get().c;

  const instalacoes = db.prepare(
    "SELECT COUNT(*) c FROM eventos_agenda WHERE tipo='instalacao' AND data BETWEEN ? AND ? AND concluido=0"
  ).get(iso(hoje), iso(em14)).c;

  const aReceber = db.prepare(
    "SELECT COALESCE(SUM(valor),0) v FROM parcelas WHERE status IN ('a_receber','atrasado')"
  ).get().v;
  const atrasado = db.prepare(
    "SELECT COALESCE(SUM(valor),0) v FROM parcelas WHERE status='atrasado'"
  ).get().v;

  // Funil por etapa
  const funil = abertas.map((etapa) => {
    const row = db.prepare(
      "SELECT COUNT(*) qtd, COALESCE(SUM(valor_estimado),0) valor FROM negocios WHERE etapa = ?"
    ).get(etapa);
    return { etapa, qtd: row.qtd, valor: row.valor };
  });

  // Próximos follow-ups (5)
  const followups = db.prepare(
    `SELECT i.id, i.descricao, i.proximo_follow_up, i.tipo, n.id AS negocio_id, n.titulo AS negocio_titulo,
            e.nome_fantasia AS empresa_nome
     FROM interacoes i
     JOIN negocios n ON n.id = i.negocio_id
     LEFT JOIN empresas e ON e.id = n.empresa_id
     WHERE i.follow_up_concluido = 0 AND i.proximo_follow_up IS NOT NULL
     ORDER BY i.proximo_follow_up ASC LIMIT 5`
  ).all();
  for (const f of followups) f.vencido = f.proximo_follow_up < iso(hoje);

  res.json({
    valorFunil,
    conversao,
    ganhosMes,
    emProducao,
    instalacoes,
    aReceber,
    atrasado,
    funil,
    followups,
  });
});

export default r;
