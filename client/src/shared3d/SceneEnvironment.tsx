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

/* ---------- casa (corpo + telhado + porta + janelas) ---------- */
function House({
  x, z, ry, w, d, h, body, roof, mobile,
}: { x: number; z: number; ry: number; w: number; d: number; h: number; body: string; roof: string; mobile: boolean }) {
  const win = P.scenery.window;
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow={!mobile} receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={body} roughness={0.9} />
      </mesh>
      {/* telhado em pirâmide de 4 águas */}
      <mesh position={[0, h + Math.min(w, d) * 0.28, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!mobile}>
        <coneGeometry args={[Math.hypot(w, d) * 0.56, Math.min(w, d) * 0.56, 4]} />
        <meshStandardMaterial color={roof} roughness={0.85} flatShading />
      </mesh>
      {/* porta (frente = +Z local) */}
      <mesh position={[0, 0.5, d / 2 + 0.02]}>
        <boxGeometry args={[0.7, 1.0, 0.06]} />
        <meshStandardMaterial color={P.scenery.door} roughness={0.7} />
      </mesh>
      {/* janelas */}
      {[-w / 4, w / 4].map((wx, i) => (
        <mesh key={i} position={[wx, h * 0.6, d / 2 + 0.02]}>
          <boxGeometry args={[w * 0.22, h * 0.28, 0.06]} />
          <meshStandardMaterial color={win} roughness={0.15} metalness={0.2} emissive={win} emissiveIntensity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- prédio (corpo + grade de janelas) ---------- */
function Building({
  x, z, ry, w, d, h, color, mobile,
}: { x: number; z: number; ry: number; w: number; d: number; h: number; color: string; mobile: boolean }) {
  const win = P.scenery.window;
  const cols = Math.max(2, Math.round(w / 1.6));
  const rows = Math.max(3, Math.round(h / 1.8));
  const wins: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    wins.push([-w / 2 + (w * (c + 0.5)) / cols, (h * (r + 0.6)) / rows]);
  }
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow={!mobile} receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>
      {wins.map(([wx, wy], i) => (
        <mesh key={i} position={[wx, wy, d / 2 + 0.03]}>
          <boxGeometry args={[w / cols * 0.5, h / rows * 0.45, 0.05]} />
          <meshStandardMaterial color={win} roughness={0.1} metalness={0.3} emissive={win} emissiveIntensity={0.1} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- carro estacionado ---------- */
function Car({ x, z, ry, color, mobile }: { x: number; z: number; ry: number; color: string; mobile: boolean }) {
  const wheel = (wx: number, wz: number) => (
    <mesh position={[wx, 0.26, wz]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.27, 0.27, 0.22, 12]} />
      <meshStandardMaterial color="#15151a" roughness={0.7} />
    </mesh>
  );
  const paint = { color, roughness: 0.35, metalness: 0.35 };
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow={!mobile}>
        <boxGeometry args={[1.8, 0.5, 4.1]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      <mesh position={[0, 0.8, -0.15]} castShadow={!mobile}>
        <boxGeometry args={[1.6, 0.5, 2.1]} />
        <meshStandardMaterial {...paint} />
      </mesh>
      {/* faixa de vidros */}
      <mesh position={[0, 0.82, -0.15]}>
        <boxGeometry args={[1.62, 0.34, 2.0]} />
        <meshStandardMaterial color="#1b2a33" roughness={0.1} metalness={0.5} />
      </mesh>
      {wheel(0.82, 1.3)}
      {wheel(-0.82, 1.3)}
      {wheel(0.82, -1.3)}
      {wheel(-0.82, -1.3)}
    </group>
  );
}

/* gerador pseudo-aleatório determinístico (cenário estável entre renders) */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ---------- cenário externo: quarteirão de cidade com rua ---------- */
function Scenery({ dim, mobile }: { dim: number; mobile: boolean }) {
  const groundR = Math.max(110, dim * 16);

  const layout = useMemo(() => {
    const rng = makeRng(Math.round(dim * 1000) + 11);
    const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)];

    const lotHalf = dim * 0.75 + 2.5; // meio-lote central (onde fica o ambiente)
    const sidewalkW = 2.4;
    const roadW = 8;
    const span = Math.max(dim * 2.4, 30); // meia-extensão da rua no eixo X

    const nearCurbZ = lotHalf + sidewalkW;
    const roadZ = nearCurbZ + roadW / 2;
    const farCurbZ = nearCurbZ + roadW;
    const farLineZ = farCurbZ + sidewalkW; // frente das casas do outro lado
    const plotW = dim * 1.0 + 5;

    const houses: any[] = [];
    const buildings: any[] = [];
    const cars: any[] = [];
    const trees: { x: number; z: number; s: number }[] = [];

    // vizinhos do MESMO lado (ao lado do ambiente) — frente para +Z (a rua)
    for (const k of [-2, -1, 1, 2]) {
      const x = k * plotW + (rng() - 0.5) * 1.5;
      const w = plotW * (0.5 + rng() * 0.18);
      const d = 6 + rng() * 3;
      if (rng() < 0.32) {
        buildings.push({ x, z: lotHalf - d / 2, ry: 0, w, d, h: 8 + rng() * 12, color: pick(P.scenery.building) });
      } else {
        houses.push({ x, z: lotHalf - d / 2, ry: 0, w, d, h: 3 + rng() * 1.4, body: pick(P.scenery.house), roof: pick(P.scenery.roof) });
      }
    }

    // quarteirão do OUTRO lado da rua — frente para -Z
    for (let k = -3; k <= 3; k++) {
      const x = k * plotW + (rng() - 0.5) * 1.5;
      const w = plotW * (0.52 + rng() * 0.2);
      const d = 6 + rng() * 3;
      if (rng() < 0.42) {
        buildings.push({ x, z: farLineZ + d / 2, ry: Math.PI, w, d, h: 9 + rng() * 16, color: pick(P.scenery.building) });
      } else {
        houses.push({ x, z: farLineZ + d / 2, ry: Math.PI, w, d, h: 3 + rng() * 1.5, body: pick(P.scenery.house), roof: pick(P.scenery.roof) });
      }
    }

    // carros estacionados junto aos dois meios-fios (paralelos à rua → ry=90°)
    for (let cx = -span + 4; cx <= span - 4; cx += 5.2) {
      if (rng() < 0.55 && Math.abs(cx) > lotHalf * 0.4) cars.push({ x: cx + (rng() - 0.5), z: nearCurbZ + 1.3, ry: Math.PI / 2, color: pick(P.scenery.car) });
      if (rng() < 0.55) cars.push({ x: cx + (rng() - 0.5), z: farCurbZ - 1.3, ry: Math.PI / 2, color: pick(P.scenery.car) });
    }

    // árvores na calçada e no fundo do lote
    for (let cx = -span + 6; cx <= span - 6; cx += 7) {
      if (rng() < 0.5) trees.push({ x: cx, z: nearCurbZ - 0.9, s: 0.7 + rng() * 0.5 });
      if (rng() < 0.5) trees.push({ x: cx, z: farCurbZ + sidewalkW + 0.8, s: 0.7 + rng() * 0.5 });
    }
    for (let i = 0; i < 6; i++) trees.push({ x: (rng() - 0.5) * dim * 2.4, z: -lotHalf - 3 - rng() * dim, s: 0.8 + rng() * 0.7 });

    // skyline distante atrás do quarteirão do outro lado
    for (let i = 0; i < 7; i++) {
      const x = (rng() - 0.5) * span * 2.2;
      buildings.push({ x, z: farLineZ + 16 + rng() * dim * 2, ry: Math.PI, w: 7 + rng() * 9, d: 7 + rng() * 8, h: 12 + rng() * 22, color: pick(P.scenery.building) });
    }

    return { lotHalf, sidewalkW, roadW, span, nearCurbZ, roadZ, farCurbZ, houses, buildings, cars, trees };
  }, [dim]);

  const { lotHalf, sidewalkW, roadW, span, nearCurbZ, roadZ, farCurbZ } = layout;

  // tracejado central da rua
  const dashes: number[] = [];
  for (let dx = -span + 2; dx <= span - 2; dx += 3) dashes.push(dx);

  return (
    <group>
      <SkyDome radius={Math.min(180, groundR * 1.6)} />

      {/* gramado base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <circleGeometry args={[groundR, 48]} />
        <meshStandardMaterial color={P.scenery.grass} roughness={1} />
      </mesh>

      {/* deck/calçada do lote central (onde fica o ambiente) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[lotHalf * 2, lotHalf * 2]} />
        <meshStandardMaterial color={P.scenery.deck} roughness={0.92} />
      </mesh>

      {/* calçadas (faixas claras dos dois lados) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, nearCurbZ - sidewalkW / 2]} receiveShadow>
        <planeGeometry args={[span * 2, sidewalkW]} />
        <meshStandardMaterial color={P.scenery.sidewalk} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, farCurbZ + sidewalkW / 2]} receiveShadow>
        <planeGeometry args={[span * 2, sidewalkW]} />
        <meshStandardMaterial color={P.scenery.sidewalk} roughness={0.95} />
      </mesh>

      {/* meios-fios */}
      {[nearCurbZ, farCurbZ].map((cz, i) => (
        <mesh key={i} position={[0, 0.05, cz]}>
          <boxGeometry args={[span * 2, 0.12, 0.14]} />
          <meshStandardMaterial color={P.scenery.curb} roughness={0.9} />
        </mesh>
      ))}

      {/* asfalto */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, roadZ]} receiveShadow>
        <planeGeometry args={[span * 2, roadW]} />
        <meshStandardMaterial color={P.scenery.road} roughness={0.96} />
      </mesh>
      {/* faixa central tracejada */}
      {dashes.map((dx, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[dx, -0.012, roadZ]}>
          <planeGeometry args={[1.4, 0.18]} />
          <meshStandardMaterial color={P.scenery.roadLine} roughness={0.7} />
        </mesh>
      ))}

      {layout.houses.map((b, i) => (
        <House key={`h${i}`} {...b} mobile={mobile} />
      ))}
      {layout.buildings.map((b, i) => (
        <Building key={`b${i}`} {...b} mobile={mobile} />
      ))}
      {layout.cars.map((c, i) => (
        <Car key={`c${i}`} {...c} mobile={mobile} />
      ))}
      {layout.trees.map((t, i) => (
        <Tree key={`t${i}`} x={t.x} z={t.z} s={t.s} mobile={mobile} />
      ))}
    </group>
  );
}
