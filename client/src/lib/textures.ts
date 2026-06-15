import * as THREE from "three";

/* ============================================================
   Texturas procedurais geradas em canvas — madeira (lâmina),
   pedra (quartzo/sinterizada), piso porcelanato e sombra de
   contato. Sem assets externos, leves para GPUs modestas.
   ============================================================ */

const cache = new Map<string, THREE.CanvasTexture>();

function makeCanvas(size = 512) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return { canvas: c, ctx: c.getContext("2d")! };
}

function finish(canvas: HTMLCanvasElement, repeat: [number, number]): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Lâmina de madeira com veios verticais (freijó, nogueira etc). */
export function woodTexture(
  base: string,
  streakDark: string,
  streakLight: string,
  repeat: [number, number] = [1, 1]
): THREE.CanvasTexture {
  const key = `wood:${base}:${streakDark}:${streakLight}:${repeat.join(",")}`;
  if (cache.has(key)) return cache.get(key)!;

  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);

  // Veios verticais ondulados
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * 512;
    const dark = Math.random() > 0.45;
    ctx.strokeStyle = dark ? streakDark : streakLight;
    ctx.globalAlpha = 0.04 + Math.random() * 0.12;
    ctx.lineWidth = 0.6 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(x, -10);
    const wobble = 4 + Math.random() * 14;
    ctx.bezierCurveTo(
      x + (Math.random() - 0.5) * wobble, 170,
      x + (Math.random() - 0.5) * wobble, 340,
      x + (Math.random() - 0.5) * wobble, 522
    );
    ctx.stroke();
  }

  // Nós/catedrais sutis
  for (let i = 0; i < 5; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    ctx.strokeStyle = streakDark;
    for (let r = 6; r < 40; r += 7) {
      ctx.globalAlpha = 0.05;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.6, r * 1.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const tex = finish(canvas, repeat);
  cache.set(key, tex);
  return tex;
}

/** Pedra clara com veios discretos (quartzo / sinterizada). */
export function stoneTexture(repeat: [number, number] = [1, 1]): THREE.CanvasTexture {
  const key = `stone:${repeat.join(",")}`;
  if (cache.has(key)) return cache.get(key)!;

  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = "#e9e3d7";
  ctx.fillRect(0, 0, 512, 512);

  // Granulação fina
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#ddd5c6" : "#f2ede2";
    ctx.globalAlpha = 0.15;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }

  // Veios diagonais suaves
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = "#b9ae9c";
    ctx.globalAlpha = 0.1 + Math.random() * 0.12;
    ctx.lineWidth = 0.8 + Math.random() * 1.6;
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(140, y + (Math.random() - 0.5) * 160, 360, y + (Math.random() - 0.5) * 160, 532, y + (Math.random() - 0.5) * 120);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = finish(canvas, repeat);
  cache.set(key, tex);
  return tex;
}

/** Porcelanato escuro com juntas finas. */
export function floorTexture(repeat: [number, number] = [4, 4]): THREE.CanvasTexture {
  const key = `floor:${repeat.join(",")}`;
  if (cache.has(key)) return cache.get(key)!;

  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = "#221c16";
  ctx.fillRect(0, 0, 512, 512);

  // Variação tonal por placa
  for (const [ox, oy] of [
    [0, 0],
    [256, 0],
    [0, 256],
    [256, 256],
  ]) {
    ctx.fillStyle = Math.random() > 0.5 ? "#241e18" : "#1f1a14";
    ctx.globalAlpha = 0.6;
    ctx.fillRect(ox, oy, 256, 256);
  }
  ctx.globalAlpha = 1;

  // Nuvens sutis de mármore escuro
  for (let i = 0; i < 10; i++) {
    ctx.strokeStyle = "#33291f";
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 90, 340, y + (Math.random() - 0.5) * 90, 532, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Juntas
  ctx.strokeStyle = "#0c0a07";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  const tex = finish(canvas, repeat);
  cache.set(key, tex);
  return tex;
}

/** Sombra de contato radial — aterra os móveis no piso. */
export function contactShadowTexture(): THREE.CanvasTexture {
  const key = "shadow";
  if (cache.has(key)) return cache.get(key)!;

  const { canvas, ctx } = makeCanvas(256);
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 126);
  grad.addColorStop(0, "rgba(0,0,0,0.5)");
  grad.addColorStop(0.6, "rgba(0,0,0,0.22)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  cache.set(key, tex);
  return tex;
}
