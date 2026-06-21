import { useEffect, useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { FileText, Plus, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { moeda, moedaCurta, data, vencido, whatsappLink, aplicarTemplate } from "../lib/format";
import { Negocio, NegocioDetalhe, Dados3D, Empresa, EmpresaDetalhe, Funcionario, TemplateWhatsapp, ETAPAS_CRM, SEGMENTOS, ORIGENS, MOTIVOS_PERDA } from "../types";
import { PageHeader, Card, Modal, Field, Input, Select, Textarea, Badge, useUI, Spinner } from "../components/ui";
import { useNotifications } from "../components/Notifications";

const ABERTAS = ETAPAS_CRM.filter((e) => e !== "Perdido");

// Cor de acento por etapa — dá leitura/escaneabilidade ao funil.
const STAGE_COLORS: Record<string, string> = {
  "Lead": "#8aa6c8",
  "Qualificação": "#6cc5d8",
  "Briefing técnico": "#7c9fe0",
  "Visita/Medição": "#b79be6",
  "Proposta enviada": "#D8B978",
  "Negociação": "#e0a96d",
  "Fechado (ganho)": "#7bc47f",
  "Perdido": "#d98a8a",
};
const corEtapa = (e: string) => STAGE_COLORS[e] || "#D8B978";

function parse3D(neg: NegocioDetalhe): Dados3D | null {
  try {
    return neg.dados_3d ? (JSON.parse(neg.dados_3d) as Dados3D) : null;
  } catch {
    return null;
  }
}

function apiErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Falha ao carregar dados.";
}

export default function CRM() {
  const { toast } = useUI();
  const { push: pushNotif } = useNotifications();
  const nav = useNavigate();
  const [negocios, setNegocios] = useState<Negocio[] | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const arrastando = useRef(false);
  const knownIds = useRef<Set<number> | null>(null);
  // Controle de corrida entre o move (otimista + PATCH) e o polling de fundo:
  const movendo = useRef(0);          // nº de moves sendo persistidos (PATCH em voo)
  const bloquearPollAte = useRef(0);  // timestamp até o qual o poll não sobrescreve a UI
  const cargaSeq = useRef(0);         // geração da última carga (descarta respostas obsoletas)
  const [novo, setNovo] = useState<Partial<Negocio> | null>(null);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [perda, setPerda] = useState<{ id: number; ordem: number; motivo: string } | null>(null);

  // Fallback de ordenação via localStorage — garante que mesmo que o Firebase
  // snapshot não persista a nova ordem entre reloads, a UI mantenha a posição
  // visual dos cards. A ordenação "verdadeira" é sempre no servidor; este cache
  // apenas evita o "salto" momentâneo até o servidor ser consultado.
  const ORDEM_KEY = "crm:ordem-cards";
  function salvarOrdemLocal(etapa: string, cardIds: number[]) {
    try {
      const atual = JSON.parse(localStorage.getItem(ORDEM_KEY) || "{}");
      atual[etapa] = cardIds;
      localStorage.setItem(ORDEM_KEY, JSON.stringify(atual));
    } catch { /* ignora */ }
  }
  function aplicarOrdemLocal(dados: Negocio[]): Negocio[] {
    try {
      const cache = JSON.parse(localStorage.getItem(ORDEM_KEY) || "{}");
      if (Object.keys(cache).length === 0) return dados;
      return dados.map((n) => {
        const ids = cache[n.etapa];
        if (ids && Array.isArray(ids)) {
          const idx = ids.indexOf(n.id);
          if (idx !== -1) return { ...n, ordem: idx };
        }
        return n;
      });
    } catch {
      return dados;
    }
  }
  // Reescreve o cache para refletir o estado realmente aplicado (servidor + fallback),
  // podando ids que não existem mais e cards que mudaram de etapa. Sem isto o cache
  // acumula entradas obsoletas e diverge permanentemente do servidor com o tempo.
  function reconciliarCacheLocal(lista: Negocio[]) {
    try {
      const porEtapa: Record<string, number[]> = {};
      for (const n of [...lista].sort((a, b) => a.ordem - b.ordem)) {
        (porEtapa[n.etapa] ||= []).push(n.id);
      }
      localStorage.setItem(ORDEM_KEY, JSON.stringify(porEtapa));
    } catch { /* ignora */ }
  }

  // Carrega o funil do servidor. `silencioso` (poll de fundo) não sobrescreve a UI
  // enquanto há um move em andamento/recente, evitando que uma leitura mais antiga
  // (ou de instância desatualizada) "puxe" um card de volta para a posição anterior.
  const carregar = async (opts: { silencioso?: boolean } = {}) => {
    const seq = ++cargaSeq.current;
    let dados: Negocio[];
    try {
      dados = await api.get<Negocio[]>("/negocios");
    } catch (error) {
      // Só reporta o erro se esta ainda for a carga mais recente e não for poll.
      if (seq === cargaSeq.current && !opts.silencioso) {
        const msg = apiErrorMessage(error);
        setErroCarga(msg);
        toast(msg, "err");
      }
      return negocios || [];
    }

    // Resposta obsoleta: outra carga mais nova já foi disparada (ex.: recarga
    // pós-move). Descarta para não sobrescrever a UI com dados antigos.
    if (seq !== cargaSeq.current) return dados;

    // Detecta novos leads/orçamentos e emite notificação (sempre — mesmo que a
    // aplicação visual seja adiada por um move em andamento).
    if (knownIds.current !== null) {
      const novos = dados.filter((n) => !knownIds.current!.has(n.id));
      for (const n of novos) {
        const eh3d = n.origem === "Orçamento 3D";
        const ehSite = n.origem === "Solicitar proposta";
        const titulo = eh3d ? "Novo orçamento 3D recebido" : ehSite ? "Nova solicitação do site" : "Novo lead";
        pushNotif({ id: `negocio:${n.id}`, type: "lead", title: titulo, body: n.titulo, to: "/crm" });
      }
    }
    knownIds.current = new Set(dados.map((n) => n.id));

    // Nunca sobrescreve durante o gesto de arrastar. Polls de fundo também não
    // sobrescrevem com um move sendo persistido nem na janela de carência logo
    // após um move (dá tempo do snapshot propagar entre instâncias no Vercel).
    if (arrastando.current) return dados;
    if (opts.silencioso && (movendo.current > 0 || Date.now() < bloquearPollAte.current)) return dados;

    // Aplica ordenação local como fallback — se o servidor retornou ordem
    // inconsistente (ex.: cold start no Vercel sem snapshot recente), o cache do
    // localStorage mantém a disposição visual que o usuário definiu.
    const aplicado = aplicarOrdemLocal(dados);
    setNegocios(aplicado);
    reconciliarCacheLocal(aplicado);
    setErroCarga(null);
    return dados;
  };

  const [sincronizando, setSincronizando] = useState(false);

  // Importa os Orçamentos 3D para o funil (idempotente). Best-effort.
  const sincronizar3d = async (avisar = false) => {
    try {
      const out = await api.post<{ criados: number; atualizados: number }>("/negocios/sincronizar-3d", {});
      if (avisar) {
        toast(
          out.criados || out.atualizados
            ? `Orçamentos 3D sincronizados: ${out.criados} novo(s), ${out.atualizados} atualizado(s).`
            : "Nenhum Orçamento 3D novo para importar.",
        );
      }
      return out;
    } catch {
      if (avisar) toast("Não foi possível sincronizar os Orçamentos 3D agora.", "err");
      return null;
    }
  };

  const carregarTudo = async () => {
    try {
      await sincronizar3d(); // traz Orçamentos 3D para o funil antes de listar
      const [dadosNegocios, dadosEmpresas, dadosFunc] = await Promise.all([
        api.get<Negocio[]>("/negocios"),
        api.get<Empresa[]>("/empresas"),
        api.get<Funcionario[]>("/funcionarios").catch(() => []),
      ]);
      cargaSeq.current += 1; // marca uma carga "fresca": invalida polls em voo
      const aplicado = aplicarOrdemLocal(dadosNegocios);
      setNegocios(aplicado);
      reconciliarCacheLocal(aplicado);
      knownIds.current = new Set(dadosNegocios.map((n) => n.id));
      setEmpresas(dadosEmpresas);
      setFuncionarios(dadosFunc);
      setErroCarga(null);
    } catch (error) {
      const msg = apiErrorMessage(error);
      setNegocios(null);
      setErroCarga(msg);
      toast(msg, "err");
    }
  };

  const sincronizarManual = async () => {
    setSincronizando(true);
    await sincronizar3d(true);
    await carregar();
    setSincronizando(false);
  };

  useEffect(() => { carregarTudo(); }, []);

  // Auto-atualização: a cada 12s recarrega o funil; a cada ~60s também importa
  // novos Orçamentos 3D — assim leads novos aparecem sem apertar nenhum botão.
  useEffect(() => {
    let n = 0;
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      // Não dispara polling durante o gesto nem com um move sendo persistido.
      if (arrastando.current || movendo.current > 0) return;
      n += 1;
      if (n % 5 === 0) await sincronizar3d();
      await carregar({ silencioso: true });
    }, 12000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDragEnd = async (r: DropResult) => {
    arrastando.current = false;
    if (!r.destination || !negocios) return;
    const id = Number(r.draggableId);
    const etapa = r.destination.droppableId;
    const ordem = r.destination.index;
    const neg = negocios.find((n) => n.id === id);
    if (!neg) return;
    if (etapa === neg.etapa && ordem === neg.ordem) return;

    if (etapa === "Perdido") { setPerda({ id, ordem, motivo: "preço" }); return; }

    // Reconstrói a coluna de DESTINO com a mesma semântica do drag-and-drop (e do
    // servidor): remove o card e o reinsere na posição alvo. Espelhar a renumeração
    // do servidor evita ordens duplicadas e o "salto" do card no refresh seguinte.
    const origemEtapa = neg.etapa;
    const destinoIds = negocios
      .filter((n) => n.etapa === etapa && n.id !== id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((n) => n.id);
    destinoIds.splice(Math.min(ordem, destinoIds.length), 0, id);
    const origemIds = origemEtapa === etapa ? null : negocios
      .filter((n) => n.etapa === origemEtapa && n.id !== id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((n) => n.id);

    // Atualização otimista: aplica a nova etapa/ordem em TODOS os cards afetados.
    setNegocios((prev) => {
      if (!prev) return prev;
      const ordemDestino = new Map(destinoIds.map((cid, i) => [cid, i]));
      const ordemOrigem = origemIds ? new Map(origemIds.map((cid, i) => [cid, i])) : null;
      return prev.map((n) => {
        if (n.id === id) return { ...n, etapa, ordem: ordemDestino.get(id) ?? ordem };
        if (n.etapa === etapa && ordemDestino.has(n.id)) return { ...n, ordem: ordemDestino.get(n.id)! };
        if (ordemOrigem && n.etapa === origemEtapa && ordemOrigem.has(n.id)) return { ...n, ordem: ordemOrigem.get(n.id)! };
        return n;
      });
    });

    // Fallback de ordenação em localStorage (resiste a reload/cold start no Vercel).
    salvarOrdemLocal(etapa, destinoIds);
    if (origemIds) salvarOrdemLocal(origemEtapa, origemIds);

    movendo.current += 1;
    try {
      const res = await api.patch<{ projetoCriado: number | null }>(`/negocios/${id}/mover`, { etapa, ordem });
      if (res.projetoCriado) {
        toast("Negócio ganho! Projeto criado com as 10 etapas.");
        if (confirm("Converter o orçamento aprovado em contrato e abrir o projeto agora?")) nav(`/projetos/${res.projetoCriado}`);
      }
    } catch (e: any) {
      toast(e?.message || "Não foi possível mover o card.", "err");
    } finally {
      movendo.current -= 1;
      // Janela de carência: por alguns segundos, polls de fundo não sobrescrevem a
      // UI — evita reversão por leitura de instância ainda desatualizada no Vercel.
      bloquearPollAte.current = Date.now() + 4000;
    }
    // Reconcilia com o servidor (autoritativo) SÓ quando não há mais moves em voo.
    // Se houver outro move pendente (moves rápidos em sequência), um reconcile
    // intermediário leria estado parcial e poderia reverter a posição otimista do
    // move que ainda não persistiu. O último move a terminar faz a reconciliação.
    if (movendo.current === 0) carregar();
  };

  const confirmarPerda = async () => {
    if (!perda) return;
    movendo.current += 1;
    try {
      await api.patch(`/negocios/${perda.id}/mover`, { etapa: "Perdido", ordem: perda.ordem, motivo_perda: perda.motivo });
      toast("Negócio movido para Perdido.");
    } catch (e: any) {
      toast(e?.message || "Não foi possível mover para Perdido.", "err");
    } finally {
      movendo.current -= 1;
      bloquearPollAte.current = Date.now() + 4000;
    }
    setPerda(null);
    if (movendo.current === 0) carregar();
  };

  const criar = async () => {
    if (!novo?.titulo) return toast("Informe um título.", "err");
    try { await api.post("/negocios", novo); setNovo(null); carregar(); toast("Lead criado."); }
    catch (e: any) { toast(e.message, "err"); }
  };

  if (!negocios && erroCarga) {
    return (
      <div>
        <PageHeader title="Funil comercial" subtitle="Arraste os cards entre as etapas" />
        <Card className="border-red-500/30 bg-red-500/5">
          <div className="font-semibold text-red-200">Nao foi possivel carregar o funil.</div>
          <p className="text-sm text-muted mt-1">{erroCarga}</p>
          <button className="btn-ghost mt-4" onClick={() => { setErroCarga(null); carregarTudo(); }}>
            Tentar novamente
          </button>
        </Card>
      </div>
    );
  }
  if (!negocios) return <Spinner />;
  const porEtapa = (et: string) => negocios.filter((n) => n.etapa === et).sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHeader title="Funil comercial" subtitle="Arraste os cards entre as etapas"
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={sincronizarManual} disabled={sincronizando}>
              {sincronizando ? "Sincronizando…" : "↻ Orçamentos 3D"}
            </button>
            <button data-tour="page-action" className="btn-primary" onClick={() => setNovo({ etapa: "Lead", probabilidade: 30, valor_estimado: 0, origem: "site", segmento: "loja" })}>+ Novo lead</button>
          </div>
        } />

      <DragDropContext onDragStart={() => { arrastando.current = true; }} onDragEnd={onDragEnd}>
        <div data-tour="crm-board" className="flex gap-4 overflow-x-auto flex-1 min-h-0 pb-2">
          {ABERTAS.map((etapa) => {
            const cards = porEtapa(etapa);
            const total = cards.reduce((s, n) => s + n.valor_estimado, 0);
            const ganho = etapa === "Fechado (ganho)";
            const cor = corEtapa(etapa);
            return (
              <Droppable droppableId={etapa} key={etapa}>
                {(prov, snap) => (
                  <div className="w-[300px] shrink-0 flex flex-col min-h-0 rounded-2xl border border-white/[0.06] bg-surface/40">
                    <div className="shrink-0 px-3.5 pt-3.5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cor, boxShadow: `0 0 10px ${cor}80` }} />
                        <span className={`text-[13px] font-semibold tracking-tight ${ganho ? "text-champagne" : "text-text"}`}>{etapa}</span>
                        <span className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-semibold text-muted tabular-nums">{cards.length}</span>
                        <span className="ml-auto text-[11px] font-semibold text-muted tabular-nums">{moedaCurta(total)}</span>
                      </div>
                      <div className="mt-2.5 h-px w-full" style={{ background: `linear-gradient(90deg, ${cor}55, transparent)` }} />
                    </div>
                    <div ref={prov.innerRef} {...prov.droppableProps}
                      className={`flex-1 min-h-0 overflow-y-auto px-2.5 pb-3 space-y-2.5 transition-colors ${snap.isDraggingOver ? "bg-champagne/[0.04]" : ""}`}>
                      {cards.length === 0 && !snap.isDraggingOver && (
                        <div className="grid place-items-center h-20 rounded-xl border border-dashed border-white/[0.06] text-[11px] text-muted/50">vazio</div>
                      )}
                      {cards.map((n, i) => {
                        const fuVencido = !!n.proximo_follow_up && vencido(n.proximo_follow_up);
                        return (
                        <Draggable draggableId={String(n.id)} index={i} key={n.id}>
                          {(p, s) => (
                            <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                              onClick={() => setDetalheId(n.id)}
                              className={`group rounded-xl border border-white/[0.07] bg-surfaceSoft/70 p-3.5 cursor-pointer transition hover:border-champagne/40 hover:bg-surfaceSoft ${s.isDragging ? "shadow-glow ring-1 ring-champagne/40 rotate-1" : ""}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-[13px] font-semibold leading-snug text-text">{n.titulo}</div>
                                {n.projeto_3d_id && n.origem === "Orçamento 3D" && (
                                  <span className="shrink-0 rounded-full border border-sky-400/40 bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-sky-200">3D</span>
                                )}
                                {n.origem === "Solicitar proposta" && (
                                  <span className="shrink-0 rounded-full border border-champagne/40 bg-champagne/15 px-1.5 py-0.5 text-[9px] font-semibold text-champagne">Site</span>
                                )}
                              </div>
                              <div className="mt-1 text-[11px] text-muted truncate">{n.empresa_nome || (n.origem === "Orçamento 3D" ? "Estúdio 3D" : n.origem === "Solicitar proposta" ? "Solicitação do site" : "—")}</div>
                              <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="text-[15px] font-bold text-champagne tabular-nums">{moedaCurta(n.valor_estimado)}</span>
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-champagne/70" style={{ width: `${Math.max(0, Math.min(100, n.probabilidade))}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted tabular-nums">{n.probabilidade}%</span>
                                </div>
                              </div>
                              {n.proximo_follow_up && (
                                <div className={`mt-2.5 flex items-center gap-1.5 text-[11px] ${fuVencido ? "text-red-300" : "text-muted"}`}>
                                  <span>⏰</span>{fuVencido ? "Follow-up vencido" : "Follow-up"} {data(n.proximo_follow_up)}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );})}
                      {prov.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
          {/* Coluna Perdido (somente leitura visual) */}
          <PerdidoColumn cards={porEtapa("Perdido")} onOpen={setDetalheId} />
        </div>
      </DragDropContext>

      {/* Novo lead */}
      <Modal open={!!novo} onClose={() => setNovo(null)} title="Novo lead">
        {novo && (
          <div className="space-y-4">
            <Field label="Título do negócio"><Input value={novo.titulo || ""} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Empresa">
                <Select value={novo.empresa_id || ""} onChange={(e) => setNovo({ ...novo, empresa_id: Number(e.target.value) || undefined })}>
                  <option value="">—</option>
                  {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</option>)}
                </Select>
              </Field>
              <Field label="Segmento">
                <Select value={novo.segmento} onChange={(e) => setNovo({ ...novo, segmento: e.target.value })}>
                  {SEGMENTOS.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Origem">
                <Select value={novo.origem} onChange={(e) => setNovo({ ...novo, origem: e.target.value })}>
                  {ORIGENS.map((o) => <option key={o}>{o}</option>)}
                </Select>
              </Field>
              <Field label="Responsável">
                <input className="input" list="func-list" placeholder="Quem cuida do lead…"
                  value={novo.responsavel || ""} onChange={(e) => setNovo({ ...novo, responsavel: e.target.value })} />
                <datalist id="func-list">
                  {funcionarios.filter((f) => f.ativo).map((f) => <option key={f.id} value={f.nome}>{f.funcao || ""}</option>)}
                </datalist>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Valor estimado"><Input type="number" value={novo.valor_estimado ?? 0} onChange={(e) => setNovo({ ...novo, valor_estimado: Number(e.target.value) })} /></Field>
              <Field label="Probabilidade %"><Input type="number" value={novo.probabilidade ?? 30} onChange={(e) => setNovo({ ...novo, probabilidade: Number(e.target.value) })} /></Field>
              <Field label="Previsão"><Input type="date" value={novo.data_prevista || ""} onChange={(e) => setNovo({ ...novo, data_prevista: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setNovo(null)}>Cancelar</button>
              <button className="btn-primary" onClick={criar}>Criar lead</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Motivo de perda */}
      <Modal open={!!perda} onClose={() => setPerda(null)} title="Motivo da perda">
        {perda && (
          <div className="space-y-4">
            <p className="text-muted text-sm">Informe por que este negócio foi perdido (obrigatório).</p>
            <Select value={perda.motivo} onChange={(e) => setPerda({ ...perda, motivo: e.target.value })}>
              {MOTIVOS_PERDA.map((m) => <option key={m}>{m}</option>)}
            </Select>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setPerda(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmarPerda}>Marcar como perdido</button>
            </div>
          </div>
        )}
      </Modal>

      {detalheId && <NegocioPainel id={detalheId} onClose={() => { setDetalheId(null); carregar(); }} />}
    </div>
  );
}

function PerdidoColumn({ cards, onOpen }: { cards: Negocio[]; onOpen: (id: number) => void }) {
  if (cards.length === 0) return null;
  const cor = corEtapa("Perdido");
  return (
    <div className="w-[300px] shrink-0 flex flex-col min-h-0 rounded-2xl border border-white/[0.06] bg-surface/40">
      <div className="shrink-0 px-3.5 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cor, boxShadow: `0 0 10px ${cor}80` }} />
          <span className="text-[13px] font-semibold tracking-tight text-red-300/90">Perdido</span>
          <span className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-semibold text-muted tabular-nums">{cards.length}</span>
        </div>
        <div className="mt-2.5 h-px w-full" style={{ background: `linear-gradient(90deg, ${cor}55, transparent)` }} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-3 space-y-2.5">
        {cards.map((n) => (
          <div key={n.id} onClick={() => onOpen(n.id)}
            className="rounded-xl border border-white/[0.07] bg-surfaceSoft/50 p-3.5 cursor-pointer opacity-70 transition hover:opacity-100 hover:border-red-400/30">
            <div className="text-[13px] font-semibold leading-snug text-text">{n.titulo}</div>
            <div className="mt-1 text-[11px] text-muted truncate">{n.empresa_nome}</div>
            {n.motivo_perda && <div className="mt-2"><Badge tone="red">{n.motivo_perda}</Badge></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Detalhe do negócio (timeline + interações + WhatsApp) ----------
function NegocioPainel({ id, onClose }: { id: number; onClose: () => void }) {
  const { toast, confirm } = useUI();
  const nav = useNavigate();
  const [neg, setNeg] = useState<NegocioDetalhe | null>(null);
  const [templates, setTemplates] = useState<TemplateWhatsapp[]>([]);
  const [empDet, setEmpDet] = useState<EmpresaDetalhe | null>(null);
  const [nova, setNova] = useState({ tipo: "nota", descricao: "", proximo_follow_up: "" });

  const carregar = () => api.get<NegocioDetalhe>(`/negocios/${id}`).then((n) => {
    setNeg(n);
    if (n.empresa_id) api.get<EmpresaDetalhe>(`/empresas/${n.empresa_id}`).then(setEmpDet);
  });
  useEffect(() => { carregar(); api.get<TemplateWhatsapp[]>("/config/templates").then(setTemplates); }, [id]);

  const addInteracao = async () => {
    if (!nova.descricao && nova.tipo === "nota") return toast("Escreva algo.", "err");
    try {
      const interacao = await api.post<{ id: number }>(`/negocios/${id}/interacoes`, {
        tipo: nova.tipo,
        descricao: nova.descricao,
        proximo_follow_up: nova.proximo_follow_up || null,
      });
      setNova({ tipo: "nota", descricao: "", proximo_follow_up: "" });
      await carregar();
      toast("Interação registrada.");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Falha ao registrar interação.", "err");
    }
  };
  const concluirFollow = async (iid: number, val: boolean) => {
    await api.patch(`/negocios/interacoes/${iid}`, { follow_up_concluido: val }); carregar();
  };
  const criarOrcamento = async () => {
    const orc = await api.post<{ id: number }>("/orcamentos", {
      negocio_id: neg!.id, empresa_id: neg!.empresa_id, titulo: neg!.titulo,
    });
    nav(`/orcamentos/${orc.id}`);
  };

  if (!neg) return <Modal open onClose={onClose} title="Carregando…"><Spinner /></Modal>;

  const contato = empDet?.contatos.find((c) => c.id === neg.contato_id) || empDet?.contatos.find((c) => c.principal) || empDet?.contatos[0];
  const waVars = { contato: contato?.nome || "", empresa: neg.empresa_nome || neg.empresa_razao || "" };

  // Dados do Estúdio 3D para alimentar o orçamento com os móveis montados.
  const d3d = parse3D(neg);
  const moveis3d = d3d?.moveis || [];
  const tem3D = !!(neg.projeto_3d_id || neg.dados_3d) && moveis3d.length > 0;

  // Cria (ou reaproveita) o orçamento do negócio, importa os móveis do 3D como
  // itens e abre a página do orçamento já com eles.
  const adicionarItens3D = async () => {
    try {
      let orcId = neg.orcamentos[0]?.id;
      if (!orcId) {
        const orc = await api.post<{ id: number }>("/orcamentos", {
          negocio_id: neg.id, empresa_id: neg.empresa_id, titulo: neg.titulo,
        });
        orcId = orc.id;
      }
      await api.post(`/orcamentos/${orcId}/importar-3d`, {
        moveis: moveis3d,
        ambiente: d3d?.tipo_projeto || "Ambiente 3D",
      });
      toast("Itens do 3D adicionados ao orçamento.");
      nav(`/orcamentos/${orcId}`);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Não foi possível adicionar ao orçamento.", "err");
    }
  };

  // Cria um cliente (empresa + contato) a partir dos dados do lead e vincula ao negócio.
  const adicionarCliente = async () => {
    try {
      await api.post(`/negocios/${neg.id}/criar-cliente`, {});
      toast("Cliente criado e vinculado ao negócio.");
      carregar();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Não foi possível criar o cliente.", "err");
    }
  };

  return (
    <Modal open onClose={onClose} title={neg.titulo} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="gold">{neg.etapa}</Badge>
            <Badge tone="wood">{neg.segmento}</Badge>
            <Badge>{neg.origem}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Empresa" value={neg.empresa_nome} />
            <Info label="Contato" value={contato?.nome} />
            <Info label="Valor estimado" value={moeda(neg.valor_estimado)} />
            <Info label="Probabilidade" value={`${neg.probabilidade}%`} />
            <Info label="Previsão" value={data(neg.data_prevista)} />
            <Info label="Responsável" value={neg.responsavel} />
          </div>

          {!neg.empresa_id && (neg.dados_3d || neg.projeto_3d_id) && (
            <button className="btn-ghost w-full text-sm" onClick={adicionarCliente}>
              <UserPlus size={15} /> Adicionar cliente ao sistema
            </button>
          )}

          {(neg.projeto_3d_id || neg.dados_3d) && <Resumo3D neg={neg} onAddOrcamento={tem3D ? adicionarItens3D : undefined} />}

          {contato?.telefone && (
            <div className="pt-2">
              <div className="label">Enviar WhatsApp</div>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <a key={t.id} target="_blank" href={whatsappLink(contato.telefone, aplicarTemplate(t.mensagem, waVars))}
                    className="chip bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25">
                    {t.nome}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Negócios do 3D criam o orçamento pelo card "Adicionar ao orçamento". */}
          {!tem3D && (
            <div className="flex gap-2 pt-3">
              <button className="btn-ghost flex-1" onClick={criarOrcamento}>Criar orçamento</button>
            </div>
          )}

          {neg.orcamentos.length > 0 && (
            <div className="pt-2">
              <div className="label">Orçamentos</div>
              <div className="space-y-2">
                {neg.orcamentos.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => nav(`/orcamentos/${o.id}`)}
                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-surfaceSoft px-3 py-2.5 text-left transition hover:border-champagne/40 hover:bg-surfaceSoft/70"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <FileText size={15} className="shrink-0 text-champagne" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">
                          {o.titulo} <span className="font-normal text-muted">v{o.versao}</span>
                        </span>
                        <span className="block text-[11px] text-muted">{o.status}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-champagne">Abrir →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-white/5">
            <button
              className="text-xs text-red-300/80 hover:text-red-300"
              onClick={async () => {
                if (!(await confirm(`Excluir o negócio "${neg.titulo}"? Esta ação não pode ser desfeita.`))) return;
                try { await api.del(`/negocios/${neg.id}`); toast("Negócio excluído."); onClose(); }
                catch (e: unknown) { toast(e instanceof Error ? e.message : "Falha ao excluir.", "err"); }
              }}
            >
              Excluir negócio
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div className="card p-3 bg-surfaceSoft mb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Select value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>
                {["nota", "ligação", "email", "WhatsApp", "reunião", "visita"].map((t) => <option key={t}>{t}</option>)}
              </Select>
              <Input type="date" value={nova.proximo_follow_up} onChange={(e) => setNova({ ...nova, proximo_follow_up: e.target.value })} title="Próximo follow-up" />
            </div>
            <Textarea rows={2} placeholder="Descrição da interação…" value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} />
            <button className="btn-primary w-full" onClick={addInteracao}>Registrar interação</button>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {neg.interacoes.length === 0 && <p className="text-muted text-sm">Sem interações ainda.</p>}
            {neg.interacoes.map((it) => (
              <div key={it.id} className="border-l-2 border-white/10 pl-3 py-1">
                <div className="flex items-center gap-2">
                  <Badge>{it.tipo}</Badge>
                  <span className="text-[11px] text-muted">{data(it.data)}</span>
                </div>
                {it.descricao && <p className="text-sm mt-1">{it.descricao}</p>}
                {it.proximo_follow_up && (
                  <label className={`flex items-center gap-2 text-[11px] mt-1 ${!it.follow_up_concluido && vencido(it.proximo_follow_up) ? "text-red-400" : "text-muted"}`}>
                    <input type="checkbox" checked={!!it.follow_up_concluido} onChange={(e) => concluirFollow(it.id, e.target.checked)} />
                    Follow-up {data(it.proximo_follow_up)} {it.follow_up_concluido ? "(concluído)" : ""}
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><div className="text-[11px] text-muted">{label}</div><div className="font-medium">{value || "—"}</div></div>;
}

// ---------- Resumo do Orçamento 3D dentro do negócio ----------
function Resumo3D({ neg, onAddOrcamento }: { neg: NegocioDetalhe; onAddOrcamento?: () => void }) {
  const nav = useNavigate();
  let d: Dados3D | null = null;
  try {
    d = neg.dados_3d ? (JSON.parse(neg.dados_3d) as Dados3D) : null;
  } catch {
    d = null;
  }
  const projetoId = neg.projeto_3d_id || d?.projetoId;
  const est = d?.estimativa;
  const moveis = d?.moveis || [];
  const ambiente = d?.ambiente;
  const ehProposta = neg.origem === "Solicitar proposta" || (moveis.length === 0 && !est);

  return (
    <div className="card p-3 bg-surfaceSoft space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${ehProposta ? "border-champagne/40 bg-champagne/15 text-champagne" : "border-sky-400/40 bg-sky-500/15 text-sky-200"}`}>
            {ehProposta ? "Site" : "3D"}
          </span>
          <span className="label !mb-0">{ehProposta ? "Solicitação de proposta" : "Orçamento 3D"}</span>
        </div>
        {d?.leadScore && <Badge tone="gold">{d.leadScore}</Badge>}
      </div>

      {est && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-white/10 bg-surface/40 py-2">
            <div className="text-sm font-semibold text-champagne">{moeda(est.min)}</div>
            <div className="text-[10px] text-muted">estimativa mín.</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-surface/40 py-2">
            <div className="text-sm font-semibold text-champagne">{moeda(est.max)}</div>
            <div className="text-[10px] text-muted">estimativa máx.</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-surface/40 py-2">
            <div className="text-sm font-semibold">{est.prazoDias?.[0]}–{est.prazoDias?.[1]}</div>
            <div className="text-[10px] text-muted">dias úteis</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Info label="Cliente" value={d?.nome} />
        <Info label="E-mail" value={d?.email} />
        <Info label="Tipo de projeto" value={d?.tipo_projeto} />
        <Info label="Cidade / Estado" value={d?.cidade_estado} />
        <Info label="Prazo desejado" value={d?.prazo} />
        <Info label="Faixa de orçamento" value={d?.faixa_orcamento} />
        {ambiente && (
          <Info
            label="Ambiente"
            value={`${ambiente.largura ?? "?"}×${ambiente.comprimento ?? "?"} m · ${ambiente.andares ?? 1} andar(es)`}
          />
        )}
        <Info label="WhatsApp" value={d?.whatsapp} />
      </div>

      {moveis.length > 0 && (
        <div>
          <div className="label">Móveis ({moveis.length})</div>
          <div className="max-h-44 overflow-y-auto pr-1 space-y-1">
            {moveis.map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-surface/30 px-2 py-1 text-xs">
                <div className="min-w-0">
                  <div className="truncate font-medium">{m.nome}</div>
                  <div className="text-[10px] text-muted truncate">
                    {m.largura_cm}×{m.altura_cm}×{m.profundidade_cm} cm · {m.material}
                  </div>
                </div>
                <span className="shrink-0 text-champagne">{moeda(m.preco)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d?.descricao && (
        <div>
          <div className="label">{ehProposta ? "Mensagem" : "Observações"}</div>
          <p className="text-xs text-muted whitespace-pre-line">{d.descricao}</p>
        </div>
      )}

      {moveis.length > 0 && (projetoId || onAddOrcamento) && (
        <div className="flex gap-2 pt-1">
          {projetoId && (
            <button className="btn-ghost flex-1" onClick={() => nav(`/suporte-3d/ver/${projetoId}`)}>Ver ambiente 3D</button>
          )}
          {onAddOrcamento && (
            <button className="btn-primary flex-1" onClick={onAddOrcamento}>
              <Plus size={14} /> Adicionar ao orçamento
            </button>
          )}
        </div>
      )}
    </div>
  );
}
