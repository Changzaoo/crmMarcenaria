import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "./Portal";
import { createStore, useStore } from "../../lib/tinyStore";

/* Supertutorial guiado do editor 3D — passo a passo com ilustrações simples.
   Abre sozinho na primeira vez e pode ser reaberto pelo botão "Tutorial". */

const SEEN_KEY = "orc3d:tutorialSeen:v1";

const gate = createStore<{ open: boolean }>({ open: false });
export const openTutorial = () => gate.setState({ open: true });
const closeTutorial = () => gate.setState({ open: false });

interface Step {
  icon: string;
  title: string;
  body: string;
  tips: string[];
}

const STEPS: Step[] = [
  {
    icon: "🏠",
    title: "Bem-vindo ao Estúdio 3D",
    body: "Aqui você monta seu ambiente de marcenaria em 3D e recebe uma estimativa na hora. Vamos ver o essencial em menos de 1 minuto.",
    tips: ["Tudo é salvo automaticamente", "Você pode chamar um arquiteto para montar junto, ao vivo"],
  },
  {
    icon: "🎥",
    title: "Modos de visão",
    body: "Troque a forma de ver o ambiente na barra do topo — ou pelas teclas 1, 2, 3 e 4.",
    tips: [
      "1 · Primeira pessoa — ande dentro do ambiente",
      "2 · Terceira pessoa — controle um avatar",
      "3 · Isométrico — vista inclinada para organizar",
      "4 · Vista superior — planta baixa",
    ],
  },
  {
    icon: "🚶",
    title: "Andar e olhar",
    body: "Na 1ª e 3ª pessoa, use W A S D (ou as setas) para mover. Uma mira em pontinho aparece no centro da tela.",
    tips: [
      "Na 1ª pessoa o mouse controla o olhar e fica oculto",
      "Pressione ESC para liberar o cursor do mouse",
      "No celular, use o joystick na tela",
    ],
  },
  {
    icon: "🪑",
    title: "Adicionar móveis",
    body: "Abra a biblioteca à esquerda e clique em um móvel para adicioná-lo. Use a busca e os filtros por categoria.",
    tips: [
      "Importe seus próprios modelos com “⬆ Importar modelo 3D”",
      "Formatos aceitos: glb, gltf, obj, stl e fbx",
    ],
  },
  {
    icon: "✋",
    title: "Posicionar e organizar",
    body: "No modo isométrico ou de topo, clique e arraste um móvel pelo piso. O encaixe (snap) alinha automaticamente em paredes, cantos e outros móveis.",
    tips: ["Clique em um móvel para selecioná-lo", "Use Desfazer/Refazer (Ctrl+Z / Ctrl+Y)"],
  },
  {
    icon: "🎛️",
    title: "Editar o móvel",
    body: "Com um móvel selecionado, o painel à direita permite ajustar medidas, material, portas, gavetas, puxadores e LED.",
    tips: ["A estimativa de preço atualiza conforme você edita"],
  },
  {
    icon: "🏢",
    title: "Andares e paredes",
    body: "Adicione pavimentos no painel da esquerda e alterne entre eles. As paredes podem ficar altas, rebaixadas ou invisíveis (estilo casa de boneca).",
    tips: ["Controle a visibilidade dos andares para enxergar melhor"],
  },
  {
    icon: "🤝",
    title: "Atendimento ao vivo",
    body: "Clique em “Chamar arquiteto” para que um especialista entre no MESMO ambiente em tempo real. Dá para conversar por chat e por voz.",
    tips: ["Vocês veem os avatares um do outro no espaço 3D"],
  },
  {
    icon: "📤",
    title: "Orçamento e envio",
    body: "Acompanhe a estimativa no painel de Orçamento. Quando estiver pronto, use “Enviar para análise” — nossa equipe recebe seu projeto com móveis e valores.",
    tips: ["Você também pode Salvar e Exportar um resumo"],
  },
];

export default function Tutorial() {
  const open = useStore(gate, (s) => s.open);
  const [step, setStep] = useState(0);

  // abre sozinho na primeira vez
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        gate.setState({ open: true });
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const finish = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* noop */
    }
    closeTutorial();
  };

  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={finish}
          >
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-champagne/20 bg-surface shadow-card"
            >
              <div className="flex items-center justify-between border-b border-champagne/10 px-5 py-3">
                <span className="text-[11px] uppercase tracking-widest2 text-champagne/80">
                  Tutorial · {step + 1}/{STEPS.length}
                </span>
                <button onClick={finish} className="text-muted transition hover:text-text">
                  Pular ✕
                </button>
              </div>

              <div className="px-6 py-7 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-champagne/25 bg-champagne/10 text-3xl">
                  {s.icon}
                </div>
                <h3 className="font-display text-2xl text-text">{s.title}</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{s.body}</p>
                <ul className="mx-auto mt-4 max-w-md space-y-1.5 text-left">
                  {s.tips.map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-text/90">
                      <span className="mt-0.5 text-champagne">›</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* progresso */}
              <div className="flex justify-center gap-1.5 pb-4">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-champagne" : "w-1.5 bg-champagne/30"}`}
                    aria-label={`Passo ${i + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-champagne/10 px-5 py-3">
                <button
                  onClick={() => setStep((v) => Math.max(0, v - 1))}
                  disabled={step === 0}
                  className="rounded-lg px-3 py-2 text-sm text-muted transition hover:text-text disabled:opacity-40"
                >
                  ← Voltar
                </button>
                {last ? (
                  <button onClick={finish} className="rounded-lg bg-champagne/90 px-4 py-2 text-sm font-medium text-background transition hover:bg-champagne">
                    Começar a montar
                  </button>
                ) : (
                  <button
                    onClick={() => setStep((v) => Math.min(STEPS.length - 1, v + 1))}
                    className="rounded-lg bg-champagne/90 px-4 py-2 text-sm font-medium text-background transition hover:bg-champagne"
                  >
                    Próximo →
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
