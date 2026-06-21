import { describe, it, expect } from "vitest";
import { validarLead, PUBLIC_ENDPOINTS, LEAD_ORIGINS } from "../src/shared/contract.js";

describe("validarLead", () => {
  const base = { nome: "Maria", email: "maria@exemplo.com", whatsapp: "11999999999", aceite: true };

  it("aceita lead completo e válido", () => {
    expect(validarLead(base)).toEqual({ ok: true });
  });

  it("rejeita quando faltam campos obrigatórios", () => {
    expect(validarLead({}).ok).toBe(false);
    expect(validarLead({ nome: "X" }).ok).toBe(false);
    expect(validarLead({ ...base, nome: "   " }).ok).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    const r = validarLead({ ...base, email: "nao-e-email" });
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/e-mail/i);
  });

  it("exige aceite de contato", () => {
    const r = validarLead({ ...base, aceite: false });
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/aceitar/i);
  });

  it("tolera body nulo/indefinido sem lançar", () => {
    expect(validarLead(null).ok).toBe(false);
    expect(validarLead(undefined).ok).toBe(false);
  });
});

describe("constantes do contrato", () => {
  it("expõe os endpoints públicos esperados", () => {
    expect(PUBLIC_ENDPOINTS.leads3d).toBe("/leads-3d");
    expect(PUBLIC_ENDPOINTS.solicitarProposta).toBe("/solicitar-proposta");
  });

  it("define origens de lead", () => {
    expect(LEAD_ORIGINS.solicitarProposta).toBeTruthy();
    expect(LEAD_ORIGINS.estudio3d).toBeTruthy();
  });
});
