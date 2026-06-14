import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useStudio } from "../store";
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
  const { doc, cameraMode, selectedUid, select, updateFurniture, readOnly, activeFloor, wallMode, isFloorVisible } = useStudio();
  const [dragging, setDragging] = useState(false);
  const [, setMoving] = useState(false);

  const env = doc.environment;
  const H = Math.max(2, env.peDireito);
  const bounds = { L: Math.max(1, env.largura), C: Math.max(1, env.comprimento) };
  const draggable = !readOnly && (cameraMode === "isometrica" || cameraMode === "topo");
  const floorY = activeFloor * H;

  return (
    <Canvas shadows dpr={[1, 1.8]} gl={{ antialias: true }} onPointerMissed={() => select(null)}>
      <color attach="background" args={["#0b0a09"]} />
      <fog attach="fog" args={["#0b0a09", 18, 42]} />

      {/* Iluminação premium */}
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#fff4e0", "#1a1612", 0.5]} />
      <directionalLight
        position={[6, 9, 5]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {/* luz de preenchimento quente para dar volume sem depender de HDR externo */}
      <pointLight position={[-4, 3, -4]} intensity={0.4} color="#ffd9a0" />

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
        onSelfMove={onSelfMove}
        onMovingChange={(m) => { setMoving(m); onMoving?.(m); }}
      />

      <ContactShadows position={[0, floorY + 0.005, 0]} opacity={0.45} scale={Math.max(bounds.L, bounds.C) * 1.4} blur={2.4} far={4} />
    </Canvas>
  );
}
