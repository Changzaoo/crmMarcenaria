import type { LeadForm, Project3D } from "./types";
import { priceOf } from "./pricingEngine";

type CrmEnvironment = {
  largura: number;
  comprimento: number;
  peDireito: number;
  tipo: string;
  formato: "retangular" | "quadrado" | "L";
  andares: number;
  portas: number;
  janelas: number;
};

type CrmFurniture = {
  uid: string;
  catalogId: string;
  category: string;
  name: string;
  floor: number;
  x: number;
  z: number;
  rotation: number;
  width: number;
  height: number;
  depth: number;
  material: string;
  color: string;
  locked: boolean;
  /** preço estimado da peça (R$) — alimenta o resumo do funil */
  preco: number;
  /** modelo 3D importado (data URL) — quando presente, substitui a geometria */
  modelUrl?: string;
  modelFormat?: string;
};

/** Resumo financeiro/qualificação enviado junto ao doc — usado pelo
    funil comercial do CRM (card do lead com valores e prioridade). */
export type CrmEstimate = {
  min: number;
  max: number;
  total: number;
  complexity: string;
  prazoDias: [number, number];
  qtdMoveis: number;
};

export type CrmProjectDoc = {
  environment: CrmEnvironment;
  furniture: CrmFurniture[];
  notes: string;
  projectName: string;
  /** estimativa de valores do projeto (opcional p/ compatibilidade) */
  estimativa?: CrmEstimate;
  /** classificação automática do lead (frio/morno/quente/projeto-grande) */
  leadScore?: string;
  /** status do projeto no momento do envio */
  status?: string;
};

export type CrmLeadCreated = {
  leadId: string;
  projetoId: string;
};

// Dentro do próprio CRM o backend é servido no mesmo host em /api (relativo).
const CRM_API_BASE =
  (import.meta.env.VITE_CRM_API_BASE_URL?.trim() || "/api").replace(/\/+$/, "");

const MATERIAL_COLORS: Record<string, string> = {
  mdf_branco: "#f4f1e8",
  mdf_preto: "#171717",
  mdf_amadeirado: "#b88754",
  carvalho: "#c8a36a",
  nogueira: "#76513a",
  freijo: "#c79b62",
  laca: "#e8e5dc",
  marmore_escuro: "#252321",
  vidro: "#9fb7c8",
  metal: "#8c8f93",
};

function metersFromCm(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Number((value / 100).toFixed(3)) : fallback;
}

function colorFor(material: string | undefined) {
  return material ? MATERIAL_COLORS[material] || "#D8B978" : "#D8B978";
}

function leadFromProject(project: Project3D): LeadForm {
  return {
    nome: project.client.name || "Cliente Estudio 3D",
    email: project.client.email || "sem-email@linea.invalid",
    whatsapp: project.client.phone || "000000000",
    cidade_estado: project.client.city || "Nao informado",
    tipo_projeto: project.client.projectType || project.environment.typeLabel || project.environment.type || "Projeto 3D",
    prazo: project.client.desiredDeadline || "A definir",
    faixa_orcamento: project.client.budgetRange || "Ainda nao sei",
    descricao: project.client.notes || project.name,
    aceite: project.client.contactConsent ?? true,
  };
}

function ensureOk(res: Response, data: unknown): void {
  if (res.ok) return;
  const errorData = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const message =
    (typeof errorData.erro === "string" && errorData.erro) ||
    (typeof errorData.error === "string" && errorData.error) ||
    `CRM retornou ${res.status}`;
  throw Object.assign(new Error(message), { status: res.status, data });
}

async function crmFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CRM_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  ensureOk(res, data);
  return data as T;
}

export function isCrmNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { status?: number }).status === 404;
}

export function looksLikeCrmProjectId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function toCrmProjectDoc(project: Project3D): CrmProjectDoc {
  const env = project.environment;
  const projectType = project.client.projectType || env.typeLabel || env.type || "Projeto 3D";
  const notes = [
    project.client.notes?.trim(),
    project.estimate
      ? `Estimativa: R$ ${project.estimate.min.toLocaleString("pt-BR")} a R$ ${project.estimate.max.toLocaleString("pt-BR")}.`
      : "",
    `Status: ${project.status}. Origem: ${project.client.source || "Estudio 3D publico"}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const furniture = project.furniture.map((item) => {
    let preco = 0;
    try {
      preco = priceOf(item);
    } catch {
      preco = item.basePrice ?? 0;
    }
    return {
      uid: item.uid,
      catalogId: item.itemId,
      category: item.category,
      name: item.name,
      floor: item.floor ?? 0,
      x: Number((item.position?.[0] ?? 0).toFixed(3)),
      z: Number((item.position?.[2] ?? 0).toFixed(3)),
      rotation: Number((item.rotationY || 0).toFixed(4)),
      width: metersFromCm(item.width, 1),
      height: metersFromCm(item.height, 0.9),
      depth: metersFromCm(item.depth, 0.5),
      material: item.config?.material || "mdf_amadeirado",
      color: colorFor(item.config?.material),
      locked: !!item.locked,
      preco,
      ...(item.config?.modelUrl
        ? { modelUrl: item.config.modelUrl, modelFormat: item.config.modelFormat }
        : {}),
    };
  });

  const est = project.estimate;
  const estimativa: CrmEstimate | undefined = est
    ? {
        min: est.min,
        max: est.max,
        total: furniture.reduce((sum, f) => sum + (f.preco || 0), 0),
        complexity: est.complexity,
        prazoDias: est.deadlineDays,
        qtdMoveis: furniture.length,
      }
    : undefined;

  return {
    projectName: project.name || projectType,
    notes,
    status: project.status,
    leadScore: project.leadScore,
    estimativa,
    environment: {
      largura: metersFromCm(env.width, 6),
      comprimento: metersFromCm(env.depth, 5),
      peDireito: metersFromCm(env.height, 2.7),
      tipo: projectType,
      formato: Math.abs(env.width - env.depth) < 20 ? "quadrado" : "retangular",
      andares: Math.max(1, Math.round(env.floors || 1)),
      portas: env.hasDoors ? 1 : 0,
      janelas: env.hasWindows ? 1 : 0,
    },
    furniture,
  };
}

export function createCrmLead(form: LeadForm, project: Project3D): Promise<CrmLeadCreated> {
  return crmFetch<CrmLeadCreated>("/public/leads-3d", {
    method: "POST",
    body: JSON.stringify({ ...form, doc: toCrmProjectDoc(project) }),
  });
}

export function createCrmLeadFromProject(project: Project3D): Promise<CrmLeadCreated> {
  return createCrmLead(leadFromProject(project), project);
}

export function saveCrmProject(project: Project3D): Promise<unknown> {
  return crmFetch(`/public/projetos-3d/${project.id}`, {
    method: "PUT",
    body: JSON.stringify({
      doc: toCrmProjectDoc(project),
      nome: project.name,
      status: project.status,
    }),
  });
}

export function sendCrmProjectForAnalysis(project: Project3D): Promise<{ ok: boolean }> {
  return crmFetch<{ ok: boolean }>(`/public/projetos-3d/${project.id}/enviar`, {
    method: "POST",
    body: JSON.stringify({ doc: toCrmProjectDoc(project) }),
  });
}

export function callCrmArchitect(project: Project3D): Promise<{ ok: boolean }> {
  return crmFetch<{ ok: boolean }>(`/public/projetos-3d/${project.id}/chamar-arquiteto`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
