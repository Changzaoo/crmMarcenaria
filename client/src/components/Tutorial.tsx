import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */
export interface TourStep {
  /** Seletor CSS do elemento que recebe o foco. Use data-tour="chave". */
  target?: string;
  title: string;
  body: string;
  /** Onde posicionar o balão em relação ao elemento. */
  placement?: "top" | "bottom" | "left" | "right";
}

interface TourContextType {
  /** Inicia o tutorial da página atual (ou de uma rota específica). */
  startTour: (path?: string) => void;
  /** Existe tutorial para a rota atual? */
  hasTour: boolean;
  /** Tutoriais automáticos estão ativos? */
  autoTutorials: boolean;
  /** Liga/desliga o início automático dos tutoriais. */
  setAutoTutorials: (enabled: boolean) => void;
}

const TourContext = createContext<TourContextType>({
  startTour: () => {},
  hasTour: false,
  autoTutorials: true,
  setAutoTutorials: () => {},
});
export const useTour = () => useContext(TourContext);

/* ------------------------------------------------------------------ */
/*  Passos por rota — foco nos elementos que o usuário deve usar       */
/* ------------------------------------------------------------------ */
const SIDEBAR_STEP: TourStep = {
  target: '[data-tour="sidebar"]',
  title: "Menu de navegação",
  body: "Use o menu lateral para circular entre os módulos: funil, clientes, orçamentos, projetos, agenda e financeiro.",
  placement: "right",
};

const HELP_STEP: TourStep = {
  target: '[data-tour="help"]',
  title: "Reabrir o tutorial",
  body: "Sempre que precisar, clique aqui para rever o passo a passo da página em que você estiver.",
  placement: "right",
};

const NOTIF_STEP: TourStep = {
  target: '[data-tour="notifications"]',
  title: "Central de notificações",
  body: "O sino mostra avisos importantes — por exemplo, quando um cliente chama um arquiteto no Estúdio 3D. O número indica quantos avisos ainda não foram lidos; clique para abri-los e ir direto ao atendimento.",
  placement: "right",
};

export const TOURS: Record<string, TourStep[]> = {
  "/": [
    {
      title: "Bem-vindo à LINEAR",
      body: "Este é um tour rápido e interativo. Vou destacar os elementos que você usa no dia a dia. Use Próximo para avançar ou Pular para sair.",
    },
    SIDEBAR_STEP,
    NOTIF_STEP,
    {
      target: '[data-tour="dash-cards"]',
      title: "Indicadores da operação",
      body: "Estes cartões resumem funil, conversão, produção e contas a receber. Clique em qualquer um para ir direto ao módulo.",
      placement: "bottom",
    },
    {
      target: '[data-tour="dash-followups"]',
      title: "Próximos follow-ups",
      body: "Acompanhe aqui os contatos pendentes. Itens vencidos aparecem em vermelho para você priorizar.",
      placement: "left",
    },
    {
      target: '[data-tour="page-action"]',
      title: "Criar um novo lead",
      body: "Este botão leva ao funil já pronto para cadastrar uma nova oportunidade.",
      placement: "left",
    },
    HELP_STEP,
  ],
  "/crm": [
    {
      title: "Funil comercial",
      body: "Aqui você gerencia as oportunidades por etapa. Vou mostrar como interagir com o quadro.",
    },
    {
      target: '[data-tour="page-action"]',
      title: "Novo lead",
      body: "Cadastre uma oportunidade com cliente, valor estimado e probabilidade.",
      placement: "left",
    },
    {
      target: '[data-tour="crm-board"]',
      title: "Arraste os cards",
      body: "Mova os cards entre as colunas para avançar a oportunidade de etapa. O valor do funil é recalculado automaticamente.",
      placement: "top",
    },
    HELP_STEP,
  ],
  "/clientes": [
    {
      target: '[data-tour="page-action"]',
      title: "Cadastrar cliente",
      body: "Registre empresas, redes, clínicas e arquitetos parceiros com CNPJ, segmento e contatos.",
      placement: "left",
    },
    {
      target: '[data-tour="page-search"]',
      title: "Buscar e filtrar",
      body: "Pesquise pelo nome e filtre entre clientes e arquitetos parceiros.",
      placement: "bottom",
    },
    HELP_STEP,
  ],
  "/orcamentos": [
    {
      target: '[data-tour="page-action"]',
      title: "Novo orçamento",
      body: "Crie uma proposta por ambiente e peças. Ao salvar, você vai direto para o editor.",
      placement: "left",
    },
    HELP_STEP,
  ],
  "/projetos": [
    {
      target: '[data-tour="page-action"]',
      title: "Novo projeto",
      body: "Cada projeto já nasce com as 10 etapas oficiais da produção LINEAR.",
      placement: "left",
    },
    HELP_STEP,
  ],
  "/catalogo": [
    {
      target: '[data-tour="page-action"]',
      title: "Novo material",
      body: "Cadastre insumos com unidade e preço — eles alimentam o orçamentador.",
      placement: "left",
    },
    {
      target: '[data-tour="page-search"]',
      title: "Buscar material",
      body: "Encontre rapidamente por nome ou fornecedor.",
      placement: "bottom",
    },
    HELP_STEP,
  ],
  "/suporte-3d": [
    {
      title: "Suporte 3D / Arquiteto",
      body: "Aqui chegam os clientes que iniciaram um Orçamento 3D. Quando alguém pede um arquiteto, o card sobe para o topo e fica destacado em âmbar — é o seu painel de atendimento ao vivo.",
    },
    NOTIF_STEP,
    {
      target: '[data-tour="page-search"]',
      title: "Buscar e filtrar leads",
      body: "Filtre por status (Novo, Em atendimento, Fechado…) ou busque por nome, e-mail ou cidade do cliente.",
      placement: "bottom",
    },
    {
      target: '[data-tour="suporte-card"]',
      title: "Ver ambiente ou Entrar",
      body: "“Ver ambiente” abre o projeto em modo leitura. “Entrar” abre a mesma cena do cliente em sessão colaborativa em tempo real — é onde você atende. Há também o atalho para o WhatsApp.",
      placement: "left",
    },
    HELP_STEP,
  ],
  "/agenda": [
    {
      target: '[data-tour="page-action"]',
      title: "Novo evento",
      body: "Agende medições, entregas, instalações e reuniões.",
      placement: "left",
    },
    HELP_STEP,
  ],
  "/financeiro": [
    {
      target: '[data-tour="page-action"]',
      title: "Nova parcela",
      body: "Lance recebíveis por projeto e acompanhe o que está a receber e o que está atrasado.",
      placement: "left",
    },
    HELP_STEP,
  ],
  "/pos-venda": [
    {
      title: "Pós-venda",
      body: "Acompanhe garantias e revisões — e gere novos leads a partir de clientes já atendidos.",
    },
    HELP_STEP,
  ],
  "/config": [
    {
      target: '[data-tour="page-action"]',
      title: "Salvar alterações",
      body: "Defina padrões, dados da empresa e templates. Não esqueça de salvar.",
      placement: "left",
    },
    HELP_STEP,
  ],
};

const SEEN_KEY = "linear:tour:seen";
export const TOUR_DISABLED_KEY = "linear:tour:disabled";

function loadSeen(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Tutoriais automáticos desativados? (flag global, compartilhada com o Estúdio 3D) */
export function toursDisabled(): boolean {
  try {
    return localStorage.getItem(TOUR_DISABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setToursDisabled(v: boolean) {
  try {
    localStorage.setItem(TOUR_DISABLED_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */
export function TourProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [disabled, setDisabled] = useState<boolean>(() => toursDisabled());

  const startTour = useCallback((path?: string) => {
    const key = path || location.pathname;
    const list = TOURS[key];
    if (!list || list.length === 0) return;
    setSteps(list);
  }, [location.pathname]);

  const close = useCallback(() => setSteps(null), []);

  const setAutoTutorials = useCallback((enabled: boolean) => {
    setToursDisabled(!enabled);
    setDisabled(!enabled);
    if (!enabled) setSteps(null);
  }, []);

  // Auto-início na primeira visita de cada página (a menos que desativado).
  useEffect(() => {
    if (disabled) return;
    const seen = loadSeen();
    if (seen[location.pathname]) return;
    if (!TOURS[location.pathname]) return;
    const t = setTimeout(() => startTour(location.pathname), 600);
    return () => clearTimeout(t);
  }, [location.pathname, startTour, disabled]);

  const finish = useCallback(() => {
    const seen = loadSeen();
    seen[location.pathname] = true;
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch {
      /* ignore */
    }
    close();
  }, [location.pathname, close]);

  return (
    <TourContext.Provider value={{ startTour, hasTour: !!TOURS[location.pathname], autoTutorials: !disabled, setAutoTutorials }}>
      {children}
      <AnimatePresence>
        {steps && (
          <GuidedTour
            key={location.pathname}
            steps={steps}
            onClose={finish}
            autoTutorials={!disabled}
            onToggleAutoTutorials={setAutoTutorials}
          />
        )}
      </AnimatePresence>
    </TourContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  GuidedTour — motor reutilizável (usado no app e no Estúdio 3D)     */
/* ------------------------------------------------------------------ */
export function GuidedTour({
  steps,
  onClose,
  autoTutorials,
  onToggleAutoTutorials,
}: {
  steps: TourStep[];
  onClose: () => void;
  autoTutorials?: boolean;
  onToggleAutoTutorials?: (enabled: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const total = steps.length;
  const safeIndex = Math.min(index, total - 1);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }, [total, onClose]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  if (total === 0) return null;

  return (
    <TourOverlay
      key={safeIndex}
      step={steps[safeIndex]}
      index={safeIndex}
      total={total}
      onNext={next}
      onPrev={prev}
      onSkip={onClose}
      autoTutorials={autoTutorials}
      onToggleAutoTutorials={onToggleAutoTutorials}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Overlay (modo focus / spotlight)                                   */
/* ------------------------------------------------------------------ */
const PAD = 8; // respiro ao redor do elemento destacado

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function TourOverlay({
  step,
  index,
  total,
  onNext,
  onPrev,
  onSkip,
  autoTutorials,
  onToggleAutoTutorials,
}: {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  autoTutorials?: boolean;
  onToggleAutoTutorials?: (enabled: boolean) => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);

  // Mede o elemento alvo e mantém atualizado em scroll/resize
  useLayoutEffect(() => {
    if (!step.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    };
    measure();
    const id = window.setInterval(measure, 250); // acompanha animações de entrada
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.target]);

  const isLast = index === total - 1;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Camada que captura cliques (impede interação fora do tutorial) */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Spotlight com box-shadow gigante = escurece tudo, ilumina o alvo */}
      {rect ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute rounded-xl pointer-events-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(8,7,6,0.82)",
            border: "2px solid #D8B978",
            outline: "4px solid rgba(216,185,120,0.18)",
          }}
        />
      ) : (
        // Sem alvo: fundo escurecido inteiro (passo de boas-vindas)
        <div className="absolute inset-0 bg-background/85 pointer-events-none" />
      )}

      <TourCard
        step={step}
        index={index}
        total={total}
        rect={rect}
        isLast={isLast}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        autoTutorials={autoTutorials}
        onToggleAutoTutorials={onToggleAutoTutorials}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Balão de instrução com Próximo / Pular                            */
/* ------------------------------------------------------------------ */
const CARD_W = 320;
const GAP = 16;

function TourCard({
  step,
  index,
  total,
  rect,
  isLast,
  onNext,
  onPrev,
  onSkip,
  autoTutorials,
  onToggleAutoTutorials,
}: {
  step: TourStep;
  index: number;
  total: number;
  rect: Rect | null;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  autoTutorials?: boolean;
  onToggleAutoTutorials?: (enabled: boolean) => void;
}) {
  const pos = computeCardPosition(rect, step.placement);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="absolute card p-5 shadow-card"
      style={{ width: CARD_W, ...pos }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[0.2em] text-champagne">
          Tutorial · {index + 1}/{total}
        </span>
        <button
          onClick={onSkip}
          className="text-muted hover:text-text text-lg leading-none px-1"
          aria-label="Pular tutorial"
        >
          ✕
        </button>
      </div>

      <h3 className="font-display text-xl text-text mb-1.5">{step.title}</h3>
      <p className="text-sm text-muted leading-relaxed">{step.body}</p>

      {/* Progresso */}
      <div className="flex gap-1.5 mt-4 mb-4">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition ${
              i <= index ? "bg-champagne" : "bg-surfaceSoft"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button className="text-sm text-muted hover:text-text" onClick={onSkip}>
          Pular
        </button>
        <div className="flex gap-2">
          {index > 0 && (
            <button className="btn-ghost !py-1.5" onClick={onPrev}>
              Anterior
            </button>
          )}
          <button className="btn-primary !py-1.5" onClick={onNext}>
            {isLast ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>

      {onToggleAutoTutorials && (
        <label className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!autoTutorials}
            onChange={(e) => onToggleAutoTutorials(e.target.checked)}
            className="accent-champagne w-3.5 h-3.5"
          />
          Mostrar tutoriais automaticamente nas próximas vezes
        </label>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Posicionamento do balão                                            */
/* ------------------------------------------------------------------ */
function computeCardPosition(
  rect: Rect | null,
  placement: TourStep["placement"]
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Sem alvo → centraliza
  if (!rect) {
    return { top: vh / 2 - 120, left: vw / 2 - CARD_W / 2 };
  }

  const estH = 240; // altura estimada do card
  let top = 0;
  let left = 0;

  const place = placement || "bottom";
  switch (place) {
    case "top":
      top = rect.top - estH - GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
      break;
    case "left":
      top = rect.top;
      left = rect.left - CARD_W - GAP;
      break;
    case "right":
      top = rect.top;
      left = rect.left + rect.width + GAP;
      break;
    case "bottom":
    default:
      top = rect.top + rect.height + GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
      break;
  }

  // Mantém dentro da viewport
  left = Math.max(GAP, Math.min(left, vw - CARD_W - GAP));
  top = Math.max(GAP, Math.min(top, vh - estH - GAP));
  return { top, left };
}
