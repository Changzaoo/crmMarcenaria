import { describe, it, expect, vi } from "vitest";
import { rateLimit, clientIp } from "../src/lib/rateLimit.js";

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runReq(mw, ip = "1.2.3.4") {
  const req = { headers: { "x-forwarded-for": ip }, baseUrl: "/api/public" };
  const res = fakeRes();
  const next = vi.fn();
  mw(req, res, next);
  return { res, next };
}

describe("rateLimit", () => {
  it("libera até o limite e bloqueia (429) ao exceder", () => {
    const mw = rateLimit({ windowMs: 60_000, max: 3 });
    const ip = `ip-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const { next, res } = runReq(mw, ip);
      expect(next).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(200);
    }
    const { next, res } = runReq(mw, ip);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.headers["Retry-After"]).toBeTruthy();
  });

  it("contabiliza IPs diferentes separadamente", () => {
    const mw = rateLimit({ windowMs: 60_000, max: 1 });
    const a = runReq(mw, "10.0.0.1");
    const b = runReq(mw, "10.0.0.2");
    expect(a.next).toHaveBeenCalledOnce();
    expect(b.next).toHaveBeenCalledOnce();
  });
});

describe("clientIp", () => {
  it("usa o primeiro IP do X-Forwarded-For", () => {
    expect(clientIp({ headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } })).toBe("9.9.9.9");
  });
  it("cai para anon sem dados", () => {
    expect(clientIp({ headers: {} })).toBe("anon");
  });
});
