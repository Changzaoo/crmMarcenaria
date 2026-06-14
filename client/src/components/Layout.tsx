import { NavLink, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Box,
  CalendarDays,
  FileText,
  Hammer,
  HeartHandshake,
  HelpCircle,
  Kanban,
  LayoutDashboard,
  Library,
  LogOut,
  Settings,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useTour } from "./Tutorial";
import { NotificationBell } from "./Notifications";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/crm", label: "Funil comercial", icon: Kanban },
  { to: "/clientes", label: "Clientes", icon: UsersRound },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/projetos", label: "Projetos", icon: Hammer },
  { to: "/suporte-3d", label: "Suporte 3D", icon: Box },
  { to: "/catalogo", label: "Catálogo", icon: Library },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/financeiro", label: "Financeiro", icon: WalletCards },
  { to: "/pos-venda", label: "Pós-venda", icon: HeartHandshake },
  { to: "/config", label: "Configurações", icon: Settings },
] satisfies Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }>;

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { startTour } = useTour();
  const email = user?.email || "usuário autenticado";
  const initial = email.slice(0, 1).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-20 lg:w-64 shrink-0 bg-surface border-r border-white/5 flex flex-col h-screen">
        <div className="shrink-0 px-3 lg:px-6 py-5 lg:py-7 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-champagne text-background grid place-items-center font-display text-xl">L</div>
            <div className="hidden lg:block">
              <div className="font-display text-2xl tracking-[0.24em] text-text">LINEAR</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-champagne mt-1">Marcenaria Corporativa</div>
            </div>
          </div>
        </div>

        <nav data-tour="sidebar" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  `relative flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm transition group ${
                    isActive ? "text-text" : "text-muted hover:text-text hover:bg-surfaceSoft"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="navActive"
                        className="absolute inset-0 rounded-lg bg-surfaceSoft border border-champagne/20"
                      />
                    )}
                    <Icon size={18} className={`relative shrink-0 ${isActive ? "text-champagne" : ""}`} />
                    <span className="relative font-medium hidden lg:inline">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="shrink-0 p-3 lg:p-4 border-t border-white/5 space-y-2">
          <NotificationBell />
          <button
            type="button"
            data-tour="help"
            onClick={() => startTour()}
            className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-text hover:bg-surfaceSoft transition"
            title="Ver tutorial desta página"
          >
            <HelpCircle size={18} className="shrink-0 text-champagne" />
            <span className="font-medium hidden lg:inline">Tutorial da página</span>
          </button>
          <div className="flex items-center gap-3 rounded-lg bg-surfaceSoft border border-white/5 p-2">
            <div className="w-9 h-9 rounded-lg bg-background border border-white/10 grid place-items-center text-sm font-semibold text-champagne">
              {initial}
            </div>
            <div className="hidden lg:block min-w-0 flex-1">
              <div className="text-xs text-muted">Sessão ativa</div>
              <div className="text-sm font-medium truncate">{email}</div>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-text hover:bg-white/5"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
