/**
 * Determines whether the incoming request explicitly prefers HTML (e.g., a browser)
 * over plain text / wildcard clients (e.g., curl or automated probes).
 *
 * @param {import("express").Request} req
 * @returns {boolean}
 */
export function prefersHtml(req) {
  return req.accepts(["text/plain", "text/html"]) === "text/html";
}

/**
 * Escapes HTML special characters to prevent XSS when rendering secret or error strings.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Wraps card content inside a self-contained semantic HTML5 shell implementing
 * the dark-slate design system defined in docs/04-frontend-specification.md.
 *
 * @param {{ title: string, badgeText: string, badgeTone: "success" | "error", heading: string, description: string, insetLabel: string, insetValue: string, isAlert?: boolean, actionsHtml?: string }} options
 * @returns {string}
 */
function renderPage({
  title,
  badgeText,
  badgeTone,
  heading,
  description,
  insetLabel,
  insetValue,
  isAlert = false,
  actionsHtml = "",
}) {
  const safeTitle = escapeHtml(title);
  const safeBadge = escapeHtml(badgeText);
  const safeHeading = escapeHtml(heading);
  const safeDescription = escapeHtml(description);
  const safeInsetLabel = escapeHtml(insetLabel);
  const safeInsetValue = escapeHtml(insetValue);
  const badgeClass = badgeTone === "success" ? "badge badge-success" : "badge badge-error";
  const alertAttr = isAlert ? ' role="alert"' : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background-color: #0F172A;
      color: #F8FAFC;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.6;
    }
    .card {
      width: 100%;
      max-width: 560px;
      background-color: #1E293B;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
    }
    @media (max-width: 480px) {
      .card { padding: 24px; }
    }
    .badge {
      display: inline-block;
      border-radius: 9999px;
      padding: 4px 10px;
      font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.2;
      margin-bottom: 16px;
    }
    .badge-success {
      background-color: #064E3B;
      color: #34D399;
      border: 1px solid #10B981;
    }
    .badge-error {
      background-color: #450A0A;
      color: #FCA5A5;
      border: 1px solid #EF4444;
    }
    h1 {
      margin: 0 0 12px 0;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.25;
      color: #F8FAFC;
    }
    .description {
      margin: 0 0 24px 0;
      color: #94A3B8;
    }
    .inset {
      background-color: #0B1120;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .inset-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94A3B8;
      margin-bottom: 8px;
    }
    .inset-value {
      margin: 0;
      font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 15px;
      font-weight: 500;
      line-height: 1.5;
      color: #F8FAFC;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 150ms ease, border-color 150ms ease;
    }
    .btn:focus-visible {
      outline: 2px solid #93C5FD;
      outline-offset: 2px;
    }
    .btn-primary {
      background-color: #3B82F6;
      color: #F8FAFC;
      border: none;
    }
    .btn-primary:hover {
      background-color: #2563EB;
    }
    .btn-secondary {
      background-color: transparent;
      color: #F8FAFC;
      border: 1px solid #475569;
    }
    .btn-secondary:hover {
      background-color: #334155;
    }
  </style>
</head>
<body>
  <main class="card">
    <span class="${badgeClass}">${safeBadge}</span>
    <h1>${safeHeading}</h1>
    <p class="description">${safeDescription}</p>
    <div class="inset"${alertAttr}>
      <span class="inset-label">${safeInsetLabel}</span>
      <p class="inset-value">${safeInsetValue}</p>
    </div>
    <div class="actions">${actionsHtml}</div>
  </main>
</body>
</html>`;
}

/**
 * Renders the authenticated /secret reveal page for browser visitors.
 *
 * @param {string} secretMessage
 * @returns {string}
 */
export function renderSecretHtml(secretMessage) {
  return renderPage({
    title: "Protected Secret — Dockerized Service",
    badgeText: "HTTP 200 OK",
    badgeTone: "success",
    heading: "Protected Secret",
    description:
      "Basic Authentication succeeded. Below is the secret message injected via runtime environment configuration.",
    insetLabel: "SECRET_MESSAGE",
    insetValue: secretMessage,
    actionsHtml: '<a class="btn btn-secondary" href="/">Back to Home</a>',
  });
}

/**
 * Renders the 401 Unauthorized error page for browser visitors.
 *
 * @param {string} errorMessage
 * @returns {string}
 */
export function renderUnauthorizedHtml(errorMessage) {
  return renderPage({
    title: "Access Denied — Dockerized Service",
    badgeText: "HTTP 401 UNAUTHORIZED",
    badgeTone: "error",
    heading: "Access Denied",
    description:
      "Valid HTTP Basic Auth credentials are required to view /secret.",
    insetLabel: "Error",
    insetValue: errorMessage,
    isAlert: true,
    actionsHtml:
      '<a class="btn btn-primary" href="/secret">Try Again</a>' +
      '<a class="btn btn-secondary" href="/">Back to Home</a>',
  });
}

/**
 * Renders 404 or 500 error pages for browser visitors.
 *
 * @param {{ statusCode: number, badgeText: string, heading: string, description: string, errorMessage: string }} options
 * @returns {string}
 */
export function renderErrorHtml({
  statusCode,
  badgeText,
  heading,
  description,
  errorMessage,
}) {
  return renderPage({
    title: `${statusCode} ${heading} — Dockerized Service`,
    badgeText,
    badgeTone: "error",
    heading,
    description,
    insetLabel: "Status Detail",
    insetValue: errorMessage,
    isAlert: true,
    actionsHtml: '<a class="btn btn-primary" href="/">Back to Home</a>',
  });
}
