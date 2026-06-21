import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { igualSeguro, webhookAutorizado } from "../src/routes/kiwifyWebhook.js";

const ENV_KEYS = ["KIWIFY_WEBHOOK_SECRET", "KIWIFY_WEBHOOK_TOKEN"];
let saved;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function hmac(algo, secret, body) {
  return crypto.createHmac(algo, secret).update(body).digest("hex");
}

describe("igualSeguro", () => {
  it("é verdadeiro para iguais e falso para diferentes/tamanhos diferentes", () => {
    expect(igualSeguro("abc", "abc")).toBe(true);
    expect(igualSeguro("abc", "abd")).toBe(false);
    expect(igualSeguro("abc", "abcd")).toBe(false);
  });
});

describe("webhookAutorizado", () => {
  const body = Buffer.from(JSON.stringify({ order_status: "paid", order_id: "1" }));

  it("com SECRET: aceita assinatura HMAC SHA1 correta", () => {
    process.env.KIWIFY_WEBHOOK_SECRET = "s3cr3t";
    const sig = hmac("sha1", "s3cr3t", body);
    expect(webhookAutorizado({ rawBody: body, query: { signature: sig }, headers: {} })).toBe(true);
  });

  it("com SECRET: aceita assinatura HMAC SHA256 correta", () => {
    process.env.KIWIFY_WEBHOOK_SECRET = "s3cr3t";
    const sig = hmac("sha256", "s3cr3t", body);
    expect(webhookAutorizado({ rawBody: body, query: { signature: sig }, headers: {} })).toBe(true);
  });

  it("com SECRET: rejeita assinatura errada ou ausente", () => {
    process.env.KIWIFY_WEBHOOK_SECRET = "s3cr3t";
    expect(webhookAutorizado({ rawBody: body, query: { signature: "deadbeef" }, headers: {} })).toBe(false);
    expect(webhookAutorizado({ rawBody: body, query: {}, headers: {} })).toBe(false);
  });

  it("sem SECRET mas com TOKEN: valida o token", () => {
    process.env.KIWIFY_WEBHOOK_TOKEN = "tok";
    expect(webhookAutorizado({ rawBody: body, query: { token: "tok" }, headers: {} })).toBe(true);
    expect(webhookAutorizado({ rawBody: body, query: { token: "x" }, headers: {} })).toBe(false);
    expect(webhookAutorizado({ rawBody: body, query: {}, headers: { "x-kiwify-token": "tok" } })).toBe(true);
  });

  it("sem nenhum segredo: modo dev (aceita)", () => {
    expect(webhookAutorizado({ rawBody: body, query: {}, headers: {} })).toBe(true);
  });
});
