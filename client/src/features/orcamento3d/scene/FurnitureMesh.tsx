import { useMemo, useRef } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { Edges, Html } from "@react-three/drei";
import { Plane as ThreePlane, Vector3 } from "three";
import type { FurnitureInstance } from "../types";
import { getMaterial } from "../materials";
import type { FurnitureKind } from "../furnitureCatalog";
import { getFurnitureDef } from "../furnitureCatalog";

const STONE = "#dedbd4";
const BRASS = "#c8a24a";

interface Props {
  item: FurnitureInstance;
  selected: boolean;
  draggable: boolean;
  floorY: number; // altura da base do andar do móvel
  ghost?: boolean; // andares inativos ficam translúcidos / não interativos
  bounds: { L: number; C: number };
  onSelect: () => void;
  onMove: (x: number, z: number) => void;
  onDragState: (dragging: boolean) => void;
}

export default function FurnitureMesh({ item, selected, draggable, floorY, ghost = false, bounds, onSelect, onMove, onDragState }: Props) {
  const dragging = useRef(false);
  const mat = getMaterial(item.material);
  const color = item.color || mat.color;
  const w = item.width;
  const h = item.height;
  const d = item.depth;

  // Plano de arraste na altura do andar do móvel.
  const floorPlane = useMemo(() => new ThreePlane(new Vector3(0, 1, 0), -floorY), [floorY]);

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    if (ghost) return;
    e.stopPropagation();
    onSelect();
    if (!draggable || item.locked) return;
    dragging.current = true;
    onDragState(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    e.stopPropagation();
    const hit = new Vector3();
    if (e.ray.intersectPlane(floorPlane, hit)) {
      const half = w / 2;
      const halfD = d / 2;
      const x = Math.max(-bounds.L / 2 + half, Math.min(bounds.L / 2 - half, hit.x));
      const z = Math.max(-bounds.C / 2 + halfD, Math.min(bounds.C / 2 - halfD, hit.z));
      onMove(+x.toFixed(3), +z.toFixed(3));
    }
  };

  const handleUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    dragging.current = false;
    onDragState(false);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const kind: FurnitureKind = getFurnitureDef(item.catalogId)?.kind ?? "cabinet";

  return (
    <group
      position={[item.x, floorY, item.z]}
      rotation={[0, item.rotation, 0]}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
    >
      <Geometry kind={kind} w={w} h={h} d={d} color={color} mat={mat} />

      {/* Seleção: contorno + halo no piso + medidas */}
      {selected && !ghost && (
        <>
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[w + 0.02, h + 0.02, d + 0.02]} />
            <meshBasicMaterial transparent opacity={0} />
            <Edges color={item.locked ? "#f87171" : "#D8B978"} threshold={15} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[Math.max(w, d) * 0.62, Math.max(w, d) * 0.62 + 0.06, 40]} />
            <meshBasicMaterial color={item.locked ? "#f87171" : "#D8B978"} transparent opacity={0.7} />
          </mesh>
          <Html position={[0, h + 0.18, 0]} center distanceFactor={11} occlude={false} zIndexRange={[22, 10]}>
            <div className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-champagne whitespace-nowrap select-none">
              {(w * 100).toFixed(0)}×{(d * 100).toFixed(0)}×{(h * 100).toFixed(0)} cm{item.locked ? " 🔒" : ""}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

// ---------- Geometria por tipo ----------
function Body({ w, h, d, color, mat, y = h / 2 }: any) {
  return (
    <mesh position={[0, y, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={mat.roughness} metalness={mat.metalness} />
    </mesh>
  );
}

function Slab({ w, d, y, color = STONE, depth = 0.04 }: any) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <boxGeometry args={[w, depth, d]} />
      <meshStandardMaterial color={color} roughness={0.25} metalness={0.05} />
    </mesh>
  );
}

function Geometry({ kind, w, h, d, color, mat }: { kind: FurnitureKind; w: number; h: number; d: number; color: string; mat: any }) {
  switch (kind) {
    case "counter":
    case "bench":
      return (
        <group>
          <Body w={w} h={h - 0.05} d={d} color={color} mat={mat} y={(h - 0.05) / 2} />
          <Slab w={w + 0.04} d={d + 0.04} y={h - 0.02} color={kind === "bench" ? STONE : color} />
        </group>
      );
    case "island":
      return (
        <group>
          <Body w={w} h={h - 0.05} d={d} color={color} mat={mat} y={(h - 0.05) / 2} />
          <Slab w={w + 0.12} d={d + 0.12} y={h} depth={0.05} color={STONE} />
        </group>
      );
    case "shelf": {
      const n = Math.max(2, Math.floor(h / 0.4));
      return (
        <group>
          <mesh position={[-w / 2 + 0.02, h / 2, 0]} castShadow>
            <boxGeometry args={[0.03, h, d]} />
            <meshStandardMaterial color={color} roughness={mat.roughness} metalness={mat.metalness} />
          </mesh>
          <mesh position={[w / 2 - 0.02, h / 2, 0]} castShadow>
            <boxGeometry args={[0.03, h, d]} />
            <meshStandardMaterial color={color} roughness={mat.roughness} metalness={mat.metalness} />
          </mesh>
          {Array.from({ length: n }).map((_, i) => (
            <mesh key={i} position={[0, (i / (n - 1)) * (h - 0.04) + 0.02, 0]} castShadow>
              <boxGeometry args={[w, 0.025, d]} />
              <meshStandardMaterial color={color} roughness={mat.roughness} metalness={mat.metalness} />
            </mesh>
          ))}
        </group>
      );
    }
    case "gondola": {
      const n = 3;
      return (
        <group>
          <mesh position={[0, h / 2, 0]} castShadow>
            <boxGeometry args={[0.06, h, d * 0.4]} />
            <meshStandardMaterial color={color} roughness={mat.roughness} metalness={mat.metalness} />
          </mesh>
          {[-1, 1].map((s) =>
            Array.from({ length: n }).map((_, i) => (
              <mesh key={`${s}-${i}`} position={[s * (d * 0.25), 0.4 + i * (h - 0.4) / n, 0]} rotation={[0, s < 0 ? Math.PI : 0, 0]} castShadow>
                <boxGeometry args={[d * 0.45, 0.02, w * 0.9]} />
                <meshStandardMaterial color={color} roughness={mat.roughness} metalness={mat.metalness} />
              </mesh>
            ))
          )}
        </group>
      );
    }
    case "table": {
      const legH = h - 0.05;
      const lx = w / 2 - 0.06;
      const lz = d / 2 - 0.06;
      return (
        <group>
          <Slab w={w} d={d} y={h - 0.025} depth={0.05} color={color} />
          {[[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].map(([x, z], i) => (
            <mesh key={i} position={[x, legH / 2, z]} castShadow>
              <boxGeometry args={[0.05, legH, 0.05]} />
              <meshStandardMaterial color={color} roughness={mat.roughness} metalness={mat.metalness} />
            </mesh>
          ))}
        </group>
      );
    }
    case "tvpanel":
      return (
        <group>
          <Body w={w} h={h} d={d} color={color} mat={mat} />
          <mesh position={[0, h * 0.55, d / 2 + 0.01]}>
            <boxGeometry args={[w * 0.6, h * 0.4, 0.02]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.4} />
          </mesh>
        </group>
      );
    case "niche": {
      const cols = Math.max(2, Math.round(w / 0.5));
      const rows = Math.max(2, Math.round(h / 0.5));
      return (
        <group>
          <Body w={w} h={h} d={d} color={color} mat={mat} />
          {Array.from({ length: cols * rows }).map((_, i) => {
            const cx = (i % cols);
            const cy = Math.floor(i / cols);
            const cw = w / cols;
            const ch = h / rows;
            return (
              <mesh key={i} position={[-w / 2 + cw * (cx + 0.5), ch * (cy + 0.5), d / 2 + 0.001]}>
                <boxGeometry args={[cw * 0.8, ch * 0.8, 0.02]} />
                <meshStandardMaterial color="#0d0b09" roughness={1} />
              </mesh>
            );
          })}
        </group>
      );
    }
    case "display":
      return (
        <group>
          <Body w={w} h={0.25} d={d} color={color} mat={mat} y={0.125} />
          <mesh position={[0, 0.25 + (h - 0.25) / 2, 0]}>
            <boxGeometry args={[w, h - 0.25, d]} />
            <meshStandardMaterial color="#bcd2da" roughness={0.05} metalness={0.1} transparent opacity={0.28} />
            <Edges color={BRASS} threshold={15} />
          </mesh>
        </group>
      );
    case "reception":
      return (
        <group>
          <Body w={w} h={h} d={d} color={color} mat={mat} />
          <Slab w={w + 0.08} d={d + 0.08} y={h + 0.01} depth={0.05} color={STONE} />
        </group>
      );
    case "wardrobe":
    case "cabinet":
    default:
      return (
        <group>
          {/* base / pés */}
          <mesh position={[0, 0.05, 0]} castShadow>
            <boxGeometry args={[w - 0.04, 0.1, d - 0.04]} />
            <meshStandardMaterial color="#15120f" roughness={0.9} />
          </mesh>
          <Body w={w} h={h - 0.1} d={d} color={color} mat={mat} y={0.1 + (h - 0.1) / 2} />
          {/* divisão de portas */}
          <mesh position={[0, h / 2, d / 2 + 0.001]}>
            <boxGeometry args={[0.008, h - 0.16, 0.005]} />
            <meshStandardMaterial color="#0d0b09" />
          </mesh>
          {/* puxadores */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.06, h * 0.55, d / 2 + 0.02]} castShadow>
              <boxGeometry args={[0.015, h * 0.3, 0.015]} />
              <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.85} />
            </mesh>
          ))}
        </group>
      );
  }
}
