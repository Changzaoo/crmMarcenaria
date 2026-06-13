import express from "express";
import cors from "cors";
import { seed } from "./seed/index.js";
import { mountRoutes } from "./routes/index.js";
import public3d from "./routes/public3d.js";

// Popula o banco local com seed de demonstração quando ainda não existe.
// Em produção, o snapshot do Firebase substitui esse seed no primeiro request autenticado.
seed();

export function createApp() {
  const app = express();

  const ALLOWED_ORIGINS = (
    process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5174"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        return cb(null, ALLOWED_ORIGINS.includes(origin));
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
