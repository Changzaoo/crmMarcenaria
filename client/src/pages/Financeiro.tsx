import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { moeda, data, hoje } from "../lib/format";
import { Parcela, Projeto } from "../types";
import { PageHeader, Card, EmptyState, Modal, Field, Input, Select, Badge, useUI, Spinner } from "../components/ui";

const statusTone: Record<string, any> = { recebido: "green", atrasado: "red", a_receber: "default" };
const statusLabel: Record<string, string> = { recebido: "Recebido", atrasado: "Atrasado", a_receber: "A receber" };

export default function Financeiro() {
  const { toast, confirm } = useUI();
  const [parcelas, setParcelas] = useState<Parcela[] | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [modal, setModal] = useState<Partial<Parcela> | null>(null);

  const carregar = () => api.get<Parcela[]>("/financeiro/parcelas").then(setParcelas);
  useEffect(() => { carregar(); api.get<Projeto[]>("/projetos").then(setProjetos); }, []);

  const mudarStatus = async (p: Parcela, status: string) => { await api.patch(`/financeiro/parcelas/${p.id}`, { status }); carregar(); };
  const salvar = async () => {
    if (!modal?.projeto_id) return toast("Selecione o projeto.", "err");
    await api.post("/financeiro/parcelas", modal); setModal(null); carregar(); toast("Parcela criada.");
  };
  const excluir = async (p: Parcela) => { if (await confirm("Excluir parcela?")) { await api.del(`/financeiro/parcelas/${p.id}`); carregar(); } };

  if (!parcelas) return <Spinner />;
  const aReceber = parcelas.filter((p) => p.status !== "recebido").reduce((s, p) => s + p.valor, 0);
  const atrasado = parcelas.filter((p) => p.status === "atrasado").reduce((s, p) => s + p.valor, 0);
  const recebidoMes = parcelas.filter((p) => p.status === "recebido" && p.recebido_em?.slice(0, 7) === hoje().slice(0, 7)).reduce((s, p) => s + p.valor, 0);

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Parcelas por projeto"
        actions={<button data-tour="page-action" className="btn-primary" onClick={() => setModal({ status: "a_receber", vencimento: hoje() })}>+ Nova parcela</button>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><div className="text-xs text-muted">A receber (em aberto)</div><div className="font-display text-2xl text-champagne mt-1">{moeda(aReceber)}</div></Card>
        <Card><div className="text-xs text-muted">Atrasado</div><div className="font-display text-2xl text-red-400 mt-1">{moeda(atrasado)}</div></Card>
        <Card><div className="text-xs text-muted">Recebido neste mês</div><div className="font-display text-2xl text-emerald-300 mt-1">{moeda(recebidoMes)}</div></Card>
      </div>

      {parcelas.length === 0 ? (
        <EmptyState icon="$" title="Sem parcelas" hint="Cadastre condições de pagamento (entrada e parcelas) vinculadas aos projetos." />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-muted text-xs border-b border-white/5">
              <tr><th className="px-4 py-3">Projeto</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {parcelas.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-surfaceSoft/50">
                  <td className="px-4 py-3"><div className="font-medium">{p.projeto_nome}</div><div className="text-xs text-muted">{p.empresa_nome}</div></td>
                  <td className="px-4 py-3 text-muted">{p.descricao}</td>
                  <td className="px-4 py-3 text-muted">{data(p.vencimento)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{moeda(p.valor)}</td>
                  <td className="px-4 py-3">
                    <Select value={p.status} onChange={(e) => mudarStatus(p, e.target.value)} className="!w-auto !py-1 text-xs">
                      {Object.keys(statusLabel).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right"><button className="text-muted hover:text-red-300" onClick={() => excluir(p)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title="Nova parcela">
        {modal && (
          <div className="space-y-4">
            <Field label="Projeto">
              <Select value={modal.projeto_id || ""} onChange={(e) => setModal({ ...modal, projeto_id: Number(e.target.value) || undefined })}>
                <option value="">—</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </Field>
            <Field label="Descrição"><Input value={modal.descricao || ""} placeholder="Entrada, Parcela 2/3…" onChange={(e) => setModal({ ...modal, descricao: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor (R$)"><Input type="number" value={modal.valor ?? 0} onChange={(e) => setModal({ ...modal, valor: Number(e.target.value) })} /></Field>
              <Field label="Vencimento"><Input type="date" value={modal.vencimento || ""} onChange={(e) => setModal({ ...modal, vencimento: e.target.value })} /></Field>
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
