import { Router } from "express";
import { computeAccess } from "../billing/store.js";

const r = Router();

// Status da assinatura desta instância (consumido pelo BillingGate do front).
r.get("/status", (_req, res) => {
  res.json(computeAccess());
});

export default r;
