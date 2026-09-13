'use strict';
// vcwcode keys helper — single source of truth for the bot key format,
// aligning app/main.js + src-tauri lib.rs (keep all three in sync).

const BOT_KEY_RE = /^bot4weird_[A-Za-z0-9]{20,32}$/;

function isBotKey(s) {
  return typeof s === 'string' && BOT_KEY_RE.test(s);
}

module.exports = { BOT_KEY_RE, isBotKey };
