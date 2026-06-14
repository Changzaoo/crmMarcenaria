import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, OrthographicCamera, PointerLockControls } from "@react-three/drei";
import { Group, Vector3 } from "three";
import type { CameraMode, Role } from "../types";
import Avatar from "./Avatar";

// Teclado WASD / setas compartilhado.
function useKeyboard() {
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return keys;
}

interface Props {
  mode: CameraMode;
  role: Role;
  name: string;
  bounds: { L: number; C: number };
  floorY: number; // altura da base do andar ativo
  orbitEnabled: boolean;
  onSelfMove: (x: number, z: number, ry: number) => void;
  onMovingChange: (moving: boolean) => void;
}

export default function PlayerAndCamera({
  mode,
  role,
  name,
  bounds,
  floorY,
  orbitEnabled,
  onSelfMove,
  onMovingChange,
}: Props) {
  const keys = useKeyboard();
  const avatar = useRef<Group>(null);
  const pos = useRef({ x: 0, z: bounds.C / 2 - 1.2, ry: Math.PI });
  const lastSent = useRef(0);
  const wasMoving = useRef(false);
  const { camera } = useThree();
  const set = useThree((s) => s.set);
  const size = useThree((s) => s.size);
  // ref compartilhado entre as câmeras (só uma monta por vez); `any` evita o
  // conflito de tipos entre PerspectiveCamera e OrthographicCamera.
  const camRef = useRef<any>(null);

  const walk = mode === "primeira" || mode === "terceira";
  const maxDim = Math.max(bounds.L, bounds.C);
  const orthoZoom = Math.max(
    24,
    Math.min(80, Math.min(size.width / (maxDim * 1.6), size.height / (maxDim * 1.6)))
  );

  // Força a câmera do modo atual a ser a câmera ativa do R3F. Sem isto, o
  // `makeDefault` do drei às vezes não assume (StrictMode/timing) e a cena fica
  // sendo vista pela câmera padrão do R3F — colada na origem, parecendo "preta".
  useLayoutEffect(() => {
    const cam = camRef.current;
    if (!cam) return;
    set({ camera: cam });
    if (mode === "isometrica") cam.lookAt(0, floorY + 0.5, 0);
    if (mode === "topo") cam.lookAt(0, floorY, 0);
    cam.updateProjectionMatrix?.();
  }, [floorY, mode, orthoZoom, set]);

  useFrame((state, delta) => {
    const k = keys.current;
    const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const side = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let moving = false;

    if (walk) {
      const speed = 2.4 * delta;
      const turn = 2.2 * delta;
      if (mode === "terceira") {
        // A/D giram, W/S andam na direção
        pos.current.ry -= side * turn;
        if (fwd !== 0) {
          pos.current.x += Math.sin(pos.current.ry) * fwd * speed;
          pos.current.z += Math.cos(pos.current.ry) * fwd * speed;
          moving = true;
        }
      } else {
        // primeira pessoa: move relativo ao yaw da câmera (mantido pelo PointerLock)
        const yaw = camera.rotation.y;
        if (fwd !== 0 || side !== 0) {
          const fX = -Math.sin(yaw);
          const fZ = -Math.cos(yaw);
          const rX = Math.cos(yaw);
          const rZ = -Math.sin(yaw);
          pos.current.x += (fX * fwd + rX * side) * speed;
          pos.current.z += (fZ * fwd + rZ * side) * speed;
          pos.current.ry = yaw;
          moving = true;
        }
      }

      // limites do ambiente
      const m = 0.3;
      pos.current.x = Math.max(-bounds.L / 2 + m, Math.min(bounds.L / 2 - m, pos.current.x));
      pos.current.z = Math.max(-bounds.C / 2 + m, Math.min(bounds.C / 2 - m, pos.current.z));
    }

    if (avatar.current) {
      avatar.current.position.set(pos.current.x, floorY, pos.current.z);
      avatar.current.rotation.y = pos.current.ry;
    }

    // Câmera
    if (mode === "terceira") {
      const camOffset = new Vector3(
        pos.current.x - Math.sin(pos.current.ry) * 3.4,
        floorY + 2.4,
        pos.current.z - Math.cos(pos.current.ry) * 3.4
      );
      camera.position.lerp(camOffset, 0.12);
      camera.lookAt(pos.current.x, floorY + 1.1, pos.current.z);
    } else if (mode === "primeira") {
      camera.position.set(pos.current.x, floorY + 1.62, pos.current.z);
    }

    // estado "andando" para animar o avatar
    if (moving !== wasMoving.current) {
      wasMoving.current = moving;
      onMovingChange(moving);
    }

    // throttle do envio de presença
    const now = state.clock.elapsedTime;
    if (now - lastSent.current > 0.12) {
      lastSent.current = now;
      onSelfMove(+pos.current.x.toFixed(2), +pos.current.z.toFixed(2), +pos.current.ry.toFixed(2));
    }
  });

  return (
    <>
      {/* Câmeras */}
      {mode === "primeira" && (
        <PerspectiveCamera ref={camRef} makeDefault fov={70} position={[pos.current.x, floorY + 1.62, pos.current.z]} />
      )}
      {mode === "terceira" && <PerspectiveCamera ref={camRef} makeDefault fov={55} position={[0, floorY + 2.4, 4]} />}
      {mode === "isometrica" && (
        <OrthographicCamera ref={camRef} makeDefault zoom={orthoZoom} position={[maxDim, maxDim + floorY, maxDim]} near={-100} far={1000} />
      )}
      {mode === "topo" && (
        <OrthographicCamera ref={camRef} makeDefault zoom={orthoZoom} position={[0, maxDim * 1.6 + floorY, 0.001]} near={-100} far={1000} />
      )}

      {/* Controles */}
      {mode === "primeira" && <PointerLockControls />}
      {(mode === "isometrica" || mode === "topo") && (
        <OrbitControls
          makeDefault
          enabled={orbitEnabled}
          enableRotate={mode === "isometrica"}
          enablePan
          enableZoom
          maxPolarAngle={mode === "topo" ? 0.01 : Math.PI / 2.1}
          minPolarAngle={mode === "topo" ? 0 : 0.2}
          target={[0, floorY + 0.5, 0]}
        />
      )}

      {/* Avatar local (oculto em primeira pessoa) */}
      {mode !== "primeira" && (
        <group ref={avatar}>
          <Avatar role={role} name={name} moving={wasMoving.current} />
        </group>
      )}
    </>
  );
}
