# vcwcode-key-drawer-hints.md — API key drawer state wording

Matches `main.js` test-api-keys semantics used by the desktop key drawer:

- **401 / 403 → bad key.** Key is rejected. Prompt user to replace it.
- **402 / 429 / 5xx → keep key.** Key itself is fine; the failure is quota,
  rate-limit, or server-side. Do NOT tell the user the key is invalid.

## Per-provider copy (use verbatim)

### OpenAI
- Valid: "OpenAI key verified."
- Invalid (401/403): "OpenAI key rejected (401/403). Paste a new key — the old one is not saved as valid."
- Quota/rate/server (402/429/5xx): "OpenAI key looks fine — the test hit a quota, rate-limit, or server error. Key kept."

### Anthropic
- Valid: "Anthropic key verified."
- Invalid (401/403): "Anthropic key rejected (401/403). Paste a new key — the old one is not saved as valid."
- Quota/rate/server (402/429/5xx): "Anthropic key looks fine — the test hit a quota, rate-limit, or server error. Key kept."

### Runpod
- Valid: "Runpod key verified."
- Invalid (401/403): "Runpod key rejected (401/403). Paste a new key — the old one is not saved as valid."
- Quota/rate/server (402/429/5xx): "Runpod key looks fine — the test hit a quota, rate-limit, or server error. Key kept."

## Drawer behavior rules
1. Only overwrite the stored key on Valid or Invalid. Never overwrite on 402/429/5xx.
2. Show the HTTP status code alongside the message (e.g. "…(429)…") so users can distinguish rate-limit from bad-key.
3. Network failure (fetch threw / offline): "Could not reach the test endpoint — key unchanged. Check connection and retry." (No validity judgment.)
