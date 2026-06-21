import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { relayConfigured, publishToRelay, notifyProjectUpdated } from "../src/lib/relayPublish.js";

let saved;
beforeEach(() => {
  saved = { RELAY_URL: process.env.RELAY_URL, COLLAB_WS_URL: process.env.COLLAB_WS_URL };
  delete process.env.RELAY_URL;
  delete process.env.COLLAB_WS_URL;
});
afterEach(() => {
  for (const k of ["RELAY_URL", "COLLAB_WS_URL"]) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("relayPublish (inerte sem env)", () => {
  it("relayConfigured é false sem RELAY_URL", () => {
    expect(relayConfigured()).toBe(false);
  });

  it("publishToRelay é no-op (false) e não lança quando não configurado", () => {
    expect(publishToRelay("collab:abc", { x: 1 })).toBe(false);
    expect(notifyProjectUpdated("abc", { event: "saved" })).toBe(false);
  });

  it("relayConfigured fica true quando RELAY_URL é definido", () => {
    process.env.RELAY_URL = "wss://exemplo.invalido";
    expect(relayConfigured()).toBe(true);
  });

  it("não publica sem tópico mesmo configurado", () => {
    process.env.RELAY_URL = "wss://exemplo.invalido";
    expect(publishToRelay("", { x: 1 })).toBe(false);
  });
});
