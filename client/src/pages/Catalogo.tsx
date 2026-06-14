import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { moeda } from "../lib/format";
import { Material, Categoria, MODELOS_CATEGORIA, inferirModelo } from "../types";
import { PageHeader, Card, EmptyState, Modal, Field, Input, Select, Badge, useUI, Spinner } from "../components/ui";
import CategoriaModel3D from "../features/catalogo3d/CategoriaModel3D";

const vazio: Partial<Material> = { nome: "", categoria: "Chapa", unidade: "un", preco_custo: 0, fornecedor: "", ativo: 1 };
const VIEW_KEY = "catalogo:view";

type Vista = "cards" | "lista";

export default function Catalogo() {
  const { toast, confirm } = useUI();
  const [itens, setItens] = useState<Material[] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [vista, setVista] = useState<Vista>(() => (localStorage.getItem(VIEW_KEY) as Vista) || "cards");
  const [modal, setModal] = useState<Partial<Material> | null>(null);
  const [catModal, setCatModal] = useState<Partial<Categoria> | null>(null);

  const carregar = () =>
    Promise.all([
      api.get<Material[]>("/materiais").then(setItens),
      api.get<Categoria[]>("/categorias").then(setCategorias).catch(() => setCategorias([])),
    ]);
  useEffect(() => { carregar(); }, []);
  useEffect(() => { localStorage.setItem(VIEW_KEY, vista); }, [vista]);

  // Nomes de categoria = tabela de categorias ∪ categorias já usadas em materiais.
  const nomesCategoria = useMemo(() => {
    const nomes = categorias.map((c) => c.nome);
    (itens || []).forEach((m) => { if (!nomes.includes(m.categoria)) nomes.push(m.categoria); });
    return nomes;
  }, [categorias, itens]);

  const modeloDe = (nome: string) => categorias.find((c) => c.nome === nome)?.modelo || inferirModelo(nome);

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

  const salvarCat = async () => {
    if (!catModal?.nome?.trim()) return toast("Informe o nome da categoria.", "err");
    try {
      if (catModal.id) await api.put(`/categorias/${catModal.id}`, catModal);
      else await api.post("/categorias", catModal);
      setCatModal(null); carregar(); toast("Categoria salva.");
    } catch (e: any) { toast(e.message, "err"); }
  };
  const excluirCat = async (c: Categoria) => {
    if (!(await confirm(`Excluir a categoria "${c.nome}"?`))) return;
    try { await api.del(`/categorias/${c.id}`); carregar(); toast("Categoria removida."); }
    catch (e: any) { toast(e.message, "err"); }
  };

  if (!itens) return <Spinner />;

  const filtrados = itens.filter((m) =>
    (!filtro || m.categoria === filtro) &&
    (!busca || m.nome.toLowerCase().includes(busca.toLowerCase()) || (m.fornecedor || "").toLowerCase().includes(busca.toLowerCase()))
  );

  // Em cards, mostramos todas as categorias (inclui as vazias); em lista, só as que têm itens.
  const catsParaCards = nomesCategoria
    .filter((c) => !filtro || c === filtro)
    .filter((c) => !busca || filtrados.some((m) => m.categoria === c));
  const grupos = [...new Set(filtrados.map((m) => m.categoria))];

  const toggleBtn = (v: Vista, label: string) => (
    <button
      onClick={() => setVista(v)}
      className={`px-3 py-1.5 text-sm rounded-md transition ${vista === v ? "bg-champagne/15 text-champagne" : "text-muted hover:text-text"}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <PageHeader title="Catálogo de materiais" subtitle="Insumos e categorias usados pelo orçamentador"
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setCatModal({ nome: "", modelo: "outro" })}>+ Nova categoria</button>
            <button data-tour="page-action" className="btn-primary" onClick={() => setModal({ ...vazio, categoria: nomesCategoria[0] || "Chapa" })}>+ Novo material</button>
          </div>
        } />

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <Input data-tour="page-search" placeholder="Buscar por nome ou fornecedor…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="max-w-[200px]">
          <option value="">Todas as categorias</option>
          {nomesCategoria.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <div className="flex bg-surfaceSoft/60 rounded-lg p-0.5 ml-auto">
          {toggleBtn("cards", "▦ Cards")}
          {toggleBtn("lista", "≣ Lista")}
        </div>
        <span className="text-muted text-sm self-center">{filtrados.length} itens</span>
      </div>

      {itens.length === 0 && categorias.length === 0 ? (
        <EmptyState icon="▦" title="Catálogo vazio" hint="Cadastre chapas, fitas, ferragens e mão de obra para usar no orçamentador."
          action={<button className="btn-primary" onClick={() => setModal({ ...vazio })}>Cadastrar primeiro material</button>} />
      ) : vista === "cards" ? (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {catsParaCards.map((cat) => {
            const cObj = categorias.find((c) => c.nome === cat);
            const mats = filtrados.filter((m) => m.categoria === cat);
            return (
              <Card key={cat} className="!p-0 overflow-hidden flex flex-col">
                <div className="relative h-44 bg-gradient-to-b from-black/10 to-black/40">
                  <CategoriaModel3D modelo={modeloDe(cat)} className="absolute inset-0" />
                  <div className="absolute top-2 left-2"><Badge tone="wood">{cat}</Badge></div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {cObj && (
                      <>
                        <button title="Editar categoria" className="w-7 h-7 rounded-md bg-black/50 text-muted hover:text-champagne text-xs"
                          onClick={() => setCatModal(cObj)}>✎</button>
                        <button title="Excluir categoria" className="w-7 h-7 rounded-md bg-black/50 text-muted hover:text-red-300 text-xs"
                          onClick={() => excluirCat(cObj)}>✕</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">{mats.length} {mats.length === 1 ? "material" : "materiais"}</span>
                    <button className="text-xs text-champagne hover:underline" onClick={() => setModal({ ...vazio, categoria: cat })}>+ material</button>
                  </div>
                  {mats.length === 0 ? (
                    <p className="text-xs text-muted py-3 text-center">Nenhum material nesta categoria ainda.</p>
                  ) : (
                    <ul className="space-y-1 max-h-48 overflow-auto pr-1">
                      {mats.map((m) => (
                        <li key={m.id} className="group flex items-center justify-between gap-2 text-sm py-1 border-b border-white/5 last:border-0">
                          <button className="text-left truncate hover:text-champagne" onClick={() => setModal(m)} title={m.nome}>
                            {m.nome}
                            <span className="text-muted text-xs"> · {m.unidade}</span>
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-champagne font-semibold text-xs">{moeda(m.preco_custo)}</span>
                            <button className="text-muted hover:text-red-300 opacity-0 group-hover:opacity-100 text-xs" onClick={() => excluir(m)}>✕</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((cat) => {
            const cObj = categorias.find((c) => c.nome === cat);
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge tone="wood">{cat}</Badge>
                  <span className="text-xs text-muted">{filtrados.filter((m) => m.categoria === cat).length}</span>
                  {cObj && (
                    <button className="text-xs text-muted hover:text-champagne ml-1" onClick={() => setCatModal(cObj)}>editar categoria</button>
                  )}
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
            );
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? "Editar material" : "Novo material"}>
        {modal && (
          <div className="space-y-4">
            <Field label="Nome"><Input value={modal.nome || ""} onChange={(e) => setModal({ ...modal, nome: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoria">
                <Select value={modal.categoria} onChange={(e) => setModal({ ...modal, categoria: e.target.value })}>
                  {nomesCategoria.map((c) => <option key={c}>{c}</option>)}
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

      <Modal open={!!catModal} onClose={() => setCatModal(null)} title={catModal?.id ? "Editar categoria" : "Nova categoria"}>
        {catModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <Field label="Nome">
                  <Input value={catModal.nome || ""} placeholder="Ex.: Vidro, Acabamento…"
                    onChange={(e) => setCatModal({ ...catModal, nome: e.target.value, modelo: catModal.id || catModal.modelo !== "outro" ? catModal.modelo : inferirModelo(e.target.value) })} />
                </Field>
                <Field label="Ilustração 3D">
                  <Select value={catModal.modelo || "outro"} onChange={(e) => setCatModal({ ...catModal, modelo: e.target.value })}>
                    {MODELOS_CATEGORIA.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="rounded-lg overflow-hidden border border-white/5 bg-black/30">
                <CategoriaModel3D modelo={catModal.modelo} className="w-full h-full min-h-[160px]" />
              </div>
            </div>
            {catModal.id && (
              <p className="text-xs text-muted">Renomear atualiza automaticamente os materiais desta categoria.</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setCatModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvarCat}>Salvar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
