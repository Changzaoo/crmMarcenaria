import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Funcionario, FUNCOES_FUNCIONARIO } from "../types";
import { PageHeader, Card, EmptyState, Modal, Field, Input, Select, Badge, useUI, Spinner } from "../components/ui";

const CORES = ["#D8B978", "#7FB2E5", "#9B8CFF", "#E59E5B", "#6FCF97", "#F2A6A6", "#67D5C4", "#E78CC4"];
const vazio: Partial<Funcionario> = { nome: "", funcao: "Vendas", email: "", telefone: "", cor: CORES[0], ativo: 1 };

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

export default function Funcionarios() {
  const { toast, confirm } = useUI();
  const [itens, setItens] = useState<Funcionario[] | null>(null);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState<Partial<Funcionario> | null>(null);

  const carregar = () => api.get<Funcionario[]>("/funcionarios").then(setItens);
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!modal?.nome?.trim()) return toast("Informe o nome.", "err");
    try {
      if (modal.id) await api.put(`/funcionarios/${modal.id}`, modal);
      else await api.post("/funcionarios", modal);
      setModal(null); carregar(); toast("Funcionário salvo.");
    } catch (e: unknown) { toast(e instanceof Error ? e.message : "Falha ao salvar.", "err"); }
  };
  const excluir = async (f: Funcionario) => {
    if (!(await confirm(`Remover "${f.nome}" da equipe?`))) return;
    await api.del(`/funcionarios/${f.id}`); carregar(); toast("Funcionário removido.");
  };

  if (!itens) return <Spinner />;
  const q = busca.trim().toLowerCase();
  const filtrados = itens.filter((f) => !q || f.nome.toLowerCase().includes(q) || (f.funcao || "").toLowerCase().includes(q));

  return (
    <div>
      <PageHeader title="Funcionários" subtitle="Equipe que cuida de cada etapa — do lead à montagem"
        actions={<button data-tour="page-action" className="btn-primary" onClick={() => setModal({ ...vazio })}>+ Novo funcionário</button>} />

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <Input data-tour="page-search" placeholder="Buscar por nome ou função…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
        <span className="text-muted text-sm self-center ml-auto">{filtrados.length} pessoas</span>
      </div>

      {itens.length === 0 ? (
        <EmptyState icon="👷" title="Sem funcionários" hint="Cadastre a equipe para atribuir responsáveis a cada etapa do processo."
          action={<button className="btn-primary" onClick={() => setModal({ ...vazio })}>Cadastrar primeiro</button>} />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((f) => (
            <Card key={f.id} className={`flex items-center gap-3 ${f.ativo ? "" : "opacity-60"}`}>
              <div className="w-12 h-12 rounded-xl grid place-items-center font-display text-lg shrink-0 text-background"
                style={{ background: f.cor || "#D8B978" }}>
                {iniciais(f.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{f.nome}</span>
                  {!f.ativo && <Badge tone="red">inativo</Badge>}
                </div>
                {f.funcao && <Badge tone="wood">{f.funcao}</Badge>}
                <div className="text-[11px] text-muted mt-1 truncate">
                  {[f.telefone, f.email].filter(Boolean).join(" · ") || "Sem contato"}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button className="text-muted hover:text-champagne text-xs" onClick={() => setModal(f)}>Editar</button>
                <button className="text-muted hover:text-red-300 text-xs" onClick={() => excluir(f)}>Excluir</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? "Editar funcionário" : "Novo funcionário"}>
        {modal && (
          <div className="space-y-4">
            <Field label="Nome"><Input value={modal.nome || ""} onChange={(e) => setModal({ ...modal, nome: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Função">
                <Select value={modal.funcao || "Outro"} onChange={(e) => setModal({ ...modal, funcao: e.target.value })}>
                  {FUNCOES_FUNCIONARIO.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Telefone"><Input value={modal.telefone || ""} onChange={(e) => setModal({ ...modal, telefone: e.target.value })} /></Field>
            </div>
            <Field label="E-mail"><Input value={modal.email || ""} onChange={(e) => setModal({ ...modal, email: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4 items-center">
              <Field label="Cor">
                <div className="flex gap-1.5 flex-wrap">
                  {CORES.map((c) => (
                    <button key={c} type="button" onClick={() => setModal({ ...modal, cor: c })}
                      className={`w-7 h-7 rounded-lg border-2 transition ${modal.cor === c ? "border-white" : "border-transparent"}`}
                      style={{ background: c }} aria-label={c} />
                  ))}
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none mt-5">
                <input type="checkbox" className="accent-champagne w-4 h-4" checked={!!modal.ativo}
                  onChange={(e) => setModal({ ...modal, ativo: e.target.checked ? 1 : 0 })} />
                Ativo
              </label>
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
