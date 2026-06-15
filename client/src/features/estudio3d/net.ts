/* ============================================================
   net — transporte de tempo real sobre WebSocket nativo.
   Pub/sub por tópico + estado retido, com reconexão automática.
   Usado pela colaboração 3D e pelo CRM para sincronizar entre
   DISPOSITIVOS diferentes (cliente num device, arquiteto noutro).

   URL: VITE_COLLAB_WS_URL ou, por padrão, mesmo host na porta 8787
   (assim o celular que abre o site pelo IP do PC já acha o servidor).
   Sem servidor no ar, fica offline e as camadas caem no fallback local.
   ============================================================ */

type Handler = (data: any) => void;

// Relay na nuvem (Render) — usado em produção quando não há env apontando
// para outro servidor. É o que faz o cliente (num device) e o arquiteto
// (noutro) se acharem pela internet, fora da rede local.
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
  const env = import.meta.env?.VITE_COLLAB_WS_URL?.trim();
  const onLan = typeof window !== "undefined" && isLanHost(window.location.hostname);

  // Um env apontando para rede local (ex.: ws://192.168.x.x:8787) é inútil num
  // domínio público — foi exatamente o que quebrou o deploy. Nesse caso ignora
  // o env e cai no relay da nuvem. Fora isso, respeita o env.
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
let wanted = false; // alguém pediu conexão

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
    // reinscreve nos tópicos ativos e descarrega a fila
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

/** Liga o transporte (idempotente). Chamar ao entrar no estúdio/CRM. */
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
/** Já conectou alguma vez nesta sessão (indica que há servidor). */
export function netEverConnected(): boolean {
  return everConnected;
}

export function subscribe(topic: string, onMsg: Handler): () => void {
  connectNet();
  const alreadySubscribed = msgSubs.has(topic) || stateSubs.has(topic);
  if (!msgSubs.has(topic)) msgSubs.set(topic, new Set());
  msgSubs.get(topic)!.add(onMsg);
  if (!alreadySubscribed) send({ t: "sub", topic });
  return () => {
    const set = msgSubs.get(topic);
    set?.delete(onMsg);
    if (set && set.size === 0) {
      msgSubs.delete(topic);
      if (!stateSubs.has(topic)) send({ t: "unsub", topic });
    }
  };
}

export function subscribeState(topic: string, onState: Handler): () => void {
  connectNet();
  const alreadySubscribed = msgSubs.has(topic) || stateSubs.has(topic);
  if (!stateSubs.has(topic)) stateSubs.set(topic, new Set());
  stateSubs.get(topic)!.add(onState);
  if (!alreadySubscribed) send({ t: "sub", topic });
  return () => {
    const set = stateSubs.get(topic);
    set?.delete(onState);
    if (set && set.size === 0) {
      stateSubs.delete(topic);
      if (!msgSubs.has(topic)) send({ t: "unsub", topic });
    }
  };
}

export function publish(topic: string, data: unknown) {
  connectNet();
  send({ t: "pub", topic, data });
}

export function setState(topic: string, data: unknown) {
  connectNet();
  send({ t: "state:set", topic, data });
}

export function getState(topic: string) {
  connectNet();
  send({ t: "state:get", topic });
}
