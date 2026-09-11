#!/usr/bin/env bash
# VibeCodeWorker; cheap CPU-only Ubuntu remote desktop for Runpod.
#
# What you get: Ubuntu + XFCE desktop on a CPU pod, reachable from your
# browser at https://<podId>-6901.proxy.runpod.net/vnc.html
# Copy-paste works BOTH directions:
#   Desktop -> Virtual Desktop: copy text locally, open the noVNC left
#     sidebar (the arrow tab), paste into the "Clipboard" panel, then
#     middle-click / Ctrl+V inside the remote desktop.
#   Virtual Desktop -> Desktop: select+copy inside the remote desktop,
#     open the noVNC sidebar Clipboard panel, copy from there, paste locally.
# The pod-side bridge that makes this possible is `autocutsel` (syncs the X
# PRIMARY selection with the CLIPBOARD buffer that VNC carries) plus xclip.
#
# Launch: the CPU pod spec in lib/runpod_cloud.js (buildCpuPodSpec) runs this
# file as the container entrypoint via `args: ["bash","-lc", ...]`, or copy
# this file into the pod and run `bash start-ubuntu-desktop.sh`.
set -Eeuo pipefail

MAX_MINUTES="${VIBE_MAX_MINUTES:-55}"
if ! [[ "$MAX_MINUTES" =~ ^[1-9][0-9]{0,2}$ ]]; then
  echo "Invalid VIBE_MAX_MINUTES: $MAX_MINUTES" >&2
  exit 64
fi
MAX_SECONDS=$((MAX_MINUTES * 60))
DISPLAY_NUM="${VIBE_DESKTOP_DISPLAY:-:1}"
GEOMETRY="${VIBE_DESKTOP_GEOMETRY:-1440x900x24}"
HTTP_PORT="${VIBE_DESKTOP_PORT:-6901}"
RFB_PORT="${VIBE_DESKTOP_RFB_PORT:-5901}"

echo "[vcw-desktop] installing desktop + clipboard bridge (xfce4, x11vnc, novnc, autocutsel, xclip)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  xfce4 xfce4-goodies \
  xvfb x11vnc novnc websockify \
  autocutsel xclip xsel \
  dbus-x11 thunar mousepad \
  curl ca-certificates git \
  fonts-liberation
rm -rf /var/lib/apt/lists/*

# noVNC ships its client under /usr/share/novnc on Debian/Ubuntu.
NOVNC_WEB="$(test -d /usr/share/novnc && echo /usr/share/novnc || echo /usr/share/novnc)"
mkdir -p "$HOME/.vnc" "$HOME/Desktop"

echo "[vcw-desktop] starting X server on $DISPLAY_NUM ($GEOMETRY)..."
Xvfb "$DISPLAY_NUM" -screen 0 "$GEOMETRY" -ac &
XVFB_PID=$!
sleep 2

export DISPLAY="$DISPLAY_NUM"
# D-Bus session so clipboard + file manager behave.
eval "$(dbus-launch --sh-syntax)" || true
startxfce4 &
XFCE_PID=$!
sleep 3

echo "[vcw-desktop] starting clipboard bridge (PRIMARY <-> CLIPBOARD)..."
# autocutsel keeps the mouse selection and Ctrl+C buffers in sync, which is
# what lets noVNC carry text both ways. Run both directions like a desktop OS.
autocutsel -fork -display "$DISPLAY_NUM" &
autocutsel -selection PRIMARY -fork -display "$DISPLAY_NUM" &
echo "Clipboard is bridged. Copy-paste works Desktop <-> Virtual Desktop via the noVNC sidebar Clipboard panel." > "$HOME/Desktop/CLIPBOARD-HELP.txt"

echo "[vcw-desktop] starting VNC server (port $RFB_PORT, shared, no password on loopback/proxy)..."
# -ncache 10 gives the noVNC client a framebuffer cache (smoother remote).
# -xkb -repeat -skip_lock -clear_all keep keyboard sane over the web client.
x11vnc -display "$DISPLAY_NUM" -forever -shared -nopw \
  -rfbport "$RFB_PORT" -ncache 10 -xkb -repeat -skip_lock -clear_all &
VNC_PID=$!
sleep 2

echo "[vcw-desktop] starting noVNC websockify on 0.0.0.0:$HTTP_PORT -> localhost:$RFB_PORT ..."
websockify --web="$NOVNC_WEB" "0.0.0.0:$HTTP_PORT" "localhost:$RFB_PORT" &
WS_PID=$!
sleep 1

# Friendly first-run notes on the remote desktop itself.
cat > "$HOME/Desktop/VCW-README.txt" <<'EOF'
VibeCodeWorker cloud desktop (cheap CPU Ubuntu)
===============================================
- This is a real Ubuntu + XFCE desktop running on Runpod.
- Open apps from the top-left Applications menu. Firefox/Chromium (if
  installed by your image) browses the web from inside the pod.
- COPY-PASTE both directions:
  * Into the pod: copy locally, open the noVNC left sidebar (arrow tab),
    paste into Clipboard, then Ctrl+V inside the desktop.
  * Out of the pod: copy inside the desktop, open the sidebar Clipboard,
    copy from there, paste locally.
- The pod auto-terminates at the VIBE_MAX_MINUTES budget deadline so billing
  stops even if you close this tab. Stop it early from the VCW Cloud Run page.
EOF

echo "[vcw-desktop] ready. noVNC at http://0.0.0.0:${HTTP_PORT}/vnc.html (public: https://<podId>-${HTTP_PORT}.proxy.runpod.net/vnc.html?autoconnect=true&resize=scale)"
echo "[vcw-desktop] clipboard: autocutsel PRIMARY<->CLIPBOARD bridge active; use the noVNC sidebar Clipboard panel."

# Budget watchdog: exit the entrypoint at the deadline so the pod leaves
# RUNNING and per-second billing stops. Independent of desktop children so a
# hung app cannot overrun the cap.
( sleep "$MAX_SECONDS"; echo "VCW budget deadline reached after ${MAX_MINUTES} minutes" >&2; kill -TERM "$$" ) &
WATCHDOG_PID=$!

trap 'kill "$WATCHDOG_PID" "$VNC_PID" "$WS_PID" "$XFCE_PID" "$XVFB_PID" 2>/dev/null || true' EXIT INT TERM
wait "$WS_PID"
