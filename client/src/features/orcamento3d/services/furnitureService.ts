import { FURNITURE, FURNITURE_CATEGORIES, getFurnitureDef } from "../furnitureCatalog";
import type { FurnitureDef } from "../furnitureCatalog";
import type { FurnitureInstance } from "../types";

export { FURNITURE, FURNITURE_CATEGORIES, getFurnitureDef };
export type { FurnitureDef };

let seq = 0;
function novoUid(): string {
  seq += 1;
  return `f_${Date.now().toString(36)}_${seq}`;
}

// Cria uma instância posicionável a partir de um item do catálogo.
export function instanciar(
  catalogId: string,
  pos?: { x: number; z: number },
  floor = 0
): FurnitureInstance | null {
  const def = getFurnitureDef(catalogId);
  if (!def) return null;
  return {
    uid: novoUid(),
    catalogId: def.id,
    category: def.category,
    name: def.name,
    floor,
    x: pos?.x ?? 0,
    z: pos?.z ?? 0,
    rotation: 0,
    width: def.width,
    height: def.height,
    depth: def.depth,
    material: def.material,
    color: "",
    locked: false,
  };
}

export function duplicar(item: FurnitureInstance): FurnitureInstance {
  return { ...item, uid: novoUid(), x: item.x + 0.4, z: item.z + 0.4, locked: false };
}

export function porCategoria() {
  return FURNITURE_CATEGORIES.map((cat) => ({
    categoria: cat,
    itens: FURNITURE.filter((f) => f.category === cat),
  }));
}
