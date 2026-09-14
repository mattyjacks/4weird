# VocRehab practice seeds — counselor & admin guide

Practice in VocRehab is rehearsal, not an exam. Seeds are the small piece
that makes rehearsal fair: every set shuffles, and any set can replay
exactly. This guide covers the seed bar, replay links, saved seeds, and
the determinism promise. Learner-facing detail also lives under
Docs → VocRehab → Practice seeds.

## The one idea

A seed is a short shareable code (looks like `VRHB-XXXXXX`) that names one
exact shuffle of one game. Same seed + same game + same app version =
the same questions, in the same order, with the same criteria. Every time.

## Random by default

- Open any practice game with no seed and the items shuffle automatically.
- Nothing to turn on, nothing to reset. Each visit is a fresh mix, which
  keeps everyday practice from going stale.
- A fresh shuffle deals a fresh seed, shown in the seed bar. Retrying from
  the results screen shuffles again — retries always count the same.

## Replay with `?seed=`

To freeze a set into one fixed order, put the seed in the page address:

1. Copy the seed from the seed bar (or from a saved run — see below).
2. Open the same game page with `?seed=` plus the code, for example:
   `/vocrehab/play/file-sort?seed=VRHB-K7Q2MD`
3. That order now holds across reloads, devices, and days. Remove the
   `?seed=` part and reload to return to fresh shuffles.

Good uses: check-ins, make-ups, side-by-side comparisons, and re-trying a
hard set to build on wins. A seed read aloud, written on a handout, or
pasted into a message is enough — no account or login needed to hold one.

## The seed bar: copy & load

Every game surface shows a one-line seed chip:

- **Seed display** — the run's code (e.g. `seed VRHB-K7Q2MD`). Quote this in
  case notes so anyone can reconstruct the exact set later.
- **Copy replay link** — copies the full game address with `?seed=`
  attached. Paste it into a message and the learner lands on the identical
  set. If copying is blocked on a device, long-press the seed itself.
- **New shuffle** (where offered) — deals a fresh random set when the
  learner wants variety instead of a replay.

To load a seed someone shares with you: paste the link into a browser, or
type the game address and add `?seed=` plus the code. Check the seed bar
after loading — it should show the code you entered.

## Telemetry carries the seed

Every run's completion event records the seed in its detail, and the run
summary saved to the profile includes the seed field. That means:

- A saved run can always be traced back to the exact set practiced.
- Reviews never have to guess which shuffle a learner saw.
- Exports of run history keep the seed alongside the summary.

## Assessments save includes the seed

When a game result is sent to the profile as an assessment (readiness
kind), the payload carries the game, the score band, and the seed, while
the profile text keeps a strengths-first headline plus supports. The seed
travels with the assessment record, so a counselor opening an old
assessment can replay the identical set from the stored code.

## Pro review shows the seed

Pro session and review surfaces show the seed next to each saved run.
From a review entry, copy the seed (or its replay link) to open the exact
items the learner worked through — what you review is what they practiced.
When writing up a session, include the seed so the next reviewer can pick
up the same set without asking the learner to reproduce it.

## The determinism promise

- Same seed + same game + same app version = same questions, same order.
- Shuffles, picks, and samples are drawn from a seeded generator keyed by
  the seed — never from an unseeded shuffle. The only randomness allowed
  anywhere near selection is the single random-seed maker; everything else
  derives from the seed.
- If a seed ever replays differently, note the game, the seed, and the app
  version — a content or code change between runs is the expected cause,
  and the pair replays identically once both sides run the same version.

## Quick recipes

- **Assign a make-up set:** copy a replay link from your own run and send
  it. The learner opens it and practices exactly what was assigned.
- **Compare two attempts fairly:** have the learner replay the same
  `?seed=` link for attempt two. Same items, so progress is real.
- **Log a session:** record game + seed + date in your case notes or
  export. That triple reconstructs the session any time.
- **Reset to variety:** remove `?seed=` from the address and reload.

## Troubleshooting

- **Order changed on reload:** the address lost its `?seed=` part, or the
  code was edited. Re-add the exact code (prefix included) and reload.
- **Seed looks rejected:** seeds are short codes after the `VRHB-` prefix.
  Check for swapped characters before assuming a bug.
- **Different items than the learner saw:** confirm you opened the same
  game page with the same seed, on the same app version.
- **Scores differ on the same seed:** expected — the items are fixed, the
  performance is the learner's. Same set, new attempt, counts the same.

Practice stays strengths-first throughout: scores highlight what went well
first, help-seeking is a work strength, and nothing in practice affects
benefits or eligibility, ever.
