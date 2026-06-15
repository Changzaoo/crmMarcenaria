/* Presença de participantes remotos (cursor no piso, nome, papel).
   Atualizada pelo CollabBridge; lida pela cena e pela barra de presença. */
import { createStore, useStore } from "../../lib/tinyStore";
import { useMemo } from "react";
import { getActiveSession, myPeerId, type Presence } from "./collaboration";
import { orc3dStore } from "./useOrcamento3DStore";

interface PresenceState {
  peers: Record<string, Presence>;
}

export const presenceStore = createStore<PresenceState>({ peers: {} });

export function upsertPeer(p: Presence) {
  presenceStore.setState((s) => {
    const prev = s.peers[p.id];
    // heartbeat sem cursor não deve apagar o último cursor conhecido
    const cursor = p.cursor ?? prev?.cursor;
    return { peers: { ...s.peers, [p.id]: { ...p, cursor } } };
  });
}

export function removePeer(id: string) {
  presenceStore.setState((s) => {
    const peers = { ...s.peers };
    delete peers[id];
    return { peers };
  });
}

/** Remove presenças paradas há mais de 6s. */
export function prunePeers() {
  const now = Date.now();
  presenceStore.setState((s) => {
    const peers = Object.fromEntries(
      Object.entries(s.peers).filter(([, p]) => now - p.at < 6000)
    );
    return { peers };
  });
}

export function usePeers(): Presence[] {
  const peersMap = useStore(presenceStore, (s) => s.peers);
  return useMemo(() => Object.values(peersMap), [peersMap]);
}

/* Publica o cursor (posição no piso) com throttle ~20fps. */
let lastSent = 0;
export function publishCursor(x: number, z: number, floor = 0, ry = 0, moving = false) {
  const now = Date.now();
  if (now - lastSent < 50) return;
  lastSent = now;
  const session = getActiveSession();
  if (!session) return;
  const s = orc3dStore.getState();
  session.publishPresence({
    id: myPeerId,
    role: s.role,
    name: s.role === "arquiteto" ? (s.architectName || "Arquiteto") : s.doc.client.name || "Cliente",
    cursor: { x, z, floor, ry, moving },
    at: now,
  });
}
