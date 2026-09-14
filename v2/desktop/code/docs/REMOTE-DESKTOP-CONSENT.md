# Remote Desktop — Consent-First Design

> Module: `src/main_process/remote_desktop.js` (main-process, dependency-free).
> Rule #1: **no silent takeover, ever.** No remote party can observe or drive
> this desktop without a live, in-person user consent grant. Everything else
> fails closed.

## 1. Threat model

| Threat | Mitigation |
|---|---|
| Malicious / compromised website at `/terminal` or virtual-desktop page requests control silently | `requestControl()` creates only a `pending-consent` record. Zero pixels / zero input flow until `grantConsent({ userConsented: true, consentProof })` from a real user gesture. |
| Renderer / website forges the consent flag | Flag alone is insufficient. `grantConsent` requires `userConsented === true` **and** a non-empty `consentProof` string (gesture descriptor) that only the main-process dialog path can produce. Integrator must call it solely from the dialog "Allow" handler. |
| Token theft / replay | Token is 192-bit random, single-use, 5-min TTL, bound to one `requesterId`. `redeemToken` consumes it; replay, expiry, or requester mismatch => deny + audit. |
| Scope creep (attacker asks for shell/exec, file read, clipboard) | Allow-list gate: only `screenshot` and `input` exist. `authorizeAction()` denies anything else. Input is sub-scoped (`mouse-move`, `mouse-click`, `key-press`, `scroll`); anything outside `inputAllow` denies. |
| Forgotten / abandoned session stays open | Sessions have TTL (default 30 min, cap 2 h), user can revoke anytime, `revokeAll()` on lock/logout/master-off. Expiry is enforced inside `authorizeAction`/`getSession` (fail-closed), not by a sweeper. |
| Restart persistence attack (consent survives reboot) | All state is in-memory only. Restart = no sessions, no tokens, no pending requests. Consent never touches disk. |
| Audit blindness (abuse leaves no trace) | Every grant/deny/action/revoke/expiry appends a structured audit line (`getAuditLog()` / `onAudit()`). Audit-sink failure never opens the gate (try/catch). |
| Main-process compromise via auto-start | Module has **no side effects on require** and registers no IPC/global listeners itself. No auto-start. Wiring is the integrator's explicit code (see §4). |

Out of scope for this module (integrator responsibilities): actual pixel
capture and input injection backends, dialog window UI, IPC transport
auth, rate-limiting the request endpoint, persisting audit lines to disk.

## 2. Consent flow

```
requester (website /terminal, virtual desktop)
  │  requestControl({ requesterId, actions: ['screenshot','input'] })
  ▼
PENDING request (no access) ──► audit: request.created
  │
  │  desktop shows modal: "Allow <label> to view screen / send input?
  │  [Allow once 30 min] [Deny]"  (+ scope checkboxes)
  ▼
USER clicks Allow (in person) ──► main process calls
  grantConsent({ requestId, userConsented: true,
                 consentProof: 'dialog:allow-button:<iso-ts>' })
  │                                     │
  │ deny / missing proof                │ approved → one-time token (5 min TTL)
  ▼                                     ▼
audit: consent.denied            requester calls redeemToken(token, requesterId)
                                        │
                                        ▼
                                 session LIVE → every action pre-checked via
                                 authorizeAction(sessionId, 'screenshot' | 'input', subAction)
                                        │
                                        ▼
                                 user clicks Revoke / TTL elapses
                                 → revokeSession() / expiry → authorizeAction denies
```

States: `pending-consent → live (redeemed) → revoked | expired`.
There is no other path to `live`. `authorizeAction` additionally requires
`redeemed === true`, so even a granted-but-unredeemed session cannot act.

## 3. Token handling

- Format: 48 hex chars (`crypto.randomBytes(24)`), opaque to requester.
- Single-use: first `redeemToken` consumes; second use => `token already used`.
- TTL: 5 minutes (`DEFAULT_TOKEN_TTL_MS`). Redeem after expiry => denied,
  token deleted.
- Binding: `redeemToken(token, requesterId)` must match the `requesterId`
  from `requestControl`; mismatch => denied (fail-closed).
- Transport: integrator must deliver the token only to the approved
  requester context (e.g. reply over the already-authenticated IPC/WS
  channel that made the request, or render it as a one-time pairing code
  the user reads across). Never log tokens, never put them in URLs that
  persist (history), prefer `postMessage`/IPC payload over query params.
- Sessions outlive tokens: token is only the admission ticket; ongoing
  authorization uses `sessionId + authorizeAction`, bounded by session TTL.

## 4. How website /terminal or virtual desktop requests control

1. Front-end sends a control-request message (integrator-defined IPC route,
   e.g. `remote-desktop:request`) with `{ requesterId, actions, inputAllow }`.
   Main calls `requestControl()` → returns `{ requestId }` (or deny reason).
2. Main shows the consent dialog (see §5) listing requester label + exact
   scopes. **No pre-approval, no "remember forever" checkbox** in v1 —
   every session needs a fresh click.
3. On Allow, main calls `grantConsent({ requestId, userConsented: true,
   consentProof })` → returns `{ token, sessionId }`. Main hands `token`
   to the approved requester only.
4. Requester redeems (`redeemToken`) → session live. Before **each**
   screenshot grab or input injection, main calls
   `authorizeAction(sessionId, action, subAction)` and proceeds only on
   `{ ok: true }`.
5. Revocation (§5) flips the session to revoked; further `authorizeAction`
   calls deny.

## 5. Revocation + UI requirements for integrator

- A **persistent indicator** (tray icon state / title-bar pill, e.g.
  "● Sharing screen with <label>") must be visible for the whole live
  session, with a one-click **Revoke** affordance calling `revokeSession()`.
- Settings / toggle: a master "Remote control" kill-switch calling
  `revokeAll('master-toggle-off')`. Toggling it off must also block new
  `requestControl` dialogs until re-enabled (integrator-side flag).
- Lock/logout/app-quit must call `revokeAll()` — no session survives these.
- Audit view: surface `getAuditLog()` (or `onAudit` stream) in a
  diagnostics page so the user can see what was allowed/denied and when.

## 6. Fail-closed checklist (all enforced in module)

- `require()` alone grants nothing (no listeners, no timers, no network).
- Unknown / missing / expired / consumed token → deny.
- Unknown / expired / revoked / unredeemed session → deny.
- Action outside consented `actions`, or input sub-action outside
  `inputAllow` → deny.
- `grantConsent` with `userConsented !== true` or missing `consentProof` → deny.
- Empty `actions` array or non-allow-listed action at request time → deny.
- Audit sink throwing → gate stays closed.

## 7. Testing

```bash
node --check src/main_process/remote_desktop.js   # from v2/desktop/code
```

Manual smoke (node REPL, no Electron needed):

```js
const rd = require('./src/main_process/remote_desktop.js');
const r = rd.requestControl({ requesterId: 'site:/terminal', actions: ['screenshot','input'] });
const g = rd.grantConsent({ requestId: r.requestId, userConsented: true, consentProof: 'dialog:allow-button:test' });
console.log(rd.authorizeAction(g.sessionId, 'screenshot')); // deny (not redeemed yet)
console.log(rd.redeemToken(g.token, 'site:/terminal'));     // redeem
console.log(rd.authorizeAction(g.sessionId, 'screenshot')); // allow
console.log(rd.authorizeAction(g.sessionId, 'shell'));      // deny
rd.revokeSession(g.sessionId, 'test revoke');
console.log(rd.authorizeAction(g.sessionId, 'screenshot')); // deny
console.log(rd.getAuditLog().map(l => l.event));
rd._resetForTests();
```
