"use strict";
// DS-VCWCODE-03: bot-key regex shared by Electron main.js + Tauri lib.rs.
// Rule: /^bot4weird_[A-Za-z0-9]{20,32}$/ — suffix 20..32 alnum chars.
// Runnable: node v2/desktop/code/tests/vcwcode-bot-key-regex.test.js
let failures = 0;
function check(name, cond) {
  if (cond) console.log("PASS: " + name);
  else { console.log("FAIL: " + name); failures++; }
}
const BOT_KEY_RE = /^bot4weird_[A-Za-z0-9]{20,32}$/;
check("accepts 20-char suffix", BOT_KEY_RE.test("bot4weird_" + "A".repeat(20)));
check("accepts 32-char suffix", BOT_KEY_RE.test("bot4weird_" + "a1".repeat(16)));
check("accepts mid 24-char mixed", BOT_KEY_RE.test("bot4weird_AbC123xYz9876543210Qw"));
check("rejects 19-char (too short)", !BOT_KEY_RE.test("bot4weird_" + "A".repeat(19)));
check("rejects 33-char (too long)", !BOT_KEY_RE.test("bot4weird_" + "A".repeat(33)));
check("rejects bad prefix", !BOT_KEY_RE.test("bot_4weird_" + "A".repeat(20)));
check("rejects symbols in suffix", !BOT_KEY_RE.test("bot4weird_" + "A".repeat(19) + "!"));
check("rejects empty", !BOT_KEY_RE.test(""));
if (failures) { console.log("RESULT FAIL (" + failures + ")"); process.exitCode = 1; }
else { console.log("RESULT PASS"); process.exitCode = 0; }
