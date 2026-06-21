/* ============================================================
   Contrato de integração landing ↔ CRM (NEXUS).

   FONTE ÚNICA do contrato público entre a landing e o CRM.
   Antes, a base da API e os tipos de integração viviam duplicados
   em `src/lib/proposal.ts` e `src/features/orcamento3d/crmPublicApi.ts`.
   Tudo o que cruza a fronteira site ⇄ CRM deve ser declarado aqui.
   ============================================================ */

/* ---------- base da API ---------- */
export const CRM_API_BASE = (
  import.meta.env.VITE_CRM_API_BASE_URL?.trim() || "https://crm-marcenaria.vercel.app/api"
).replace(/\/+$/, "");

/* ---------- endpoints públicos ---------- */
export const CRM_ENDPOINTS = {
  /** POST — cria lead a partir de um projeto do Estúdio 3D */
  leads3d: "/public/leads-3d",
  /** POST — formulário "solicitar proposta" (cai na fileira Lead do funil) */
  solicitarProposta: "/public/solicitar-proposta",
  /** PUT — atualiza o documento de um projeto 3D existente */
  projeto: (id: string) => `/public/projetos-3d/${id}`,
  /** POST — envia o projeto 3D para análise da equipe */
  enviar: (id: string) => `/public/projetos-3d/${id}/enviar`,
  /** POST — chama um arquiteto para a sessão ao vivo */
  chamarArquiteto: (id: string) => `/public/projetos-3d/${id}/chamar-arquiteto`,
  /** POST — heartbeat de presença da sessão colaborativa */
  sessaoHeartbeat: (id: string) => `/public/sessoes-3d/${id}/heartbeat`,
  /** GET — estado atual da sessão colaborativa */
  sessaoState: (id: string) => `/public/sessoes-3d/${id}/state`,
  /** PUT — documento canônico da sessão colaborativa */
  sessaoDoc: (id: string) => `/public/sessoes-3d/${id}/doc`,
  /** POST — sinaliza saída de um participante da sessão */
  sessaoLeave: (id: string) => `/public/sessoes-3d/${id}/leave`,
} as const;

/* ---------- tipos canônicos do documento 3D ---------- */
export type CrmEnvironment = {
  largura: number;
  comprimento: number;
  peDireito: number;
  tipo: string;
  formato: "retangular" | "quadrado" | "L";
  andares: number;
  portas: number;
  janelas: number;
};

export type CrmFurniture = {
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

/* ---------- formulários públicos ---------- */

/** Formulário "Solicitar proposta" (CTA do site → fileira Lead do funil). */
export type ProposalForm = {
  nome: string;
  email: string;
  whatsapp: string;
  cidade_estado: string;
  tipo_projeto: string;
  prazo?: string;
  faixa_orcamento?: string;
  mensagem?: string;
  aceite: boolean;
};

/** Formulário de lead gerado pelo Estúdio 3D (acompanha o doc do projeto). */
export type LeadForm = {
  nome: string;
  email: string;
  whatsapp: string;
  cidade_estado: string;
  tipo_projeto: string;
  prazo?: string;
  faixa_orcamento?: string;
  descricao?: string;
  aceite: boolean;
};

/* ---------- helper de fetch tipado ---------- */

/** Resposta de erro do CRM com status/payload anexados, para que os
    chamadores possam diferenciar (ex.: 404) sem inspecionar strings. */
export interface CrmError extends Error {
  status?: number;
  data?: unknown;
}

function ensureOk(res: Response, data: unknown): void {
  if (res.ok) return;
  const errorData = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const message =
    (typeof errorData.erro === "string" && errorData.erro) ||
    (typeof errorData.error === "string" && errorData.error) ||
    `CRM retornou ${res.status}`;
  const err: CrmError = Object.assign(new Error(message), { status: res.status, data });
  throw err;
}

/** Fetch tipado para a API pública do CRM. Faz o parse seguro do corpo
    (JSON quando possível, texto caso contrário) e levanta um CrmError
    com status/payload quando a resposta não é OK. */
export async function crmFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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
