import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { api } from "../lib/api";
import { moeda } from "../lib/format";
import { Orcamento, OrcamentoItem, Material, Empresa, Configuracoes } from "../types";
import { PropostaPDF } from "../components/PropostaPDF";
import { PageHeader, Card, Modal, Field, Input, Select, Textarea, Badge, useUI, Spinner } from "../components/ui";

export default function OrcamentoEditor() {
  const { id } = useParams();
  const { toast, confirm } = useUI();
  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cfg, setCfg] = useState<Configuracoes | null>(null);
  const [itemMat, setItemMat] = useState<OrcamentoItem | null>(null); // item aberto p/ materiais
  const [meta, setMeta] = useState(false);

  const set = (o: Orcamento) => setOrc(o);
  const carregar = () => api.get<Orcamento>(`/orcamentos/${id}`).then(set);
  useEffect(() => {
    carregar();
    api.get<Material[]>("/materiais").then(setMateriais);
    api.get<Empresa[]>("/empresas").then(setEmpresas);
    api.get<Configuracoes>("/config").then(setCfg);
  }, [id]);

  if (!orc || !cfg) return <Spinner />;
  const r = orc.resumo!;

  // ---- mutations (todas retornam o orçamento recalculado) ----
  const salvarMeta = async (patch: Partial<Orcamento>) => set(await api.put<Orcamento>(`/orcamentos/${id}`, { ...orc, ...patch }));
  const addAmbiente = async () => set(await api.post<Orcamento>(`/orcamentos/${id}/ambientes`, { nome: "Novo ambiente" }));
  const renomearAmbiente = async (aid: number, nome: string) => set(await api.put<Orcamento>(`/orcamentos/ambientes/${aid}`, { nome }));
  const delAmbiente = async (aid: number) => { if (await confirm("Excluir ambiente e seus itens?")) set(await api.del<Orcamento>(`/orcamentos/ambientes/${aid}`)); };
  const addItem = async (aid: number) => set(await api.post<Orcamento>(`/orcamentos/ambientes/${aid}/itens`, { descricao: "Nova peça", quantidade: 1 }));
  const salvarItem = async (it: OrcamentoItem) => set(await api.put<Orcamento>(`/orcamentos/itens/${it.id}`, it));
  const delItem = async (iid: number) => { if (await confirm("Excluir item?")) set(await api.del<Orcamento>(`/orcamentos/itens/${iid}`)); };

  const novaVersao = async () => {
    const nova = await api.post<Orcamento>(`/orcamentos/${id}/versao`);
    toast(`Versão v${nova.versao} criada.`);
    window.location.href = `/orcamentos/${nova.id}`;
  };

  return (
    <div>
      <PageHeader title={orc.titulo} subtitle={`${orc.empresa?.nome_fantasia || orc.empresa?.razao_social || "Sem cliente"} · v${orc.versao}`}
        actions={
          <div className="flex gap-2">
            <Link to="/orcamentos" className="btn-ghost">← Voltar</Link>
            <button className="btn-ghost" onClick={novaVersao}>Nova versão</button>
            <button className="btn-ghost" onClick={() => setMeta(true)}>Editar dados</button>
            <PDFDownloadLink document={<PropostaPDF orc={orc} cfg={cfg} />} fileName={`Proposta-${orc.titulo}-v${orc.versao}.pdf`} className="btn-primary">
              {({ loading }) => (loading ? "Gerando…" : "Gerar PDF")}
            </PDFDownloadLink>
          </div>
        } />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ambientes / itens */}
        <div className="lg:col-span-2 space-y-4">
          {(orc.ambientes || []).map((amb) => (
            <Card key={amb.id}>
              <div className="flex items-center justify-between mb-3">
                <input className="bg-transparent font-display text-xl outline-none focus:text-champagne flex-1"
                  defaultValue={amb.nome} onBlur={(e) => e.target.value !== amb.nome && renomearAmbiente(amb.id, e.target.value)} />
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted">custo {moeda(amb.custo)}</span>
                  <span className="text-champagne font-semibold">{moeda(amb.preco)}</span>
                  <button className="text-muted hover:text-red-300" onClick={() => delAmbiente(amb.id)}>✕</button>
                </div>
              </div>

              <div className="space-y-2">
                {amb.itens.map((it) => (
                  <ItemRow key={it.id} it={it} onSave={salvarItem} onDel={() => delItem(it.id)} onMat={() => setItemMat(it)} />
                ))}
              </div>
              <button className="text-champagne text-sm mt-3" onClick={() => addItem(amb.id)}>+ Adicionar peça</button>
            </Card>
          ))}
          <button className="btn-ghost w-full" onClick={addAmbiente}>+ Adicionar ambiente</button>
        </div>

        {/* Resumo */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Resumo financeiro</h3>
              <Select value={orc.status} onChange={(e) => salvarMeta({ status: e.target.value })} className="!w-auto text-xs !py-1">
                {["rascunho", "enviado", "aprovado", "recusado"].map((sx) => <option key={sx}>{sx}</option>)}
              </Select>
            </div>
            <Resumo label="Custo de material + M.O." value={moeda(r.custo_direto)} />
            <Resumo label={`Frete / instalação`} value={moeda(r.frete)} />
            <Resumo label="Custo total" value={moeda(r.custo_total)} strong />
            <div className="h-px bg-white/10 my-2" />
            <Resumo label={`Margem (${r.margem_pct}%)`} value={moeda(r.valor_margem)} accent />
            <Resumo label={`Impostos (${r.impostos_pct}%)`} value={moeda(r.valor_impostos)} />
            <div className="h-px bg-white/10 my-2" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Preço final</span>
              <span className="font-display text-2xl text-champagne">{moeda(r.preco_final)}</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-sm">
              <span className="text-muted">Lucro estimado</span>
              <span className="text-emerald-300 font-semibold">{moeda(r.lucro)}</span>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-3">Parâmetros</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Margem %"><Input type="number" defaultValue={orc.margem} onBlur={(e) => salvarMeta({ margem: Number(e.target.value) })} /></Field>
              <Field label="Impostos %"><Input type="number" defaultValue={orc.impostos} onBlur={(e) => salvarMeta({ impostos: Number(e.target.value) })} /></Field>
              <Field label="Perda %"><Input type="number" defaultValue={orc.perda} onBlur={(e) => salvarMeta({ perda: Number(e.target.value) })} /></Field>
              <Field label="Frete R$"><Input type="number" defaultValue={orc.frete} onBlur={(e) => salvarMeta({ frete: Number(e.target.value) })} /></Field>
            </div>
            <p className="text-[11px] text-muted mt-2">Perda aplica-se a chapas/fitas (aproveitamento). Margem e impostos sobre o custo total.</p>
          </Card>

          <Card>
            <h3 className="font-semibold mb-2">Lucro por ambiente</h3>
            {(orc.ambientes || []).map((a) => (
              <div key={a.id} className="flex justify-between text-sm py-1">
                <span className="text-muted">{a.nome}</span>
                <span className="text-emerald-300">{moeda(a.lucro)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Modal materiais do item */}
      {itemMat && (
        <MateriaisItem item={orc.ambientes!.flatMap((a) => a.itens).find((i) => i.id === itemMat.id) || itemMat}
          materiais={materiais} onClose={() => setItemMat(null)} onChange={set} />
      )}

      {/* Modal meta */}
      <Modal open={meta} onClose={() => setMeta(false)} title="Dados do orçamento">
        <div className="space-y-4">
          <Field label="Título"><Input defaultValue={orc.titulo} onBlur={(e) => salvarMeta({ titulo: e.target.value })} /></Field>
          <Field label="Cliente">
            <Select defaultValue={orc.empresa_id || ""} onChange={(e) => salvarMeta({ empresa_id: Number(e.target.value) || undefined })}>
              <option value="">—</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Condições de pagamento"><Input defaultValue={orc.condicoes_pagamento || ""} onBlur={(e) => salvarMeta({ condicoes_pagamento: e.target.value })} /></Field>
            <Field label="Validade (dias)"><Input type="number" defaultValue={orc.validade_dias} onBlur={(e) => salvarMeta({ validade_dias: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Observações"><Textarea rows={3} defaultValue={orc.observacoes || ""} onBlur={(e) => salvarMeta({ observacoes: e.target.value })} /></Field>
          <div className="flex justify-end"><button className="btn-primary" onClick={() => setMeta(false)}>Fechar</button></div>
        </div>
      </Modal>
    </div>
  );
}

function Resumo({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className={strong ? "text-text font-medium" : "text-muted"}>{label}</span>
      <span className={accent ? "text-champagne" : strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function ItemRow({ it, onSave, onDel, onMat }: { it: OrcamentoItem; onSave: (i: OrcamentoItem) => void; onDel: () => void; onMat: () => void }) {
  const [d, setD] = useState(it);
  useEffect(() => setD(it), [it]);
  return (
    <div className="bg-surfaceSoft rounded-lg p-3">
      <div className="flex items-center gap-2">
        <input className="input flex-1 !py-1.5" value={d.descricao} onChange={(e) => setD({ ...d, descricao: e.target.value })} onBlur={() => onSave(d)} />
        <span className="text-xs text-muted">qtd</span>
        <input className="input w-16 !py-1.5 text-center" type="number" value={d.quantidade} onChange={(e) => setD({ ...d, quantidade: Number(e.target.value) })} onBlur={() => onSave(d)} />
        <span className="text-xs text-muted">M.O.</span>
        <input className="input w-20 !py-1.5 text-right" type="number" value={d.mao_de_obra} onChange={(e) => setD({ ...d, mao_de_obra: Number(e.target.value) })} onBlur={() => onSave(d)} />
        <button className="text-muted hover:text-red-300 px-1" onClick={onDel}>✕</button>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <button className="text-champagne hover:underline" onClick={onMat}>
          {it.materiais.length} material(is) · custo {moeda(it.custo_materiais)}
        </button>
        <div className="flex gap-3">
          <span className="text-muted">custo {moeda(it.custo)}</span>
          <span className="text-champagne font-semibold">{moeda(it.preco)}</span>
        </div>
      </div>
    </div>
  );
}

function MateriaisItem({ item, materiais, onClose, onChange }: { item: OrcamentoItem; materiais: Material[]; onClose: () => void; onChange: (o: Orcamento) => void }) {
  const [sel, setSel] = useState("");
  const add = async () => {
    if (!sel) return;
    onChange(await api.post<Orcamento>(`/orcamentos/itens/${item.id}/materiais`, { material_id: Number(sel) }));
    setSel("");
  };
  const upd = async (mid: number, patch: any, base: any) => onChange(await api.put<Orcamento>(`/orcamentos/item-materiais/${mid}`, { ...base, ...patch }));
  const del = async (mid: number) => onChange(await api.del<Orcamento>(`/orcamentos/item-materiais/${mid}`));

  return (
    <Modal open onClose={onClose} title={`Materiais — ${item.descricao}`} wide>
      <div className="flex gap-2 mb-4">
        <Select value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Selecionar do catálogo…</option>
          {materiais.map((m) => <option key={m.id} value={m.id}>{m.categoria} · {m.nome} ({moeda(m.preco_custo)}/{m.unidade})</option>)}
        </Select>
        <button className="btn-primary shrink-0" onClick={add}>+ Adicionar</button>
      </div>

      {item.materiais.length === 0 ? <p className="text-muted text-sm">Nenhum material neste item.</p> : (
        <table className="w-full text-sm">
          <thead className="text-left text-muted text-xs border-b border-white/5">
            <tr><th className="py-2">Material</th><th className="py-2 text-center">Qtd</th><th className="py-2 text-right">Custo un.</th>
              <th className="py-2 text-center">Perda?</th><th className="py-2 text-right">Subtotal</th><th></th></tr>
          </thead>
          <tbody>
            {item.materiais.map((m) => (
              <tr key={m.id} className="border-b border-white/5 last:border-0">
                <td className="py-2">{m.nome} <span className="text-muted text-xs">/{m.unidade}</span></td>
                <td className="py-2 text-center">
                  <input className="input w-16 !py-1 text-center" type="number" defaultValue={m.quantidade}
                    onBlur={(e) => upd(m.id, { quantidade: Number(e.target.value) }, m)} />
                </td>
                <td className="py-2 text-right">
                  <input className="input w-20 !py-1 text-right" type="number" step="0.01" defaultValue={m.preco_custo}
                    onBlur={(e) => upd(m.id, { preco_custo: Number(e.target.value) }, m)} />
                </td>
                <td className="py-2 text-center">
                  <input type="checkbox" defaultChecked={!!m.aplica_perda} onChange={(e) => upd(m.id, { aplica_perda: e.target.checked ? 1 : 0 }, m)} />
                </td>
                <td className="py-2 text-right text-champagne">{moeda((m.preco_custo || 0) * (m.quantidade || 0))}</td>
                <td className="py-2 text-right"><button className="text-muted hover:text-red-300" onClick={() => del(m.id)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex justify-end mt-4"><button className="btn-primary" onClick={onClose}>Concluir</button></div>
    </Modal>
  );
}
