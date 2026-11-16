import { Router } from "express";

/**
 * Creates the public routes router (`/` and `/health`).
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

  return router;
}
