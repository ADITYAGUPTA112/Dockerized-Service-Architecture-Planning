#!/usr/bin/env bash
set -euo pipefail

# Idempotent Ubuntu 24.04 LTS bootstrap script for the Dockerized Node.js service.
# Run as root (or via sudo) on a freshly provisioned DigitalOcean Droplet / AWS EC2 VM.
#
# Optional environment overrides:
#   DEPLOY_USER="deploy"
#   DEPLOY_SSH_PUBLIC_KEY="ssh-ed25519 AAAA..."
#   ALLOW_DIRECT_PORT_3000="false"

if [[ "${EUID}" -ne 0 ]]; then
  echo "ERROR: Run this script as root or with sudo." >&2
  exit 1
fi

DEPLOY_USER="${DEPLOY_USER:-deploy}"
ALLOW_DIRECT_PORT_3000="${ALLOW_DIRECT_PORT_3000:-false}"

echo "==> [1/5] Updating apt packages and installing prerequisites..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw

echo "==> [2/5] Installing Docker Engine from official repository..."
install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

# shellcheck disable=SC1091
source /etc/os-release
ARCH="$(dpkg --print-architecture)"
REPO_LINE="deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable"
echo "${REPO_LINE}" > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

echo "==> [3/5] Creating non-root deploy user '${DEPLOY_USER}' and configuring SSH keys..."
if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"

DEPLOY_HOME="$(getent passwd "${DEPLOY_USER}" | cut -d: -f6)"
SSH_DIR="${DEPLOY_HOME}/.ssh"
AUTH_KEYS="${SSH_DIR}/authorized_keys"

install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${SSH_DIR}"
touch "${AUTH_KEYS}"
chmod 600 "${AUTH_KEYS}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${AUTH_KEYS}"

if [[ -n "${DEPLOY_SSH_PUBLIC_KEY:-}" ]]; then
  if ! grep -qxF "${DEPLOY_SSH_PUBLIC_KEY}" "${AUTH_KEYS}"; then
    echo "${DEPLOY_SSH_PUBLIC_KEY}" >> "${AUTH_KEYS}"
  fi
elif [[ ! -s "${AUTH_KEYS}" && -s /root/.ssh/authorized_keys ]]; then
  cp /root/.ssh/authorized_keys "${AUTH_KEYS}"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${AUTH_KEYS}"
  chmod 600 "${AUTH_KEYS}"
fi

# Prepare runtime app directory for CI/CD env injection (0600 file owned by deploy)
install -d -m 750 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${DEPLOY_HOME}/app"

echo "==> [4/5] Hardening SSH configuration..."
if [[ ! -s "${AUTH_KEYS}" ]]; then
  echo "WARNING: ${AUTH_KEYS} is empty! Skipping SSH password/root lock to prevent lockout." >&2
  echo "         Add your public key to ${AUTH_KEYS}, then re-run this script." >&2
else
  cat <<'EOF' > /etc/ssh/sshd_config.d/99-hardening.conf
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
X11Forwarding no
EOF

  sshd -t
  systemctl reload ssh || systemctl reload sshd
fi

echo "==> [5/5] Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp

if [[ "${ALLOW_DIRECT_PORT_3000}" == "true" ]]; then
  ufw allow 3000/tcp
fi

ufw --force enable
ufw status verbose

echo "==> Server setup complete. Test SSH access as '${DEPLOY_USER}' before closing this root session."
