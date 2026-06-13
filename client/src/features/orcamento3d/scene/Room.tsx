import { useMemo } from "react";
import { Grid, Html } from "@react-three/drei";
import { DoubleSide, BackSide, PlaneGeometry } from "three";
import type { EnvironmentConfig, WallMode } from "../types";

const FLOOR_COLOR = "#26221d";
const SLAB_COLOR = "#1f1b16";
const WALL_COLOR = "#171411";

interface Props {
  env: EnvironmentConfig;
  wallMode: WallMode;
  activeFloor: number;
  isFloorVisible: (floor: number) => boolean;
}

// Ambiente gerado automaticamente, agora com MÚLTIPLOS ANDARES e controle de
// paredes estilo The Sims (altas / rebaixadas / invisíveis) e visibilidade por andar.
export default function Room({ env, wallMode, activeFloor, isFloorVisible }: Props) {
  const L = Math.max(1, env.largura); // X
  const C = Math.max(1, env.comprimento); // Z
  const H = Math.max(2, env.peDireito); // altura de cada andar
  const floors = Math.max(1, Math.round(env.andares || 1));

  const outline = useMemo(() => {
    const geo = new PlaneGeometry(L, C);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [L, C]);

  return (
    <group>
      {Array.from({ length: floors }).map((_, f) => {
        if (!isFloorVisible(f)) return null;
        const baseY = f * H;
        const ativo = f === activeFloor;
        return (
          <Floor
            key={f}
            f={f}
            baseY={baseY}
            L={L}
            C={C}
            H={H}
            wallMode={wallMode}
            ativo={ativo}
            outline={outline}
            isGround={f === 0}
            formato={env.formato}
          />
        );
      })}

      {/* Escadas conectando os andares (visual, quando há mais de um andar) */}
      {floors > 1 &&
        Array.from({ length: floors - 1 }).map((_, f) => {
          if (!isFloorVisible(f)) return null;
          return <Stairs key={`s${f}`} baseY={f * H} H={H} L={L} C={C} />;
        })}

      {/* Medidas do ambiente (no andar ativo) */}
      <Html position={[0, activeFloor * H + 0.02, C / 2 + 0.25]} center distanceFactor={12} occlude={false}>
        <div className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-champagne whitespace-nowrap select-none">
          {L.toFixed(2)} m
        </div>
      </Html>
      <Html position={[L / 2 + 0.25, activeFloor * H + 0.02, 0]} center distanceFactor={12} occlude={false}>
        <div className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-champagne whitespace-nowrap select-none">
          {C.toFixed(2)} m
        </div>
      </Html>
    </group>
  );
}

function Floor({
  f,
  baseY,
  L,
  C,
  H,
  wallMode,
  ativo,
  outline,
  isGround,
  formato,
}: {
  f: number;
  baseY: number;
  L: number;
  C: number;
  H: number;
  wallMode: WallMode;
  ativo: boolean;
  outline: PlaneGeometry;
  isGround: boolean;
  formato: EnvironmentConfig["formato"];
}) {
  // Altura efetiva da parede conforme o modo (Sims): cheia, rebaixada ou nenhuma.
  const wallH = wallMode === "down" ? 0 : wallMode === "cut" ? Math.min(1.1, H) : H;
  const showWalls = wallH > 0;

  return (
    <group>
      {/* Laje / piso do andar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, baseY, 0]} receiveShadow>
        <planeGeometry args={[L, C]} />
        <meshStandardMaterial
          color={isGround ? FLOOR_COLOR : SLAB_COLOR}
          roughness={0.9}
          metalness={0}
          side={DoubleSide}
        />
      </mesh>

      {/* Recorte visual para formato em L (aproximação) */}
      {formato === "L" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[L / 4, baseY + 0.01, -C / 4]}>
          <planeGeometry args={[L / 2, C / 2]} />
          <meshStandardMaterial color="#0f0d0b" roughness={1} />
        </mesh>
      )}

      {/* Grid sutil — destacado no andar ativo */}
      <Grid
        position={[0, baseY + 0.012, 0]}
        args={[L, C]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={ativo ? "#4a4234" : "#332e26"}
        sectionSize={1}
        sectionThickness={1}
        sectionColor={ativo ? "#6a5b3f" : "#42392c"}
        fadeDistance={Math.max(L, C) * 2.4}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Paredes — faces internas (BackSide) = "casa de boneca" aberta */}
      {showWalls && (
        <group position={[0, baseY, 0]}>
          <mesh position={[0, wallH / 2, -C / 2]}>
            <planeGeometry args={[L, wallH]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={0.95} side={BackSide} />
          </mesh>
          <mesh position={[0, wallH / 2, C / 2]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[L, wallH]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={0.95} side={BackSide} />
          </mesh>
          <mesh position={[-L / 2, wallH / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[C, wallH]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={0.95} side={BackSide} />
          </mesh>
          <mesh position={[L / 2, wallH / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[C, wallH]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={0.95} side={BackSide} />
          </mesh>
        </group>
      )}

      {/* Contorno do andar — champagne se ativo, discreto se não */}
      <lineSegments position={[0, baseY + 0.02, 0]}>
        <edgesGeometry args={[outline]} />
        <lineBasicMaterial color={ativo ? "#D8B978" : "#5b513f"} transparent opacity={ativo ? 0.6 : 0.3} />
      </lineSegments>
    </group>
  );
}

// Escada simples (degraus) num canto, conectando um andar ao de cima.
function Stairs({ baseY, H, L, C }: { baseY: number; H: number; L: number; C: number }) {
  const steps = Math.max(6, Math.round(H / 0.18));
  const stepH = H / steps;
  const stepD = 0.26;
  const width = 1.0;
  const x0 = -L / 2 + width / 2 + 0.1;
  const z0 = C / 2 - 0.2;
  return (
    <group position={[x0, baseY, z0]}>
      {Array.from({ length: steps }).map((_, i) => (
        <mesh key={i} position={[0, stepH * (i + 0.5), -stepD * i]} castShadow receiveShadow>
          <boxGeometry args={[width, stepH, stepD]} />
          <meshStandardMaterial color="#2c2620" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}
