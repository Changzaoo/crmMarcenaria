import { woodTexture } from "../../lib/textures";
import { materialDef } from "./materials";
import type { FurnitureConfig } from "./types";

/* Converte material + superfície + acabamento em props prontas para
   <meshStandardMaterial>. Madeiras ganham veio procedural (cacheado);
   vidro e metal têm tratamento próprio. */

const FINISH_ROUGH: Record<FurnitureConfig["finish"], number> = {
  fosco: 0.82,
  acetinado: 0.42,
  brilho: 0.18,
  natural: 0.6,
};

// base, veio escuro, veio claro
const WOOD: Record<string, [string, string, string]> = {
  "mdf-claro": ["#b9966a", "#94714a", "#cda980"],
  "mdf-escuro": ["#6f4a2c", "#4e331d", "#8a623c"],
  freijo: ["#8a5a33", "#5f3c20", "#a9764a"],
  carvalho: ["#a87f4e", "#7d5a32", "#c6a06a"],
  nogal: ["#3f2a18", "#271811", "#5a3d24"],
  ripado: ["#7a4e2c", "#5a3a20", "#8f6038"],
};

export interface SurfaceProps {
  color?: string;
  map?: ReturnType<typeof woodTexture>;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
}

export function getSurface(
  materialId: string,
  surface: FurnitureConfig["surface"],
  finish: FurnitureConfig["finish"],
  repeat: [number, number] = [1, 1]
): SurfaceProps {
  if (surface === "vidro") {
    return { color: "#2b2f33", roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.4 };
  }
  if (surface === "metal") {
    return { color: "#1c1d1f", roughness: 0.3, metalness: 0.85 };
  }
  const rough = FINISH_ROUGH[finish] ?? 0.6;
  const wood = WOOD[materialId];
  if (wood) {
    return { map: woodTexture(wood[0], wood[1], wood[2], repeat), roughness: rough, metalness: 0 };
  }
  const m = materialDef(materialId);
  return { color: m.color, roughness: rough, metalness: m.metalness };
}
