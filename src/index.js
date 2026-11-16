import { bootstrapEnv, loadConfig } from "./config/env.js";
import { createApp } from "./app.js";

bootstrapEnv();

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`FATAL: ${error.message}`);
  process.exit(1);
}

const app = createApp(config);
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${config.port} (${config.nodeEnv})`);
});

/**
 * Gracefully stops accepting new connections on container/process termination signals.
 *
 * @param {string} signal
 */
function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
