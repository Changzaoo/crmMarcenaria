// Rate limiting simples em memória (por instância) — sem dependências externas.
//
// Em produção distribuída (várias instâncias serverless na Vercel) cada instância
// tem seu próprio contador; isso já barra abuso óbvio/burst de uma mesma origem.
// Para limite global forte, plugar um store compartilhado (Redis/Upstash) depois.

const buckets = new Map();

/** Extrai o IP real do cliente, respeitando o proxy da Vercel (X-Forwarded-For). */
export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "anon";
}

/**
 * Middleware de rate limit por janela fixa.
 * @param {{ windowMs?: number, max?: number, key?: (req)=>string, message?: string }} opts
 */
export function rateLimit({ windowMs = 60_000, max = 60, key, message } = {}) {
  return (req, res, next) => {
    const id = `${req.baseUrl || ""}:${(key ? key(req) : null) || clientIp(req)}`;
    const now = Date.now();
    let b = buckets.get(id);
    if (!b || now > b.reset) {
      b = { count: 0, reset: now + windowMs };
      buckets.set(id, b);
    }
    b.count++;
    const retryAfter = Math.ceil((b.reset - now) / 1000);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - b.count)));
    res.setHeader("RateLimit-Reset", String(retryAfter));
    if (b.count > max) {
      res.setHeader("Retry-After", String(retryAfter));
      return res
        .status(429)
        .json({ erro: message || "Muitas requisições em pouco tempo. Aguarde um instante e tente novamente." });
    }
    return next();
  };
}

// Limpeza periódica dos buckets expirados para não vazar memória em instâncias longas.
let sweeper = null;
export function startRateLimitSweeper(intervalMs = 5 * 60_000) {
  if (sweeper) return;
  sweeper = setInterval(() => {
    const now = Date.now();
    for (const [id, b] of buckets) if (now > b.reset) buckets.delete(id);
  }, intervalMs);
  if (sweeper.unref) sweeper.unref();
}
