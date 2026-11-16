import crypto from "node:crypto";
import { prefersHtml, renderUnauthorizedHtml } from "../views/templates.js";
import { trackAuthAttempt } from "../metrics/telemetry.js";

const REALM_HEADER = 'Basic realm="Secret Area"';
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Compares two strings in constant time by hashing both to fixed-length
 * 32-byte SHA-256 digests first, preventing length-leak timing side channels.
 *
 * @param {string} left
 * @param {string} right
 * @returns {boolean}
 */
function timingSafeStringEqual(left, right) {
  const leftDigest = crypto.createHash("sha256").update(left, "utf8").digest();
  const rightDigest = crypto.createHash("sha256").update(right, "utf8").digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

/**
 * Parses an HTTP Basic Authorization header safely.
 * Splits strictly on the first colon so passwords containing `:` remain intact.
 *
 * @param {string | undefined} authHeader
 * @returns {{ ok: true, username: string, password: string } | { ok: false, reason: "missing" | "malformed" }}
 */
export function parseBasicAuthHeader(authHeader) {
  if (typeof authHeader !== "string" || authHeader.trim().length === 0) {
    return { ok: false, reason: "missing" };
  }

  const match = /^\s*Basic\s+(\S+)\s*$/i.exec(authHeader);
  if (!match) {
    return { ok: false, reason: "malformed" };
  }

  const encoded = match[1];
  if (encoded.length % 4 !== 0 || !BASE64_PATTERN.test(encoded)) {
    return { ok: false, reason: "malformed" };
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) {
    return { ok: false, reason: "malformed" };
  }

  return {
    ok: true,
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

/**
 * Sends a 401 Unauthorized response with WWW-Authenticate prompt header.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {string} message
 */
function sendUnauthorized(req, res, message) {
  res.set("WWW-Authenticate", REALM_HEADER);
  if (prefersHtml(req)) {
    return res
      .status(401)
      .type("text/html; charset=utf-8")
      .send(renderUnauthorizedHtml(message));
  }
  return res.status(401).type("text/plain; charset=utf-8").send(message);
}

/**
 * Creates Express middleware enforcing HTTP Basic Auth against configured credentials.
 *
 * @param {{ username: string, password: string }} credentials
 * @returns {import("express").RequestHandler}
 */
export function createBasicAuthMiddleware({ username, password }) {
  if (
    typeof username !== "string" ||
    username.trim().length === 0 ||
    typeof password !== "string" ||
    password.trim().length === 0
  ) {
    throw new Error("Basic Auth middleware requires non-empty username and password.");
  }

  return function basicAuthMiddleware(req, res, next) {
    const parsed = parseBasicAuthHeader(req.headers.authorization);

    if (!parsed.ok) {
      trackAuthAttempt(parsed.reason);
      const message =
        parsed.reason === "missing"
          ? "Authentication required. Please provide a valid username and password."
          : "Unauthorized: Invalid authentication format.";
      return sendUnauthorized(req, res, message);
    }

    // Evaluate both comparisons without short-circuiting to keep response timing uniform.
    const isUserMatch = timingSafeStringEqual(parsed.username, username);
    const isPasswordMatch = timingSafeStringEqual(parsed.password, password);

    if (!isUserMatch || !isPasswordMatch) {
      trackAuthAttempt("failure");
      return sendUnauthorized(req, res, "Unauthorized: Invalid username or password.");
    }

    trackAuthAttempt("success");
    return next();
  };
}
