# GraveGain4D — Smoke Test Checklist

Bridge under test: `engine/savebridge.js` (slug `gravegain4d`, protocol
`{ version: 1 }`). Mirror conventions: gravegain3d overlay-button fullscreen
+ guarded refit; runtime-bridge.js §§1–120 message shapes. No dblclick, no
F-key fullscreen anywhere in this checklist.

Setup: serve the bundle (`/games/gravegain4d/index.html` after
`sync-game-bundles.mjs`), open DevTools console + Network, play inside the
`/games/gravegain4d/play` shell AND standalone (direct index.html).

## 1. Boot / handshake
- [ ] Standalone index.html loads with no 404s (4D math/worlds/missions/
      graphics, savebridge, CSS).
- [ ] In-shell: `ready` posts `{ version: 1, slug: "gravegain4d",
      type: "ready" }`; shell leaves "Loading original HTML runtime..."
      and fetches the cloud save.
- [ ] No console errors on boot (filter: Errors only).

## 2. Putt (hypercube golf)
- [ ] Aim + putt travels through the fold and settles; stroke counter +1.
- [ ] Putt works with mouse/touch AND keyboard aim fallback.
- [ ] Rapid clicking never toggles fullscreen (no dblclick hook).

## 3. W-shift (fold lens)
- [ ] W / Shift fold-lens shifts the visible slice (XW/YW/ZW indicator moves).
- [ ] Fold never strands the ball off-green; unfold returns the prior slice.
- [ ] F key does ability/fold ONLY — never enters/exits fullscreen.

## 4. Rewind (time fork)
- [ ] Rewind restores an earlier tick; history is kept (branch record, not
      delete); strokes/sands update to the rewound values.
- [ ] Rewind at tick 0 is a safe no-op (no throw, no softlock).

## 5. Brane flip
- [ ] Brane flip swaps the active brane; ball + dungeon seed persist.
- [ ] Flip mid-putt neither duplicates the ball nor loses strokes.
- [ ] Snapshot after flip carries the new `brane` value (see §7).

## 6. Mission complete (score path)
- [ ] Finishing a mission fires
      `window.GraveGain4DSaveBridge.missionComplete({ missionId })`.
- [ ] Host receives `score` (`{ version: 1, slug, type: "score" }` with
      missionId/strokes/gold) followed by a `save` (`mission-complete`).
- [ ] Missions list advances; codex unlock (if any) appears in-game.

## 7. Save / load roundtrip (slot 0)
- [ ] Put some state: HP/gold/sands/strokes, mission id, dungeon seed,
      brane, codex unlocks. Call
      `window.GraveGain4DSaveBridge.requestSave("manual-test")`.
- [ ] Host receives `save` with `{ slot: 0, schema_version: 1, data: {
      schema: 1, slug: "gravegain4d",
      player: { hp, maxHp, gold, sands, strokes },
      missionId, dungeonSeed, brane, codex: [...] } }` — all JSON-serializable.
- [ ] Reload: send host `load` with that payload; game applies via
      `window.__gravegain4dSnapshot.set` (or stages
      `window.__gravegain4dPendingLoad` + `fourweird-cloud-load` event);
      HP/gold/sands/strokes + mission + seed + brane + codex all match.
- [ ] Corrupt load (`setSnapshot(null)` / non-JSON) returns false and keeps
      current run playable.

## 8. Shell ratio / letterbox
- [ ] 16:9, 4:3, portrait phone: canvas letterboxes (contain, centered),
      no cropping of HUD/meters, no page scroll.
- [ ] Shell `fullscreen` enter/exit messages toggle the runtime document;
      overlay button `#gravegain4d-fullscreen-btn` works via
      `window.__fourweirdToggleFullscreen` first, native + webkit fallback.
- [ ] `fullscreenchange` refits camera aspect + renderer size (no throw
      pre-init); resize handler does the same.

## 9. Touch controls
- [ ] Phone viewport: aim drag + putt tap + fold-lens buttons all ≥44px,
      no hover-only affordances.
- [ ] Fullscreen exit control reachable by touch (bridge exit button).

## 10. 60fps budget
- [ ] Idle green + active fold hold ~60fps on a mid laptop (perf overlay /
      rAF meter); no per-frame allocations in the putt path.
- [ ] `metering` posts `{ version: 1, slug, type: "metering", bytes }`
      on load + ~3s (shell keeps the max; cached loads report ~0).

## 11. No console errors
- [ ] Full pass (boot → putt → w-shift → rewind → brane flip → mission
      complete → save/load → fullscreen in/out) with zero console errors
      and zero unhandled rejections; bridge `error` posts only on real
      runtime exceptions.
- [ ] Content-mode (`kid`/`teen`/`all`), a11y, pause/resume host messages
      apply (or no-op) without throwing.

## Quick console probes
```js
// snapshot shape
window.GraveGain4DSaveBridge.getSnapshot();
// manual save + score
window.GraveGain4DSaveBridge.requestSave("manual-test");
window.GraveGain4DSaveBridge.missionComplete({ missionId: 1 });
// refit hook (mirrors gg3dRefit registration)
window.GraveGain4DSaveBridge.onRefit(() => console.log("gg4d refit ok"));
```
