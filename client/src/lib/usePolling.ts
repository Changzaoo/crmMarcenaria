import { useEffect, useRef } from "react";

// Executa `fn` em intervalo enquanto a aba estiver visível — para manter os dados
// atualizados sem o usuário precisar apertar um botão de "Atualizar".
export function usePolling(fn: () => void | Promise<void>, ms = 12000, enabled = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void ref.current();
    }, ms);
    return () => clearInterval(t);
  }, [ms, enabled]);
}
