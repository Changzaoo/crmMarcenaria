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
  // Portal do Cliente (área reservada para envio de arquivos técnicos).
  portal: "/portal/:token",
  portalArquivos: "/portal/:token/arquivos",
  portalArquivo: "/portal/:token/arquivos/:arquivoId",
  // Assistente de IA (chat do site).
  chat: "/chat",
});

// Categorias de documento que o cliente pode enviar (espelhadas na landing,
// src/shared/contract.ts → ARQUIVO_CATEGORIAS).
export const ARQUIVO_CATEGORIAS = Object.freeze([
  { key: "planta_baixa", label: "Planta baixa" },
  { key: "layout", label: "Planta de layout / leiaute" },
  { key: "cortes", label: "Cortes e seções" },
  { key: "vistas", label: "Vistas / elevações" },
  { key: "forro", label: "Planta de forro / cobertura" },
  { key: "eletrica_hidraulica", label: "Elétrica / hidráulica" },
  { key: "detalhamento", label: "Detalhamento / executivo de marcenaria" },
  { key: "modelo_3d", label: "Modelo 3D" },
  { key: "render_foto", label: "Renders / fotos do local" },
  { key: "memorial", label: "Memorial / outros documentos" },
]);

// Extensões aceitas no upload (modelos 3D, CAD, plantas em PDF, imagens, docs).
export const ARQUIVO_EXTENSOES_ACEITAS = Object.freeze([
  ".pdf",
  ".dwg", ".dxf",
  ".skp", ".rvt", ".ifc", ".3dm",
  ".glb", ".gltf", ".obj", ".fbx", ".stl", ".3ds", ".dae",
  ".png", ".jpg", ".jpeg", ".webp", ".gif",
  ".xlsx", ".xls", ".docx", ".doc", ".csv", ".txt",
  ".zip",
]);

// 60 MB por arquivo — generoso por causa de modelos 3D (SKP/FBX).
export const ARQUIVO_MAX_BYTES = 60 * 1024 * 1024;

/** Rótulo legível de uma categoria (cai em "Outros" se desconhecida). */
export function categoriaLabel(key) {
  return ARQUIVO_CATEGORIAS.find((c) => c.key === key)?.label || "Outros documentos";
}

/** Normaliza a categoria recebida: usa "memorial" como balde de "outros". */
export function normalizarCategoria(key) {
  const k = String(key || "").trim();
  return ARQUIVO_CATEGORIAS.some((c) => c.key === k) ? k : "memorial";
}

/** Valida a extensão do arquivo pelo nome. */
export function extensaoAceita(nome) {
  const m = /\.[a-z0-9]+$/i.exec(String(nome || ""));
  return !!m && ARQUIVO_EXTENSOES_ACEITAS.includes(m[0].toLowerCase());
}

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
