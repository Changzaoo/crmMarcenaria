import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { moeda, moedaCurta } from "../lib/format";
import { PageHeader, Card, Spinner, EmptyState, Select } from "../components/ui";
import { BarChart, LineChart, DonutChart, FunnelChart } from "../components/charts";
import { moedaEixo } from "../components/charts/chartUtils";

/* ----------------------------- Tipos da API ------------------------------ */
interface FunilEtapa {
  etapa: string;
  qtd: number;
  valor: number;
  valor_ponderado: number;
}
interface ConversaoMes {
  mes: string;
  rotulo: string;
  criados: number;
  ganhos: number;
  perdidos: number;
  fechados: number;
  taxa: number;
}
interface ReceitaMes {
  mes: string;
  rotulo: string;
  recebido: number;
  a_receber: number;
  atrasado: number;
}
interface OrigemItem {
  origem: string;
  qtd: number;
  valor: number;
}
interface Resumo {
  ticket_medio: number;
  total_projetos: number;
  projetos_por_status: { status: string; qtd: number }[];
  total_a_receber: number;
  ganhos: number;
  perdidos: number;
  win_rate: number;
}

interface DadosRelatorios {
  funil: FunilEtapa[];
  conversao: ConversaoMes[];
  receita: ReceitaMes[];
  origem: OrigemItem[];
  resumo: Resumo;
}

const PERIODOS = [3, 6, 12, 24];

export default function Relatorios() {
  const [meses, setMeses] = useState(6);
  const [dados, setDados] = useState<DadosRelatorios | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async (m: number) => {
    setCarregando(true);
    setErro(null);
    try {
      const [funil, conversao, receita, origem, resumo] = await Promise.all([
        api.get<{ etapas: FunilEtapa[] }>("/relatorios/funil"),
        api.get<{ meses: ConversaoMes[] }>(`/relatorios/conversao?meses=${m}`),
        api.get<{ meses: ReceitaMes[] }>(`/relatorios/receita?meses=${m}`),
        api.get<{ origens: OrigemItem[] }>("/relatorios/origem"),
        api.get<Resumo>("/relatorios/resumo"),
      ]);
      setDados({
        funil: funil.etapas,
        conversao: conversao.meses,
        receita: receita.meses,
        origem: origem.origens,
        resumo,
      });
    } catch (e) {
      setErro((e as Error)?.message || "Não foi possível carregar os relatórios.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar(meses);
  }, [meses, carregar]);

  const seletor = (
    <Select
      aria-label="Período em meses"
      value={meses}
      onChange={(e) => setMeses(Number(e.target.value))}
      className="!w-auto"
    >
      {PERIODOS.map((p) => (
        <option key={p} value={p}>
          Últimos {p} meses
        </option>
      ))}
    </Select>
  );

  if (carregando && !dados) {
    return (
      <div>
        <PageHeader title="Relatórios" subtitle="Análise comercial e financeira" actions={seletor} />
        <Spinner />
      </div>
    );
  }

  if (erro) {
    return (
      <div>
        <PageHeader title="Relatórios" subtitle="Análise comercial e financeira" actions={seletor} />
        <EmptyState
          icon="!"
          title="Erro ao carregar relatórios"
          hint={erro}
          action={<button className="btn-primary" onClick={() => carregar(meses)}>Tentar novamente</button>}
        />
      </div>
    );
  }

  if (!dados) return null;

  const { funil, conversao, receita, origem, resumo } = dados;

  // Funil só com etapas em aberto (sem Fechado/Perdido) para a leitura do pipeline.
  const funilAberto = funil.filter((f) => f.etapa !== "Fechado (ganho)" && f.etapa !== "Perdido");
  const totalEmFunil = funilAberto.reduce((s, f) => s + f.valor, 0);
  const totalPonderado = funilAberto.reduce((s, f) => s + f.valor_ponderado, 0);
  const semDados =
    funil.every((f) => f.qtd === 0) &&
    receita.every((m) => m.recebido === 0 && m.a_receber === 0 && m.atrasado === 0) &&
    origem.length === 0;

  const cards = [
    { label: "Ticket médio (projetos)", value: moeda(resumo.ticket_medio), tone: "text-champagne" },
    { label: "Win rate geral", value: `${resumo.win_rate}%`, sub: `${resumo.ganhos} ganho(s) · ${resumo.perdidos} perdido(s)` },
    { label: "Em negociação (ponderado)", value: moedaCurta(totalPonderado), sub: `de ${moedaCurta(totalEmFunil)} no funil` },
    {
      label: "A receber",
      value: moeda(resumo.total_a_receber),
      tone: resumo.total_a_receber > 0 ? "text-emerald-300" : "text-text",
    },
  ];

  const temConversao = conversao.some((m) => m.criados > 0 || m.fechados > 0);
  const temReceita = receita.some((m) => m.recebido > 0 || m.a_receber > 0 || m.atrasado > 0);

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Análise comercial e financeira" actions={seletor} />

      {semDados ? (
        <EmptyState
          icon="✦"
          title="Ainda sem dados para analisar"
          hint="Cadastre negócios no funil, projetos e parcelas — os relatórios passam a refletir a operação automaticamente."
        />
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="h-full">
                  <div className="text-xs text-muted">{c.label}</div>
                  <div className={`font-display text-2xl mt-2 ${c.tone || "text-text"}`}>{c.value}</div>
                  {c.sub && <div className="text-xs text-muted mt-1">{c.sub}</div>}
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Funil */}
          <Card className="mb-6">
            <FunnelChart
              title="Funil comercial"
              stages={funilAberto.map((f) => ({
                label: f.etapa,
                value: f.valor,
                count: f.qtd,
                secondary: f.valor_ponderado,
              }))}
              formatValue={moedaCurta}
              secondaryLabel="ponderado por probabilidade"
            />
            <p className="text-xs text-muted mt-2">
              Barra clara: valor estimado · faixa escura na base: valor ponderado pela probabilidade de fechamento.
            </p>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Conversão */}
            <Card>
              {temConversao ? (
                <>
                  <LineChart
                    title="Conversão por mês"
                    data={conversao.map((m) => ({
                      label: m.rotulo,
                      values: { taxa: m.taxa, criados: m.criados },
                    }))}
                    series={[
                      { key: "taxa", label: "Taxa de conversão (%)", max: 100, color: "#6FCF97" },
                      { key: "criados", label: "Negócios criados", color: "#D8B978" },
                    ]}
                    formatValue={(v) => String(Math.round(v))}
                  />
                  <p className="text-xs text-muted mt-2">
                    Taxa = ganhos ÷ (ganhos + perdidos) no mês de fechamento.
                  </p>
                </>
              ) : (
                <SemGrafico titulo="Conversão por mês" />
              )}
            </Card>

            {/* Origem */}
            <Card>
              <h3 className="font-semibold mb-4 text-text">Origem dos leads</h3>
              {origem.length ? (
                <DonutChart
                  title="Origem dos leads"
                  centerLabel="Negócios"
                  centerValue={String(origem.reduce((s, o) => s + o.qtd, 0))}
                  data={origem.map((o) => ({ label: o.origem, value: o.qtd }))}
                  formatValue={(v) => `${Math.round(v)}`}
                />
              ) : (
                <SemGrafico titulo="" />
              )}
            </Card>
          </div>

          {/* Receita / fluxo de caixa */}
          <Card className="mb-6">
            {temReceita ? (
              <BarChart
                title="Fluxo de caixa por mês"
                data={receita.map((m) => ({
                  label: m.rotulo,
                  values: { recebido: m.recebido, a_receber: m.a_receber, atrasado: m.atrasado },
                }))}
                series={[
                  { key: "recebido", label: "Recebido", color: "#6FCF97" },
                  { key: "a_receber", label: "A receber", color: "#D8B978" },
                  { key: "atrasado", label: "Atrasado", color: "#F2A6A6" },
                ]}
                formatValue={moedaEixo}
              />
            ) : (
              <SemGrafico titulo="Fluxo de caixa por mês" />
            )}
          </Card>

          {/* Projetos por status */}
          {resumo.projetos_por_status.length > 0 && (
            <Card>
              <h3 className="font-semibold mb-4 text-text">Projetos por status</h3>
              <div className="flex flex-wrap gap-3">
                {resumo.projetos_por_status.map((s) => (
                  <div key={s.status} className="px-4 py-3 rounded-lg bg-surfaceSoft border border-white/5 min-w-[120px]">
                    <div className="font-display text-2xl text-text">{s.qtd}</div>
                    <div className="text-xs text-muted mt-1">{s.status}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function SemGrafico({ titulo }: { titulo: string }) {
  return (
    <div>
      {titulo && <h3 className="font-semibold mb-4 text-text">{titulo}</h3>}
      <div className="py-10 text-center text-sm text-muted">Sem dados no período selecionado.</div>
    </div>
  );
}
