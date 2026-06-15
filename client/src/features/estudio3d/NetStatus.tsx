import { useEffect, useState } from "react";
import { netConnected } from "./net";

/* Indicador discreto de conexão com o servidor de tempo real. */
export default function NetStatus({ label = true }: { label?: boolean }) {
  const [on, setOn] = useState(netConnected());

  useEffect(() => {
    const h = (e: Event) => setOn(!!(e as CustomEvent).detail?.connected);
    window.addEventListener("orc3d:net", h);
    setOn(netConnected());
    return () => window.removeEventListener("orc3d:net", h);
  }, []);

  return (
    <span
      title={on ? "Conectado ao servidor — colaboração entre dispositivos ativa" : "Offline — sincroniza só neste dispositivo"}
      className="inline-flex items-center gap-1.5 text-[11px] text-muted"
    >
      <span className={`h-2 w-2 rounded-full ${on ? "bg-emerald-400" : "bg-zinc-500"}`} />
      {label && (on ? "Online" : "Local")}
    </span>
  );
}
