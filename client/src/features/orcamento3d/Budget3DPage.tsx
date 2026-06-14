import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spinner } from "../../components/ui";
import type { EnvironmentConfig, LeadForm, Project3DDoc, Role } from "./types";
import { emptyDoc } from "./types";
import { criarLead } from "./services/leadService";
import { carregarProjeto, salvarProjeto } from "./services/project3DService";
import LeadCaptureModal from "./ui/LeadCaptureModal";
import EnvironmentSetupForm from "./ui/EnvironmentSetupForm";
import StudioShell from "./StudioShell";

type Phase = "lead" | "setup" | "studio" | "loading";

// Página PÚBLICA do Orçamento 3D (fora do AuthGate).
// /orcamento-3d              -> captura de lead -> setup -> estúdio
// /orcamento-3d/:projetoId   -> carrega projeto existente (link/retorno) -> estúdio
export default function Budget3DPage({ role = "cliente", readOnly = false }: { role?: Role; readOnly?: boolean }) {
  const { projetoId: projetoParam } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>(projetoParam ? "loading" : "lead");
  const [projetoId, setProjetoId] = useState<string | null>(projetoParam ?? null);
  const [doc, setDoc] = useState<Project3DDoc>(emptyDoc());
  const [clienteNome, setClienteNome] = useState("Cliente");
  const [enviandoLead, setEnviandoLead] = useState(false);
  const [erro, setErro] = useState("");

  // Carrega projeto existente quando há :projetoId na URL.
  useEffect(() => {
    if (!projetoParam) return;
    let vivo = true;
    carregarProjeto(projetoParam)
      .then((p) => {
        if (!vivo) return;
        const carregado = p.doc && p.doc.environment ? p.doc : emptyDoc();
        setDoc(carregado);
        setProjetoId(p.id);
        setClienteNome(p.lead?.nome || "Cliente");
        setPhase("studio");
      })
      .catch(() => vivo && setErro("Projeto não encontrado."));
    return () => {
      vivo = false;
    };
  }, [projetoParam]);

  async function onLead(form: LeadForm) {
    setEnviandoLead(true);
    setErro("");
    const base = emptyDoc();
    base.projectName = `${form.tipo_projeto} — ${form.nome.split(" ")[0]}`;
    base.environment.tipo = form.tipo_projeto;
    base.notes = form.descricao;
    try {
      const res = await criarLead(form, base);
      setProjetoId(res.projetoId);
      setClienteNome(form.nome);
      setDoc(base);
      setPhase("setup");
    } catch (e: any) {
      setErro(e?.message || "Não foi possível iniciar agora.");
    } finally {
      setEnviandoLead(false);
    }
  }

  async function onSetup(env: EnvironmentConfig) {
    const next = { ...doc, environment: env };
    setDoc(next);
    if (projetoId) void salvarProjeto(projetoId, next).catch(() => {});
    setPhase("studio");
  }

  if (erro && phase !== "studio") {
    return (
      <div className="fixed inset-0 bg-background grid place-items-center p-6 text-center">
        <div>
          <p className="text-red-300 mb-4">{erro}</p>
          <button className="btn-primary" onClick={() => navigate("/orcamento-3d")}>Começar um novo projeto</button>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return <div className="fixed inset-0 bg-background grid place-items-center"><Spinner /></div>;
  }

  if (phase === "lead") {
    return <LeadCaptureModal onSubmit={onLead} enviando={enviandoLead} />;
  }

  if (phase === "setup") {
    return (
      <div className="fixed inset-0 bg-background">
        <EnvironmentSetupForm initial={doc.environment} onConfirm={onSetup} />
      </div>
    );
  }

  // studio
  if (!projetoId) return <div className="fixed inset-0 bg-background grid place-items-center"><Spinner /></div>;
  return (
    <StudioShell
      key={projetoId}
      projetoId={projetoId}
      role={role}
      readOnly={readOnly}
      clienteNome={clienteNome}
      initialDoc={doc}
      onExit={role === "arquiteto" ? () => navigate("/suporte-3d") : undefined}
    />
  );
}
