import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";

const REQUIRED_KEYS = ["SECRET_MESSAGE", "USERNAME", "PASSWORD"];
const DEFAULT_PORT = 3000;

/**
 * Loads variables from a local `.env` file without overwriting values
 * explicitly provided by the container or shell runtime.
 *
 * On Windows, the OS populates `process.env.USERNAME` with the logged-in
 * account name by default; if `.env` defines `USERNAME` and `process.env.USERNAME`
 * still matches the OS account name, `.env` takes precedence for local dev.
 *
 * @param {string} [cwd=process.cwd()]
 * @param {Record<string, string | undefined>} [targetEnv=process.env]
 * @param {{ platform?: string, osUsername?: string }} [runtimeInfo]
 */
export function bootstrapEnv(
  cwd = process.cwd(),
  targetEnv = process.env,
  runtimeInfo = {
    platform: process.platform,
    osUsername: os.userInfo().username,
  }
) {
  const envPath = path.resolve(cwd, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const parsed = dotenv.parse(fs.readFileSync(envPath));
  const isDefaultWindowsUser =
    runtimeInfo.platform === "win32" &&
    typeof runtimeInfo.osUsername === "string" &&
    targetEnv.USERNAME === runtimeInfo.osUsername;

  for (const [key, value] of Object.entries(parsed)) {
    if (
      targetEnv[key] === undefined ||
      (key === "USERNAME" && isDefaultWindowsUser)
    ) {
      targetEnv[key] = value;
    }
  }
}

/**
 * Validates and normalizes service configuration from an environment object.
 * Throws descriptive errors listing only key names (never secret values).
 *
 * @param {Record<string, string | undefined>} [envSource=process.env]
 * @returns {{ port: number, nodeEnv: string, secretMessage: string, username: string, password: string }}
 */
export function loadConfig(envSource = process.env) {
  const missingKeys = REQUIRED_KEYS.filter((key) => {
    const value = envSource[key];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing or empty required environment variable(s): ${missingKeys.join(", ")}. Check .env or container runtime flags.`
    );
  }

  const port = parsePort(envSource.PORT);
  const rawNodeEnv = envSource.NODE_ENV;
  const nodeEnv =
    typeof rawNodeEnv === "string" && rawNodeEnv.trim().length > 0
      ? rawNodeEnv.trim()
      : "development";

  return Object.freeze({
    port,
    nodeEnv,
    secretMessage: envSource.SECRET_MESSAGE,
    username: envSource.USERNAME,
    password: envSource.PASSWORD,
  });
}

/**
 * Parses and validates the listening TCP port.
 *
 * @param {string | undefined} rawPort
 * @returns {number}
 */
function parsePort(rawPort) {
  if (rawPort === undefined || String(rawPort).trim() === "") {
    return DEFAULT_PORT;
  }

  const trimmed = String(rawPort).trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      "Invalid environment variable: PORT must be an integer between 1 and 65535."
    );
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < 1 || parsed > 65535) {
    throw new Error(
      "Invalid environment variable: PORT must be an integer between 1 and 65535."
    );
  }

  return parsed;
}
