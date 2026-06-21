import { api } from "./api";

// =============================================================================
//  Ponto de integração de alertas externos de novo lead (WhatsApp / e-mail).
//
//  A notificação IN-APP (badge + lista) é sempre confiável e independente disto
//  — ver components/Notifications.tsx. Este módulo é o gancho OPCIONAL para,
//  além do aviso interno, disparar um alerta externo reutilizando a rota já
//  existente POST /api/whatsapp/send (Meta Cloud API).
//
//  IMPORTANTE: por padrão NÃO envia nada (NOTIFY_LEADS_WHATSAPP = false). É um
//  stub seguro e documentado. Para ativar de verdade:
//    1. configure o WhatsApp Business em /config (token + phone id);
//    2. defina o número de destino da equipe (LEAD_ALERT_DESTINO);
//    3. troque NOTIFY_LEADS_WHATSAPP para true (ou plugue numa configuração).
//  O envio respeita a janela de 24h da Meta; fora dela é preciso um template.
// =============================================================================

/** Liga/desliga o disparo externo. Mantido em false por padrão (apenas in-app). */
export const NOTIFY_LEADS_WHATSAPP = false;

/** Número (com DDI) que recebe o alerta da equipe comercial. Ex.: "5511999999999". */
export const LEAD_ALERT_DESTINO = "";

export interface LeadAlertPayload {
  titulo: string;
  origem?: string | null;
}

/**
 * Dispara (quando habilitado) um alerta de novo lead via WhatsApp.
 * Best-effort: qualquer falha é silenciada para não afetar a UI; a notificação
 * in-app já cobre o caso de uso principal.
 *
 * @returns "enviado" | "desativado" | "sem-destino" | "erro" — útil para testes/log.
 */
export async function alertarNovoLead(lead: LeadAlertPayload): Promise<string> {
  if (!NOTIFY_LEADS_WHATSAPP) return "desativado";
  if (!LEAD_ALERT_DESTINO) return "sem-destino";
  const texto =
    `🔔 Novo lead NEXUS\n` +
    `${lead.titulo}` +
    (lead.origem ? `\nOrigem: ${lead.origem}` : "");
  try {
    await api.post("/whatsapp/send", { to: LEAD_ALERT_DESTINO, text: texto });
    return "enviado";
  } catch {
    // WhatsApp pode estar desconfigurado ou fora da janela de 24h — ok ignorar.
    return "erro";
  }
}
