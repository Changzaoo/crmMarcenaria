import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { moeda, data, whatsappLink } from "../lib/format";
import { EmpresaDetalhe, Contato, Empresa } from "../types";
import { PageHeader, Card, Modal, Field, Input, Select, Badge, useUI, Spinner } from "../components/ui";

export default function ClienteDetalhe() {
  const { id } = useParams();
  const { toast, confirm } = useUI();
  const [emp, setEmp] = useState<EmpresaDetalhe | null>(null);
  const [arquitetos, setArquitetos] = useState<Empresa[]>([]);
  const [modalContato, setModalContato] = useState<Partial<Contato> | null>(null);
  const [vincArq, setVincArq] = useState("");

  const carregar = () => api.get<EmpresaDetalhe>(`/empresas/${id}`).then(setEmp);
  useEffect(() => {
    carregar();
    api.get<Empresa[]>("/empresas?arquiteto=1").then(setArquitetos);
  }, [id]);

  const salvarContato = async () => {
    if (!modalContato?.nome) return toast("Informe o nome do contato.", "err");
    try {
      if (modalContato.id) await api.put(`/empresas/contatos/${modalContato.id}`, modalContato);
      else await api.post(`/empresas/${id}/contatos`, modalContato);
      setModalContato(null); carregar(); toast("Contato salvo.");
    } catch (e: any) { toast(e.message, "err"); }
  };
  const excluirContato = async (c: Contato) => {
    if (!(await confirm(`Excluir contato "${c.nome}"?`))) return;
    await api.del(`/empresas/contatos/${c.id}`); carregar();
  };
  const vincular = async () => {
    if (!vincArq) return;
    await api.post(`/empresas/${id}/arquitetos`, { arquiteto_id: Number(vincArq) });
    setVincArq(""); carregar(); toast("Arquiteto vinculado.");
  };
  const desvincular = async (arqId: number) => {
    await api.del(`/empresas/${id}/arquitetos/${arqId}`); carregar();
  };

  if (!emp) return <Spinner />;

  return (
    <div>
      <PageHeader title={emp.nome_fantasia || emp.razao_social}
        subtitle={emp.razao_social + (emp.cnpj ? ` · ${emp.cnpj}` : "")}
        actions={<Link to="/clientes" className="btn-ghost">← Voltar</Link>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna esquerda */}
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between mb-3">
              {emp.is_arquiteto ? <Badge tone="gold">arquiteto parceiro</Badge> : <Badge tone="wood">{emp.segmento}</Badge>}
              <span className="text-xs text-muted">{emp.cidade}</span>
            </div>
            <div className="text-sm text-muted space-y-1">
              {emp.endereco && <div>{emp.endereco}</div>}
              {emp.observacoes && <p className="pt-2 border-t border-white/5 mt-2">{emp.observacoes}</p>}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-xs text-muted">Total já contratado</div>
              <div className="font-display text-2xl text-champagne">{moeda(emp.totalContratado)}</div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Contatos</h3>
              <button className="text-champagne text-sm" onClick={() => setModalContato({ nome: "", principal: 0 })}>+ Adicionar</button>
            </div>
            <div className="space-y-3">
              {emp.contatos.length === 0 && <p className="text-muted text-sm">Nenhum contato cadastrado.</p>}
              {emp.contatos.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2 pb-3 border-b border-white/5 last:border-0">
                  <div>
                    <div className="font-medium flex items-center gap-2">{c.nome}{c.principal ? <Badge tone="gold">principal</Badge> : null}</div>
                    <div className="text-xs text-muted">{c.cargo}</div>
                    <div className="text-xs text-muted mt-1">{c.telefone} {c.email && `· ${c.email}`}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {c.telefone && <a href={whatsappLink(c.telefone, `Olá ${c.nome}, aqui é da Nexus Marcenaria.`)} target="_blank" className="text-emerald-400 text-xs hover:underline">WhatsApp</a>}
                    <button className="text-muted hover:text-champagne text-xs" onClick={() => setModalContato(c)}>Editar</button>
                    <button className="text-muted hover:text-red-300 text-xs" onClick={() => excluirContato(c)}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {!emp.is_arquiteto && (
            <Card>
              <h3 className="font-semibold mb-3">Arquitetos / especificadores</h3>
              <div className="space-y-2 mb-3">
                {emp.arquitetos.length === 0 && <p className="text-muted text-sm">Nenhum vínculo. Rastrear indicações é estratégico.</p>}
                {emp.arquitetos.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <Link to={`/clientes/${a.id}`} className="hover:text-champagne">{a.nome_fantasia || a.razao_social}</Link>
                    <button className="text-muted hover:text-red-300 text-xs" onClick={() => desvincular(a.id)}>remover</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Select value={vincArq} onChange={(e) => setVincArq(e.target.value)}>
                  <option value="">Vincular arquiteto…</option>
                  {arquitetos.map((a) => <option key={a.id} value={a.id}>{a.nome_fantasia || a.razao_social}</option>)}
                </Select>
                <button className="btn-ghost shrink-0" onClick={vincular}>+</button>
              </div>
            </Card>
          )}

          {emp.is_arquiteto && emp.indicados.length > 0 && (
            <Card>
              <h3 className="font-semibold mb-3">Clientes indicados</h3>
              <div className="space-y-2">
                {emp.indicados.map((a) => (
                  <Link key={a.id} to={`/clientes/${a.id}`} className="block text-sm hover:text-champagne">{a.nome_fantasia || a.razao_social}</Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Coluna direita: histórico */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <h3 className="font-semibold mb-3">Negócios ({emp.negocios.length})</h3>
            {emp.negocios.length === 0 ? <p className="text-muted text-sm">Nenhum negócio.</p> : (
              <div className="space-y-2">
                {emp.negocios.map((n) => (
                  <div key={n.id} className="flex items-center justify-between p-3 rounded-lg bg-surfaceSoft">
                    <div><div className="font-medium text-sm">{n.titulo}</div><Badge>{n.etapa}</Badge></div>
                    <div className="text-champagne font-semibold text-sm">{moeda(n.valor_estimado)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h3 className="font-semibold mb-3">Orçamentos ({emp.orcamentos.length})</h3>
            {emp.orcamentos.length === 0 ? <p className="text-muted text-sm">Nenhum orçamento.</p> : (
              <div className="space-y-2">
                {emp.orcamentos.map((o) => (
                  <Link key={o.id} to={`/orcamentos/${o.id}`} className="flex items-center justify-between p-3 rounded-lg bg-surfaceSoft hover:bg-surfaceSoft/70">
                    <div className="text-sm">{o.titulo} <span className="text-muted">v{o.versao}</span></div>
                    <Badge tone={o.status === "aprovado" ? "green" : o.status === "recusado" ? "red" : "default"}>{o.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h3 className="font-semibold mb-3">Projetos ({emp.projetos.length})</h3>
            {emp.projetos.length === 0 ? <p className="text-muted text-sm">Nenhum projeto.</p> : (
              <div className="space-y-2">
                {emp.projetos.map((p) => (
                  <Link key={p.id} to={`/projetos/${p.id}`} className="flex items-center justify-between p-3 rounded-lg bg-surfaceSoft hover:bg-surfaceSoft/70">
                    <div><div className="font-medium text-sm">{p.nome}</div><div className="text-xs text-muted">Entrega: {data(p.previsao_entrega)}</div></div>
                    <Badge tone={p.status === "Concluído" ? "green" : "blue"}>{p.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={!!modalContato} onClose={() => setModalContato(null)} title={modalContato?.id ? "Editar contato" : "Novo contato"}>
        {modalContato && (
          <div className="space-y-4">
            <Field label="Nome"><Input value={modalContato.nome || ""} onChange={(e) => setModalContato({ ...modalContato, nome: e.target.value })} /></Field>
            <Field label="Cargo"><Input value={modalContato.cargo || ""} onChange={(e) => setModalContato({ ...modalContato, cargo: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Telefone / WhatsApp"><Input placeholder="5511999998888" value={modalContato.telefone || ""} onChange={(e) => setModalContato({ ...modalContato, telefone: e.target.value })} /></Field>
              <Field label="E-mail"><Input value={modalContato.email || ""} onChange={(e) => setModalContato({ ...modalContato, email: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!modalContato.principal} onChange={(e) => setModalContato({ ...modalContato, principal: e.target.checked ? 1 : 0 })} />
              Contato principal
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setModalContato(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvarContato}>Salvar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
