import { Mic, MicOff, PhoneOff } from "lucide-react";
import { startVoice, stopVoice, toggleMute, useVoice, voiceError } from "../voice";
import { useUI } from "../../../components/ui";

/* Botão de chat por voz (WebRTC) — mesmo recurso do site público. */
export default function VoiceChat() {
  const v = useVoice();
  const { toast } = useUI();
  if (!v.available) return null;

  if (!v.inCall) {
    return (
      <button
        onClick={async () => {
          await startVoice();
          if (voiceError()) toast("Não foi possível acessar o microfone.", "err");
          else toast("Você entrou na conversa por voz.");
        }}
        className="btn-ghost px-2.5 py-2 text-sm"
        title="Conversar por voz"
      >
        <Mic size={15} /> <span className="hidden lg:inline">Voz</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-1">
      <span className="flex items-center gap-1 px-1 text-xs text-emerald-300">
        <span className={`h-2 w-2 rounded-full ${v.connected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
        {v.connected ? `Em chamada (${v.peerCount})` : "Conectando…"}
      </span>
      <button
        onClick={toggleMute}
        title={v.muted ? "Reativar microfone" : "Mutar"}
        className={`rounded-md px-2 py-1 text-xs transition ${v.muted ? "bg-amber-500/20 text-amber-200" : "text-text hover:bg-white/5"}`}
      >
        {v.muted ? <MicOff size={14} /> : <Mic size={14} />}
      </button>
      <button
        onClick={() => {
          stopVoice();
          toast("Você saiu da conversa por voz.");
        }}
        title="Encerrar voz"
        className="rounded-md px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10"
      >
        <PhoneOff size={14} />
      </button>
    </div>
  );
}
