import { Users, Save, FileText, CheckCircle2, Wifi } from "lucide-react";
import type { Role, SessionState } from "../types";

export default function SessionPanel({
  state,
  role,
  clienteNome,
  salvo,
  onSalvar,
  onResumo,
  onFinalizar,
}: {
  state: SessionState | null;
  role: Role;
  clienteNome: string;
  salvo: boolean;
  onSalvar: () => void;
  onResumo: () => void;
  onFinalizar?: () => void;
}) {
  const arquitetoOnline = state?.arquitetoOnline ?? false;
  const clienteOnline = state?.clienteOnline ?? (role === "cliente");
  const colaborativa = arquitetoOnline && clienteOnline;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-champagne" />
        <h3 className="font-display text-base text-text">Sessão</h3>
        {colaborativa && (
          <span className="ml-auto chip bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Wifi size={11} /> Colaborativa
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        <Linha cor="champagne" online={clienteOnline} label="Cliente" nome={clienteNome} />
        <Linha cor="sky" online={arquitetoOnline} label="Arquiteto" nome={arquitetoOnline ? "Especialista LINEAR" : "—"} />
      </div>

      <div className="text-[11px] text-muted">
        {colaborativa
          ? "Sessão colaborativa ativa — vocês estão no mesmo ambiente."
          : role === "cliente"
          ? "Monte seu ambiente. Um especialista pode entrar para te ajudar."
          : "Acompanhando o ambiente do cliente."}
      </div>

      <div className="space-y-2 pt-1">
        <button onClick={onSalvar} className="btn-ghost w-full py-2 text-sm">
          <Save size={15} /> {salvo ? "Salvo ✓" : "Salvar projeto"}
        </button>
        <button onClick={onResumo} className="btn-ghost w-full py-2 text-sm">
          <FileText size={15} /> Gerar resumo do orçamento
        </button>
        {onFinalizar && (
          <button onClick={onFinalizar} className="btn-primary w-full py-2 text-sm">
            <CheckCircle2 size={15} /> Finalizar atendimento
          </button>
        )}
      </div>
    </div>
  );
}

function Linha({ cor, online, label, nome }: { cor: "champagne" | "sky"; online: boolean; label: string; nome: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${online ? (cor === "champagne" ? "bg-champagne" : "bg-sky-400") : "bg-white/20"} ${online ? "animate-pulse" : ""}`} />
      <span className="text-muted w-16">{label}</span>
      <span className="text-text truncate flex-1">{nome}</span>
      <span className={`text-[10px] ${online ? "text-emerald-300" : "text-muted"}`}>{online ? "online" : "offline"}</span>
    </div>
  );
}
