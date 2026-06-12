import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { moeda, moedaCurta, data, vencido } from "../lib/format";
import { Dashboard as Dash } from "../types";
import { PageHeader, Card, Badge, Spinner } from "../components/ui";

export default function Dashboard() {
  const nav = useNavigate();
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => { api.get<Dash>("/dashboard").then(setD); }, []);
  if (!d) return <Spinner />;

  const cards = [
    { label: "Em negociação no funil", value: moeda(d.valorFunil), tone: "text-champagne", to: "/crm" },
    { label: "Conversão do mês", value: `${d.conversao}%`, sub: `${d.ganhosMes} ganho(s)`, to: "/crm" },
    { label: "Projetos em produção", value: String(d.emProducao), to: "/projetos" },
    { label: "Instalações (14 dias)", value: String(d.instalacoes), to: "/agenda" },
    { label: "Contas a receber", value: moeda(d.aReceber), sub: d.atrasado > 0 ? `${moeda(d.atrasado)} atrasado` : "em dia", tone: d.atrasado > 0 ? "text-red-300" : "text-emerald-300", to: "/financeiro" },
  ];
  const maxValor = Math.max(...d.funil.map((f) => f.valor), 1);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral da operação"
        actions={<button className="btn-primary" onClick={() => nav("/crm")}>+ Novo lead</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={c.to}>
              <Card className="hover:border-champagne/30 h-full">
                <div className="text-xs text-muted">{c.label}</div>
                <div className={`font-display text-2xl mt-2 ${c.tone || "text-text"}`}>{c.value}</div>
                {c.sub && <div className="text-xs text-muted mt-1">{c.sub}</div>}
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-4">Funil comercial</h3>
          <div className="space-y-3">
            {d.funil.map((f) => (
              <div key={f.etapa}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">{f.etapa} <span className="text-xs">({f.qtd})</span></span>
                  <span className="text-champagne font-medium">{moedaCurta(f.valor)}</span>
                </div>
                <div className="h-2 rounded-full bg-surfaceSoft overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-bronze to-champagne rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${(f.valor / maxValor) * 100}%` }} transition={{ duration: 0.6 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Próximos follow-ups</h3>
          {d.followups.length === 0 ? <p className="text-muted text-sm">Nada pendente. 🎉</p> : (
            <div className="space-y-3">
              {d.followups.map((f) => (
                <Link key={f.id} to="/crm" className="block">
                  <div className={`p-3 rounded-lg bg-surfaceSoft hover:bg-surfaceSoft/70 ${f.vencido ? "border-l-2 border-red-500" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{f.negocio_titulo}</span>
                      <span className={`text-[11px] ${f.vencido ? "text-red-400" : "text-muted"}`}>{data(f.proximo_follow_up)}</span>
                    </div>
                    <div className="text-xs text-muted mt-0.5">{f.empresa_nome} · {f.tipo}</div>
                    {f.vencido && <Badge tone="red">vencido</Badge>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
