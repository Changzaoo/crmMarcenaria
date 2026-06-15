import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePeers } from "./presence";
import { useOrc3d } from "./useOrcamento3DStore";
import { netConnected } from "./net";
import { toast } from "./toast";
import { dlog } from "./dlog";

/* Painel flutuante que mostra ao LEAD o estado da conexão com o arquiteto:
   chamando → aguardando → conectado → saiu → reconectando.
   Para o arquiteto, mostra a presença do cliente. */
export default function ArchitectPresence() {
  const peers = usePeers();
  const role = useOrc3d((s) => s.role);
  const assisted = useOrc3d((s) => s.assistedByArchitect);

  const [online, setOnline] = useState(netConnected());
  const wasConnected = useRef(netConnected());

  // estado de conexão com o relay (para "Reconectando...")
  useEffect(() => {
    const h = (e: Event) => {
      const connected = !!(e as CustomEvent).detail?.connected;
      setOnline(connected);
      if (connected) wasConnected.current = true;
    };
    window.addEventListener("orc3d:net", h);
    return () => window.removeEventListener("orc3d:net", h);
  }, []);

  // a "outra ponta": o arquiteto vê o cliente; o cliente vê o arquiteto.
  const counterpartRole = role === "cliente" ? "arquiteto" : "cliente";
  const counterpart = peers.find((p) => p.role === counterpartRole);
  const present = !!counterpart;

  // transições → avisos amigáveis (entrou / saiu)
  const wasPresent = useRef(false);
  useEffect(() => {
    if (present === wasPresent.current) return;
    wasPresent.current = present;
    if (present) {
      dlog("REALTIME", "Contraparte conectada:", counterpart);
      toast(
        role === "cliente"
          ? "Arquiteto conectado. Agora vocês estão no mesmo ambiente 3D."
          : "Cliente conectado à sessão.",
        "success"
      );
    } else {
      toast(
        role === "cliente"
          ? "O arquiteto saiu da sessão. Você ainda pode continuar seu orçamento."
          : "O cliente saiu da sessão.",
        "warn"
      );
    }
  }, [present, role, counterpart]);

  // texto/estado do painel
  let state: "reconnecting" | "connected" | "calling" | "idle";
  if (wasConnected.current && !online) state = "reconnecting";
  else if (present) state = "connected";
  else if (role === "cliente" && assisted) state = "calling";
  else state = "idle";

  if (state === "idle") return null;

  const meta = {
    reconnecting: {
      dot: "bg-amber-400",
      pulse: true,
      title: "Reconectando…",
      sub: "Estamos restabelecendo a conexão em tempo real.",
      border: "border-amber-400/40",
    },
    connected: {
      dot: "bg-emerald-400",
      pulse: true,
      title: role === "cliente" ? `Arquiteto conectado${counterpart?.name && counterpart.name !== "Arquiteto" ? ` · ${counterpart.name}` : ""}` : "Cliente na sessão",
      sub:
        role === "cliente"
          ? "Um especialista da nossa equipe está acompanhando seu projeto ao vivo."
          : "Vocês estão no mesmo ambiente 3D.",
      border: "border-emerald-400/40",
    },
    calling: {
      dot: "bg-sky-400",
      pulse: true,
      title: "Chamando arquiteto…",
      sub: "Seu projeto já foi enviado. Um arquiteto poderá entrar a qualquer momento — continue montando o ambiente.",
      border: "border-sky-400/40",
    },
  }[state];

  return (
    <AnimatePresence>
      <motion.div
        key={state}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className={`pointer-events-none absolute left-1/2 top-3 z-20 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border ${meta.border} bg-[rgba(12,10,8,0.82)] px-4 py-3 shadow-xl backdrop-blur-md`}
      >
        <div className="flex items-start gap-3">
          <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
            {meta.pulse && (
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${meta.dot} opacity-60`} />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm text-text">{meta.title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{meta.sub}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
