import { useOrc3d } from "./useOrcamento3DStore";
import { brl } from "./pricingEngine";

const SCORE_LABEL: Record<string, { label: string; cls: string }> = {
  frio: { label: "Frio", cls: "bg-sky-500/15 text-sky-300 border-sky-400/30" },
  morno: { label: "Morno", cls: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
  quente: { label: "Quente", cls: "bg-rose-500/15 text-rose-300 border-rose-400/30" },
  "projeto-grande": { label: "Projeto grande", cls: "bg-champagne/15 text-champagne border-champagne/40" },
};

const COMPLEXITY_LABEL: Record<string, string> = { simples: "Baixa", medio: "Média", alto: "Alta" };

export default function EstimatePanel() {
  const estimate = useOrc3d((s) => s.estimate);
  const score = useOrc3d((s) => s.leadScore);
  const count = useOrc3d((s) => s.doc.furniture.length);
  const sc = SCORE_LABEL[score];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-widest2 text-champagne/80">Estimativa inicial</p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${sc.cls}`}>{sc.label}</span>
      </div>

      <p className="mt-2 font-display text-2xl text-text">
        {brl(estimate.min)} <span className="text-muted">—</span> {brl(estimate.max)}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-champagne/10 bg-surface/40 py-2">
          <p className="text-sm font-semibold text-text">{count}</p>
          <p className="text-[10px] text-muted">móveis</p>
        </div>
        <div className="rounded-lg border border-champagne/10 bg-surface/40 py-2">
          <p className="text-sm font-semibold text-text">{COMPLEXITY_LABEL[estimate.complexity]}</p>
          <p className="text-[10px] text-muted">complexidade</p>
        </div>
        <div className="rounded-lg border border-champagne/10 bg-surface/40 py-2">
          <p className="text-sm font-semibold text-text">{estimate.deadlineDays[0]}–{estimate.deadlineDays[1]}</p>
          <p className="text-[10px] text-muted">dias úteis</p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Esse valor é uma estimativa inicial. Nossa equipe fará a análise técnica para enviar o orçamento final.
      </p>
    </div>
  );
}
