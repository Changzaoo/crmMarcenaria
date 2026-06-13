import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { moeda, data } from "../lib/format";
import { Projeto, Empresa } from "../types";
import { PageHeader, Card, EmptyState, Modal, Field, Input, Select, Badge, useUI, Spinner } from "../components/ui";

export default function Projetos() {
  const { toast } = useUI();
  const nav = useNavigate();
  const [lista, setLista] = useState<Projeto[] | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [novo, setNovo] = useState<Partial<Projeto> | null>(null);

  const carregar = () => api.get<Projeto[]>("/projetos").then(setLista);
  useEffect(() => { carregar(); api.get<Empresa[]>("/empresas").then(setEmpresas); }, []);

  const criar = async () => {
    if (!novo?.nome) return toast("Informe o nome.", "err");
    const p = await api.post<Projeto>("/projetos", novo);
    setNovo(null); nav(`/projetos/${p.id}`);
  };

  if (!lista) return <Spinner />;
  return (
    <div>
      <PageHeader title="Projetos e produção" subtitle="Pipeline com as 10 etapas oficiais LINEAR"
        actions={<button data-tour="page-action" className="btn-primary" onClick={() => setNovo({ nome: "", status: "Em andamento" })}>+ Novo projeto</button>} />

      {lista.length === 0 ? (
        <EmptyState icon="⚒" title="Nenhum projeto" hint="Projetos nascem de negócios ganhos no funil, ou crie um manualmente."
          action={<button className="btn-primary" onClick={() => setNovo({ nome: "", status: "Em andamento" })}>Criar projeto</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:border-champagne/30" >
              <div onClick={() => nav(`/projetos/${p.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold leading-snug">{p.nome}</div>
                  <Badge tone={p.status === "Concluído" ? "green" : "blue"}>{p.status}</Badge>
                </div>
                <div className="text-xs text-muted mt-1">{p.empresa_nome}</div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted mb-1"><span>Progresso</span><span>{p.progresso}%</span></div>
                  <div className="h-2 rounded-full bg-surfaceSoft overflow-hidden">
                    <div className="h-full bg-champagne rounded-full transition-all" style={{ width: `${p.progresso}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-champagne font-semibold">{moeda(p.valor)}</span>
                  <span className="text-xs text-muted">Entrega {data(p.previsao_entrega)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!novo} onClose={() => setNovo(null)} title="Novo projeto">
        {novo && (
          <div className="space-y-4">
            <Field label="Nome do projeto"><Input value={novo.nome || ""} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></Field>
            <Field label="Cliente">
              <Select value={novo.empresa_id || ""} onChange={(e) => setNovo({ ...novo, empresa_id: Number(e.target.value) || undefined })}>
                <option value="">—</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor (R$)"><Input type="number" value={novo.valor ?? 0} onChange={(e) => setNovo({ ...novo, valor: Number(e.target.value) })} /></Field>
              <Field label="Previsão de entrega"><Input type="date" value={novo.previsao_entrega || ""} onChange={(e) => setNovo({ ...novo, previsao_entrega: e.target.value })} /></Field>
            </div>
            <Field label="Endereço da obra"><Input value={novo.endereco_obra || ""} onChange={(e) => setNovo({ ...novo, endereco_obra: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setNovo(null)}>Cancelar</button>
              <button className="btn-primary" onClick={criar}>Criar com 10 etapas</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
