import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ChatMessage, Role } from "../types";

/* Chat por texto do ambiente — cliente ⇄ arquiteto (mesmo do site). */
export default function ChatPanel({
  messages,
  author,
  onSend,
}: {
  messages: ChatMessage[];
  author: Role;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t.slice(0, 600));
    setText("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted py-6">
            Converse por aqui com {author === "arquiteto" ? "o cliente" : "o arquiteto"}.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.author === author;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                  mine ? "bg-champagne/20 text-text" : "bg-surfaceSoft border border-white/10 text-text"
                }`}
              >
                {!mine && <div className="text-[10px] text-champagne/80 mb-0.5">{m.authorName}</div>}
                <div className="leading-snug">{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-white/5 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escreva uma mensagem…"
          className="input flex-1"
          maxLength={600}
        />
        <button onClick={send} className="btn-primary px-3 py-2" title="Enviar">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
