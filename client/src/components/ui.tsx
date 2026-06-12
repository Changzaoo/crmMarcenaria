import { AnimatePresence, motion } from "framer-motion";
import { createContext, useContext, useState, ReactNode, useCallback } from "react";

// ---------- Página ----------
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="font-display text-3xl text-text">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function EmptyState({ icon = "✦", title, hint, action }: { icon?: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card p-10 text-center flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-surfaceSoft border border-white/5 grid place-items-center text-2xl text-champagne">{icon}</div>
      <div className="font-display text-xl">{title}</div>
      {hint && <p className="text-muted text-sm max-w-md">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "gold" | "green" | "red" | "blue" | "wood" }) {
  const tones: Record<string, string> = {
    default: "bg-surfaceSoft text-muted border border-white/10",
    gold: "bg-champagne/15 text-champagne border border-champagne/30",
    green: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    red: "bg-red-500/15 text-red-300 border border-red-500/30",
    blue: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    wood: "bg-bronze/15 text-bronze border border-bronze/30",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

// ---------- Campos ----------
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className || ""}`} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input ${props.className || ""}`} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input ${props.className || ""}`} />;
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className={`card p-6 w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}
            initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl">{title}</h2>
              <button onClick={onClose} className="text-muted hover:text-text text-xl leading-none px-2">✕</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Toast + Confirm ----------
interface ToastMsg { id: number; text: string; tone: "ok" | "err"; }
interface UIContextType {
  toast: (text: string, tone?: "ok" | "err") => void;
  confirm: (text: string) => Promise<boolean>;
}
const UIContext = createContext<UIContextType>({ toast: () => {}, confirm: async () => false });
export const useUI = () => useContext(UIContext);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [confirmState, setConfirmState] = useState<{ text: string; resolve: (v: boolean) => void } | null>(null);

  const toast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const confirm = useCallback((text: string) => new Promise<boolean>((resolve) => setConfirmState({ text, resolve })), []);
  const closeConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className={`px-4 py-3 rounded-lg text-sm font-medium shadow-card border ${
                t.tone === "ok" ? "bg-surface border-champagne/30 text-text" : "bg-surface border-red-500/40 text-red-200"}`}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Modal open={!!confirmState} onClose={() => closeConfirm(false)} title="Confirmar">
        <p className="text-muted mb-6">{confirmState?.text}</p>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => closeConfirm(false)}>Cancelar</button>
          <button className="btn-danger" onClick={() => closeConfirm(true)}>Confirmar</button>
        </div>
      </Modal>
    </UIContext.Provider>
  );
}

export function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-champagne/30 border-t-champagne animate-spin" /></div>;
}
