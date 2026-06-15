import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { moeda, data } from "../lib/format";
import { EtapaAnexo, Funcionario, Projeto, ProjetoEtapa } from "../types";
import { imprimirOS } from "../lib/os";
import { usePolling } from "../lib/usePolling";
import { PageHeader, Card, Modal, Field, Input, Select, Badge, useUI, Spinner } from "../components/ui";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function anexosDaEtapa(etapa: ProjetoEtapa): EtapaAnexo[] {
  if (!etapa.anexos) return [];
  try {
    const anexos = JSON.parse(etapa.anexos);
    return Array.isArray(anexos) ? anexos : [];
  } catch {
    return [];
  }
}

function arquivoParaDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

export default function ProjetoDetalhe() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast, confirm } = useUI();
  const [p, setP] = useState<Projeto | null>(null);
  const [aberta, setAberta] = useState<number | null>(null);
  const [edit, setEdit] = useState<Partial<Projeto> | null>(null);
  const [uploadingEtapa, setUploadingEtapa] = useState<number | null>(null);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  const set = (x: Projeto) => setP(x);
  const carregar = () => api.get<Projeto>(`/projetos/${id}`).then(set);
  useEffect(() => {
    carregar();
    api.get<Funcionario[]>("/funcionarios").then(setFuncionarios).catch(() => {});
  }, [id]);

  // Mantém o projeto atualizado sem botão (pausa durante edição/upload).
  usePolling(() => { if (!edit && uploadingEtapa === null) carregar(); }, 12000);

  if (!p) return <Spinner />;

  const toggleEtapa = async (et: ProjetoEtapa) => set(await api.patch<Projeto>(`/projetos/etapas/${et.id}`, { concluida: !et.concluida }));
  const salvarObs = async (et: ProjetoEtapa, observacoes: string) => set(await api.patch<Projeto>(`/projetos/etapas/${et.id}`, { observacoes }));
  const toggleChk = async (cid: number, val: boolean) => set(await api.patch<Projeto>(`/projetos/checklist/${cid}`, { concluido: val }));
  const addChk = async (eid: number, texto: string) => set(await api.post<Projeto>(`/projetos/etapas/${eid}/checklist`, { texto }));
  const delChk = async (cid: number) => set(await api.del<Projeto>(`/projetos/checklist/${cid}`));
  const salvarEdit = async () => { set(await api.put<Projeto>(`/projetos/${id}`, { ...p, ...edit })); setEdit(null); toast("Projeto atualizado."); };
  const setResponsavel = async (et: ProjetoEtapa, fid: number | null) =>
    set(await api.patch<Projeto>(`/projetos/etapas/${et.id}`, { funcionario_id: fid }));
  const excluirProjeto = async () => {
    if (!(await confirm(`Excluir o projeto "${p.nome}"? Remove etapas, checklist e parcelas.`))) return;
    try { await api.del(`/projetos/${id}`); toast("Projeto excluído."); nav("/projetos"); }
    catch (e: unknown) { toast(e instanceof Error ? e.message : "Falha ao excluir.", "err"); }
  };
  const uploadImagem = async (et: ProjetoEtapa, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast("Selecione um arquivo de imagem.", "err");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast("Imagem muito grande. O limite é 10 MB.", "err");
      return;
    }

    setUploadingEtapa(et.id);
    try {
      const dataUrl = await arquivoParaDataUrl(file);
      const anexo = await api.post<EtapaAnexo>("/uploads/imagens", {
        dataUrl,
        nome: file.name,
        projetoId: p.id,
        etapaId: et.id,
      });
      const anexos = [...anexosDaEtapa(et), anexo];
      set(await api.patch<Projeto>(`/projetos/etapas/${et.id}`, { anexos: JSON.stringify(anexos) }));
      toast("Imagem enviada para o Supabase.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Falha ao enviar imagem.", "err");
    } finally {
      setUploadingEtapa(null);
    }
  };
  const removerImagem = async (et: ProjetoEtapa, anexo: EtapaAnexo) => {
    try {
      await api.del("/uploads/imagens", { path: anexo.path });
      const anexos = anexosDaEtapa(et).filter((item) => item.path !== anexo.path);
      set(await api.patch<Projeto>(`/projetos/etapas/${et.id}`, { anexos: JSON.stringify(anexos) }));
      toast("Imagem removida.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Falha ao remover imagem.", "err");
    }
  };

  return (
    <div>
      <PageHeader title={p.nome} subtitle={`${p.empresa_nome || ""} · ${p.endereco_obra || "Sem endereço"}`}
        actions={
          <div className="flex gap-2">
            <Link to="/projetos" className="btn-ghost">← Voltar</Link>
            <button className="btn-ghost" onClick={() => imprimirOS(p)}>Ordem de Serviço</button>
            <button className="btn-ghost" onClick={() => setEdit({ ...p })}>Editar</button>
            <button className="btn-danger" onClick={excluirProjeto}>Excluir</button>
          </div>
        } />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <div className="flex justify-between text-sm mb-2"><span className="text-muted">Progresso da produção</span><span className="font-semibold">{p.progresso}%</span></div>
            <div className="h-2.5 rounded-full bg-surfaceSoft overflow-hidden">
              <div className="h-full bg-champagne rounded-full transition-all" style={{ width: `${p.progresso}%` }} />
            </div>
          </Card>

          {p.etapas!.map((et) => {
            const feitos = et.checklist.filter((c) => c.concluido).length;
            return (
              <Card key={et.id} className={et.concluida ? "border-champagne/30" : ""}>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleEtapa(et)}
                    className={`w-6 h-6 rounded-full grid place-items-center text-xs shrink-0 border ${et.concluida ? "bg-champagne text-background border-champagne" : "border-white/20 text-muted"}`}>
                    {et.concluida ? "✓" : et.numero}
                  </button>
                  <button className="flex-1 text-left min-w-0" onClick={() => setAberta(aberta === et.id ? null : et.id)}>
                    <span className={`font-medium ${et.concluida ? "text-champagne" : ""}`}>{et.nome}</span>
                    {et.checklist.length > 0 && <span className="text-xs text-muted ml-2">{feitos}/{et.checklist.length}</span>}
                  </button>
                  {et.funcionario_nome ? (
                    <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted shrink-0" title={`Responsável: ${et.funcionario_nome}`}>
                      <span className="w-2 h-2 rounded-full" style={{ background: et.funcionario_cor || "#D8B978" }} />
                      {et.funcionario_nome}
                    </span>
                  ) : (
                    <span className="hidden sm:inline text-[11px] text-muted/60 shrink-0">sem responsável</span>
                  )}
                  <span className="text-muted text-xs">{aberta === et.id ? "▲" : "▼"}</span>
                </div>

                {aberta === et.id && (
                  <div className="mt-4 pl-9 space-y-3">
                    <div className="space-y-1">
                      {et.checklist.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 group">
                          <input type="checkbox" checked={!!c.concluido} onChange={(e) => toggleChk(c.id, e.target.checked)} />
                          <span className={`text-sm flex-1 ${c.concluido ? "line-through text-muted" : ""}`}>{c.texto}</span>
                          <button className="text-muted hover:text-red-300 opacity-0 group-hover:opacity-100 text-xs" onClick={() => delChk(c.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <AddChecklist onAdd={(t) => addChk(et.id, t)} />
                    <Field label="Responsável pela etapa">
                      <Select value={et.funcionario_id ?? ""} onChange={(e) => setResponsavel(et, e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— Sem responsável</option>
                        {funcionarios.filter((f) => f.ativo).map((f) => (
                          <option key={f.id} value={f.id}>{f.nome}{f.funcao ? ` · ${f.funcao}` : ""}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Observações da etapa">
                      <textarea className="input" rows={2} defaultValue={et.observacoes || ""} onBlur={(e) => e.target.value !== (et.observacoes || "") && salvarObs(et, e.target.value)} />
                    </Field>
                    <EtapaImagens
                      etapa={et}
                      anexos={anexosDaEtapa(et)}
                      uploading={uploadingEtapa === et.id}
                      onUpload={uploadImagem}
                      onRemove={removerImagem}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold mb-3">Informações</h3>
            <div className="space-y-2 text-sm">
              <Linha label="Status"><Badge tone={p.status === "Concluído" ? "green" : "blue"}>{p.status}</Badge></Linha>
              <Linha label="Valor">{moeda(p.valor)}</Linha>
              <Linha label="Responsável">{p.responsavel || "—"}</Linha>
              <Linha label="Contrato">{data(p.data_contrato)}</Linha>
              <Linha label="Previsão entrega">{data(p.previsao_entrega)}</Linha>
              <Linha label="Instalação">{data(p.data_instalacao)}</Linha>
            </div>
          </Card>

          {p.contatos && p.contatos.length > 0 && (
            <Card>
              <h3 className="font-semibold mb-3">Contatos da obra</h3>
              {p.contatos.map((c) => (
                <div key={c.id} className="text-sm py-1">
                  <div className="font-medium">{c.nome}</div>
                  <div className="text-xs text-muted">{c.cargo} · {c.telefone}</div>
                </div>
              ))}
            </Card>
          )}

          <Card>
            <h3 className="font-semibold mb-3">Parcelas</h3>
            {p.parcelas!.length === 0 ? <p className="text-muted text-sm">Sem parcelas.</p> : p.parcelas!.map((par) => (
              <div key={par.id} className="flex justify-between items-center text-sm py-1.5 border-b border-white/5 last:border-0">
                <div><div>{par.descricao}</div><div className="text-xs text-muted">{data(par.vencimento)}</div></div>
                <div className="text-right">
                  <div className="font-semibold">{moeda(par.valor)}</div>
                  <Badge tone={par.status === "recebido" ? "green" : par.status === "atrasado" ? "red" : "default"}>{par.status.replace("_", " ")}</Badge>
                </div>
              </div>
            ))}
            <Link to="/financeiro" className="text-champagne text-sm mt-2 inline-block">Gerenciar no Financeiro →</Link>
          </Card>

          {p.garantia_inicio && (
            <Card>
              <h3 className="font-semibold mb-2">Pós-venda</h3>
              <Linha label="Garantia">{p.garantia_meses} meses</Linha>
              <Linha label="Início">{data(p.garantia_inicio)}</Linha>
              <Linha label="Revisão sugerida">{data(p.revisao_sugerida)}</Linha>
              <Link to="/pos-venda" className="text-champagne text-sm mt-2 inline-block">Ver pós-venda →</Link>
            </Card>
          )}
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Editar projeto">
        {edit && (
          <div className="space-y-4">
            <Field label="Nome"><Input value={edit.nome || ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
            <Field label="Endereço da obra"><Input value={edit.endereco_obra || ""} onChange={(e) => setEdit({ ...edit, endereco_obra: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor"><Input type="number" value={edit.valor ?? 0} onChange={(e) => setEdit({ ...edit, valor: Number(e.target.value) })} /></Field>
              <Field label="Status">
                <Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  {["Em andamento", "Concluído", "Cancelado", "Pausado"].map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Responsável">
                <input className="input" list="proj-func" value={edit.responsavel || ""} onChange={(e) => setEdit({ ...edit, responsavel: e.target.value })} />
                <datalist id="proj-func">{funcionarios.filter((f) => f.ativo).map((f) => <option key={f.id} value={f.nome}>{f.funcao || ""}</option>)}</datalist>
              </Field>
              <Field label="Contrato"><Input type="date" value={edit.data_contrato?.slice(0,10) || ""} onChange={(e) => setEdit({ ...edit, data_contrato: e.target.value })} /></Field>
              <Field label="Previsão entrega"><Input type="date" value={edit.previsao_entrega?.slice(0,10) || ""} onChange={(e) => setEdit({ ...edit, previsao_entrega: e.target.value })} /></Field>
              <Field label="Instalação"><Input type="date" value={edit.data_instalacao?.slice(0,10) || ""} onChange={(e) => setEdit({ ...edit, data_instalacao: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvarEdit}>Salvar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Linha({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex justify-between items-center"><span className="text-muted">{label}</span><span className="font-medium">{children}</span></div>;
}

function AddChecklist({ onAdd }: { onAdd: (t: string) => void }) {
  const [t, setT] = useState("");
  return (
    <div className="flex gap-2">
      <input className="input !py-1.5 text-sm" placeholder="Novo item de checklist…" value={t}
        onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && t.trim()) { onAdd(t.trim()); setT(""); } }} />
      <button className="btn-ghost !py-1.5 shrink-0" onClick={() => { if (t.trim()) { onAdd(t.trim()); setT(""); } }}>+</button>
    </div>
  );
}

function EtapaImagens({
  etapa,
  anexos,
  uploading,
  onUpload,
  onRemove,
}: {
  etapa: ProjetoEtapa;
  anexos: EtapaAnexo[];
  uploading: boolean;
  onUpload: (etapa: ProjetoEtapa, file: File) => void;
  onRemove: (etapa: ProjetoEtapa, anexo: EtapaAnexo) => void;
}) {
  const inputId = `upload-etapa-${etapa.id}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <label className="label !mb-0">Imagens da etapa</label>
        <label htmlFor={inputId} className={`btn-ghost !py-1.5 cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
          <ImagePlus size={16} />
          {uploading ? "Enviando..." : "Enviar imagem"}
        </label>
        <input
          id={inputId}
          className="hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(etapa, file);
            event.currentTarget.value = "";
          }}
        />
      </div>

      {anexos.length === 0 ? (
        <p className="text-xs text-muted">Nenhuma imagem enviada.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {anexos.map((anexo) => (
            <div key={anexo.path} className="rounded-lg overflow-hidden border border-white/10 bg-surfaceSoft">
              <a href={anexo.url} target="_blank" rel="noreferrer" className="block aspect-video bg-background">
                <img src={anexo.url} alt={anexo.nome} className="w-full h-full object-cover" />
              </a>
              <div className="flex items-center gap-2 p-2">
                <a href={anexo.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 text-xs text-muted hover:text-text truncate">
                  {anexo.nome}
                </a>
                <a href={anexo.url} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-lg grid place-items-center text-muted hover:text-text hover:bg-white/5" aria-label="Abrir imagem">
                  <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg grid place-items-center text-muted hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => onRemove(etapa, anexo)}
                  aria-label="Remover imagem"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
