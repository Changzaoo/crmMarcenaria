import { api } from "../lib/api";

export interface ConversaMensagem {
  id: string;
  role: "user" | "assistant" | "tool";
  conteudo: string;
  criado_em: string;
}

export interface ConversaResumo {
  id: string;
  lead_id: string | null;
  canal: string;
  nome: string | null;
  email: string | null;
  whatsapp: string | null;
  cidade_estado: string | null;
  tipo_projeto: string | null;
  status: string;
  convertida: 0 | 1;
  resumo: string | null;
  origem: string | null;
  criado_em: string;
  atualizado_em: string;
  total_mensagens: number;
  ultima_mensagem: string | null;
}

export interface ConversaDetalhe extends ConversaResumo {
  mensagens: ConversaMensagem[];
}

export function listarConversas(): Promise<ConversaResumo[]> {
  return api.get<ConversaResumo[]>("/conversas");
}

export function obterConversa(id: string): Promise<ConversaDetalhe> {
  return api.get<ConversaDetalhe>("/conversas/" + id);
}

export function removerConversa(id: string): Promise<{ ok: boolean }> {
  return api.del<{ ok: boolean }>("/conversas/" + id);
}
