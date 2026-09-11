import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const exists = (file) => fs.existsSync(new URL(file, import.meta.url));

const fail = (msg) => {
  throw new Error(`verify-save-slots: ${msg}`);
};

// 1. lib/validate.ts: slots are 0-3, invalid is null (0 is valid, so 0
// cannot double as the invalid sentinel).
const validate = read("../lib/validate.ts");
if (!/v >= 0 && v <= 3/.test(validate)) fail("isSlot must accept 0-3.");
if (!/number \| null/.test(validate)) fail("isSlot must return number | null (0 is valid).");

// 2. /api/saves accepts slot 0 on GET + PUT and strips cheat_mode on slot 0.
const saves = read("../app/api/saves/route.ts");
if (!saves.includes("/^[0-3]$/")) fail("saves GET must accept slots 0-3.");
if (!saves.includes("Slot must be 0, 1, 2, or 3.")) fail("saves PUT must accept slot 0.");
if (!saves.includes("slot === 0")) fail("saves PUT must special-case slot 0.");
if (!saves.includes("delete dataObj.cheat_mode")) fail("saves PUT must strip cheat_mode on slot 0.");

// 3. /api/cheats rejects slot 0 on GET + PUT (never marked, never allowed).
const cheats = read("../app/api/cheats/route.ts");
const slotZeroRejections = (cheats.match(/Slot 0 is cheat-proof/g) ?? []).length;
if (slotZeroRejections < 2) fail("cheats GET + PUT must both reject slot 0.");
if (!cheats.includes("slot === null")) fail("cheats must use the null-invalid sentinel.");

// 4. Slot 0 sorts first in the account saves list.
const hub = read("../components/account/account-hub.tsx");
if (!hub.includes("[0, 1, 2, 3]")) fail("account-hub saves list must be [0, 1, 2, 3] (slot 0 first).");
if (!hub.includes("CHEAT-PROOF")) fail("account-hub must badge slot 0 as cheat-proof.");

// 5. Platform Wars picker offers slot 0 first.
const picker = read("../public/games/html/platform-wars/index.html");
if (!picker.includes('value="0"')) fail("platform-wars picker must offer slot 0.");
if (picker.indexOf('value="0"') > picker.indexOf('value="1"')) fail("slot 0 must appear first in the picker.");

// 6. Migration widens game_saves to 0-3, keeps cheat_settings at 1-3,
// rejects slot 0 in set_cheat_setting, and strips slot-0 markers at the DB.
if (!exists("../supabase/migrations/20261026000000_save_slot_zero.sql")) {
  fail("save_slot_zero migration is missing.");
}
const mig = read("../supabase/migrations/20261026000000_save_slot_zero.sql");
for (const token of [
  "game_saves_slot_check",
  "slot between 0 and 3",
  "cheat_settings_slot_check",
  "slot between 1 and 3",
  "slot 0 is cheat-proof",
  "strip_slot_zero_cheat_marker",
  "trg_strip_slot_zero_cheat_marker",
]) {
  if (!mig.includes(token)) fail(`migration must contain '${token}'.`);
}

// 7. schema.sql agrees with the migration.
const schema = read("../supabase/schema.sql");
if (!schema.includes("slot between 0 and 3")) fail("schema.sql game_saves must allow slot 0-3.");

console.log("verify-save-slots: 4 slots (0 cheat-proof, first), API + DB + UI agree.");
