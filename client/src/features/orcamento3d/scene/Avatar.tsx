import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, Object3D } from "three";
import type { Role } from "../types";
import { getAvatarModel } from "../avatarModel";

interface Props {
  role: Role;
  name?: string;
  moving?: boolean;
  color?: string;
  label?: boolean;
}

function shortName(name?: string) {
  if (!name) return "";
  return name.trim().split(/\s+/).slice(0, 2).join(" ");
}

// Avatar com o modelo 3D real (OBJ) do cliente/arquiteto. Modelos sem esqueleto,
// então a "caminhada" é procedural (balanço vertical + gingado + leve inclinação).
export default function Avatar({ role, name, moving = false, label = true }: Props) {
  const rig = useRef<Group>(null);
  const [model, setModel] = useState<Object3D | null>(null);

  useEffect(() => {
    let alive = true;
    getAvatarModel(role)
      .then((o) => alive && setModel(o))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [role]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!rig.current) return;
    if (moving) {
      const ph = t * 7.5;
      rig.current.position.y = Math.abs(Math.sin(ph)) * 0.06;
      rig.current.rotation.z = Math.sin(ph) * 0.04;
      rig.current.rotation.x = -0.07 + Math.sin(ph * 0.5) * 0.02;
    } else {
      rig.current.position.y = Math.sin(t * 1.6) * 0.012;
      rig.current.rotation.z = 0;
      rig.current.rotation.x = 0;
    }
  });

  return (
    <group>
      {/* sombra no chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.34, 28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} />
      </mesh>

      <group ref={rig}>
        {model ? (
          <primitive object={model} dispose={null} />
        ) : (
          <mesh position={[0, 0.85, 0]} castShadow>
            <capsuleGeometry args={[0.18, 0.95, 6, 12]} />
            <meshStandardMaterial color={role === "arquiteto" ? "#2f3a4a" : "#7a6a57"} roughness={0.75} transparent opacity={0.55} />
          </mesh>
        )}
      </group>

      {label && name && (
        <Html position={[0, 1.95, 0]} center occlude={false} zIndexRange={[24, 12]} style={{ pointerEvents: "none" }}>
          <div
            className={`px-2 py-0.5 rounded-full text-[10px] leading-none whitespace-nowrap select-none border ${
              role === "arquiteto"
                ? "bg-sky-500/25 text-sky-100 border-sky-400/40"
                : "bg-champagne/25 text-champagne border-champagne/40"
            }`}
          >
            {role === "arquiteto" ? "👔 " : "🙂 "}
            {shortName(name)}
          </div>
        </Html>
      )}
    </group>
  );
}
