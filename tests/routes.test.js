import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

const TEST_CONFIG = {
  port: 3000,
  nodeEnv: "test",
  secretMessage: "Launch sequence verified!",
  username: "agent",
  password: "pw:with:colons",
};

function authHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

describe("HTTP Routes", () => {
  const app = createApp(TEST_CONFIG);

  it("GET / returns Hello, world! as plain text and hides x-powered-by", async () => {
    const res = await request(app).get("/");
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /text\/plain/);
    assert.equal(res.text, "Hello, world!");
    assert.equal(res.headers["x-powered-by"], undefined);
  });

  it("GET /health returns status ok without exposing secrets", async () => {
    const res = await request(app).get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.equal(typeof res.body.uptime, "number");
    assert.equal(typeof res.body.timestamp, "string");
    assert.doesNotMatch(JSON.stringify(res.body), /Launch sequence verified!/);
  });

  it("GET /secret without Authorization returns 401 with WWW-Authenticate", async () => {
    const res = await request(app).get("/secret");
    assert.equal(res.status, 401);
    assert.equal(res.headers["www-authenticate"], 'Basic realm="Secret Area"');
    assert.match(res.text, /Authentication required/);
  });

  it("GET /secret with malformed Authorization returns 401", async () => {
    const res = await request(app)
      .get("/secret")
      .set("Authorization", "Basic !!!");
    assert.equal(res.status, 401);
    assert.equal(res.headers["www-authenticate"], 'Basic realm="Secret Area"');
    assert.match(res.text, /Invalid authentication format/);
  });

  it("GET /secret returns identical 401 message for wrong username or wrong password", async () => {
    const wrongUser = await request(app)
      .get("/secret")
      .set("Authorization", authHeader("wrong", TEST_CONFIG.password));
    const wrongPass = await request(app)
      .get("/secret")
      .set("Authorization", authHeader(TEST_CONFIG.username, "wrong"));

    assert.equal(wrongUser.status, 401);
    assert.equal(wrongPass.status, 401);
    assert.equal(wrongUser.text, "Unauthorized: Invalid username or password.");
    assert.equal(wrongPass.text, wrongUser.text);
  });

  it("GET /secret with valid credentials (including colons in password) returns SECRET_MESSAGE", async () => {
    const res = await request(app)
      .get("/secret")
      .set(
        "Authorization",
        authHeader(TEST_CONFIG.username, TEST_CONFIG.password)
      );

    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /text\/plain/);
    assert.equal(res.text, TEST_CONFIG.secretMessage);
  });

  it("GET unknown route returns 404 Not Found", async () => {
    const res = await request(app).get("/does-not-exist");
    assert.equal(res.status, 404);
    assert.equal(res.text, "Not Found: The requested route does not exist.");
  });

  it("Browser Accept: text/html keeps GET / plain text while rendering styled HTML on /secret and errors", async () => {
    const browserAccept =
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

    const rootRes = await request(app).get("/").set("Accept", browserAccept);
    assert.equal(rootRes.status, 200);
    assert.match(rootRes.headers["content-type"], /text\/plain/);
    assert.equal(rootRes.text, "Hello, world!");

    const unauthHtml = await request(app)
      .get("/secret")
      .set("Accept", browserAccept);
    assert.equal(unauthHtml.status, 401);
    assert.match(unauthHtml.headers["content-type"], /text\/html/);
    assert.match(unauthHtml.text, /Access Denied/);

    const secretHtml = await request(app)
      .get("/secret")
      .set("Accept", browserAccept)
      .set(
        "Authorization",
        authHeader(TEST_CONFIG.username, TEST_CONFIG.password)
      );
    assert.equal(secretHtml.status, 200);
    assert.match(secretHtml.headers["content-type"], /text\/html/);
    assert.match(secretHtml.text, /Protected Secret/);
    assert.match(secretHtml.text, /Launch sequence verified!/);

    const notFoundHtml = await request(app)
      .get("/missing-page")
      .set("Accept", browserAccept);
    assert.equal(notFoundHtml.status, 404);
    assert.match(notFoundHtml.headers["content-type"], /text\/html/);
    assert.match(notFoundHtml.text, /Page Not Found/);
  });
});
