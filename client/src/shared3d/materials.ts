/* ============================================================
   FONTE ÚNICA do "look" de materiais (cor / roughness / metalness).
   Os dois apps usam ids diferentes para os mesmos acabamentos
   (ex.: "mdf-claro" no site, "madeira_clara" no CRM). Aqui todos
   os ids — dos dois apps — mapeiam para o MESMO look canônico, então
   o mesmo acabamento é renderizado de forma idêntica nos dois.

   Cada app mantém seu próprio rótulo/preço; só o LOOK vem daqui.
   ============================================================ */
export interface MaterialLook {
  color: string;
  roughness: number;
  metalness: number;
}

// Looks canônicos por "significado" de acabamento.
const C = {
  branco: { color: "#ece9e3", roughness: 0.6, metalness: 0 },
  acetinado: { color: "#f4f1ea", roughness: 0.35, metalness: 0 },
  preto: { color: "#1a1815", roughness: 0.6, metalness: 0 },
  pretoFosco: { color: "#111111", roughness: 0.85, metalness: 0.05 },
  madeiraClara: { color: "#b9966a", roughness: 0.6, metalness: 0 },
  madeiraEscura: { color: "#5a3a22", roughness: 0.55, metalness: 0 },
  freijo: { color: "#8a5a33", roughness: 0.52, metalness: 0 },
  carvalho: { color: "#a87f4e", roughness: 0.55, metalness: 0 },
  nogueira: { color: "#3f2a18", roughness: 0.5, metalness: 0 },
  cinza: { color: "#5b5b5e", roughness: 0.6, metalness: 0.08 },
  ripado: { color: "#7a4e2c", roughness: 0.5, metalness: 0 },
  vidro: { color: "#9fb7c8", roughness: 0.1, metalness: 0.2 },
  metalPreto: { color: "#1c1d1f", roughness: 0.32, metalness: 0.88 },
  marmoreClaro: { color: "#e8e6e1", roughness: 0.2, metalness: 0.05 },
  marmoreEscuro: { color: "#2b2d33", roughness: 0.2, metalness: 0.05 },
} satisfies Record<string, MaterialLook>;

// Todos os ids usados por QUALQUER um dos apps → look canônico.
export const MATERIAL_LOOKS: Record<string, MaterialLook> = {
  // ids do site (hífen)
  "mdf-branco": C.branco,
  "mdf-preto": C.preto,
  "mdf-claro": C.madeiraClara,
  "mdf-escuro": C.madeiraEscura,
  "nogal": C.nogueira,
  "cinza-premium": C.cinza,
  "ripado": C.ripado,
  "preto-fosco": C.pretoFosco,
  "branco-acetinado": C.acetinado,
  "vidro-fume": C.vidro,
  "metal-preto": C.metalPreto,
  // ids do CRM (underscore)
  "mdf_branco": C.branco,
  "mdf_preto": C.preto,
  "cinza_fosco": C.cinza,
  "madeira_clara": C.madeiraClara,
  "madeira_escura": C.madeiraEscura,
  "nogueira": C.nogueira,
  "vidro": C.vidro,
  "metal_preto": C.metalPreto,
  "marmore_claro": C.marmoreClaro,
  "marmore_escuro": C.marmoreEscuro,
  // comuns aos dois
  "freijo": C.freijo,
  "carvalho": C.carvalho,
};

export function materialLook(id: string): MaterialLook {
  return MATERIAL_LOOKS[id] ?? C.madeiraClara;
}
