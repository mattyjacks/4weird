import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  helper: readFileSync(join(root, "lib/vocrehab-game-template-state.ts"), "utf8"),
  sort: readFileSync(join(root, "components/vocrehab/vocrehab-game-file-sort.tsx"), "utf8"),
  inbox: readFileSync(join(root, "components/vocrehab/vocrehab-game-inbox-sprint.tsx"), "utf8"),
  focus: readFileSync(join(root, "components/vocrehab/vocrehab-game-focus-shift.tsx"), "utf8"),
  barrier: readFileSync(join(root, "components/vocrehab/vocrehab-game-barrier-run.tsx"), "utf8"),
};
const checks = [
  ["File Sort validates custom files and hydrates the dealt cards", /export function fileSortTemplate[\s\S]*state\.files[\s\S]*return files/.test(files.helper) && /fileSortTemplate\(vocrehabTemplateState\)/.test(files.sort)],
  ["Inbox Sprint validates custom messages and hydrates its triage/reply exercise", /export function inboxSprintTemplate[\s\S]*state\.messages[\s\S]*replyTargetId/.test(files.helper) && /inboxSprintTemplate\(vocrehabTemplateState\)/.test(files.inbox)],
  ["Focus Shift validates custom pairs and interruption position, then deals that board", /export function focusShiftTemplate[\s\S]*state\.pairs[\s\S]*interruptionAfterPairs/.test(files.helper) && /focusShiftTemplate\(vocrehabTemplateState\)/.test(files.focus) && /pairTypes\.forEach/.test(files.focus) && /=== interruptionAfterPairs/.test(files.focus)],
  ["Barrier Run validates a published variant id and hydrates its scenes", /export function barrierRunTemplate[\s\S]*variantId/.test(files.helper) && /barrierRunTemplate\(vocrehabTemplateState\)/.test(files.barrier)],
];
let failed = false;
for (const [label, pass] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"} ${label}`);
  failed ||= !pass;
}
process.exitCode = failed ? 1 : 0;
