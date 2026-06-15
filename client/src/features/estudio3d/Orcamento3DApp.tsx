import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supportsWebGL } from "../../lib/webgl";
import { useDeviceInfo } from "../../lib/useDeviceInfo";
import Editor3DScene from "./Editor3DScene";
import EnvironmentSetup from "./EnvironmentSetup";
import LeadCaptureModal from "./LeadCaptureModal";
import FurnitureLibrary from "./FurnitureLibrary";
import FurnitureEditor from "./FurnitureEditor";
import EstimatePanel from "./EstimatePanel";
import ProjectActions from "./ProjectActions";
import ViewModeSwitcher from "./ViewModeSwitcher";
import FloorControls from "./FloorControls";
import MobileControls from "./MobileControls";
import ChatPanel from "./ChatPanel";
import ToastHost from "./ToastHost";
import CollabBridge from "./CollabBridge";
import ArchitectPresence from "./ArchitectPresence";
import VoiceChat from "./VoiceChat";
import HelpOverlay from "./HelpOverlay";
import ViewportHud from "./ViewportHud";
import Tutorial, { openTutorial } from "./Tutorial";
import NetStatus from "./NetStatus";
import { dlog } from "./dlog";
import { Panel, Btn } from "./studioUi";
import {
  actions,
  buildProject3D,
  closeStudio,
  useOrc3d,
} from "./useOrcamento3DStore";
import { create3DAttendance, initCrmSync, notifyAvailableArchitects } from "./crmBridge";
import { callCrmArchitect, createCrmLead, saveCrmProject } from "./crmPublicApi";
import { toast } from "./toast";
import type { EnvironmentConfig, LeadForm, Project3D } from "./types";

function previewProjectWithLead(form: LeadForm): Project3D {
  const project = buildProject3D();
  const now = new Date().toISOString();
  return {
    ...project,
    name: `${form.tipo_projeto} - ${form.nome}`.slice(0, 80),
    client: {
      ...project.client,
      name: form.nome.trim(),
      email: form.email.trim(),
      phone: form.whatsapp.trim(),
      city: form.cidade_estado.trim(),
      notes: form.descricao.trim(),
      projectType: form.tipo_projeto,
      desiredDeadline: form.prazo,
      budgetRange: form.faixa_orcamento,
      contactConsent: form.aceite,
      source: "Orcamento 3D",
      capturedAt: now,
    },
    status: "novo-lead-3d",
    createdAt: now,
    updatedAt: now,
  };
}

export default function Orcamento3DApp() {
  const phase = useOrc3d((s) => s.phase);
  const selectedUid = useOrc3d((s) => s.selectedUid);
  const role = useOrc3d((s) => s.role);
  const warning = useOrc3d((s) => s.warning);
  const leadCaptured = useOrc3d((s) => s.leadCaptured);
  const viewMode = useOrc3d((s) => s.viewMode);
  const cursorMode = useOrc3d((s) => s.cursorMode);
  const { isMobile: mobile, orientation } = useDeviceInfo();
  const webgl = supportsWebGL();

  const [recover, setRecover] = useState(false);
  const [libOpen, setLibOpen] = useState(!mobile);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    initCrmSync();
  }, []);

  // recuperar autosave (uma vez)
  useEffect(() => {
    if (actions.hasAutosave()) setRecover(true);
  }, []);

  // atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "1") actions.setViewMode("primeira");
      else if (e.key === "2") actions.setViewMode("terceira");
      else if (e.key === "3") actions.setViewMode("isometrico");
      else if (e.key === "4") actions.setViewMode("topo");
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? actions.redo() : actions.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        actions.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onLeadSubmit = async (form: LeadForm) => {
    const created = await createCrmLead(form, previewProjectWithLead(form));
    actions.captureLead(form);
    actions.setProjectId(created.projetoId);
    dlog("3D_SESSION", "Lead criado no CRM:", { leadId: created.leadId, projetoId: created.projetoId });
    const att = create3DAttendance(buildProject3D());
    actions.setAttendanceId(att.id);
    toast("Lead registrado. Agora monte o ambiente em 3D.", "success");
  };

  const onCreate = (env: EnvironmentConfig, assisted: boolean) => {
    actions.setEnvironment(env);
    actions.setAssisted(assisted);
    actions.setStatus(assisted ? "aguardando-arquiteto" : "projeto-em-edicao");
    actions.enterEditor();
    void saveCrmProject(buildProject3D()).catch(() => {
      toast("O ambiente abriu, mas ainda nao foi sincronizado com o CRM.", "warn");
    });
    if (assisted) {
      const { notified, attendance } = notifyAvailableArchitects(buildProject3D());
      actions.setAttendanceId(attendance.id);
      dlog("CRM_CALL", "Chamado de arquiteto criado:", { attendanceId: attendance.id, projetoId: buildProject3D().id, notified });
      void callCrmArchitect(buildProject3D()).catch(() => {
        toast("Nao foi possivel avisar o Suporte 3D agora.", "warn");
      });
      toast(
        notified
          ? "Estamos chamando um especialista para acompanhar seu projeto."
          : "Nossa equipe está ocupada agora, mas seu projeto já foi registrado.",
        notified ? "success" : "warn"
      );
    } else {
      const att = create3DAttendance(buildProject3D());
      actions.setAttendanceId(att.id);
    }
  };

  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  /* ---------- fallback WebGL ---------- */
  if (!webgl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
        <ToastHost />
        <div className="max-w-md rounded-2xl border border-champagne/20 bg-surface p-8 text-center">
          <h2 className="font-display text-2xl text-text">Versão simplificada</h2>
          <p className="mt-3 text-sm text-muted">
            Seu dispositivo não conseguiu abrir o ambiente 3D completo. Você pode continuar seu
            orçamento por aqui e nossa equipe entrará em contato.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Btn variant="primary" onClick={() => { notifyAvailableArchitects(buildProject3D()); toast("Projeto registrado. Em breve entraremos em contato.", "success"); }}>
              Solicitar atendimento
            </Btn>
            <Btn onClick={closeStudio}>Voltar ao site</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-[#0c0a08] text-text"
    >
      <ToastHost />
      <Tutorial />

      {/* recuperação de projeto */}
      <AnimatePresence>
        {recover && phase !== "editing" && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-champagne/20 bg-surface p-6 text-center">
              <h3 className="font-display text-xl text-text">Projeto encontrado</h3>
              <p className="mt-2 text-sm text-muted">Encontramos um projeto salvo. Deseja continuar?</p>
              <div className="mt-5 flex justify-center gap-2">
                <Btn onClick={() => { actions.clearAutosave(); setRecover(false); }}>Começar novo</Btn>
                <Btn variant="primary" onClick={() => { actions.loadAutosave(); setRecover(false); }}>Continuar</Btn>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {phase === "setup" && !leadCaptured ? (
        <LeadCaptureModal onSubmit={onLeadSubmit} onCancel={closeStudio} />
      ) : phase === "setup" ? (
        <EnvironmentSetup onCreate={onCreate} onCancel={closeStudio} />
      ) : (
        <div className="flex h-full w-full flex-col">
          {/* runtime de colaboração (doc-sync, presença, chat, voz) */}
          <CollabBridge />
          {/* barra superior */}
          <div className="flex items-center justify-between gap-2 border-b border-champagne/10 bg-[rgba(12,10,8,0.7)] px-3 py-2 backdrop-blur-md">
            <div className="hidden items-center gap-3 lg:flex">
              <span className="text-[11px] uppercase tracking-widest2 text-champagne/80">Estúdio 3D</span>
              <NetStatus />
            </div>
            <div className="flex-1 lg:flex-none">
              <ViewModeSwitcher />
            </div>
            <div className="flex items-center gap-1.5">
              <VoiceChat />
              {(viewMode === "primeira" || viewMode === "terceira") && (
                <Btn
                  size="sm"
                  active={cursorMode}
                  onClick={() => actions.toggleCursorMode()}
                  title="Liberar o ponteiro para adicionar e arrastar móveis em 1ª/3ª pessoa"
                >
                  {cursorMode ? "🖱️ Cursor ✓" : "🖱️ Cursor"}
                </Btn>
              )}
              <Btn size="sm" onClick={openTutorial} title="Abrir o tutorial do editor 3D">Tutorial</Btn>
              <HelpOverlay />
              <Btn size="sm" onClick={toggleFullscreen} title="Tela cheia">⤢</Btn>
              <div className="hidden lg:block">
                <ProjectActions />
              </div>
            </div>
          </div>

          {/* corpo */}
          <div className="relative flex flex-1 overflow-hidden">
            {/* biblioteca (desktop) */}
            <div className={`hidden w-72 shrink-0 border-r border-champagne/10 lg:block ${libOpen ? "" : "lg:hidden"}`}>
              <FurnitureLibrary />
            </div>

            {/* canvas */}
            <div className="relative flex-1">
              <Editor3DScene mobile={mobile} />
              <ViewportHud mobile={mobile} />
              <div className="absolute left-3 top-3 z-10">
                <FloorControls />
              </div>

              <ArchitectPresence />

              {warning && (
                <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg border border-amber-400/40 bg-[rgba(40,30,10,0.85)] px-4 py-2 text-xs text-amber-200 backdrop-blur-md">
                  {warning}
                </div>
              )}

              {mobile && <MobileControls orientation={orientation} />}

              {/* ações fixas no mobile (FABs que não estouram a tela) */}
              <div className="absolute right-3 top-3 flex flex-col items-end gap-2 lg:hidden">
                <button
                  onClick={() => setChatOpen((v) => !v)}
                  className="rounded-full border border-champagne/30 bg-[rgba(12,10,8,0.8)] px-3 py-2 text-xs text-text backdrop-blur-md"
                >
                  💬 Chat
                </button>
              </div>
              <div className="absolute bottom-3 right-3 lg:hidden">
                <ProjectActions variant="mobile" />
              </div>
              <button
                onClick={() => setLibOpen((v) => !v)}
                className="absolute bottom-3 left-3 rounded-full border border-champagne/25 bg-[rgba(12,10,8,0.8)] px-4 py-2.5 text-sm text-text backdrop-blur-md lg:hidden"
              >
                {libOpen ? "Fechar" : "+ Móveis"}
              </button>

              {/* chat flutuante (desktop) */}
              <div className="absolute bottom-3 right-3 hidden lg:block">
                <Btn size="sm" onClick={() => setChatOpen((v) => !v)} active={chatOpen}>
                  {chatOpen ? "Fechar chat" : "Chat com arquiteto"}
                </Btn>
              </div>
              <AnimatePresence>
                {chatOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-16 right-3 hidden h-80 w-72 lg:block"
                  >
                    <Panel title="Chat" className="h-full overflow-hidden">
                      <div className="h-[calc(100%-41px)]">
                        <ChatPanel author={role} />
                      </div>
                    </Panel>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* painel direito (desktop): editor + estimativa */}
            <div className="hidden w-80 shrink-0 flex-col gap-2 overflow-y-auto border-l border-champagne/10 p-2 lg:flex">
              <Panel title="Móvel selecionado" className="flex-1 overflow-hidden">
                <div className="h-full max-h-[52vh] overflow-y-auto">
                  <FurnitureEditor />
                </div>
              </Panel>
              <Panel title="Orçamento">
                <EstimatePanel />
              </Panel>
            </div>

            {/* biblioteca mobile (gaveta inferior) */}
            <AnimatePresence>
              {mobile && libOpen && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "tween", duration: 0.3 }}
                  className="absolute inset-x-0 bottom-0 z-20 h-[46vh] rounded-t-2xl border-t border-champagne/20 bg-[rgba(14,11,9,0.97)] lg:hidden"
                >
                  <div className="mx-auto my-2 h-1 w-10 rounded-full bg-champagne/30" />
                  <div className="h-[calc(100%-20px)]">
                    <FurnitureLibrary />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* editor do móvel mobile (gaveta) */}
            <AnimatePresence>
              {mobile && selectedUid && !libOpen && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "tween", duration: 0.3 }}
                  className="absolute inset-x-0 bottom-0 z-20 h-[52vh] overflow-hidden rounded-t-2xl border-t border-champagne/20 bg-[rgba(14,11,9,0.97)] lg:hidden"
                >
                  <div className="mx-auto my-2 h-1 w-10 rounded-full bg-champagne/30" />
                  <div className="h-[calc(100%-20px)] overflow-y-auto">
                    <FurnitureEditor />
                    <div className="border-t border-champagne/10">
                      <EstimatePanel />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* chat mobile (gaveta) */}
            <AnimatePresence>
              {mobile && chatOpen && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  className="absolute inset-x-0 bottom-0 z-30 h-[60vh] overflow-hidden rounded-t-2xl border-t border-champagne/20 bg-[rgba(14,11,9,0.98)] lg:hidden"
                >
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs uppercase tracking-widest2 text-champagne/80">Chat</span>
                    <button onClick={() => setChatOpen(false)} className="text-muted">✕</button>
                  </div>
                  <div className="h-[calc(100%-40px)]">
                    <ChatPanel author={role} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
