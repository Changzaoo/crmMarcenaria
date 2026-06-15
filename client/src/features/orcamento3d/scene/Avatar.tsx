import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Euler, Quaternion, Vector3 } from "three";
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

const TMP_Q = new Quaternion();
const TMP_E = new Euler();
const TMP_V = new Vector3();
function wrap(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export default function Avatar({ role, name, moving = false, label = true }: Props) {
  const outer = useRef<Group>(null);
  const rig = useRef<Group>(null);
  const [inst, setInst] = useState<AvatarInstance | null>(null);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const current = useRef<AnimationAction | null>(null);
  const prevYaw = useRef<number | null>(null);
  const turnHold = useRef(0);
  const turnDir = useRef(0);
  const prevPos = useRef<{ x: number; z: number } | null>(null);

  useEffect(() => {
    let alive = true;
    getAvatarModel(role)
      .then((a) => {
        if (!alive) return;
        setInst(a);
        mixerRef.current = a.mixer;
        if (a.idle) {
          a.idle.play();
          current.current = a.idle;
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

      let turning = 0;
      let back = false;
      if (outer.current) {
        outer.current.getWorldQuaternion(TMP_Q);
        const yaw = TMP_E.setFromQuaternion(TMP_Q, "YXZ").y;
        if (prevYaw.current !== null && delta > 0) {
          const speed = wrap(yaw - prevYaw.current) / delta;
          if (Math.abs(speed) > 0.6) {
            turnDir.current = speed < 0 ? -1 : 1;
            turnHold.current = 0.25;
          }
        }
        prevYaw.current = yaw;

        outer.current.getWorldPosition(TMP_V);
        if (prevPos.current && delta > 0) {
          const vx = TMP_V.x - prevPos.current.x;
          const vz = TMP_V.z - prevPos.current.z;
          if (Math.hypot(vx, vz) > 0.0009) back = vx * Math.sin(yaw) + vz * Math.cos(yaw) < 0;
        }
        prevPos.current = { x: TMP_V.x, z: TMP_V.z };
      }
      if (turnHold.current > 0) turnHold.current -= delta;
      if (!moving && turnHold.current > 0) turning = turnDir.current;

      let want: AnimationAction | null = null;
      if (moving) want = back && inst.walkBack ? inst.walkBack : inst.walk;
      else if (turning < 0 && inst.turnLeft) want = inst.turnLeft;
      else if (turning > 0 && inst.turnRight) want = inst.turnRight;
      else want = inst.idle;
      want = want || inst.idle || inst.walk;

      if (want && current.current !== want) {
        current.current?.fadeOut(0.2);
        want.reset().fadeIn(0.2).play();
        current.current = want;
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
    <group ref={outer}>
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
