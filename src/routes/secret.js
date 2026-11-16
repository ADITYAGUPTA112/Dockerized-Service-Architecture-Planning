import { Router } from "express";
import { createBasicAuthMiddleware } from "../middleware/basicAuth.js";
import { createRateLimitMiddleware } from "../middleware/rateLimit.js";
import { prefersHtml, renderSecretHtml } from "../views/templates.js";

/**
 * Creates the Basic-Auth-protected `/secret` router with IP rate limiting.
 *
 * @param {{ secretMessage: string, username: string, password: string }} config
 * @param {{ windowMs?: number, maxRequests?: number, nowFn?: () => number }} [rateLimitOptions]
 * @returns {import("express").Router}
 */
export function createSecretRouter(
  { secretMessage, username, password },
  rateLimitOptions
) {
  const router = Router();
  const rateLimitSecret = createRateLimitMiddleware(rateLimitOptions);
  const requireBasicAuth = createBasicAuthMiddleware({ username, password });

  router.get("/secret", rateLimitSecret, requireBasicAuth, (req, res) => {
    if (prefersHtml(req)) {
      return res
        .status(200)
        .type("text/html; charset=utf-8")
        .send(renderSecretHtml(secretMessage));
    }
    return res.status(200).type("text/plain; charset=utf-8").send(secretMessage);
  });

  return router;
}
