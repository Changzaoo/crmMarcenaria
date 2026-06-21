// Utilitários compartilhados pelos gráficos SVG leves (sem dependências).
// Paleta alinhada ao tema dark premium da NEXUS (champagne/bronze/wood).

/** Cores em sequência para séries categóricas (donut, barras múltiplas). */
export const CHART_PALETTE = [
  "#D8B978", // champagne
  "#9C7248", // bronze
  "#7FB2E5", // azul suave
  "#6FCF97", // verde
  "#9B8CFF", // roxo
  "#E59E5B", // âmbar
  "#F2A6A6", // rosa
  "#5A3825", // wood
  "#A79D91", // muted
];

export const corDaSerie = (i: number): string => CHART_PALETTE[i % CHART_PALETTE.length];

/** Tokens do tema usados nos eixos/grade/texto dos SVGs. */
export const CHART_THEME = {
  text: "#F4EFE7",
  muted: "#A79D91",
  grid: "rgba(255,255,255,0.08)",
  axis: "rgba(255,255,255,0.14)",
  accent: "#D8B978",
  bronze: "#9C7248",
  wood: "#5A3825",
};

/** Formata um valor em R$ compacto para rótulos de eixo (ex.: R$ 12,5k). */
export function moedaEixo(v: number): string {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return "R$ " + (n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "M";
  if (Math.abs(n) >= 1000) return "R$ " + (n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k";
  return "R$ " + n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/** "Nice" upper bound para escalas (arredonda para cima em passos legíveis). */
export function escalaMax(valor: number): number {
  if (valor <= 0) return 1;
  const exp = Math.floor(Math.log10(valor));
  const pot = Math.pow(10, exp);
  const norm = valor / pot;
  const passo = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return passo * pot;
}
