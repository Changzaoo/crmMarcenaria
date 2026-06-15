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
  /** Tons do cenário externo (gramado, deck e prédios ao fundo). */
  scenery: {
    grass: "#7d9a52",
    grassDark: "#6b8746",
    deck: "#cdbfa6",
    foliage: ["#5b8c44", "#4e7d3a", "#6f9a4c"] as const,
    trunk: "#6b4a2f",
    building: ["#c9bda8", "#b6a890", "#d8cdb6"] as const,
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
