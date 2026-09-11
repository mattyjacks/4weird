# VibeCodeWorker in the Cloud ☁️ (optional)

VibeCodeWorker runs anywhere Node 22 runs. The headless API server
(`start_api_server.js`) has **zero npm dependencies** and ~50 MB RAM idle,
so the cheapest single-box hosts all work. All state lives in `data/`
(mount a volume/disk so bugs + exports survive restarts).

## Cheap vendor picks (2026 prices, single box)

| Vendor | Box | ~Cost | Notes |
|---|---|---|---|
| **DigitalOcean** (recommended) | Basic droplet 1 vCPU / 1 GB | **$6/mo** | Use `deploy/digitalocean-user-data.sh` as User Data; fully automatic |
| Hetzner | CX22 2 vCPU / 4 GB | ~€4.15/mo | Best value; manual Docker install, then cloud compose |
| AWS Lightsail | 1 GB bundle | $5/mo | Static IP included; manual Docker install |
| Fly.io | shared-1x 512 MB + 1 GB volume | ~$5-7/mo | `deploy/fly.toml`; sleeps to zero when idle |
| Render | Starter + 1 GB disk | ~$7/mo | `deploy/render.yaml` Blueprint; easiest click-deploy |

## Option A - DigitalOcean, automatic (2 minutes)

1. Create Droplet → Ubuntu 24.04 → **$6 Basic** → Authentication (SSH key) →
   paste `deploy/digitalocean-user-data.sh` into **User Data**.
2. Wait ~3-5 min (Docker install + build). Then:
   ```bash
   ssh root@<droplet-ip> 'cat /opt/vibecodeworker/.env'   # grab VIBE_API_TOKEN
   curl http://<droplet-ip>:42069/api/status
   ```
3. Call the API with the token:
   ```bash
   curl -H "X-Vibe-Auth: <token>" http://<droplet-ip>:42069/api/dashboard
   ```

## Option B - Any Docker box (Hetzner / Lightsail / home server)

```bash
git clone https://github.com/mattyjacks/4weird.git /opt/vibecodeworker/repo
cp /opt/vibecodeworker/repo/website/v1/ai/vibecodeworker/deploy/docker-compose.cloud.yml /opt/vibecodeworker/docker-compose.yml
cd /opt/vibecodeworker
echo "VIBE_API_TOKEN=$(openssl rand -hex 24)" > .env
chmod 600 .env
docker compose up -d --build
curl http://localhost:42069/api/status
```

With the OpenCode sidecar (persistent `opencode serve`, no CLI cold boot per fix):

```bash
docker compose --profile opencode up -d --build
# then tell the worker to use it:
# OPENCODE_MODE=server OPENCODE_SERVER_URL=http://opencode-server:4096
```

## Option C - Fly.io / Render (no server to babysit)

- **Fly:** `fly volumes create vibe_data --size 1`, `fly secrets set VIBE_API_TOKEN=…`,
  `fly deploy` (uses `deploy/fly.toml`). Data persists on the volume.
- **Render:** New → Blueprint → select repo (`deploy/render.yaml`); token is
  auto-generated; read it from the dashboard.

## Environment knobs

| Var | Default | Purpose |
|---|---|---|
| `PORT` / `HOST` | `42069` / `0.0.0.0` | Bind (keep `0.0.0.0` in containers) |
| `VIBE_API_TOKEN` | *(empty = open)* | **Set this on any internet-facing box.** Required as `X-Vibe-Auth` header or `Bearer` token on all mutating `/api` calls; health/dashboard GETs stay open for probes |
| `OPENCODE_ENABLED` | `false` | Master switch for the OpenCode bridge |
| `OPENCODE_MODE` | `cli` | `cli` (`opencode run` per fix) or `server` (long-lived `opencode serve`) |
| `OPENCODE_MODEL` / `OPENCODE_AGENT` | OpenCode defaults / `build` | Pin model + agent for fix runs |
| `OPENCODE_SERVER_URL` / `OPENCODE_SERVER_PASSWORD` | `http://127.0.0.1:4096` | Server-mode connection (+ basic auth) |
| `OPENCODE_SERVER_PASSWORD` | *(empty)* | Also used by the sidecar compose service |

## Remote self-healing across boxes (the cool part)

Run the playtests on one box, fix on another; or fix locally and verify on the droplet:

```bash
# Start a heal loop locally, but execute each test round on the droplet:
curl -H "X-Vibe-Auth: <local-token>" -H "Content-Type: application/json" \
  -d '{"gameId":"gravegain3d","maxIterations":3,
       "instance":{"remoteUrl":"http://<droplet-ip>:42069","token":"<droplet-token>"}}' \
  http://127.0.0.1:42069/api/opencode/heal
# → {"runId":"heal_..."} ; poll GET /api/opencode/heal/<runId>
```

Or skip the middleman - SSH into the box and heal there with the fresh-process
worker (`heal_worker.js` runs each test round in its own process):

```bash
node heal_worker.js --test-command "node test_vibecodeworker.js" --dir /app/website/v1/ai/vibecodeworker
```

## Security checklist for internet boxes

- [ ] `VIBE_API_TOKEN` set (compose refuses to start without it) and stored secret-side only
- [ ] Firewall allows only 22 + 42069 (`ufw` rules are in the user-data script)
- [ ] `heal-test` hook only accepts test/bench/lint/audit commands (enforced in code)
- [ ] File patches can never escape the workspace or touch secrets/binaries (enforced in code)
- [ ] For teams: put Caddy/Nginx + TLS in front, or use Fly/Render (HTTPS built in)
