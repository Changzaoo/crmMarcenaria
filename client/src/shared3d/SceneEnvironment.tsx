import { useMemo } from "react";
import * as THREE from "three";
import { RENDER_PRESET as P } from "./renderPreset";

/* Ambiente de renderização ÚNICO (fundo + fog + luzes + sombra + CENÁRIO
   externo) usado pelo site e pelo CRM. Garante iluminação e atmosfera
   idênticas nos dois.

   O cenário externo (céu em gradiente, gramado, deck, árvores low-poly e
   skyline distante) transforma o "vazio escuro" num ambiente diurno e vivo,
   estilo The Sims. Tudo é procedural e leve (sem texturas/HDRI).

   `maxDim`  = maior dimensão do ambiente em METROS (largura ou comprimento),
               usada para escalar o fog e dimensionar o cenário ao redor.
   `mobile`  = desliga sombras pesadas no celular (mantendo as luzes iguais). */
export default function SceneEnvironment({
  maxDim,
  mobile = false,
}: {
  maxDim: number;
  mobile?: boolean;
}) {
  const dim = Math.max(1, maxDim || 1);
  const ms = mobile ? P.shadow.mapSizeMobile : P.shadow.mapSize;

  return (
    <>
      <color attach="background" args={[P.background]} />
      <fog attach="fog" args={[P.horizon, dim * P.fog.near, dim * P.fog.far]} />
      <ambientLight intensity={P.ambient.intensity} color={P.ambient.color} />
      <hemisphereLight args={[P.hemisphere.sky, P.hemisphere.ground, P.hemisphere.intensity]} />
      <directionalLight
        position={P.key.position}
        intensity={P.key.intensity}
        color={P.key.color}
        castShadow={!mobile}
        shadow-mapSize-width={ms}
        shadow-mapSize-height={ms}
        shadow-camera-left={-P.shadow.cam}
        shadow-camera-right={P.shadow.cam}
        shadow-camera-top={P.shadow.cam}
        shadow-camera-bottom={-P.shadow.cam}
        shadow-bias={P.shadow.bias}
      />
      <Scenery dim={dim} mobile={mobile} />
    </>
  );
}

/* ---------- céu em gradiente (abóbada) ---------- */
function SkyDome({ radius }: { radius: number }) {
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(P.sky.top) },
        bottomColor: { value: new THREE.Color(P.sky.bottom) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        void main() {
          float h = clamp(normalize(vPos).y, 0.0, 1.0);
          vec3 c = mix(bottomColor, topColor, smoothstep(0.0, 0.65, h));
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
  }, []);
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[radius, 24, 16]} />
    </mesh>
  );
}

/* ---------- árvore low-poly ---------- */
function Tree({ x, z, s, mobile }: { x: number; z: number; s: number; mobile: boolean }) {
  const f = P.scenery.foliage;
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.6, 0]} castShadow={!mobile}>
        <cylinderGeometry args={[0.11, 0.16, 1.2, 6]} />
        <meshStandardMaterial color={P.scenery.trunk} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.75, 0]} castShadow={!mobile}>
        <icosahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial color={f[0]} roughness={0.88} flatShading />
      </mesh>
      <mesh position={[0.28, 1.4, 0.12]} castShadow={!mobile}>
        <icosahedronGeometry args={[0.46, 0]} />
        <meshStandardMaterial color={f[1]} roughness={0.88} flatShading />
      </mesh>
      <mesh position={[-0.26, 1.5, -0.1]} castShadow={!mobile}>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color={f[2]} roughness={0.88} flatShading />
      </mesh>
    </group>
  );
}

/* gerador pseudo-aleatório determinístico (cenário estável entre renders) */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ---------- cenário externo completo ---------- */
function Scenery({ dim, mobile }: { dim: number; mobile: boolean }) {
  const groundR = Math.max(90, dim * 14);
  const deckR = dim * 0.75 + 2.2; // deck/calçada ao redor do prédio

  const { trees, buildings } = useMemo(() => {
    const rng = makeRng(Math.round(dim * 1000) + 7);
    const ringR = dim * 0.85 + 3.2;
    const nTrees = 16;
    const trees: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < nTrees; i++) {
      const a = (i / nTrees) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      const r = ringR + (rng() - 0.5) * dim * 0.5;
      trees.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.8 + rng() * 0.9 });
    }
    const nBld = 8;
    const bRingR = dim * 3 + 8;
    const buildings: { x: number; z: number; w: number; h: number; d: number; c: string }[] = [];
    const bc = P.scenery.building;
    for (let i = 0; i < nBld; i++) {
      const a = (i / nBld) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const r = bRingR + (rng() - 0.5) * dim * 2;
      buildings.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        w: 6 + rng() * 10,
        h: 6 + rng() * 16,
        d: 6 + rng() * 10,
        c: bc[i % bc.length],
      });
    }
    return { trees, buildings };
  }, [dim]);

  return (
    <group>
      <SkyDome radius={Math.min(180, groundR * 1.6)} />

      {/* gramado (disco grande) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <circleGeometry args={[groundR, 48]} />
        <meshStandardMaterial color={P.scenery.grass} roughness={1} />
      </mesh>
      {/* faixa de grama mais escura para dar profundidade */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
        <ringGeometry args={[deckR + 4, deckR + 14, 48]} />
        <meshStandardMaterial color={P.scenery.grassDark} roughness={1} />
      </mesh>
      {/* deck/calçada clara onde o prédio se apoia */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow>
        <circleGeometry args={[deckR, 40]} />
        <meshStandardMaterial color={P.scenery.deck} roughness={0.92} />
      </mesh>

      {trees.map((t, i) => (
        <Tree key={i} x={t.x} z={t.z} s={t.s} mobile={mobile} />
      ))}

      {/* skyline distante (caixas suaves no fog) */}
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow={false}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.c} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}
