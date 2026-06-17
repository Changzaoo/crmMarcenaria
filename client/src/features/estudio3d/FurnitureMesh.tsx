import { useEffect, useMemo, useState } from "react";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { stoneTexture } from "../../lib/textures";
import type { PlacedFurniture } from "./types";
import { getSurface, SurfaceProps } from "./furnitureSurface";
import { fitObject, loadModelObject, type ModelFormat } from "./modelImport";

const M = 0.01; // cm → m
const BRASS = { color: "#caa86a", roughness: 0.3, metalness: 0.7 };
const DARK = { color: "#0c0a08", roughness: 0.75, metalness: 0.05 };
const LED = { color: "#ffe7c2", emissive: "#ffc987", emissiveIntensity: 1.6, toneMapped: false };

const rep = (n: number): [number, number] => [Math.max(1, Math.round(n / 1.1)), 1];

/* ---------- peças reutilizáveis ---------- */
function Led({ w, y, z }: { w: number; y: number; z: number }) {
  return (
    <mesh position={[0, y, z]}>
      <boxGeometry args={[w, 0.012, 0.012]} />
      <meshStandardMaterial {...LED} />
    </mesh>
  );
}

function Handles({ w, h, d, doors, drawers, handle }: { w: number; h: number; d: number; doors: number; drawers: number; handle: string }) {
  if (handle === "sem" || handle === "cava") return null;
  const items: [number, number, number, number, number][] = []; // x,y,z,len,vertical
  for (let i = 0; i < doors; i++) {
    const cx = -w / 2 + (w * (i + 0.5)) / Math.max(1, doors);
    const hx = cx + (i % 2 === 0 ? w / Math.max(1, doors) : -w / Math.max(1, doors)) * 0.3;
    items.push([hx, h * 0.5, d / 2 + 0.012, Math.min(0.24, h * 0.4), 1]);
  }
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} position={[it[0], it[1], it[2]]}>
          <boxGeometry args={[0.016, it[3], 0.016]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      ))}
    </>
  );
}

/** Frente com portas (linhas verticais) + puxadores. */
function Doors({ w, h, d, n, handle }: { w: number; h: number; d: number; n: number; handle: string }) {
  if (n <= 0) return null;
  return (
    <>
      {Array.from({ length: n - 1 }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + (w * (i + 1)) / n, h / 2, d / 2 + 0.002]}>
          <boxGeometry args={[0.008, h * 0.96, 0.004]} />
          <meshStandardMaterial {...DARK} />
        </mesh>
      ))}
      <Handles w={w} h={h} d={d} doors={n} drawers={0} handle={handle} />
    </>
  );
}

/** Frente com gavetas empilhadas + puxadores horizontais. */
function Drawers({ w, h, d, n, handle, y0 = 0, hh }: { w: number; h: number; d: number; n: number; handle: string; y0?: number; hh?: number }) {
  if (n <= 0) return null;
  const zone = hh ?? h;
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const cy = y0 + (zone * (i + 0.5)) / n;
        return (
          <group key={i}>
            <mesh position={[0, y0 + (zone * (i + 1)) / n, d / 2 + 0.002]}>
              <boxGeometry args={[w * 0.96, 0.006, 0.004]} />
              <meshStandardMaterial {...DARK} />
            </mesh>
            {handle !== "sem" && handle !== "cava" && (
              <mesh position={[0, cy, d / 2 + 0.014]}>
                <boxGeometry args={[Math.min(0.26, w * 0.4), 0.016, 0.016]} />
                <meshStandardMaterial {...BRASS} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

function Kick({ w, d }: { w: number; d: number }) {
  return (
    <mesh position={[0, 0.03, 0]}>
      <boxGeometry args={[w * 0.94, 0.06, d * 0.94]} />
      <meshStandardMaterial {...DARK} />
    </mesh>
  );
}

function StoneTop({ w, d, y, stone }: { w: number; d: number; y: number; stone: ReturnType<typeof stoneTexture> }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <boxGeometry args={[w + 0.04, 0.04, d + 0.04]} />
      <meshStandardMaterial map={stone} roughness={0.3} metalness={0.05} />
    </mesh>
  );
}

function Body({ w, h, d, s, y }: { w: number; h: number; d: number; s: SurfaceProps; y?: number }) {
  return (
    <mesh position={[0, y ?? h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial {...s} />
    </mesh>
  );
}

/* ---------- modelos por categoria ---------- */
function CategoryModel({ f, s, stone }: { f: PlacedFurniture; s: SurfaceProps; stone: ReturnType<typeof stoneTexture> }) {
  const w = f.width * M;
  const h = f.height * M;
  const d = f.depth * M;
  const c = f.config;
  const id = f.itemId;
  const cat = f.category;

  // Balcão / checkout: corpo + tampo de pedra + frente frisada + LED
  if (cat === "balcao" || cat === "checkout") {
    const bodyH = h - 0.06;
    const flutes = Math.max(6, Math.round(w / 0.14));
    return (
      <group>
        <Kick w={w} d={d} />
        <Body w={w} h={bodyH} d={d} s={s} y={bodyH / 2 + 0.06} />
        {/* frisos verticais na frente */}
        {Array.from({ length: flutes }).map((_, i) => (
          <mesh key={i} position={[-w / 2 + (w * (i + 0.5)) / flutes, bodyH / 2 + 0.06, d / 2 + 0.012]}>
            <boxGeometry args={[w / flutes * 0.5, bodyH * 0.92, 0.02]} />
            <meshStandardMaterial {...s} />
          </mesh>
        ))}
        <StoneTop w={w} d={d} y={h - 0.02} stone={stone} />
        <Drawers w={w * 0.5} h={bodyH} d={d} n={c.drawers} handle={c.handle} y0={0.06} hh={bodyH} />
        {c.led && <Led w={w * 0.94} y={h - 0.06} z={d / 2 - 0.02} />}
      </group>
    );
  }

  // Ilha / bancada: corpo + tampo + (cuba) + gavetas/portas
  if (cat === "ilha" || cat === "bancada") {
    const bodyH = h - 0.06;
    return (
      <group>
        <Kick w={w} d={d} />
        <Body w={w} h={bodyH} d={d} s={s} y={bodyH / 2 + 0.06} />
        <StoneTop w={w} d={d} y={h - 0.02} stone={stone} />
        {id === "bancada-cuba" && (
          <mesh position={[w * 0.22, h - 0.02, 0]}>
            <boxGeometry args={[w * 0.32, 0.05, d * 0.55]} />
            <meshStandardMaterial color="#15171a" roughness={0.2} metalness={0.6} />
          </mesh>
        )}
        <Drawers w={w * 0.45} h={bodyH} d={d} n={c.drawers} handle={c.handle} y0={0.06} hh={bodyH} />
        {c.doors > 0 && <Doors w={w} h={bodyH} d={d} n={c.doors} handle={c.handle} />}
        {c.led && <Led w={w * 0.94} y={h - 0.06} z={d / 2 - 0.02} />}
      </group>
    );
  }

  // Estante / gôndola: laterais + fundo + prateleiras + LED
  if (cat === "estante" || cat === "gondola") {
    const shelves = Math.max(2, Math.round(h / 0.5));
    return (
      <group>
        {/* laterais */}
        {[-w / 2 + 0.02, w / 2 - 0.02].map((x, i) => (
          <mesh key={i} position={[x, h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.04, h, d]} />
            <meshStandardMaterial {...s} />
          </mesh>
        ))}
        {/* fundo */}
        <mesh position={[0, h / 2, -d / 2 + 0.02]} receiveShadow>
          <boxGeometry args={[w, h, 0.03]} />
          <meshStandardMaterial {...s} />
        </mesh>
        {/* prateleiras */}
        {Array.from({ length: shelves }).map((_, i) => {
          const y = (h * (i + 0.5)) / shelves;
          return (
            <group key={i}>
              <mesh position={[0, y, 0]} castShadow receiveShadow>
                <boxGeometry args={[w - 0.06, 0.035, d - 0.04]} />
                <meshStandardMaterial {...s} />
              </mesh>
              {c.led && <Led w={w - 0.12} y={y - 0.025} z={d / 2 - 0.06} />}
            </group>
          );
        })}
      </group>
    );
  }

  // Prateleira de parede: tampo + mãos-francesas
  if (cat === "prateleira") {
    return (
      <group>
        <mesh position={[0, h / 2, 0]} castShadow>
          <boxGeometry args={[w, Math.max(h, 0.04), d]} />
          <meshStandardMaterial {...s} />
        </mesh>
        {[-w / 2 + 0.1, w / 2 - 0.1].map((x, i) => (
          <mesh key={i} position={[x, -0.05, 0.02]}>
            <boxGeometry args={[0.02, 0.1, d * 0.7]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
        ))}
        {c.led && <Led w={w * 0.9} y={-0.01} z={d / 2 - 0.03} />}
      </group>
    );
  }

  // Painel ripado / painel TV / nichos
  if (cat === "painel" || cat === "nicho") {
    if (id === "painel-ripado") {
      const slats = Math.max(8, Math.round(w / 0.1));
      return (
        <group>
          <mesh position={[0, h / 2, 0]} receiveShadow>
            <boxGeometry args={[w, h, d * 0.4]} />
            <meshStandardMaterial color="#120d09" roughness={0.9} />
          </mesh>
          {Array.from({ length: slats }).map((_, i) => (
            <mesh key={i} position={[-w / 2 + (w * (i + 0.5)) / slats, h / 2, d / 2]} castShadow>
              <boxGeometry args={[(w / slats) * 0.62, h * 0.99, d]} />
              <meshStandardMaterial {...s} />
            </mesh>
          ))}
          {c.led && (
            <mesh position={[0, h / 2, -d * 0.1]}>
              <planeGeometry args={[w * 0.98, h * 0.98]} />
              <meshStandardMaterial color="#2a1d10" emissive="#c98e4a" emissiveIntensity={0.8} />
            </mesh>
          )}
        </group>
      );
    }
    if (id === "painel-tv") {
      return (
        <group>
          <Body w={w} h={h} d={d} s={s} />
          <mesh position={[0, h * 0.58, d / 2 + 0.02]}>
            <boxGeometry args={[w * 0.6, h * 0.4, 0.04]} />
            <meshStandardMaterial color="#0a0a0c" roughness={0.25} metalness={0.4} />
          </mesh>
          {c.led && <Led w={w * 0.9} y={h * 0.06} z={d / 2 + 0.01} />}
        </group>
      );
    }
    // nichos: grade de caixas iluminadas
    const cols = Math.max(2, Math.round(w / 0.6));
    const rows = Math.max(1, Math.round(h / 0.6));
    return (
      <group>
        <mesh position={[0, h / 2, 0]} receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial {...s} />
        </mesh>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const cx = -w / 2 + (w * ((i % cols) + 0.5)) / cols;
          const cy = (h * (Math.floor(i / cols) + 0.5)) / rows;
          return (
            <mesh key={i} position={[cx, cy, d / 2 - 0.04]}>
              <boxGeometry args={[(w / cols) * 0.8, (h / rows) * 0.8, 0.02]} />
              <meshStandardMaterial color="#2a1d10" emissive={c.led ? "#c98e4a" : "#000"} emissiveIntensity={c.led ? 0.7 : 0} roughness={0.7} />
            </mesh>
          );
        })}
      </group>
    );
  }

  // Mesa de exposição: tampo + coluna/pernas
  if (cat === "mesa") {
    const topH = 0.05;
    return (
      <group>
        <mesh position={[0, h - topH / 2, 0]} castShadow>
          <cylinderGeometry args={[Math.min(w, d) / 2, Math.min(w, d) / 2, topH, 32]} />
          <meshStandardMaterial {...s} />
        </mesh>
        <mesh position={[0, (h - topH) / 2, 0]}>
          <cylinderGeometry args={[0.07, 0.1, h - topH, 16]} />
          <meshStandardMaterial {...DARK} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[Math.min(w, d) * 0.32, Math.min(w, d) * 0.34, 0.04, 24]} />
          <meshStandardMaterial {...DARK} />
        </mesh>
      </group>
    );
  }

  // Vitrine: base + redoma de vidro + montantes de latão + LED
  if (cat === "vitrine") {
    const baseH = h * 0.35;
    const glassH = h - baseH;
    return (
      <group>
        <Kick w={w} d={d} />
        <Body w={w} h={baseH} d={d} s={s} y={baseH / 2} />
        <StoneTop w={w} d={d} y={baseH} stone={stone} />
        {[[-w / 2 + 0.03, -d / 2 + 0.03], [-w / 2 + 0.03, d / 2 - 0.03], [w / 2 - 0.03, -d / 2 + 0.03], [w / 2 - 0.03, d / 2 - 0.03]].map(([x, z], i) => (
          <mesh key={i} position={[x, baseH + glassH / 2, z]}>
            <boxGeometry args={[0.03, glassH, 0.03]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
        ))}
        <mesh position={[0, baseH + glassH / 2, 0]}>
          <boxGeometry args={[w - 0.06, glassH, d - 0.06]} />
          <meshStandardMaterial color="#cfd8da" roughness={0.06} metalness={0.2} transparent opacity={0.18} />
        </mesh>
        {c.led && <Led w={w * 0.8} y={h - 0.04} z={0} />}
      </group>
    );
  }

  // Closet modular: corpo + divisórias + cabide + gavetas
  if (cat === "closet") {
    return (
      <group>
        <Kick w={w} d={d} />
        <Body w={w} h={h - 0.06} d={d} s={s} y={(h - 0.06) / 2 + 0.06} />
        {/* divisórias verticais */}
        {[-w / 6, w / 6].map((x, i) => (
          <mesh key={i} position={[x, h / 2, 0]}>
            <boxGeometry args={[0.03, h - 0.12, d * 0.9]} />
            <meshStandardMaterial {...s} />
          </mesh>
        ))}
        {/* cabide (barra) no vão central */}
        <mesh position={[0, h * 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, w / 3, 10]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <Drawers w={w / 3} h={h * 0.45} d={d} n={Math.max(2, Math.min(4, c.drawers))} handle={c.handle} y0={0.06} hh={h * 0.4} />
        {c.led && <Led w={w * 0.9} y={h - 0.08} z={d / 2 - 0.04} />}
      </group>
    );
  }

  // Gaveteiro: só gavetas
  if (cat === "gaveteiro") {
    return (
      <group>
        <Kick w={w} d={d} />
        <Body w={w} h={h - 0.06} d={d} s={s} y={(h - 0.06) / 2 + 0.06} />
        <Drawers w={w} h={h - 0.06} d={d} n={Math.max(2, c.drawers)} handle={c.handle} y0={0.06} hh={h - 0.06} />
      </group>
    );
  }

  // Aéreo: corpo suspenso + portas + LED inferior
  if (cat === "aereo") {
    return (
      <group>
        <Body w={w} h={h} d={d} s={s} />
        <Doors w={w} h={h} d={d} n={Math.max(1, c.doors)} handle={c.handle} />
        {c.led && <Led w={w * 0.94} y={0.01} z={d / 2 - 0.02} />}
      </group>
    );
  }

  // Armário (padrão): corpo + portas + gavetas + tampo + rodapé
  const bodyH = h - 0.06;
  return (
    <group>
      {!c.suspended && <Kick w={w} d={d} />}
      <Body w={w} h={bodyH} d={d} s={s} y={c.suspended ? bodyH / 2 : bodyH / 2 + 0.06} />
      <group position={[0, c.suspended ? 0 : 0.06, 0]}>
        {c.doors > 0 && <Doors w={w} h={bodyH} d={d} n={c.doors} handle={c.handle} />}
        {c.drawers > 0 && <Drawers w={w} h={bodyH} d={d} n={c.drawers} handle={c.handle} y0={0} hh={Math.min(bodyH, c.drawers * 0.2)} />}
      </group>
      {c.led && <Led w={w * 0.92} y={h - 0.04} z={d / 2 - 0.02} />}
    </group>
  );
}

/* ---------- modelo isolado (sem posição/seleção) p/ thumbnails do catálogo ---------- */
export function FurniturePreviewModel({ f }: { f: PlacedFurniture }) {
  const w = f.width * M;
  const s = useMemo(
    () => getSurface(f.config.material, f.config.surface, f.config.finish, rep(w)),
    [f.config.material, f.config.surface, f.config.finish, w]
  );
  const stone = useMemo(() => stoneTexture(), []);
  return <CategoryModel f={f} s={s} stone={stone} />;
}

/* ---------- modelo 3D importado pelo cliente ---------- */
function ImportedModel({ f }: { f: PlacedFurniture }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const url = f.config.modelUrl!;
  const fmt = (f.config.modelFormat || "glb") as ModelFormat;
  const w = f.width * M;
  const h = f.height * M;
  const d = f.depth * M;

  useEffect(() => {
    let alive = true;
    setObj(null);
    loadModelObject(url, fmt)
      .then((o) => {
        if (!alive) return;
        fitObject(o, { w, h, d });
        setObj(o);
      })
      .catch(() => {
        /* arquivo inválido: mostra o placeholder */
      });
    return () => {
      alive = false;
    };
  }, [url, fmt, w, h, d]);

  if (!obj) {
    // placeholder enquanto carrega / se falhar
    return (
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#3a3128" roughness={0.8} transparent opacity={0.5} />
      </mesh>
    );
  }
  return <primitive object={obj} />;
}

interface Props {
  f: PlacedFurniture;
  selected: boolean;
  floorY: number;
  onPointerDown: (e: any) => void;
}

export default function FurnitureMesh({ f, selected, floorY, onPointerDown }: Props) {
  const w = f.width * M;
  const h = f.height * M;
  const d = f.depth * M;
  const s = useMemo(
    () => getSurface(f.config.material, f.config.surface, f.config.finish, rep(w)),
    [f.config.material, f.config.surface, f.config.finish, w]
  );
  const stone = useMemo(() => stoneTexture(), []);

  return (
    <group
      position={[f.position[0], floorY + f.position[1], f.position[2]]}
      rotation={[0, f.rotationY, 0]}
      onPointerDown={onPointerDown}
    >
      {f.config.modelUrl ? <ImportedModel f={f} /> : <CategoryModel f={f} s={s} stone={stone} />}

      {/* contorno de seleção */}
      {selected && (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w, h, d]} />
          <meshBasicMaterial visible={false} />
          <Edges color="#D8B978" />
        </mesh>
      )}

      {/* halo no piso (seleção / travado) */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -f.position[1] + 0.002, 0]}>
          <ringGeometry args={[Math.max(w, d) * 0.58, Math.max(w, d) * 0.62, 40]} />
          <meshBasicMaterial color={f.locked ? "#c46a6a" : "#D8B978"} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}
