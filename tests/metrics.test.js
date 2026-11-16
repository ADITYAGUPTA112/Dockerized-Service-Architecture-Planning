import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

const TEST_CONFIG = {
  port: 3000,
  nodeEnv: "test",
  secretMessage: "Secret telemetry test!",
  username: "metricuser",
  password: "metricpassword",
};

function authHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

describe("Prometheus Metrics Route & Telemetry", () => {
  const app = createApp(TEST_CONFIG);

  it("GET /metrics returns 200 with Prometheus text exposition", async () => {
    const res = await request(app).get("/metrics");
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /text\/plain/);
    assert.match(res.text, /# HELP/);
    assert.match(res.text, /nodejs_/);
  });

  it("records http_requests_total and latency metrics upon serving requests", async () => {
    // Generate traffic
    await request(app).get("/");
    await request(app).get("/health");

    const metricsRes = await request(app).get("/metrics");
    assert.equal(metricsRes.status, 200);
    assert.match(metricsRes.text, /http_requests_total\{/);
    assert.match(metricsRes.text, /http_request_duration_seconds_bucket\{/);
  });

  it("records auth_attempts_total for successful and failed auth attempts", async () => {
    // Failed attempt
    await request(app)
      .get("/secret")
      .set("Authorization", authHeader("invalid", "invalid"));

    // Successful attempt
    await request(app)
      .get("/secret")
      .set("Authorization", authHeader(TEST_CONFIG.username, TEST_CONFIG.password));

    const metricsRes = await request(app).get("/metrics");
    assert.equal(metricsRes.status, 200);
    assert.match(metricsRes.text, /auth_attempts_total\{outcome="failure"\}/);
    assert.match(metricsRes.text, /auth_attempts_total\{outcome="success"\}/);
  });

  it("does not track the /metrics endpoint itself to avoid feedback loops", async () => {
    const resBefore = await request(app).get("/metrics");
    const countBefore = (resBefore.text.match(/route="\/metrics"/g) || []).length;
    assert.equal(countBefore, 0);
  });
});
