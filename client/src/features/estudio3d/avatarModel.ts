import * as THREE from "three";

/* ============================================================
   Avatares do cliente e do arquiteto.

   Detecta automaticamente o melhor arquivo em /models/<papel>.<ext>
   na ordem .glb → .fbx → .obj:
   - .glb / .fbx RIGGADOS (ex.: exportados do Mixamo) → tocam a
     animação de esqueleto real (idle/andar) via AnimationMixer.
   - .obj (sem esqueleto) → recolorido por nome e animado de forma
     procedural (passada/respiração) pelo componente Avatar.

   Para ter animação esquelética de verdade: suba o modelo no
   https://www.mixamo.com (grátis), use Auto-Rigger, aplique as
   animações "Idle" e "Walking" (marque "In Place"), baixe em FBX
   (ou converta p/ glb) e salve como /public/models/arquiteto.fbx
   e /public/models/cliente.fbx — o app passa a animá-los sozinho.
   ============================================================ */

export type AvatarRole = "cliente" | "arquiteto";

const TARGET_H: Record<AvatarRole, number> = { arquiteto: 1.82, cliente: 1.66 };
/** Rotação base no eixo Y para o modelo olhar para a FRENTE (eixo +Z local). */
const FACE: Record<AvatarRole, number> = { arquiteto: 0, cliente: 0 };
const EXTS = ["glb", "fbx", "obj"] as const;

const SKIN = "#c89a7c";

function mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02, ...extra });
}

function paint(role: AvatarRole, name: string): THREE.MeshStandardMaterial {
  const n = (name || "").toLowerCase();
  // A ORDEM IMPORTA: "eyebrow"/"eyelash" contêm "eye" — precisam vir ANTES da
  // regra de olho, senão a sobrancelha/cílio fica com a cor branca dos olhos.
  if (n.includes("eyebrow") || n.includes("brow") || n.includes("lash")) return mat("#2a2018", { roughness: 0.9 });
  if (n.includes("pupil") || n.includes("iris")) return mat("#3a2a1e", { roughness: 0.3 });
  if (n.includes("teeth")) return mat("#f1ede2", { roughness: 0.4 });
  if (n.includes("tongue") || n.includes("gum")) return mat("#b5605c", { roughness: 0.5 });
  if (n.includes("mouth") || n.includes("lip")) return mat("#9c4b46");
  if (n.includes("eye")) return mat("#f3f1ea", { roughness: 0.25 });
  if (n.includes("hair")) return mat("#241c16", { roughness: 0.95 });
  if (n.includes("shoe")) return mat("#1a1611", { roughness: 0.5, metalness: 0.1 });
  if (n.includes("tshirt") || n.includes("shirt")) return mat(role === "arquiteto" ? "#2b3d4f" : "#c69a52");
  if (n.includes("pant")) return mat(role === "arquiteto" ? "#243039" : "#3a4654");
  // Regiões de pele explícitas — evita que rosto/mãos/pernas caiam nas cores
  // genéricas (blue/red/yellow) por engano.
  if (n.includes("skin") || n.includes("head") || n.includes("face") || n.includes("nose") ||
      n.includes("hand") || n.includes("leg") || n.includes("arm") || n.includes("body")) {
    return mat(SKIN, { roughness: 0.62 });
  }
  if (n.includes("blue")) return mat("#3b5b8c");
  if (n.includes("red")) return mat("#b5483f");
  if (n.includes("yellow")) return mat("#d8b24a");
  if (n.includes("white")) return mat("#ece9e1");
  if (n.includes("part")) return mat("#3b5b8c");
  return mat(SKIN, { roughness: 0.62 });
}

// Sombras + recolore peças SEM textura (OBJ e FBX do Mixamo vêm sem material
// útil). Materiais COM textura (ex.: glb pronto) são preservados. Funciona em
// SkinnedMesh (skinning é automático no three atual).
function dressUp(role: AvatarRole, obj: THREE.Object3D) {
  // Considera o nome do NÓ (Char_Tshirt, Parts, Hair_Base…) E do material —
  // o nome da malha é quem carrega a "parte" do corpo nos FBX do Mixamo.
  const fix = (mm: any, meshName: string) =>
    mm && mm.map ? mm : paint(role, `${meshName} ${mm?.name || ""}`);
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    if (Array.isArray(m.material)) m.material = m.material.map((mm) => fix(mm, m.name));
    else m.material = fix(m.material, m.name);
  });
}

// Remove o deslocamento horizontal da animação (vira "andar no lugar"), caso o
// clipe do Mixamo não tenha sido exportado como In Place.
function stripRootMotion(clip: THREE.AnimationClip) {
  for (const t of clip.tracks) {
    if (/hips?\.position$/i.test(t.name)) {
      for (let i = 0; i < t.values.length; i += 3) {
        t.values[i] = 0;
        t.values[i + 2] = 0;
      }
    }
  }
}

// Neutraliza a rotação do quadril (clipes de virada): mantém o jogo de pernas/
// braços da virada, mas sem girar o corpo — quem gira é o controlador (ry),
// evitando rotação dobrada.
function stripRootRotation(clip: THREE.AnimationClip) {
  for (const t of clip.tracks) {
    if (/hips?\.quaternion$/i.test(t.name)) {
      for (let i = 0; i < t.values.length; i += 4) {
        t.values[i] = 0;
        t.values[i + 1] = 0;
        t.values[i + 2] = 0;
        t.values[i + 3] = 1;
      }
    }
  }
}

interface RawModel {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

async function urlExists(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "HEAD" });
    const ct = r.headers.get("content-type") || "";
    return r.ok && !ct.includes("text/html"); // evita o fallback SPA (index.html)
  } catch {
    return false;
  }
}

async function loadByExt(url: string, ext: string): Promise<RawModel> {
  if (ext === "glb" || ext === "gltf") {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const g = await new Promise<any>((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
    return { scene: g.scene, animations: g.animations || [] };
  }
  if (ext === "fbx") {
    const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
    const g = await new Promise<any>((res, rej) => new FBXLoader().load(url, res, undefined, rej));
    return { scene: g, animations: g.animations || [] };
  }
  const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
  const o = await new Promise<THREE.Group>((res, rej) => new OBJLoader().load(url, res, undefined, rej));
  return { scene: o, animations: [] };
}

/** Normaliza altura, apoia base em y=0, centraliza em x/z e aplica o facing. */
function normalize(role: AvatarRole, obj: THREE.Object3D) {
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
}

const cache = new Map<AvatarRole, Promise<RawModel & { rigged: boolean }>>();

async function build(role: AvatarRole): Promise<RawModel & { rigged: boolean }> {
  let chosen: { url: string; ext: string } | null = null;
  for (const ext of EXTS) {
    const url = `/models/${role}.${ext}`;
    // .obj sempre existe (fallback); para glb/fbx confere antes p/ não poluir o console
    if (ext === "obj" || (await urlExists(url))) {
      chosen = { url, ext };
      break;
    }
  }
  if (!chosen) chosen = { url: `/models/${role}.obj`, ext: "obj" };

  const raw = await loadByExt(chosen.url, chosen.ext);
  dressUp(role, raw.scene);

  // clipe principal do arquivo = "walk"; tenta anexar um "idle" separado
  // (ex.: /models/arquiteto-idle.fbx) cujo esqueleto bate por nome de osso.
  const animations: THREE.AnimationClip[] = raw.animations.map((a) => {
    a.name = "walk";
    return a;
  });
  // Anexa clipes extras (mesmo rig Mixamo) a partir de arquivos separados:
  // <papel>-idle.fbx, <papel>-left.fbx (virar à esquerda), <papel>-right.fbx.
  if (chosen.ext !== "obj") {
    const extras = [
      { suffix: "idle", name: "idle", stripRot: false },
      { suffix: "left", name: "turnLeft", stripRot: true },
      { suffix: "right", name: "turnRight", stripRot: true },
      { suffix: "back", name: "walkBack", stripRot: false },
    ];
    for (const ex of extras) {
      const url = `/models/${role}-${ex.suffix}.fbx`;
      if (!(await urlExists(url))) continue;
      try {
        const extra = await loadByExt(url, "fbx");
        const clip = extra.animations[0];
        if (clip) {
          clip.name = ex.name;
          if (ex.stripRot) stripRootRotation(clip);
          animations.push(clip);
        }
      } catch {
        /* ignora clipe extra ausente/inválido */
      }
    }
  }
  animations.forEach(stripRootMotion);
  const rigged = chosen.ext !== "obj" && animations.length > 0;

  // embrulha num grupo para a normalização não conflitar com a animação do root
  const wrapper = new THREE.Group();
  wrapper.add(raw.scene);
  normalize(role, wrapper);

  return { scene: wrapper, animations, rigged };
}

export interface AvatarInstance {
  object: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  idle: THREE.AnimationAction | null;
  walk: THREE.AnimationAction | null;
  walkBack: THREE.AnimationAction | null;
  turnLeft: THREE.AnimationAction | null;
  turnRight: THREE.AnimationAction | null;
}

function pickClips(animations: THREE.AnimationClip[]) {
  const find = (re: RegExp) => animations.find((a) => re.test(a.name));
  const walkBack = find(/walkback|backward|back|tr[aá]s/i) || null;
  const idle = find(/idle|parad|stand|breath|respir/i) || animations[0] || null;
  const walk = find(/^walk$|walking|caminh/i) || animations[0] || null;
  const turnLeft = find(/turnleft/i) || null;
  const turnRight = find(/turnright/i) || null;
  return { idle, walk, walkBack, turnLeft, turnRight };
}

/** Instância (clone) do avatar do papel + mixer/ações quando há esqueleto. */
export async function getAvatarModel(role: AvatarRole): Promise<AvatarInstance> {
  if (!cache.has(role)) cache.set(role, build(role));
  const base = await cache.get(role)!;

  let object: THREE.Object3D;
  if (base.rigged) {
    const { clone } = await import("three/examples/jsm/utils/SkeletonUtils.js");
    object = clone(base.scene);
  } else {
    object = base.scene.clone(true);
  }

  if (!base.rigged || base.animations.length === 0) {
    return { object, mixer: null, idle: null, walk: null, walkBack: null, turnLeft: null, turnRight: null };
  }

  const mixer = new THREE.AnimationMixer(object);
  const { idle, walk, walkBack, turnLeft, turnRight } = pickClips(base.animations);
  const act = (c: THREE.AnimationClip | null) => (c ? mixer.clipAction(c) : null);
  return {
    object,
    mixer,
    idle: act(idle),
    walk: act(walk),
    walkBack: act(walkBack),
    turnLeft: act(turnLeft),
    turnRight: act(turnRight),
  };
}
