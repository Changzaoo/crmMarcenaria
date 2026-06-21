import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionValue, useMotionValueEvent } from "framer-motion";
import { isMobileViewport } from "../../lib/webgl";
import { openStudio } from "../studio3d-core/useOrcamento3DStore";

/* ============================================================
   Orcamento3DEntry — chamada premium que surge quando a primeira
   cena 3D termina de montar (progresso do scroll perto do fim).
   ENTER no desktop / botão grande no mobile abrem o Estúdio 3D.
   ============================================================ */

interface Props {
  /** progresso de montagem da cena (0→1) vindo do Hero */
  progress: MotionValue<number>;
}

export default function Orcamento3DEntry({ progress }: Props) {
  const [ready, setReady] = useState(progress.get() >= 0.93);
  const mobile = isMobileViewport();

  useMotionValueEvent(progress, "change", (v) => {
    const next = v >= 0.93;
    setReady((prev) => (prev === next ? prev : next));
  });

  // ENTER abre o estúdio no desktop
  useEffect(() => {
    if (!ready || mobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat) {
        e.preventDefault();
        openStudio();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, mobile]);

  return (
    <AnimatePresence>
      {ready && (
        <motion.div
          key="orc3d-entry"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-x-0 bottom-[14vh] z-20 flex justify-center px-6"
        >
          <div className="pointer-events-auto px-2 py-1 text-center">
            {mobile ? (
              <button
                type="button"
                onClick={openStudio}
                className="rounded-full border border-champagne/50 bg-surface/90 px-8 py-4 text-lg font-semibold tracking-wide text-champagne shadow-card backdrop-blur-md"
              >
                Iniciar orçamento 3D
              </button>
            ) : (
              <motion.button
                type="button"
                onClick={openStudio}
                animate={{ opacity: [0.78, 1, 0.78] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-champagne/40 bg-surface/80 px-6 py-3.5 text-lg font-medium text-text shadow-card backdrop-blur-md transition hover:border-champagne/70 hover:bg-surface/90"
                aria-label="Pressione ENTER ou clique para iniciar seu orçamento 3D"
              >
                Pressione
                <kbd className="rounded-lg border border-champagne/60 bg-surface px-3.5 py-1.5 font-sans text-base font-bold tracking-wider text-champagne">
                  ENTER
                </kbd>
                para iniciar seu orçamento 3D
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
