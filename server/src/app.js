import express from "express";
import cors from "cors";
import { seed } from "./seed/index.js";
import { mountRoutes } from "./routes/index.js";
import public3d from "./routes/public3d.js";
import kiwifyWebhook from "./routes/kiwifyWebhook.js";

// Popula o banco local com seed de demonstração quando ainda não existe.
// Em produção, o snapshot do Firebase substitui esse seed no primeiro request autenticado.
seed();

export function createApp() {
  const app = express();

  const ALLOWED_ORIGINS = (
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5174,https://linea-marcenaria.vercel.app,https://crm-marcenaria.vercel.app,https://marcenaria.nexusholding.xyz"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Qualquer subdomínio de nexusholding.xyz (e *.vercel.app dos apps) é aceito,
  // além da allowlist explícita acima — assim trocar de domínio não quebra o CORS.
  const ALLOWED_ORIGIN_PATTERNS = [/^https:\/\/([a-z0-9-]+\.)*nexusholding\.xyz$/i];

  function isAllowedOrigin(origin) {
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
  }

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        return cb(null, isAllowedOrigin(origin));
      },
    })
  );

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    next();
  });

  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Rotas públicas do Orçamento 3D (sem auth) — montadas ANTES da API autenticada.
  app.use("/api/public", public3d);

  // Webhook público da Kiwify (cobrança). Sem login — protegido por token próprio.
  app.use("/api/public/kiwify", kiwifyWebhook);

  const api = express.Router();
  mountRoutes(api);
  app.use("/api", api);

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ erro: error.message || "Falha inesperada no servidor." });
  });

  return app;
}

export const app = createApp();
