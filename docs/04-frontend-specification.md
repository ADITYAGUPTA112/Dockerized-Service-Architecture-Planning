# 04 — Frontend & External Integration Specification Document

**Project:** Dockerized Service (Node.js + Docker + Remote Linux + GitHub Actions CI/CD)
**Version:** 1.0
**Scope:** Browser presentation design system (colors, typography, components, layout) and complete API / third-party integration contracts across all phases.

---

## 1. Presentation Strategy & Content-Negotiation Rule

This service must work seamlessly for **both automated `curl`/CLI checks and human browser visitors**:

1. **`GET /` (Root Route):**
   - Always returns **`Hello, world!`** (`Content-Type: text/plain; charset=utf-8`, status `200 OK`) to preserve strict 100% compatibility with `roadmap.sh` checks and automated probes.
2. **`GET /secret` and Error Views (`401`, `404`, `500`):**
   - **CLI / API clients** (requests where `Accept` does **not** prefer `text/html`, e.g., `curl`, Postman JSON checks): receive exact plain text (`SECRET_MESSAGE` on `200 OK`, or concise error text on `401`/`404`/`500`).
   - **Browser visitors** (requests with `Accept: text/html` — Phase 4 Nice-to-Have `F-4.5`): receive server-rendered, inline-styled semantic HTML5 pages conforming to the exact Design System below. Every browser page has zero external CDN dependencies (100% self-contained inside the container) and renders the exact `SECRET_MESSAGE` or error text prominently.

---

## 2. Design System (Browser Views & Optional Status/Retry UI)

### 2.1 Color Palette (Exact Hex Codes)

| Token | Hex Code | Usage |
| :--- | :--- | :--- |
| **Background (`bg-canvas`)** | `#0F172A` | Full-viewport dark slate backdrop |
| **Surface / Card (`bg-surface`)** | `#1E293B` | Elevated card container for `/secret` and error views |
| **Surface Subtle (`bg-elevated`)** | `#0B1120` | Code / secret message display inset box |
| **Border (`border-default`)** | `#334155` | 1px card, input, and badge outlines |
| **Primary (`color-primary`)** | `#3B82F6` | Primary action buttons (e.g., "Retry Sign In", "Back to Home") |
| **Primary Hover (`color-primary-hover`)** | `#2563EB` | Hover state for primary buttons |
| **Secondary (`color-secondary`)** | `#475569` | Secondary outline/ghost buttons |
| **Text Primary (`text-primary`)** | `#F8FAFC` | Headings, secret value, main body text (contrast > 14:1 on `#1E293B`) |
| **Text Muted (`text-muted`)** | `#94A3B8` | Labels, helper hints, metadata captions |
| **Success (`color-success`)** | `#10B981` | `200 OK` / "Access Granted" status pill & border accent |
| **Success Tint (`bg-success-tint`)** | `#064E3B` | Subtle badge background for authenticated state |
| **Error (`color-error`)** | `#EF4444` | `401` / `404` / `500` error badges, invalid state borders |
| **Error Tint (`bg-error-tint`)** | `#450A0A` | Subtle badge background for unauthorized/error states |
| **Warning (`color-warning`)** | `#F59E0B` | Rate-limit / HTTPS advisory notice |

### 2.2 Typography

- **UI Sans Font Stack:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace Font Stack (Secrets, Routes, Status Codes):** `'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace`

| Role | Font Family | Size (`px` / `rem`) | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **H1 (Page Title)** | Sans | `24px` (`1.5rem`) | `700` (Bold) | `1.25` | Card headline (e.g., "Protected Secret", "Access Denied") |
| **H2 (Section Header)** | Sans | `18px` (`1.125rem`) | `600` (SemiBold) | `1.35` | Subsection title or modal heading |
| **Body** | Sans | `15px` (`0.9375rem`) | `400` (Regular) | `1.6` | Explanations and error instructions |
| **Secret / Code Block** | Monospace | `15px` (`0.9375rem`) | `500` (Medium) | `1.5` | Displaying `SECRET_MESSAGE` or route paths (`/secret`) |
| **Button Text** | Sans | `14px` (`0.875rem`) | `600` (SemiBold) | `1.2` | Action buttons and links |
| **Badge / Caption** | Monospace | `12px` (`0.75rem`) | `600` (SemiBold) | `1.2` | HTTP status pills (`HTTP 200 OK`, `HTTP 401`) |

### 2.3 Component Styles

#### Buttons
- **Primary Button:** Background `#3B82F6`, text `#F8FAFC`, padding `10px 18px`, border-radius `8px`, border `none`, transition `150ms ease`. Hover `#2563EB`; focus-visible `2px solid #93C5FD` with `2px` offset.
- **Secondary Button:** Background `transparent`, border `1px solid #475569`, text `#F8FAFC`, padding `10px 18px`, border-radius `8px`. Hover background `#334155`.
- **Destructive / Retry Auth Action:** Background `#EF4444` (or outline `#EF4444` text `#FCA5A5`), used only when prompting re-authentication or reset.

#### Input Fields *(for any optional in-page verification modal / V2 expansion)*
- Background `#0B1120`, border `1px solid #334155`, text `#F8FAFC`, placeholder `#64748B`, padding `10px 14px`, border-radius `8px`, height `42px`.
- Focus border `#3B82F6` with `0 0 0 3px rgba(59, 130, 246, 0.25)`.
- Error border `#EF4444` with helper error text `#FCA5A5` (`13px`) directly below the input.

#### Cards
- **Primary Utility Card (Secret Reveal / Error Card):** Background `#1E293B`, border `1px solid #334155`, border-radius `12px`, padding `32px` (desktop) / `24px` (mobile), shadow `0 20px 25px -5px rgba(0, 0, 0, 0.4)`.
- **Secret Inset Box:** Background `#0B1120`, border `1px solid #334155`, border-radius `8px`, padding `16px`, monospace font, word-break safe (`overflow-wrap: anywhere`).

#### Modals *(Native Browser Basic Auth Prompt + Optional Fallback Modal)*
- **V1 Primary Prompt:** Browser native HTTP Basic Auth dialog triggered by `401` + `WWW-Authenticate: Basic realm="Secret Area"`.
- **Optional HTML Fallback Dialog (`<dialog>`):** Centered `max-width: 420px`, surface `#1E293B`, backdrop `rgba(15, 23, 42, 0.75)` with `backdrop-filter: blur(4px)`, `1px solid #334155`, `border-radius: 12px`, `padding: 24px`, Escape-key and focus-trap accessible.

#### Status Badges
- **Success Badge:** Pill shape (`9999px`), padding `4px 10px`, background `#064E3B`, text `#34D399`, border `1px solid #10B981`.
- **Error Badge:** Pill shape (`9999px`), padding `4px 10px`, background `#450A0A`, text `#FCA5A5`, border `1px solid #EF4444`.

### 2.4 Spacing & Layout Rules

- **Spacing Scale:** Strict `4px` base unit (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
- **Page Grid:** Single centered flex/grid column, `min-height: 100dvh`, `padding: 24px` viewport gutter, content card `max-width: 560px`, `width: 100%`.
- **Internal Rhythm:** `16px` gap between badge and heading, `12px` between heading and body copy, `24px` before the secret/error inset box, `24px` before footer action row.
- **Accessibility:** Minimum `44x44px` tap targets on mobile buttons; visible keyboard focus outlines on all interactive controls; semantic `<main>`, `<h1>`, `<p>`, and `role="alert"` on error messages.

---

## 3. API & External Integration Specification

Every internal HTTP endpoint and third-party infrastructure integration is defined below.

### 3.1 Service HTTP Endpoints (Phase 1)

| Endpoint | Method | Auth | Request Headers | Expected Success Response | Error / Failure Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`/`** | `GET` | None (Public) | Optional | `200 OK`, `Content-Type: text/plain; charset=utf-8`, Body: `Hello, world!` | `500` generic error |
| **`/secret`** | `GET` | HTTP Basic Auth | `Authorization: Basic <base64(user:pass)>` | `200 OK`: Plain text `SECRET_MESSAGE` (CLI) or styled HTML card containing `SECRET_MESSAGE` (Browser) | `401 Unauthorized` + `WWW-Authenticate: Basic realm="Secret Area"` + error text/HTML (`Invalid username or password.`) |
| **`/health`** | `GET` | None (Public) | Optional | `200 OK`, `Content-Type: application/json`: `{"status":"ok","uptime":<seconds>,"timestamp":"<ISO8601>"}` | `503` if server shutting down |
| **Any other route** | Any | N/A | N/A | N/A | `404 Not Found` (`Not Found: Route does not exist.`) |

### 3.2 GitHub Container Registry (`ghcr.io`) Integration (Phase 2 & 4)

- **Purpose:** Stores immutable, versioned Docker images built by CI so the remote server pulls pre-built artifacts rather than building on production hardware.
- **Registry Endpoint:** `https://ghcr.io` (OCI v2 Registry API via `docker/login-action@v3` and `docker/build-push-action@v6`).
- **Authentication:**
  - In CI: `username: ${{ github.actor }}`, `password: ${{ secrets.GITHUB_TOKEN }}` with workflow permission `packages: write`.
  - On Remote Server (if package is private): Read-only GitHub PAT (`read:packages` scope) stored as `GHCR_READ_TOKEN` secret for `docker login ghcr.io`. (If package is public, `docker pull` requires no server token.)
- **Payload / Tags Sent:**
  - `ghcr.io/<owner>/<repo>:sha-<short_sha>` (immutable deployment target)
  - `ghcr.io/<owner>/<repo>:latest` (rolling main branch tag)
- **Expected Response:** OCI image manifest digest returned upon push; exit code `0`.

### 3.3 GitHub Actions CI/CD Integration (Phase 4)

- **Purpose:** Automates testing, Docker image publishing, and remote server deployment on push to `main`.
- **Trigger:** `push` to `branches: [main]` and manual `workflow_dispatch`.
- **Required GitHub Repository Secrets:**
  - `SSH_HOST`: Public IPv4/domain of the remote Linux server.
  - `SSH_USER`: Non-root deploy username (e.g., `deploy`).
  - `SSH_PRIVATE_KEY`: Private Ed25519 SSH key matching `~/.ssh/authorized_keys` on the server.
  - `SSH_PORT`: SSH port (default `22`).
  - `SECRET_MESSAGE`: Production secret text served by `/secret`.
  - `APP_USERNAME` (or `USERNAME`): Production Basic Auth username *(Note: prefixing as `APP_USERNAME` in GitHub Secrets avoids any OS reserved `USERNAME` conflict on Windows/Linux shells, then maps cleanly to container env `-e USERNAME=...`)*.
  - `APP_PASSWORD` (or `PASSWORD`): Production Basic Auth password.
  - `GHCR_READ_TOKEN` *(optional)*: Read-only PAT if the GHCR container package is kept private.

### 3.4 Remote Linux Server / Cloud Provider Integration (Phase 3 & 4)

- **Supported Providers:** DigitalOcean Droplet, AWS EC2, Hetzner, or Linode running **Ubuntu 24.04 LTS**.
- **Transport Protocol:** OpenSSH over TCP port `22` (key-based auth only; executed via `appleboy/ssh-action@v1` or `openssh-client` in GitHub Actions).
- **Remote Commands Executed During Deploy:**
  1. Authenticate to `ghcr.io` (if private package).
  2. `docker pull ghcr.io/<owner>/<repo>:sha-<short_sha>`
  3. Write runtime environment file (`chmod 600`) or pass secrets securely without echoing them to stdout.
  4. `docker stop dockerized-service || true` and `docker rm dockerized-service || true`
  5. `docker run -d --name dockerized-service --restart unless-stopped -p <bind_port>:3000 --env-file /home/deploy/.service.env ghcr.io/<owner>/<repo>:sha-<short_sha>`
  6. Poll `http://127.0.0.1:3000/health` up to 10 attempts (1s interval); fail deployment if `200 OK` is not received.
  7. `docker image prune -f` to prevent disk exhaustion from stale layers.

### 3.5 Reverse Proxy / TLS Integration — Caddy (Phase 3/5 Should-Have)

- **Purpose:** Terminates HTTPS (`443`) using automatic Let's Encrypt certificates and proxies requests to `127.0.0.1:3000`, protecting Basic Auth headers in transit.
- **Inbound Ports Open in UFW:** `22/tcp` (SSH), `80/tcp` (ACME HTTP challenge + redirect), `443/tcp` (HTTPS). Port `3000` remains bound only to `127.0.0.1` when Caddy is active (or open via UFW `3000/tcp` if testing raw IP without a domain in Phase 3).
