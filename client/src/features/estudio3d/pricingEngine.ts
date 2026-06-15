/* ============================================================
   Motor de estimativa, score de lead e checklist técnico.
   Tudo determinístico, sem efeitos colaterais — fácil de testar.
   ============================================================ */
import type {
  PlacedFurniture,
  EnvironmentConfig,
  ClientInfo,
  Estimate,
  LeadScore,
  ChecklistResult,
  Complexity,
} from "./types";
import { materialDef } from "./materials";

const COMPLEXITY_FACTOR: Record<Complexity, number> = {
  simples: 1.0,
  medio: 1.25,
  alto: 1.6,
};

/** Preço estimado de um único móvel já configurado. */
export function priceOf(f: PlacedFurniture): number {
  const volumeFactor =
    (f.width * f.height * f.depth) /
    (180 * 105 * 60); // referência: balcão padrão = 1.0
  const sizeScale = 0.55 + 0.45 * Math.cbrt(Math.max(0.2, volumeFactor));
  const mat = materialDef(f.config.material);
  const extras =
    f.config.drawers * 180 +
    f.config.doors * 140 +
    (f.config.led ? 320 : 0) +
    (f.config.surface === "vidro" ? 420 : 0) +
    (f.config.surface === "metal" ? 260 : 0);
  const base = f.basePrice * sizeScale * mat.priceFactor * COMPLEXITY_FACTOR[f.complexity];
  return Math.round(base + extras);
}

/** Estimativa global do projeto (faixa min–max + prazo). */
export function estimateProject(
  furniture: PlacedFurniture[],
  env: EnvironmentConfig
): Estimate {
  const subtotal = furniture.reduce((sum, f) => sum + priceOf(f), 0);

  // ambiente influencia: andares, mezanino, metragem
  const areaM2 = (env.width * env.depth) / 10000;
  const envFactor =
    1 +
    (env.floors - 1) * 0.18 +
    (env.hasMezzanine ? 0.12 : 0) +
    (env.hasStairs ? 0.06 : 0) +
    Math.min(0.25, areaM2 / 400);

  const central = subtotal * envFactor;
  const min = Math.round((central * 0.85) / 100) * 100;
  const max = Math.round((central * 1.25) / 100) * 100;

  // complexidade agregada
  const hard = furniture.filter((f) => f.complexity === "alto").length;
  const complexity: Complexity =
    hard >= 3 || furniture.length >= 10 ? "alto" : furniture.length >= 4 ? "medio" : "simples";

  const baseDays = 12 + furniture.length * 2.2 + hard * 4;
  const deadlineDays: [number, number] = [
    Math.round(baseDays),
    Math.round(baseDays * 1.6),
  ];

  return { min: Math.max(0, min), max: Math.max(0, max), complexity, deadlineDays };
}

/** Classificação automática do lead. */
export function scoreLead(
  furniture: PlacedFurniture[],
  env: EnvironmentConfig,
  estimate: Estimate,
  opts: { askedArchitect: boolean; saved: boolean; requestedQuote: boolean }
): LeadScore {
  let pts = 0;
  const areaM2 = (env.width * env.depth) / 10000;
  if (areaM2 >= 80) pts += 2;
  else if (areaM2 >= 40) pts += 1;
  if (estimate.max >= 40000) pts += 3;
  else if (estimate.max >= 20000) pts += 2;
  else if (estimate.max >= 8000) pts += 1;
  if (furniture.length >= 8) pts += 2;
  else if (furniture.length >= 4) pts += 1;
  if (opts.askedArchitect) pts += 2;
  if (opts.saved) pts += 1;
  if (opts.requestedQuote) pts += 2;

  const big = areaM2 >= 120 || estimate.max >= 60000 || env.floors >= 2;
  if (big && pts >= 6) return "projeto-grande";
  if (pts >= 6) return "quente";
  if (pts >= 3) return "morno";
  return "frio";
}

/** Caixa delimitadora (metros) de um móvel posicionado. */
function aabb(f: PlacedFurniture) {
  const w = f.width / 100;
  const d = f.depth / 100;
  // ignora rotação fina; usa maior extensão p/ segurança
  const half = Math.max(w, d) / 2;
  const [x, , z] = f.position;
  return { minX: x - half, maxX: x + half, minZ: z - half, maxZ: z + half };
}

/** Móveis que ultrapassam as paredes do ambiente. */
export function furnitureOutOfBounds(
  furniture: PlacedFurniture[],
  env: EnvironmentConfig
): PlacedFurniture[] {
  const halfW = env.width / 200; // metros
  const halfD = env.depth / 200;
  return furniture.filter((f) => {
    const b = aabb(f);
    return b.minX < -halfW || b.maxX > halfW || b.minZ < -halfD || b.maxZ > halfD;
  });
}

/** Checklist técnico exibido ao solicitar orçamento. */
export function buildChecklist(
  furniture: PlacedFurniture[],
  env: EnvironmentConfig,
  client: ClientInfo
): ChecklistResult[] {
  const out = furnitureOutOfBounds(furniture, env);
  const noMaterial = furniture.filter((f) => !f.config.material);
  return [
    { label: "Ambiente possui medidas", ok: env.width > 0 && env.depth > 0 && env.height > 0 },
    { label: "Móveis posicionados", ok: furniture.length > 0 },
    { label: "Materiais escolhidos", ok: noMaterial.length === 0 },
    { label: "Contato do cliente informado", ok: !!(client.name && (client.phone || client.email)) },
    { label: "Nenhum móvel atravessando parede", ok: out.length === 0 },
    { label: "Sem móveis sem material", ok: noMaterial.length === 0 },
    {
      label: "Medidas dentro do padrão",
      ok: furniture.every((f) => f.width <= 600 && f.height <= 320 && f.depth <= 200),
    },
  ];
}

export function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
