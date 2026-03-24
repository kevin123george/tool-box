#!/usr/bin/env bash
# setup-k8s-dashboard.sh — Deploys the official Kubernetes Dashboard
#                           Exposed on NodePort 30443 (HTTPS)
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }

# ── 1. Deploy dashboard ───────────────────────────────────────────────────────
echo ""
echo "==> [1/4] Deploying Kubernetes Dashboard..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
ok "Dashboard deployed"

# ── 2. Patch service to NodePort :30443 ──────────────────────────────────────
echo ""
echo "==> [2/4] Exposing dashboard on NodePort 30443..."
kubectl patch svc kubernetes-dashboard \
  -n kubernetes-dashboard \
  -p '{"spec":{"type":"NodePort","ports":[{"port":443,"targetPort":8443,"nodePort":30443}]}}'
ok "NodePort 30443 configured"

# ── 3. Create admin service account ──────────────────────────────────────────
echo ""
echo "==> [3/4] Creating admin user..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
EOF
ok "Admin user created"

# ── 4. Generate login token ───────────────────────────────────────────────────
echo ""
echo "==> [4/4] Generating login token..."
TOKEN=$(kubectl -n kubernetes-dashboard create token admin-user --duration=87600h)

# ── Done ──────────────────────────────────────────────────────────────────────
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')

echo ""
echo "════════════════════════════════════════════════"
ok "Kubernetes Dashboard is ready!"
echo ""
echo "  URL:   https://${NODE_IP}:30443"
echo "  (or)   https://<tailscale-ip>:30443"
echo ""
warn "Your browser will show a security warning — click 'Advanced' → 'Proceed'"
warn "(self-signed certificate, safe to accept on your private network)"
echo ""
echo "  Login token (save this somewhere):"
echo ""
echo "$TOKEN"
echo ""
echo "════════════════════════════════════════════════"
echo ""
echo "To get a new token anytime:"
echo "  kubectl -n kubernetes-dashboard create token admin-user"
