# VCWCODE-NOTES.md — wiring requests (integrator-owned edits; aids document only)

These 4 aids are drop-in snippets. The lane created NEW files only and edited
no existing frontend file. An integrator with edit rights performs the wiring:

## 1. vcwcode-loading-state.html (dashboard loading skeleton)
- Where: dashboard container rendered after `/api/status` resolves
  (e.g. the overview/dashboard page in `v2/desktop/code/frontend/`).
- How: paste the `<div data-vcwcode-loading>` block inside the container's
  initial HTML; remove or `hidden`-toggle it when real data renders.
- CSS is scoped to `[data-vcwcode-loading]`; safe to inline as-is.

## 2. vcwcode-offline-banner.js (offline banner)
- Where: any page that probes `/api/status` (overview, hub, run pages).
- How: add `<div id="vcwcode-offline-banner" hidden></div>` at top of
  `<body>` and `<script src="vcwcode-offline-banner.js"></script>` before
  `</body>`. No dependencies, no app imports.
- Probe runs on load + every 30 s; `window.vcwcodeOfflineProbe()` for manual retry.
- Integrator may restyle `#vcwcode-offline-banner`; keep `role="alert"`.

## 3. vcwcode-key-drawer-hints.md (key drawer wording)
- Where: API-key drawer / settings UI that calls the `test-api-keys`
  path in `main.js`.
- How: copy the per-provider strings verbatim; apply the behavior rules:
  overwrite stored key only on valid or 401/403; keep key on 402/429/5xx;
  show status code; network failure = "key unchanged".
- No code change in this lane — wording reference only.

## 4. vcwcode-engine-note.md (engine selector persistence)
- Where: settings / launch page hosting the engine `<select>`.
- How: implement `#vcwcode-engine-select` per the note; persist to
  `localStorage` key `vcwcode.engine`; default `electron`; discard unknown values.

## Gates
- `node --check` on `vcwcode-offline-banner.js` (see envelope evidence).
- HTML/MD verified by read-back (see envelope evidence).
