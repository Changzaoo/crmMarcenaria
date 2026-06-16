import { ACESFilmicToneMapping } from "three";

/* ============================================================
   FONTE ÚNICA do "look" 3D (luz, fog, sombra, câmera, tonemap).
   Consumido pelo site público e pelo CRM via submodule, para que
   o ambiente seja renderizado de forma IDÊNTICA nos dois.

   Contrato: unidades em METROS, eixo Y-up.
   ============================================================ */
export const RENDER_PRESET = {
  // Backdrop diurno (céu) — o ambiente externo dá vida ao editor (estilo The Sims).
  background: "#dCE8EF",
  /** Céu em gradiente (topo → horizonte) usado pela abóbada. */
  sky: { top: "#8fb8e0", bottom: "#f3e9d6" },
  /** Cor para onde a distância some no fog — combina com o horizonte do céu. */
  horizon: "#e4ddcb",
  /** Tons do cenário externo (rua, calçada, casas, prédios, carros). */
  scenery: {
    grass: "#7d9a52",
    grassDark: "#6b8746",
    deck: "#cdbfa6",
    road: "#3b3b42",
    roadLine: "#e8c14a",
    crosswalk: "#e7e3d8",
    sidewalk: "#b9b3a6",
    curb: "#8d8779",
    foliage: ["#5b8c44", "#4e7d3a", "#6f9a4c"] as const,
    trunk: "#6b4a2f",
    house: ["#d98c5f", "#e8d5a8", "#9bb486", "#7fa7c4", "#c98b8b", "#e0c27a", "#a9c7b5", "#d6a45c"] as const,
    roof: ["#8c4a3a", "#6d4534", "#566069", "#7a4a44", "#4f5b53"] as const,
    building: ["#c9bda8", "#b6a890", "#d8cdb6", "#9fb0bd", "#cdb59a", "#aab7a0"] as const,
    car: ["#c0392b", "#2d6cb0", "#e2e2e4", "#2c2c30", "#1f9d6b", "#d8a93a", "#b0b4b8", "#7b3f9e"] as const,
    window: "#bcd6e6",
    door: "#6b4a30",
  },
  ambient: { intensity: 0.72, color: "#f6ecd8" },
  hemisphere: { sky: "#dfe9f2", ground: "#73703f", intensity: 0.7 },
  key: {
    position: [6, 9, 4] as [number, number, number],
    intensity: 1.25,
    color: "#fff0d4",
  },
  shadow: { mapSize: 1536, mapSizeMobile: 512, cam: 12, bias: -0.0004 },
  /** fog.near/far são multiplicadores da maior dimensão do ambiente (m). */
  fog: { near: 2.2, far: 11 },
  toneMapping: ACESFilmicToneMapping,
  toneMappingExposure: 1.0,
} as const;

export const CAMERA_PRESET = {
  fov: 50,
  fovMobile: 60,
  near: 0.05,
  far: 200,
} as const;
