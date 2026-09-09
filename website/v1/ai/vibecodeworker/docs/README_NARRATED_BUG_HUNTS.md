# Narrated headful bug-hunt sessions

VibeCodeWorker can record a visible browser game when Electron's GPU process
is unavailable. The browser bridge captures the actual game canvas, records
real pointer/keyboard events and page errors, then MediaMogul transcodes the
capture.

1. Start the local bridge:

   `npm run record:browser-server`

2. Open one of these URLs in a visible browser tab and play the game normally:

   - `http://127.0.0.1:8914/games/html/aiwhackamole/index.html?slowmo=3&record=1&recordName=aiwhackamole-live&recordSeconds=18`
   - `http://127.0.0.1:8914/games/html/gravegain2d/index.html?record=1&recordName=gravegain2d-live&recordSeconds=22`
   - `http://127.0.0.1:8914/games/html/overtake/index.html?record=1&recordName=overtake-live-fixed&recordSeconds=18`

   The bridge writes a `.webm` and a same-name `.json` manifest under
   `data/browser-captures/`. The manifest is the audit trail: it includes
   every captured input, browser error and recording boundary.

3. Finalize a take after an approved voice is available:

   `npm run record:finalize -- data/browser-captures/<name>.webm "<short narration>"`

   This creates `<name>.mp4` and `<name>.voiceover.wav`. The finalizer fails
   loudly if the configured voice provider returns no audio; it never labels a
   silent file as a narrated recording.

The Overtake session is intentionally useful as a repair demo: the initial
playthrough found an undefined-state initialization error and a canvas taint
that blocked capture. Both are fixed in the game source, and the repaired race
was replayed successfully before capture.
