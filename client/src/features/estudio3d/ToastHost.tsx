import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ToastDetail } from "./toast";

interface Item extends ToastDetail {
  id: number;
}

const TONE: Record<string, string> = {
  info: "border-champagne/30 text-text",
  success: "border-emerald-400/40 text-emerald-200",
  warn: "border-amber-400/40 text-amber-200",
};

export default function ToastHost() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      const id = Date.now() + Math.random();
      setItems((cur) => [...cur, { ...detail, id }]);
      setTimeout(() => setItems((cur) => cur.filter((i) => i.id !== id)), 4200);
    };
    window.addEventListener("orc3d:toast", handler);
    return () => window.removeEventListener("orc3d:toast", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {items.map((i) => (
          <motion.div
            key={i.id}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            className={`rounded-xl border bg-[rgba(12,10,8,0.92)] px-4 py-2.5 text-sm shadow-card backdrop-blur-md ${TONE[i.tone]}`}
          >
            {i.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
