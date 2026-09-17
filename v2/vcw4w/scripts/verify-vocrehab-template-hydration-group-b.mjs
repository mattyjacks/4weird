import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const [loader, phone, punch, tools, resume] = await Promise.all([
  read("components/vocrehab/use-vocrehab-template-state.ts"),
  read("components/vocrehab/vocrehab-game-phone-greeting.tsx"),
  read("components/vocrehab/vocrehab-game-time-punch.tsx"),
  read("components/vocrehab/vocrehab-game-tool-match.tsx"),
  read("components/vocrehab/vocrehab-game-resume-rescue.tsx"),
]);

assert.match(loader, /savedStateId/);
assert.match(loader, /\/api\/vocrehab\/saved-states/);
assert.match(loader, /row\.game_id !== gameId/);
assert.match(loader, /kid_id/);
assert.match(phone, /template\.state\?\.calls/);
assert.match(phone, /recallAnswer/);
assert.match(punch, /template\.state\?\.tasks/);
assert.match(punch, /shiftDurationSec/);
assert.match(punch, /graceAtSec/);
assert.match(punch, /graceDurationSec/);
assert.match(tools, /template\.state\?\.jobs/);
assert.match(tools, /toolAnswer/);
assert.match(resume, /template\.state\?\.lines/);
assert.match(resume, /vocrehabTemplateState=\{vocrehabRunProps\.vocrehabTemplateState\}/);

console.log("VocRehab template hydration (phone, time-punch, tool-match, resume-rescue): passed");
