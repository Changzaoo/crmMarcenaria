import { useEffect } from "react";
import {
  openCollaboration,
  setActiveSession,
  myPeerId,
  type CollabSession,
} from "./collaboration";
import { actions, buildProject3D, isApplyingRemote, orc3dStore, useOrc3d } from "./useOrcamento3DStore";
import { prunePeers, removePeer, upsertPeer, presenceStore } from "./presence";
import { handleVoiceSignal, stopVoice } from "./voice";
import { toCrmProjectDoc } from "./crmPublicApi";
import { fromCrmProjectDoc } from "./crmDocSync";
import { dlog } from "./dlog";

/* Orquestra a colaboração em tempo real: doc-sync (eco-seguro),
   presença com heartbeat, chat e sinalização de voz. Sem UI.

   Dois canais de documento trafegam no mesmo tópico `collab:<projetoId>`:
   - "doc"     → schema NATIVO do site (usado pelo CRM embutido #/crm).
   - "syncdoc" → schema CANÔNICO do CRM externo (Project3DDoc). É a ponte
                 site ⇄ D:\crmMarcenaria. Ambos são publicados juntos para
                 manter os dois CRMs em sincronia. */
export default function CollabBridge() {
  const projectId = useOrc3d((s) => s.projectId);

  useEffect(() => {
    const session: CollabSession = openCollaboration(projectId);
    setActiveSession(session);
    dlog("3D_SESSION", "Lead/colab conectado:", { projectId, peerId: myPeerId, role: orc3dStore.getState().role });

    let lastSyncedJson = JSON.stringify(orc3dStore.getState().doc);
    let publishTimer: ReturnType<typeof setTimeout> | null = null;

    const publishLocalDoc = () => {
      const doc = orc3dStore.getState().doc;
      session.publishDoc(doc); // schema nativo (CRM embutido)
      try {
        session.publishSyncDoc(toCrmProjectDoc(buildProject3D())); // schema canônico (CRM externo)
      } catch (e) {
        dlog("REALTIME", "Falha ao serializar syncdoc:", e);
      }
      dlog("REALTIME", "Projeto publicado:", { furniture: doc.furniture.length });
    };

    // publica alterações locais do doc (debounce, sem eco)
    const unsub = orc3dStore.subscribe(() => {
      if (isApplyingRemote()) return;
      if (publishTimer) clearTimeout(publishTimer);
      publishTimer = setTimeout(() => {
        const json = JSON.stringify(orc3dStore.getState().doc);
        if (json === lastSyncedJson) return;
        lastSyncedJson = json;
        publishLocalDoc();
      }, 180);
    });

    // recebe mensagens do colaborador
    const off = session.onMessage((m) => {
      switch (m.type) {
        case "doc": {
          if (m.from === myPeerId) return;
          lastSyncedJson = JSON.stringify(m.doc);
          actions.applyRemoteDoc(m.doc as any);
          dlog("REALTIME", "Doc remoto aplicado (nativo) de", m.from);
          break;
        }
        case "syncdoc": {
          if (m.from === myPeerId) return;
          const merged = fromCrmProjectDoc(m.doc as any, orc3dStore.getState().doc);
          actions.applyRemoteDoc(merged);
          lastSyncedJson = JSON.stringify(orc3dStore.getState().doc);
          dlog("REALTIME", "Doc remoto aplicado (CRM) de", m.from);
          break;
        }
        case "syncdoc-request": {
          if (m.from !== myPeerId) publishLocalDoc();
          break;
        }
        case "chat": {
          const cur = orc3dStore.getState().chat;
          if (!cur.some((c) => c.id === m.message.id)) actions.addChat(m.message);
          break;
        }
        case "presence": {
          if (m.presence.id !== myPeerId) {
            const known = presenceStore.getState().peers[m.presence.id];
            upsertPeer(m.presence);
            if (!known) {
              dlog("REALTIME", "Participante entrou:", { id: m.presence.id, role: m.presence.role, name: m.presence.name });
              // semeia o recém-chegado com o doc autoritativo (cliente manda)
              if (orc3dStore.getState().role === "cliente") publishLocalDoc();
            }
          }
          break;
        }
        case "leave":
          dlog("REALTIME", "Participante saiu:", m.id);
          removePeer(m.id);
          break;
        default:
          if (m.type.startsWith("voice-")) handleVoiceSignal(m);
      }
    });

    // heartbeat de presença + limpeza de presenças paradas
    const beat = setInterval(() => {
      const s = orc3dStore.getState();
      session.publishPresence({
        id: myPeerId,
        role: s.role,
        name: s.role === "arquiteto" ? (s.architectName || "Arquiteto") : s.doc.client.name || "Cliente",
        at: Date.now(),
      });
      prunePeers();
    }, 2500);

    return () => {
      clearInterval(beat);
      if (publishTimer) clearTimeout(publishTimer);
      unsub();
      off();
      stopVoice();
      session.close();
      setActiveSession(null);
      presenceStore.setState({ peers: {} });
      dlog("3D_SESSION", "Colab encerrada:", { projectId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return null;
}
