#!/usr/bin/env bash
# DigitalOcean droplet User Data (cloud-config style shell) for VibeCodeWorker.
# Use with the cheapest $6/mo Basic droplet (1 vCPU / 1 GB RAM / Ubuntu 24.04).
# Paste into "User data" at droplet create time, or run manually over SSH.
#
# What it does:
#   1. Installs Docker + compose plugin + git + ufw firewall.
#   2. Clones the repo to /opt/vibecodeworker/repo.
#   3. Generates VIBE_API_TOKEN + writes /opt/vibecodeworker/.env.
#   4. Builds + starts the cloud compose stack.
#
# After boot:  ssh root@<droplet-ip> 'cat /opt/vibecodeworker/.env'  to get the token.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/mattyjacks/4weird.git}"
BASE=/opt/vibecodeworker

# --- Docker ---
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg git ufw openssl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin git ufw openssl
  systemctl enable --now docker
fi

# --- Firewall: SSH + VibeCodeWorker API only ---
ufw --force reset >/dev/null 2>&1 || true
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 42069/tcp
ufw --force enable

# --- Repo ---
mkdir -p "$BASE"
if [ ! -d "$BASE/repo/.git" ]; then
  git clone --depth 1 "$REPO_URL" "$BASE/repo"
else
  git -C "$BASE/repo" pull --ff-only || true
fi
cp "$BASE/repo/website/v1/ai/vibecodeworker/deploy/docker-compose.cloud.yml" "$BASE/docker-compose.yml"

# --- Secrets (generated once, never overwritten) ---
if [ ! -f "$BASE/.env" ]; then
  cat > "$BASE/.env" <<EOF
# Generated $(date -u +%FT%TZ) — keep secret!
VIBE_API_TOKEN=$(openssl rand -hex 24)
OPENCODE_SERVER_PASSWORD=$(openssl rand -hex 16)
OPENCODE_ENABLED=true
OPENCODE_MODE=cli
INSTALL_OPENCODE=true
PORT=42069
EOF
  chmod 600 "$BASE/.env"
fi

# --- Launch ---
cd "$BASE"
docker compose up -d --build
echo "VibeCodeWorker is starting. Health: http://$(curl -s ifconfig.me):42069/api/status"
echo "Your token: cat /opt/vibecodeworker/.env"
