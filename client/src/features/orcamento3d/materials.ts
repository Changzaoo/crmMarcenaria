// Biblioteca de materiais / acabamentos da marcenaria.

export interface MaterialDef {
  id: string;
  nome: string;
  color: string; // cor base (hex)
  roughness: number;
  metalness: number;
  // multiplicador de preço relativo (para a estimativa do pré-orçamento)
  fator: number;
}

export const MATERIALS: MaterialDef[] = [
  { id: "mdf_branco", nome: "MDF Branco", color: "#F3F0EA", roughness: 0.75, metalness: 0, fator: 1.0 },
  { id: "mdf_preto", nome: "MDF Preto", color: "#1C1B1A", roughness: 0.6, metalness: 0, fator: 1.05 },
  { id: "freijo", nome: "Freijó", color: "#7A5230", roughness: 0.55, metalness: 0, fator: 1.35 },
  { id: "carvalho", nome: "Carvalho", color: "#B68A56", roughness: 0.55, metalness: 0, fator: 1.3 },
  { id: "nogueira", nome: "Nogueira", color: "#5A3A22", roughness: 0.5, metalness: 0, fator: 1.4 },
  { id: "cinza_fosco", nome: "Cinza Fosco", color: "#6E6E6C", roughness: 0.85, metalness: 0, fator: 1.0 },
  { id: "madeira_clara", nome: "Madeira Clara", color: "#C9A877", roughness: 0.6, metalness: 0, fator: 1.2 },
  { id: "madeira_escura", nome: "Madeira Escura", color: "#4A3322", roughness: 0.55, metalness: 0, fator: 1.25 },
  { id: "vidro", nome: "Vidro", color: "#AEC6CF", roughness: 0.08, metalness: 0.1, fator: 1.5 },
  { id: "metal_preto", nome: "Metal Preto", color: "#2A2A2C", roughness: 0.35, metalness: 0.9, fator: 1.45 },
  { id: "marmore_claro", nome: "Mármore Claro", color: "#E8E6E1", roughness: 0.2, metalness: 0.05, fator: 1.8 },
  { id: "marmore_escuro", nome: "Mármore Escuro", color: "#2B2D33", roughness: 0.2, metalness: 0.05, fator: 1.85 },
];

export const MATERIAL_BY_ID = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

import { materialLook } from "../../shared3d";

/* O LOOK (cor/roughness/metalness) vem da fonte única `shared3d/materials`,
   idêntico ao site. O rótulo e o fator de preço continuam locais. */
export function getMaterial(id: string): MaterialDef {
  const base = MATERIAL_BY_ID[id] || MATERIALS[0];
  return { ...base, ...materialLook(id) };
}
