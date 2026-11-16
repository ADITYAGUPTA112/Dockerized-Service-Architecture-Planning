import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { bootstrapEnv, loadConfig } from "../src/config/env.js";

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ENTRYPOINT_PATH = path.resolve(TESTS_DIR, "../src/index.js");

describe("loadConfig", () => {
  it("loads required variables and applies default PORT and NODE_ENV", () => {
    const config = loadConfig({
      SECRET_MESSAGE: "top-secret",
      USERNAME: "alice",
      PASSWORD: "s3cr3t:password",
    });

    assert.equal(config.port, 3000);
    assert.equal(config.nodeEnv, "development");
    assert.equal(config.secretMessage, "top-secret");
    assert.equal(config.username, "alice");
    assert.equal(config.password, "s3cr3t:password");
  });

  it("parses custom PORT and NODE_ENV", () => {
    const config = loadConfig({
      PORT: "8080",
      NODE_ENV: "production",
      SECRET_MESSAGE: "hello",
      USERNAME: "admin",
      PASSWORD: "pw",
    });

    assert.equal(config.port, 8080);
    assert.equal(config.nodeEnv, "production");
  });

  it("rejects missing or whitespace-only required keys without leaking values", () => {
    assert.throws(
      () =>
        loadConfig({
          SECRET_MESSAGE: "do-not-leak-this-value",
          USERNAME: "   ",
          PASSWORD: "",
        }),
      (err) => {
        assert.match(err.message, /USERNAME, PASSWORD/);
        assert.doesNotMatch(err.message, /do-not-leak-this-value/);
        return true;
      }
    );
  });

  it("rejects invalid PORT values", () => {
    for (const badPort of ["abc", "0", "-1", "65536", "3000.5"]) {
      assert.throws(
        () =>
          loadConfig({
            PORT: badPort,
            SECRET_MESSAGE: "secret",
            USERNAME: "user",
            PASSWORD: "pw",
          }),
        /PORT must be an integer between 1 and 65535/
      );
    }
  });

  it("exits with code 1 when started without required environment variables", () => {
    const result = spawnSync(process.execPath, [ENTRYPOINT_PATH], {
      cwd: TESTS_DIR,
      env: { PATH: process.env.PATH, NODE_ENV: "production" },
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /FATAL: Missing or empty required environment variable\(s\)/);
  });
});

describe("bootstrapEnv", () => {
  it("loads .env without overwriting explicit runtime vars, while resolving Windows OS USERNAME collision", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kgas-env-"));
    try {
      fs.writeFileSync(
        path.join(tempDir, ".env"),
        "PORT=3000\nUSERNAME=dotenv_user\nPASSWORD=dotenv_pass\nSECRET_MESSAGE=hi\n",
        "utf8"
      );

      // Simulate Windows default OS USERNAME + explicit PORT override
      const targetEnv = { PORT: "4500", USERNAME: "win_os_user" };
      bootstrapEnv(tempDir, targetEnv, {
        platform: "win32",
        osUsername: "win_os_user",
      });

      assert.equal(targetEnv.PORT, "4500");
      assert.equal(targetEnv.USERNAME, "dotenv_user");
      assert.equal(targetEnv.PASSWORD, "dotenv_pass");
      assert.equal(targetEnv.SECRET_MESSAGE, "hi");

      // Explicit shell override on Windows should still win over .env
      const explicitEnv = { USERNAME: "custom_override_user" };
      bootstrapEnv(tempDir, explicitEnv, {
        platform: "win32",
        osUsername: "win_os_user",
      });
      assert.equal(explicitEnv.USERNAME, "custom_override_user");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
