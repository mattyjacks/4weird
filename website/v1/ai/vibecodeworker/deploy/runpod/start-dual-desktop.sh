#!/usr/bin/env bash
set -Eeuo pipefail

GAME_ROOT=/workspace/open-source-games
GODOT_ROOT="${GODOT_INSTALL_ROOT:-/opt/godot}"
GODOT_PROJECT_ROOT=/workspace/godot-demo-projects
GAME_ID="${VIBE_OPEN_SOURCE_GAME_ID:-snake-canvas}"
GAME_ENTRY="${VIBE_OPEN_SOURCE_GAME_ENTRY:-index.html}"
XONOTIC_MODE="${VIBE_XONOTIC_MODE:-desktop}"
XONOTIC_ROOT="${XONOTIC_INSTALL_ROOT:-/workspace/xonotic}"
XONOTIC_VERSION="${XONOTIC_VERSION:-0.8.6}"
INPUT_MODE="${VCW_INPUT_MODE:-desktop}"
VIDEO_LAYOUT="${VCW_VIDEO_LAYOUT:-both}"
mkdir -p "$GAME_ROOT"
case "$GAME_ID" in
  snake-canvas) GAME_REPO=https://github.com/adrianov/snake.git ;;
  underrun) GAME_REPO=https://github.com/phoboslab/underrun.git ;;
  games-hub) GAME_REPO=https://github.com/sausi-7/games.git ;;
  xonotic) GAME_REPO=https://github.com/xonotic/xonotic.git ;;
  *) echo "Unsupported open-source game id: $GAME_ID" >&2; exit 64 ;;
esac
if [ "$GAME_ID" != "xonotic" ] && [ ! -f "$GAME_ROOT/$GAME_ID/$GAME_ENTRY" ]; then
  rm -rf "$GAME_ROOT/$GAME_ID"
  git clone --depth 1 "$GAME_REPO" "$GAME_ROOT/$GAME_ID"
fi

# Official Godot demo paired with the dynamic official stable installer.
if [ ! -f "$GODOT_PROJECT_ROOT/2d/dodge_the_creeps/project.godot" ]; then
  rm -rf "$GODOT_PROJECT_ROOT"
  git clone --depth 1 https://github.com/godotengine/godot-demo-projects.git "$GODOT_PROJECT_ROOT"
fi

cd /opt/vcw/website/v1/ai/vibecodeworker
echo "VCW capture mode: ${INPUT_MODE}; requested layouts: ${VIDEO_LAYOUT}"
HOST=0.0.0.0 PORT=42069 STATIC_PORT=8888 VIBE_GODOT_CLOUD=1 VIBE_GODOT_DISPLAY=:1 VIBE_GODOT_PROJECT="$GODOT_PROJECT_ROOT/2d/dodge_the_creeps" GODOT_INSTALL_ROOT="$GODOT_ROOT" node server/start_api_server.js &
API_PID=$!
Xvfb :1 -screen 0 1440x900x24 -ac &
Xvfb :2 -screen 0 1440x900x24 -ac &
x11vnc -display :1 -forever -shared -nopw -rfbport 5901 &
x11vnc -display :2 -forever -shared -nopw -rfbport 5902 &
websockify --web=/usr/share/novnc 6901 localhost:5901 &
websockify --web=/usr/share/novnc 6902 localhost:5902 &
if [ "$GAME_ID" = "xonotic" ]; then
  if [ "$XONOTIC_MODE" = "web" ]; then
    DISPLAY=:1 google-chrome --no-sandbox --disable-dev-shm-usage --window-size=1440,900 --app="${VIBE_XONOTIC_WEB_URL:-https://dpgame.xonotic.workers.dev/}" &
  else
    XONOTIC_ZIP="/tmp/xonotic-${XONOTIC_VERSION}.zip"
    XONOTIC_URL="https://dl.xonotic.org/xonotic-${XONOTIC_VERSION}.zip"
    if [ ! -x "$XONOTIC_ROOT/xonotic-linux64-sdl" ]; then
      rm -rf "$XONOTIC_ROOT" /tmp/xonotic-extract
      mkdir -p /tmp/xonotic-extract
      curl -fL --retry 3 "$XONOTIC_URL" -o "$XONOTIC_ZIP"
      unzip -q "$XONOTIC_ZIP" -d /tmp/xonotic-extract
      FOUND="$(find /tmp/xonotic-extract -type f -name 'xonotic-linux64-sdl' -print -quit)"
      [ -n "$FOUND" ] || { echo 'Xonotic archive did not contain xonotic-linux64-sdl' >&2; exit 71; }
      mkdir -p "$XONOTIC_ROOT"
      cp -a "$(dirname "$FOUND")"/. "$XONOTIC_ROOT"/
      chmod +x "$XONOTIC_ROOT"/xonotic-linux64-sdl
    fi
    # The client resolves data relative to its launch directory in this
    # headless setup. Pin the official extracted directory explicitly so the
    # native client can find data*.pk3 rather than dropping into its error UI.
    DISPLAY=:1 "$XONOTIC_ROOT/xonotic-linux64-sdl" -basedir "$XONOTIC_ROOT" -nohome -userdir "$XONOTIC_ROOT/user" +map dm_run +bot_number 5 &
  fi
else
  GODOT_INSTALL_ROOT="$GODOT_ROOT" node server/install_godot.js
  GODOT_BIN="$(find "$GODOT_ROOT" -type f -name 'Godot_*_linux.x86_64' -print -quit)"
  if [ -z "$GODOT_BIN" ]; then echo 'Godot install did not produce a Linux executable' >&2; exit 70; fi
  DISPLAY=:1 "$GODOT_BIN" --path "$GODOT_PROJECT_ROOT/2d/dodge_the_creeps" &
fi
if [ "$INPUT_MODE" = "mobile" ]; then
  CHROME_VIEWPORT='--window-size=430,900 --force-device-scale-factor=1'
else
  CHROME_VIEWPORT='--window-size=1440,900'
fi
DISPLAY=:2 google-chrome --no-sandbox --disable-dev-shm-usage $CHROME_VIEWPORT --app="http://127.0.0.1:8888/vibecodeworker/hub.html" &
if [ "${VCW_AUTO_RECORD:-0}" = "1" ]; then
  VCW_CAPTURE_ENTRY="${VCW_CAPTURE_ENTRY:-games/html/overtake/index.html}" VCW_CAPTURE_NAME="${VIBE_GAME:-cloud-session}" "$PWD/deploy/runpod/capture_cloud_session.sh" &
fi
trap 'kill "$API_PID" 2>/dev/null || true' EXIT INT TERM
wait "$API_PID"
