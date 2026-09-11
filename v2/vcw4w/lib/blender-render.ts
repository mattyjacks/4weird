/**
 * Blender GPU render farm; a .blend scene in, an H.264 .mp4 out, rendered
 * on a pinned RTX 4090 RunPod pod with official Blender over OptiX/CUDA.
 *
 * Flow (upload bypasses Vercel's ~4.5 MB body limit on purpose):
 * 1. POST /api/blender/jobs {filename, bytes} → job row (draft) + signed
 *    upload URL. The browser PUTs the .blend straight to Supabase storage.
 * 2. POST /api/blender/jobs/[id]/ready → server checks the stored object's
 *    size (service role) → ready.
 * 3. POST /api/blender/jobs/[id]/start {startFrame, endFrame} → provisions a
 *    4090 pod whose start command bootstraps Blender 5.2.1 LTS, preflights
 *    the scene (magic bytes, 4K cap, GPU device), renders PNGs, encodes
 *    mp4, PUTs it back to storage, and exits (exiting ends GPU billing).
 * 4. The pod calls back each phase to /api/blender/progress with the job's
 *    opaque token. Done/failed callbacks carry the outcome; the pod exits
 *    itself so billing stops even if nobody clicks anything.
 *
 * Money: RunPod bills the operator's card per second; coin figures are
 * display equivalents (100 coins = $1.00, 25% cut included); no coin debit,
 * no Vibe cut on direct spend. Mirror on /my/usage via runpod-sync.
 */

import { gameAiSplit } from "@/lib/game-ai";

/** Pinned official Blender LTS (verified 2026-09-11 on blender.org). */
export const BLENDER_VERSION = "5.2.1";
export const BLENDER_TARBALL_URL =
  "https://download.blender.org/release/Blender5.2/blender-5.2.1-linux-x64.tar.xz";
export const BLENDER_SHA256_URL =
  "https://download.blender.org/release/Blender5.2/blender-5.2.1.sha256";
/** Demo scenes for first-timers (Blender Foundation, free). */
export const BLENDER_DEMO_FILES_URL = "https://www.blender.org/download/demo-files/";

export const BLENDER_BUCKET = "blender-scenes";
/** Largest .blend accepted per job (direct-to-storage PUT, not via Vercel). */
export const BLENDER_MAX_SCENE_BYTES = 200 * 1024 * 1024;
/** Largest frame span per job (bounds wall time on the pod). */
export const BLENDER_MAX_FRAMES = 1200;
/** Wall cap for the whole worker (render itself is capped lower inside). */
export const BLENDER_WALL_MINUTES = 50;
/** Render timeout inside the worker; the rest is setup/encode/upload. */
export const BLENDER_RENDER_TIMEOUT_SECONDS = 45 * 60;

export const BLENDER_IMAGE = "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04";
export const BLENDER_HTTP_PORT = 8888;
export const BLENDER_DISK_GB = 30;

export const BLENDER_STATUSES = [
  "draft",
  "ready",
  "starting",
  "rendering",
  "done",
  "done_unstored",
  "failed",
  "stopped",
] as const;
export type BlenderStatus = (typeof BLENDER_STATUSES)[number];

/** RTX 4090 Secure $0.74/hr (live 2026-09-11) → ~$0.99/hr gross. */
export const BLENDER_REF_GPU_ID = "NVIDIA GeForce RTX 4090";
export const BLENDER_REF_HOURLY_USD = 0.74;

export function isBlenderStatus(value: unknown): value is BlenderStatus {
  return typeof value === "string" && (BLENDER_STATUSES as readonly string[]).includes(value);
}

export function isBlenderFilename(name: unknown): boolean {
  return typeof name === "string" && name.length >= 7 && name.length <= 128 && name.toLowerCase().endsWith(".blend");
}

export type BlenderJobInput = {
  startFrame?: unknown;
  endFrame?: unknown;
};

/**
 * Single validation point for a render span. Frames are 1-based Blender
 * frame numbers; the span (inclusive) is capped so one job cannot run past
 * the worker's wall budget.
 */
export function cleanBlenderSpan(input: BlenderJobInput):
  | { ok: true; startFrame: number; endFrame: number; frameCount: number }
  | { ok: false; error: string } {
  const start = Number(input.startFrame);
  const end = Number(input.endFrame);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1 || start > 1_000_000 || end > 1_000_000) {
    return { ok: false, error: "Frames must be whole numbers ≥ 1." };
  }
  if (end < start) return { ok: false, error: "End frame must be ≥ start frame." };
  const count = end - start + 1;
  if (count > BLENDER_MAX_FRAMES) {
    return { ok: false, error: `At most ${BLENDER_MAX_FRAMES} frames per render (asked ${count}). Split the animation into more jobs.` };
  }
  return { ok: true, startFrame: start, endFrame: end, frameCount: count };
}

/** Gross coins/min for a render worker at this hourly USD (25% included). */
export function blenderCoinsPerMinute(hourlyUsd: number): number {
  const usd = Number(hourlyUsd);
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.ceil(((usd / 0.75) * 100) / 60 * 100) / 100;
}

/** Gross full-cap quote + 25/75 split for display. */
export function quoteBlenderCap(
  hourlyUsd: number,
  minutes: number = BLENDER_WALL_MINUTES,
): { gross: number; cut: number; provider: number } {
  return gameAiSplit(Math.ceil(blenderCoinsPerMinute(hourlyUsd) * minutes * 100) / 100);
}

export const BLENDER_CUT_NOTE =
  "Includes 25% platform cut (same 25% as all game AI + compute); never added on top.";

/** Storage paths for one job (user-scoped so listings never leak). */
export function blenderScenePath(userId: string, jobId: string): string {
  return `scenes/${userId}/${jobId}.blend`;
}

export function blenderOutputPath(userId: string, jobId: string): string {
  return `renders/${userId}/${jobId}.mp4`;
}

export type BlenderBootstrapOpts = {
  device: "OPTIX" | "CUDA";
};

/**
 * The worker's start command body. Runs from env (BLENDER_BOOTSTRAP) via
 * `bash -c "$BLENDER_BOOTSTRAP"` so the pod-create body stays small and no
 * shell quoting crosses the RunPod API boundary. Everything the script needs
 * arrives as env: SCENE_URL, UPLOAD_URL, CALLBACK_URL, CALLBACK_TOKEN,
 * START_FRAME, END_FRAME, DEVICE, BLENDER_TARBALL, BLENDER_SHA256,
 * BLENDER_VERSION.
 *
 * Cost discipline: the script exits 0 after every terminal callback, which
 * releases the GPU; billing ends even if the user never clicks stop. The
 * only path that stays up is done_unstored (upload failed): the mp4 is
 * served on 8888 until the user downloads it and stops the pod.
 */
export function buildBlenderBootstrap(opts: BlenderBootstrapOpts): string {
  const device = opts.device === "CUDA" ? "CUDA" : "OPTIX";
  return `# Blender render worker (4weird) - .blend in, .mp4 out.
set -uo pipefail
WORK=/opt/blender-render
OUT=$WORK/out
mkdir -p $WORK/frames "$OUT"
echo "[blender-render] boot: Blender $BLENDER_VERSION worker, device=${device}" | tee "$OUT/render.log"
nohup python3 -m http.server ${BLENDER_HTTP_PORT} --directory "$OUT" > "$WORK/http.log" 2>&1 &
cb() {
  python3 - "$1" "$2" "$3" <<'PYEOF' >> "$OUT/render.log" 2>&1 || true
import json, os, sys, urllib.request
phase, detail, uploaded = sys.argv[1], sys.argv[2], sys.argv[3] == "1"
body = json.dumps({"token": os.environ.get("CALLBACK_TOKEN", ""), "status": phase, "detail": detail[:400], "uploaded": uploaded})
try:
    r = urllib.request.urlopen(urllib.request.Request(os.environ.get("CALLBACK_URL", ""), data=body.encode(), headers={"Content-Type": "application/json"}), timeout=20)
    print("callback " + phase + " -> " + str(r.status))
except Exception as e:
    print("callback " + phase + " failed: " + str(e)[:160])
PYEOF
}
fail() { echo "[blender-render] FAIL: $1" | tee -a "$OUT/render.log"; cb "failed" "$1" "0"; exit 0; }
cb "starting" "pod boot, installing Blender $BLENDER_VERSION" "0"
export DEBIAN_FRONTEND=noninteractive
apt-get update >> "$OUT/render.log" 2>&1 || fail "apt update failed"
apt-get install -y curl xz-utils ca-certificates ffmpeg >> "$OUT/render.log" 2>&1
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "[blender-render] apt ffmpeg missing, trying static build" | tee -a "$OUT/render.log"
  curl -fSL --retry 2 -m 300 "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" -o /tmp/ffmpeg.txz >> "$OUT/render.log" 2>&1 || fail "ffmpeg install failed"
  tar -xf /tmp/ffmpeg.txz -C /tmp >> "$OUT/render.log" 2>&1 || fail "ffmpeg unpack failed"
  cp /tmp/ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ffmpeg || fail "ffmpeg install failed"
fi
command -v ffmpeg >/dev/null 2>&1 || fail "ffmpeg unavailable"
for i in 1 2 3; do
  curl -fSL --retry 2 -m 600 "$BLENDER_TARBALL" -o /tmp/blender.txz >> "$OUT/render.log" 2>&1 && break
  [ "$i" = "3" ] && fail "Blender download failed"
  sleep 5
done
if curl -fSL -m 60 "$BLENDER_SHA256" -o /tmp/blender.sha256 >> "$OUT/render.log" 2>&1; then
  want=$(cut -d " " -f 1 /tmp/blender.sha256)
  got=$(sha256sum /tmp/blender.txz | cut -d " " -f 1)
  [ "$want" = "$got" ] || fail "Blender checksum mismatch"
  echo "[blender-render] checksum ok" | tee -a "$OUT/render.log"
else
  echo "[blender-render] WARN: checksum file unreachable, continuing (official blender.org URL over HTTPS)" | tee -a "$OUT/render.log"
fi
mkdir -p /opt/blender && tar -xf /tmp/blender.txz -C /opt/blender --strip-components=1 >> "$OUT/render.log" 2>&1 || fail "Blender unpack failed"
/opt/blender/blender --version >> "$OUT/render.log" 2>&1 || fail "Blender binary failed to start"
curl -fSL --retry 2 -m 600 "$SCENE_URL" -o $WORK/scene.blend >> "$OUT/render.log" 2>&1 || fail "scene download failed"
head -c 7 $WORK/scene.blend | grep -q "BLENDER" || fail "not a .blend file (bad magic)"
cat > $WORK/preflight.py <<'PYEOF'
import bpy, json, os, sys
scene = bpy.context.scene
if scene.render.resolution_x * scene.render.resolution_y > 3840 * 2160:
    print("PREFLIGHT_RES_CAP")
    sys.exit(4)
info = {
    "engine": scene.render.engine,
    "res_x": scene.render.resolution_x,
    "res_y": scene.render.resolution_y,
    "fps": round(scene.render.fps / max(1, scene.render.fps_base), 3),
    "frame_start": scene.frame_start,
    "frame_end": scene.frame_end,
}
if scene.render.engine == "CYCLES":
    prefs = bpy.context.preferences.addons["cycles"].preferences
    want = os.environ.get("DEVICE", "${device}")
    picked = ""
    for dtype in ([want] if want in ("OPTIX", "CUDA") else ["OPTIX"]) + ["CUDA"]:
        try:
            prefs.compute_device_type = dtype
        except Exception:
            continue
        gpus = [d for d in prefs.devices if d.type != "CPU"]
        if gpus:
            for d in gpus:
                d.use = True
            scene.cycles.device = "GPU"
            picked = dtype
            info["gpu_device"] = dtype
            info["gpus"] = [d.name for d in gpus]
            break
    if not picked:
        print("PREFLIGHT_NO_GPU")
        sys.exit(3)
print("PREFLIGHT_JSON:" + json.dumps(info))
PYEOF
/opt/blender/blender -b $WORK/scene.blend --python $WORK/preflight.py > $WORK/preflight.log 2>&1
PRE=$?
grep "PREFLIGHT_JSON:" $WORK/preflight.log | sed "s/.*PREFLIGHT_JSON://" > $OUT/scene.json || true
cat $WORK/preflight.log >> "$OUT/render.log"
[ "$PRE" = "3" ] && fail "no GPU render device (CUDA/OptiX) found on this pod"
[ "$PRE" = "4" ] && fail "scene resolution above the 4K pixel cap"
[ "$PRE" != "0" ] && fail "scene preflight failed (is this a valid .blend for Blender $BLENDER_VERSION?)"
FPS=$(python3 -c "import json;print(json.load(open('$OUT/scene.json')).get('fps', 24))")
cb "rendering" "frames $START_FRAME-$END_FRAME" "0"
timeout -s KILL ${BLENDER_RENDER_TIMEOUT_SECONDS} /opt/blender/blender -b $WORK/scene.blend -o "$WORK/frames/frame_####" -s "$START_FRAME" -e "$END_FRAME" -a >> "$OUT/render.log" 2>&1
RC=$?
[ "$RC" != "0" ] && fail "blender render exited ($RC); partial frames stay on the worker log"
COUNT=$(ls $WORK/frames/*.png 2>/dev/null | grep -c .)
[ "$COUNT" = "0" ] && fail "render produced no frames"
ffmpeg -y -framerate "$FPS" -i "$WORK/frames/frame_%04d.png" -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart "$OUT/render.mp4" >> "$OUT/render.log" 2>&1 || fail "mp4 encode failed"
SIZE=$(stat -c %s "$OUT/render.mp4")
if curl -fSL -m 600 -X PUT -H "Content-Type: video/mp4" --data-binary "@$OUT/render.mp4" "$UPLOAD_URL" >> "$OUT/render.log" 2>&1; then
  cb "done" "frames=$COUNT bytes=$SIZE" "1"
  exit 0
fi
echo "[blender-render] upload failed; mp4 stays on the worker; download it from the pod URL, then stop the pod" | tee -a "$OUT/render.log"
cb "done_unstored" "frames=$COUNT bytes=$SIZE" "0"
sleep infinity
`;
}
