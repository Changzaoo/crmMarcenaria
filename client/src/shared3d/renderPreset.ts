import { ACESFilmicToneMapping } from "three";

/* ============================================================
   FONTE ÚNICA do "look" 3D (luz, fog, sombra, câmera, tonemap).
   Consumido pelo site público e pelo CRM via submodule, para que
   o ambiente seja renderizado de forma IDÊNTICA nos dois.

   Contrato: unidades em METROS, eixo Y-up.
   ============================================================ */
export const RENDER_PRESET = {
  background: "#0c0a08",
  ambient: { intensity: 0.6, color: "#f4e8d4" },
  hemisphere: { sky: "#cdbfa6", ground: "#1a1510", intensity: 0.5 },
  key: {
    position: [6, 9, 4] as [number, number, number],
    intensity: 1.2,
    color: "#ffe9c8",
  },
  shadow: { mapSize: 1536, mapSizeMobile: 512, cam: 12, bias: -0.0004 },
  /** fog.near/far são multiplicadores da maior dimensão do ambiente (m). */
  fog: { near: 1.0, far: 4.5 },
  toneMapping: ACESFilmicToneMapping,
  toneMappingExposure: 1.0,
} as const;

export const CAMERA_PRESET = {
  fov: 50,
  fovMobile: 60,
  near: 0.05,
  far: 200,
} as const;
