import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Group } from "three";
import type { Role } from "../types";

interface Props {
  role: Role;
  name?: string;
  moving?: boolean;
  color?: string;
  label?: boolean;
}

// Avatar humano estilizado feito de primitivas (placeholder premium).
// Preparado para receber um .glb futuramente: basta trocar o conteúdo do group.
export default function Avatar({ role, name, moving = false, color, label = true }: Props) {
  const legs = useRef<Group>(null);
  const body = useRef<Group>(null);

  const skin = "#caa890";
  const outfit = color || (role === "arquiteto" ? "#2f3a4a" : "#7a6a57");
  const accent = role === "arquiteto" ? "#9fb4cc" : "#c9b48f";

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (body.current) {
      // respiração / idle + leve balanço ao andar
      body.current.position.y = Math.sin(t * (moving ? 9 : 2)) * (moving ? 0.03 : 0.012);
    }
    if (legs.current) {
      legs.current.rotation.x = moving ? Math.sin(t * 9) * 0.5 : 0;
    }
  });

  return (
    <group>
      {/* sombra no chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} />
      </mesh>

      <group ref={body}>
        {/* pernas */}
        <group ref={legs} position={[0, 0.45, 0]}>
          <mesh position={[-0.08, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.06, 0.34, 4, 8]} />
            <meshStandardMaterial color="#23201c" roughness={0.8} />
          </mesh>
          <mesh position={[0.08, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.06, 0.34, 4, 8]} />
            <meshStandardMaterial color="#23201c" roughness={0.8} />
          </mesh>
        </group>

        {/* tronco */}
        <mesh position={[0, 0.78, 0]} castShadow>
          <capsuleGeometry args={[0.16, 0.36, 6, 12]} />
          <meshStandardMaterial color={outfit} roughness={0.7} />
        </mesh>
        {/* gola / detalhe */}
        <mesh position={[0, 0.98, 0.02]} castShadow>
          <torusGeometry args={[0.1, 0.025, 8, 16]} />
          <meshStandardMaterial color={accent} roughness={0.5} metalness={0.2} />
        </mesh>

        {/* braços */}
        <mesh position={[-0.22, 0.8, 0]} rotation={[0, 0, 0.15]} castShadow>
          <capsuleGeometry args={[0.05, 0.32, 4, 8]} />
          <meshStandardMaterial color={outfit} roughness={0.7} />
        </mesh>
        <mesh position={[0.22, 0.8, 0]} rotation={[0, 0, -0.15]} castShadow>
          <capsuleGeometry args={[0.05, 0.32, 4, 8]} />
          <meshStandardMaterial color={outfit} roughness={0.7} />
        </mesh>

        {/* cabeça */}
        <mesh position={[0, 1.18, 0]} castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {/* cabelo */}
        <mesh position={[0, 1.24, -0.02]} castShadow>
          <sphereGeometry args={[0.135, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
          <meshStandardMaterial color="#2a211a" roughness={0.9} />
        </mesh>

        {/* arquiteto: prancheta/tablet */}
        {role === "arquiteto" && (
          <mesh position={[0.26, 0.74, 0.16]} rotation={[0.5, 0.2, 0]} castShadow>
            <boxGeometry args={[0.22, 0.3, 0.02]} />
            <meshStandardMaterial color="#e8e6e1" roughness={0.4} metalness={0.1} />
          </mesh>
        )}
      </group>

      {label && name && (
        <Html position={[0, 1.55, 0]} center distanceFactor={12} occlude={false}>
          <div
            className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap select-none border ${
              role === "arquiteto"
                ? "bg-sky-500/20 text-sky-200 border-sky-400/40"
                : "bg-champagne/20 text-champagne border-champagne/40"
            }`}
          >
            {role === "arquiteto" ? "👔 " : "🙂 "}
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}
