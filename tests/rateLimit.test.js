import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createRateLimitMiddleware } from "../src/middleware/rateLimit.js";

const TEST_CONFIG = {
  port: 3000,
  nodeEnv: "test",
  secretMessage: "Rate limit safe!",
  username: "agent",
  password: "secret",
};

describe("Rate limiting on /secret", () => {
  it("rejects invalid rate limiter options", () => {
    assert.throws(() => createRateLimitMiddleware({ windowMs: 0 }));
    assert.throws(() => createRateLimitMiddleware({ maxRequests: -5 }));
  });

  it("allows normal traffic, throttles burst abuse with 429 + Retry-After, and keeps / and /health unaffected", async () => {
    let clock = 1_000_000;
    const app = createApp(TEST_CONFIG, {
      rateLimit: {
        windowMs: 60_000,
        maxRequests: 3,
        nowFn: () => clock,
      },
    });

    for (let i = 0; i < 3; i += 1) {
      const res = await request(app)
        .get("/secret")
        .set("X-Forwarded-For", "203.0.113.10");
      assert.equal(res.status, 401);
    }

    // 4th request from same IP triggers 429
    const throttled = await request(app)
      .get("/secret")
      .set("X-Forwarded-For", "203.0.113.10");
    assert.equal(throttled.status, 429);
    assert.equal(throttled.headers["retry-after"], "60");
    assert.match(throttled.text, /Too Many Requests/);

    // Browser Accept: text/html gets styled 429 HTML card
    const throttledHtml = await request(app)
      .get("/secret")
      .set("X-Forwarded-For", "203.0.113.10")
      .set("Accept", "text/html");
    assert.equal(throttledHtml.status, 429);
    assert.match(throttledHtml.headers["content-type"], /text\/html/);
    assert.match(throttledHtml.text, /HTTP 429 TOO MANY REQUESTS/);

    // Different client IP via X-Forwarded-For is not blocked
    const otherIp = await request(app)
      .get("/secret")
      .set("X-Forwarded-For", "203.0.113.99");
    assert.equal(otherIp.status, 401);

    // Public routes remain unaffected by /secret throttling
    const rootRes = await request(app)
      .get("/")
      .set("X-Forwarded-For", "203.0.113.10");
    assert.equal(rootRes.status, 200);
    assert.equal(rootRes.text, "Hello, world!");

    const healthRes = await request(app)
      .get("/health")
      .set("X-Forwarded-For", "203.0.113.10");
    assert.equal(healthRes.status, 200);

    // Advancing clock past window resets rate limit
    clock += 61_000;
    const recovered = await request(app)
      .get("/secret")
      .set("X-Forwarded-For", "203.0.113.10");
    assert.equal(recovered.status, 401);
  });

  it("bounds memory when unique IPs exceed maxTrackedIps", async () => {
    let clock = 1_000;
    const app = createApp(TEST_CONFIG, {
      rateLimit: {
        windowMs: 60_000,
        maxRequests: 2,
        maxTrackedIps: 3,
        nowFn: () => clock,
      },
    });

    for (const ip of ["10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.4"]) {
      const res = await request(app).get("/secret").set("X-Forwarded-For", ip);
      assert.equal(res.status, 401);
    }
  });
});
