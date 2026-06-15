import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { moeda, moedaCurta, data, vencido, whatsappLink, aplicarTemplate } from "../lib/format";
import { Negocio, NegocioDetalhe, Dados3D, Empresa, EmpresaDetalhe, TemplateWhatsapp, ETAPAS_CRM, SEGMENTOS, ORIGENS, MOTIVOS_PERDA } from "../types";
import { PageHeader, Card, Modal, Field, Input, Select, Textarea, Badge, useUI, Spinner } from "../components/ui";

const ABERTAS = ETAPAS_CRM.filter((e) => e !== "Perdido");

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
  const nav = useNavigate();
  const [negocios, setNegocios] = useState<Negocio[] | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [novo, setNovo] = useState<Partial<Negocio> | null>(null);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [perda, setPerda] = useState<{ id: number; ordem: number; motivo: string } | null>(null);

  const carregar = async () => {
    try {
      const dados = await api.get<Negocio[]>("/negocios");
      setNegocios(dados);
      setErroCarga(null);
      return dados;
    } catch (error) {
      const msg = apiErrorMessage(error);
      setErroCarga(msg);
      toast(msg, "err");
      return negocios || [];
    }
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
      const [dadosNegocios, dadosEmpresas] = await Promise.all([
        api.get<Negocio[]>("/negocios"),
        api.get<Empresa[]>("/empresas"),
      ]);
      setNegocios(dadosNegocios);
      setEmpresas(dadosEmpresas);
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

  const onDragEnd = async (r: DropResult) => {
    if (!r.destination || !negocios) return;
    const id = Number(r.draggableId);
    const etapa = r.destination.droppableId;
    const ordem = r.destination.index;
    const neg = negocios.find((n) => n.id === id)!;
    if (etapa === neg.etapa && ordem === neg.ordem) return;

    if (etapa === "Perdido") { setPerda({ id, ordem, motivo: "preço" }); return; }

    // otimista
    setNegocios((prev) => prev!.map((n) => (n.id === id ? { ...n, etapa, ordem } : n)));
    try {
      const res = await api.patch<{ projetoCriado: number | null }>(`/negocios/${id}/mover`, { etapa, ordem });
      if (res.projetoCriado) {
        toast("Negócio ganho! Projeto criado com as 10 etapas.");
        if (confirm("Converter o orçamento aprovado em contrato e abrir o projeto agora?")) nav(`/projetos/${res.projetoCriado}`);
      }
      carregar();
    } catch (e: any) { toast(e.message, "err"); carregar(); }
  };

  const confirmarPerda = async () => {
    if (!perda) return;
    await api.patch(`/negocios/${perda.id}/mover`, { etapa: "Perdido", ordem: perda.ordem, motivo_perda: perda.motivo });
    setPerda(null); carregar(); toast("Negócio movido para Perdido.");
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

      <DragDropContext onDragEnd={onDragEnd}>
        <div data-tour="crm-board" className="flex gap-3 overflow-x-auto flex-1 min-h-0 items-start pb-1">
          {ABERTAS.map((etapa) => {
            const cards = porEtapa(etapa);
            const total = cards.reduce((s, n) => s + n.valor_estimado, 0);
            const ganho = etapa === "Fechado (ganho)";
            return (
              <Droppable droppableId={etapa} key={etapa}>
                {(prov, snap) => (
                  <div className="w-72 shrink-0 flex flex-col min-h-0">
                    <div className="flex items-center justify-between px-1 mb-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${ganho ? "text-champagne" : "text-text"}`}>{etapa}</span>
                        <span className="text-xs text-muted">{cards.length}</span>
                      </div>
                      <span className="text-[11px] text-muted">{moedaCurta(total)}</span>
                    </div>
                    <div ref={prov.innerRef} {...prov.droppableProps}
                      className={`space-y-2 rounded-xl p-2 min-h-[120px] max-h-[30rem] overflow-y-auto transition ${snap.isDraggingOver ? "bg-champagne/5 ring-1 ring-champagne/20" : "bg-surface/40"}`}>
                      {cards.map((n, i) => (
                        <Draggable draggableId={String(n.id)} index={i} key={n.id}>
                          {(p, s) => (
                            <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                              onClick={() => setDetalheId(n.id)}
                              className={`card p-3 cursor-pointer hover:border-champagne/30 ${s.isDragging ? "shadow-glow rotate-1" : ""}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm font-medium leading-snug">{n.titulo}</div>
                                {n.projeto_3d_id && n.origem === "Orçamento 3D" && (
                                  <span className="shrink-0 rounded-full border border-sky-400/40 bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-sky-200">3D</span>
                                )}
                                {n.origem === "Solicitar proposta" && (
                                  <span className="shrink-0 rounded-full border border-champagne/40 bg-champagne/15 px-1.5 py-0.5 text-[9px] font-semibold text-champagne">Site</span>
                                )}
                              </div>
                              <div className="text-xs text-muted mt-1">{n.empresa_nome || (n.origem === "Orçamento 3D" ? "Estúdio 3D" : n.origem === "Solicitar proposta" ? "Solicitação do site" : "—")}</div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-champagne text-sm font-semibold">{moedaCurta(n.valor_estimado)}</span>
                                <span className="text-[10px] text-muted">{n.probabilidade}%</span>
                              </div>
                              {n.proximo_follow_up && (
                                <div className={`mt-2 text-[11px] flex items-center gap-1 ${vencido(n.proximo_follow_up) ? "text-red-400" : "text-muted"}`}>
                                  ⏰ {vencido(n.proximo_follow_up) ? "Follow-up vencido" : "Follow-up"} {data(n.proximo_follow_up)}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
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
              <Field label="Responsável"><Input value={novo.responsavel || ""} onChange={(e) => setNovo({ ...novo, responsavel: e.target.value })} /></Field>
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
  return (
    <div className="w-72 shrink-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-sm font-semibold text-red-300/80">Perdido</span>
        <span className="text-xs text-muted">{cards.length}</span>
      </div>
      <div className="space-y-2 rounded-xl p-2 bg-surface/40 min-h-[120px]">
        {cards.map((n) => (
          <div key={n.id} onClick={() => onOpen(n.id)} className="card p-3 cursor-pointer opacity-70 hover:opacity-100">
            <div className="text-sm font-medium">{n.titulo}</div>
            <div className="text-xs text-muted mt-1">{n.empresa_nome}</div>
            {n.motivo_perda && <Badge tone="red">{n.motivo_perda}</Badge>}
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
    await api.post(`/negocios/${id}/interacoes`, nova);
    setNova({ tipo: "nota", descricao: "", proximo_follow_up: "" });
    carregar(); toast("Interação registrada.");
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
