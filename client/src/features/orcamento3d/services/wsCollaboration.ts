/* ============================================================
   wsCollaboration — sessão colaborativa cliente ⇄ arquiteto sobre
   o MESMO relay WebSocket e o MESMO protocolo do site público.

   Substitui o relay REST por polling (collaborationService.ts), que
   era single-instance e NÃO funcionava entre o site (relay na nuvem)
   e o CRM (servidor próprio). Agora os dois falam o tópico
   `collab:<projetoId>` no mesmo relay, então o arquiteto entra
   exatamente na sala do lead.

   Protocolo (idêntico ao site):
   - presence : { id, role, name, cursor:{x,z,floor,ry,moving}, at }
   - syncdoc  : { doc:<Project3DDoc>, from, ts }   ← documento canônico
   - chat     : { message }
   - leave    : { id }

   Mantém a interface do antigo CollaborationSession
   (start/stop/pushDoc/updateSelf + onState) para minimizar mudanças
   no StudioShell.
   ============================================================ */
import type { Project3DDoc, Role, SessionState, Peer } from "../types";
import { connectNet, netConnected, publish, subscribe } from "./realtimeNet";

export const myPeerId =
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

interface Presence {
  id: string;
  role: Role;
  name: string;
  color?: string | null;
  cursor?: { x: number; z: number; floor?: number; ry?: number; moving?: boolean };
  at: number;
}

// Mensagens que ESTE cliente envia (schema idêntico ao do site).
type OutMsg =
  | { type: "presence"; presence: Presence }
  | { type: "syncdoc"; doc: Project3DDoc; from: string; ts: number }
  | { type: "syncdoc-request"; from: string; ts: number }
  | { type: "leave"; id: string };

export interface WsCollabOptions {
  projetoId: string;
  role: Role;
  nome: string;
  color?: string;
  onState: (state: SessionState) => void;
  onRemoteDoc?: (doc: Project3DDoc) => void;
  intervaloMs?: number;
}

const mid = () => Math.random().toString(36).slice(2, 12);
const PEER_TTL = 6500;

export class WsCollaborationSession {
  private opts: WsCollabOptions;
  private topic: string;
  private peers = new Map<string, Presence>();
  private self = { x: 0, z: 0, ry: 0, floor: 0, moving: false };
  private doc: Project3DDoc | null = null;
  private docRev = 0;
  private off: (() => void) | null = null;
  private beat: ReturnType<typeof setInterval> | null = null;
  private lastSelfSent = 0;
  private seen = new Set<string>();
  private seenQ: string[] = [];

  constructor(opts: WsCollabOptions) {
    this.opts = opts;
    this.topic = `collab:${opts.projetoId}`;
  }

  start(initialDoc?: Project3DDoc) {
    if (initialDoc) this.doc = initialDoc;
    connectNet();
    this.off = subscribe(this.topic, (d) => this.receive(d));
    // anuncia presença já e mantém heartbeat
    this.publishPresence();
    this.requestDoc();
    this.emit();
    this.beat = setInterval(() => {
      this.publishPresence();
      this.prune();
    }, this.opts.intervaloMs ?? 2500);
  }

  private markSeen(id: string) {
    this.seen.add(id);
    this.seenQ.push(id);
    if (this.seenQ.length > 500) this.seen.delete(this.seenQ.shift()!);
  }

  private send(m: OutMsg) {
    const _mid = mid();
    this.markSeen(_mid);
    publish(this.topic, { ...m, _mid });
  }

  private requestDoc() {
    this.send({ type: "syncdoc-request", from: myPeerId, ts: Date.now() });
  }

  private receive(w: any) {
    if (w?._mid) {
      if (this.seen.has(w._mid)) return;
      this.markSeen(w._mid);
    }
    switch (w?.type) {
      case "presence": {
        const p = w.presence as Presence;
        if (!p || p.id === myPeerId) return;
        const prev = this.peers.get(p.id);
        this.peers.set(p.id, { ...p, cursor: p.cursor ?? prev?.cursor });
        this.emit();
        break;
      }
      case "syncdoc": {
        if (w.from === myPeerId) return;
        this.doc = w.doc as Project3DDoc;
        this.docRev++;
        this.opts.onRemoteDoc?.(this.doc);
        this.emit();
        break;
      }
      case "syncdoc-request": {
        if (w.from !== myPeerId && this.doc) {
          this.send({ type: "syncdoc", doc: this.doc, from: myPeerId, ts: Date.now() });
        }
        break;
      }
      case "leave": {
        if (typeof w.id === "string" && this.peers.delete(w.id)) this.emit();
        break;
      }
      default:
        break; // doc nativo do site / voz: ignorado no CRM
    }
  }

  private prune() {
    const now = Date.now();
    let changed = false;
    for (const [id, p] of this.peers) {
      if (now - p.at > PEER_TTL) {
        this.peers.delete(id);
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  private publishPresence() {
    this.send({
      type: "presence",
      presence: {
        id: myPeerId,
        role: this.opts.role,
        name: this.opts.nome,
        color: this.opts.color ?? null,
        cursor: { x: this.self.x, z: this.self.z, floor: this.self.floor, ry: this.self.ry, moving: this.self.moving },
        at: Date.now(),
      },
    });
  }

  private toPeers(): Peer[] {
    const list: Peer[] = [];
    // inclui o próprio (o ThreeDScene filtra pelo selfPeerId) + remotos
    for (const p of this.peers.values()) {
      list.push({
        peerId: p.id,
        role: p.role,
        nome: p.name,
        x: p.cursor?.x ?? 0,
        z: p.cursor?.z ?? 0,
        ry: p.cursor?.ry ?? 0,
        floor: p.cursor?.floor ?? 0,
        moving: !!p.cursor?.moving,
        color: p.color ?? null,
        online: true,
      });
    }
    return list;
  }

  private emit() {
    const peers = this.toPeers();
    const state: SessionState = {
      rev: Date.now(),
      docRev: this.docRev,
      doc: this.doc,
      peers,
      arquitetoOnline:
        this.opts.role === "arquiteto" || peers.some((p) => p.role === "arquiteto"),
      clienteOnline:
        this.opts.role === "cliente" || peers.some((p) => p.role === "cliente"),
    };
    this.opts.onState(state);
  }

  /** Posição/rotação do próprio avatar — enviada na presença (throttle). */
  updateSelf(x: number, z: number, ry: number) {
    this.self.x = x;
    this.self.z = z;
    this.self.ry = ry;
    const now = Date.now();
    if (now - this.lastSelfSent < 90) return;
    this.lastSelfSent = now;
    this.publishPresence();
  }

  setFloor(floor: number) {
    this.self.floor = floor;
  }
  setMoving(moving: boolean) {
    this.self.moving = moving;
  }

  /** Publica o documento (schema canônico Project3DDoc) para a sala. */
  pushDoc(doc: Project3DDoc): { docRev: number } {
    this.doc = doc;
    this.docRev++;
    this.send({ type: "syncdoc", doc, from: myPeerId, ts: Date.now() });
    return { docRev: this.docRev };
  }

  connected() {
    return netConnected();
  }

  stop() {
    this.send({ type: "leave", id: myPeerId });
    if (this.beat) clearInterval(this.beat);
    this.beat = null;
    this.off?.();
    this.off = null;
    this.peers.clear();
  }
}
