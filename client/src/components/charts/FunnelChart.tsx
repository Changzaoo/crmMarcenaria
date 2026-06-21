import { useId } from "react";
import { CHART_THEME } from "./chartUtils";

export interface FunnelStage {
  label: string;
  /** valor principal (largura da barra) — ex.: valor estimado. */
  value: number;
  /** contagem opcional exibida ao lado do rótulo. */
  count?: number;
  /** valor secundário opcional (ex.: ponderado por probabilidade). */
  secondary?: number;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  formatValue?: (v: number) => string;
  /** rótulo do valor secundário na legenda/tooltip. */
  secondaryLabel?: string;
  title?: string;
  ariaLabel?: string;
}

/**
 * Funil comercial em SVG puro (barras centralizadas afuniladas por etapa).
 * Responsivo (viewBox) e acessível (role="img", aria-label, <title>/<desc>).
 * A largura de cada etapa é proporcional ao maior valor (não força decrescente:
 * reflete os números reais do funil). Usado em Relatórios e no Dashboard.
 */
export default function FunnelChart({
  stages,
  formatValue = (v) => String(v),
  secondaryLabel = "ponderado",
  title,
  ariaLabel,
}: FunnelChartProps) {
  const titleId = useId();
  const descId = useId();
  const W = 640;
  const rowH = 40;
  const gap = 8;
  const padT = 8;
  const H = padT * 2 + stages.length * rowH + (stages.length - 1) * gap;
  const maxVal = Math.max(1, ...stages.map((s) => Number(s.value) || 0));
  const minW = 60; // largura mínima para etapas com valor 0 (mantém legível)

  const resumoAria =
    ariaLabel ||
    `Funil comercial${title ? `: ${title}` : ""}. ${stages
      .map((s) => `${s.label}: ${s.count ?? 0} negócio(s), ${formatValue(Number(s.value) || 0)}`)
      .join("; ")}`;

  return (
    <figure className="w-full m-0">
      {title && <figcaption className="font-semibold mb-3 text-text">{title}</figcaption>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>{title || "Funil comercial"}</title>
        <desc id={descId}>{resumoAria}</desc>
        <defs>
          <linearGradient id={`funnelGrad-${titleId}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CHART_THEME.bronze} />
            <stop offset="100%" stopColor={CHART_THEME.accent} />
          </linearGradient>
        </defs>

        {stages.map((s, i) => {
          const v = Number(s.value) || 0;
          const w = Math.max(minW, (v / maxVal) * W);
          const x = (W - w) / 2;
          const yTop = padT + i * (rowH + gap);
          const sec = Number(s.secondary) || 0;
          const secW = v > 0 ? Math.max(0, (sec / maxVal) * W) : 0;
          const secX = (W - secW) / 2;
          return (
            <g key={s.label}>
              {/* trilho de fundo (largura total) */}
              <rect x={0} y={yTop} width={W} height={rowH} rx={6} fill={CHART_THEME.grid} />
              {/* barra do valor */}
              <rect x={x} y={yTop} width={w} height={rowH} rx={6} fill={`url(#funnelGrad-${titleId})`} opacity={0.9}>
                <title>{`${s.label}: ${s.count ?? 0} negócio(s) · ${formatValue(v)}${sec ? ` · ${secondaryLabel} ${formatValue(sec)}` : ""}`}</title>
              </rect>
              {/* faixa do valor ponderado, mais escura, sobre a barra */}
              {secW > 0 && (
                <rect x={secX} y={yTop + rowH - 6} width={secW} height={4} rx={2} fill={CHART_THEME.wood} opacity={0.85} />
              )}
              {/* rótulo da etapa (esquerda) */}
              <text x={12} y={yTop + rowH / 2 + 4} fontSize={12} fill={CHART_THEME.text} fontWeight={500}>
                {s.label}
                {typeof s.count === "number" ? ` (${s.count})` : ""}
              </text>
              {/* valor (direita) */}
              <text x={W - 12} y={yTop + rowH / 2 + 4} textAnchor="end" fontSize={12} fill={CHART_THEME.accent} fontWeight={600}>
                {formatValue(v)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
