import { useSyncExternalStore } from "react";

/* Cache de "fotos" (PNG dataURL) dos móveis do catálogo, geradas uma única vez
   pelo ThumbnailFactory a partir da geometria 3D real. */
const cache: Record<string, string> = {};
const listeners = new Set<() => void>();

export function setThumb(id: string, url: string) {
  cache[id] = url;
  listeners.forEach((l) => l());
}

export function hasThumb(id: string) {
  return !!cache[id];
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useThumb(id: string): string | undefined {
  return useSyncExternalStore(
    subscribe,
    () => cache[id],
    () => cache[id]
  );
}
