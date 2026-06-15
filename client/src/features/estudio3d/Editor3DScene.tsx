import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PointerLockControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import FurnitureMesh from "./FurnitureMesh";
import Avatar from "./Avatar";
import { SceneEnvironment } from "../../shared3d";
import { fpInput } from "./fpInput";
import {
  actions,
  useOrc3d,
} from "./useOrcamento3DStore";
import { publishCursor, usePeers } from "./presence";
import { myPeerId } from "./collaboration";
import type { EnvironmentConfig, FloorVisibility, PlacedFurniture, ViewMode, WallMode } from "./types";

const FLOOR_COLORS: Record<EnvironmentConfig["floorType"], string> = {
  porcelanato: "#c9c2b5",
  madeira: "#8a5a33",
  cimento: "#7f7f7b",
  claro: "#e3ddd2",
  escuro: "#241f1a",
};

/* ---------- snap ---------- */
function snapPosition(
  x: number,
  z: number,
  f: PlacedFurniture,
  env: EnvironmentConfig,
  others: PlacedFurniture[],
  snap: { enabled: boolean; wall: boolean; corner: boolean; grid: boolean; furniture: boolean }
): [number, number] {
  if (!snap.enabled) return [x, z];
  const halfW = env.width / 200;
  const halfD = env.depth / 200;
  const fw = f.width / 200;
  const fd = f.depth / 200;
  const TH = 0.25; // tolerância de encaixe (m)

  if (snap.wall) {
    if (Math.abs(x - (-halfW + fw)) < TH) x = -halfW + fw;
    if (Math.abs(x - (halfW - fw)) < TH) x = halfW - fw;
    if (Math.abs(z - (-halfD + fd)) < TH) z = -halfD + fd;
    if (Math.abs(z - (halfD - fd)) < TH) z = halfD - fd;
  }
  if (snap.furniture) {
    for (const o of others) {
      if (Math.abs(x - o.position[0]) < TH) x = o.position[0];
      if (Math.abs(z - o.position[2]) < TH) z = o.position[2];
    }
  }
  if (snap.grid) {
    x = Math.round(x / 0.1) * 0.1;
    z = Math.round(z / 0.1) * 0.1;
  }
  // mantém dentro do ambiente
  x = Math.max(-halfW + fw, Math.min(halfW - fw, x));
  z = Math.max(-halfD + fd, Math.min(halfD - fd, z));
  return [x, z];
}

/* ---------- escada simples (degraus) ---------- */
function Stairs({ w, d, fromY, toY }: { w: number; d: number; fromY: number; toY: number }) {
  const steps = Math.max(6, Math.round((toY - fromY) / 0.2));
  const rise = (toY - fromY) / steps;
  const run = 0.28;
  const stepW = Math.min(1.1, w * 0.22);
  // encostada na parede direita, subindo em direção ao fundo
  const x = w / 2 - stepW / 2 - 0.1;
  return (
    <group>
      {Array.from({ length: steps }).map((_, i) => (
        <mesh key={i} position={[x, fromY + rise * (i + 0.5), d / 2 - 0.2 - run * (i + 0.5)]} castShadow receiveShadow>
          <boxGeometry args={[stepW, rise, run]} />
          <meshStandardMaterial color="#5a4636" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- mezanino (laje parcial + guarda-corpo) ---------- */
function Mezzanine({ w, d, y }: { w: number; d: number; y: number }) {
  const slabD = d * 0.4;
  const zCenter = -d / 2 + slabD / 2;
  const front = zCenter + slabD / 2;
  return (
    <group>
      <mesh position={[0, y, zCenter]} castShadow receiveShadow>
        <boxGeometry args={[w - 0.12, 0.12, slabD]} />
        <meshStandardMaterial color="#6b4a30" roughness={0.7} />
      </mesh>
      {/* guarda-corpo na borda frontal */}
      <mesh position={[0, y + 0.5, front]}>
        <boxGeometry args={[w - 0.2, 0.04, 0.04]} />
        <meshStandardMaterial color="#caa86a" roughness={0.4} metalness={0.6} />
      </mesh>
      {Array.from({ length: Math.max(3, Math.round(w / 0.8)) }).map((_, i, arr) => {
        const px = -w / 2 + 0.2 + ((w - 0.4) * i) / (arr.length - 1);
        return (
          <mesh key={i} position={[px, y + 0.27, front]}>
            <boxGeometry args={[0.025, 0.5, 0.025]} />
            <meshStandardMaterial color="#caa86a" roughness={0.4} metalness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

function floorVisible(floor: number, activeFloor: number, mode: FloorVisibility) {
  if (mode === "all") return true;
  if (mode === "current") return floor === activeFloor;
  return floor <= activeFloor;
}

/* ---------- ambiente (pisos, paredes, mezanino, escada) ---------- */
function Room({
  env,
  activeFloor,
  wallMode,
  floorVisibility,
  gridVisible,
  onFloorMove,
  onFloorUp,
}: {
  env: EnvironmentConfig;
  activeFloor: number;
  wallMode: WallMode;
  floorVisibility: FloorVisibility;
  gridVisible: boolean;
  onFloorMove: (e: ThreeEvent<PointerEvent>) => void;
  onFloorUp: () => void;
}) {
  const w = env.width / 100;
  const d = env.depth / 100;
  const h = env.height / 100;
  const floors = Math.max(1, env.floors);
  const wallH = wallMode === "down" ? 0 : wallMode === "cut" ? Math.min(1.15, h) : h;
  const showWalls = wallH > 0;
  const wallMat = { color: env.wallColor, roughness: 0.95, metalness: 0, side: THREE.DoubleSide };

  return (
    <group>
      {Array.from({ length: floors }).map((_, floor) => {
        if (!floorVisible(floor, activeFloor, floorVisibility)) return null;
        const baseY = floor * h;
        const active = floor === activeFloor;
        return (
          <group key={floor}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, baseY, 0]}
              receiveShadow
              onPointerMove={active ? onFloorMove : undefined}
              onPointerUp={active ? onFloorUp : undefined}
            >
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial
                color={floor === 0 ? FLOOR_COLORS[env.floorType] : "#1f1b16"}
                roughness={0.85}
                side={THREE.DoubleSide}
              />
            </mesh>

            {floor > 0 && (
              <mesh position={[0, baseY - 0.04, 0]} receiveShadow castShadow>
                <boxGeometry args={[w, 0.08, d]} />
                <meshStandardMaterial color="#1b1712" roughness={0.85} />
              </mesh>
            )}

            {gridVisible && (
              <Grid
                args={[w, d]}
                cellSize={0.5}
                cellThickness={0.45}
                cellColor={active ? "#4a3b2a" : "#2d261d"}
                sectionSize={1}
                sectionThickness={0.85}
                sectionColor={active ? "#D8B978" : "#4a3c2b"}
                fadeDistance={Math.max(w, d) * 2.2}
                fadeStrength={1}
                position={[0, baseY + 0.012, 0]}
                infiniteGrid={false}
              />
            )}

            {showWalls && (
              <group position={[0, baseY, 0]}>
                <mesh position={[0, wallH / 2, -d / 2]} receiveShadow>
                  <boxGeometry args={[w, wallH, 0.06]} />
                  <meshStandardMaterial {...wallMat} />
                </mesh>
                <mesh position={[-w / 2, wallH / 2, 0]} receiveShadow>
                  <boxGeometry args={[0.06, wallH, d]} />
                  <meshStandardMaterial {...wallMat} />
                </mesh>
                <mesh position={[w / 2, wallH / 2, 0]} receiveShadow>
                  <boxGeometry args={[0.06, wallH, d]} />
                  <meshStandardMaterial {...wallMat} />
                </mesh>
                {!env.hasStorefront && (
                  <mesh position={[0, wallH / 2, d / 2]} receiveShadow>
                    <boxGeometry args={[w, wallH, 0.06]} />
                    <meshStandardMaterial {...wallMat} transparent opacity={wallMode === "cut" ? 0.35 : 0.65} />
                  </mesh>
                )}
              </group>
            )}

            <mesh position={[0, baseY + 0.025, 0]}>
              <boxGeometry args={[w, 0.02, d]} />
              <meshBasicMaterial color={active ? "#D8B978" : "#5b513f"} wireframe transparent opacity={active ? 0.7 : 0.28} />
            </mesh>
          </group>
        );
      })}

      {env.hasMezzanine && floorVisible(0, activeFloor, floorVisibility) && <Mezzanine w={w} d={d} y={h * 0.6} />}
      {env.hasStairs &&
        Array.from({ length: Math.max(0, floors - 1) }).map((_, floor) =>
          floorVisible(floor, activeFloor, floorVisibility) ? (
            <Stairs key={floor} w={w} d={d} fromY={floor * h} toY={(floor + 1) * h} />
          ) : null
        )}
    </group>
  );
}

/* Ponto de "espera" estável onde um participante sem posição própria
   aparece em pé — separado por papel para cliente e arquiteto não se
   sobreporem. Garante que os bonecos sempre apareçam um para o outro. */
function spawnPos(role: "cliente" | "arquiteto", w: number, d: number) {
  const x = role === "arquiteto" ? -Math.min(0.7, w * 0.18) : Math.min(0.7, w * 0.18);
  return { x, z: d * 0.22, ry: Math.PI };
}

/* ---------- avatares dos colaboradores remotos ---------- */
function PresenceAvatars({ floorHeight, roomW, roomD, isFloorVisible }: {
  floorHeight: number;
  roomW: number;
  roomD: number;
  isFloorVisible: (floor: number) => boolean;
}) {
  const peers = usePeers();
  return (
    <>
      {peers
        .filter((p) => p.id !== myPeerId)
        .filter((p) => isFloorVisible(p.cursor?.floor ?? 0))
        .map((p) => {
          const floor = p.cursor?.floor ?? 0;
          const sp = spawnPos(p.role, roomW, roomD);
          const x = p.cursor?.x ?? sp.x;
          const z = p.cursor?.z ?? sp.z;
          const ry = p.cursor?.ry ?? sp.ry;
          return (
            <group key={p.id} position={[x, floor * floorHeight, z]} rotation={[0, ry, 0]}>
              <Avatar role={p.role} name={p.name} moving={!!p.cursor?.moving} />
            </group>
          );
        })}
    </>
  );
}

/* ---------- colisão simples avatar ↔ móveis (AABB no plano XZ) ---------- */
export type Obstacle = { x: number; z: number; hw: number; hd: number };
const AVATAR_R = 0.28; // "raio" do avatar (m)
function hitsObstacle(x: number, z: number, obs: Obstacle[]): boolean {
  for (const o of obs) {
    if (Math.abs(x - o.x) < o.hw + AVATAR_R && Math.abs(z - o.z) < o.hd + AVATAR_R) return true;
  }
  return false;
}

/* ---------- câmera por modo ---------- */
function CameraRig({
  mode,
  env,
  mobile,
  activeFloor,
  role,
  name,
  obstacles,
}: {
  mode: ViewMode;
  env: EnvironmentConfig;
  mobile: boolean;
  activeFloor: number;
  role: "cliente" | "arquiteto";
  name: string;
  obstacles: Obstacle[];
}) {
  const { camera } = useThree();
  const w = env.width / 100;
  const d = env.depth / 100;
  const h = env.height / 100;
  const floorY = activeFloor * h;
  const avatarRef = useRef<THREE.Group>(null);
  const avatarPos = useRef({ x: 0, z: d * 0.25, ry: Math.PI });
  const lastPresence = useRef(0);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (mode === "isometrico") {
      const r = Math.max(w, d);
      camera.up.set(0, 1, 0);
      camera.position.set(r * 0.85, floorY + r * 0.95, r * 0.85);
      camera.lookAt(0, floorY + 0.4, 0);
    } else if (mode === "topo") {
      // Planta baixa real: câmera direto acima, "up" no Y (não no Z — esse era
      // o bug: com up=(0,0,-1) o OrbitControls travava o ângulo polar em 0 e
      // jogava a câmera para uma vista lateral). O OrbitControls trava polar e
      // azimute em 0 (ver abaixo), então fica sempre olhando para baixo.
      const r = Math.max(w, d);
      camera.up.set(0, 1, 0);
      camera.position.set(0, floorY + r * 1.6, 0.001);
      camera.lookAt(0, floorY, 0);
    } else if (mode === "terceira") {
      camera.up.set(0, 1, 0);
      camera.position.set(0, floorY + 2.4, d * 0.45);
      camera.lookAt(0, floorY + 1, 0);
    } else {
      camera.up.set(0, 1, 0);
      camera.position.set(0, floorY + 1.6, d * 0.35);
      camera.lookAt(0, floorY + 1.6, -d / 2);
    }
  }, [mode, w, d, floorY, camera]);

  // movimento primeira pessoa
  useFrame((state, dt) => {
    let isMoving = false;
    if (mode === "terceira") {
      const speed = 1.8 * dt;
      const turn = 2.35 * dt;
      avatarPos.current.ry -= fpInput.strafe * turn;
      const halfW = w / 2 - 0.3;
      const halfD = d / 2 - 0.3;
      if (fpInput.forward) {
        const dx = Math.sin(avatarPos.current.ry) * fpInput.forward * speed;
        const dz = Math.cos(avatarPos.current.ry) * fpInput.forward * speed;
        // move por eixo, respeitando paredes e colidindo com os móveis (desliza)
        const nx = Math.max(-halfW, Math.min(halfW, avatarPos.current.x + dx));
        if (!hitsObstacle(nx, avatarPos.current.z, obstacles)) avatarPos.current.x = nx;
        const nz = Math.max(-halfD, Math.min(halfD, avatarPos.current.z + dz));
        if (!hitsObstacle(avatarPos.current.x, nz, obstacles)) avatarPos.current.z = nz;
        isMoving = true;
      }
      avatarRef.current?.position.set(avatarPos.current.x, floorY, avatarPos.current.z);
      if (avatarRef.current) avatarRef.current.rotation.y = avatarPos.current.ry;

      const camTarget = new THREE.Vector3(
        avatarPos.current.x - Math.sin(avatarPos.current.ry) * 3.3,
        floorY + 2.35,
        avatarPos.current.z - Math.cos(avatarPos.current.ry) * 3.3
      );
      camera.position.lerp(camTarget, 0.12);
      camera.lookAt(avatarPos.current.x, floorY + 1.1, avatarPos.current.z);
    } else if (mode === "primeira") {
    if (mobile && (fpInput.lookDX || fpInput.lookDY)) {
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
      e.y -= fpInput.lookDX * 0.005;
      e.x -= fpInput.lookDY * 0.005;
      e.x = Math.max(-1.2, Math.min(1.2, e.x));
      camera.quaternion.setFromEuler(e);
      fpInput.lookDX = 0;
      fpInput.lookDY = 0;
    }
    const speed = 1.7 * dt;
    const halfW = w / 2 - 0.3;
    const halfD = d / 2 - 0.3;
    if (fpInput.forward || fpInput.strafe) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      dir.y = 0;
      dir.normalize();
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const dxv = dir.x * fpInput.forward * speed + right.x * fpInput.strafe * speed;
      const dzv = dir.z * fpInput.forward * speed + right.z * fpInput.strafe * speed;
      // move por eixo com colisão (desliza ao encostar num móvel)
      const nx = Math.max(-halfW, Math.min(halfW, camera.position.x + dxv));
      if (!hitsObstacle(nx, camera.position.z, obstacles)) camera.position.x = nx;
      const nz = Math.max(-halfD, Math.min(halfD, camera.position.z + dzv));
      if (!hitsObstacle(camera.position.x, nz, obstacles)) camera.position.z = nz;
      isMoving = true;
    }
    camera.position.y = floorY + 1.6;
    }

    if ((mode === "primeira" || mode === "terceira") && state.clock.elapsedTime - lastPresence.current > 0.12) {
      lastPresence.current = state.clock.elapsedTime;
      const x = mode === "terceira" ? avatarPos.current.x : camera.position.x;
      const z = mode === "terceira" ? avatarPos.current.z : camera.position.z;
      const ry = mode === "terceira" ? avatarPos.current.ry : camera.rotation.y;
      publishCursor(+x.toFixed(2), +z.toFixed(2), activeFloor, +ry.toFixed(2), isMoving);
    } else if ((mode === "isometrico" || mode === "topo") && state.clock.elapsedTime - lastPresence.current > 0.6) {
      // sem avatar controlável nesses modos: publica uma posição "em pé"
      // estável (por papel) para o outro participante sempre ver o boneco.
      lastPresence.current = state.clock.elapsedTime;
      const sp = spawnPos(role, w, d);
      publishCursor(sp.x, sp.z, activeFloor, sp.ry, false);
    }
    setMoving((prev) => (prev === isMoving ? prev : isMoving));
  });

  return (
    <>
      {mode === "terceira" && (
        <group ref={avatarRef} position={[avatarPos.current.x, floorY, avatarPos.current.z]} rotation={[0, avatarPos.current.ry, 0]}>
          <Avatar role={role} name={name} moving={moving} />
        </group>
      )}
    </>
  );
}

/* ---------- teclado primeira pessoa (desktop) ---------- */
function useFpKeyboard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") fpInput.forward = 1;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") fpInput.forward = -1;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") fpInput.strafe = -1;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") fpInput.strafe = 1;
    };
    const up = (e: KeyboardEvent) => {
      if (["w", "W", "ArrowUp", "s", "S", "ArrowDown"].includes(e.key)) fpInput.forward = 0;
      if (["a", "A", "ArrowLeft", "d", "D", "ArrowRight"].includes(e.key)) fpInput.strafe = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      fpInput.forward = 0;
      fpInput.strafe = 0;
    };
  }, [active]);
}

/* ---------- captura de tela p/ thumbnail ---------- */
function Capturer() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const handler = () => {
      gl.render(scene, camera);
      try {
        const url = gl.domElement.toDataURL("image/jpeg", 0.5);
        actions.setThumbnail(url);
        window.dispatchEvent(new CustomEvent("orc3d:captured", { detail: url }));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("orc3d:capture", handler);
    return () => window.removeEventListener("orc3d:capture", handler);
  }, [gl, scene, camera]);
  return null;
}

/* ---------- conteúdo da cena ---------- */
function SceneContents({ mobile }: { mobile: boolean }) {
  const env = useOrc3d((s) => s.doc.environment);
  const furniture = useOrc3d((s) => s.doc.furniture);
  const selectedUid = useOrc3d((s) => s.selectedUid);
  const viewMode = useOrc3d((s) => s.viewMode);
  const activeFloor = useOrc3d((s) => s.activeFloor);
  const wallMode = useOrc3d((s) => s.wallMode);
  const floorVisibility = useOrc3d((s) => s.floorVisibility);
  const role = useOrc3d((s) => s.role);
  const clientName = useOrc3d((s) => s.doc.client.name);
  const snap = useOrc3d((s) => s.snap);
  const gridVisible = useOrc3d((s) => s.gridVisible);
  const cursorMode = useOrc3d((s) => s.cursorMode);

  const orbitRef = useRef<any>(null);
  const [draggingUid, setDraggingUid] = useState<string | null>(null);
  const dragBaseY = useRef(0);
  const floorHeight = env.height / 100;
  const activeFloorY = activeFloor * floorHeight;
  const walkMode = viewMode === "primeira" || viewMode === "terceira";

  // móveis do andar ativo viram obstáculos de colisão para o avatar
  const obstacles = useMemo<Obstacle[]>(
    () =>
      furniture
        .filter((f) => (f.floor ?? 0) === activeFloor)
        .map((f) => ({ x: f.position[0], z: f.position[2], hw: f.width / 200, hd: f.depth / 200 })),
    [furniture, activeFloor]
  );
  const isFloorVisible = useMemo(
    () => (floor: number) => floorVisible(floor, activeFloor, floorVisibility),
    [activeFloor, floorVisibility]
  );

  useFpKeyboard((viewMode === "primeira" || viewMode === "terceira") && !mobile);

  // solta o arraste mesmo se o ponteiro sair da cena
  useEffect(() => {
    const up = () => {
      if (draggingUid) {
        setDraggingUid(null);
        if (orbitRef.current) orbitRef.current.enabled = true;
      }
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [draggingUid]);

  const onFurnitureDown = (f: PlacedFurniture) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    actions.select(f.uid);
    if (f.locked || (f.floor ?? 0) !== activeFloor) return;
    // em 1ª/3ª pessoa só arrasta com o modo cursor ligado (ponteiro liberado)
    if (walkMode && !cursorMode) return;
    dragBaseY.current = f.position[1];
    actions.beginDrag();
    setDraggingUid(f.uid);
    if (orbitRef.current) orbitRef.current.enabled = false;
  };

  const onFloorMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingUid) return;
    const f = furniture.find((x) => x.uid === draggingUid);
    if (!f) return;
    const [sx, sz] = snapPosition(
      e.point.x,
      e.point.z,
      f,
      env,
      furniture.filter((o) => o.uid !== draggingUid && (o.floor ?? 0) === (f.floor ?? 0)),
      snap
    );
    actions.moveTo(draggingUid, [sx, dragBaseY.current, sz]);
  };

  const onFloorUp = () => {
    if (!draggingUid) return;
    setDraggingUid(null);
    if (orbitRef.current) orbitRef.current.enabled = true;
  };

  return (
    <>
      {/* Ambiente de render ÚNICO (fonte: shared3d) — idêntico no site e no CRM */}
      <SceneEnvironment maxDim={Math.max(env.width, env.depth) / 100} mobile={mobile} />
      <CameraRig mode={viewMode} env={env} mobile={mobile} activeFloor={activeFloor} role={role} name={clientName || "Cliente"} obstacles={obstacles} />
      <Capturer />

      <Room
        env={env}
        activeFloor={activeFloor}
        wallMode={wallMode}
        floorVisibility={floorVisibility}
        gridVisible={gridVisible}
        onFloorMove={onFloorMove}
        onFloorUp={onFloorUp}
      />
      <PresenceAvatars
        floorHeight={floorHeight}
        roomW={env.width / 100}
        roomD={env.depth / 100}
        isFloorVisible={isFloorVisible}
      />

      {furniture.filter((f) => isFloorVisible(f.floor ?? 0)).map((f) => (
        <FurnitureMesh
          key={f.uid}
          f={f}
          selected={f.uid === selectedUid}
          floorY={(f.floor ?? 0) * floorHeight}
          onPointerDown={onFurnitureDown(f)}
        />
      ))}

      {/* controles por modo */}
      {(viewMode === "isometrico" || viewMode === "topo") && (
        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableDamping={viewMode === "isometrico"}
          dampingFactor={0.1}
          enableRotate={viewMode === "isometrico"}
          minDistance={1.5}
          maxDistance={Math.max(env.width, env.depth) / 40}
          minPolarAngle={viewMode === "topo" ? 0 : 0.2}
          maxPolarAngle={viewMode === "topo" ? 0 : Math.PI / 2.05}
          minAzimuthAngle={viewMode === "topo" ? 0 : -Infinity}
          maxAzimuthAngle={viewMode === "topo" ? 0 : Infinity}
          target={[0, viewMode === "topo" ? activeFloorY : activeFloorY + 0.4, 0]}
        />
      )}
      {viewMode === "primeira" && !mobile && !cursorMode && <PointerLockControls makeDefault />}
    </>
  );
}

export default function Editor3DScene({ mobile }: { mobile: boolean }) {
  return (
    <Canvas
      shadows={!mobile}
      dpr={mobile ? [1, 1.5] : [1, 2]}
      camera={{ fov: mobile ? 60 : 50, near: 0.05, far: 200, position: [8, 9, 8] }}
      gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
      onPointerMissed={() => actions.select(null)}
    >
      <SceneContents mobile={mobile} />
    </Canvas>
  );
}
