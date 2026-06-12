import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { moeda } from "../lib/format";
import { Material } from "../types";
import { PageHeader, Card, EmptyState, Modal, Field, Input, Select, Badge, useUI, Spinner } from "../components/ui";

const CATEGORIAS = ["Chapa", "Fita", "Ferragem", "Iluminação", "Pedra", "Cuba", "Insumo", "Mão de obra", "Outro"];
const vazio: Partial<Material> = { nome: "", categoria: "Chapa", unidade: "un", preco_custo: 0, fornecedor: "", ativo: 1 };

export default function Catalogo() {
  const { toast, confirm } = useUI();
  const [itens, setItens] = useState<Material[] | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [modal, setModal] = useState<Partial<Material> | null>(null);

  const carregar = () => api.get<Material[]>("/materiais").then(setItens);
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!modal?.nome) return toast("Informe o nome do material.", "err");
    try {
      if (modal.id) await api.put(`/materiais/${modal.id}`, modal);
      else await api.post("/materiais", modal);
      setModal(null); carregar(); toast("Material salvo.");
    } catch (e: any) { toast(e.message, "err"); }
  };
  const excluir = async (m: Material) => {
    if (!(await confirm(`Excluir "${m.nome}" do catálogo?`))) return;
    await api.del(`/materiais/${m.id}`); carregar(); toast("Material removido.");
  };

  if (!itens) return <Spinner />;
  const filtrados = itens.filter((m) =>
    (!filtro || m.categoria === filtro) &&
    (!busca || m.nome.toLowerCase().includes(busca.toLowerCase()) || (m.fornecedor || "").toLowerCase().includes(busca.toLowerCase()))
  );
  const grupos = [...new Set(filtrados.map((m) => m.categoria))];

  return (
    <div>
      <PageHeader title="Catálogo de materiais" subtitle="Insumos usados pelo orçamentador"
        actions={<button className="btn-primary" onClick={() => setModal({ ...vazio })}>+ Novo material</button>} />

      <div className="flex gap-3 mb-5 flex-wrap">
        <Input placeholder="Buscar por nome ou fornecedor…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="max-w-[200px]">
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <span className="text-muted text-sm self-center ml-auto">{filtrados.length} itens</span>
      </div>

      {itens.length === 0 ? (
        <EmptyState icon="▦" title="Catálogo vazio" hint="Cadastre chapas, fitas, ferragens e mão de obra para usar no orçamentador."
          action={<button className="btn-primary" onClick={() => setModal({ ...vazio })}>Cadastrar primeiro material</button>} />
      ) : (
        <div className="space-y-6">
          {grupos.map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <Badge tone="wood">{cat}</Badge>
                <span className="text-xs text-muted">{filtrados.filter((m) => m.categoria === cat).length}</span>
              </div>
              <Card className="!p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted text-xs border-b border-white/5">
                    <tr><th className="px-4 py-3">Material</th><th className="px-4 py-3">Unidade</th>
                      <th className="px-4 py-3">Fornecedor</th><th className="px-4 py-3 text-right">Custo</th><th className="px-4 py-3"></th></tr>
                  </thead>
                  <tbody>
                    {filtrados.filter((m) => m.categoria === cat).map((m) => (
                      <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-surfaceSoft/50">
                        <td className="px-4 py-3 font-medium">{m.nome}</td>
                        <td className="px-4 py-3 text-muted">{m.unidade}</td>
                        <td className="px-4 py-3 text-muted">{m.fornecedor || "—"}</td>
                        <td className="px-4 py-3 text-right text-champagne font-semibold">{moeda(m.preco_custo)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button className="text-muted hover:text-champagne mr-3" onClick={() => setModal(m)}>Editar</button>
                          <button className="text-muted hover:text-red-300" onClick={() => excluir(m)}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? "Editar material" : "Novo material"}>
        {modal && (
          <div className="space-y-4">
            <Field label="Nome"><Input value={modal.nome || ""} onChange={(e) => setModal({ ...modal, nome: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoria">
                <Select value={modal.categoria} onChange={(e) => setModal({ ...modal, categoria: e.target.value })}>
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Unidade">
                <Input value={modal.unidade || ""} placeholder="chapa, m, un, m2, h…" onChange={(e) => setModal({ ...modal, unidade: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Preço de custo (R$)">
                <Input type="number" step="0.01" value={modal.preco_custo ?? 0} onChange={(e) => setModal({ ...modal, preco_custo: Number(e.target.value) })} />
              </Field>
              <Field label="Fornecedor"><Input value={modal.fornecedor || ""} onChange={(e) => setModal({ ...modal, fornecedor: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar}>Salvar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
