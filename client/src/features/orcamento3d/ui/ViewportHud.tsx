import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStudio } from "../store";

/* HUD sobre o canvas do estúdio:
   - mira em pontinho na 1ª e 3ª pessoa;
   - aviso explicando por que o cursor do mouse sumiu (pointer lock) na 1ª
     pessoa, com a dica de pressionar ESC para liberá-lo. */
export default function ViewportHud({ touch = false }: { touch?: boolean }) {
  const { cameraMode } = useStudio();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const sync = () => setLocked(!!document.pointerLockElement);
    sync();
    document.addEventListener("pointerlockchange", sync);
    return () => document.removeEventListener("pointerlockchange", sync);
  }, []);

  const showCrosshair = cameraMode === "primeira" || cameraMode === "terceira";
  const firstPerson = cameraMode === "primeira";

  return (
    <>
      {showCrosshair && (
        <div className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-5 w-5 rounded-full border border-white/25" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/90 ring-1 ring-black/50" style={{ boxShadow: "0 0 4px rgba(0,0,0,0.9)" }} />
          </div>
        </div>
      )}

      {firstPerson && !touch && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[15] flex justify-center px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={locked ? "locked" : "unlocked"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs backdrop-blur-md ${
                locked ? "border-champagne/40 bg-black/70 text-champagne" : "border-white/15 bg-black/60 text-muted"
              }`}
            >
              {locked ? (
                <span>🔒 Cursor oculto para olhar ao redor. Pressione <b className="text-text">ESC</b> para liberar o mouse.</span>
              ) : (
                <span>🖱️ Clique na cena para olhar ao redor (o cursor fica oculto enquanto você navega).</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
