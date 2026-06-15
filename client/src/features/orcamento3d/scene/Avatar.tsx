import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, AnimationAction, AnimationMixer } from "three";
import type { Role } from "../types";
import { getAvatarModel, type AvatarInstance } from "../avatarModel";

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

export default function Avatar({ role, name, moving = false, label = true }: Props) {
  const rig = useRef<Group>(null);
  const [inst, setInst] = useState<AvatarInstance | null>(null);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const currentAction = useRef<AnimationAction | null>(null);

  useEffect(() => {
    let alive = true;
    getAvatarModel(role)
      .then((a) => {
        if (!alive) return;
        setInst(a);
        mixerRef.current = a.mixer;
        if (a.idle) {
          a.idle.play();
          currentAction.current = a.idle;
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      mixerRef.current?.stopAllAction();
    };
  }, [role]);

  useFrame((state, delta) => {
    const mixer = mixerRef.current;
    if (mixer && inst) {
      mixer.update(delta);
      const want = moving ? inst.walk : inst.idle;
      if (want && currentAction.current !== want) {
        currentAction.current?.fadeOut(0.25);
        want.reset().fadeIn(0.25).play();
        currentAction.current = want;
      }
      return;
    }
    if (!rig.current) return;
    const t = state.clock.elapsedTime;
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.34, 28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} />
      </mesh>

      <group ref={rig}>
        {inst ? (
          <primitive object={inst.object} dispose={null} />
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
