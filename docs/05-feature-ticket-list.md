# 05 — Feature Ticket List (Phase-Wise & AI-Ready)

**Project:** Dockerized Service (Node.js + Docker + Remote Linux + GitHub Actions CI/CD)
**Version:** 1.0
**How to Use This File:** Execute tickets strictly in phase order (`Phase 1` -> `Phase 2` -> `Phase 3` -> `Phase 4` -> `Phase 5`). Each ticket's **Task Description** is written to work directly as a standalone prompt for an AI coding assistant.

---

## Phase 1: Node.js Service & Local Configuration

### Ticket T-101: Initialize Node.js Project & Environment Scaffold
- **Phase:** Phase 1
- **Priority:** Must-Have for Launch
- **Dependencies:** Phase 0 docs approved
- **Task Description (AI Prompt):**
  > Initialize a Node.js 22.x project in `c:\KGAS PROJECT` using `npm init` conventions with `"type": "module"` (or CommonJS—pick ES Modules consistently across `src/` and `tests/`). Install `express` (`^4.21.0`) and `dotenv` (`^16.4.0`) as runtime dependencies, and `supertest` (`^7.0.0`) plus `eslint` (`^9.0.0`) as dev dependencies. Create `.gitignore` (excluding `node_modules/`, `.env`, `.env.*` except `.env.example`, `coverage/`, and logs), `.gitattributes` enforcing LF line endings for `.sh`, `.yml`, `Dockerfile`, and `.env*`, and `.env.example` documenting `PORT=3000`, `NODE_ENV=development`, `SECRET_MESSAGE`, `USERNAME`, and `PASSWORD` with safe placeholder values. Create a local `.env` with sample non-production dev values for testing. Configure `package.json` scripts: `start`, `dev`, `test` (`node --test`), and `lint`.
- **Acceptance Criteria:**
  - [ ] `package.json` defines `start`, `dev`, `test`, and `lint` scripts.
  - [ ] `.gitignore` prevents `.env` and `node_modules/` from being tracked by Git.
  - [ ] `.env.example` exists with all 5 keys and zero real secrets.
  - [ ] `npm install` and `npm run lint` succeed without errors.

---

### Ticket T-102: Startup Environment Loader & Strict Validation (`src/config/env.js`)
- **Phase:** Phase 1
- **Priority:** Must-Have for Launch
- **Dependencies:** T-101
- **Task Description (AI Prompt):**
  > Create `src/config/env.js` that loads `.env` using `dotenv` (only if not already populated or in non-production, without overriding runtime environment variables injected by Docker) and exports a validated config object `{ port, nodeEnv, secretMessage, username, password }`. Validate that `SECRET_MESSAGE`, `USERNAME`, and `PASSWORD` are all present and non-empty after checking for whitespace-only values; if any are missing or blank, throw a clear error listing ONLY the missing key names (never print secret values) and exit with status code `1` during bootstrap. Validate `PORT` is a valid integer between `1` and `65535` (defaulting to `3000`), and `NODE_ENV` defaults to `development`. Export a pure `loadConfig(envSource = process.env)` helper so unit tests can test validation cleanly without mutating global `process.env`.
- **Acceptance Criteria:**
  - [ ] Service refuses to start (`exit 1`) when `SECRET_MESSAGE`, `USERNAME`, or `PASSWORD` is missing or whitespace-only.
  - [ ] Error output names missing keys but never logs actual values.
  - [ ] Container runtime env vars take precedence over any local `.env` file.
  - [ ] `tests/config.test.js` covers valid config, defaults, invalid `PORT`, and missing variables.

---

### Ticket T-103: HTTP Basic Auth Middleware (`src/middleware/basicAuth.js`)
- **Phase:** Phase 1
- **Priority:** Must-Have for Launch
- **Dependencies:** T-102
- **Task Description (AI Prompt):**
  > Create `src/middleware/basicAuth.js` exporting a factory `createBasicAuthMiddleware({ username, password })` implementing HTTP Basic Authentication per RFC 7617 and `docs/03-security-and-access.md`. When `Authorization` header is missing, does not start with `Basic `, contains invalid Base64, or lacks a `:` separator, respond with `401 Unauthorized`, header `WWW-Authenticate: Basic realm="Secret Area"`, and a clear error message. Decode Base64 credentials safely and split ONLY on the first `:` (`indexOf(':')`) so passwords containing colons work correctly. Compare submitted username and password against configured credentials using SHA-256 digests and `crypto.timingSafeEqual` to prevent timing side-channel leaks. Never log headers or credential values. Return identical generic error messages whether username or password was wrong.
- **Acceptance Criteria:**
  - [ ] Missing `Authorization` header returns `401` with `WWW-Authenticate: Basic realm="Secret Area"`.
  - [ ] Valid credentials call `next()`.
  - [ ] Passwords containing `:` (e.g., `a:b:c`) authenticate properly.
  - [ ] Wrong username, wrong password, empty credentials, and malformed Base64 all return `401` safely without crashing.
  - [ ] `tests/basicAuth.test.js` passes 100% of edge cases.

---

### Ticket T-104: Express App, Routes (`/`, `/secret`, `/health`) & Error Handlers
- **Phase:** Phase 1
- **Priority:** Must-Have for Launch
- **Dependencies:** T-102, T-103
- **Task Description (AI Prompt):**
  > Build `src/app.js`, `src/routes/index.js`, `src/routes/secret.js`, `src/middleware/errorHandler.js`, and `src/index.js` per `docs/02-technical-architecture.md` and `docs/04-frontend-specification.md`. Implement:
  > 1. `GET /` returning HTTP `200 OK`, `Content-Type: text/plain; charset=utf-8`, body `Hello, world!`.
  > 2. `GET /health` returning HTTP `200 OK`, JSON `{ status: "ok", uptime: process.uptime(), timestamp }`.
  > 3. `GET /secret` protected by `basicAuth` middleware, returning HTTP `200 OK` with `SECRET_MESSAGE` (`text/plain` by default for CLI/API clients, or styled HTML if `Accept` prefers `text/html` once T-405 is enabled).
  > 4. `404` catch-all middleware and global `500` error handler that hides stack traces when `NODE_ENV === "production"`.
  > 5. `src/index.js` that calls `loadConfig()`, creates the Express app, listens on `0.0.0.0:${config.port}`, and handles `SIGTERM` / `SIGINT` gracefully.
  > Add `tests/routes.test.js` testing all routes end-to-end with `supertest`.
- **Acceptance Criteria:**
  - [ ] `GET /` returns exact body `Hello, world!` with status `200`.
  - [ ] `GET /secret` without credentials returns `401` + `WWW-Authenticate` header.
  - [ ] `GET /secret` with invalid credentials returns `401` + error message.
  - [ ] `GET /secret` with valid credentials returns `200` + `SECRET_MESSAGE`.
  - [ ] `GET /health` returns `200` JSON without exposing secrets.
  - [ ] Unknown route returns `404`; `npm test` passes completely.

---

## Phase 2: Dockerization & Secret Isolation

### Ticket T-201: Create Production `Dockerfile` & `.dockerignore`
- **Phase:** Phase 2
- **Priority:** Must-Have for Launch
- **Dependencies:** T-104
- **Task Description (AI Prompt):**
  > Create `.dockerignore` and `Dockerfile` per `docs/02-technical-architecture.md` and `docs/03-security-and-access.md`. In `.dockerignore`, exclude `.env`, `.env.*` (keep `.env.example` optional or exclude all `.env*`), `.git`, `.github`, `node_modules`, `docs`, `tests`, `infra`, `*.md`, and `*.log` so no secrets ever enter the Docker build context. In `Dockerfile`, use `node:22-alpine`, set `WORKDIR /app`, `ENV NODE_ENV=production`, copy `package*.json` first and run `npm ci --omit=dev` (with clean npm cache) for optimal layer caching, copy `src/`, change ownership and switch to the non-root `USER node`, `EXPOSE 3000`, add a native `HEALTHCHECK` calling `http://127.0.0.1:3000/health` (using Node's built-in `fetch` so no extra `curl` package is needed), and set `CMD ["node", "src/index.js"]`. Do NOT copy `.env` or set secret `ENV` values in `Dockerfile`.
- **Acceptance Criteria:**
  - [ ] `docker build -t dockerized-service:local .` builds cleanly without errors.
  - [ ] `Dockerfile` runs as non-root `node` user.
  - [ ] `.dockerignore` explicitly excludes `.env` and `.env.*`.
  - [ ] `docker history` shows zero `SECRET_MESSAGE`, `USERNAME`, or `PASSWORD` values.

---

### Ticket T-202: Local Docker Verification & `.env` Leak Audit
- **Phase:** Phase 2
- **Priority:** Must-Have for Launch
- **Dependencies:** T-201
- **Task Description (AI Prompt):**
  > Verify the Docker image locally and document the exact verification steps (or a cross-platform verification script if helpful). Run the container locally using `docker run --rm -p 3000:3000 --env-file .env dockerized-service:local` and test `/`, `/health`, and `/secret` (both unauthenticated, wrong credentials, and valid credentials). Also verify container isolation by running `docker run --rm --entrypoint sh dockerized-service:local -c "ls -la /app && id"` to prove `.env` does not exist inside the image and UID is non-root `1000` (`node`). Confirm running the container *without* `--env-file` fails fast with exit code `1` and lists only missing key names.
- **Acceptance Criteria:**
  - [ ] `ls -la /app` inside the container confirms `.env` is completely absent.
  - [ ] `id` inside the container confirms non-root user (`uid=1000(node)`).
  - [ ] Running with `--env-file .env` serves `/` (`Hello, world!`) and `/secret` accurately on `localhost:3000`.
  - [ ] Running without env vars exits cleanly with code `1` and no secret leaks.

---

## Phase 3: Remote Linux Server Setup

### Ticket T-301: Provision Remote Ubuntu Linux VM & Harden SSH Access
- **Phase:** Phase 3
- **Priority:** Must-Have for Launch
- **Dependencies:** T-202 (Docker image verified locally)
- **Task Description (AI Prompt):**
  > Create an operator runbook and idempotent bootstrap script `infra/server-setup.sh` for setting up an Ubuntu `24.04 LTS` server (DigitalOcean Droplet or AWS EC2) per `docs/02-technical-architecture.md` and `docs/03-security-and-access.md`. The script/guide should: (1) create a dedicated non-root `deploy` user, (2) configure SSH public key authentication for `deploy`, (3) disable root SSH login (`PermitRootLogin no`) and password authentication (`PasswordAuthentication no`), (4) install Docker Engine from official apt repositories and add `deploy` to the `docker` group, and (5) enable `ufw` firewall allowing only OpenSSH (`22`), HTTP (`80`), HTTPS (`443`), and optionally `3000` (if testing without a reverse proxy initially). Ensure all steps avoid embedding any private keys or secrets.
- **Acceptance Criteria:**
  - [ ] `infra/server-setup.sh` passes `bash -n` syntax validation and uses LF line endings.
  - [ ] SSH login works via Ed25519 key as `deploy` user; password login and root SSH login are disabled.
  - [ ] `docker --version` and `docker run --rm hello-world` work as the `deploy` user without `sudo`.
  - [ ] `ufw status` shows active firewall with minimal required ports.

---

### Ticket T-302: Reverse Proxy & Automatic HTTPS Setup (`infra/Caddyfile`)
- **Phase:** Phase 3
- **Priority:** Should-Have (Recommended for Basic Auth security over internet)
- **Dependencies:** T-301
- **Task Description (AI Prompt):**
  > Create `infra/Caddyfile` and setup instructions so Caddy 2.x acts as a reverse proxy in front of the Docker container (`127.0.0.1:3000`). When paired with a domain name (or nip.io/sslip.io test domain), Caddy automatically issues and renews TLS certificates via Let's Encrypt so HTTP Basic Auth credentials sent to `/secret` are encrypted in transit. Document both domain-backed HTTPS mode and raw-IP HTTP fallback mode (`:80 -> 127.0.0.1:3000`) in `infra/README.md`.
- **Acceptance Criteria:**
  - [ ] `infra/Caddyfile` cleanly proxies `/` and `/secret` to `127.0.0.1:3000` while preserving `Authorization` and `WWW-Authenticate` headers.
  - [ ] Service responds over HTTPS (with domain) or HTTP port `80` (IP fallback) with `3000` unbound from public interfaces.

---

### Ticket T-303: Infrastructure-as-Code Provisioning (Terraform / Ansible)
- **Phase:** Phase 3
- **Priority:** Nice-to-Have
- **Dependencies:** T-301
- **Task Description (AI Prompt):**
  > Create optional Terraform (`infra/terraform/`) and/or Ansible (`infra/ansible/`) templates to declaratively provision the Linux droplet/EC2 instance, configure firewall rules, install Docker Engine, and prepare the `deploy` user automatically rather than running `infra/server-setup.sh` manually. Use variables (`var.ssh_public_key`) and never commit `.tfvars` secrets or `*.tfstate` files (add them to `.gitignore`).
- **Acceptance Criteria:**
  - [ ] `terraform validate` (or `ansible-lint`) succeeds without syntax errors.
  - [ ] `.gitignore` excludes `*.tfstate`, `*.tfstate.*`, and `*.tfvars`.

---

## Phase 4: GitHub Actions CI/CD & Secrets Management

### Ticket T-401: Configure GitHub Repository Secrets & Registry Permissions
- **Phase:** Phase 4
- **Priority:** Must-Have for Launch
- **Dependencies:** T-301
- **Task Description (AI Prompt):**
  > Document the exact GitHub Repository Secrets checklist (in `docs/` or `infra/README.md`) needed before enabling the workflow: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_PORT`, `SECRET_MESSAGE`, `APP_USERNAME`, `APP_PASSWORD`, and optional `GHCR_READ_TOKEN`. Verify repository Actions settings allow workflow read/write package permissions for `ghcr.io` via `GITHUB_TOKEN`. Ensure no secret values appear anywhere in repo files.
- **Acceptance Criteria:**
  - [ ] All required GitHub Repository Secrets are configured in GitHub Settings -> Secrets and variables -> Actions.
  - [ ] Separate non-dev production `SECRET_MESSAGE`, `APP_USERNAME`, and `APP_PASSWORD` are stored safely in GitHub Secrets.

---

### Ticket T-402: CI Pipeline — Test, Build & Push to `ghcr.io` (`.github/workflows/deploy.yml`)
- **Phase:** Phase 4
- **Priority:** Must-Have for Launch
- **Dependencies:** T-201, T-401
- **Task Description (AI Prompt):**
  > Create the first two jobs (`test` and `build-and-push`) in `.github/workflows/deploy.yml` triggering on `push` to `main` and `workflow_dispatch`.
  > - Job 1 (`test`): Checkout repo, setup Node.js 22, run `npm ci`, `npm run lint`, and `npm test`.
  > - Job 2 (`build-and-push`, `needs: test`): Set minimal permissions (`contents: read`, `packages: write`), log in to `ghcr.io` with `docker/login-action@v3` using `${{ secrets.GITHUB_TOKEN }}`, set up Docker Buildx, build the image from `.` (guaranteed `.env`-free), and push tags `ghcr.io/${{ github.repository }}:sha-${{ github.sha }}` (or short SHA) and `:latest` using `docker/build-push-action@v6` with GitHub Actions layer cache (`type=gha`).
- **Acceptance Criteria:**
  - [ ] Pushing broken code fails `test` and prevents image build/push.
  - [ ] Pushing valid code builds and pushes tagged image to `ghcr.io` cleanly.
  - [ ] Workflow logs contain zero leaked secrets.

---

### Ticket T-403: CD Pipeline — Automated SSH Deploy & Secrets Injection
- **Phase:** Phase 4
- **Priority:** Must-Have for Launch
- **Dependencies:** T-301, T-402
- **Task Description (AI Prompt):**
  > Add Job 3 (`deploy`, `needs: build-and-push`) to `.github/workflows/deploy.yml` to deploy the freshly pushed image onto the remote Linux server via SSH (`appleboy/ssh-action@v1` or `openssh-client`). Pass `SECRET_MESSAGE`, `APP_USERNAME`, `APP_PASSWORD`, and `IMAGE_TAG` safely as env variables to the remote SSH session without echoing any secret values in logs (`set +x`). On the server: log in to `ghcr.io` if needed, `docker pull` the exact SHA-tagged image, write a `0600` runtime env file (`PORT=3000`, `NODE_ENV=production`, `SECRET_MESSAGE`, `USERNAME`, `PASSWORD`), stop and remove any existing `dockerized-service` container, start the new container with `--restart unless-stopped` and `--env-file`, wait/poll `http://127.0.0.1:3000/health` for `200 OK` (fail job if unhealthy within 15s), and run `docker image prune -f`.
- **Acceptance Criteria:**
  - [ ] Push to `main` automatically deploys the updated container to the remote Linux server with zero manual SSH steps.
  - [ ] Running container on server receives `SECRET_MESSAGE`, `USERNAME`, and `PASSWORD` at runtime via `0600` env file or runtime `-e` flags, never inside the image.
  - [ ] Workflow fails visibly if `/health` does not return `200 OK` after restart.

---

### Ticket T-404: Post-Deploy End-to-End Smoke Verification
- **Phase:** Phase 4
- **Priority:** Should-Have
- **Dependencies:** T-403
- **Task Description (AI Prompt):**
  > Add a final `verify` step (or job) in `.github/workflows/deploy.yml` running from the GitHub runner against the live public endpoint (`http(s)://${{ secrets.SSH_HOST }}...`) to assert: (1) `GET /` returns `200` with `Hello, world!`, (2) `GET /secret` without credentials returns `401`, (3) `GET /secret` with wrong credentials returns `401`, and (4) `GET /secret` with `${{ secrets.APP_USERNAME }}` and `${{ secrets.APP_PASSWORD }}` returns `200` (check status/match silently without printing `SECRET_MESSAGE` into public CI logs!).
- **Acceptance Criteria:**
  - [ ] Live remote endpoints pass all 4 smoke assertions automatically at the end of every deploy.
  - [ ] `SECRET_MESSAGE`, `APP_USERNAME`, and `APP_PASSWORD` never appear in CI output logs.

---

### Ticket T-405: Browser HTML Views (`src/views/templates.js`)
- **Phase:** Phase 4 (Polish)
- **Priority:** Nice-to-Have
- **Dependencies:** T-104
- **Task Description (AI Prompt):**
  > Implement `src/views/templates.js` conforming strictly to the Design System in `docs/04-frontend-specification.md` (colors `#0F172A` canvas, `#1E293B` card, `#0B1120` inset, `#3B82F6` primary, `#10B981` success, `#EF4444` error; Inter/system sans + monospace fonts; 12px card radius, accessible contrast and `role="alert"`). Use Express content negotiation (`req.accepts(['text', 'html'])` or explicit `Accept: text/html` detection) on `/secret` and error handlers (`401`, `404`, `500`) so web browsers get clean dark-mode cards while `curl` and API clients continue receiving exact plain text (`SECRET_MESSAGE` / error messages). Keep `GET /` strictly returning `Hello, world!` (`text/plain`). Update `tests/routes.test.js` to verify both `Accept: */*` (`text/plain`) and `Accept: text/html` responses.
- **Acceptance Criteria:**
  - [ ] Visiting `/secret` in a browser prompts via Basic Auth and renders the styled Secret Reveal Card containing `SECRET_MESSAGE`.
  - [ ] Canceling or entering wrong credentials in a browser renders the styled `401` Error Card with a clear error message and "Try Again" action.
  - [ ] `curl` requests continue receiving clean plain text without HTML tags.

---

## Phase 5: Hardening & Operational Resilience

### Ticket T-501: IP Rate Limiting on `/secret`
- **Phase:** Phase 5
- **Priority:** Nice-to-Have
- **Dependencies:** T-104
- **Task Description (AI Prompt):**
  > Add lightweight rate limiting (e.g., `express-rate-limit` or a clean in-memory sliding-window middleware) on `/secret` allowing up to 20 requests per 15 minutes per IP (respecting `app.set('trust proxy', 1)` when behind Caddy/Nginx), returning `429 Too Many Requests` with `Retry-After` header upon excess failed/repeated attempts. Add unit tests verifying normal access passes and burst abuse is throttled.
- **Acceptance Criteria:**
  - [ ] Repeated brute-force requests to `/secret` trigger `429 Too Many Requests`.
  - [ ] Normal usage and `GET /` / `GET /health` remain unaffected.
