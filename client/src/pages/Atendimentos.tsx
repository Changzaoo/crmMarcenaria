import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  MessageSquare,
  User,
  Trash2,
  RefreshCw,
  MessageCircleMore,
} from "lucide-react";
import { PageHeader, Card, Badge, EmptyState, Spinner, useUI } from "../components/ui";
import { dataHora } from "../lib/format";
import {
  listarConversas,
  obterConversa,
  removerConversa,
  type ConversaResumo,
  type ConversaDetalhe,
} from "../services/conversaService";

export default function Atendimentos() {
  const { toast, confirm } = useUI();
  const navigate = useNavigate();

  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalhes, setDetalhes] = useState<ConversaDetalhe | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  // Carrega a lista de conversas (com flag silencioso para polling sem piscar o spinner).
  const carregar = (silencioso = false) => {
    if (!silencioso) setLoading(true);
    listarConversas()
      .then(setConversas)
      .catch(() => {
        if (!silencioso) toast("Falha ao carregar conversas", "err");
      })
      .finally(() => {
        if (!silencioso) setLoading(false);
      });
  };

  // Recarrega ao montar e a cada 5s.
  useEffect(() => {
    carregar();
    const t = setInterval(() => carregar(true), 5000);
    return () => clearInterval(t);
  }, []);

  // Carrega os detalhes da conversa selecionada.
  useEffect(() => {
    if (!selectedId) {
      setDetalhes(null);
      return;
    }
    setLoadingDetalhes(true);
    obterConversa(selectedId)
      .then(setDetalhes)
      .catch(() => {
        toast("Falha ao carregar conversa", "err");
        setDetalhes(null);
      })
      .finally(() => setLoadingDetalhes(false));
  }, [selectedId]);

  // Exclui uma conversa.
  async function excluir(id: string, nome: string) {
    const nomePessoa = nome || "anônimo";
    if (
      !(await confirm(
        `Excluir a conversa com "${nomePessoa}"? Essa ação não pode ser desfeita.`
      ))
    )
      return;
    try {
      await removerConversa(id);
      setConversas((cs) => cs.filter((c) => c.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setDetalhes(null);
      }
      toast("Conversa removida.");
    } catch {
      toast("Falha ao remover conversa", "err");
    }
  }

  return (
    <div>
      <PageHeader
        title="Atendimentos IA"
        subtitle="Conversas do assistente de IA do site e leads gerados"
        actions={
          <button onClick={() => carregar()} className="btn-ghost text-sm">
            <RefreshCw size={14} /> Atualizar
          </button>
        }
      />

      {loading ? (
        <Spinner />
      ) : conversas.length === 0 ? (
        <EmptyState
          icon="💬"
          title="Nenhuma conversa ainda"
          hint="As conversas aparecem quando um visitante interage com o assistente de IA do site."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {/* Painel esquerdo: lista de conversas */}
          <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
            {conversas.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left rounded-lg border transition-all p-3 ${
                  selectedId === c.id
                    ? "bg-surfaceSoft border-champagne/40 shadow-[0_0_0_2px_rgba(218,161,58,0.1)]"
                    : "card border-white/5 hover:border-champagne/20 hover:bg-surfaceSoft/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-text truncate text-sm">
                      {c.nome || "Visitante anônimo"}
                    </div>
                    {c.tipo_projeto && (
                      <div className="text-[11px] text-muted mt-0.5">
                        {c.tipo_projeto} {c.cidade_estado && `· ${c.cidade_estado}`}
                      </div>
                    )}
                  </div>
                  <Badge tone={c.convertida === 1 ? "green" : "default"}>
                    {c.convertida === 1 ? "✓ Lead" : "Chat"}
                  </Badge>
                </div>

                {c.ultima_mensagem && (
                  <div className="text-xs text-muted line-clamp-2 mb-2">
                    {c.ultima_mensagem.substring(0, 80)}
                    {c.ultima_mensagem.length > 80 ? "..." : ""}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span>{c.total_mensagens} mensagens</span>
                  <span>{dataHora(c.atualizado_em)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Painel direito: detalhe da conversa */}
          <div className="lg:col-span-2 xl:col-span-3">
            {selectedId === null ? (
              <Card className="h-[70vh] flex items-center justify-center">
                <div className="text-center">
                  <MessageCircleMore size={32} className="mx-auto text-muted mb-3 opacity-50" />
                  <p className="text-muted text-sm">Selecione uma conversa para ver os detalhes</p>
                </div>
              </Card>
            ) : loadingDetalhes ? (
              <Card className="h-[70vh] flex items-center justify-center">
                <Spinner />
              </Card>
            ) : detalhes ? (
              <Card className="flex flex-col h-[70vh]">
                {/* Cabeçalho */}
                <div className="border-b border-white/5 pb-4 mb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-lg font-medium text-text">
                        {detalhes.nome || "Visitante anônimo"}
                      </h2>
                      <div className="text-xs text-muted mt-1 space-y-0.5">
                        {detalhes.email && <div>📧 {detalhes.email}</div>}
                        {detalhes.whatsapp && <div>📱 {detalhes.whatsapp}</div>}
                        {detalhes.tipo_projeto && (
                          <div>
                            📋 {detalhes.tipo_projeto}
                            {detalhes.cidade_estado && ` · ${detalhes.cidade_estado}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge tone={detalhes.convertida === 1 ? "green" : "default"}>
                      {detalhes.convertida === 1 ? "Lead criado" : "Em conversa"}
                    </Badge>
                  </div>

                  {detalhes.convertida === 1 && detalhes.lead_id && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                      ✓ Lead criado no CRM
                      <button
                        onClick={() => navigate("/suporte-3d")}
                        className="ml-2 underline hover:text-emerald-100"
                      >
                        Ver no Suporte 3D
                      </button>
                    </div>
                  )}
                </div>

                {/* Transcrição das mensagens */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {detalhes.mensagens.map((msg, idx) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "tool" ? (
                        <div className="px-3 py-1.5 rounded-lg text-[11px] text-muted bg-white/5 border border-white/10 flex items-center gap-1.5">
                          <span>⚙</span>
                          <span>{msg.conteudo}</span>
                        </div>
                      ) : (
                        <div
                          className={`max-w-xs lg:max-w-md px-3.5 py-2.5 rounded-lg text-sm ${
                            msg.role === "user"
                              ? "bg-champagne/20 border border-champagne/40 text-text"
                              : "bg-white/5 border border-white/10 text-muted"
                          }`}
                        >
                          {msg.conteudo}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Rodapé */}
                <div className="border-t border-white/5 pt-4 flex gap-2">
                  <button
                    onClick={() => excluir(detalhes.id, detalhes.nome || "anônimo")}
                    className="btn-ghost text-xs py-2 !text-red-300/80 hover:!text-red-300 hover:!border-red-500/40"
                  >
                    <Trash2 size={14} /> Excluir conversa
                  </button>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
