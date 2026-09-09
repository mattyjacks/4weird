# VCW dual-desktop Runpod image

The image starts two isolated noVNC browser desktops on the same GPU pod:

- `6901/http`: playable official Godot demo under test.
- `6902/http`: VCW agent workspace.
- `8888/http`: static games host.
- `42069/http`: VCW API.

At startup it downloads one allow-listed source game: Snake Canvas, Underrun, or Games Hub. The source URLs and licenses are defined in `lib/open_source_games.js`; no arbitrary repository URL is accepted.

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
