import { Router } from "express";
import { register } from "../metrics/telemetry.js";
import { prefersHtml, renderDashboardHtml } from "../views/templates.js";

/**
 * Creates the public routes router (`/`, `/dashboard`, `/health`, and `/metrics`).
 *
 * @param {{ nodeEnv?: string, port?: number }} [config]
 * @returns {import("express").Router}
 */
export function createIndexRouter(config = {}) {
  const router = Router();

  router.get("/", (req, res) => {
    if (prefersHtml(req)) {
      return res
        .status(200)
        .type("text/html; charset=utf-8")
        .send(renderDashboardHtml(config));
    }
    return res.status(200).type("text/plain; charset=utf-8").send("Hello, world!");
  });

  router.get("/dashboard", (_req, res) => {
    res
      .status(200)
      .type("text/html; charset=utf-8")
      .send(renderDashboardHtml(config));
  });

  router.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.status(200).send(await register.metrics());
  });

  return router;
}
