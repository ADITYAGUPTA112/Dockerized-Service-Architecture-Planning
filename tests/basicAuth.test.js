import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createBasicAuthMiddleware,
  parseBasicAuthHeader,
} from "../src/middleware/basicAuth.js";

function encodeBasic(user, pass) {
  return `Basic ${Buffer.from(`${user}:${pass}`, "utf8").toString("base64")}`;
}

describe("parseBasicAuthHeader", () => {
  it("reports missing header when undefined or blank", () => {
    assert.deepEqual(parseBasicAuthHeader(undefined), { ok: false, reason: "missing" });
    assert.deepEqual(parseBasicAuthHeader("   "), { ok: false, reason: "missing" });
  });

  it("reports malformed for non-Basic schemes or invalid base64", () => {
    assert.deepEqual(parseBasicAuthHeader("Bearer abc123"), {
      ok: false,
      reason: "malformed",
    });
    assert.deepEqual(parseBasicAuthHeader("Basic not-valid!"), {
      ok: false,
      reason: "malformed",
    });
    assert.deepEqual(
      parseBasicAuthHeader(`Basic ${Buffer.from("nocolon", "utf8").toString("base64")}`),
      { ok: false, reason: "malformed" }
    );
  });

  it("preserves colons inside the password", () => {
    const header = encodeBasic("alice", "pass:with:colons");
    assert.deepEqual(parseBasicAuthHeader(header), {
      ok: true,
      username: "alice",
      password: "pass:with:colons",
    });
  });

  it("accepts case-insensitive Basic scheme", () => {
    const token = Buffer.from("bob:secret", "utf8").toString("base64");
    assert.deepEqual(parseBasicAuthHeader(`basic ${token}`), {
      ok: true,
      username: "bob",
      password: "secret",
    });
  });
});

describe("createBasicAuthMiddleware", () => {
  it("throws if initialized with blank credentials", () => {
    assert.throws(() => createBasicAuthMiddleware({ username: "", password: "pw" }));
    assert.throws(() => createBasicAuthMiddleware({ username: "u", password: "   " }));
  });
});
