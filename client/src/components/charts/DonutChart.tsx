import { useId } from "react";
import { CHART_THEME, corDaSerie } from "./chartUtils";

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  formatValue?: (v: number) => string;
  /** texto central (ex.: total). Se ausente, mostra a soma. */
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  title?: string;
  ariaLabel?: string;
}

/** Ponto na circunferência para um ângulo (em graus, 0 = topo, horário). */
function ponto(cx: number, cy: number, r: number, graus: number) {
  const rad = ((graus - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arco(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number) {
  const grande = a1 - a0 > 180 ? 1 : 0;
  const p0 = ponto(cx, cy, rOut, a0);
  const p1 = ponto(cx, cy, rOut, a1);
  const q1 = ponto(cx, cy, rIn, a1);
  const q0 = ponto(cx, cy, rIn, a0);
  return [
    `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${grande} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `L ${q1.x.toFixed(2)} ${q1.y.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${grande} 0 ${q0.x.toFixed(2)} ${q0.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/**
 * Gráfico de rosca (donut) em SVG puro. Responsivo e acessível
 * (role="img", aria-label, <title>). Usado em Relatórios para a origem dos leads.
 */
export default function DonutChart({
  data,
  formatValue = (v) => String(v),
  centerLabel = "Total",
  centerValue,
  size = 220,
  title,
  ariaLabel,
}: DonutChartProps) {
  const titleId = useId();
  const descId = useId();
  const cx = size / 2;
  const cy = size / 2;
  const rOut = size / 2 - 4;
  const rIn = rOut * 0.62;

  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const cor = (d: DonutSlice, i: number) => d.color || corDaSerie(i);

  const resumoAria =
    ariaLabel ||
    `Gráfico de rosca${title ? `: ${title}` : ""}. Total ${formatValue(total)}. ${data
      .map((d) => `${d.label}: ${formatValue(Number(d.value) || 0)} (${total ? Math.round(((Number(d.value) || 0) / total) * 100) : 0}%)`)
      .join("; ")}`;

  let angulo = 0;
  const fatias = data.map((d, i) => {
    const v = Number(d.value) || 0;
    const frac = total ? v / total : 0;
    const a0 = angulo;
    const a1 = angulo + frac * 360;
    angulo = a1;
    return { d, i, a0, a1, v, frac };
  });

  return (
    <figure className="w-full m-0 flex flex-col sm:flex-row items-center gap-5">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="shrink-0"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>{title || "Gráfico de rosca"}</title>
        <desc id={descId}>{resumoAria}</desc>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={(rOut + rIn) / 2} fill="none" stroke={CHART_THEME.grid} strokeWidth={rOut - rIn} />
        ) : (
          fatias.map((f) =>
            f.frac >= 0.999 ? (
              // Fatia única (100%): círculo completo evita arco degenerado.
              <circle
                key={f.d.label}
                cx={cx}
                cy={cy}
                r={(rOut + rIn) / 2}
                fill="none"
                stroke={cor(f.d, f.i)}
                strokeWidth={rOut - rIn}
              >
                <title>{`${f.d.label}: ${formatValue(f.v)} (100%)`}</title>
              </circle>
            ) : (
              <path key={f.d.label} d={arco(cx, cy, rOut, rIn, f.a0, f.a1)} fill={cor(f.d, f.i)} opacity={0.92}>
                <title>{`${f.d.label}: ${formatValue(f.v)} (${Math.round(f.frac * 100)}%)`}</title>
              </path>
            )
          )
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fill={CHART_THEME.muted}>
          {centerLabel}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={15} fontWeight={600} fill={CHART_THEME.text}>
          {centerValue ?? formatValue(total)}
        </text>
      </svg>

      <ul className="flex-1 w-full space-y-1.5 list-none p-0 m-0">
        {data.map((d, i) => {
          const v = Number(d.value) || 0;
          const pct = total ? Math.round((v / total) * 100) : 0;
          return (
            <li key={d.label} className="flex items-center gap-2 text-sm">
              <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: cor(d, i) }} aria-hidden="true" />
              <span className="text-muted truncate flex-1">{d.label}</span>
              <span className="text-text tabular-nums">{formatValue(v)}</span>
              <span className="text-muted text-xs tabular-nums w-9 text-right">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
