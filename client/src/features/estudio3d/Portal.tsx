import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* Renderiza os filhos num container preso ao <body>, ACIMA do estúdio 3D.

   Por quê: a barra superior do estúdio usa `backdrop-blur`, que cria um
   "stacking context". Modais montados dentro dela (Enviar para análise,
   Ajuda, etc.) ficam presos nesse contexto e o canvas/painéis — que vêm
   depois no DOM — acabam pintando por cima, mesmo com z-index alto.
   Portando para o body, o modal escapa do contexto e aparece na frente. */
export default function Portal({ children }: { children: ReactNode }) {
  const [el] = useState(() => (typeof document !== "undefined" ? document.createElement("div") : null));

  useEffect(() => {
    if (!el) return;
    el.style.position = "relative";
    el.style.zIndex = "2147483000"; // acima do estúdio (z-50) e de qualquer overlay
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [el]);

  if (!el) return null;
  return createPortal(children, el);
}
