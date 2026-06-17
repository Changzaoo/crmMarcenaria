import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { FURNITURE_CATALOG, CATALOG_MAP, defaultConfigFor } from "./furnitureCatalog";
import { FurniturePreviewModel } from "./FurnitureMesh";
import { setThumb, hasThumb } from "./furnitureThumbnails";
import type { PlacedFurniture } from "./types";

const M = 0.01; // cm → m

function mock(id: string): PlacedFurniture {
  const item = CATALOG_MAP[id];
  return {
    uid: `prev-${id}`,
    itemId: item.id,
    name: item.name,
    category: item.category,
    floor: 0,
    width: item.defaultWidth,
    height: item.defaultHeight,
    depth: item.defaultDepth,
    position: [0, 0, 0],
    rotationY: 0,
    locked: false,
    config: defaultConfigFor(item),
    basePrice: item.basePrice,
    complexity: item.complexity,
  };
}

/* Renderiza UM móvel e, após alguns frames, captura o canvas como PNG. */
function Capturer({ id, onDone }: { id: string; onDone: () => void }) {
  const gl = useThree((s) => s.gl);
  const frame = useRef(0);
  const f = useMemo(() => mock(id), [id]);
  const w = f.width * M;
  const h = f.height * M;
  const d = f.depth * M;
  const scale = 1.5 / (Math.max(w, h, d) || 1);

  useFrame(() => {
    frame.current += 1;
    if (frame.current === 3) {
      try {
        setThumb(id, gl.domElement.toDataURL("image/png"));
      } catch {
        /* canvas "tainted" ou contexto perdido: ignora */
      }
      onDone();
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#fff4e0", "#1a1612", 0.5]} />
      <directionalLight position={[3, 5, 3]} intensity={1.15} />
      <pointLight position={[-3, 2, -2]} intensity={0.3} color="#ffd9a0" />
      <group scale={scale}>
        <group position={[0, -h / 2, 0]}>
          <FurniturePreviewModel f={f} />
        </group>
      </group>
      <ContactShadows position={[0, -(h * scale) / 2, 0]} opacity={0.4} scale={4} blur={2.6} far={3} />
    </>
  );
}

/* Gera as "fotos" do catálogo uma a uma num canvas escondido. Some quando termina,
   liberando o contexto WebGL. Montar uma única vez (ex.: na FurnitureLibrary). */
export default function ThumbnailFactory() {
  const queue = useMemo(() => FURNITURE_CATALOG.map((i) => i.id).filter((id) => !hasThumb(id)), []);
  const [i, setI] = useState(0);

  if (i >= queue.length) return null;

  return (
    <div
      aria-hidden
      style={{ position: "fixed", left: -10000, top: 0, width: 256, height: 256, opacity: 0, pointerEvents: "none" }}
    >
      <Canvas
        dpr={1.5}
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        camera={{ position: [1.7, 1.2, 2.05], fov: 34 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <Capturer key={queue[i]} id={queue[i]} onDone={() => setI((v) => v + 1)} />
      </Canvas>
    </div>
  );
}
