# Phase 4 — GitHub Actions CI/CD & Secrets Checklist

Before pushing to `main` to trigger [`.github/workflows/deploy.yml`](./workflows/deploy.yml), complete this checklist in your GitHub repository:

---

## 1. Repository Secrets (`Settings -> Secrets and variables -> Actions -> Secrets`)

| Secret Name | Required | Description |
| :--- | :--- | :--- |
| `SSH_HOST` | **Yes** | Public IP or domain of the remote Linux server |
| `SSH_USER` | **Yes** | Non-root deploy user (`deploy` from Phase 3) |
| `SSH_PRIVATE_KEY` | **Yes** | Private Ed25519 SSH key matching `~/.ssh/authorized_keys` on the server |
| `SSH_PORT` | Optional | SSH TCP port (defaults to `22` if omitted) |
| `SECRET_MESSAGE` | **Yes** | Production secret string served by `/secret` |
| `APP_USERNAME` | **Yes** | Production HTTP Basic Auth username |
| `APP_PASSWORD` | **Yes** | Production HTTP Basic Auth password |
| `GHCR_READ_TOKEN` | Optional | Read-only GitHub PAT (`read:packages`) if your GHCR package is kept private |

---

## 2. Optional Repository Variables (`Settings -> Secrets and variables -> Actions -> Variables`)

| Variable Name | Default | When to Change |
| :--- | :--- | :--- |
| `CONTAINER_PORT_BINDING` | `127.0.0.1:3000:3000` | Change to `3000:3000` **only** if testing direct port `3000` without Caddy/Nginx |
| `PUBLIC_URL` | `http://<SSH_HOST>` | Set to `https://your-domain.com` (or `http://<SSH_HOST>:3000` if no Caddy) so the `verify` job probes the exact live URL |

---

## 3. Workflow Permissions (`Settings -> Actions -> General`)

1. Ensure **Read and write permissions** is enabled (or rely on the explicit `packages: write` permission in `deploy.yml`).
2. After the first push to `main`, check **Packages** on your GitHub profile/repo: if private and `GHCR_READ_TOKEN` is unset, either change package visibility to public or add `GHCR_READ_TOKEN` (`read:packages` scope).
