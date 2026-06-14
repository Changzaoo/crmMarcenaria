import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileText, Keyboard, Layers, PhoneCall, Save, Sofa, SlidersHorizontal } from "lucide-react";
import { useUI } from "../../components/ui";
import { StudioProvider, useStudio } from "./store";
import type { Project3DDoc, Role, SessionState } from "./types";
import { CollaborationSession } from "./services/collaborationService";
import { salvarProjeto, enviarParaAnalise, chamarArquiteto } from "./services/project3DService";
import ThreeDScene from "./scene/ThreeDScene";
import SceneErrorBoundary from "./scene/SceneErrorBoundary";
import CameraModeSelector from "./ui/CameraModeSelector";
import FurnitureLibrary from "./ui/FurnitureLibrary";
import FurniturePropertiesPanel from "./ui/FurniturePropertiesPanel";
import FloorControls from "./ui/FloorControls";
import SessionPanel from "./ui/SessionPanel";
import ProjectSummaryPanel from "./ui/ProjectSummaryPanel";

function peerColor(role: Role) {
  return role === "arquiteto" ? "#9fb4cc" : "#D8B978";
}

interface ShellProps {
  projetoId: string;
  role: Role;
  clienteNome: string;
  initialDoc: Project3DDoc;
  readOnly?: boolean;
  onExit?: () => void;
}

export default function StudioShell(props: ShellProps) {
  return (
    <StudioProvider initialDoc={props.initialDoc} role={props.role} readOnly={props.readOnly}>
      <StudioInner {...props} />
    </StudioProvider>
  );
}

function StudioInner({ projetoId, role, clienteNome, onExit, readOnly }: ShellProps) {
  const { toast } = useUI();
  const store = useStudio();
  const {
    doc,
    replaceDoc,
    onDocChange,
    setProjectName,
    setCameraMode,
    select,
    selectedUid,
    selected,
    removeFurniture,
    duplicateFurniture,
    updateFurniture,
    cycleWallMode,
    setActiveFloor,
    activeFloor,
  } = store;

  const [session, setSession] = useState<SessionState | null>(null);
  const [mostrarResumo, setMostrarResumo] = useState(false);
  const [salvo, setSalvo] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const [mostrarAtalhos, setMostrarAtalhos] = useState(false);

  const peerId = useMemo(() => `${role}_${Math.random().toString(36).slice(2, 9)}`, [role]);
  const collabRef = useRef<CollaborationSession | null>(null);
  const localDocRef = useRef<Project3DDoc>(doc);
  const lastSelfPushRev = useRef(-1);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Colaboração (relay por polling) ----
  useEffect(() => {
    const collab = new CollaborationSession({
      projetoId,
      peerId,
      role,
      nome: role === "arquiteto" ? "Especialista LINEAR" : clienteNome,
      color: peerColor(role),
      onState: (state) => {
        setSession(state);
        // aplica documento remoto (last-write-wins), ignorando o próprio eco
        if (
          state.doc &&
          state.docRev !== lastSelfPushRev.current &&
          JSON.stringify(state.doc) !== JSON.stringify(localDocRef.current)
        ) {
          localDocRef.current = state.doc;
          replaceDoc(state.doc);
        }
      },
    });
    collab.start();
    collabRef.current = collab;
    // Semeia a sessão com o ambiente atual (carregado do banco) para que quem
    // entrar veja o ambiente do lead imediatamente — o relay não fica mais
    // esperando a primeira edição. O servidor ignora o seed se a sessão já tiver
    // um documento ao vivo, então não há risco de sobrescrever edições em curso.
    collab.pushDoc(localDocRef.current, { seed: true }).then((r) => {
      if (r?.docRev != null) lastSelfPushRev.current = r.docRev;
    });
    return () => {
      void collab.stop();
      collabRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId, peerId, role]);

  // ---- Reage a mudanças locais: publica na sessão + autosave ----
  useEffect(() => {
    return onDocChange((next) => {
      localDocRef.current = next;
      setSalvo(false);
      // publica para a sessão colaborativa
      collabRef.current?.pushDoc(next).then((r) => {
        if (r?.docRev != null) lastSelfPushRev.current = r.docRev;
      });
      // autosave debounce
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persistir(next, true), 1500);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDocChange]);

  // ---- Atalhos de teclado do estúdio ----
  // Movimentação (WASD/setas) é tratada na cena; aqui ficam os atalhos de edição,
  // câmera e navegação. Ignorados quando há um campo de texto em foco.
  useEffect(() => {
    const editavelEmFoco = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (editavelEmFoco()) return;
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+S — salvar
      if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persistir(localDocRef.current);
        return;
      }
      // Ctrl/Cmd+D — duplicar móvel selecionado
      if (ctrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (!readOnly && selectedUid) duplicateFurniture(selectedUid);
        return;
      }
      if (ctrl) return; // demais combinações com Ctrl/Cmd ficam para o navegador

      switch (e.key) {
        case "1": setCameraMode("primeira"); break;
        case "2": setCameraMode("terceira"); break;
        case "3": setCameraMode("isometrica"); break;
        case "4": setCameraMode("topo"); break;
        case "c": case "C": cycleWallMode(); break;
        case "[": setActiveFloor(activeFloor - 1); break;
        case "]": setActiveFloor(activeFloor + 1); break;
        case "?": setMostrarAtalhos((v) => !v); break;
        case "Escape":
          if (mostrarAtalhos) setMostrarAtalhos(false);
          else if (mostrarResumo) setMostrarResumo(false);
          else select(null);
          break;
        case "Delete":
        case "Backspace":
          if (!readOnly && selectedUid) { e.preventDefault(); removeFurniture(selectedUid); }
          break;
        case "r":
        case "R":
          if (!readOnly && selected) {
            const passo = e.shiftKey ? -Math.PI / 4 : Math.PI / 4;
            updateFurniture(selected.uid, { rotation: selected.rotation + passo });
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, selectedUid, selected, activeFloor, mostrarAtalhos, mostrarResumo]);

  async function persistir(d: Project3DDoc, silencioso = false) {
    try {
      await salvarProjeto(projetoId, d);
      setSalvo(true);
      if (!silencioso) toast("Projeto salvo");
    } catch {
      if (!silencioso) toast("Não foi possível salvar agora", "err");
    }
  }

  async function onEnviar() {
    setEnviando(true);
    try {
      await enviarParaAnalise(projetoId, localDocRef.current);
      setEnviado(true);
      toast("Projeto enviado para análise da marcenaria!");
    } catch {
      toast("Falha ao enviar. Tente novamente.", "err");
    } finally {
      setEnviando(false);
    }
  }

  async function solicitarArquiteto() {
    void persistir(localDocRef.current, true);
    try {
      await chamarArquiteto(projetoId);
      toast("Especialista avisado! Em instantes alguém pode entrar na sua sessão.");
    } catch {
      toast("Não foi possível chamar o especialista agora. Tente novamente.", "err");
    }
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Topbar */}
      <header className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface/80 backdrop-blur z-20">
        {onExit && (
          <button onClick={onExit} className="btn-ghost px-2.5 py-2" title="Voltar"><ArrowLeft size={16} /></button>
        )}
        <input
          value={doc.projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={readOnly}
          className="bg-transparent font-display text-lg text-text outline-none border-b border-transparent focus:border-champagne/40 max-w-[40vw]"
        />
        {role === "arquiteto" && <span className="chip bg-sky-500/15 text-sky-300 border border-sky-500/30">Modo arquiteto</span>}

        <div className="ml-auto hidden md:block"><CameraModeSelector /></div>

        <button onClick={() => void persistir(localDocRef.current)} className="btn-ghost px-3 py-2 text-sm" title="Salvar">
          <Save size={15} /> <span className="hidden lg:inline">{salvo ? "Salvo" : "Salvar"}</span>
        </button>
        <button onClick={() => setMostrarResumo(true)} className="btn-ghost px-3 py-2 text-sm">
          <FileText size={15} /> <span className="hidden lg:inline">Pré-orçamento</span>
        </button>
        <button onClick={() => setMostrarAtalhos(true)} className="btn-ghost px-2.5 py-2 text-sm" title="Atalhos de teclado (?)">
          <Keyboard size={15} />
        </button>
        {role === "cliente" && (
          <button onClick={solicitarArquiteto} className="btn-primary px-3 py-2 text-sm">
            <PhoneCall size={15} /> <span className="hidden lg:inline">Chamar arquiteto</span>
          </button>
        )}
      </header>

      {/* Câmera no mobile */}
      <div className="md:hidden px-3 py-2 border-b border-white/5 overflow-x-auto"><CameraModeSelector /></div>

      <div className="flex-1 relative min-h-0">
        {/* Painel esquerdo — biblioteca */}
        <aside className={`absolute lg:static z-10 top-0 left-0 h-full w-72 bg-surface/95 lg:bg-surface border-r border-white/5 p-4 transition-transform ${libOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          {!readOnly ? <FurnitureLibrary onClose={() => setLibOpen(false)} /> : <div className="text-sm text-muted">Visualização do ambiente do cliente.</div>}
        </aside>

        {/* Cena 3D */}
        <main className="absolute inset-0 lg:relative lg:flex-1 h-full lg:ml-0">
          <div className="absolute inset-0">
            <SceneErrorBoundary>
              <Suspense fallback={<div className="h-full grid place-items-center text-muted text-sm">Carregando ambiente 3D…</div>}>
                <ThreeDScene
                  peers={session?.peers ?? []}
                  selfPeerId={peerId}
                  role={role}
                  name={role === "arquiteto" ? "Especialista" : clienteNome}
                  onSelfMove={(x, z, ry) => collabRef.current?.updateSelf(x, z, ry)}
                />
              </Suspense>
            </SceneErrorBoundary>
          </div>

          {/* Controles de andar / paredes (estilo The Sims) */}
          <div className="absolute top-3 left-3 z-10">
            <FloorControls readOnly={readOnly} />
          </div>

          {/* FABs mobile */}
          <div className="lg:hidden absolute bottom-4 left-4 flex flex-col gap-2 z-10">
            {!readOnly && (
              <button onClick={() => setLibOpen((v) => !v)} className="btn-primary rounded-full w-12 h-12 p-0 shadow-glow"><Sofa size={18} /></button>
            )}
            <button onClick={() => setPropsOpen((v) => !v)} className="btn-ghost rounded-full w-12 h-12 p-0"><SlidersHorizontal size={18} /></button>
          </div>
        </main>

        {/* Painel direito — propriedades + sessão */}
        <aside className={`absolute lg:static z-10 top-0 right-0 h-full w-80 bg-surface/95 lg:bg-surface border-l border-white/5 p-4 overflow-y-auto transition-transform ${propsOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <span className="font-display text-lg">Propriedades</span>
            <button onClick={() => setPropsOpen(false)} className="text-muted">✕</button>
          </div>
          <div className="flex items-center gap-2 mb-3 text-champagne/80 text-[11px] uppercase tracking-wider"><Layers size={13} /> Propriedades do móvel</div>
          <FurniturePropertiesPanel />
          <div className="my-4 border-t border-white/5" />
          <SessionPanel
            state={session}
            role={role}
            clienteNome={clienteNome}
            salvo={salvo}
            onSalvar={() => void persistir(localDocRef.current)}
            onResumo={() => setMostrarResumo(true)}
            onFinalizar={role === "arquiteto" ? onExit : undefined}
          />
        </aside>
      </div>

      {mostrarResumo && (
        <ProjectSummaryPanel
          onClose={() => setMostrarResumo(false)}
          onEnviar={onEnviar}
          enviado={enviado}
          enviando={enviando}
        />
      )}

      {mostrarAtalhos && (
        <ShortcutsOverlay readOnly={readOnly} onClose={() => setMostrarAtalhos(false)} />
      )}
    </div>
  );
}

function ShortcutsOverlay({ readOnly, onClose }: { readOnly?: boolean; onClose: () => void }) {
  const movimento: [string, string][] = [
    ["W A S D / setas", "Mover pelo ambiente (1ª e 3ª pessoa)"],
    ["1 / 2 / 3 / 4", "Câmera: 1ª pessoa · 3ª pessoa · isométrica · topo"],
    ["[ / ]", "Andar abaixo / acima"],
    ["C", "Alternar paredes (altas / rebaixadas / ocultas)"],
  ];
  const edicao: [string, string][] = [
    ["R / Shift+R", "Girar móvel selecionado ±45°"],
    ["Ctrl/Cmd + D", "Duplicar móvel selecionado"],
    ["Delete / Backspace", "Remover móvel selecionado"],
    ["Ctrl/Cmd + S", "Salvar projeto"],
    ["Esc", "Desmarcar / fechar painel"],
  ];
  const geral: [string, string][] = [["?", "Mostrar / ocultar estes atalhos"]];

  const Grupo = ({ titulo, itens }: { titulo: string; itens: [string, string][] }) => (
    <div>
      <div className="text-champagne/80 text-[11px] uppercase tracking-wider mb-2">{titulo}</div>
      <div className="space-y-1.5">
        {itens.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted">{d}</span>
            <kbd className="shrink-0 rounded-md bg-black/40 border border-white/10 px-2 py-0.5 text-xs text-text font-mono">{k}</kbd>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-white/10 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl flex items-center gap-2"><Keyboard size={18} /> Atalhos de teclado</h2>
          <button onClick={onClose} className="text-muted hover:text-text">✕</button>
        </div>
        <div className="space-y-5">
          <Grupo titulo="Navegação e câmera" itens={movimento} />
          {!readOnly && <Grupo titulo="Edição" itens={edicao} />}
          <Grupo titulo="Geral" itens={geral} />
        </div>
      </div>
    </div>
  );
}
