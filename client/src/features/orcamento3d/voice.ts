/* ============================================================
   voice — chat por voz (WebRTC) cliente ⇄ arquiteto.
   Sinalização pelo MESMO relay/tópico da colaboração
   (`collab:<projetoId>`) e MESMO formato de mensagens do site
   público, então a voz funciona inclusive entre o CRM e o site.
   ============================================================ */
import { useSyncExternalStore } from "react";
import { connectNet, publish, subscribe } from "./services/realtimeNet";
import { myPeerId } from "./services/wsCollaboration";

interface VoiceState {
  available: boolean;
  inCall: boolean;
  muted: boolean;
  connected: boolean;
  peerCount: number;
  error: string | null;
}

let state: VoiceState = {
  available: typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof RTCPeerConnection !== "undefined",
  inCall: false,
  muted: false,
  connected: false,
  peerCount: 0,
  error: null,
};

const listeners = new Set<() => void>();
function setState(patch: Partial<VoiceState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function useVoice(): VoiceState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state
  );
}

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

let topic = "";
let off: (() => void) | null = null;
let localStream: MediaStream | null = null;
const pcs = new Map<string, RTCPeerConnection>();
const audios = new Map<string, HTMLAudioElement>();

type Msg =
  | { type: "voice-join"; from: string }
  | { type: "voice-leave"; from: string }
  | { type: "voice-offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "voice-answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "voice-ice"; from: string; to: string; candidate: RTCIceCandidateInit };

function emit(m: Msg) {
  if (topic) publish(topic, m);
}

function refresh() {
  let connected = false;
  pcs.forEach((pc) => {
    if (pc.connectionState === "connected") connected = true;
  });
  setState({ peerCount: pcs.size, connected });
}

function getAudioEl(peerId: string): HTMLAudioElement {
  let el = audios.get(peerId);
  if (!el) {
    el = document.createElement("audio");
    el.autoplay = true;
    el.dataset.voicePeer = peerId;
    document.body.appendChild(el);
    audios.set(peerId, el);
  }
  return el;
}

function createPc(peerId: string): RTCPeerConnection {
  let pc = pcs.get(peerId);
  if (pc) return pc;
  pc = new RTCPeerConnection(ICE);
  if (localStream) localStream.getTracks().forEach((t) => pc!.addTrack(t, localStream!));
  pc.onicecandidate = (e) => {
    if (e.candidate) emit({ type: "voice-ice", from: myPeerId, to: peerId, candidate: e.candidate.toJSON() });
  };
  pc.ontrack = (e) => {
    getAudioEl(peerId).srcObject = e.streams[0];
    refresh();
  };
  pc.onconnectionstatechange = () => {
    if (pc!.connectionState === "failed" || pc!.connectionState === "disconnected") closePeer(peerId);
    refresh();
  };
  pcs.set(peerId, pc);
  refresh();
  return pc;
}

async function offerTo(peerId: string) {
  const pc = createPc(peerId);
  const sdp = await pc.createOffer();
  await pc.setLocalDescription(sdp);
  emit({ type: "voice-offer", from: myPeerId, to: peerId, sdp });
}

function closePeer(peerId: string) {
  pcs.get(peerId)?.close();
  pcs.delete(peerId);
  const el = audios.get(peerId);
  if (el) {
    el.srcObject = null;
    el.remove();
    audios.delete(peerId);
  }
  refresh();
}

async function handle(m: any) {
  if (!m || typeof m.type !== "string" || !m.type.startsWith("voice-")) return;
  switch (m.type as Msg["type"]) {
    case "voice-join": {
      if (!state.inCall || m.from === myPeerId) return;
      if (myPeerId > m.from) await offerTo(m.from);
      else if (!pcs.has(m.from)) emit({ type: "voice-join", from: myPeerId });
      break;
    }
    case "voice-offer": {
      if (m.to !== myPeerId) return;
      const pc = createPc(m.from);
      await pc.setRemoteDescription(m.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emit({ type: "voice-answer", from: myPeerId, to: m.from, sdp: answer });
      break;
    }
    case "voice-answer": {
      if (m.to !== myPeerId) return;
      await pcs.get(m.from)?.setRemoteDescription(m.sdp);
      break;
    }
    case "voice-ice": {
      if (m.to !== myPeerId) return;
      try {
        await pcs.get(m.from)?.addIceCandidate(m.candidate);
      } catch {
        /* candidato fora de ordem */
      }
      break;
    }
    case "voice-leave": {
      closePeer(m.from);
      break;
    }
  }
}

/** Liga a sinalização de voz à sala (chamar ao montar o estúdio). */
export function initVoice(projetoId: string) {
  topic = `collab:${projetoId}`;
  connectNet();
  off?.();
  off = subscribe(topic, handle);
}

export function disposeVoice() {
  stopVoice();
  off?.();
  off = null;
  topic = "";
}

export async function startVoice() {
  if (!topic) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    setState({ inCall: true, muted: false, error: null });
    pcs.forEach((pc) => localStream!.getTracks().forEach((t) => pc.addTrack(t, localStream!)));
    emit({ type: "voice-join", from: myPeerId });
  } catch {
    setState({ error: "Não foi possível acessar o microfone." });
  }
}

export function stopVoice() {
  emit({ type: "voice-leave", from: myPeerId });
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  pcs.forEach((_, id) => closePeer(id));
  setState({ inCall: false, connected: false, peerCount: 0, muted: false });
}

export function toggleMute() {
  const muted = !state.muted;
  localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  setState({ muted });
}

export function voiceError() {
  return state.error;
}
