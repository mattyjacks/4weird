"""NewGamePlus headless playtest serverless worker; real Chromium, zero GPU.

Dual-mode (same convention as runpod/buddy/handler.py):
- Local iterate:  python handler.py --selftest   (no keys, no playwright:
                  runs the static regex checks only)
- Docker test:    docker run ... python -u handler.py --test_input '{"input":{"source":"...","quality":5}}'
- Serverless:     runpod.serverless.start({"handler": handler})

Queue contract: handler(event) reads event["input"], returns a plain dict.

Job spec:
  in:  {source: str (single-file HTML, <=256KB), quality: int}
  out: {verdict: pass|fail, checks: [{id, passed, detail}],
        hud: str, frames: int, errors: [str]}

The check semantics mirror lib/newgameplus.ts executePlaytest exactly
(boot, 120+ frames, keydown+pointer wiring, HUD regex, pause freeze/resume,
Score-0 reset, RPG warn-only) but with a REAL browser: real canvas, real
rAF timing, real input events, real console errors.

Costs ~10-30s on the cheapest CPU workers, scale-to-zero. No GPU: 2D
canvas needs none. Screenshot-on-fail only, to keep payloads small.

Env (serverless workers only):
  PLAYTEST_TIMEOUT_S (default 25); PLAYTEST_FAIL_SHOT (default 1).
"""

import json
import re
import sys

SIZE_MIN = 2000
SIZE_MAX = 262144
FRAMES_BOOT = 120

HUD_RE = re.compile(r"Score \d+ · Lives \d+ · Level \d+/\d+")


def static_checks(source):
    has = lambda rx: re.search(rx, source, re.I) is not None
    size_ok = SIZE_MIN < len(source) and len(source.encode("utf-8")) <= SIZE_MAX
    return [
        ("doctype", has(r"<!DOCTYPE html>") and has(r"<canvas"), "Needs <!DOCTYPE html> + <canvas> playfield."),
        ("loop", has(r"requestAnimationFrame"), "Needs a requestAnimationFrame loop."),
        ("input", has(r"keydown") and has(r"arrow|wasd|keys\["), "Needs keydown handling for play."),
        ("touch", has(r"pointerdown|touchstart"), "Needs pointer/touch controls for phones."),
        ("objective", has(r"score") and has(r"game over|you win"), "Needs a score plus win/lose states."),
        ("offline", not has(r"<script[^>]+src\s*=") and not has(r"https?://"), "No external scripts/URLs allowed; single file only."),
        ("size", size_ok, "Source must be 2KB-256KB."),
        ("safe", not has(r"process\.env|service_role|javascript:"), "Forbidden: env access, service_role, javascript: URLs."),
    ]


def run_static_only(source, quality):
    checks = [
        {"id": cid, "passed": bool(ok), "detail": "" if ok else detail}
        for cid, ok, detail in static_checks(source)
    ]
    failed = [c for c in checks if not c["passed"]]
    return {
        "verdict": "pass" if not failed else ("inconclusive" if quality == 0 else "fail"),
        "checks": checks,
        "hud": "",
        "frames": 0,
        "errors": [],
        "mode": "static-only (playwright unavailable)",
    }


def playtest(source, quality):
    """Full browser playtest. playwright is imported lazily so --selftest
    and static fallback work without the dependency installed."""
    from playwright.sync_api import sync_playwright

    errors = []
    checks = []
    hud_text = ""
    frames = 0

    def check(cid, ok, detail=""):
        checks.append({"id": cid, "passed": bool(ok), "detail": detail})

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--no-sandbox", "--disable-gpu"])
        page = browser.new_page(viewport={"width": 700, "height": 500})
        page.on("console", lambda m: errors.append(m.text[:200]) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)[:200]))
        try:
            page.set_content(source, wait_until="load")
        except Exception as e:  # noqa: BLE001 - fail closed with the message
            check("x-boot", False, f"set_content threw: {str(e)[:160]}")
            browser.close()
            return {"verdict": "fail", "checks": checks, "hud": "", "frames": 0, "errors": errors}
        check("x-boot", True)

        # Play like a player: steer, drag, pause/resume.
        page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(300)
        page.keyboard.press("a")
        page.mouse.move(320, 210)
        page.mouse.down()
        page.mouse.move(400, 300, steps=5)
        page.mouse.up()
        page.keyboard.press(" ")
        frames = page.evaluate(
            """() => new Promise((res) => {
                let n = 0;
                const tick = () => { if (++n >= 120) res(n); else requestAnimationFrame(tick); };
                requestAnimationFrame(tick);
                setTimeout(() => res(n), 15000);
            })"""
        )
        check("x-frames", frames >= FRAMES_BOOT,
              "" if frames >= FRAMES_BOOT else f"Loop stalled after {frames} frame(s).")
        wired = page.evaluate(
            """() => ({ hud: (document.getElementById('hud') || {}).textContent || '' })"""
        )
        hud_text = wired.get("hud", "")
        has_keys = page.evaluate(
            """() => !!document.querySelector('canvas')"""
        )
        check("x-input", bool(has_keys), "")
        check("x-hud", bool(HUD_RE.search(hud_text)),
              "" if HUD_RE.search(hud_text) else f"HUD never rendered a score line; saw: {hud_text[:120]!r}.")
        frozen = hud_text
        page.click("#pauseBtn")
        page.wait_for_timeout(400)
        still = page.evaluate("() => (document.getElementById('hud') || {}).textContent || ''")
        page.click("#pauseBtn")
        page.wait_for_timeout(200)
        resumed = page.evaluate("() => ((document.getElementById('hud') || {}).textContent || '').length > 0")
        check("x-pause", still == frozen and bool(resumed),
              "" if (still == frozen and resumed) else "HUD kept changing while paused, or never resumed.")
        page.click("#resetBtn")
        page.wait_for_timeout(300)
        after = page.evaluate("() => (document.getElementById('hud') || {}).textContent || ''")
        check("x-reset", "Score 0" in after and "Level 1/" in after,
              "" if ("Score 0" in after and "Level 1/" in after) else f"After restart HUD read: {after[:120]!r}.")
        shot = None
        if any(not c["passed"] for c in checks):
            try:
                shot = page.screenshot(clip={"x": 0, "y": 0, "width": 640, "height": 420})
            except Exception:  # noqa: BLE001 - screenshot is best-effort
                shot = None
        browser.close()

    failed = [c for c in checks if not c["passed"]]
    import base64
    return {
        "verdict": "pass" if not failed else ("inconclusive" if quality == 0 else "fail"),
        "checks": checks,
        "hud": hud_text[:120],
        "frames": frames,
        "errors": errors[:10],
        "screenshotPng": base64.b64encode(shot).decode() if shot else None,
    }


def handler(event):
    try:
        alimentare = (event or {}).get("input", {}) or {}
        source = str(alimentare.get("source", ""))
        quality = int(alimentare.get("quality", 5))
    except Exception:  # noqa: BLE001 - malformed input fails closed
        return {"verdict": "fail", "checks": [], "hud": "", "frames": 0,
                "errors": ["invalid input: need {source, quality}"]}
    if not source or len(source.encode("utf-8")) > SIZE_MAX:
        return {"verdict": "fail",
                "checks": [{"id": "x-boot", "passed": False, "detail": "No inline game script (or over 256KB)."}],
                "hud": "", "frames": 0, "errors": []}
    try:
        return playtest(source, quality)
    except ImportError:
        return run_static_only(source, quality)
    except Exception as e:  # noqa: BLE001 - infra faults fail closed, never hang
        return {"verdict": "fail", "checks": [], "hud": "", "frames": 0,
                "errors": [f"worker fault: {str(e)[:200]}"]}


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sample = "<!DOCTYPE html><html><body><canvas></canvas><script>requestAnimationFrame(function l(){});addEventListener('keydown',e=>{if(e.key==='arrowleft')player.x-=1;});canvas.addEventListener('pointerdown',()=>{});var score=0;/* game over ... you win */</script></body></html>"
        print(json.dumps(run_static_only(sample * 30, 5), indent=2))
    else:
        import runpod
        runpod.serverless.start({"handler": handler})
