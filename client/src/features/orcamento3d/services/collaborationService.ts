import { api } from "../../../lib/api";
import type { Project3DDoc, Role, SessionState } from "../types";

// Cliente de colaboração por polling REST. Desenhado para trocar por WebSocket
// no futuro mantendo a mesma interface (start/stop/pushDoc/updateSelf).

export interface CollabOptions {
  projetoId: string;
  peerId: string;
  role: Role;
  nome: string;
  color?: string;
  onState: (state: SessionState) => void;
  intervaloMs?: number;
}

export class CollaborationSession {
  private opts: CollabOptions;
  private timer: ReturnType<typeof setInterval> | null = null;
  private self = { x: 0, z: 0, ry: 0 };
  private lastDocRev = -1;
  private active = false;

  constructor(opts: CollabOptions) {
    this.opts = opts;
  }

  start() {
    if (this.active) return;
    this.active = true;
    const tick = () => void this.beat();
    tick();
    this.timer = setInterval(tick, this.opts.intervaloMs ?? 1000);
  }

  private async beat() {
    try {
      const state = await api.post<SessionState>(`/public/sessao/${this.opts.projetoId}/heartbeat`, {
        peerId: this.opts.peerId,
        role: this.opts.role,
        nome: this.opts.nome,
        color: this.opts.color,
        x: this.self.x,
        z: this.self.z,
        ry: this.self.ry,
      });
      this.lastDocRev = state.docRev;
      this.opts.onState(state);
    } catch {
      /* silencioso — relay é best-effort */
    }
  }

  // Atualiza a posição do próprio avatar (enviada no próximo heartbeat).
  updateSelf(x: number, z: number, ry: number) {
    this.self = { x, z, ry };
  }

  // Publica o documento para os outros participantes. Retorna o docRev para o
  // chamador conseguir ignorar o próprio eco. seed=true semeia a sessão (só grava
  // se ainda não houver documento no relay) — usado por quem entra na sessão.
  async pushDoc(
    doc: Project3DDoc,
    opts?: { seed?: boolean }
  ): Promise<{ docRev: number; seeded: boolean } | null> {
    try {
      return await api.post(`/public/sessao/${this.opts.projetoId}/doc`, {
        doc,
        seed: opts?.seed ?? false,
      });
    } catch {
      return null;
    }
  }

  async stop() {
    this.active = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    try {
      await api.post(`/public/sessao/${this.opts.projetoId}/leave`, { peerId: this.opts.peerId });
    } catch {
      /* ignore */
    }
  }
}
