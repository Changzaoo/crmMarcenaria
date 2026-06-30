import { api } from "../../../lib/api";
import type { LeadForm, Project3DDoc } from "../types";
import type { PortalArquivo } from "../../../shared/contract";

export type { PortalArquivo };

export interface LeadCreatedResult {
  leadId: string;
  projetoId: string;
}

// Cria o lead obrigatório antes de liberar o estúdio 3D (rota pública).
export async function criarLead(form: LeadForm, doc?: Project3DDoc): Promise<LeadCreatedResult> {
  return api.post<LeadCreatedResult>("/public/leads-3d", { ...form, doc });
}

// ---- Lado do arquiteto (autenticado) ----
export interface Lead3D {
  id: string;
  nome: string;
  email?: string;
  whatsapp?: string;
  cidade_estado?: string;
  tipo_projeto?: string;
  prazo?: string;
  faixa_orcamento?: string;
  descricao?: string;
  status: string;
  origem: string;
  anotacoes?: string;
  projeto_id?: string;
  arquiteto_solicitado?: number;
  arquiteto_solicitado_em?: string;
  projeto_status?: string;
  projeto_atualizado_em?: string;
  criado_em?: string;
  atualizado_em?: string;
  /** código de acesso do lead ao Portal do Cliente */
  token?: string;
  /** arquivos técnicos enviados pelo cliente via Portal do Cliente */
  arquivos?: PortalArquivo[];
}

export interface Lead3DDetalhe extends Lead3D {
  projeto?: { id: string; doc: Project3DDoc; status: string } | null;
}

export const STATUS_LEAD = [
  "Novo",
  "Em atendimento",
  "Projeto analisado",
  "Proposta enviada",
  "Fechado",
  "Perdido",
];

// URL pública (por token) para baixar/visualizar um arquivo no CRM.
// É uma rota pública, não precisa de header de auth — usar em <a href download>.
export const arquivoDownloadUrl = (token: string, arquivoId: string) =>
  `/api/public/portal/${token}/arquivos/${arquivoId}`;

export const listarLeads = () => api.get<Lead3D[]>("/leads-3d");
export const obterLead = (id: string) => api.get<Lead3DDetalhe>(`/leads-3d/${id}`);
export const atualizarLead = (
  id: string,
  dados: { status?: string; anotacoes?: string; arquiteto_solicitado?: number }
) => api.patch<Lead3D>(`/leads-3d/${id}`, dados);
export const removerLead = (id: string) => api.del<{ ok: boolean }>(`/leads-3d/${id}`);
