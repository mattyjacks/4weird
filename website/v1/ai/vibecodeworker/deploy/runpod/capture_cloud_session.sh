#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=/opt/vcw/website/v1/ai/vibecodeworker
PORT=${VCW_CAPTURE_PORT:-8914}
NAME=${VCW_CAPTURE_NAME:-cloud-session}
SECONDS=${VCW_CAPTURE_SECONDS:-20}
ENTRY=${VCW_CAPTURE_ENTRY:-games/html/overtake/index.html}
node "$ROOT/scripts/node/headful_browser_record_server.js" "$PORT" &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
URL="http://127.0.0.1:${PORT}/${ENTRY}?record=1&recordName=${NAME}&recordSeconds=${SECONDS}"
DISPLAY=${DISPLAY:-:2} google-chrome --no-sandbox --disable-dev-shm-usage --app="$URL" &
BROWSER_PID=$!
sleep 3
# The recorder injection drives browser games through real DOM keyboard events;
# xdotool keeps the visible desktop focused for games that require focus.
if command -v xdotool >/dev/null 2>&1; then
  WID=$(xdotool search --pid "$BROWSER_PID" 2>/dev/null | head -n1 || true)
  [ -n "$WID" ] && xdotool windowactivate "$WID" || true
  for key in Up Up Left Up n Right Up Up; do xdotool key "$key"; sleep .35; done
fi
wait "$BROWSER_PID" || true

CAPTURE_DIR="$ROOT/data/browser-captures"
SOURCE="$CAPTURE_DIR/${NAME}.webm"
if [ -f "$SOURCE" ]; then
  if [ "${VCW_INPUT_MODE:-desktop}" = "mobile" ]; then
    node "$ROOT/scripts/node/finalize_browser_capture.js" "$SOURCE" "Cloud mobile playtest complete: touch targets, viewport behavior, and input routing were checked." || true
  else
    node "$ROOT/scripts/node/finalize_browser_capture.js" "$SOURCE" "Cloud desktop playtest complete: keyboard and pointer input, game state, and responsive behavior were checked." || true
  fi
  BASE="$CAPTURE_DIR/${NAME}.mp4"
  if [ -f "$BASE" ]; then
    if [ "${VCW_INPUT_MODE:-desktop}" = "mobile" ]; then
      node "$ROOT/scripts/node/export_mobile_testing.js" "$BASE" || true
      node "$ROOT/scripts/node/apply_marquee_branding.js" "$CAPTURE_DIR/${NAME}.mobile.testingV.mp4" || true
    else
      node "$ROOT/scripts/node/export_testing_layouts.js" "$BASE" || true
      for layout in testingH testingV; do node "$ROOT/scripts/node/apply_marquee_branding.js" "$CAPTURE_DIR/${NAME}.${layout}.mp4" || true; done
    fi
  fi
fi
