import client from "prom-client";

/**
 * Custom Prometheus registry to avoid polluting the global registry in tests.
 */
export const register = new client.Registry();

// Collect standard Node.js runtime telemetry (heap, event loop, CPU, garbage collection)
client.collectDefaultMetrics({ register, prefix: "nodejs_" });

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests processed, partitioned by method, route, and status code.",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Histogram of HTTP request latency in seconds.",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

export const authAttemptsTotal = new client.Counter({
  name: "auth_attempts_total",
  help: "Total number of HTTP Basic Auth evaluation attempts partitioned by outcome.",
  labelNames: ["outcome"],
  registers: [register],
});

export const rateLimitBlocksTotal = new client.Counter({
  name: "rate_limit_blocks_total",
  help: "Total number of requests throttled by sliding-window rate limiting.",
  labelNames: ["route"],
  registers: [register],
});

/**
 * Tracks an authentication attempt outcome.
 *
 * @param {"success" | "failure" | "missing" | "malformed"} outcome
 */
export function trackAuthAttempt(outcome) {
  authAttemptsTotal.inc({ outcome });
}

/**
 * Tracks a rate-limiting throttle event.
 *
 * @param {string} route
 */
export function trackRateLimitBlock(route) {
  rateLimitBlocksTotal.inc({ route });
}

/**
 * Express middleware that observes HTTP request duration and status code counts.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function telemetryMiddleware(req, res, next) {
  // Skip metrics scraping endpoint from request metrics to avoid feedback loops
  if (req.path === "/metrics") {
    return next();
  }

  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const durationSeconds = elapsedHrTime[0] + elapsedHrTime[1] / 1e9;

    // Normalize route label: use matched express route path or fallback to raw path
    const route = req.route?.path || req.path || "unknown";
    const statusCode = String(res.statusCode);

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      durationSeconds
    );
  });

  return next();
}
