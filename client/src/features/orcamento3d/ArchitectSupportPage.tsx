import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Eye, LogIn, MessageCircle, Search, BellRing, Trash2 } from "lucide-react";
import { PageHeader, Card, Badge, EmptyState, Spinner, useUI } from "../../components/ui";
import { dataHora, whatsappLink } from "../../lib/format";
import { listarLeads, atualizarLead, removerLead, STATUS_LEAD } from "./services/leadService";
import type { Lead3D } from "./services/leadService";
import { dlog } from "./dlog";

const TONE: Record<string, "default" | "gold" | "green" | "red" | "blue" | "wood"> = {
  Novo: "blue",
  "Em atendimento": "gold",
  "Projeto analisado": "wood",
  "Proposta enviada": "gold",
  Fechado: "green",
  Perdido: "red",
};

export default function ArchitectSupportPage() {
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");

  // silencioso = atualização em segundo plano (polling) sem piscar o spinner.
  const carregar = (silencioso = false) => {
    if (!silencioso) setLoading(true);
    listarLeads()
      .then(setLeads)
      .catch(() => { if (!silencioso) toast("Falha ao carregar leads 3D", "err"); })
      .finally(() => { if (!silencioso) setLoading(false); });
  };
  // Recarrega ao montar e a cada 4s, para que um "Chamar arquiteto" do cliente
  // apareça aqui ao vivo, sem precisar atualizar a página manualmente.
  useEffect(() => {
    carregar();
    const t = setInterval(() => carregar(true), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return leads
      .filter((l) => {
        const statusOk = filtro === "Todos" || statusBase(l.status) === filtro;
        const buscaOk = !q || [l.nome, l.email, l.whatsapp, l.tipo_projeto, l.cidade_estado].some((v) => v?.toLowerCase().includes(q));
        return statusOk && buscaOk;
      })
      // Quem está chamando o arquiteto vai para o topo.
      .sort((a, b) => (b.arquiteto_solicitado ? 1 : 0) - (a.arquiteto_solicitado ? 1 : 0));
  }, [leads, busca, filtro]);

  const chamando = useMemo(() => leads.filter((l) => l.arquiteto_solicitado).length, [leads]);

  function entrar(l: Lead3D) {
    // Ao entrar na sessão, limpa o sinal de "chamando arquiteto".
    if (l.arquiteto_solicitado) {
      setLeads((ls) => ls.map((x) => (x.id === l.id ? { ...x, arquiteto_solicitado: 0 } : x)));
      atualizarLead(l.id, { arquiteto_solicitado: 0 }).catch(() => {});
    }
    dlog("CRM_CALL", "Arquiteto aceitou/entrou:", { leadId: l.id, projetoId: l.projeto_id });
    navigate(`/suporte-3d/sessao/${l.projeto_id}`);
  }

  async function mudarStatus(id: string, status: string) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await atualizarLead(id, { status });
    } catch {
      toast("Não foi possível atualizar o status", "err");
    }
  }

  async function excluir(l: Lead3D) {
    if (!(await confirm(`Excluir o lead de "${l.nome}"? Isso remove o lead e o projeto 3D associado.`))) return;
    try {
      await removerLead(l.id);
      setLeads((ls) => ls.filter((x) => x.id !== l.id));
      toast("Lead removido.");
    } catch {
      toast("Não foi possível remover o lead.", "err");
    }
  }

  async function salvarNota(id: string, anotacoes: string) {
    try {
      await atualizarLead(id, { anotacoes });
      toast("Anotação salva");
    } catch {
      toast("Falha ao salvar anotação", "err");
    }
  }

  return (
    <div>
      <PageHeader
        title="Suporte 3D / Arquiteto"
        subtitle="Leads que iniciaram um Orçamento 3D — visualize o ambiente, entre na sessão e atenda em tempo real."
        actions={<button onClick={() => carregar()} className="btn-ghost text-sm">Atualizar</button>}
      />

      {chamando > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <BellRing size={16} className="animate-pulse" />
          {chamando === 1
            ? "1 cliente está chamando um arquiteto agora."
            : `${chamando} clientes estão chamando um arquiteto agora.`}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input data-tour="page-search" className="input pl-9" placeholder="Buscar por nome, e-mail, cidade..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="input w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option>Todos</option>
          {STATUS_LEAD.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : filtrados.length === 0 ? (
        <EmptyState icon="🧊" title="Nenhum lead 3D ainda" hint="Quando um cliente montar um ambiente no Estúdio 3D, ele aparece aqui automaticamente." />
      ) : (
        <div data-tour="suporte-card" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((l) => (
            <Card
              key={l.id}
              className={`flex flex-col gap-3 ${l.arquiteto_solicitado ? "ring-2 ring-amber-400/60 shadow-[0_0_0_4px_rgba(251,191,36,0.08)]" : ""}`}
            >
              {l.arquiteto_solicitado ? (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
                  <BellRing size={13} className="animate-pulse" /> Chamando arquiteto
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-text truncate">{l.nome}</div>
                  <div className="text-[11px] text-muted">{l.tipo_projeto || "—"} · {l.cidade_estado || "—"}</div>
                </div>
                <Badge tone={TONE[statusBase(l.status)] || "default"}>{statusBase(l.status)}</Badge>
              </div>

              <div className="text-xs text-muted space-y-0.5">
                <div>📧 {l.email || "—"}</div>
                <div>📱 {l.whatsapp || "—"}</div>
                <div>🕒 {dataHora(l.criado_em)}</div>
                {l.projeto_status === "enviado_analise" && <div className="text-emerald-300">✓ Projeto enviado para análise</div>}
              </div>

              <select
                className="input text-xs py-1.5"
                value={statusBase(l.status)}
                onChange={(e) => mudarStatus(l.id, e.target.value)}
              >
                {STATUS_LEAD.map((s) => <option key={s}>{s}</option>)}
              </select>

              <textarea
                className="input text-xs"
                rows={2}
                placeholder="Anotações internas..."
                defaultValue={l.anotacoes || ""}
                onBlur={(e) => { if (e.target.value !== (l.anotacoes || "")) salvarNota(l.id, e.target.value); }}
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!l.projeto_id}
                  onClick={() => navigate(`/suporte-3d/ver/${l.projeto_id}`)}
                  className="btn-ghost text-xs py-2 disabled:opacity-40"
                >
                  <Eye size={14} /> Ver ambiente
                </button>
                <button
                  disabled={!l.projeto_id}
                  onClick={() => entrar(l)}
                  className="btn-primary text-xs py-2 disabled:opacity-40"
                >
                  <LogIn size={14} /> Entrar
                </button>
                <a
                  href={whatsappLink(l.whatsapp, `Olá ${l.nome}, sou da LINEAR e vi o seu projeto 3D. Posso te ajudar?`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost text-xs py-2 col-span-2"
                >
                  <MessageCircle size={14} /> Chamar no WhatsApp
                </a>
                <button
                  onClick={() => excluir(l)}
                  className="btn-ghost text-xs py-2 col-span-2 !text-red-300/80 hover:!text-red-300 hover:!border-red-500/40"
                >
                  <Trash2 size={14} /> Excluir lead
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted mt-6 flex items-center gap-1.5">
        <Box size={13} className="text-champagne" /> "Entrar" abre o mesmo ambiente do cliente em sessão colaborativa em tempo real.
      </p>
    </div>
  );
}

// Normaliza status legados ("Novo Lead 3D" / "Projeto 3D enviado...") para o conjunto do funil.
function statusBase(status?: string): string {
  if (!status) return "Novo";
  if (status.startsWith("Novo")) return "Novo";
  if (status.includes("análise") || status.includes("analise")) return "Projeto analisado";
  return STATUS_LEAD.includes(status) ? status : "Novo";
}
