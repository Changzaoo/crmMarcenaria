import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "./Portal";
import { createStore, useStore } from "../../lib/tinyStore";
import { useOrc3d } from "./useOrcamento3DStore";

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

type Role = "cliente" | "arquiteto";

/* Tutorial detalhado, ponto a ponto. O texto se adapta ao PAPEL:
   - cliente  → visão do cliente sobre a empresa (site público): "monte e peça orçamento".
   - arquiteto → visão do arquiteto sobre o cliente (CRM): "acompanhe e finalize o projeto". */
function buildSteps(role: Role): Step[] {
  const arq = role === "arquiteto";
  return [
    {
      icon: "🏠",
      title: arq ? "Sessão do cliente no Estúdio 3D" : "Bem-vindo ao Estúdio 3D",
      body: arq
        ? "Você está dentro do ambiente 3D do cliente. Tudo o que você mover, adicionar ou ajustar aparece para ele em tempo real — e vice-versa. Este guia explica cada parte da tela, detalhe por detalhe."
        : "Aqui você monta seu ambiente de marcenaria em 3D, vê o preço estimado na hora e pode falar com um arquiteto da nossa equipe ao vivo. Este guia explica cada parte da tela, detalhe por detalhe.",
      tips: [
        "Tudo é salvo automaticamente enquanto você trabalha",
        arq
          ? "Suas edições são vistas pelo cliente na hora (avatares, chat e voz)"
          : "Você pode chamar um arquiteto para montar junto, ao vivo",
        "Reabra este tutorial quando quiser pelo botão Tutorial no topo",
      ],
    },
    {
      icon: "🧭",
      title: "A barra do topo",
      body: "No alto da tela ficam, da esquerda para a direita: o nome “Estúdio 3D” e o status de conexão; os modos de visão (centro); e, à direita, as ações do projeto.",
      tips: [
        "🟢 Online = a sessão em tempo real está conectada",
        "Voz — fala por áudio com a outra pessoa na sala",
        "↺ / ↻ — Desfazer e Refazer a última ação",
        "Salvar · Enviar · e o menu “⋯” com Capturar, Exportar, Começar do zero e Sair",
      ],
    },
    {
      icon: "🎥",
      title: "Modos de visão (teclas 1–4)",
      body: "No centro do topo você escolhe como olhar o ambiente. Cada modo serve a um objetivo diferente.",
      tips: [
        "1 · Primeira pessoa — ande dentro do ambiente, na altura dos olhos",
        "2 · Terceira pessoa — controle um avatar e veja o espaço ao redor dele",
        "3 · Isométrico — vista inclinada, ideal para organizar os móveis",
        "4 · Vista superior — planta baixa, vista de cima",
      ],
    },
    {
      icon: "🧲",
      title: "Snap e Grade",
      body: "Ainda no topo: “Snap” liga o encaixe automático (os móveis grudam em paredes, cantos e uns nos outros) e “Grade” mostra/esconde a malha do piso para alinhar com precisão.",
      tips: [
        "Deixe o Snap ligado para alinhamentos limpos",
        "Desligue o Snap para um posicionamento livre, milimétrico",
      ],
    },
    {
      icon: "🚶",
      title: "Andar, olhar e o modo cursor",
      body: "Na 1ª e 3ª pessoa, use W A S D (ou as setas) para se mover. Na 1ª pessoa o mouse controla o olhar e fica oculto.",
      tips: [
        "Botão “🖱️ Cursor” — libera o ponteiro para clicar/arrastar móveis em 1ª/3ª pessoa",
        "Pressione ESC para liberar o cursor do mouse",
        "No celular, use o joystick na tela",
      ],
    },
    {
      icon: "🪑",
      title: "Biblioteca de móveis (painel esquerdo)",
      body: arq
        ? "À esquerda fica a biblioteca. Clique num móvel para adicioná-lo ao ambiente do cliente. Use a busca e os filtros por categoria (balcões, prateleiras, armários, ilhas…)."
        : "À esquerda fica a biblioteca. Clique num móvel para adicioná-lo. Use a busca e os filtros por categoria (balcões, prateleiras, armários, ilhas…).",
      tips: [
        "Importe modelos próprios com “⬆ Importar modelo 3D”",
        "Formatos aceitos: glb, gltf, obj, stl e fbx",
      ],
    },
    {
      icon: "✋",
      title: "Mover, girar e escadas",
      body: "Clique num móvel para selecioná-lo e arraste-o pelo piso. Em 1ª/3ª pessoa, ligue o modo Cursor antes de arrastar. Pressione R para girar 15° (Shift+R no sentido contrário).",
      tips: [
        "O encaixe (Snap) alinha automaticamente em paredes, cantos e móveis",
        "A escada também pode ser arrastada — o vão no piso de cima acompanha",
        "Desfazer/Refazer: Ctrl+Z / Ctrl+Y",
      ],
    },
    {
      icon: "🎛️",
      title: "Propriedades do móvel (painel direito)",
      body: "Com um móvel selecionado, o painel “Móvel selecionado” à direita ajusta tudo: largura, altura, profundidade, rotação, material/cor, portas, gavetas, puxadores e LED.",
      tips: [
        "A estimativa de preço se atualiza conforme você edita",
        "Trave um móvel para não movê-lo sem querer",
      ],
    },
    {
      icon: "🏢",
      title: "Andares e paredes",
      body: "No canto superior esquerdo da cena: adicione pavimentos e alterne entre eles. As paredes podem ficar altas, baixas (estilo casa de boneca) ou invisíveis — e há um controle para mudar a ALTURA do pé-direito ao vivo.",
      tips: [
        "Arraste o controle de Altura para deixar as paredes mais altas ou baixas",
        "Use a visibilidade dos andares para enxergar melhor o que importa",
      ],
    },
    {
      icon: "💰",
      title: "Orçamento (painel direito)",
      body: arq
        ? "O painel “Orçamento” mostra a estimativa de valores, complexidade e prazo conforme o projeto cresce. É a base do pré-orçamento que será enviado para análise."
        : "O painel “Orçamento” mostra uma estimativa de valores, complexidade e prazo conforme você adiciona móveis. É só uma referência inicial — a equipe confirma os valores finais.",
      tips: ["O valor muda automaticamente a cada alteração no projeto"],
    },
    {
      icon: "🤝",
      title: arq ? "Atendimento ao vivo com o cliente" : "Atendimento ao vivo com um arquiteto",
      body: arq
        ? "Você e o cliente estão na MESMA sala 3D. Vocês veem os avatares um do outro, e podem conversar por chat (💬) e por voz (Voz). Oriente o cliente movendo e ajustando os móveis junto com ele."
        : "Clique em “Chamar arquiteto” para que um especialista da nossa equipe entre no MESMO ambiente, em tempo real. Dá para conversar por chat (💬) e por voz (Voz).",
      tips: [
        "Os avatares mostram quem é o cliente e quem é o arquiteto, com o nome",
        "Tudo o que um faz aparece para o outro na hora",
      ],
    },
    {
      icon: arq ? "📥" : "📤",
      title: arq ? "Salvar e finalizar" : "Salvar, orçamento e envio",
      body: arq
        ? "Use Salvar para guardar o progresso. Quando o projeto estiver redondo, “Enviar” o registra para análise/orçamento final. No menu “⋯” você ainda Captura uma imagem, Exporta um resumo e Sai da sessão."
        : "Use Salvar para guardar. Quando estiver pronto, “Enviar para análise” manda seu projeto (móveis + valores) para a nossa equipe. No menu “⋯” você ainda pode Capturar uma imagem e Exportar um resumo.",
      tips: [
        "Capturar gera uma imagem da cena para o projeto",
        "Exportar baixa um resumo (JSON ou versão imprimível)",
      ],
    },
    {
      icon: "⌨️",
      title: "Atalhos de teclado",
      body: "Para agilizar: use os atalhos abaixo a qualquer momento.",
      tips: [
        "1 · 2 · 3 · 4 — trocar de modo de visão",
        "W A S D / setas — andar (1ª e 3ª pessoa)",
        "R / Shift+R — girar o móvel selecionado",
        "Ctrl+Z / Ctrl+Y — desfazer / refazer · ESC — liberar o cursor",
      ],
    },
  ];
}

export default function Tutorial() {
  const open = useStore(gate, (s) => s.open);
  const role = useOrc3d((s) => s.role);
  const STEPS = buildSteps(role);
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
