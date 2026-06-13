import { useMemo } from "react";
import { motion } from "framer-motion";
import { X, FileText, Send } from "lucide-react";
import { useStudio } from "../store";
import { gerarResumo } from "../services/budgetSummaryService";

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function ProjectSummaryPanel({
  onClose,
  onEnviar,
  enviado,
  enviando,
}: {
  onClose: () => void;
  onEnviar: () => void;
  enviado: boolean;
  enviando: boolean;
}) {
  const { doc } = useStudio();
  const resumo = useMemo(() => gerarResumo(doc), [doc]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onMouseDown={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl flex items-center gap-2"><FileText size={20} className="text-champagne" /> Pré-orçamento</h2>
          <button onClick={onClose} className="text-muted hover:text-text text-xl px-2">✕</button>
        </div>

        <div className="text-sm text-muted mb-4">
          <span className="text-text font-medium">{doc.projectName}</span> · {doc.environment.tipo}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Área" value={`${resumo.ambiente.area} m²`} />
          <Stat label="Perímetro" value={`${resumo.ambiente.perimetro} m`} />
          <Stat label="Itens" value={`${resumo.totalItens}`} />
        </div>

        <div className="rounded-lg border border-white/10 divide-y divide-white/5 mb-4">
          {resumo.linhas.length === 0 && <div className="p-3 text-sm text-muted text-center">Nenhum móvel adicionado ainda.</div>}
          {resumo.linhas.map((l, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 text-sm">
              <div className="min-w-0">
                <div className="text-text truncate">{l.quantidade}× {l.name}</div>
                <div className="text-[11px] text-muted">{l.material}</div>
              </div>
              <div className="text-champagne shrink-0">{brl(l.estimativa)}</div>
            </div>
          ))}
        </div>

        {resumo.linhas.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-champagne/10 border border-champagne/30 px-3 py-2.5 mb-4">
            <span className="text-sm text-text">Estimativa visual</span>
            <span className="font-display text-lg text-champagne">{brl(resumo.estimativaMin)} – {brl(resumo.estimativaMax)}</span>
          </div>
        )}

        {doc.notes && <p className="text-sm text-muted mb-3"><span className="text-text">Observações:</span> {doc.notes}</p>}

        <p className="text-[12px] text-muted bg-surfaceSoft rounded-lg p-3 mb-4">
          Este é um pré-orçamento visual. Nossa equipe irá analisar as medidas, materiais e complexidade para enviar uma proposta personalizada.
        </p>

        {enviado ? (
          <div className="text-center text-emerald-300 text-sm font-medium py-2">✓ Projeto enviado para análise da marcenaria!</div>
        ) : (
          <button onClick={onEnviar} disabled={enviando} className="btn-primary w-full py-3">
            <Send size={16} /> {enviando ? "Enviando..." : "Enviar para análise da marcenaria"}
          </button>
        )}
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surfaceSoft border border-white/5 p-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="text-sm font-semibold text-text mt-0.5">{value}</div>
    </div>
  );
}
