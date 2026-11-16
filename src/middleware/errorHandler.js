import { prefersHtml, renderErrorHtml } from "../views/templates.js";

/**
 * Handles requests to undefined routes with a clean 404 response.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export function notFoundHandler(req, res) {
  const message = "Not Found: The requested route does not exist.";
  if (prefersHtml(req)) {
    return res.status(404).type("text/html; charset=utf-8").send(
      renderErrorHtml({
        statusCode: 404,
        badgeText: "HTTP 404 NOT FOUND",
        heading: "Page Not Found",
        description: "The URL you requested does not match an active route.",
        errorMessage: message,
      })
    );
  }
  return res.status(404).type("text/plain; charset=utf-8").send(message);
}

/**
 * Creates the global error-handling middleware.
 * Logs minimal error metadata without request headers and hides stack traces in production.
 *
 * @param {string} nodeEnv
 * @returns {import("express").ErrorRequestHandler}
 */
export function createErrorHandler(nodeEnv) {
  return function errorHandler(err, req, res, _next) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (nodeEnv === "production") {
      console.error(`Unhandled error on ${req.method} ${req.path}: ${message}`);
    } else {
      console.error(`Unhandled error on ${req.method} ${req.path}:`, err);
    }

    if (res.headersSent) {
      return;
    }

    const publicMessage =
      "Internal Server Error: Something went wrong. Please try again later.";
    if (prefersHtml(req)) {
      return res.status(500).type("text/html; charset=utf-8").send(
        renderErrorHtml({
          statusCode: 500,
          badgeText: "HTTP 500 ERROR",
          heading: "Internal Server Error",
          description: "An unexpected server error prevented completing your request.",
          errorMessage: publicMessage,
        })
      );
    }

    return res.status(500).type("text/plain; charset=utf-8").send(publicMessage);
  };
}
