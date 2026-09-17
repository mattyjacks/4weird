# Vendor Services (OpenRouter + Outscraper)

66 vendored ops across 7 modules, registered in `lib/vendor-catalog.ts`
(`VENDOR_SERVICES` + `vendorServiceCount()` + `findVendorService`).
Prices are gross Vibe Coins (100 coins = $1.00).

| Vendor module      | Ops | Served by |
| ------------------ | --: | --------- |
| openrouter-chat    |  12 | POST /api/openrouter-vendor/generate |
| openrouter-agent   |  12 | POST /api/openrouter-vendor/generate |
| openrouter-meta    |   8 | POST /api/openrouter-vendor/generate |
| outscraper-maps    |  10 | POST /api/outscraper/search |
| outscraper-reviews |   8 | POST /api/outscraper/search |
| outscraper-search  |   8 | POST /api/outscraper/search |
| outscraper-leads   |   8 | POST /api/outscraper/search |
| **Total**          | **66** | (>= 50 requirement met) |

## Coin rule

Every price INCLUDES the 25% platform cut — never added on top. The wallet
is debited the gross; the ledger splits it 25% platform / 75% provider.

## Metering

Debit-first, fail-closed — never free:

1. Balance pre-check (live): both `POST /api/openrouter-vendor/generate`
   and `POST /api/outscraper/search` call `get_my_coin_balance` against
   the gross quote; short balances get `402 Insufficient Vibe Coin balance`.
2. Debit-first via `meter_openrouter_usage` / `meter_outscraper_usage`:
   both routes call their RPC (with `p_vendor/p_game/p_op/p_qty/p_source`)
   AFTER the balance pre-check but BEFORE the provider fetch. A failed
   meter fails the run (fail-closed); `insufficient balance` maps to 402.
   The receipt (incl. `usage_id`) lands in the 201 response as `meter`.
3. Refund-on-failure: provider failures AFTER the debit call
   `refund_vendor_usage` (full gross back, row marked `refunded_at`;
   double refunds raise `already refunded`). A failed refund keeps the
   debit and the 502 says `Charge NOT refunded — contact support`.
   Rollups go NET (refunded rows excluded) with `refunded_charges` /
   `refunded_coins` counters. Usage rollups: `GET /api/openrouter-vendor/usage`
   and `GET /api/outscraper/usage` expose the `my_*_usage` rollups (reads free).

Landed: `supabase/migrations/20261201000000_openrouter_metering.sql`
(`openrouter_usage` + `meter_openrouter_usage()` + `my_openrouter_usage()`),
`20261201000001_outscraper_metering.sql` (`outscraper_usage` +
`meter_outscraper_usage()` + `my_outscraper_usage()`), and
`20261202000000_vendor_usage_refunds.sql` (`refund_vendor_usage()` +
`usage_id` receipts + net rollups). SQL CASE arms cover
all 32 OpenRouter + 34 Outscraper op keys; all three migrations were
executed against scratch Postgres 16 (meter → refund → double-refund /
cross-user / insufficient / invalid-op cases green) — see
`scripts/verify-vendor-metering.mjs`.

## Env keys (server-only, never `NEXT_PUBLIC_`)

- `OPENROUTER_API_KEY` — OpenRouter chat/agent/meta ops (already in `.env.example`).
- `OUTSCRAPER_API_KEY` — Outscraper maps/reviews/search/leads ops.

## API routes

- `GET /api/openrouter-vendor/ops` — list chat/agent/meta ops + configured flag.
- `POST /api/openrouter-vendor/generate` — run an op (`{ vendor, op, input }`).
- `GET /api/outscraper/ops` — list maps/reviews/search/leads ops + configured flag.
- `POST /api/outscraper/search` — run an op (`{ vendor, op, input }`).

## Unconfigured behavior (honest)

Without the key, the routes return `started: false` + `not-configured`
(or a labelled free local fallback where noted) — never faked, never metered.

## Registry notes

- `lib/cloud-catalog.ts` was intentionally left untouched: its entries feed
  `GET /api/cloud/services` and billing UI, so 66 vendor rows do not belong there.
- `lib/vendor-catalog.ts` probes the 7 sibling modules with a tolerant loader
  (absent modules fall back to the static table), so the count stays >= 66
  whether or not the sibling modules have landed yet.
# Age eligibility audit (2026-09-16)

This section supersedes earlier age-coverage statements in this file. Live age policy is in `lib/vendor-eligibility.ts`; server routes call it before provider requests. It reads account age bands only (no date of birth). A valid child-session overlay uses the child's own age band and the parent's feature allowlist. Parent permission cannot override a provider's adult-only age terms.

Current guarded external providers and major call paths:

- OpenRouter (18+): `/api/openrouter-vendor/generate`, `/api/openrouter-plays`, VCW DebugPlay; server routes reject Google/Gemini model IDs, including configured models.
- fal.ai (18+/age of majority): `/api/fal/generate`, status polling, and VCW run actions that offer fal tool hints.
- RunPod: GPU/serverless, booking, Desktop/VCW/Blender provisioning and management paths.
- DigitalOcean: account status and usage sync. There is no live DO provisioning path in this app currently.
- OpenAI: Buddy chat/voice, search, code audit, feedback enrichment, swarm chat, VocRehab roleplay, and moderation workflow. Server user-facing paths require Adult-band because provider-specific minor consent is not recorded.
- DeepSeek and Meta API: direct desktop BYOK providers now require a linked 4weird account and Adult-band eligibility before prompts are sent.
- ElevenLabs: server routes and desktop TTS/voice calls require Adult-band eligibility.
- Meshy: generation and status; Adult-band only pending a verified minor-consent path.
- Bouncer: status, single/batch and CRM verification; Adult-band only.
- Outscraper: search; Adult-band only.
- Pexels: search and curated feed; Adult-band only in this app pending regional consent support.
- EasyDNC: single/batch checks (including BYOK) require Adult-band sign-in. Certificates require owner authentication and are owner-scoped.
- Desktop direct providers: OpenAI, OpenRouter, DeepSeek, Meta Llama API, ElevenLabs, fal.ai, and RunPod calls require a linked 4weird bot key with `identity:read` and Adult-band eligibility. Gemini API is blocked regardless of age. OpenRouter/Gemini model IDs are blocked in the official desktop client as well as server routes. Local Ollama calls do not leave the device; installer/model downloads contact Ollama, GitHub, Google, and Ubuntu mirrors.

The `scripts/verify-vendor-eligibility.mjs` verifier checks major sensitive call paths, not every deployment, platform, client, or provider contract. Continue to review it whenever adding an external call.

## Provider terms and unresolved items

- [OpenRouter Terms](https://openrouter.ai/terms) require 18+. OpenRouter forwards requests to an operator-selected model/provider; server routes reject Google/Gemini model IDs. Other configured or caller-selected models remain subject to their provider's terms.
- [fal.ai Terms](https://fal.ai/legal/terms-of-service) and [AUP](https://fal.ai/legal/acceptable-use-policy) impose adult-end-user constraints and restrictions on sensitive personal data. Do not submit identifiable VocRehab, health, disability, or child case data.
- [RunPod Terms](https://www.runpod.io/legal/terms-of-service) require legal capacity; [RunPod Privacy](https://www.runpod.io/legal/privacy-policy) and deployment purpose need continued review.
- [DigitalOcean Terms §1.2](https://www.digitalocean.com/legal/terms-of-service-agreement) permit limited legal-consent paths; this app records none, so its active account calls are Adult-band only.
- [OpenAI Services Agreement](https://openai.com/policies/services-agreement/) permits minors only with parent/guardian consent. No provider-specific consent is recorded, so integrated user-facing server paths are Adult-band only. [Usage policies](https://openai.com/policies/usage-policies/) also apply.
- [DeepSeek Terms of Use](https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html) permit some minor use with guardian consent; the app applies an Adult-band-only rule because it does not record provider-specific consent. The [Open Platform Terms](https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html) make downstream operators responsible for end-user compliance and disclosures. The [Privacy Policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html) says data may be stored in China; the privacy notice warns users before desktop direct use.
- [Meta Llama License](https://ai.meta.com/llama/license/) and [Acceptable Use Policy](https://ai.meta.com/llama/use-policy/) apply to the direct Meta Llama API and models selected through OpenRouter. Direct desktop calls are Adult-band only; model-use limits and required disclosures still apply.
- [ElevenLabs Terms](https://elevenlabs.io/terms-of-use), [API Terms](https://elevenlabs.io/elevenapi-terms), and [Prohibited Use Policy](https://elevenlabs.io/use-policy) apply to desktop/server voice, sound, and music calls. Adult-band only; do not make the service available to a government entity without ElevenLabs' required prior written authorization.
- [Meshy Terms](https://www.meshy.ai/terms-of-use) and [AUP](https://www.meshy.ai/acceptable-use-policy): access is gated to Adult-band pending verified current terms and a recorded consent path.
- [Bouncer Terms](https://www.usebouncer.com/terms-and-conditions/) and [DPA](https://www.usebouncer.com/dpa/) apply to submitted email addresses; non-adults are blocked pending any required consent.
- [Outscraper Terms](https://outscraper.com/terms-of-service/) and [Privacy](https://outscraper.com/privacy-policy/) apply to search inputs and returned public-listing data; results can be incomplete/outdated and need independent review.
- [Pexels API docs](https://www.pexels.com/api/documentation/), [Terms](https://www.pexels.com/terms-of-service/), and [License](https://www.pexels.com/license/) require API attribution/linking and restrict standalone redistribution and bulk collection/model-dataset use.
- [EasyDNC Terms](https://www.easydnc.org/terms.php): users must have authority for submitted phone numbers; results are not a compliance guarantee. Current site feature limits access to Adult-band users.
- [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms) constrain Maps content storage/reuse. Address lookup and Maps routing are paused; coordinate estimates run offline with no Google transfer or Maps-content cache.
- [Anthropic policy](https://www.anthropic.com/policy) adds requirements for child-serving integrations. Desktop cloud-provider calls require a linked 4weird account and pass the server age-eligibility check; local models remain local. BYOK prompts/screenshots/audio go directly from desktop to the chosen provider, and provider-specific model policy review remains necessary.
- Desktop cloud-provider calls fail closed unless linked to a 4weird bot key with `identity:read` scope; the server returns eligibility using the account age band, while the provider key and prompt remain on-device. Gemini is always denied for this mixed-age service. Local models need no age API check.
- OpenCode's integrated CLI/server coding actions are Adult-band only: the bridge checks `/api/bot/vendor-eligibility?vendor=opencode` before passing prompts/workspace content to the local tool. This does not restrict a separately installed OpenCode instance that a user runs outside VibeCodeWorker.
- Served copies checked for bypasses: `v2/desktop/code` (official desktop source), `public/ai/vibecodeworker` (served AI workspace copy), and `public/vibecodeworker-legacy` (legacy web client). The served AI copy now gates OpenAI/OpenRouter/Meta/DeepSeek/Gemini, ElevenLabs, RunPod, and OpenCode calls; the legacy web client checks fal.ai eligibility before both key verification and paid generation. The source verifier covers these guards so an untouched duplicate cannot silently preserve an unguarded route.
- Web app status/dashboard probes use an operator-configured `VCW_SERVICE_URL/health` endpoint without forwarding account, cookie, prompt, or case data; arbitrary compute endpoints can still receive workload inputs. This distinction is in the privacy notice.
- The production Cloudflare account/contract and actual traffic routing are not inspectable from this checkout. Cloudflare's published privacy/terms raise a potential under-18 service-fit issue. Confirm contractual fit with Cloudflare or remove it from processing child traffic before claiming full compliance.
- Runtime/software delivery also contacts GitHub (Godot release metadata and downloads, and worker repository clone), Ollama (installer and model source), Google (worker Chrome package), Ubuntu package mirrors, jsDelivr, cdnjs, esm.sh, Blender.org, Vercel, Supabase, Shopify, Google Analytics/Tag Manager, BotID/Kasada, Supabase auth email, and Discord when those features run. Their privacy and terms are summarized/linked in `/terms` and `/privacy`; customer-specific settings still need account-console confirmation.
- Additional source scan: optional local face control downloads the MediaPipe runtime from jsDelivr and its face-landmarker model from Google Cloud Storage (camera processing stays in-browser); desktop phone pairing sends the short-lived pairing URL to QR Server to render its QR image. The terms/privacy pages now describe these flows, and the QR pairing token should be regenerated after use.
- Additional desktop/remote-play scan: VibeCodeWorker can call a user-installed OpenCode CLI/server; its prompt/source disclosure is controlled by OpenCode and the user-configured model provider. OpenCode's current terms bar under-13 use and require guardian permission for minors; the integrated actions are now Adult-band gated because the app does not collect that permission. A RunPod Xonotic off-site destination is hosted on a third-party `.workers.dev` domain and can use peer-to-peer multiplayer; the legal pages now disclose that destination and its potential direct network exposure. The Xonotic host operator's separate terms/contact remain unverified.
- Shopify Payments merchant account holder must be an adult representative. Checkout is Adult-band only. Only Shopify is integrated for coin purchases; no separate payout provider/cash-out path exists.
- User-configured custom HTTP endpoints, custom OpenAI-compatible URLs, OpenCode remotes, and other endpoints are external recipients chosen by the operator. Their terms and retention vary; only configure endpoints you trust and do not send child or VocRehab case data.
- Verify current account-level settings, signed DPAs, subprocessors, deployment configuration, and retention for Vercel, Cloudflare, Supabase, Shopify/payment processors, analytics, anti-bot, auth email, and Discord in each vendor console. Code alone cannot prove those settings, the active Cloudflare route, or government-entity vendor authorization.

No provider should receive client, health, disability, case, or identifiable-minor information unless the vendor contract, applicable terms, and any required DPA/BAA explicitly support that processing. The current service does not claim HIPAA compliance.
