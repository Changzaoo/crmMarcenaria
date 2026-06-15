/* ============================================================
   Modelos prontos de ambiente. Medidas em cm.
   ============================================================ */
import type { EnvironmentConfig, EnvironmentStyle } from "./types";

export interface EnvTemplate {
  id: string;
  label: string;
  description: string;
  base: Partial<EnvironmentConfig>;
}

export const ENV_TEMPLATES: EnvTemplate[] = [
  { id: "loja-pequena", label: "Loja pequena", description: "Até ~30 m², vitrine e balcão.", base: { width: 500, depth: 600, height: 300, hasStorefront: true, hasCounter: true } },
  { id: "loja-media", label: "Loja média", description: "~60 m², circulação ampla.", base: { width: 700, depth: 900, height: 320, hasStorefront: true, hasCounter: true, hasStockroom: true } },
  { id: "loja-grande", label: "Loja grande", description: "100 m²+, flagship.", base: { width: 1000, depth: 1200, height: 350, hasStorefront: true, hasCounter: true, hasStockroom: true } },
  { id: "quiosque", label: "Quiosque", description: "Ilha de varejo compacta.", base: { width: 300, depth: 300, height: 280, hasCounter: true, hasStorefront: false } },
  { id: "escritorio", label: "Escritório", description: "Estações e recepção.", base: { width: 800, depth: 800, height: 290, hasCounter: true, style: "corporativo" } },
  { id: "cozinha", label: "Cozinha planejada", description: "Bancadas e armários.", base: { width: 400, depth: 350, height: 270, style: "madeira-natural" } },
  { id: "sala-comercial", label: "Sala comercial", description: "Atendimento e reunião.", base: { width: 600, depth: 700, height: 290, style: "corporativo" } },
  { id: "recepcao", label: "Recepção", description: "Balcão e área de espera.", base: { width: 500, depth: 450, height: 300, hasCounter: true } },
  { id: "closet", label: "Closet", description: "Ambiente modular fechado.", base: { width: 350, depth: 300, height: 260, style: "luxo" } },
  { id: "personalizado", label: "Ambiente personalizado", description: "Defina cada medida.", base: {} },
];

export const STYLE_LABELS: Record<EnvironmentStyle, string> = {
  moderno: "Moderno",
  luxo: "Luxo",
  minimalista: "Minimalista",
  industrial: "Industrial",
  "madeira-natural": "Madeira natural",
  corporativo: "Corporativo",
  "retail-premium": "Retail premium",
};

/** Paleta de parede/piso sugerida por estilo (apenas visual). */
export const STYLE_PALETTE: Record<EnvironmentStyle, { wall: string; floor: EnvironmentConfig["floorType"] }> = {
  moderno: { wall: "#2a2622", floor: "porcelanato" },
  luxo: { wall: "#1d1813", floor: "escuro" },
  minimalista: { wall: "#e9e6df", floor: "claro" },
  industrial: { wall: "#3a3a3c", floor: "cimento" },
  "madeira-natural": { wall: "#cdbfa6", floor: "madeira" },
  corporativo: { wall: "#23262b", floor: "porcelanato" },
  "retail-premium": { wall: "#221a12", floor: "escuro" },
};

export function defaultEnvironment(): EnvironmentConfig {
  return {
    type: "loja-media",
    typeLabel: "Loja média",
    width: 700,
    depth: 900,
    height: 320,
    floors: 1,
    hasMezzanine: false,
    hasStairs: false,
    hasStorefront: true,
    hasCounter: true,
    hasStockroom: false,
    hasDoors: true,
    hasWindows: true,
    floorType: "porcelanato",
    wallColor: "#221a12",
    style: "retail-premium",
  };
}

export function applyTemplate(tpl: EnvTemplate): EnvironmentConfig {
  const env = defaultEnvironment();
  const style = (tpl.base.style ?? "retail-premium") as EnvironmentStyle;
  const palette = STYLE_PALETTE[style];
  return {
    ...env,
    ...tpl.base,
    type: tpl.id,
    typeLabel: tpl.label,
    style,
    wallColor: tpl.base.wallColor ?? palette.wall,
    floorType: tpl.base.floorType ?? palette.floor,
  };
}

/** Limites de sanidade — evita ambiente absurdo que trava o navegador. */
export const ENV_LIMITS = {
  width: [150, 3000] as [number, number],
  depth: [150, 3000] as [number, number],
  height: [220, 800] as [number, number],
  floors: [1, 6] as [number, number],
  maxFurniture: 60,
};
