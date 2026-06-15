/* ============================================================
   crmBridge — ponte entre o Orçamento 3D e o CRM.
   Fonte de dados: servidor de tempo real (tópico "crm" com estado
   retido) quando disponível → o arquiteto vê os leads em OUTRO
   dispositivo. Sem servidor, cai em localStorage + evento storage
   (sincroniza abas da mesma máquina). API pública estável.
   ============================================================ */
import type {
  Attendance,
  Project3D,
  Architect,
  ArchitectStatus,
  ProjectStatus,
  ChatMessage,
} from "./types";
import {
  connectNet,
  netConnected,
  publish as netPublish,
  subscribe as netSubscribe,
  subscribeState,
  getState,
  setState,
} from "./net";

const ATT_KEY = "crm:attendances:v1";
const ARCH_KEY = "crm:architects:v1";
const CRM_TOPIC = "crm";

export type CrmEvent =
  | { type: "attendance-created"; attendance: Attendance }
  | { type: "attendance-updated"; attendance: Attendance }
  | { type: "architects-updated"; architects: Architect[] }
  | { type: "notify-architects"; attendance: Attendance }
  | { type: "sync" };

const listeners = new Set<(e: CrmEvent) => void>();

/** Notifica apenas os ouvintes locais (no mesmo processo). */
function emit(e: CrmEvent) {
  listeners.forEach((l) => l(e));
}

export function onCrmEvent(cb: (e: CrmEvent) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* ---------- cache local (também é o fallback offline) ---------- */
function readAtt(): Attendance[] {
  try {
    return JSON.parse(localStorage.getItem(ATT_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeAtt(list: Attendance[]) {
  try {
    localStorage.setItem(ATT_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

const SEED_UPDATED_AT = "2024-01-01T00:00:00.000Z";
const SEED_ARCHITECTS: Architect[] = [
  { id: "arq-1", name: "Marina Álvares", status: "disponivel", updatedAt: SEED_UPDATED_AT },
  { id: "arq-2", name: "Rafael Nogueira", status: "ausente", updatedAt: SEED_UPDATED_AT },
];

export function listArchitects(): Architect[] {
  try {
    const raw = localStorage.getItem(ARCH_KEY);
    if (!raw) {
      localStorage.setItem(ARCH_KEY, JSON.stringify(SEED_ARCHITECTS));
      return SEED_ARCHITECTS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_ARCHITECTS;
  }
}
function writeArchitects(list: Architect[]) {
  try {
    localStorage.setItem(ARCH_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

/* ---------- sincronização em rede ---------- */
let synced = false;
let applyingRemote = false;

type CrmState = { attendances: Attendance[]; architects: Architect[] };

function currentState(): CrmState {
  return { attendances: readAtt(), architects: listArchitects() };
}

function mergeByUpdatedAt<T extends { id: string; updatedAt?: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  local.forEach((item) => byId.set(item.id, item));
  remote.forEach((item) => {
    const cur = byId.get(item.id);
    if (!cur || (item.updatedAt ?? "") >= (cur.updatedAt ?? "")) byId.set(item.id, item);
  });
  return Array.from(byId.values());
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Empurra o estado completo para o servidor (vira fonte para outros devices). */
function pushState() {
  if (!netConnected()) return;
  setState(CRM_TOPIC, currentState());
}

/** Liga a sincronização (idempotente). Chamado pelo estúdio e pelo CRM. */
export function initCrmSync() {
  if (synced) return;
  synced = true;
  connectNet();

  subscribeState(CRM_TOPIC, (data: any) => {
    if (!data) {
      pushState();
      return;
    }
    const local = currentState();
    const next: CrmState = {
      attendances: Array.isArray(data.attendances)
        ? mergeByUpdatedAt(local.attendances, data.attendances)
        : local.attendances,
      architects: Array.isArray(data.architects)
        ? mergeByUpdatedAt(local.architects, data.architects)
        : local.architects,
    };
    applyingRemote = true;
    writeAtt(next.attendances);
    writeArchitects(next.architects);
    applyingRemote = false;
    emit({ type: "sync" });
    if (!sameJson(next, data)) pushState();
  });

  netSubscribe(CRM_TOPIC, (data: any) => {
    if (data?.kind === "notify" && data.attendance) {
      const list = readAtt();
      if (!list.some((a) => a.id === data.attendance.id)) writeAtt([data.attendance, ...list]);
      emit({ type: "notify-architects", attendance: data.attendance });
    }
  });

  getState(CRM_TOPIC); // hidrata ao conectar

  // fallback offline: abas da mesma máquina via evento storage
  if (typeof window !== "undefined") {
    window.addEventListener("orc3d:net", (e) => {
      if ((e as CustomEvent).detail?.connected) getState(CRM_TOPIC);
    });
    window.addEventListener("storage", (e) => {
      if (netConnected()) return;
      if (e.key === ATT_KEY || e.key === ARCH_KEY) emit({ type: "sync" });
    });
  }
}

/* ---------- leitura ---------- */
export function availableArchitects(): Architect[] {
  return listArchitects().filter((a) => a.status === "disponivel");
}
export function listAttendances(): Attendance[] {
  return readAtt().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
export function getAttendance(id: string): Attendance | undefined {
  return readAtt().find((a) => a.id === id);
}
export function netReady(): boolean {
  return netConnected();
}

/* ---------- API pública (assinaturas da spec) ---------- */
export function create3DAttendance(project: Project3D): Attendance {
  initCrmSync();
  const list = readAtt();
  const now = new Date().toISOString();
  const existing = list.find((a) => a.project.id === project.id);
  const att: Attendance = existing
    ? { ...existing, project, status: project.status, updatedAt: now }
    : {
        id: `att-${Math.random().toString(36).slice(2, 9)}`,
        project,
        status: project.assistedByArchitect ? "aguardando-arquiteto" : project.status,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
  const next = existing ? list.map((a) => (a.id === att.id ? att : a)) : [att, ...list];
  writeAtt(next);
  emit({ type: existing ? "attendance-updated" : "attendance-created", attendance: att });
  pushState();
  return att;
}

export function update3DAttendance(id: string, data: Partial<Attendance>): Attendance | undefined {
  const list = readAtt();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  const att = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
  list[idx] = att;
  writeAtt(list);
  emit({ type: "attendance-updated", attendance: att });
  if (!applyingRemote) pushState();
  return att;
}

export function setAttendanceStatus(id: string, status: ProjectStatus): Attendance | undefined {
  return update3DAttendance(id, { status });
}

export function notifyAvailableArchitects(project: Project3D): { notified: boolean; count: number; attendance: Attendance } {
  const attendance = create3DAttendance({ ...project, assistedByArchitect: true });
  const avail = availableArchitects();
  emit({ type: "notify-architects", attendance });
  if (netConnected()) netPublish(CRM_TOPIC, { kind: "notify", attendance });
  return { notified: avail.length > 0, count: avail.length, attendance };
}

export function assignArchitect(attendanceId: string, architectId: string): Attendance | undefined {
  const arch = listArchitects().find((a) => a.id === architectId);
  return update3DAttendance(attendanceId, {
    architectId,
    architectName: arch?.name,
    status: "em-atendimento",
  });
}

export function updateArchitectStatus(architectId: string, status: ArchitectStatus): Architect[] {
  const list = listArchitects().map((a) =>
    a.id === architectId ? { ...a, status, updatedAt: new Date().toISOString() } : a
  );
  writeArchitects(list);
  emit({ type: "architects-updated", architects: list });
  pushState();
  return list;
}

export function saveProjectSnapshot(projectId: string, image: string): void {
  const list = readAtt();
  const att = list.find((a) => a.project.id === projectId);
  if (!att) return;
  att.project.thumbnail = image;
  att.updatedAt = new Date().toISOString();
  writeAtt(list);
  emit({ type: "attendance-updated", attendance: att });
  pushState();
}

export function appendMessage(attendanceId: string, msg: ChatMessage): Attendance | undefined {
  const att = getAttendance(attendanceId);
  if (!att) return undefined;
  return update3DAttendance(attendanceId, { messages: [...att.messages, msg] });
}
