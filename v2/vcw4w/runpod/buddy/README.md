# Buddy multi-agent — desktop, web, Runpod pod, Runpod Serverless

One goal fans out to specialist agents (voice, hype, lore, sfx, coach, quest,
herald — each an OpenRouter play) and merges a super-pack. Same orchestration,
four runtimes. Every specialist degrades to a labelled offline fallback, so any
runtime works with zero keys.

| Runtime | Entry point | Brain |
| --- | --- | --- |
| Desktop | `v2/desktop/ai/vibecodeworker/lib/buddy_orchestrator.js` (`runOrchestrator`) | `OPENROUTER_API_KEY` or offline |
| Web | `v2/vcw4w/lib/buddy-orchestrator.ts` + `/api/openrouter-plays` + smart `/api/buddy/chat` | OpenAI ↔ OpenRouter auto, Fal hints optional |
| Runpod pod (dev/iterate) | this `runpod/buddy/handler.py` via `--selftest` on any pod | offline or `OPENROUTER_API_KEY` |
| Runpod Serverless | same `handler.py` as a queue worker (below) | `OPENROUTER_API_KEY` env on endpoint |

## 0. Prereqs (all Runpod steps)

```bash
export RUNPOD_API_KEY=<key>   # https://console.runpod.io/user/settings
runpodctl user                # succeeds => key valid
docker login                  # registry you can push to (substitute <namespace>)
```

## 1. No-spend checks (repo side)

```bash
# offline pack, no keys, no network, no runpod package needed:
python runpod/buddy/handler.py --selftest
# => SELFTEST_OK: N specialists, all offline fallback, pack shape valid.

node scripts/verify-smart-buddy.mjs            # static contract checks (web/orchestrator/runpod)
node scripts/verify-openrouter-plays.mjs        # 25 plays intact
```

Desktop:

```bash
node tests/test_buddy_orchestrator.js   # planner, fan-out, fallback, timeout
node tests/test_openrouter_plays.js     # 25 plays, offline + mocked-live
```

## 2. Build + push the serverless image (needs Docker only)

Runpod hosts are x86_64 — always `--platform=linux/amd64`:

```bash
cd v2/vcw4w
docker buildx build --platform linux/amd64 \
  -f runpod/buddy/Dockerfile -t <namespace>/buddy-orchestrator:v1 --push runpod/buddy
```

Local job test (no spend — runs the image on your machine):

```bash
docker run --rm --platform linux/amd64 <namespace>/buddy-orchestrator:v1 \
  python -u handler.py --test_input '{"input":{"goal":"boss victory needs voice lines and hype","gameTitle":"Gravegain"}}'
```

## 3. Iterate on a cheap pod first (optional, billable while running)

```bash
runpodctl pod create --name buddy-dev --compute-type CPU \
  --terminate-after <RFC3339-in-~1h> --ssh
runpodctl pod get <pod-id>   # poll until the ssh block has ip/port
# copy handler, install one dep, run the offline self-test, edit, repeat:
#   python handler.py --selftest
runpodctl pod delete <pod-id>   # or: runpodctl pod stop <pod-id>
```

## 4. Deploy the CPU endpoint (cheapest class — no GPU needed)

```bash
runpodctl template create --name buddy-orchestrator \
  --image <namespace>/buddy-orchestrator:v1 --serverless --container-disk-in-gb 5
# -> template id, e.g. <template-id>

runpodctl serverless create --template-id <template-id> \
  --compute-type CPU --instance-id cpu3g-1-4 \
  --name buddy-orchestrator-ep --workers-min 0 --workers-max 2 --idle-timeout 5 \
  --env OPENROUTER_API_KEY=$OPENROUTER_API_KEY
# -> endpoint id, e.g. <endpoint-id>
```

Cost-guard: `--workers-min 0` scales to zero when idle; `--idle-timeout 5`
reaps workers fast; prefer CPU (this worker only does HTTPS + text merge).
Check current CPU worker pricing in the console before creating — state it in
the deploy log. Nothing here needs a GPU.

## 5. Invoke from outside (the verify step — status alone is not proof)

```bash
KEY="${RUNPOD_API_KEY}"
curl -s -X POST "https://api.runpod.ai/v2/<endpoint-id>/runsync" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"input":{"goal":"boss victory needs voice lines and hype","gameTitle":"Gravegain","score":99}}'
# expect: {"status":"COMPLETED", ..., "output":{"goal":"...","reply":"...","specialists":[...],"fallbackCount":0,...}}
```

Long jobs: POST `/run` instead (returns job id), then poll `/status/<id>`.
Debug a stuck job with worker logs (`runpodctl serverless logs <endpoint-id>`)
— a crash-looping worker still reports RUNNING, so logs are the authority.

## 6. Teardown

```bash
runpodctl serverless delete <endpoint-id>
```

## Job shapes

In: `{"goal":"...","gameTitle":"...","screenText":"...","score":99}`
Out: `{"goal","reply","brain","model","specialists":[{specialist,text,fallback}],"fallbackCount","voiceLines","sfxPrompts","loreNote"}`
Without `OPENROUTER_API_KEY` on the endpoint: same shape, `brain:"offline"`,
every specialist labelled fallback — valid pack, zero inference spend.
