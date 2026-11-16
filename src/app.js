import express from "express";
import { createIndexRouter } from "./routes/index.js";
import { createSecretRouter } from "./routes/secret.js";
import { createErrorHandler, notFoundHandler } from "./middleware/errorHandler.js";

/**
 * Builds and configures the Express application instance.
 *
 * @param {{ port: number, nodeEnv: string, secretMessage: string, username: string, password: string }} config
 * @param {{ rateLimit?: { windowMs?: number, maxRequests?: number, nowFn?: () => number } }} [options]
 * @returns {import("express").Express}
 */
export function createApp(config, options = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Trust the first reverse proxy hop (Caddy/Nginx) so rate limiting inspects real client IPs.
  app.set("trust proxy", 1);

  app.use(createIndexRouter());
  app.use(createSecretRouter(config, options.rateLimit));
  app.use(notFoundHandler);
  app.use(createErrorHandler(config.nodeEnv));

  return app;
}
