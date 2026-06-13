import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Empresa, SEGMENTOS } from "../types";
import { PageHeader, Card, EmptyState, Modal, Field, Input, Select, Textarea, Badge, useUI, Spinner } from "../components/ui";

const vazio: Partial<Empresa> = { razao_social: "", nome_fantasia: "", cnpj: "", segmento: "loja", is_arquiteto: 0, cidade: "", endereco: "", observacoes: "" };

export default function Clientes() {
  const { toast } = useUI();
  const [lista, setLista] = useState<Empresa[] | null>(null);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [modal, setModal] = useState<Partial<Empresa> | null>(null);

  const carregar = () => api.get<Empresa[]>("/empresas").then(setLista);
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!modal?.razao_social) return toast("Informe a razão social.", "err");
    try {
      const nova = await api.post<Empresa>("/empresas", modal);
      setModal(null); carregar(); toast("Cliente cadastrado.");
      return nova;
    } catch (e: any) { toast(e.message, "err"); }
  };

  if (!lista) return <Spinner />;
  const filtrados = lista.filter((e) =>
    (tipo === "" || (tipo === "arq" ? e.is_arquiteto : tipo === "cli" ? !e.is_arquiteto : true)) &&
    (!busca || `${e.razao_social} ${e.nome_fantasia} ${e.segmento}`.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div>
      <PageHeader title="Clientes e contatos" subtitle="Empresas B2B, arquitetos e especificadores"
        actions={<button data-tour="page-action" className="btn-primary" onClick={() => setModal({ ...vazio })}>+ Novo cliente</button>} />

      <div className="flex gap-3 mb-5 flex-wrap">
        <Input data-tour="page-search" placeholder="Buscar empresa…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
        <Select value={tipo} onChange={(e) => setTipo(e.target.value)} className="max-w-[200px]">
          <option value="">Todos</option><option value="cli">Clientes</option><option value="arq">Arquitetos parceiros</option>
        </Select>
      </div>

      {lista.length === 0 ? (
        <EmptyState icon="❖" title="Nenhum cliente ainda" hint="Cadastre empresas, restaurantes, clínicas, redes e arquitetos parceiros."
          action={<button className="btn-primary" onClick={() => setModal({ ...vazio })}>Cadastrar cliente</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map((e) => (
            <Link key={e.id} to={`/clientes/${e.id}`}>
              <Card className="hover:border-champagne/30 transition h-full">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-text">{e.nome_fantasia || e.razao_social}</div>
                    <div className="text-xs text-muted mt-0.5">{e.razao_social}</div>
                  </div>
                  {e.is_arquiteto ? <Badge tone="gold">arquiteto</Badge> : <Badge tone="wood">{e.segmento}</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-4 text-xs text-muted">
                  <span>{e.cidade || "—"}</span>
                  <span>·</span>
                  <span>{e.total_contatos || 0} contato(s)</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title="Novo cliente">
        {modal && (
          <div className="space-y-4">
            <Field label="Razão social"><Input value={modal.razao_social || ""} onChange={(e) => setModal({ ...modal, razao_social: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome fantasia"><Input value={modal.nome_fantasia || ""} onChange={(e) => setModal({ ...modal, nome_fantasia: e.target.value })} /></Field>
              <Field label="CNPJ"><Input value={modal.cnpj || ""} onChange={(e) => setModal({ ...modal, cnpj: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Segmento">
                <Select value={modal.segmento} onChange={(e) => setModal({ ...modal, segmento: e.target.value })}>
                  {SEGMENTOS.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Tipo">
                <Select value={modal.is_arquiteto ? "1" : "0"} onChange={(e) => setModal({ ...modal, is_arquiteto: Number(e.target.value) })}>
                  <option value="0">Cliente</option><option value="1">Arquiteto / especificador</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cidade"><Input value={modal.cidade || ""} onChange={(e) => setModal({ ...modal, cidade: e.target.value })} /></Field>
              <Field label="Endereço"><Input value={modal.endereco || ""} onChange={(e) => setModal({ ...modal, endereco: e.target.value })} /></Field>
            </div>
            <Field label="Observações"><Textarea rows={2} value={modal.observacoes || ""} onChange={(e) => setModal({ ...modal, observacoes: e.target.value })} /></Field>
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
