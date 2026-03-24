#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Load .env ────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example and fill in your values."
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

# MONGODB_URI must be set in .env and point to your host MongoDB
# Use your mini PC's LAN IP or Tailscale IP, e.g.:
#   MONGODB_URI=mongodb://192.168.1.50:27017/tool-box
if [ -z "$MONGODB_URI" ]; then
  echo "ERROR: MONGODB_URI is not set in .env"
  echo "  Set it to your host MongoDB, e.g.:"
  echo "  MONGODB_URI=mongodb://192.168.1.50:27017/tool-box"
  exit 1
fi

# ── Detect cluster tool ───────────────────────────────────────────────────────
if command -v k3s &>/dev/null; then
  CLUSTER=k3s
elif command -v minikube &>/dev/null && minikube status &>/dev/null 2>&1; then
  CLUSTER=minikube
else
  echo "ERROR: Neither k3s nor a running minikube found."
  exit 1
fi
echo "Cluster: $CLUSTER"

# ── Build images ─────────────────────────────────────────────────────────────
echo ""
echo "==> Building toolbox-backend..."
docker build -f Dockerfile.backend -t toolbox-backend:latest .

echo ""
echo "==> Building toolbox-frontend..."
docker build -f Dockerfile.frontend -t toolbox-frontend:latest .

# ── Load images into cluster ──────────────────────────────────────────────────
echo ""
echo "==> Loading images into $CLUSTER..."
if [ "$CLUSTER" = "k3s" ]; then
  docker save toolbox-backend:latest  | sudo k3s ctr images import -
  docker save toolbox-frontend:latest | sudo k3s ctr images import -
else
  minikube image load toolbox-backend:latest
  minikube image load toolbox-frontend:latest
fi

# ── Apply namespace ───────────────────────────────────────────────────────────
echo ""
echo "==> Applying namespace..."
kubectl apply -f k8s/namespace.yaml

# ── Create/update secret from .env ───────────────────────────────────────────
echo ""
echo "==> Syncing secrets..."
kubectl create secret generic toolbox-secrets \
  --namespace toolbox \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=KEVIN_NAME="${KEVIN_NAME}" \
  --from-literal=KEVIN_EMAIL="${KEVIN_EMAIL}" \
  --from-literal=KEVIN_PASSWORD="${KEVIN_PASSWORD}" \
  --from-literal=MONGODB_URI="${MONGODB_URI}" \
  --from-literal=ALPHA_VANTAGE_API_KEY="${ALPHA_VANTAGE_API_KEY:-}" \
  --from-literal=MAILERSEND_API_KEY="${MAILERSEND_API_KEY:-}" \
  --from-literal=NOTIFICATION_FROM_EMAIL="${NOTIFICATION_FROM_EMAIL:-noreply@toolbox.local}" \
  --from-literal=NOTIFICATION_FROM_NAME="${NOTIFICATION_FROM_NAME:-ToolBox}" \
  --dry-run=client -o yaml | kubectl apply -f -

# ── Apply manifests ───────────────────────────────────────────────────────────
echo ""
echo "==> Applying manifests..."
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml

# ── Rollout restart to pick up new images ────────────────────────────────────
echo ""
echo "==> Rolling out new images..."
kubectl rollout restart deployment/toolbox-backend  -n toolbox
kubectl rollout restart deployment/toolbox-frontend -n toolbox

# ── Wait for rollout ──────────────────────────────────────────────────────────
echo ""
echo "==> Waiting for rollouts..."
kubectl rollout status deployment/toolbox-backend  -n toolbox --timeout=120s
kubectl rollout status deployment/toolbox-frontend -n toolbox --timeout=60s

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "==> Deployed!"
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo "    Frontend: http://${NODE_IP}:30080"
echo "    (or via Tailscale: http://<tailscale-ip>:30080)"
