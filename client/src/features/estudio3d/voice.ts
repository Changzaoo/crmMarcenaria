/* ============================================================
   voice — chat por voz entre cliente e arquiteto (WebRTC).
   Sinalização trafega pela sessão de colaboração (BroadcastChannel
   entre abas; trocável por servidor depois). Áudio P2P direto.
   ============================================================ */
import { createStore, useStore } from "../../lib/tinyStore";
import {
  getActiveSession,
  myPeerId,
  type CollabMessage,
} from "./collaboration";

interface VoiceState {
  available: boolean;
  inCall: boolean;
  muted: boolean;
  connected: boolean;
  peerCount: number;
  error: string | null;
}

export const voiceStore = createStore<VoiceState>({
  available: typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof RTCPeerConnection !== "undefined",
  inCall: false,
  muted: false,
  connected: false,
  peerCount: 0,
  error: null,
});

export function useVoice() {
  return useStore(voiceStore, (s) => s);
}

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

let localStream: MediaStream | null = null;
const pcs = new Map<string, RTCPeerConnection>();
const audios = new Map<string, HTMLAudioElement>();

function refresh() {
  let connected = false;
  pcs.forEach((pc) => {
    if (pc.connectionState === "connected") connected = true;
  });
  voiceStore.setState({ peerCount: pcs.size, connected });
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
    if (e.candidate) {
      getActiveSession()?.publish({
        type: "voice-ice",
        from: myPeerId,
        to: peerId,
        candidate: e.candidate.toJSON(),
      });
    }
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
  getActiveSession()?.publish({ type: "voice-offer", from: myPeerId, to: peerId, sdp });
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

/** Entra na chamada de voz (pede permissão do microfone). */
export async function startVoice() {
  const session = getActiveSession();
  if (!session) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    voiceStore.setState({ inCall: true, muted: false, error: null });
    // já existe conexão aberta? adiciona faixa. Senão, anuncia presença.
    pcs.forEach((pc) => localStream!.getTracks().forEach((t) => pc.addTrack(t, localStream!)));
    session.publish({ type: "voice-join", from: myPeerId });
  } catch (e) {
    voiceStore.setState({ error: "Não foi possível acessar o microfone." });
  }
}

/** Sai da chamada de voz. */
export function stopVoice() {
  getActiveSession()?.publish({ type: "voice-leave", from: myPeerId });
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  pcs.forEach((_, id) => closePeer(id));
  voiceStore.setState({ inCall: false, connected: false, peerCount: 0, muted: false });
}

export function toggleMute() {
  const muted = !voiceStore.getState().muted;
  localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  voiceStore.setState({ muted });
}

/** Processa sinalização recebida pelo canal de colaboração. */
export async function handleVoiceSignal(m: CollabMessage) {
  switch (m.type) {
    case "voice-join": {
      if (!voiceStore.getState().inCall) return; // só conecto se também estou na chamada
      if (m.from === myPeerId) return;
      // initiator determinístico evita "glare": o maior id faz a oferta.
      // Se eu sou o menor e ainda não temos conexão, re-anuncio minha
      // presença para que o maior (que pode ter entrado antes) me ofereça.
      if (myPeerId > m.from) {
        await offerTo(m.from);
      } else if (!pcs.has(m.from)) {
        getActiveSession()?.publish({ type: "voice-join", from: myPeerId });
      }
      break;
    }
    case "voice-offer": {
      if (m.to !== myPeerId) return;
      const pc = createPc(m.from);
      await pc.setRemoteDescription(m.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      getActiveSession()?.publish({ type: "voice-answer", from: myPeerId, to: m.from, sdp: answer });
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
