import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Spinner } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";
import Orcamento3DApp from "./Orcamento3DApp";
import {
  actions,
  orc3dStore,
  openStudio,
  closeStudio,
  useStudioOpen,
} from "./useOrcamento3DStore";
import { fromCrmProjectDoc } from "./crmDocSync";
import type { CrmProjectDoc } from "./crmPublicApi";
import { estimateProject } from "./pricingEngine";
import type { Project3D, ProjectStatus } from "./types";

type Modo = "publico" | "arquiteto" | "ver";

interface Studio3DRouteProps {
  /** publico: cliente monta do zero / retoma; arquiteto: sessão pelo CRM; ver: visualização */
  modo?: Modo;
}

interface ProjetoResposta {
  id: string;
  doc: CrmProjectDoc;
  nome?: string;
  status?: string;
  lead?: { nome?: string } | null;
}

/**
 * Ponto de montagem único do Estúdio 3D dentro do CRM. Renderiza o editor
 * portado do site público (`Orcamento3DApp`) e cobre as três entradas:
 *  - /orcamento-3d            → cliente monta do zero (lead → setup → editor)
 *  - /orcamento-3d/:projetoId → cliente retoma um projeto existente
 *  - /suporte-3d/sessao/:id   → arquiteto entra na sessão do cliente
 *  - /suporte-3d/ver/:id      → visualização do ambiente do cliente
 */
export default function Studio3DRoute({ modo = "publico" }: Studio3DRouteProps) {
  const { projetoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const nomeArquiteto = (user?.displayName?.trim() || user?.email?.split("@")[0] || "Especialista").trim();

  const [carregando, setCarregando] = useState<boolean>(!!projetoId);
  const [erro, setErro] = useState("");
  const montado = useRef(false);

  // Abre o "portão" do estúdio; quando ele fechar (Voltar/cancelar), navegamos de volta.
  useEffect(() => {
    openStudio();
    return () => closeStudio();
  }, []);

  // Inicialização por modo.
  useEffect(() => {
    if (montado.current) return;
    montado.current = true;
    let vivo = true;

    if (!projetoId) {
      // Cliente começando do zero: reseta o estado para lead → setup → editor.
      actions.reset();
      setCarregando(false);
      return;
    }

    const role = modo === "publico" ? "cliente" : "arquiteto";
    (async () => {
      try {
        const resp = await api.get<ProjetoResposta>(`/public/projetos-3d/${projetoId}`);
        if (!vivo) return;
        actions.reset();
        const base = orc3dStore.getState().doc;
        const doc = fromCrmProjectDoc(resp.doc, base);
        const now = new Date().toISOString();
        const project: Project3D = {
          id: resp.id || projetoId,
          name: doc.name,
          client: doc.client,
          environment: doc.environment,
          furniture: doc.furniture,
          estimate: estimateProject(doc.furniture, doc.environment),
          leadScore: "frio",
          status: (resp.status as ProjectStatus) || "projeto-em-edicao",
          assistedByArchitect: false,
          createdAt: now,
          updatedAt: now,
        };
        actions.loadProject(
          project,
          undefined,
          modo === "publico" ? undefined : nomeArquiteto,
          role
        );
        setCarregando(false);
      } catch {
        if (vivo) {
          setErro("Projeto não encontrado.");
          setCarregando(false);
        }
      }
    })();

    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId, modo]);

  // Sai do estúdio quando o portão fecha (botão Voltar/cancelar dentro do editor).
  // `jaAbriu` evita o redirect indevido no 1º render (quando o portão ainda
  // não recebeu o openStudio() do efeito de montagem).
  const aberto = useStudioOpen();
  const jaAbriu = useRef(false);
  useEffect(() => {
    if (aberto) {
      jaAbriu.current = true;
      return;
    }
    if (jaAbriu.current) {
      navigate(modo === "publico" ? "/orcamento-3d" : "/suporte-3d", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  if (erro) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-background p-6 text-center">
        <div>
          <p className="mb-4 text-red-300">{erro}</p>
          <button className="btn-primary" onClick={() => navigate(modo === "publico" ? "/orcamento-3d" : "/suporte-3d")}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (carregando) {
    return <div className="fixed inset-0 grid place-items-center bg-background"><Spinner /></div>;
  }

  return <Orcamento3DApp />;
}
