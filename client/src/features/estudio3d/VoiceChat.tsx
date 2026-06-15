import { startVoice, stopVoice, toggleMute, useVoice, voiceStore } from "./voice";
import { toast } from "./toast";

/* Botão de voz: entra/sai da chamada e muta. Mostra status da conexão. */
export default function VoiceChat() {
  const v = useVoice();

  if (!v.available) return null;

  if (!v.inCall) {
    return (
      <button
        onClick={async () => {
          await startVoice();
          if (voiceStore.getState().error) toast("Não foi possível acessar o microfone.", "warn");
          else toast("Você entrou na conversa por voz.", "info");
        }}
        title="Conversar por voz com o arquiteto"
        className="inline-flex items-center gap-1.5 rounded-lg border border-champagne/20 px-3 py-2 text-sm text-text transition hover:border-champagne/50 hover:bg-champagne/5"
      >
        🎙️ Voz
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-1">
      <span className="flex items-center gap-1 px-1 text-xs text-emerald-300">
        <span className={`h-2 w-2 rounded-full ${v.connected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
        {v.connected ? `Em chamada (${v.peerCount})` : "Conectando…"}
      </span>
      <button
        onClick={toggleMute}
        title={v.muted ? "Reativar microfone" : "Mutar"}
        className={`rounded-md px-2 py-1 text-xs transition ${v.muted ? "bg-amber-500/20 text-amber-200" : "text-text hover:bg-white/5"}`}
      >
        {v.muted ? "🔇" : "🎙️"}
      </button>
      <button
        onClick={() => { stopVoice(); toast("Você saiu da conversa por voz.", "info"); }}
        title="Encerrar voz"
        className="rounded-md px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10"
      >
        Sair
      </button>
    </div>
  );
}
