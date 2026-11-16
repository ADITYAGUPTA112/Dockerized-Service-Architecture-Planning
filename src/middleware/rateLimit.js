import { prefersHtml, renderErrorHtml } from "../views/templates.js";
import { trackRateLimitBlock } from "../metrics/telemetry.js";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 20;
const DEFAULT_MAX_TRACKED_IPS = 10_000;

/**
 * Evicts expired IP entries from the in-memory store to keep memory bounded.
 *
 * @param {Map<string, number[]>} store
 * @param {number} cutoff
 * @param {number} maxTrackedIps
 */
function pruneStore(store, cutoff, maxTrackedIps) {
  for (const [ip, timestamps] of store.entries()) {
    const active = timestamps.filter((t) => t > cutoff);
    if (active.length === 0) {
      store.delete(ip);
    } else {
      store.set(ip, active);
    }
  }

  // If still at capacity under heavy unique-IP traffic, drop oldest inserted key.
  while (store.size >= maxTrackedIps) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    store.delete(oldestKey);
  }
}

/**
 * Creates an in-memory sliding-window rate limiter middleware keyed by client IP.
 *
 * @param {{ windowMs?: number, maxRequests?: number, nowFn?: () => number, maxTrackedIps?: number }} [options]
 * @returns {import("express").RequestHandler}
 */
export function createRateLimitMiddleware({
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
  nowFn = () => Date.now(),
  maxTrackedIps = DEFAULT_MAX_TRACKED_IPS,
} = {}) {
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    throw new Error("Rate limiter windowMs must be a positive integer.");
  }
  if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
    throw new Error("Rate limiter maxRequests must be a positive integer.");
  }

  /** @type {Map<string, number[]>} */
  const store = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
    const now = nowFn();
    const cutoff = now - windowMs;

    const existing = store.get(clientIp) ?? [];
    const active = existing.filter((timestamp) => timestamp > cutoff);

    if (active.length >= maxRequests) {
      trackRateLimitBlock(req.path || "/secret");
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((active[0] + windowMs - now) / 1000)
      );
      store.set(clientIp, active);
      res.set("Retry-After", String(retryAfterSeconds));

      const message = `Too Many Requests: Rate limit exceeded. Try again in ${retryAfterSeconds} second(s).`;
      if (prefersHtml(req)) {
        return res.status(429).type("text/html; charset=utf-8").send(
          renderErrorHtml({
            statusCode: 429,
            badgeText: "HTTP 429 TOO MANY REQUESTS",
            heading: "Too Many Requests",
            description:
              "Repeated requests to /secret have been temporarily throttled.",
            errorMessage: message,
          })
        );
      }

      return res.status(429).type("text/plain; charset=utf-8").send(message);
    }

    if (!store.has(clientIp) && store.size >= maxTrackedIps) {
      pruneStore(store, cutoff, maxTrackedIps);
    }

    active.push(now);
    store.set(clientIp, active);
    return next();
  };
}
