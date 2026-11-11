#!/usr/bin/env bash
# One-time setup: deploy new commits on main automatically, every 5 minutes.
#
#   sudo bash ~/opas-monorepo/opas-infra/server/install-auto-update.sh
#
# Turn it off:  sudo systemctl disable --now opas-auto-update.timer
set -euo pipefail

user="${SUDO_USER:-ubuntu}"
script="$(cd "$(dirname "$0")" && pwd)/auto-update.sh"
chmod +x "$script"

cat > /etc/systemd/system/opas-auto-update.service <<UNIT
[Unit]
Description=Deploy new Opas commits from main
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
User=$user
ExecStart=$script
UNIT

cat > /etc/systemd/system/opas-auto-update.timer <<UNIT
[Unit]
Description=Check for new Opas commits every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now opas-auto-update.timer
echo "Auto-update installed. Deploying now if main has changed (takes a few minutes)..."
systemctl start opas-auto-update.service
journalctl -u opas-auto-update --since "-10 min" --no-pager | tail -5
