# 03 — Security & Access Document

**Project:** Dockerized Service (Node.js + Docker + Remote Linux + GitHub Actions CI/CD)
**Version:** 1.0
**Audience:** Written in clear, plain English for both founders/learners and engineers reviewing security before launch.

---

## 1. Authentication Method

### Primary App Authentication: HTTP Basic Auth (on `/secret`)
- **How it works:** When someone visits `/secret`, the server checks for an `Authorization` header formatted as `Basic <base64(username:password)>`.
  - If missing or incorrect, the server replies with status `401 Unauthorized` and header `WWW-Authenticate: Basic realm="Secret Area"`.
  - Any standard web browser sees that header and automatically opens a built-in Username + Password popup box.
  - CLI tools like `curl` can pass credentials directly via `curl -u username:password https://.../secret`.
- **Why this fits V1:**
  - Directly fulfills the project requirement ("prompted for the username and password... return `SECRET_MESSAGE`").
  - Requires zero database, zero user registration UI, and zero session cookies.

### Critical Security Rules Around HTTP Basic Auth
1. **Use HTTPS in production (Phase 3/5):** Basic Auth only *encodes* `username:password` in Base64 (anyone sniffing plain HTTP traffic can decode it). Putting Caddy or Nginx with TLS (`https://`) in front of the container encrypts the credentials in transit.
2. **Constant-time password comparison:** Never compare `inputPassword === process.env.PASSWORD` with normal `===`, which leaks character-by-character timing hints. Always compare SHA-256 hashes (or equal-length byte buffers) using Node's `crypto.timingSafeEqual`.
3. **Never log credentials:** Middleware must never `console.log(req.headers.authorization)` or log failed passwords.

### Operational Authentication (Phases 3 & 4)
- **GitHub Container Registry (`ghcr.io`):** Authenticated inside GitHub Actions using the automatic, short-lived `GITHUB_TOKEN` (scoped strictly to `packages: write` for that single workflow run).
- **Remote Linux Server (SSH):** Key-based SSH authentication ONLY (`Ed25519` key pair). Password-based SSH login (`PasswordAuthentication no`) and root SSH login (`PermitRootLogin no`) are disabled on the Linux server.

---

## 2. User Roles & Permissions Matrix

Even a small service has distinct human and machine actors. Below is exactly what each actor can see, do, and what is blocked:

| Role | Who They Are | What They Can See | What They Can Do | What Is Blocked |
| :--- | :--- | :--- | :--- | :--- |
| **Public Visitor** | Anyone on the internet without credentials | `GET /` (`Hello, world!`), `GET /health` (`{"status":"ok"}`), `401` / `404` error messages | Request public routes; trigger the login prompt on `/secret` | Reading `SECRET_MESSAGE`; seeing stack traces or internal server details; pushing images or SSHing into server |
| **Authenticated Secret Viewer** | Someone who enters valid `USERNAME` and `PASSWORD` | Everything Public Visitor sees **plus** `SECRET_MESSAGE` on `GET /secret` | View/retrieve the secret message | Modifying `SECRET_MESSAGE`; accessing host OS, container shell, or other environment variables |
| **CI/CD Runner (`github-actions`)** | Automated GitHub Actions workflow | Public repo code + encrypted GitHub Secrets in memory only (masked in logs) | Run tests; push Docker images to `ghcr.io`; run restricted deploy command via SSH | Reading server files outside deploy scope; printing raw secrets to workflow logs |
| **Deploy Operator / Maintainer** | You (the project owner) | Repo settings, GitHub Secrets dashboard (write-only once saved), server logs, container config | Update secrets in GitHub; SSH into Linux server using private key; rotate keys; trigger/rollback deploys | Committing `.env` to Git; baking `.env` into Docker images (blocked by `.gitignore`, `.dockerignore`, and CI checks) |

---

## 3. Row-Level Security (RLS) & Multi-Layer Isolation Rules

### Does Traditional Database RLS Apply to V1?
In apps using PostgreSQL or Supabase, **Row-Level Security (RLS)** ensures User A can only read User A's rows and never User B's rows.
Because **V1 has no database** (there are no user tables or multi-tenant records), traditional SQL RLS does not run in V1. Instead, we enforce **five strict isolation boundaries** that achieve the same principle — *nothing can read data outside what it is explicitly allowed to see*:

1. **Route-Level Isolation (App Layer):**
   - `GET /` and `GET /health` are public and never read `SECRET_MESSAGE`, `USERNAME`, or `PASSWORD` into any response.
   - `GET /secret` unlocks `SECRET_MESSAGE` **only** after `basicAuth` confirms exact match on both `USERNAME` and `PASSWORD`.
2. **Source-Control Isolation (Git Layer):**
   - `.gitignore` blocks `.env` and `.env.*` (except `.env.example`) so secrets never enter commits or pull requests.
3. **Container Image Isolation (Docker Layer):**
   - `.dockerignore` blocks `.env`, `.env.*`, `.git`, SSH keys, and `docs/` from even reaching the Docker build daemon.
   - The container runs as unprivileged user `node` (UID `1000`), not `root`, limiting blast radius if the Node.js process is ever compromised.
4. **Host & Network Isolation (Linux Server Layer):**
   - UFW firewall blocks all incoming ports except `22` (SSH), `80`/`443` (HTTPS reverse proxy), or `3000` (only if running without proxy).
   - If using a reverse proxy (Caddy/Nginx), Docker binds the Node container exclusively to `127.0.0.1:3000:3000` so external traffic cannot bypass HTTPS.
5. **CI/CD Secret Isolation (GitHub Layer):**
   - GitHub Actions secrets are stored encrypted and masked (`***`) in build logs.
   - Workflow permissions follow least privilege (`contents: read`, `packages: write`).

### Future V2 Database RLS Blueprint (If Supabase/Postgres Is Added Later)
If V2 adds user-owned secrets in PostgreSQL/Supabase:
- Enable RLS on `secrets` table (`ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;`).
- `SELECT / INSERT / UPDATE / DELETE` policies: `auth.uid() = owner_user_id` — a signed-in user can only read, create, edit, or delete their own secret rows.

---

## 4. Error Handling Guide (Every Major Failure Point)

The app and pipeline must never crash silently or leak internal secrets when something goes wrong:

| Failure Scenario | Phase | HTTP / Exit Result | User-Facing / Operator Message | Internal Safeguard |
| :--- | :--- | :--- | :--- | :--- |
| **Missing required env vars at startup** (`USERNAME`, `PASSWORD`, or `SECRET_MESSAGE`) | Phase 1 / 2 | Process exits (`exit 1`) | Log: `FATAL: Missing required environment variable(s): [KEY_NAMES]. Check .env or container runtime flags.` | Never prints actual values of any env var; refuses to boot in an insecure open state. |
| **Visiting `/secret` with no `Authorization` header** | Phase 1 | `401 Unauthorized` + `WWW-Authenticate: Basic realm="Secret Area"` | `Authentication required. Please provide a valid username and password.` | Triggers native browser login popup; does not expose `SECRET_MESSAGE`. |
| **Wrong username or password on `/secret`** | Phase 1 | `401 Unauthorized` + `WWW-Authenticate: Basic realm="Secret Area"` | `Unauthorized: Invalid username or password.` | Uses identical error message whether username or password was wrong (prevents username guessing). |
| **Malformed Basic Auth header** (corrupt Base64 or missing `:`) | Phase 1 | `401 Unauthorized` | `Unauthorized: Invalid authentication format.` | Wrapped in safe parser; invalid Base64 never throws an unhandled exception. |
| **Requesting unknown URL** (e.g., `/admin`, `/foo`) | Phase 1 | `404 Not Found` | `Not Found: The requested route does not exist.` | Clean JSON/HTML/text `404` without exposing framework internals. |
| **Unexpected server exception** | Phase 1 | `500 Internal Server Error` | `Internal Server Error: Something went wrong. Please try again later.` | Full error logged server-side (redacting headers); stack trace hidden when `NODE_ENV=production`. |
| **`.env` accidentally present in Docker build context** | Phase 2 | Local/CI audit fails | Audit check fails build if `.env` appears inside container filesystem. | `.dockerignore` prevents copying; Phase 2 verification ticket inspects container filesystem. |
| **GitHub Actions fails tests** | Phase 4 | Workflow stops at `test` job | GitHub marks commit red; clearly shows failing test name. | `build` and `deploy` jobs **do not run** (`needs: test`), protecting live server from broken code. |
| **Container Registry login/push fails** | Phase 4 | Workflow stops at `build-and-push` job | Clear registry auth error in Actions log. | Live container on server remains untouched and online. |
| **SSH connection fails or new container fails `/health` check** | Phase 4 | Workflow fails `deploy` job | Clear SSH/healthcheck failure message in Actions log. | Keep backup container tag or roll back to previous image tag if new container fails health check. |

---

## 5. Pre-Launch Edge Cases Checklist

Every item below must be accounted for before calling the project complete:

1. **Empty or whitespace-only credentials in `.env`:**
   - What if `USERNAME=""` or `PASSWORD="   "`? Startup validation rejects empty/whitespace-only `USERNAME`, `PASSWORD`, and `SECRET_MESSAGE` so `/secret` can never be accessed with blank credentials.
2. **Passwords containing colons (`:`):**
   - HTTP Basic Auth joins credentials as `username:password`. If a user's password is `my:pass:word`, naive `.split(':')` cuts off `:pass:word`! The parser **must** split only on the *first* `:` (`indexOf(':')`).
3. **Browser "Cancel" on the Basic Auth dialog:**
   - When a visitor clicks Cancel on the browser popup, the browser renders whatever body came with the `401` response. Serving a clean `401` message (HTML for browsers, plain text for `curl`) ensures they don't stare at a blank white screen.
4. **Browser caching of Basic Auth credentials:**
   - Browsers remember Basic Auth credentials for the current browser session until the tab/browser closes. Document this expected browser behavior clearly for testing (use an Incognito window or `curl` to re-test wrong credentials).
5. **Accessing forbidden/hidden files via URL:**
   - Ensure no static file middleware exposes the project root (`.env`, `package.json`, `src/`) over HTTP! Express serves *only* explicit route handlers (`/`, `/secret`, `/health`).
6. **Port collision during CI/CD container swap:**
   - If the old container is still holding port `3000`, `docker run` for the new container will crash with `port is already allocated`. Deploy script must explicitly stop and remove the old container (`docker stop ... && docker rm ...`) — or use a blue/green port swap behind a reverse proxy — before starting the new container.
7. **Slow connections & healthcheck race conditions:**
   - Don't run the post-deploy `curl` check 1 millisecond after `docker run`; wait/retry up to 15 seconds for `/health` to return `200 OK` before failing or finishing the workflow.
8. **Windows CRLF (`\r\n`) line endings on `.env` or scripts:**
   - Since this repo lives on Windows (`c:\KGAS PROJECT`), trailing `\r` characters in shell scripts or `.env` files can break Linux containers. Enforce LF (`\n`) via `.gitattributes` and trim whitespace safely only where appropriate (never accidentally alter valid passwords unless handling `\r` artifacting).
9. **Brute-force guessing on `/secret`:**
   - Optional Phase 5 / Should-Have protection: add lightweight IP rate limiting (e.g., max 20 failed auth attempts per 15 minutes per IP) returning `429 Too Many Requests` with `Retry-After` header.
