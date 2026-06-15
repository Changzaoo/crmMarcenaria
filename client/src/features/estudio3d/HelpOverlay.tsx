import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "./Portal";
import { isMobileViewport } from "../../lib/webgl";
import { useOrc3d } from "./useOrcamento3DStore";

const SEEN_KEY = "orc3d:helpSeen:v1";

/* Ajuda contextual: botão fixo "?" + painel com os controles do modo
   atual. Abre sozinho na primeira vez. */
export default function HelpOverlay() {
  const mode = useOrc3d((s) => s.viewMode);
  const mobile = isMobileViewport();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        setOpen(true);
        localStorage.setItem(SEEN_KEY, "1");
      }
    } catch {
      /* noop */
    }
  }, []);

  const sections: { title: string; items: string[] }[] = [
    {
      title: "Modos de visão",
      items: [
        "1ª Pessoa — ande dentro do ambiente",
        "3ª Pessoa — controle um avatar no espaço",
        "Isométrico — vista inclinada para organizar",
        "Vista superior — planta baixa interativa",
        !mobile ? "Atalhos: teclas 1, 2, 3 e 4" : "Troque pelos botões no topo",
      ],
    },
    mode === "primeira"
      ? {
          title: "Andar (1ª pessoa)",
          items: mobile
            ? ["Joystick à esquerda para mover", "Arraste no lado direito para olhar"]
            : ["W A S D para mover", "Mouse para olhar (clique para travar)", "ESC libera o mouse"],
        }
      : mode === "terceira"
      ? {
          title: "Andar (3ª pessoa)",
          items: mobile
            ? ["Joystick à esquerda para andar e girar", "Use o seletor de andares para trocar de pavimento"]
            : ["W/S andam, A/D giram", "Use o seletor de andares para trocar de pavimento"],
        }
      : {
          title: mode === "topo" ? "Vista superior" : "Organizar (isométrico)",
          items: [
            mobile ? "Toque e arraste um móvel para mover" : "Clique e arraste um móvel para mover",
            "Toque/clique seleciona; o painel mostra a edição",
            "Snap encaixa em paredes, cantos e outros móveis",
            "Controle andares, paredes e visibilidade no painel da esquerda",
            mobile ? "Pinça para zoom" : "Scroll para zoom, arraste o fundo para navegar",
          ],
        },
    {
      title: "Edição e orçamento",
      items: [
        "Ajuste medidas, material, portas, gavetas e LED",
        "Desfazer/Refazer a qualquer momento",
        "Salve o projeto e solicite o orçamento estimado",
        "Chame um arquiteto para montar junto, ao vivo, com voz",
      ],
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ajuda"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-champagne/30 bg-[rgba(12,10,8,0.7)] text-champagne backdrop-blur-md transition hover:bg-champagne/15"
      >
        ?
      </button>

      <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[75] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-champagne/20 bg-surface p-6 shadow-card"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-widest2 text-champagne/80">Como usar</p>
                  <h3 className="font-display text-2xl italic text-text">Seu estúdio 3D</h3>
                </div>
                <button onClick={() => setOpen(false)} className="text-muted hover:text-text">✕</button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {sections.map((s) => (
                  <div key={s.title} className="rounded-xl border border-champagne/10 bg-surfaceSoft/40 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-champagne/80">{s.title}</p>
                    <ul className="space-y-1.5 text-sm text-muted">
                      {s.items.map((it) => (
                        <li key={it} className="flex gap-2">
                          <span className="text-champagne/60">·</span>
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </>
  );
}
