import { Suspense, useMemo } from "react";
import { ContactShadows, PerspectiveCamera, View } from "@react-three/drei";
import { CATALOG_MAP, defaultConfigFor } from "./furnitureCatalog";
import { FurniturePreviewModel } from "./FurnitureMesh";
import type { FurnitureCategory, PlacedFurniture } from "./types";

const M = 0.01; // cm → m

/* Monta uma instância "fake" do móvel só para renderizar o thumbnail, usando
   exatamente a mesma geometria 3D que aparece na cena (mesmo formato). */
function mockPlaced(id: string): PlacedFurniture | null {
  const item = CATALOG_MAP[id];
  if (!item) return null;
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

/* Thumbnail 3D real do catálogo. Renderiza dentro de um <View> compartilhado
   (um único contexto WebGL para a biblioteca toda — ver FurnitureLibrary). */
export default function FurniturePreview({
  id,
}: {
  category?: FurnitureCategory;
  id: string;
}) {
  const f = useMemo(() => mockPlaced(id), [id]);
  if (!f) return null;

  const w = f.width * M;
  const h = f.height * M;
  const d = f.depth * M;
  const scale = 1.5 / (Math.max(w, h, d) || 1);

  return (
    <View className="h-full w-full">
      <PerspectiveCamera makeDefault position={[1.7, 1.2, 2.05]} fov={34} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#fff4e0", "#1a1612", 0.5]} />
      <directionalLight position={[3, 5, 3]} intensity={1.15} />
      <pointLight position={[-3, 2, -2]} intensity={0.3} color="#ffd9a0" />
      <Suspense fallback={null}>
        <group scale={scale}>
          {/* o modelo cresce de 0..h; centraliza verticalmente */}
          <group position={[0, -h / 2, 0]}>
            <FurniturePreviewModel f={f} />
          </group>
        </group>
        <ContactShadows
          position={[0, -(h * scale) / 2, 0]}
          opacity={0.4}
          scale={4}
          blur={2.6}
          far={3}
        />
      </Suspense>
    </View>
  );
}
