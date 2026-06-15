import { useEffect, useRef, useState } from "react";
import { actions, useOrc3d, uid } from "./useOrcamento3DStore";
import { appendMessage } from "./crmBridge";
import { getActiveSession } from "./collaboration";
import type { ChatMessage } from "./types";
import { Btn } from "./studioUi";

/* Chat do ambiente — cliente fala com o arquiteto. Mensagens ficam
   no store, são enviadas ao colaborador em tempo real e, se houver
   atendimento no CRM, também são persistidas. */
export default function ChatPanel({
  author = "cliente" as const,
}: {
  author?: "cliente" | "arquiteto";
}) {
  const messages = useOrc3d((s) => s.chat);
  const attendanceId = useOrc3d((s) => s.attendanceId);
  const clientName = useOrc3d((s) => s.doc.client.name);
  const architectName = useOrc3d((s) => s.architectName);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    const msg: ChatMessage = {
      id: uid(),
      author,
      authorName: author === "cliente" ? clientName || "Cliente" : architectName || "Arquiteto",
      text: t.slice(0, 600),
      at: new Date().toISOString(),
    };
    actions.addChat(msg);
    getActiveSession()?.publishChat(msg);
    if (attendanceId) appendMessage(attendanceId, msg);
    setText("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-muted">
            Converse com o especialista sobre o seu projeto.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.author === author ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                m.author === author ? "bg-champagne/20 text-text" : "bg-surfaceSoft text-text"
              }`}
            >
              <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted">{m.authorName}</p>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t border-champagne/10 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escreva uma mensagem…"
          className="flex-1 rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
        />
        <Btn variant="primary" size="sm" onClick={send}>Enviar</Btn>
      </div>
    </div>
  );
}
