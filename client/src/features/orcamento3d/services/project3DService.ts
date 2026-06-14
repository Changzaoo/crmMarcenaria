import { api } from "../../../lib/api";
import type { Project3DDoc } from "../types";

export interface Projeto3D {
  id: string;
  lead_id?: string;
  lead?: { id: string; nome?: string } | null;
  nome?: string;
  doc: Project3DDoc;
  status: string;
  atualizado_em?: string;
}

export const carregarProjeto = (id: string) => api.get<Projeto3D>(`/public/projetos-3d/${id}`);

export const salvarProjeto = (id: string, doc: Project3DDoc, status?: string) =>
  api.put<Projeto3D>(`/public/projetos-3d/${id}`, { doc, nome: doc.projectName, status });

export const enviarParaAnalise = (id: string, doc: Project3DDoc) =>
  api.post<{ ok: boolean }>(`/public/projetos-3d/${id}/enviar`, { doc });

// Cliente sinaliza que precisa de um especialista — destaca o lead no Suporte 3D.
export const chamarArquiteto = (id: string) =>
  api.post<{ ok: boolean }>(`/public/projetos-3d/${id}/chamar-arquiteto`, {});
