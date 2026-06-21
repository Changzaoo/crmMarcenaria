// ============================================================================
// CONTRATO PÚBLICO DE INTEGRAÇÃO — Landing (site NEXUS) ↔ CRM
// ----------------------------------------------------------------------------
// FONTE ÚNICA dos caminhos e da validação dos payloads públicos do Estúdio 3D.
// O cliente (landing) mantém um espelho TS em:
//   c:/Users/vinicius/marcenaria-corporativa/src/shared/contract.ts
// Ao mudar campos/rotas aqui, replique lá (e vice-versa) até extrairmos um
// pacote npm compartilhado de verdade.
// ============================================================================

// Caminhos relativos ao prefixo público do CRM: /api/public
export const PUBLIC_ENDPOINTS = Object.freeze({
  leads3d: "/leads-3d",
  solicitarProposta: "/solicitar-proposta",
  projeto: "/projetos-3d/:id",
  enviar: "/projetos-3d/:id/enviar",
  chamarArquiteto: "/projetos-3d/:id/chamar-arquiteto",
  sessaoHeartbeat: "/sessao/:id/heartbeat",
  sessaoState: "/sessao/:id/state",
  sessaoDoc: "/sessao/:id/doc",
  sessaoLeave: "/sessao/:id/leave",
});

// Origens dos leads (rastreamento de funil).
export const LEAD_ORIGINS = Object.freeze({
  estudio3d: "Orçamento 3D",
  solicitarProposta: "Solicitar proposta",
});

export const LEAD_SCORES = Object.freeze(["frio", "morno", "quente", "projeto-grande"]);

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Valida o payload de criação de lead vindo do site (público).
 * @returns {{ ok: true } | { ok: false, motivo: string }}
 */
export function validarLead(body) {
  const b = body || {};
  const faltando = [];
  if (!b.nome || !String(b.nome).trim()) faltando.push("nome");
  if (!b.email || !String(b.email).trim()) faltando.push("e-mail");
  if (!b.whatsapp || !String(b.whatsapp).trim()) faltando.push("WhatsApp");
  if (faltando.length) {
    return { ok: false, motivo: `Preencha: ${faltando.join(", ")}.` };
  }
  if (!EMAIL_RE.test(String(b.email).trim())) {
    return { ok: false, motivo: "Informe um e-mail válido." };
  }
  if (!b.aceite) {
    return { ok: false, motivo: "É necessário aceitar o contato da equipe." };
  }
  return { ok: true };
}
