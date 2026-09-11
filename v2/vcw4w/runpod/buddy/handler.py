"""Buddy multi-agent serverless worker — one goal fans out to specialist agents.

Dual-mode (golden path 09 invariant): the SAME orchestrate() runs everywhere.
- Pod / local iterate:  python handler.py --selftest   (no keys, no deps)
- Docker local test:    docker run ... python -u handler.py --test_input '{"input":{"goal":"..."}}'
- Serverless:           runpod.serverless.start({"handler": handler})  (queue contract, golden path 23)

Queue contract: handler(event) reads event["input"], returns a plain dict.
This worker needs NO GPU — it calls OpenRouter over HTTPS (or falls back
offline). Deploy it on the cheapest CPU workers, min 0 so it scales to zero.

Env (serverless workers only; everything degrades without them):
  OPENROUTER_API_KEY — live OpenRouter brains. Without it every specialist
                       returns a labelled offline fallback (still a valid pack).
  OPENROUTER_MODEL   — override model (default below).
"""

import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = os.environ.get("OPENROUTER_MODEL") or "meta-llama/llama-4-scout-17b-16e-instruct"
TIMEOUT_S = 20

# (specialist, play, system, user-template lambda-kind, max_tokens)
SYSTEMS = {
    "voice": "You write 4weird NPC voice lines. Exactly 3 numbered lines under 14 words each. Playful, clean.",
    "hype": "You are the 4weird hype caster. 3-4 shouted sentences, clean, end with one fair tip.",
    "lore": "You keep the 4weird bible. 5 sentences: origin, quirk, rivalry, motto, mystery. Family-friendly.",
    "sfx": "You write text-to-SFX prompts. 3 prompts: <sound> + <material> + <space> + <duration>. No music.",
    "coach": "You are the tutorial ghost. One hint in 2 sentences max. Never the full solution.",
}


def clean(value, limit=800):
    text = str(value if value is not None else "").replace("\n", " ").strip()
    while "  " in text:
        text = text.replace("  ", " ")
    return text[:limit] or "(no input provided)"


def plan_specialists(goal_text):
    t = str(goal_text or "").lower()
    picked = ["coach"]

    def want(spec_id, *words):
        if len(picked) < 4 and any(w in t for w in words) and spec_id not in picked:
            picked.append(spec_id)

    want("voice", "voice", "say", "speak", "narrat", "dub", "announce", "shout")
    want("hype", "hype", "victory", "win", "score", "boss", "goal", "clutch", "comeback")
    want("lore", "lore", "world", "story", "character", "backstory", "bible", "faction")
    want("sfx", "sfx", "sound", "boom", "zap", "explosion", "ding", "whoosh")
    return picked


def fallback_text(spec_id, goal):
    snippet = clean(goal, 140)
    if spec_id == "sfx":
        return "1. soft UI click, plastic, small room, 0.5s\n2. deep dungeon thud, stone, large cave, 1.2s\n3. bright coin shimmer, metal, close-up, 0.8s"
    return "[offline %s] Free local take on \"%s\". Set OPENROUTER_API_KEY for the live brain." % (spec_id, snippet)


def is_usable_key(key):
    k = str(key or "").strip()
    return bool(k) and "your-openrouter" not in k and "your-meta-or-openrouter" not in k


def call_openrouter(system, user, key, model):
    body = json.dumps(
        {
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "max_tokens": 180,
            "temperature": 0.8,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        OPENROUTER_ENDPOINT,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer %s" % key,
            "HTTP-Referer": "https://github.com/mattyjacks/4weird",
            "X-Title": "4weird VibeCodeWorker",
        },
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as res:
        payload = json.loads(res.read().decode("utf-8"))
    choices = payload.get("choices") or []
    content = ((choices[0] or {}).get("message") or {}).get("content") or "" if choices else ""
    if isinstance(content, list):
        content = " ".join(str(p) for p in content)
    return str(content).strip()[:2000]


def run_specialist(spec_id, goal, context, key, model):
    bits = [clean(goal, 500)]
    if context.get("gameTitle"):
        bits.append("game: %s" % clean(context["gameTitle"], 80))
    if context.get("screenText"):
        bits.append("screen: %s" % clean(context["screenText"], 300))
    if isinstance(context.get("score"), (int, float)):
        bits.append("score: %s" % context["score"])
    user = " | ".join(bits)[:900]
    if not key:
        return {"specialist": spec_id, "text": fallback_text(spec_id, goal), "fallback": True}
    try:
        text = call_openrouter(SYSTEMS[spec_id], user, key, model)
        if not text:
            raise ValueError("empty completion")
        return {"specialist": spec_id, "text": text, "fallback": False}
    except Exception as exc:
        print("specialist %s live call failed: %s" % (spec_id, str(exc)[:120]), flush=True)
        return {"specialist": spec_id, "text": fallback_text(spec_id, goal), "fallback": True}


def orchestrate(event_input):
    data = event_input if isinstance(event_input, dict) else {}
    goal = clean(data.get("goal") or data.get("prompt") or data.get("input"), 500)
    context = {
        "gameTitle": clean(data.get("gameTitle") or data.get("game_title"), 80),
        "screenText": clean(data.get("screenText") or data.get("screen_text"), 300),
        "score": data.get("score"),
    }
    key = os.environ.get("OPENROUTER_API_KEY", "")
    key = key if is_usable_key(key) else ""
    model = os.environ.get("OPENROUTER_MODEL") or DEFAULT_MODEL
    specialists = plan_specialists(goal)

    with ThreadPoolExecutor(max_workers=min(4, len(specialists))) as pool:
        futures = {s: pool.submit(run_specialist, s, goal, context, key, model) for s in specialists}
        results = [futures[s].result(timeout=TIMEOUT_S + 10) for s in specialists]

    live = [r for r in results if not r["fallback"]]
    by_id = {r["specialist"]: r["text"] for r in results}
    reply = (
        (next((r["text"] for r in live if r["specialist"] == "coach"), None))
        or (next((r["text"] for r in live if r["specialist"] == "voice"), None))
        or (live[0]["text"] if live else results[0]["text"])
    )
    return {
        "goal": goal,
        "reply": reply,
        "brain": "openrouter" if key else "offline",
        "model": model if key else "none",
        "specialists": results,
        "fallbackCount": sum(1 for r in results if r["fallback"]),
        "voiceLines": by_id.get("voice", ""),
        "sfxPrompts": by_id.get("sfx", ""),
        "loreNote": by_id.get("lore", ""),
    }


def handler(event):
    """Runpod queue contract: read event['input'], return a plain dict."""
    try:
        data = (event or {}).get("input", {}) if isinstance(event, dict) else {}
        return orchestrate(data)
    except Exception as exc:
        return {"error": "orchestrator failed: %s" % str(exc)[:200], "fallbackCount": 0, "specialists": []}


def selftest():
    pack = orchestrate({"goal": "boss victory needs voice lines and hype", "gameTitle": "Gravegain", "score": 99})
    assert pack["goal"], "goal missing"
    assert pack["reply"], "reply missing"
    assert len(pack["specialists"]) >= 1, "no specialists ran"
    assert pack["fallbackCount"] == len(pack["specialists"]), "selftest must run fully offline"
    assert pack["brain"] == "offline", "selftest must not need a key"
    assert pack["voiceLines"], "voiceLines missing"
    print("SELFTEST_OK: %d specialists, all offline fallback, pack shape valid." % len(pack["specialists"]), flush=True)


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        try:
            import runpod  # noqa: F401 — serverless SDK, in requirements.txt
        except ImportError:
            print("The 'runpod' package is not installed. For the offline check run: python handler.py --selftest", flush=True)
            print("In the Docker image (requirements.txt installed) re-run with --test_input '<json>'.", flush=True)
            sys.exit(2)
        import runpod as _runpod

        _runpod.serverless.start({"handler": handler})
