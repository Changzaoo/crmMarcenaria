/* ============================================================
   tinyStore — store mínima estilo Zustand, sem dependências.
   Usa useSyncExternalStore (React 18) para re-render seguro.
   Mantém o bundle leve e evita instalar libs extras.
   ============================================================ */
import { useSyncExternalStore } from "react";

export interface StoreApi<T> {
  getState: () => T;
  setState: (partial: Partial<T> | ((s: T) => Partial<T>)) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T>(init: T): StoreApi<T> {
  let state = init;
  const listeners = new Set<() => void>();

  const getState = () => state;
  const setState: StoreApi<T>["setState"] = (partial) => {
    const next = typeof partial === "function" ? (partial as (s: T) => Partial<T>)(state) : partial;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { getState, setState, subscribe };
}

/** Hook com seletor — só re-renderiza quando o slice muda (Object.is). */
export function useStore<T, S>(store: StoreApi<T>, selector: (s: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}
