/* ============================================================
   realtimeNet — transporte de tempo real sobre WebSocket nativo.
   Pub/sub por tópico + estado retido, com reconexão automática.

   É o MESMO relay e o MESMO protocolo do site público
   (marcenaria-corporativa/src/features/orcamento3d/net.ts), para
   que o ARQUITETO (neste CRM) entre exatamente na mesma sala do
   LEAD (no site) e os dois se enxerguem em tempo real.

   URL: VITE_COLLAB_WS_URL ou, por padrão, o relay na nuvem (Render).
   Em produção (Vercel) precisa que o CSP libere esse wss — ver
   client/vercel.json e vercel.json (connect-src).
   ============================================================ */

type Handler = (data: any) => void;

// Relay na nuvem (Render) — o mesmo que o site usa. É o que faz o lead
// (num device) e o arquiteto (noutro) se acharem pela internet.
const CLOUD_RELAY = "wss://linear-realtime-relay.onrender.com";

function isLanHost(host: string): boolean {
  return /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(host);
}
function isLanUrl(u: string): boolean {
  try {
    return isLanHost(new URL(u).hostname);
  } catch {
    return false;
  }
}

function resolveUrl(): string {
  const env = ((import.meta as any).env?.VITE_COLLAB_WS_URL as string | undefined)?.trim();
  const onLan = typeof window !== "undefined" && isLanHost(window.location.hostname);

  // Um env apontando para rede local é inútil num domínio público; nesse caso
  // ignora o env e cai no relay da nuvem. Fora isso, respeita o env.
  if (env && !(isLanUrl(env) && !onLan)) return env;

  if (typeof window === "undefined") return "";
  if (!onLan) return CLOUD_RELAY; // produção: relay na nuvem
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.hostname}:8787`; // dev local
}

const URL_WS = resolveUrl();
let ws: WebSocket | null = null;
let connected = false;
let everConnected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wanted = false;

const msgSubs = new Map<string, Set<Handler>>();
const stateSubs = new Map<string, Set<Handler>>();
const outbox: string[] = [];

function emitStatus() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("orc3d:net", { detail: { connected } }));
}

function send(obj: unknown) {
  const str = JSON.stringify(obj);
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(str);
  else outbox.push(str);
}

function flush() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  while (outbox.length) ws.send(outbox.shift()!);
}

function scheduleReconnect() {
  if (reconnectTimer || !wanted) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    open();
  }, 2000);
}

function open() {
  if (ws || !URL_WS || !wanted) return;
  try {
    ws = new WebSocket(URL_WS);
  } catch {
    scheduleReconnect();
    return;
  }
  ws.onopen = () => {
    connected = true;
    everConnected = true;
    new Set([...msgSubs.keys(), ...stateSubs.keys()]).forEach((t) => send({ t: "sub", topic: t }));
    flush();
    emitStatus();
  };
  ws.onmessage = (ev) => {
    let m: any;
    try {
      m = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (m.t === "msg") msgSubs.get(m.topic)?.forEach((h) => h(m.data));
    else if (m.t === "state") stateSubs.get(m.topic)?.forEach((h) => h(m.data));
  };
  ws.onclose = () => {
    connected = false;
    ws = null;
    emitStatus();
    scheduleReconnect();
  };
  ws.onerror = () => {
    try {
      ws?.close();
    } catch {
      /* noop */
    }
  };
}

/** Liga o transporte (idempotente). Chamar ao entrar na sessão. */
export function connectNet() {
  if (!URL_WS) return;
  wanted = true;
  open();
}

export function netConfigured(): boolean {
  return !!URL_WS;
}
export function netConnected(): boolean {
  return connected;
}
export function netEverConnected(): boolean {
  return everConnected;
}

export function subscribe(topic: string, onMsg: Handler): () => void {
  connectNet();
  const already = msgSubs.has(topic) || stateSubs.has(topic);
  if (!msgSubs.has(topic)) msgSubs.set(topic, new Set());
  msgSubs.get(topic)!.add(onMsg);
  if (!already) send({ t: "sub", topic });
  return () => {
    const set = msgSubs.get(topic);
    set?.delete(onMsg);
    if (set && set.size === 0) {
      msgSubs.delete(topic);
      if (!stateSubs.has(topic)) send({ t: "unsub", topic });
    }
  };
}

export function publish(topic: string, data: unknown) {
  connectNet();
  send({ t: "pub", topic, data });
}
