import { Router } from "express";
import { register } from "../metrics/telemetry.js";

/**
 * Creates the public routes router (`/`, `/health`, and `/metrics`).
 *
 * @returns {import("express").Router}
 */
export function createIndexRouter() {
  const router = Router();

  router.get("/", (_req, res) => {
    res.status(200).type("text/plain; charset=utf-8").send("Hello, world!");
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
