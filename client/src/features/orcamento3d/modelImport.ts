/* ============================================================
   Importação de modelos 3D dos principais aplicativos.

   Formatos aceitos (exportados por SketchUp, Blender, 3ds Max,
   Revit, Fusion, Rhino, etc.):
   - .glb / .gltf  (padrão universal — recomendado)
   - .obj
   - .stl
   - .fbx

   Os loaders do three.js são carregados sob demanda (dynamic import).
   O arquivo é guardado como data URL no móvel, então o modelo persiste
   e sincroniza com o cliente/arquiteto.
   ============================================================ */
import * as THREE from "three";

export const ACCEPTED_3D = ".glb,.gltf,.obj,.stl,.fbx";
export const MAX_MODEL_BYTES = 14 * 1024 * 1024; // ~14MB

export type ModelFormat = "glb" | "gltf" | "obj" | "stl" | "fbx";

export function formatFromName(name: string): ModelFormat | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "glb" || ext === "gltf" || ext === "obj" || ext === "stl" || ext === "fbx") return ext;
  return null;
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    r.readAsDataURL(file);
  });
}

async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(dataUrl);
  return res.arrayBuffer();
}

/** Parseia um modelo (a partir do data URL) e devolve um Object3D pronto. */
export async function loadModelObject(dataUrl: string, format: ModelFormat): Promise<THREE.Object3D> {
  const buffer = await dataUrlToArrayBuffer(dataUrl);

  if (format === "glb" || format === "gltf") {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader();
    const payload: ArrayBuffer | string =
      format === "gltf" ? new TextDecoder().decode(buffer) : buffer;
    const gltf = await new Promise<any>((resolve, reject) =>
      loader.parse(payload as any, "", resolve, reject)
    );
    return gltf.scene as THREE.Object3D;
  }

  if (format === "obj") {
    const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
    return new OBJLoader().parse(new TextDecoder().decode(buffer));
  }

  if (format === "stl") {
    const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
    const geo = new STLLoader().parse(buffer);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: "#c9c2b5", roughness: 0.7, metalness: 0.05 });
    return new THREE.Mesh(geo, mat);
  }

  // fbx
  const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
  return new FBXLoader().parse(buffer, "");
}

/** Caixa delimitadora (em metros) de um objeto carregado. */
export function measure(object: THREE.Object3D): { x: number; y: number; z: number } {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  return { x: size.x || 1, y: size.y || 1, z: size.z || 1 };
}

/** Centraliza em X/Z e apoia a base em y=0; escala uniforme para caber nas
    dimensões alvo (metros) mantendo a proporção. */
export function fitObject(object: THREE.Object3D, target: { w: number; h: number; d: number }) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = Math.min(target.w / (size.x || 1), target.h / (size.y || 1), target.d / (size.z || 1)) || 1;
  object.scale.setScalar(scale);
  const box2 = new THREE.Box3().setFromObject(object);
  const c2 = new THREE.Vector3();
  box2.getCenter(c2);
  object.position.x -= c2.x;
  object.position.z -= c2.z;
  object.position.y -= box2.min.y;
  object.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
}

/** Lê um arquivo do usuário: valida, gera data URL e mede as dimensões reais. */
export async function importModelFile(
  file: File
): Promise<{ dataUrl: string; format: ModelFormat; name: string; size: { x: number; y: number; z: number }; tooBig: boolean }> {
  const format = formatFromName(file.name);
  if (!format) throw new Error("Formato não suportado. Use .glb, .gltf, .obj, .stl ou .fbx.");
  const dataUrl = await fileToDataUrl(file);
  const object = await loadModelObject(dataUrl, format);
  const size = measure(object);
  return { dataUrl, format, name: file.name, size, tooBig: file.size > MAX_MODEL_BYTES };
}
