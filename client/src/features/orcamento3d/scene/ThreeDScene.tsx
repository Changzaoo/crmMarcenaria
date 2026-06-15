import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useStudio } from "../store";
import { SceneEnvironment } from "../../../shared3d";
import type { Peer, Role } from "../types";
import Room from "./Room";
import FurnitureMesh from "./FurnitureMesh";
import Avatar from "./Avatar";
import PlayerAndCamera from "./PlayerAndCamera";

interface Props {
  peers: Peer[];
  selfPeerId: string;
  role: Role;
  name: string;
  touch?: boolean;
  onSelfMove: (x: number, z: number, ry: number) => void;
  onMoving?: (moving: boolean) => void;
}

export default function ThreeDScene({ peers, selfPeerId, role, name, touch, onSelfMove, onMoving }: Props) {
  const { doc, cameraMode, cursorMode, selectedUid, select, updateFurniture, readOnly, activeFloor, wallMode, isFloorVisible } = useStudio();
  const [dragging, setDragging] = useState(false);
  const [, setMoving] = useState(false);

  const env = doc.environment;
  const H = Math.max(2, env.peDireito);
  const bounds = { L: Math.max(1, env.largura), C: Math.max(1, env.comprimento) };
  const walk = cameraMode === "primeira" || cameraMode === "terceira";
  // arrasta nos modos de planta; em 1ª/3ª pessoa só com o modo cursor ligado
  const draggable = !readOnly && (cameraMode === "isometrica" || cameraMode === "topo" || (walk && cursorMode));
  const floorY = activeFloor * H;

  // móveis do andar ativo viram obstáculos de colisão para o avatar
  const obstacles = doc.furniture
    .filter((f) => (f.floor ?? 0) === activeFloor)
    .map((f) => ({ x: f.x, z: f.z, hw: f.width / 2, hd: f.depth / 2 }));

  return (
    <Canvas shadows dpr={[1, 1.8]} gl={{ antialias: true }} onPointerMissed={() => select(null)}>
      {/* Ambiente de render ÚNICO (fonte: shared3d) — idêntico no site e no CRM */}
      <SceneEnvironment maxDim={Math.max(bounds.L, bounds.C)} mobile={!!touch} />

      <Room env={env} wallMode={wallMode} activeFloor={activeFloor} isFloorVisible={isFloorVisible} />

      {doc.furniture.map((item) => {
        const floor = item.floor ?? 0;
        if (!isFloorVisible(floor)) return null;
        const ghost = floor !== activeFloor; // só o andar ativo é interativo
        return (
          <FurnitureMesh
            key={item.uid}
            item={item}
            selected={item.uid === selectedUid}
            draggable={draggable && !ghost}
            ghost={ghost}
            floorY={floor * H}
            bounds={bounds}
            onSelect={() => select(item.uid)}
            onMove={(x, z) => updateFurniture(item.uid, { x, z })}
            onDragState={setDragging}
          />
        );
      })}

      {/* Participantes remotos — cada um no Y do seu próprio andar */}
      {peers
        .filter((p) => p.peerId !== selfPeerId)
        .filter((p) => isFloorVisible(p.floor ?? 0))
        .map((p) => (
          <group key={p.peerId} position={[p.x, (p.floor ?? 0) * H, p.z]} rotation={[0, p.ry, 0]}>
            <Avatar role={p.role} name={p.nome} moving={!!p.moving} color={p.color || undefined} />
          </group>
        ))}

      <PlayerAndCamera
        mode={cameraMode}
        role={role}
        name={name}
        bounds={bounds}
        floorY={floorY}
        orbitEnabled={!dragging}
        touch={touch}
        cursorMode={cursorMode}
        obstacles={obstacles}
        onSelfMove={onSelfMove}
        onMovingChange={(m) => { setMoving(m); onMoving?.(m); }}
      />
    </Canvas>
  );
}
