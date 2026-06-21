import { useId } from "react";
import { CHART_THEME, corDaSerie, escalaMax } from "./chartUtils";

export interface BarSeries {
  /** chave usada para identificar a série (também usada na legenda). */
  key: string;
  /** rótulo exibido na legenda/tooltip. */
  label: string;
  /** cor opcional; se ausente usa a paleta padrão na ordem das séries. */
  color?: string;
}

export interface BarDatum {
  /** rótulo do eixo X (ex.: "jun/26"). */
  label: string;
  /** valor por série, indexado pela `key` da série. */
  values: Record<string, number>;
}

interface BarChartProps {
  data: BarDatum[];
  series: BarSeries[];
  /** formata os valores nos rótulos do eixo Y e no aria-label. */
  formatValue?: (v: number) => string;
  height?: number;
  title?: string;
  ariaLabel?: string;
}

/**
 * Gráfico de barras agrupadas em SVG puro (sem libs). Responsivo via
 * viewBox + preserveAspectRatio. Acessível: role="img" + aria-label e <title>/<desc>.
 * Usado em Relatórios para o fluxo de caixa (recebido / a receber / atrasado).
 */
export default function BarChart({
  data,
  series,
  formatValue = (v) => String(v),
  height = 240,
  title,
  ariaLabel,
}: BarChartProps) {
  const titleId = useId();
  const descId = useId();
  const W = 640;
  const H = height;
  const padL = 64;
  const padR = 16;
  const padT = 16;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxRaw = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d.values[s.key]) || 0)));
  const maxVal = escalaMax(maxRaw);
  const ticks = 4;

  const grupos = data.length || 1;
  const grupoW = plotW / grupos;
  const barGap = 4;
  const barW = Math.max(2, (grupoW * 0.7 - barGap * (series.length - 1)) / series.length);

  const y = (v: number) => padT + plotH - (v / maxVal) * plotH;
  const corSerie = (s: BarSeries, i: number) => s.color || corDaSerie(i);

  const resumoAria =
    ariaLabel ||
    `Gráfico de barras${title ? `: ${title}` : ""}. ${data
      .map(
        (d) => `${d.label}: ` + series.map((s) => `${s.label} ${formatValue(Number(d.values[s.key]) || 0)}`).join(", ")
      )
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
        <title id={titleId}>{title || "Gráfico de barras"}</title>
        <desc id={descId}>{resumoAria}</desc>

        {/* Grade horizontal + rótulos do eixo Y */}
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

        {/* Barras agrupadas */}
        {data.map((d, gi) => {
          const x0 = padL + gi * grupoW + (grupoW - (barW * series.length + barGap * (series.length - 1))) / 2;
          return (
            <g key={d.label}>
              {series.map((s, si) => {
                const v = Number(d.values[s.key]) || 0;
                const bx = x0 + si * (barW + barGap);
                const by = y(v);
                const bh = padT + plotH - by;
                return (
                  <rect
                    key={s.key}
                    x={bx}
                    y={by}
                    width={barW}
                    height={Math.max(0, bh)}
                    rx={3}
                    fill={corSerie(s, si)}
                    opacity={0.92}
                  >
                    <title>{`${d.label} — ${s.label}: ${formatValue(v)}`}</title>
                  </rect>
                );
              })}
              <text
                x={padL + gi * grupoW + grupoW / 2}
                y={H - padB + 18}
                textAnchor="middle"
                fontSize={11}
                fill={CHART_THEME.muted}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Eixo base */}
        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke={CHART_THEME.axis} strokeWidth={1} />
      </svg>

      {/* Legenda */}
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3 list-none p-0 m-0" aria-hidden="true">
          {series.map((s, i) => (
            <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: corSerie(s, i) }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
