#!/usr/bin/env bash
# setup-k8s.sh — One-time setup: installs k3s, configures kubectl, fixes MongoDB bind,
#                 validates .env, then runs deploy-k8s.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }
die()  { echo -e "${RED}✘ $*${NC}"; exit 1; }

# ── 1. k3s ────────────────────────────────────────────────────────────────────
echo ""
echo "==> [1/5] Checking k3s..."
if command -v k3s &>/dev/null; then
  ok "k3s already installed ($(k3s --version | head -1))"
else
  warn "k3s not found — installing..."
  curl -sfL https://get.k3s.io | sh -
  ok "k3s installed"
fi

# Wait for node to be ready
echo "    Waiting for k3s node to be ready..."
sudo k3s kubectl wait --for=condition=ready node --all --timeout=60s &>/dev/null
ok "k3s node ready"

# ── 2. kubectl config ─────────────────────────────────────────────────────────
echo ""
echo "==> [2/5] Configuring kubectl..."
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown "$USER:$USER" ~/.kube/config
ok "kubectl configured — $(kubectl get nodes --no-headers 2>/dev/null | awk '{print $1, $2}')"

# ── 3. Host LAN IP ───────────────────────────────────────────────────────────
echo ""
echo "==> [3/5] Detecting host LAN IP..."
HOST_IP=$(hostname -I | awk '{print $1}')
ok "Host IP: $HOST_IP"

# ── 4. MongoDB bind address ──────────────────────────────────────────────────
echo ""
echo "==> [4/5] Checking MongoDB bind address..."

MONGO_CONF=""
for f in /etc/mongodb.conf /etc/mongod.conf /etc/mongodb/mongod.conf; do
  if [ -f "$f" ]; then MONGO_CONF="$f"; break; fi
done

if [ -z "$MONGO_CONF" ]; then
  warn "MongoDB config file not found — skipping bind check."
  warn "If connections from pods fail, make sure MongoDB listens on $HOST_IP (not just 127.0.0.1)."
else
  BIND=$(grep -E "^[[:space:]]*(bindIp|bind_ip)" "$MONGO_CONF" | head -1)
  if echo "$BIND" | grep -qE "127\.0\.0\.1|localhost"; then
    warn "MongoDB is bound only to localhost. Updating $MONGO_CONF..."
    sudo sed -i -E 's/^([[:space:]]*(bindIp|bind_ip):[[:space:]]*).*/\10.0.0.0/' "$MONGO_CONF"
    ok "bindIp set to 0.0.0.0 — restarting MongoDB..."
    sudo systemctl restart mongodb 2>/dev/null || sudo systemctl restart mongod 2>/dev/null || \
      warn "Could not restart MongoDB automatically — please restart it manually."
    sleep 2
  else
    ok "MongoDB bind address looks fine ($BIND)"
  fi
fi

# ── 5. .env — MONGODB_URI ────────────────────────────────────────────────────
echo ""
echo "==> [5/5] Checking .env for MONGODB_URI..."

if [ ! -f .env ]; then
  die ".env file not found. Create it from .env.example first."
fi

if grep -q "^MONGODB_URI=" .env; then
  ok "MONGODB_URI already set in .env"
else
  MONGO_URI="mongodb://${HOST_IP}:27017/tool-box"
  echo "MONGODB_URI=${MONGO_URI}" >> .env
  ok "Added MONGODB_URI=${MONGO_URI} to .env"
fi

# ── Done — hand off to deploy ────────────────────────────────────────────────
echo ""
ok "Setup complete. Starting deployment..."
echo ""
exec "$SCRIPT_DIR/deploy-k8s.sh"
