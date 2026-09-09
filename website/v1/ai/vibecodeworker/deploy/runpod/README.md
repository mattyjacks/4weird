# VCW dual-desktop Runpod image

The image starts two isolated noVNC browser desktops on the same GPU pod:

- `6901/http`: playable game under test (Godot or Xonotic).
- `6902/http`: VCW agent workspace.
- `8888/http`: static games host.
- `42069/http`: VCW API.

At startup it downloads one allow-listed source game: Snake Canvas, Underrun, Games Hub, or Xonotic. The source URLs and licenses are defined in `lib/open_source_games.js`; no arbitrary repository URL is accepted.

Xonotic supports both surfaces from the same image. Set `openSourceGameId=xonotic`
and `xonoticMode=desktop` to download the official Xonotic 0.8.6 Linux client and
run a bot-filled `dm_run` arena on the game desktop. Set `xonoticMode=web` to open
the allow-listed WebAssembly/WebGL browser client on that desktop. In both cases
the agent desktop remains available on port 6902 and the game desktop on port 6901.

The launch request body is intentionally small and the same for the web and desktop
VCW clients; only the surface changes:

```json
{ "openSourceGameId": "xonotic", "xonoticMode": "desktop", "gameId": "xonotic" }
```

```json
{ "openSourceGameId": "xonotic", "xonoticMode": "web", "gameId": "xonotic" }
```

It also downloads the latest stable Godot engine from the official
`godotengine/godot-builds` release feed and starts the official
`dodge_the_creeps` demo. Agents can inspect that desktop with
`vcw_godot_screenshot`, then make one allow-listed keyboard action at a time
with `vcw_godot_action`; the MCP bridge never exposes a shell command or
caller-controlled download URL.

The first desktop now boots the official Godot `dodge_the_creeps` demo. Its
Godot engine is fetched dynamically from the official `godotengine/godot-builds`
stable release feed, so it is current when the pod starts. VCW exposes
`/api/godot/status`, `/api/godot/release`, and a token-protected
`/api/godot/action` endpoint. The latter accepts only allow-listed game keys
and is available to agents through the `vcw_godot_*` MCP tools.

Build and publish the image before launching a cloud run:

```bash
docker buildx build --platform linux/amd64 \
  -f website/v1/ai/vibecodeworker/deploy/runpod/Dockerfile \
  -t ghcr.io/<owner>/vibecodeworker-cloud:2.0.0 --push .
```

On Windows, the checked-in PowerShell helper performs the same linux/amd64 build
and push after Docker Desktop is running:

```powershell
./website/v1/ai/vibecodeworker/deploy/runpod/publish-image.ps1 `
  -Image ghcr.io/<owner>/vibecodeworker-cloud `
  -Tag xonotic-0.1.0
```

Set `VIBE_CLOUD_IMAGE=ghcr.io/<owner>/vibecodeworker-cloud:2.0.0` for the local VCW API process. A launched run returns both noVNC URLs under `desktops.game` and `desktops.agent`.

## Video layout handoff

The web runner forwards two optional launch fields into the pod environment:

- `inputMode=desktop|mobile` → `VCW_INPUT_MODE`
- `videoLayout=testingH|testingV|both` → `VCW_VIDEO_LAYOUT`

The capture worker should write its source gameplay take as
`data/browser-captures/<session>.mp4`, then invoke:

```bash
node scripts/node/export_testing_layouts.js data/browser-captures/<session>.mp4
```

For a touch-first run use:

```bash
node scripts/node/export_mobile_testing.js data/browser-captures/<session>.mp4
```

Finally apply the animated top/bottom brand marquee with
`node scripts/node/apply_marquee_branding.js <layout>.mp4`. The layout manifest
and event log remain beside the videos so the hosted UI can expose both the
clean Gameplay cut and the diagnostic cuts from one synchronized source.

When `VCW_AUTO_RECORD=1` is set (the web runner sets it whenever a layout is
requested), `capture_cloud_session.sh` performs those steps automatically after
the visible browser session ends.
