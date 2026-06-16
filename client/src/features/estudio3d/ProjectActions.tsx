import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "./Portal";
import { Btn, Field } from "./studioUi";
import {
  actions,
  buildProject3D,
  closeStudio,
  useOrc3d,
} from "./useOrcamento3DStore";
import {
  create3DAttendance,
  notifyAvailableArchitects,
} from "./crmBridge";
import {
  callCrmArchitect,
  createCrmLeadFromProject,
  isCrmNotFound,
  looksLikeCrmProjectId,
  saveCrmProject,
  sendCrmProjectForAnalysis,
} from "./crmPublicApi";
import { buildChecklist } from "./pricingEngine";
import { exportHTML, exportJSON } from "./projectExport";
import { toast } from "./toast";

const validPhone = (v: string) => /\d{8,}/.test(v.replace(/\D/g, ""));
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function MenuItem({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-champagne/10 ${
        danger ? "text-rose-300 hover:bg-rose-500/10" : "text-text"
      }`}
    >
      {children}
    </button>
  );
}

type Dialog = null | "save" | "quote" | "export";

export default function ProjectActions({ variant = "bar" }: { variant?: "bar" | "mobile" }) {
  const client = useOrc3d((s) => s.doc.client);
  const name = useOrc3d((s) => s.doc.name);
  const env = useOrc3d((s) => s.doc.environment);
  const furniture = useOrc3d((s) => s.doc.furniture);
  const canUndo = useOrc3d((s) => s.past.length > 0);
  const canRedo = useOrc3d((s) => s.future.length > 0);
  const assisted = useOrc3d((s) => s.assistedByArchitect);
  const role = useOrc3d((s) => s.role);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [sheet, setSheet] = useState(false);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "quote" | "architect">(null);

  const persist = (status?: Parameters<typeof actions.setStatus>[0]) => {
    if (status) actions.setStatus(status);
    const att = create3DAttendance(buildProject3D());
    actions.setAttendanceId(att.id);
    return att;
  };

  const createMissingCrmProject = async () => {
    const created = await createCrmLeadFromProject(buildProject3D());
    actions.setProjectId(created.projetoId);
    return buildProject3D();
  };

  const ensureCrmProject = async () => {
    const project = buildProject3D();
    if (looksLikeCrmProjectId(project.id)) return project;
    return createMissingCrmProject();
  };

  const saveToCrm = async () => {
    let project = await ensureCrmProject();
    try {
      await saveCrmProject(project);
      return project;
    } catch (e) {
      if (!isCrmNotFound(e)) throw e;
      project = await createMissingCrmProject();
      await saveCrmProject(project);
      return project;
    }
  };

  const save = async () => {
    setBusy("save");
    actions.markSaved();
    try {
      const project = await saveToCrm();
      const att = create3DAttendance(project);
      actions.setAttendanceId(att.id);
      setDialog(null);
      toast("Projeto salvo com sucesso.", "success");
    } catch {
      persist();
      toast("Projeto salvo neste navegador, mas nao sincronizou com o CRM.", "warn");
    } finally {
      setBusy(null);
    }
  };

  const requestQuote = async () => {
    setBusy("quote");
    actions.markSentForAnalysis();
    persist("projeto-3d-enviado-analise");
    try {
      const project = await saveToCrm();
      await sendCrmProjectForAnalysis(project);
      if (assisted) notifyAvailableArchitects(project);
    } catch {
      toast("Nao foi possivel enviar para analise agora. Tente novamente.", "warn");
      setBusy(null);
      return;
    }
    setBusy(null);
    setDialog(null);
    toast("Recebemos seu projeto. Nossa equipe irá analisar cada detalhe.", "success");
  };

  const callArchitect = async () => {
    setBusy("architect");
    actions.setAssisted(true);
    actions.setStatus("aguardando-arquiteto");
    try {
      const project = await saveToCrm();
      const { attendance } = notifyAvailableArchitects(project);
      actions.setAttendanceId(attendance.id);
      await callCrmArchitect(project);
      toast("Um especialista foi chamado para acompanhar seu projeto.", "success");
      setBusy(null);
      return;
    } catch {
      const { attendance } = notifyAvailableArchitects(buildProject3D());
      actions.setAttendanceId(attendance.id);
      toast("Nao foi possivel avisar o Suporte 3D agora. Tente novamente.", "warn");
      setBusy(null);
      return;
    }
  };

  const capture = () => {
    window.dispatchEvent(new CustomEvent("orc3d:capture"));
    toast("Visão capturada para o seu projeto.", "info");
  };

  const checklist = buildChecklist(furniture, env, client);
  const contactOk = !!client.name && (validPhone(client.phone) || validEmail(client.email));

  const after = () => setSheet(false);
  const startScratch = () => {
    if (confirm("Começar do zero? Os móveis atuais serão removidos.")) {
      actions.startFromScratch();
      toast("Novo projeto iniciado.", "info");
    }
  };

  // Mobile / action-sheet: lista completa (cabe no painel deslizante).
  const ButtonsRow = ({ size = "sm" as "sm" | "md" }) => (
    <>
      <Btn size={size} onClick={() => { actions.undo(); }} disabled={!canUndo} title="Desfazer (Ctrl+Z)">↺ Desfazer</Btn>
      <Btn size={size} onClick={() => { actions.redo(); }} disabled={!canRedo} title="Refazer (Ctrl+Y)">↻ Refazer</Btn>
      <Btn size={size} onClick={() => { capture(); after(); }} title="Capturar visão atual">⬡ Capturar</Btn>
      <Btn size={size} onClick={() => { setDialog("export"); after(); }}>Exportar</Btn>
      <Btn size={size} onClick={() => { startScratch(); after(); }}>Começar do zero</Btn>
      {role === "cliente" && (
        <Btn size={size} onClick={() => { void callArchitect(); after(); }} active={assisted} disabled={busy !== null}>
          {busy === "architect" ? "Chamando..." : "Chamar arquiteto"}
        </Btn>
      )}
      <Btn size={size} variant="ghost" onClick={() => { setDialog("save"); after(); }} disabled={busy !== null}>Salvar</Btn>
      <Btn size={size} variant="primary" onClick={() => { setDialog("quote"); after(); }} disabled={busy !== null}>Enviar para análise</Btn>
      <Btn size={size} onClick={closeStudio} title="Voltar para o site">✕ Sair</Btn>
    </>
  );

  return (
    <>
      {variant === "bar" ? (
        /* Barra do topo enxuta: só o essencial visível; o resto vai pro menu "⋯". */
        <div className="flex items-center gap-1.5">
          <Btn size="sm" onClick={() => actions.undo()} disabled={!canUndo} title="Desfazer (Ctrl+Z)">↺</Btn>
          <Btn size="sm" onClick={() => actions.redo()} disabled={!canRedo} title="Refazer (Ctrl+Y)">↻</Btn>
          {role === "cliente" && (
            <Btn size="sm" onClick={() => void callArchitect()} active={assisted} disabled={busy !== null} title="Chamar um arquiteto para a sessão ao vivo">
              {busy === "architect" ? "Chamando…" : "Chamar arquiteto"}
            </Btn>
          )}
          <Btn size="sm" variant="ghost" onClick={() => setDialog("save")} disabled={busy !== null}>Salvar</Btn>
          <Btn size="sm" variant="primary" onClick={() => setDialog("quote")} disabled={busy !== null}>Enviar</Btn>
          <div className="relative">
            <Btn size="sm" onClick={() => setMore((v) => !v)} active={more} title="Mais ações">⋯</Btn>
            {more && (
              <>
                <div className="fixed inset-0 z-[59]" onClick={() => setMore(false)} />
                <div className="absolute right-0 top-full z-[60] mt-1 w-56 overflow-hidden rounded-xl border border-champagne/20 bg-surface p-1 shadow-card">
                  <MenuItem onClick={() => { capture(); setMore(false); }}>⬡ Capturar visão</MenuItem>
                  <MenuItem onClick={() => { setDialog("export"); setMore(false); }}>⬇ Exportar resumo</MenuItem>
                  <MenuItem onClick={() => { startScratch(); setMore(false); }}>↻ Começar do zero</MenuItem>
                  <div className="my-1 border-t border-champagne/10" />
                  <MenuItem danger onClick={() => { closeStudio(); setMore(false); }}>
                    {role === "arquiteto" ? "✕ Sair da sessão" : "✕ Sair"}
                  </MenuItem>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setSheet(true)}
          className="rounded-full border border-champagne/30 bg-[rgba(12,10,8,0.85)] px-4 py-2.5 text-sm text-text shadow-card backdrop-blur-md"
        >
          ⋯ Ações
        </button>
      )}

      {/* action sheet mobile */}
      <Portal>
      <AnimatePresence>
        {sheet && variant === "mobile" && (
          <motion.div
            className="fixed inset-0 z-[68] flex items-end bg-background/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-2xl border-t border-champagne/20 bg-surface p-4"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-champagne/30" />
              <div className="grid grid-cols-2 gap-2">
                <ButtonsRow size="md" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>

      {/* diálogos */}
      <Portal>
      <AnimatePresence>
        {dialog && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDialog(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-champagne/20 bg-surface p-6 shadow-card"
            >
              {dialog === "export" && (
                <div>
                  <h3 className="font-display text-xl text-text">Exportar resumo</h3>
                  <p className="mt-1 text-sm text-muted">Gere o resumo do projeto para enviar ou imprimir.</p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Btn onClick={() => { exportJSON(buildProject3D()); setDialog(null); }}>Baixar JSON</Btn>
                    <Btn variant="primary" onClick={() => { exportHTML(buildProject3D()); setDialog(null); }}>Versão imprimível</Btn>
                  </div>
                </div>
              )}

              {(dialog === "save" || dialog === "quote") && (
                <div className="space-y-3">
                  <h3 className="font-display text-xl text-text">
                    {dialog === "save" ? "Salvar projeto" : "Enviar para análise"}
                  </h3>

                  {dialog === "quote" && (
                    <ul className="space-y-1 rounded-lg border border-champagne/10 bg-surfaceSoft/50 p-3 text-xs">
                      {checklist.map((cItem) => (
                        <li key={cItem.label} className="flex items-center gap-2">
                          <span className={cItem.ok ? "text-emerald-400" : "text-amber-400"}>{cItem.ok ? "✓" : "•"}</span>
                          <span className={cItem.ok ? "text-muted" : "text-text"}>{cItem.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Field label="Nome do projeto">
                    <input value={name} onChange={(e) => actions.setProjectName(e.target.value)}
                      className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Seu nome">
                      <input value={client.name} maxLength={60} onChange={(e) => actions.setClient({ name: e.target.value })}
                        className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50" />
                    </Field>
                    <Field label="Cidade">
                      <input value={client.city} maxLength={40} onChange={(e) => actions.setClient({ city: e.target.value })}
                        className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Telefone">
                      <input value={client.phone} maxLength={20} inputMode="tel" onChange={(e) => actions.setClient({ phone: e.target.value })}
                        className={`w-full rounded-lg border bg-surface/60 px-3 py-2 text-sm text-text outline-none ${client.phone && !validPhone(client.phone) ? "border-rose-400/50" : "border-champagne/20 focus:border-champagne/50"}`} />
                    </Field>
                    <Field label="E-mail">
                      <input value={client.email} maxLength={80} inputMode="email" onChange={(e) => actions.setClient({ email: e.target.value })}
                        className={`w-full rounded-lg border bg-surface/60 px-3 py-2 text-sm text-text outline-none ${client.email && !validEmail(client.email) ? "border-rose-400/50" : "border-champagne/20 focus:border-champagne/50"}`} />
                    </Field>
                  </div>
                  <Field label="Observações">
                    <textarea value={client.notes} maxLength={500} onChange={(e) => actions.setClient({ notes: e.target.value })}
                      className="h-16 w-full resize-none rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50" />
                  </Field>

                  <div className="flex items-center justify-between pt-1">
                    <Btn variant="ghost" onClick={() => setDialog(null)}>Cancelar</Btn>
                    {dialog === "save" ? (
                      <Btn variant="primary" onClick={() => void save()} disabled={busy !== null}>
                        {busy === "save" ? "Salvando..." : "Salvar projeto"}
                      </Btn>
                    ) : (
                      <Btn variant="primary" disabled={!contactOk || busy !== null} onClick={() => void requestQuote()}>
                        {busy === "quote" ? "Enviando..." : "Enviar para análise"}
                      </Btn>
                    )}
                  </div>
                  {dialog === "quote" && !contactOk && (
                    <p className="text-[11px] text-amber-300">Informe nome e um contato válido (telefone ou e-mail).</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </>
  );
}
