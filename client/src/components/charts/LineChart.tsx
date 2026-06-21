import { useId } from "react";
import { CHART_THEME, corDaSerie } from "./chartUtils";

export interface LineSeries {
  key: string;
  label: string;
  color?: string;
  /** força o teto da escala desta série (ex.: 100 para percentuais). */
  max?: number;
}

export interface LinePoint {
  label: string;
  values: Record<string, number>;
}

interface LineChartProps {
  data: LinePoint[];
  series: LineSeries[];
  formatValue?: (v: number) => string;
  height?: number;
  title?: string;
  ariaLabel?: string;
}

/**
 * Gráfico de linhas em SVG puro (sem libs). Responsivo e acessível
 * (role="img", aria-label, <title>/<desc>). Usado em Relatórios para a
 * taxa de conversão e o nº de negócios criados mês a mês.
 */
export default function LineChart({
  data,
  series,
  formatValue = (v) => String(v),
  height = 240,
  title,
  ariaLabel,
}: LineChartProps) {
  const titleId = useId();
  const descId = useId();
  const W = 640;
  const H = height;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxFromData = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d.values[s.key]) || 0)));
  const maxVal = Math.max(1, ...series.map((s) => s.max ?? 0), series.some((s) => s.max) ? 0 : maxFromData) || maxFromData;
  const ticks = 4;

  const n = data.length;
  const x = (i: number) => (n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - (Math.min(v, maxVal) / maxVal) * plotH;
  const corSerie = (s: LineSeries, i: number) => s.color || corDaSerie(i);

  const resumoAria =
    ariaLabel ||
    `Gráfico de linhas${title ? `: ${title}` : ""}. ${data
      .map((d) => `${d.label}: ` + series.map((s) => `${s.label} ${formatValue(Number(d.values[s.key]) || 0)}`).join(", "))
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
        <title id={titleId}>{title || "Gráfico de linhas"}</title>
        <desc id={descId}>{resumoAria}</desc>

        {/* Grade + eixo Y */}
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const val = (maxVal / ticks) * i;
          const yy = y(val);
          return (
            <g key={i}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke={CHART_THEME.grid} strokeWidth={1} />
              <text x={padL - 8} y={yy + 4} textAnchor="end" fontSize={11} fill={CHART_THEME.muted}>
                {formatValue(val)}
              </text>
            </g>
          );
        })}

        {/* Rótulos do eixo X */}
        {data.map((d, i) => (
          <text key={d.label} x={x(i)} y={H - padB + 18} textAnchor="middle" fontSize={11} fill={CHART_THEME.muted}>
            {d.label}
          </text>
        ))}

        {/* Séries */}
        {series.map((s, si) => {
          const cor = corSerie(s, si);
          const pts = data.map((d, i) => ({ x: x(i), y: y(Number(d.values[s.key]) || 0), v: Number(d.values[s.key]) || 0, label: d.label }));
          const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
          return (
            <g key={s.key}>
              {pts.length > 1 && <path d={path} fill="none" stroke={cor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
              {pts.map((p) => (
                <circle key={p.label} cx={p.x} cy={p.y} r={3.5} fill={cor} stroke={CHART_THEME.text} strokeWidth={0.5}>
                  <title>{`${p.label} — ${s.label}: ${formatValue(p.v)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke={CHART_THEME.axis} strokeWidth={1} />
      </svg>

      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3 list-none p-0 m-0" aria-hidden="true">
          {series.map((s, i) => (
            <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: corSerie(s, i) }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
