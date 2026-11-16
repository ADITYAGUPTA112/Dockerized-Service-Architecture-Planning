# Phase 3 — Remote Linux Server Setup Runbook

This directory contains everything needed to provision and harden an **Ubuntu 24.04 LTS** remote Linux server (DigitalOcean Droplet, AWS EC2, Hetzner, etc.) for running the Dockerized Node.js service.

---

## Option 1: Automated Bootstrap Script (Recommended)

### 1. Generate a Dedicated SSH Key Pair (Local Machine)
Run locally (never commit the private key):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/kgas_deploy_ed25519
```

- **Public key (`~/.ssh/kgas_deploy_ed25519.pub`)**: Added to the cloud VM during creation (or passed via `DEPLOY_SSH_PUBLIC_KEY`).
- **Private key (`~/.ssh/kgas_deploy_ed25519`)**: Stored later in GitHub Secret `SSH_PRIVATE_KEY` (Phase 4).

### 2. Provision the Ubuntu 24.04 LTS Server
Create a small VM (e.g., DigitalOcean 1 GB Droplet or AWS EC2 `t3.micro`) with Ubuntu 24.04 LTS and attach your SSH public key.

### 3. Run [`server-setup.sh`](./server-setup.sh) on the Server
Copy [`server-setup.sh`](./server-setup.sh) to the server and run it as root:

```bash
scp infra/server-setup.sh root@<SERVER_IP>:/root/server-setup.sh
ssh root@<SERVER_IP> "chmod +x /root/server-setup.sh && /root/server-setup.sh"
```

*Optional flags:*
- If you want to test directly on `http://<SERVER_IP>:3000` before configuring Caddy on port `80`/`443`:
  ```bash
  ssh root@<SERVER_IP> "ALLOW_DIRECT_PORT_3000=true /root/server-setup.sh"
  ```

### 4. Verify Non-Root `deploy` Access & Docker
Open a **new terminal** (keep your root session open until verified!):

```bash
ssh -i ~/.ssh/kgas_deploy_ed25519 deploy@<SERVER_IP>
docker --version
docker run --rm hello-world
sudo ufw status
```

---

## Option 2: Reverse Proxy & Automatic HTTPS with Caddy (`T-302`)

Because HTTP Basic Auth encodes credentials in Base64 rather than encrypting them, terminating TLS in front of port `3000` is strongly recommended.

1. Install Caddy on Ubuntu 24.04:
   ```bash
   sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt-get update && sudo apt-get install -y caddy
   ```
2. Copy [`Caddyfile`](./Caddyfile) to `/etc/caddy/Caddyfile` and set your domain (or `<SERVER_IP>.sslip.io` for automatic HTTPS, or `:80` for plain HTTP IP access).
3. Reload Caddy:
   ```bash
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl enable --now caddy
   sudo systemctl reload caddy
   ```
4. When Caddy is active, bind the Docker container only to localhost (`-p 127.0.0.1:3000:3000`) and keep port `3000` closed in UFW.

---

## Option 3: Infrastructure-as-Code (`T-303` — Optional)

- **Terraform (`infra/terraform/`):** Provisions a DigitalOcean Droplet + Cloud Firewall using your public SSH key. Copy `terraform.tfvars.example` to `terraform.tfvars` (git-ignored) and run `terraform init && terraform apply`.
- **Ansible (`infra/ansible/`):** Configures an existing Ubuntu host identically to `server-setup.sh`. Copy `inventory.ini.example` to `inventory.ini` (git-ignored) and run `ansible-playbook -i inventory.ini playbook.yml`.

---

## Phase 4 Pre-Flight Checklist (GitHub Repository Secrets)

Once the server is ready, prepare these values for Phase 4 GitHub Actions setup:

| Secret Name | Value |
| :--- | :--- |
| `SSH_HOST` | Server public IP or domain |
| `SSH_USER` | `deploy` |
| `SSH_PORT` | `22` |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/kgas_deploy_ed25519` |
| `SECRET_MESSAGE` | Production secret string for `/secret` |
| `APP_USERNAME` | Production Basic Auth username |
| `APP_PASSWORD` | Production Basic Auth password |
