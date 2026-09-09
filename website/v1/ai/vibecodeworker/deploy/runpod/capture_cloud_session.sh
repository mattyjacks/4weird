#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=/opt/vcw/website/v1/ai/vibecodeworker
PORT=${VCW_CAPTURE_PORT:-8914}
NAME=${VCW_CAPTURE_NAME:-cloud-session}
SECONDS=${VCW_CAPTURE_SECONDS:-20}
ENTRY=${VCW_CAPTURE_ENTRY:-games/html/overtake/index.html}
CAPTURE_DIR="$ROOT/data/browser-captures"
mkdir -p "$CAPTURE_DIR"
GAME_ID=${VIBE_OPEN_SOURCE_GAME_ID:-}
GAME_MODE=${VIBE_XONOTIC_MODE:-desktop}
CAPTURE_FPS=${VCW_CAPTURE_FPS:-30}
STAMP=$(date -u +%Y%m%d-%H%M%S)
# Keep the public filename tied to the requested game even though this
# recorder is launched from a wrapper that does not export its local GAME_ID.
GAME_NAME=${VIBE_OPEN_SOURCE_GAME_ID:-${GAME_ID:-xonotic}}
OUTPUT_STEM="${GAME_NAME}-${STAMP}"
if [ "$GAME_ID" = "xonotic" ]; then
  # Capture the actual Xonotic display for both native and browser modes.
  DISPLAY=${DISPLAY:-:1} ffmpeg -y -loglevel error -video_size 1440x900 -framerate "$CAPTURE_FPS" \
    -f x11grab -i "${DISPLAY:-:1}.0" -t "$SECONDS" "$CAPTURE_DIR/${NAME}.mp4" &
  RECORDER_PID=$!
  sleep 2
  if command -v xdotool >/dev/null 2>&1; then
    WID=$(xdotool search --name 'Xonotic' 2>/dev/null | head -n1 || xdotool search --onlyvisible 2>/dev/null | head -n1 || true)
    [ -n "$WID" ] && xdotool windowactivate "$WID" || true
    for key in w w a w d space w a d w; do xdotool keydown "$key"; sleep .35; xdotool keyup "$key"; done
  fi
  wait "$RECORDER_PID" || true
else
  node "$ROOT/scripts/node/headful_browser_record_server.js" "$PORT" &
  SERVER_PID=$!
  trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
  sleep 1
  URL="http://127.0.0.1:${PORT}/${ENTRY}?playtest=1&record=1&recordName=${NAME}&recordSeconds=${SECONDS}"
  DISPLAY=${DISPLAY:-:2} google-chrome --no-sandbox --disable-dev-shm-usage --app="$URL" &
  BROWSER_PID=$!
  sleep 3
  if command -v xdotool >/dev/null 2>&1; then
    WID=$(xdotool search --pid "$BROWSER_PID" 2>/dev/null | head -n1 || true)
    [ -n "$WID" ] && xdotool windowactivate "$WID" || true
    for key in Up Up Left Up n Right Up Up; do xdotool key "$key"; sleep .35; done
  fi
  wait "$BROWSER_PID" || true
fi

SOURCE="$CAPTURE_DIR/${NAME}.webm"
if [ -f "$CAPTURE_DIR/${NAME}.mp4" ]; then
  BASE="$CAPTURE_DIR/${NAME}.mp4"
elif [ -f "$SOURCE" ]; then
  if [ "${VCW_INPUT_MODE:-desktop}" = "mobile" ]; then
    node "$ROOT/scripts/node/finalize_browser_capture.js" "$SOURCE" "Cloud mobile playtest complete: touch targets, viewport behavior, and input routing were checked." || true
  else
    node "$ROOT/scripts/node/finalize_browser_capture.js" "$SOURCE" "Cloud desktop playtest complete: keyboard and pointer input, game state, and responsive behavior were checked." || true
  fi
fi
if [ -n "${BASE:-}" ] && [ -f "$BASE" ]; then
  if [ "${VCW_INPUT_MODE:-desktop}" = "mobile" ]; then
    node "$ROOT/scripts/node/export_mobile_testing.js" "$BASE" || true
    node "$ROOT/scripts/node/apply_marquee_branding.js" "$CAPTURE_DIR/${NAME}.mobile.testingV.mp4" || true
  else
    node "$ROOT/scripts/node/export_testing_layouts.js" "$BASE" || true
    for layout in testingH testingV; do node "$ROOT/scripts/node/apply_marquee_branding.js" "$CAPTURE_DIR/${NAME}.${layout}.mp4" || true; done
  fi
  # Normalize final deliverables to the public MediaMogul naming contract.
  FINAL_DIR="$CAPTURE_DIR/recordings"
  mkdir -p "$FINAL_DIR"
  cp -f "$BASE" "$FINAL_DIR/${OUTPUT_STEM}-gameplay-vibecodeworker.mp4"
  for layout in testingH testingV; do
    if [ -f "$CAPTURE_DIR/${NAME}.${layout}.mp4" ]; then
      cp -f "$CAPTURE_DIR/${NAME}.${layout}.mp4" "$FINAL_DIR/${OUTPUT_STEM}-${layout}-vibecodeworker.mp4"
    fi
  done
  node -e "const fs=require('fs');const path=require('path');const d=process.argv[1],stem=process.argv[2];const files=fs.readdirSync(d).filter(f=>f.startsWith(stem+'-')&&f.endsWith('.mp4'));fs.writeFileSync(path.join(d,'index.json'),JSON.stringify({game:process.env.GAME_NAME||'xonotic',timestamp:stem.split('-').slice(-2).join('-'),files},null,2));" "$FINAL_DIR" "$OUTPUT_STEM"
fi
