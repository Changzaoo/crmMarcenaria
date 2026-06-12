import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { data, diasAte } from "../lib/format";
import { Projeto } from "../types";
import { PageHeader, Card, EmptyState, Field, Input, Textarea, Badge, useUI, Spinner } from "../components/ui";

export default function PosVenda() {
  const { toast } = useUI();
  const nav = useNavigate();
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);

  const carregar = () => api.get<Projeto[]>("/projetos").then(setProjetos);
  useEffect(() => { carregar(); }, []);

  const salvar = async (p: Projeto, patch: Partial<Projeto>) => {
    await api.patch(`/projetos/${p.id}/pos-venda`, {
      garantia_meses: p.garantia_meses, garantia_inicio: p.garantia_inicio,
      revisao_sugerida: p.revisao_sugerida, potencial_novas_unidades: p.potencial_novas_unidades, ...patch,
    });
    carregar();
  };
  const gerarLead = async (p: Projeto) => {
    const res = await api.post<{ negocioId: number }>(`/projetos/${p.id}/gerar-lead`);
    toast("Lead criado no funil!"); nav("/crm");
  };

  if (!projetos) return <Spinner />;
  const concluidos = projetos.filter((p) => p.status === "Concluído" || p.garantia_inicio);

  return (
    <div>
      <PageHeader title="Pós-venda" subtitle="Garantias, revisões e potencial de novas unidades" />
      {concluidos.length === 0 ? (
        <EmptyState icon="✿" title="Nenhum projeto concluído" hint="Ao concluir a etapa 10 (Pós-entrega) de um projeto, a garantia é registrada e ele aparece aqui." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {concluidos.map((p) => {
            const dias = diasAte(p.revisao_sugerida);
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/projetos/${p.id}`} className="font-semibold hover:text-champagne">{p.nome}</Link>
                    <div className="text-xs text-muted">{p.empresa_nome}</div>
                  </div>
                  <Badge tone="green">{p.garantia_meses || 24} meses garantia</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Field label="Garantia (meses)">
                    <Input type="number" defaultValue={p.garantia_meses ?? 24} onBlur={(e) => salvar(p, { garantia_meses: Number(e.target.value) })} />
                  </Field>
                  <Field label="Início da garantia">
                    <Input type="date" defaultValue={p.garantia_inicio?.slice(0, 10) || ""} onBlur={(e) => salvar(p, { garantia_inicio: e.target.value })} />
                  </Field>
                </div>

                <div className={`mt-3 p-2.5 rounded-lg text-sm flex items-center justify-between ${dias !== null && dias <= 30 ? "bg-champagne/10 text-champagne" : "bg-surfaceSoft text-muted"}`}>
                  <span>⏰ Revisão sugerida: {data(p.revisao_sugerida)}</span>
                  {dias !== null && <span className="text-xs">{dias < 0 ? "vencida" : `em ${dias} dias`}</span>}
                </div>

                <Field label="Potencial de novas unidades (franquias/redes)">
                  <Textarea rows={2} defaultValue={p.potencial_novas_unidades || ""} onBlur={(e) => salvar(p, { potencial_novas_unidades: e.target.value })} />
                </Field>
                <button className="btn-primary w-full mt-3" onClick={() => gerarLead(p)}>Gerar novo lead deste cliente</button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
