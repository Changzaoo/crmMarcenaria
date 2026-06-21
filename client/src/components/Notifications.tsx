import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, PhoneCall, Check, Trash2, Info, UserPlus } from "lucide-react";
import { listarLeads } from "../features/orcamento3d/services/leadService";
import { api } from "../lib/api";
import { alertarNovoLead } from "../lib/leadAlerts";

interface NegocioResumo {
  id: number;
  titulo: string;
  origem?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Tipos + contexto                                                   */
/* ------------------------------------------------------------------ */
export type NotificationType = "arquiteto" | "info" | "lead";

export interface AppNotification {
  /** Chave de deduplicação (mesma chave nunca gera dois avisos). */
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  /** Rota para a qual navegar ao clicar. */
  to?: string;
  createdAt: number;
  read: boolean;
}

interface NotifContextType {
  notifications: AppNotification[];
  unread: number;
  push: (n: Omit<AppNotification, "createdAt" | "read"> & { createdAt?: number }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

const noop = () => {};
const NotifContext = createContext<NotifContextType>({
  notifications: [],
  unread: 0,
  push: noop,
  markRead: noop,
  markAllRead: noop,
  remove: noop,
  clearAll: noop,
});

export const useNotifications = () => useContext(NotifContext);

/* ------------------------------------------------------------------ */
/*  Persistência                                                       */
/* ------------------------------------------------------------------ */
const STORE_KEY = "linear:notifications";
const MAX = 60;
const POLL_MS = 12000;

function load(): AppNotification[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(list: AppNotification[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

// Bip curto via Web Audio — sem depender de arquivo de áudio.
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const play = () => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(1175, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      o.start();
      o.stop(ctx.currentTime + 0.46);
      o.onended = () => ctx.close().catch(() => {});
    };
    if (ctx.state === "suspended") ctx.resume().then(play).catch(() => ctx.close().catch(() => {}));
    else play();
  } catch {
    /* silencioso — política de autoplay pode bloquear */
  }
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<AppNotification[]>(load);
  const known = useRef<Set<string>>(new Set(list.map((n) => n.id)));

  const push = useCallback<NotifContextType["push"]>((n) => {
    if (known.current.has(n.id)) return; // dedupe
    known.current.add(n.id);
    setList((cur) => {
      const item: AppNotification = { read: false, createdAt: Date.now(), ...n };
      const next = [item, ...cur].slice(0, MAX);
      save(next);
      return next;
    });
    beep();
  }, []);

  const markRead = useCallback((id: string) => {
    setList((cur) => {
      const next = cur.map((n) => (n.id === id ? { ...n, read: true } : n));
      save(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setList((cur) => {
      const next = cur.map((n) => ({ ...n, read: true }));
      save(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setList((cur) => {
      const next = cur.filter((n) => n.id !== id);
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setList(() => {
      save([]);
      return [];
    });
  }, []);

  // Polling global: detecta (1) clientes chamando um arquiteto no Estúdio 3D e
  // (2) novos leads/orçamentos que entram no funil — gerando avisos em qualquer
  // página. A 1ª leitura só estabelece a linha de base (não notifica o que já existe).
  const negociosConhecidos = useRef<Set<number> | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      // (1) Arquiteto solicitado no Estúdio 3D
      try {
        const leads = await listarLeads();
        if (!alive) return;
        for (const l of leads) {
          if (!l.arquiteto_solicitado) continue;
          push({
            id: `arquiteto:${l.id}:${l.arquiteto_solicitado_em || ""}`,
            type: "arquiteto",
            title: `${l.nome || "Um cliente"} está chamando um arquiteto`,
            body: [l.tipo_projeto, l.cidade_estado].filter(Boolean).join(" · ") || "Atendimento no Estúdio 3D",
            to: l.projeto_id ? `/suporte-3d/sessao/${l.projeto_id}` : "/suporte-3d",
          });
        }
      } catch {
        /* silencioso — sem auth/offline não deve quebrar a UI */
      }

      // (2) Novos leads/orçamentos no funil comercial.
      // GET /negocios sincroniza os Orçamentos 3D no servidor (throttled) ANTES
      // de listar — então leads novos do Estúdio 3D entram no funil e aparecem
      // aqui de forma confiável, mesmo sem a página do CRM aberta.
      try {
        const negocios = await api.get<NegocioResumo[]>("/negocios");
        if (!alive) return;
        if (negociosConhecidos.current !== null) {
          for (const n of negocios) {
            if (negociosConhecidos.current.has(n.id)) continue;
            const eh3d = n.origem === "Orçamento 3D";
            const ehSite = n.origem === "Solicitar proposta";
            push({
              id: `negocio:${n.id}`,
              type: "lead",
              title: eh3d ? "Novo orçamento 3D recebido" : ehSite ? "Nova solicitação do site" : "Novo lead",
              body: n.titulo,
              to: "/crm",
            });
            // Gancho opcional de alerta externo (WhatsApp/e-mail). Stub: por
            // padrão não envia nada — ver lib/leadAlerts.ts para ativar.
            void alertarNovoLead({ titulo: n.titulo, origem: n.origem });
          }
        }
        negociosConhecidos.current = new Set(negocios.map((n) => n.id));
      } catch {
        /* silencioso */
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [push]);

  const unread = list.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);

  return (
    <NotifContext.Provider value={{ notifications: list, unread, push, markRead, markAllRead, remove, clearAll }}>
      {children}
    </NotifContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Sino + painel                                                      */
/* ------------------------------------------------------------------ */
function tempoRelativo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "agora";
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} d`;
}

const ICONS: Record<NotificationType, typeof Bell> = {
  arquiteto: PhoneCall,
  lead: UserPlus,
  info: Info,
};

export function NotificationBell({ collapsed = false }: { collapsed?: boolean }) {
  const { notifications, unread, markRead, markAllRead, remove, clearAll } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const abrir = (n: AppNotification) => {
    markRead(n.id);
    setOpen(false);
    if (n.to) navigate(n.to);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-tour="notifications"
        onClick={() => setOpen((o) => !o)}
        title="Notificações"
        className={`relative w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
          open ? "bg-surfaceSoft text-text" : "text-muted hover:text-text hover:bg-surfaceSoft"
        }`}
      >
        {unread > 0 ? (
          <BellRing size={18} className="shrink-0 text-champagne animate-[pulse_1.4s_ease-in-out_infinite]" />
        ) : (
          <Bell size={18} className="shrink-0" />
        )}
        {!collapsed && <span className="font-medium hidden lg:inline">Notificações</span>}
        {unread > 0 && (
          <span className="absolute top-1.5 left-7 lg:static lg:ml-auto min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-amber-500 text-background text-[10px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 bottom-12 left-2 w-[min(22rem,86vw)] rounded-xl bg-surface border border-white/10 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="font-display text-base text-text">Notificações</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-champagne hover:underline flex items-center gap-1">
                <Check size={12} /> Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted">
                <Bell size={22} className="mx-auto mb-2 opacity-40" />
                Sem notificações por enquanto.
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.type] || Info;
                return (
                  <div
                    key={n.id}
                    className={`group flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 cursor-pointer transition ${
                      n.read ? "opacity-70 hover:opacity-100 hover:bg-surfaceSoft/50" : "bg-amber-500/5 hover:bg-amber-500/10"
                    }`}
                    onClick={() => abrir(n)}
                  >
                    <div className={`mt-0.5 w-8 h-8 shrink-0 rounded-lg grid place-items-center ${n.type === "arquiteto" ? "bg-amber-500/15 text-amber-300" : n.type === "lead" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-muted"}`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text leading-snug">{n.title}</div>
                      {n.body && <div className="text-xs text-muted truncate">{n.body}</div>}
                      <div className="text-[10px] text-muted mt-0.5">{tempoRelativo(n.createdAt)}</div>
                    </div>
                    {!n.read && <span className="mt-1 w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-300 shrink-0"
                      title="Remover"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <button onClick={clearAll} className="w-full px-4 py-2.5 text-[11px] text-muted hover:text-text border-t border-white/5">
              Limpar tudo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
