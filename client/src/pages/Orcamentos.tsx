import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { moeda, data } from "../lib/format";
import { Orcamento, Empresa, Negocio } from "../types";
import { PageHeader, Card, EmptyState, Modal, Field, Input, Select, Badge, useUI, Spinner } from "../components/ui";

const statusTone: Record<string, any> = { rascunho: "default", enviado: "blue", aprovado: "green", recusado: "red" };

export default function Orcamentos() {
  const { toast } = useUI();
  const nav = useNavigate();
  const [lista, setLista] = useState<Orcamento[] | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [novo, setNovo] = useState<Partial<Orcamento> | null>(null);

  const carregar = () => api.get<Orcamento[]>("/orcamentos").then(setLista);
  useEffect(() => {
    carregar();
    api.get<Empresa[]>("/empresas").then(setEmpresas);
    api.get<Negocio[]>("/negocios").then(setNegocios);
  }, []);

  const criar = async () => {
    if (!novo?.titulo) return toast("Informe um título.", "err");
    try { const o = await api.post<Orcamento>("/orcamentos", novo); setNovo(null); nav(`/orcamentos/${o.id}`); }
    catch (e: any) { toast(e.message, "err"); }
  };

  if (!lista) return <Spinner />;
  return (
    <div>
      <PageHeader title="Orçamentos" subtitle="Propostas por ambiente e peças"
        actions={<button className="btn-primary" onClick={() => setNovo({ titulo: "", status: "rascunho" })}>+ Novo orçamento</button>} />

      {lista.length === 0 ? (
        <EmptyState icon="₪" title="Nenhum orçamento" hint="Crie orçamentos compostos por ambientes e itens que consomem o catálogo de materiais."
          action={<button className="btn-primary" onClick={() => setNovo({ titulo: "", status: "rascunho" })}>Criar orçamento</button>} />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-muted text-xs border-b border-white/5">
              <tr><th className="px-4 py-3">Título</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Versão</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3">Criado</th></tr>
            </thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o.id} onClick={() => nav(`/orcamentos/${o.id}`)} className="border-b border-white/5 last:border-0 hover:bg-surfaceSoft/50 cursor-pointer">
                  <td className="px-4 py-3 font-medium">{o.titulo}</td>
                  <td className="px-4 py-3 text-muted">{o.empresa_nome || "—"}</td>
                  <td className="px-4 py-3">v{o.versao}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone[o.status]}>{o.status}</Badge></td>
                  <td className="px-4 py-3 text-muted">{data(o.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!novo} onClose={() => setNovo(null)} title="Novo orçamento">
        {novo && (
          <div className="space-y-4">
            <Field label="Título"><Input value={novo.titulo || ""} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} /></Field>
            <Field label="Cliente">
              <Select value={novo.empresa_id || ""} onChange={(e) => setNovo({ ...novo, empresa_id: Number(e.target.value) || undefined })}>
                <option value="">—</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</option>)}
              </Select>
            </Field>
            <Field label="Vincular a negócio (opcional)">
              <Select value={novo.negocio_id || ""} onChange={(e) => setNovo({ ...novo, negocio_id: Number(e.target.value) || undefined })}>
                <option value="">—</option>
                {negocios.map((n) => <option key={n.id} value={n.id}>{n.titulo}</option>)}
              </Select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setNovo(null)}>Cancelar</button>
              <button className="btn-primary" onClick={criar}>Criar e editar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
