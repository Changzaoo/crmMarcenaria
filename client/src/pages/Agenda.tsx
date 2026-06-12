import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { data, hoje } from "../lib/format";
import { EventoAgenda, Negocio, Projeto } from "../types";
import { PageHeader, Card, Modal, Field, Input, Select, Textarea, Badge, useUI, Spinner } from "../components/ui";

const TIPOS = ["medicao", "entrega", "instalacao", "reuniao"];
const tipoTone: Record<string, any> = { medicao: "blue", entrega: "gold", instalacao: "wood", reuniao: "default" };
const tipoLabel: Record<string, string> = { medicao: "Medição", entrega: "Entrega", instalacao: "Instalação", reuniao: "Reunião" };
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Agenda() {
  const { toast, confirm } = useUI();
  const [eventos, setEventos] = useState<EventoAgenda[] | null>(null);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [ref, setRef] = useState(() => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() }; });
  const [vista, setVista] = useState<"mes" | "lista">("mes");
  const [modal, setModal] = useState<Partial<EventoAgenda> | null>(null);

  const carregar = () => api.get<EventoAgenda[]>("/agenda").then(setEventos);
  useEffect(() => { carregar(); api.get<Negocio[]>("/negocios").then(setNegocios); api.get<Projeto[]>("/projetos").then(setProjetos); }, []);

  const salvar = async () => {
    if (!modal?.titulo || !modal.data) return toast("Informe título e data.", "err");
    try {
      if (modal.id) await api.put(`/agenda/${modal.id}`, modal);
      else await api.post("/agenda", modal);
      setModal(null); carregar(); toast("Evento salvo.");
    } catch (e: any) { toast(e.message, "err"); }
  };
  const excluir = async () => {
    if (!modal?.id || !(await confirm("Excluir evento?"))) return;
    await api.del(`/agenda/${modal.id}`); setModal(null); carregar();
  };

  if (!eventos) return <Spinner />;

  const primeiroDia = new Date(ref.ano, ref.mes, 1).getDay();
  const diasNoMes = new Date(ref.ano, ref.mes + 1, 0).getDate();
  const celulas: (number | null)[] = [...Array(primeiroDia).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];
  const isoDe = (dia: number) => `${ref.ano}-${String(ref.mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const evDoDia = (dia: number) => eventos.filter((e) => e.data.slice(0, 10) === isoDe(dia));
  const navMes = (delta: number) => setRef((r) => { const d = new Date(r.ano, r.mes + delta, 1); return { ano: d.getFullYear(), mes: d.getMonth() }; });
  const futuros = [...eventos].filter((e) => e.data >= hoje()).sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Medições, entregas, instalações e reuniões"
        actions={
          <div className="flex gap-2">
            <div className="flex bg-surfaceSoft rounded-lg p-1">
              <button className={`px-3 py-1 rounded text-sm ${vista === "mes" ? "bg-champagne text-background" : "text-muted"}`} onClick={() => setVista("mes")}>Mês</button>
              <button className={`px-3 py-1 rounded text-sm ${vista === "lista" ? "bg-champagne text-background" : "text-muted"}`} onClick={() => setVista("lista")}>Lista</button>
            </div>
            <button className="btn-primary" onClick={() => setModal({ tipo: "reuniao", data: hoje() })}>+ Novo evento</button>
          </div>
        } />

      {vista === "mes" ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <button className="btn-ghost !py-1" onClick={() => navMes(-1)}>←</button>
            <h2 className="font-display text-xl">{MESES[ref.mes]} {ref.ano}</h2>
            <button className="btn-ghost !py-1" onClick={() => navMes(1)}>→</button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DIAS.map((d) => <div key={d} className="text-center text-xs text-muted py-1">{d}</div>)}
            {celulas.map((dia, i) => {
              if (!dia) return <div key={i} />;
              const evs = evDoDia(dia);
              const conflito = evs.length > 1;
              const ehHoje = isoDe(dia) === hoje();
              return (
                <div key={i} className={`min-h-[90px] rounded-lg p-1.5 border ${ehHoje ? "border-champagne/40 bg-champagne/5" : "border-white/5 bg-surfaceSoft/40"} ${conflito ? "ring-1 ring-red-500/40" : ""}`}>
                  <div className={`text-xs mb-1 ${ehHoje ? "text-champagne font-semibold" : "text-muted"}`}>{dia}{conflito && <span className="text-red-400 ml-1">⚠</span>}</div>
                  <div className="space-y-1">
                    {evs.map((e) => (
                      <button key={e.id} onClick={() => setModal(e)} className={`w-full text-left text-[10px] px-1.5 py-1 rounded chip ${tipoTone[e.tipo] === "gold" ? "bg-champagne/15 text-champagne" : tipoTone[e.tipo] === "blue" ? "bg-sky-500/15 text-sky-300" : tipoTone[e.tipo] === "wood" ? "bg-bronze/20 text-bronze" : "bg-surface text-muted"}`}>
                        {e.hora && <span className="opacity-70">{e.hora.slice(0, 5)} </span>}{e.titulo}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {futuros.length === 0 && <Card><p className="text-muted text-sm">Nenhum evento futuro.</p></Card>}
          {futuros.map((e) => (
            <Card key={e.id} className={`cursor-pointer hover:border-champagne/30 ${e.conflito ? "border-red-500/30" : ""}`}>
              <div className="flex items-center justify-between" onClick={() => setModal(e)}>
                <div className="flex items-center gap-3">
                  <div className="text-center w-12">
                    <div className="font-display text-lg">{e.data.slice(8, 10)}</div>
                    <div className="text-[10px] text-muted">{MESES[Number(e.data.slice(5, 7)) - 1].slice(0, 3)}</div>
                  </div>
                  <div>
                    <div className="font-medium">{e.titulo}</div>
                    <div className="text-xs text-muted">{e.hora?.slice(0, 5)} · {e.responsavel} {e.negocio_titulo ? `· ${e.negocio_titulo}` : e.projeto_nome ? `· ${e.projeto_nome}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {e.conflito && <Badge tone="red">conflito</Badge>}
                  <Badge tone={tipoTone[e.tipo]}>{tipoLabel[e.tipo]}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? "Editar evento" : "Novo evento"}>
        {modal && (
          <div className="space-y-4">
            <Field label="Título"><Input value={modal.titulo || ""} onChange={(e) => setModal({ ...modal, titulo: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Tipo"><Select value={modal.tipo} onChange={(e) => setModal({ ...modal, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t} value={t}>{tipoLabel[t]}</option>)}</Select></Field>
              <Field label="Data"><Input type="date" value={modal.data?.slice(0, 10) || ""} onChange={(e) => setModal({ ...modal, data: e.target.value })} /></Field>
              <Field label="Hora"><Input type="time" value={modal.hora || ""} onChange={(e) => setModal({ ...modal, hora: e.target.value })} /></Field>
            </div>
            <Field label="Responsável"><Input value={modal.responsavel || ""} onChange={(e) => setModal({ ...modal, responsavel: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Negócio (opcional)">
                <Select value={modal.negocio_id || ""} onChange={(e) => setModal({ ...modal, negocio_id: Number(e.target.value) || undefined })}>
                  <option value="">—</option>{negocios.map((n) => <option key={n.id} value={n.id}>{n.titulo}</option>)}
                </Select>
              </Field>
              <Field label="Projeto (opcional)">
                <Select value={modal.projeto_id || ""} onChange={(e) => setModal({ ...modal, projeto_id: Number(e.target.value) || undefined })}>
                  <option value="">—</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Observações"><Textarea rows={2} value={modal.observacoes || ""} onChange={(e) => setModal({ ...modal, observacoes: e.target.value })} /></Field>
            <div className="flex justify-between pt-2">
              <div>{modal.id && <button className="btn-danger" onClick={excluir}>Excluir</button>}</div>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn-primary" onClick={salvar}>Salvar</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
