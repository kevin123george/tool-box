#!/usr/bin/env bash
# ============================================================
#  ToolBox — Cloudflare Tunnel Setup for Arch Linux
#  Run this on your homelab server as a normal user (with sudo)
# ============================================================

set -e

TUNNEL_NAME="toolbox"
LOCAL_PORT=3000
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()     { echo -e "${RED}[ERR]${NC}   $*" >&2; exit 1; }

echo ""
echo "=========================================="
echo "   ToolBox — Public Access Setup"
echo "   Cloudflare Tunnel on Arch Linux"
echo "=========================================="
echo ""

# ── 1. Install cloudflared ────────────────────────────────
info "Checking for cloudflared..."

if ! command -v cloudflared &>/dev/null; then
    info "Installing cloudflared..."

    # Try yay/paru (AUR helpers) first
    if command -v yay &>/dev/null; then
        yay -S --noconfirm cloudflared
    elif command -v paru &>/dev/null; then
        paru -S --noconfirm cloudflared
    else
        # Fallback: download binary directly from GitHub
        info "No AUR helper found — downloading binary from GitHub..."
        ARCH=$(uname -m)
        case "$ARCH" in
            x86_64)  CF_ARCH="amd64" ;;
            aarch64) CF_ARCH="arm64" ;;
            armv7*)  CF_ARCH="arm"   ;;
            *)       die "Unsupported architecture: $ARCH" ;;
        esac

        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}"
        info "Downloading from: $CF_URL"
        curl -fsSL "$CF_URL" -o /tmp/cloudflared
        chmod +x /tmp/cloudflared
        sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
    fi
fi

cloudflared --version && success "cloudflared is installed"

# ── 2. Authenticate with Cloudflare ──────────────────────
echo ""
info "Step 2: Authenticate with Cloudflare"
echo ""
echo "  This will open a browser URL. Copy it and open it on"
echo "  any machine, then select the domain you want to use."
echo ""
read -rp "  Press ENTER to start authentication..."

cloudflared tunnel login
success "Authenticated with Cloudflare"

# ── 3. Create the tunnel ─────────────────────────────────
echo ""
info "Step 3: Creating tunnel named '${TUNNEL_NAME}'..."

# Check if tunnel already exists
if cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
    warn "Tunnel '${TUNNEL_NAME}' already exists — reusing it"
else
    cloudflared tunnel create "$TUNNEL_NAME"
    success "Tunnel '${TUNNEL_NAME}' created"
fi

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
info "Tunnel ID: $TUNNEL_ID"

# ── 4. DNS route — ask for domain ────────────────────────
echo ""
echo "  What hostname should ToolBox be accessible at?"
echo "  Examples:"
echo "    toolbox.yourdomain.com"
echo "    app.yourdomain.com"
echo ""
read -rp "  Enter your desired hostname: " HOSTNAME

cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME"
success "DNS route set: $HOSTNAME → tunnel"

# ── 5. Write config file ──────────────────────────────────
mkdir -p "$CONFIG_DIR"

# Find the credentials file (cloudflared puts it in ~/.cloudflared/<uuid>.json)
CRED_FILE=$(find "$CONFIG_DIR" -name "${TUNNEL_ID}.json" 2>/dev/null | head -1)
if [[ -z "$CRED_FILE" ]]; then
    # Fallback: find any json that looks like a tunnel credential
    CRED_FILE=$(find "$CONFIG_DIR" -name "*.json" ! -name "cert.pem" 2>/dev/null | head -1)
fi

cat > "$CONFIG_FILE" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CRED_FILE}

ingress:
  - hostname: ${HOSTNAME}
    service: http://localhost:${LOCAL_PORT}
  - service: http_status:404
EOF

success "Config written to $CONFIG_FILE"
cat "$CONFIG_FILE"

# ── 6. Test the tunnel (foreground, Ctrl+C to stop) ───────
echo ""
info "Step 6: Testing tunnel — will run for 10 seconds then continue"
echo "  (Watch for 'Connection registered' in the output)"
echo ""
timeout 10 cloudflared tunnel --config "$CONFIG_FILE" run "$TUNNEL_NAME" || true

# ── 7. Install as systemd service ────────────────────────
echo ""
info "Step 7: Installing systemd service..."

SERVICE_FILE="/etc/systemd/system/cloudflared-toolbox.service"
CURRENT_USER=$(whoami)

sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel — ToolBox
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${CURRENT_USER}
ExecStart=/usr/local/bin/cloudflared tunnel --config ${CONFIG_FILE} run ${TUNNEL_NAME}
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Use the correct binary path if installed via AUR
CF_BIN=$(command -v cloudflared)
if [[ "$CF_BIN" != "/usr/local/bin/cloudflared" ]]; then
    sudo sed -i "s|/usr/local/bin/cloudflared|${CF_BIN}|g" "$SERVICE_FILE"
fi

sudo systemctl daemon-reload
sudo systemctl enable cloudflared-toolbox
sudo systemctl start  cloudflared-toolbox

sleep 3
sudo systemctl status cloudflared-toolbox --no-pager

# ── 8. Done ──────────────────────────────────────────────
echo ""
echo "=========================================="
echo -e "  ${GREEN}Setup complete!${NC}"
echo "=========================================="
echo ""
echo "  ToolBox is now publicly accessible at:"
echo -e "  ${CYAN}https://${HOSTNAME}${NC}"
echo ""
echo "  Useful commands:"
echo "    sudo systemctl status cloudflared-toolbox   # check status"
echo "    sudo systemctl restart cloudflared-toolbox  # restart tunnel"
echo "    sudo journalctl -u cloudflared-toolbox -f   # live logs"
echo ""
echo -e "  ${YELLOW}Security reminders:${NC}"
echo "    • Change your ToolBox password from kevin123"
echo "    • Check: https://${HOSTNAME}/login.html"
echo ""
