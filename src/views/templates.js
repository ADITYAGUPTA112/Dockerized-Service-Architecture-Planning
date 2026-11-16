/**
 * Renders the full interactive Developer & Architecture Dashboard for browser visitors on `/`.
 *
 * @param {{ nodeEnv?: string, port?: number }} [systemInfo]
 * @returns {string}
 */
export function renderDashboardHtml(systemInfo = {}) {
  const nodeEnv = escapeHtml(systemInfo.nodeEnv || "production");
  const port = escapeHtml(systemInfo.port || 3000);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dockerized Service — Architecture & Operations Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at top, #1E293B 0%, #0F172A 50%, #0B1120 100%);
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    /* Header & Nav */
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #334155;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
    }
    .brand-text h1 {
      font-size: 20px;
      font-weight: 700;
      color: #F8FAFC;
      letter-spacing: -0.02em;
    }
    .brand-text p {
      font-size: 13px;
      color: #94A3B8;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #064E3B;
      border: 1px solid #10B981;
      color: #34D399;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34D399;
      box-shadow: 0 0 8px #34D399;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* Grid layout */
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    /* Cards */
    .card {
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      position: relative;
      overflow: hidden;
    }
    .card-stat {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #94A3B8;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: #F8FAFC;
      font-family: ui-monospace, monospace;
    }
    .stat-sub {
      font-size: 12px;
      color: #38BDF8;
    }

    /* Section Headings */
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #F1F5F9;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Pipeline Flow */
    .pipeline-wrapper {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-top: 12px;
    }
    .pipe-step {
      background: #0F172A;
      border: 1px solid #334155;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 140px;
    }
    .pipe-step.active {
      border-color: #3B82F6;
      background: rgba(59, 130, 246, 0.1);
    }
    .pipe-arrow {
      color: #64748B;
      font-weight: bold;
    }

    /* API Tester */
    .api-endpoint {
      background: #0B1120;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .api-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
    }
    .badge-method {
      background: #2563EB;
      color: #EFF6FF;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: ui-monospace, monospace;
    }
    .api-path {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-weight: 600;
      font-size: 14px;
      color: #E2E8F0;
    }
    .api-desc {
      font-size: 13px;
      color: #94A3B8;
      margin-bottom: 12px;
    }
    .api-inputs {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .input-field {
      background: #1E293B;
      border: 1px solid #475569;
      color: #F8FAFC;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-family: ui-monospace, monospace;
      flex: 1;
      min-width: 120px;
    }
    .input-field:focus {
      outline: 2px solid #3B82F6;
      border-color: transparent;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 150ms ease;
      text-decoration: none;
    }
    .btn-primary { background: #3B82F6; color: #FFFFFF; }
    .btn-primary:hover { background: #2563EB; }
    .btn-success { background: #10B981; color: #FFFFFF; }
    .btn-success:hover { background: #059669; }
    .btn-outline { background: transparent; border: 1px solid #475569; color: #CBD5E1; }
    .btn-outline:hover { background: #334155; }
    .api-output {
      display: none;
      background: #000000;
      border: 1px solid #1E293B;
      border-radius: 6px;
      padding: 12px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      color: #38BDF8;
      white-space: pre-wrap;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 10px;
    }

    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #334155;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      font-size: 13px;
      color: #64748B;
    }
    footer a { color: #38BDF8; text-decoration: none; }
    footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon">🐳</div>
        <div class="brand-text">
          <h1>Dockerized Service Architecture</h1>
          <p>Production Cloud Native Microservice • Node.js + Docker + Kubernetes + Jenkins</p>
        </div>
      </div>
      <div class="status-pill">
        <div class="pulse-dot"></div>
        <span>LIVE SYSTEM (200 OK)</span>
      </div>
    </header>

    <!-- Top Stats Row -->
    <div class="grid-4">
      <div class="card card-stat">
        <span class="stat-label">Runtime Environment</span>
        <span class="stat-value" id="val-env">${nodeEnv}</span>
        <span class="stat-sub">Port: ${port}</span>
      </div>
      <div class="card card-stat">
        <span class="stat-label">Security & Isolation</span>
        <span class="stat-value">UID 1000</span>
        <span class="stat-sub">Non-Root • 0 Secret Leaks</span>
      </div>
      <div class="card card-stat">
        <span class="stat-label">Container Base</span>
        <span class="stat-value">Alpine Linux</span>
        <span class="stat-sub">Node.js 22 LTS</span>
      </div>
      <div class="card card-stat">
        <span class="stat-label">System Uptime</span>
        <span class="stat-value" id="uptime-display">Loading...</span>
        <span class="stat-sub" id="timestamp-display">Healthy</span>
      </div>
    </div>

    <!-- DevOps Pipeline Flow -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="section-title">
        <span>🚀</span> End-to-End DevOps & Continuous Delivery Pipeline
      </div>
      <div class="pipeline-wrapper">
        <div class="pipe-step active">
          <span>⚙️</span> Node.js App
        </div>
        <span class="pipe-arrow">➔</span>
        <div class="pipe-step active">
          <span>🐳</span> Docker Build
        </div>
        <span class="pipe-arrow">➔</span>
        <div class="pipe-step active">
          <span>🤖</span> Jenkins CI/CD
        </div>
        <span class="pipe-arrow">➔</span>
        <div class="pipe-step active">
          <span>☸️</span> Kubernetes
        </div>
        <span class="pipe-arrow">➔</span>
        <div class="pipe-step active">
          <span>📊</span> Prometheus
        </div>
        <span class="pipe-arrow">➔</span>
        <div class="pipe-step active">
          <span>🐙</span> ArgoCD
        </div>
      </div>
    </div>

    <!-- API & Interactive Route Explorer -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="section-title">
        <span>⚡</span> Interactive Live API Explorer
      </div>

      <!-- Endpoint 1: Root -->
      <div class="api-endpoint">
        <div class="api-header">
          <div>
            <span class="badge-method">GET</span>
            <span class="api-path">/</span>
          </div>
          <button class="btn btn-outline" onclick="testEndpoint('/', 'out-root')">Send Request</button>
        </div>
        <p class="api-desc">Returns standard plain-text welcome message <code>Hello, world!</code>.</p>
        <div class="api-output" id="out-root"></div>
      </div>

      <!-- Endpoint 2: Health -->
      <div class="api-endpoint">
        <div class="api-header">
          <div>
            <span class="badge-method">GET</span>
            <span class="api-path">/health</span>
          </div>
          <button class="btn btn-outline" onclick="testEndpoint('/health', 'out-health', true)">Check Health</button>
        </div>
        <p class="api-desc">Kubernetes Liveness/Readiness probe endpoint returning JSON status and uptime.</p>
        <div class="api-output" id="out-health"></div>
      </div>

      <!-- Endpoint 3: Secret -->
      <div class="api-endpoint" style="border-color: #3B82F6;">
        <div class="api-header">
          <div>
            <span class="badge-method" style="background: #8B5CF6;">GET</span>
            <span class="api-path">/secret</span>
            <span style="font-size: 11px; color: #F59E0B; margin-left: 6px; font-weight: 600;">🔒 Basic Auth Protected</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <a class="btn btn-outline" href="/secret" target="_blank">Direct Visit ↗</a>
            <button class="btn btn-primary" onclick="testAuthSecret()">Unlock Secret</button>
          </div>
        </div>
        <p class="api-desc">Protected by RFC 7617 HTTP Basic Authentication & sliding-window rate limiting.</p>
        <div class="api-inputs">
          <input type="text" id="auth-user" class="input-field" placeholder="Username (devuser)" value="devuser" />
          <input type="password" id="auth-pass" class="input-field" placeholder="Password (devpass123)" value="devpass123" />
        </div>
        <div class="api-output" id="out-secret"></div>
      </div>

      <!-- Endpoint 4: Metrics -->
      <div class="api-endpoint">
        <div class="api-header">
          <div>
            <span class="badge-method" style="background: #10B981;">GET</span>
            <span class="api-path">/metrics</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <a class="btn btn-outline" href="/metrics" target="_blank">Raw Metrics ↗</a>
            <button class="btn btn-outline" onclick="testEndpoint('/metrics', 'out-metrics')">Scrape Metrics</button>
          </div>
        </div>
        <p class="api-desc">Prometheus metrics exposition endpoint for ServiceMonitor and Grafana scraping.</p>
        <div class="api-output" id="out-metrics"></div>
      </div>
    </div>

    <footer>
      <span>Dockerized Service Architecture • 100% Automated CI/CD & Production Verified</span>
      <div>
        <a href="https://github.com/ADITYAGUPTA112/Dockerized-Service-Architecture-Planning" target="_blank">GitHub Repository ↗</a>
      </div>
    </footer>
  </div>

  <script>
    // Live health updater
    async function updateHealth() {
      try {
        const res = await fetch('/health');
        if (res.ok) {
          const data = await res.json();
          const uptimeSec = data.uptime || 0;
          const mins = Math.floor(uptimeSec / 60);
          const secs = uptimeSec % 60;
          document.getElementById('uptime-display').textContent = mins + 'm ' + secs + 's';
          document.getElementById('timestamp-display').textContent = new Date(data.timestamp).toLocaleTimeString();
        }
      } catch (e) {
        document.getElementById('uptime-display').textContent = 'Live';
      }
    }
    updateHealth();
    setInterval(updateHealth, 5000);

    // API Tester
    async function testEndpoint(path, outputId, isJson = false) {
      const out = document.getElementById(outputId);
      out.style.display = 'block';
      out.textContent = 'Fetching ' + path + '...';
      try {
        const res = await fetch(path, { headers: { 'Accept': isJson ? 'application/json' : 'text/plain' } });
        const text = await res.text();
        out.textContent = 'HTTP ' + res.status + ' ' + res.statusText + '\\n\\n' + text;
      } catch (err) {
        out.textContent = 'Error: ' + err.message;
      }
    }

    // Auth Secret Tester
    async function testAuthSecret() {
      const user = document.getElementById('auth-user').value;
      const pass = document.getElementById('auth-pass').value;
      const out = document.getElementById('out-secret');
      out.style.display = 'block';
      out.textContent = 'Authenticating with Basic Auth...';

      const credentials = btoa(user + ':' + pass);
      try {
        const res = await fetch('/secret', {
          headers: {
            'Authorization': 'Basic ' + credentials,
            'Accept': 'text/plain'
          }
        });
        const text = await res.text();
        if (res.ok) {
          out.style.color = '#34D399';
          out.textContent = 'HTTP ' + res.status + ' OK (Authenticated!)\\n\\nSECRET_MESSAGE: ' + text;
        } else {
          out.style.color = '#F87171';
          out.textContent = 'HTTP ' + res.status + ' ' + res.statusText + '\\n\\n' + text;
        }
      } catch (err) {
        out.style.color = '#F87171';
        out.textContent = 'Network Error: ' + err.message;
      }
    }
  </script>
</body>
</html>`;
}

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
