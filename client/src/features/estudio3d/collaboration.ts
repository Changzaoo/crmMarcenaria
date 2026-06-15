/* ============================================================
   collaboration — sessão compartilhada cliente + arquiteto.
   Transporte unificado: envia por WebSocket (entre dispositivos)
   E por BroadcastChannel (abas locais), com dedupe por id de
   mensagem para nada chegar em dobro. Sem servidor no ar, o
   BroadcastChannel garante o funcionamento local.
   ============================================================ */
import type { ChatMessage } from "./types";
import { publish as netPublish, subscribe as netSubscribe, connectNet } from "./net";

/** Id único deste participante (aba/dispositivo). */
export const myPeerId =
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export type Role = "cliente" | "arquiteto";

export interface Presence {
  id: string;
  role: Role;
  name: string;
  cursor?: { x: number; z: number; floor?: number; ry?: number; moving?: boolean };
  at: number;
}

export type CollabMessage =
  | { type: "doc"; doc: unknown; from: string; ts: number }
  // doc no schema CANÔNICO do CRM (Project3DDoc) — ponte site ⇄ CRM externo.
  | { type: "syncdoc"; doc: unknown; from: string; ts: number }
  | { type: "syncdoc-request"; from: string; ts: number }
  | { type: "chat"; message: ChatMessage }
  | { type: "presence"; presence: Presence }
  | { type: "leave"; id: string }
  | { type: "voice-join"; from: string }
  | { type: "voice-leave"; from: string }
  | { type: "voice-offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "voice-answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "voice-ice"; from: string; to: string; candidate: RTCIceCandidateInit };

type Wire = CollabMessage & { _mid?: string };

export interface CollabSession {
  id: string;
  publish: (m: CollabMessage) => void;
  publishDoc: (doc: unknown) => void;
  publishSyncDoc: (doc: unknown) => void;
  publishChat: (message: ChatMessage) => void;
  publishPresence: (presence: Presence) => void;
  onMessage: (cb: (m: CollabMessage) => void) => () => void;
  close: () => void;
}

let active: CollabSession | null = null;
export const getActiveSession = () => active;
export const setActiveSession = (s: CollabSession | null) => {
  active = s;
};

const mid = () => Math.random().toString(36).slice(2, 12);

/** Abre uma sessão colaborativa para um projeto. */
export function openCollaboration(projectId: string): CollabSession {
  connectNet();
  const topic = `collab:${projectId}`;
  const bc =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`linear-collab-${projectId}`) : null;

  const listeners = new Set<(m: CollabMessage) => void>();
  const seen = new Set<string>();
  const seenQ: string[] = [];

  function markSeen(id: string) {
    seen.add(id);
    seenQ.push(id);
    if (seenQ.length > 600) seen.delete(seenQ.shift()!);
  }

  function deliver(w: Wire) {
    if (w?._mid) {
      if (seen.has(w._mid)) return; // já visto (chegou pelos dois canais)
      markSeen(w._mid);
    }
    listeners.forEach((l) => l(w as CollabMessage));
  }

  const offNet = netSubscribe(topic, (d) => deliver(d as Wire));
  if (bc) bc.onmessage = (ev) => deliver(ev.data as Wire);

  function publish(m: CollabMessage) {
    const w: Wire = { ...m, _mid: mid() };
    markSeen(w._mid!); // nunca processo meu próprio eco
    netPublish(topic, w);
    bc?.postMessage(w);
  }

  return {
    id: myPeerId,
    publish,
    publishDoc: (doc) => publish({ type: "doc", doc, from: myPeerId, ts: Date.now() }),
    publishSyncDoc: (doc) => publish({ type: "syncdoc", doc, from: myPeerId, ts: Date.now() }),
    publishChat: (message) => publish({ type: "chat", message }),
    publishPresence: (presence) => publish({ type: "presence", presence }),
    onMessage: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    close: () => {
      publish({ type: "leave", id: myPeerId });
      publish({ type: "voice-leave", from: myPeerId });
      offNet();
      listeners.clear();
      bc?.close();
    },
  };
}
