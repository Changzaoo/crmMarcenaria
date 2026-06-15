import * as THREE from "three";

/* ============================================================
   Carrega os modelos 3D reais (OBJ) usados como avatares do
   cliente e do arquiteto. Sem .mtl no pacote, recolorimos por
   nome de material/objeto. Carregado uma vez por papel e clonado
   por instância (geometria compartilhada).
   ============================================================ */

export type AvatarRole = "cliente" | "arquiteto";

const URL: Record<AvatarRole, string> = {
  arquiteto: "/models/arquiteto.obj",
  cliente: "/models/cliente.obj",
};
const TARGET_H: Record<AvatarRole, number> = { arquiteto: 1.82, cliente: 1.66 };
/** Rotação base no eixo Y. Se um modelo aparecer de costas, troque para Math.PI. */
const FACE: Record<AvatarRole, number> = { arquiteto: Math.PI, cliente: Math.PI };

const SKIN = "#c89a7c";

function mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02, ...extra });
}

function paint(role: AvatarRole, name: string): THREE.MeshStandardMaterial {
  const n = (name || "").toLowerCase();
  if (n.includes("eye")) return mat("#f3f1ea", { roughness: 0.25 });
  if (n.includes("teeth")) return mat("#f1ede2", { roughness: 0.4 });
  if (n.includes("mouth") || n.includes("lip")) return mat("#8a4040");
  if (n.includes("hair")) return mat("#241c16", { roughness: 0.95 });
  if (n.includes("shoe")) return mat("#1a1611", { roughness: 0.5, metalness: 0.1 });
  if (n.includes("tshirt") || n.includes("shirt")) return mat(role === "arquiteto" ? "#2b3d4f" : "#c69a52");
  if (n.includes("pant")) return mat(role === "arquiteto" ? "#243039" : "#3a4654");
  if (n.includes("blue")) return mat("#3b5b8c");
  if (n.includes("red")) return mat("#b5483f");
  if (n.includes("yellow")) return mat("#d8b24a");
  if (n.includes("white")) return mat("#ece9e1");
  if (n.includes("part")) return mat("#3b5b8c");
  return mat(SKIN, { roughness: 0.62 });
}

function applyMaterials(role: AvatarRole, obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    if (Array.isArray(m.material)) {
      m.material = m.material.map((mm) => paint(role, (mm as any)?.name || m.name));
    } else {
      m.material = paint(role, (m.material as any)?.name || m.name);
    }
  });
}

const cache = new Map<AvatarRole, Promise<THREE.Object3D>>();

async function build(role: AvatarRole): Promise<THREE.Object3D> {
  const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
  const obj = await new Promise<THREE.Group>((resolve, reject) =>
    new OBJLoader().load(URL[role], resolve, undefined, reject)
  );
  applyMaterials(role, obj);
  obj.rotation.y = FACE[role];
  obj.updateMatrixWorld(true);

  let box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  obj.scale.setScalar(TARGET_H[role] / (size.y || 1));
  obj.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  box.getCenter(center);
  obj.position.x -= center.x;
  obj.position.z -= center.z;
  obj.position.y -= box.min.y;
  return obj;
}

export async function getAvatarModel(role: AvatarRole): Promise<THREE.Object3D> {
  if (!cache.has(role)) cache.set(role, build(role));
  const base = await cache.get(role)!;
  return base.clone(true);
}
