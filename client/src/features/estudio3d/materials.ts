/* ============================================================
   Materiais — paleta de acabamentos da marcenaria.
   Cada material vira um meshStandardMaterial leve no editor.
   ============================================================ */

export interface MaterialDef {
  id: string;
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  /** multiplicador de preço aplicado sobre o basePrice do móvel */
  priceFactor: number;
}

export const MATERIALS: MaterialDef[] = [
  { id: "mdf-branco", label: "MDF branco", color: "#ece9e3", roughness: 0.6, metalness: 0, priceFactor: 1.0 },
  { id: "mdf-preto", label: "MDF preto", color: "#1a1815", roughness: 0.55, metalness: 0, priceFactor: 1.05 },
  { id: "mdf-claro", label: "MDF amadeirado claro", color: "#b9966a", roughness: 0.62, metalness: 0, priceFactor: 1.1 },
  { id: "mdf-escuro", label: "MDF amadeirado escuro", color: "#6f4a2c", roughness: 0.6, metalness: 0, priceFactor: 1.15 },
  { id: "freijo", label: "Freijó", color: "#8a5a33", roughness: 0.5, metalness: 0, priceFactor: 1.35 },
  { id: "carvalho", label: "Carvalho", color: "#a87f4e", roughness: 0.55, metalness: 0, priceFactor: 1.3 },
  { id: "nogal", label: "Nogal", color: "#3f2a18", roughness: 0.5, metalness: 0, priceFactor: 1.45 },
  { id: "cinza-premium", label: "Cinza premium", color: "#5b5b5e", roughness: 0.5, metalness: 0.1, priceFactor: 1.2 },
  { id: "ripado", label: "Ripado de madeira", color: "#7a4e2c", roughness: 0.5, metalness: 0, priceFactor: 1.5 },
  { id: "preto-fosco", label: "Preto fosco", color: "#111", roughness: 0.85, metalness: 0.05, priceFactor: 1.1 },
  { id: "branco-acetinado", label: "Branco acetinado", color: "#f4f1ea", roughness: 0.35, metalness: 0, priceFactor: 1.15 },
  { id: "vidro-fume", label: "Vidro fumê", color: "#2b2f33", roughness: 0.1, metalness: 0.2, priceFactor: 1.4 },
  { id: "metal-preto", label: "Metal preto", color: "#1c1d1f", roughness: 0.3, metalness: 0.85, priceFactor: 1.35 },
];

export const MATERIAL_MAP: Record<string, MaterialDef> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, m])
);

import { materialLook } from "../../shared3d";

/* O LOOK (cor/roughness/metalness) vem da fonte única `shared3d/materials`,
   idêntico ao CRM. O rótulo e o priceFactor continuam locais. */
export function materialDef(id: string): MaterialDef {
  const base = MATERIAL_MAP[id] ?? MATERIALS[0];
  return { ...base, ...materialLook(id) };
}
