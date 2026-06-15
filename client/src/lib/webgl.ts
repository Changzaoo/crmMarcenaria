let cached: boolean | null = null;

/** Detecta suporte a WebGL para exibir fallback elegante quando indisponível. */
export function supportsWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    cached = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    cached = false;
  }
  return cached;
}

/** True em dispositivos de mão (inclui celular DEITADO, cuja largura passa de
    768px) — usa o menor lado da tela e a capacidade de toque, não só a largura. */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  const touch = "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const minSide = Math.min(window.innerWidth, window.innerHeight);
  return (touch && coarse && minSide <= 820) || minSide < 768;
}
