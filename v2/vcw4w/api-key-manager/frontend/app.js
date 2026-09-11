/* ==========================================================================
   4weird API Key Manager; frontend
   --------------------------------------------------------------------------
   - Talks to the Rust vault ONLY through Tauri `invoke` (km_list_slots,
     km_save_key, km_reveal_key, km_clear_key). Secrets are never logged,
     never persisted here, and revealed values are wiped after use.
   - VERIFY probes are free and read-only (bot identity, fal nil-request,
     provider model/key introspection). Nothing billable ever runs.
   - Copy formats hand keys to desktop agents (Codex / OpenCode /
     Antigravity): raw, PowerShell $env:, bash export, .env line.
   ========================================================================== */
"use strict";

const IN_TAURI = typeof window.__TAURI__ !== "undefined"
  && !!(window.__TAURI__.core && window.__TAURI__.core.invoke);
const invoke = IN_TAURI ? window.__TAURI__.core.invoke : null;

const REVEAL_SECONDS = 15;
const FETCH_TIMEOUT_MS = 15000;
const NIL_REQUEST_ID = "00000000-0000-0000-0000-000000000000";

/* ---------- verify probes (all free, read-only) ---------- */

async function fetchTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

async function verifyBot(key) {
  let res;
  try {
    res = await fetchTimeout("https://4weird.com/api/bot/me", { headers: { "x-bot-key": key } });
  } catch (e) {
    return { ok: false, text: "Verify failed: could not reach 4weird.com." };
  }
  const body = await res.json().catch(() => ({}));
  if (res.ok && body && body.success) {
    const who = body.username ? "@" + body.username : (body.human_id || "valid key");
    const scopes = Array.isArray(body.scopes) ? body.scopes.join(", ") : "";
    return { ok: true, text: "Verified live: " + who + (scopes ? "; scopes: " + scopes : "") };
  }
  return { ok: false, text: "Rejected (" + res.status + "): " + ((body && body.error) || "invalid key.") };
}

async function verifyFal(key) {
  let res;
  try {
    res = await fetchTimeout(
      "https://queue.fal.run/fal-ai/flux/schnell/requests/" + NIL_REQUEST_ID + "/status",
      { headers: { Authorization: "Key " + key } }
    );
  } catch (e) {
    return { ok: false, text: "Verify failed: could not reach queue.fal.run." };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, text: "Rejected (" + res.status + "): bad key. Nothing was spent." };
  }
  return { ok: true, text: "Key accepted (probe answered " + res.status + ", expected 404 for a fake id). $0.00 spent." };
}

async function verifyBearerGet(url, key, hostLabel, acceptStatuses) {
  let res;
  try {
    res = await fetchTimeout(url, { headers: { Authorization: "Bearer " + key } });
  } catch (e) {
    return { ok: false, text: "Verify failed: could not reach " + hostLabel + "." };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, text: "Rejected (" + res.status + "): bad key. Nothing was spent." };
  }
  if (acceptStatuses && acceptStatuses.indexOf(res.status) === -1) {
    return { ok: false, text: "Unexpected answer (" + res.status + "); key may be wrong; check the provider dashboard." };
  }
  return { ok: true, text: "Key accepted (probe answered " + res.status + "). $0.00 spent." };
}

function verifyRunpod(key) {
  return verifyBearerGet("https://api.runpod.io/v2/pods", key, "api.runpod.io");
}

function verifyOpenai(key) {
  return verifyBearerGet("https://api.openai.com/v1/models", key, "api.openai.com");
}

async function verifyAnthropic(key) {
  let res;
  try {
    res = await fetchTimeout("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" }
    });
  } catch (e) {
    return { ok: false, text: "Verify failed: could not reach api.anthropic.com." };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, text: "Rejected (" + res.status + "): bad key. Nothing was spent." };
  }
  if (!res.ok) {
    return { ok: false, text: "Unexpected answer (" + res.status + "); key may be wrong; check console.anthropic.com." };
  }
  return { ok: true, text: "Key accepted (model list reachable). $0.00 spent." };
}

function verifyGemini(key) {
  return verifyBearerGet(
    "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(key),
    key,
    "generativelanguage.googleapis.com",
    [200]
  ).then((r) => {
    // A valid key always yields 200 here; 400/401/403 all mean "not a working key".
    if (!r.ok && r.text.indexOf("Unexpected answer") === 0) {
      return { ok: false, text: "Rejected: not a working key (probe was refused). Nothing was spent." };
    }
    return r;
  });
}

async function verifyOpenrouter(key) {
  let res;
  try {
    res = await fetchTimeout("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: "Bearer " + key }
    });
  } catch (e) {
    return { ok: false, text: "Verify failed: could not reach openrouter.ai." };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, text: "Rejected (" + res.status + "): bad key. Nothing was spent." };
  }
  const body = await res.json().catch(() => null);
  const label = body && body.data && body.data.label ? "; label: " + body.data.label : "";
  if (!res.ok) {
    return { ok: false, text: "Unexpected answer (" + res.status + ")." };
  }
  return { ok: true, text: "Key accepted" + label + ". $0.00 spent." };
}

/* ---------- slot catalog (parity slots first, agent slots after) ---------- */

const SLOTS = [
  {
    id: "bot", name: "4weird Bot key", env: "FOURWEIRD_BOT_KEY",
    getUrl: "https://4weird.com/bot/setup", getLabel: "Get one at 4weird.com/bot/setup",
    hint: "Shape: bot4weird_ + 20 letters/digits. Lets agents act as your bot on 4weird clans.",
    verify: verifyBot
  },
  {
    id: "fal", name: "fal.ai key", env: "FAL_KEY",
    getUrl: "https://fal.ai/dashboard/keys", getLabel: "Get one at fal.ai/dashboard/keys",
    hint: "Opaque key for fal.ai media runs (art, video, voice). Verify is a free probe.",
    verify: verifyFal
  },
  {
    id: "runpod", name: "RunPod API key", env: "RUNPOD_API_KEY",
    getUrl: "https://www.runpod.io/console/user/settings", getLabel: "Get one in the RunPod console (Settings → API Keys)",
    hint: "Current keys start with rpa_. The desktop cloud-run keeps this session-only; here it is vault-persisted. Verify lists pods (read-only).",
    verify: verifyRunpod
  },
  {
    id: "openai", name: "OpenAI API key", env: "OPENAI_API_KEY",
    getUrl: "https://platform.openai.com/api-keys", getLabel: "Get one at platform.openai.com/api-keys",
    hint: "Starts with sk- (or sk-proj-). Powers Codex CLI and OpenCode's OpenAI models. Verify lists models (free).",
    verify: verifyOpenai
  },
  {
    id: "anthropic", name: "Anthropic API key", env: "ANTHROPIC_API_KEY",
    getUrl: "https://console.anthropic.com/", getLabel: "Get one at console.anthropic.com",
    hint: "Starts with sk-ant-. Powers OpenCode's Claude models. Verify lists models (free).",
    verify: verifyAnthropic
  },
  {
    id: "gemini", name: "Google AI (Gemini) API key", env: "GEMINI_API_KEY",
    getUrl: "https://aistudio.google.com/apikey", getLabel: "Get one at aistudio.google.com/apikey",
    hint: "Starts with AIza. Powers Antigravity and Gemini models in OpenCode. Verify lists models (free).",
    verify: verifyGemini
  },
  {
    id: "openrouter", name: "OpenRouter API key", env: "OPENROUTER_API_KEY",
    getUrl: "https://openrouter.ai/keys", getLabel: "Get one at openrouter.ai/keys",
    hint: "Starts with sk-or-v1-. One key for hundreds of models in OpenCode. Verify reads key info (free).",
    verify: verifyOpenrouter
  }
];

/* ---------- shell quoting for handoff formats ---------- */

function psQuote(s) {
  return '"'
    + String(s).replace(/`/g, "``").replace(/\$/g, "`$").replace(/"/g, '`"')
    + '"';
}

function bashQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function dotenvQuote(s) {
  const t = String(s);
  if (/^[A-Za-z0-9_@./:+-]+$/.test(t)) return t;
  return '"'
    + t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      .replace(/\n/g, "\\n").replace(/\r/g, "\\r")
    + '"';
}

function formatForCopy(envName, secret, format) {
  if (format === "ps") return "$env:" + envName + "=" + psQuote(secret);
  if (format === "bash") return "export " + envName + "=" + bashQuote(secret);
  if (format === "dotenv") return envName + "=" + dotenvQuote(secret);
  return secret;
}

/* ---------- dom + log ---------- */

const slotsEl = document.getElementById("slots");
const logEl = document.getElementById("log");
const badgeEl = document.getElementById("runtime-badge");
const bannerEl = document.getElementById("nontauri-banner");

function log(message, kind) {
  const li = document.createElement("li");
  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString();
  const span = document.createElement("span");
  span.className = "k-" + (kind || "info");
  span.textContent = message; // textContent: secrets can never become markup here
  li.appendChild(time);
  li.appendChild(span);
  logEl.prepend(li);
  while (logEl.children.length > 80) logEl.removeChild(logEl.lastChild);
}

function setResult(slot, text, kind) {
  slot.resultEl.textContent = text;
  slot.resultEl.className = "result " + (kind || "info");
}

function setBusy(slot, busy) {
  slot.card.querySelectorAll("button, input, select").forEach((el) => {
    if (el === slot.revealValueEl) return;
    el.disabled = busy || !IN_TAURI;
  });
}

/* ---------- clipboard (modern API with execCommand fallback) ---------- */

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) { /* fall through to legacy path */ }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

/* ---------- reveal lifecycle (15s auto-wipe) ---------- */

function hideReveal(slot) {
  if (slot.revealTimer) {
    clearInterval(slot.revealTimer);
    slot.revealTimer = null;
  }
  if (slot.revealInterval) {
    clearInterval(slot.revealInterval);
    slot.revealInterval = null;
  }
  slot.revealed = "";
  slot.revealValueEl.textContent = "";
  slot.revealBoxEl.hidden = true;
}

function showReveal(slot, value) {
  hideReveal(slot);
  slot.revealed = value;
  slot.revealValueEl.textContent = value;
  slot.revealBoxEl.hidden = false;
  let left = REVEAL_SECONDS;
  slot.revealCountdownEl.textContent = left + "s";
  slot.revealFillEl.style.width = "100%";
  slot.revealInterval = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      hideReveal(slot);
      log(slot.cfg.name + ": reveal auto-hidden.", "info");
      return;
    }
    slot.revealCountdownEl.textContent = left + "s";
    slot.revealFillEl.style.width = Math.round((left / REVEAL_SECONDS) * 100) + "%";
  }, 1000);
  slot.revealTimer = setTimeout(() => hideReveal(slot), REVEAL_SECONDS * 1000);
}

/* ---------- per-slot actions ---------- */

async function doSave(slot) {
  const raw = slot.inputEl.value;
  setBusy(slot, true);
  try {
    const res = await invoke("km_save_key", { slot: slot.cfg.id, secret: raw });
    slot.inputEl.value = "";
    setResult(slot, (res && res.message) || "Saved.", "ok");
    log(slot.cfg.name + ": saved to OS credential store.", "ok");
  } catch (e) {
    setResult(slot, "Save failed: " + String((e && e.message) || e), "error");
    log(slot.cfg.name + ": save rejected (shape check).", "error");
  } finally {
    setBusy(slot, false);
    await refreshStatuses();
  }
}

async function doVerify(slot) {
  const typed = slot.inputEl.value.trim();
  let key = typed;
  if (!key) {
    setResult(slot, "Revealing stored key for the probe…", "info");
    try {
      key = await invoke("km_reveal_key", { slot: slot.cfg.id });
    } catch (e) {
      setResult(slot, "Nothing to verify: paste a key or save one first.", "error");
      return;
    }
  }
  setBusy(slot, true);
  setResult(slot, "Probing (free, nothing runs)…", "info");
  try {
    const out = await slot.cfg.verify(key);
    setResult(slot, out.text, out.ok ? "ok" : "error");
    log(slot.cfg.name + ": verify " + (out.ok ? "accepted." : "rejected."), out.ok ? "ok" : "error");
  } finally {
    key = "";
    setBusy(slot, false);
  }
}

async function doReveal(slot) {
  setBusy(slot, true);
  try {
    const value = await invoke("km_reveal_key", { slot: slot.cfg.id });
    showReveal(slot, value);
    setResult(slot, "Revealed; auto-hides in " + REVEAL_SECONDS + "s. Shoulder-surf responsibly.", "info");
    log(slot.cfg.name + ": revealed for " + REVEAL_SECONDS + "s.", "warn");
  } catch (e) {
    setResult(slot, "Reveal failed: " + String((e && e.message) || e), "error");
  } finally {
    setBusy(slot, false);
  }
}

async function doCopy(slot) {
  const format = slot.formatEl.value;
  setBusy(slot, true);
  let secret = "";
  try {
    secret = await invoke("km_reveal_key", { slot: slot.cfg.id });
    const payload = formatForCopy(slot.cfg.env, secret, format);
    const ok = await copyText(payload);
    secret = "";
    if (ok) {
      const label = format === "raw" ? "raw key" : format === "ps" ? "PowerShell $env: line"
        : format === "bash" ? "bash export line" : ".env line";
      setResult(slot, "Copied " + label + " for " + slot.cfg.env + "; paste it into your agent/terminal.", "ok");
      log(slot.cfg.name + ": copied (" + label + ") to clipboard.", "ok");
    } else {
      setResult(slot, "Copy failed: clipboard refused. Use Reveal and copy manually.", "error");
      log(slot.cfg.name + ": clipboard copy refused.", "error");
    }
  } catch (e) {
    secret = "";
    setResult(slot, "Copy failed: " + String((e && e.message) || e), "error");
  } finally {
    setBusy(slot, false);
  }
}

function armConfirm(button, original, action) {
  if (button.classList.contains("armed")) {
    button.classList.remove("armed");
    button.textContent = original;
    if (button._disarm) clearTimeout(button._disarm);
    action();
    return;
  }
  button.classList.add("armed");
  button.textContent = "Click again to confirm";
  button._disarm = setTimeout(() => {
    button.classList.remove("armed");
    button.textContent = original;
  }, 5000);
}

async function doClear(slot) {
  try {
    const res = await invoke("km_clear_key", { slot: slot.cfg.id });
    slot.inputEl.value = "";
    hideReveal(slot);
    setResult(slot, (res && res.message) || "Removed.", "info");
    log(slot.cfg.name + ": removed from this machine.", "warn");
  } catch (e) {
    setResult(slot, "Clear failed: " + String((e && e.message) || e), "error");
  } finally {
    await refreshStatuses();
  }
}

/* ---------- bulk .env export ---------- */

async function doExportEnv(button) {
  armConfirm(button, "Copy all saved as .env", async () => {
    const status = await invoke("km_list_slots").catch(() => []);
    const saved = status.filter((s) => s.configured);
    if (!saved.length) {
      document.getElementById("export-result").textContent = "Nothing saved yet.";
      document.getElementById("export-result").className = "result info";
      return;
    }
    const lines = [];
    for (const s of saved) {
      const cfg = SLOTS.find((c) => c.id === s.slot);
      if (!cfg) continue;
      try {
        let secret = await invoke("km_reveal_key", { slot: s.slot });
        lines.push(cfg.env + "=" + dotenvQuote(secret));
        secret = "";
      } catch (e) {
        log(cfg.name + ": skipped in export (unreadable).", "error");
      }
    }
    const ok = await copyText(lines.join("\n"));
    const out = document.getElementById("export-result");
    if (ok) {
      out.textContent = "Copied " + lines.length + " key(s) as .env; paste into your terminal.";
      out.className = "result ok";
      log("Bulk export: " + lines.length + " key(s) copied as .env.", "warn");
    } else {
      out.textContent = "Copy failed: clipboard refused.";
      out.className = "result error";
    }
  });
}

/* ---------- render + statuses ---------- */

function buildSlotCard(cfg) {
  const card = document.createElement("section");
  card.className = "card slot";
  card.id = "slot-" + cfg.id;

  const head = document.createElement("div");
  head.className = "slot-head";
  const h2 = document.createElement("h2");
  h2.textContent = cfg.name;
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = "…";
  const fp = document.createElement("span");
  fp.className = "fingerprint";
  const link = document.createElement("a");
  link.className = "get";
  link.href = cfg.getUrl;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = cfg.getLabel;
  head.appendChild(h2);
  head.appendChild(pill);
  head.appendChild(fp);
  head.appendChild(link);

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = cfg.hint + " Env var for agents: " + cfg.env;

  const row1 = document.createElement("div");
  row1.className = "row";
  const input = document.createElement("input");
  input.type = "password";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = "Paste " + cfg.name + "…";
  input.setAttribute("aria-label", cfg.name);
  const btnSave = document.createElement("button");
  btnSave.type = "button";
  btnSave.className = "btn btn-primary";
  btnSave.textContent = "Save";
  row1.appendChild(input);
  row1.appendChild(btnSave);

  const row2 = document.createElement("div");
  row2.className = "row";
  const btnVerify = document.createElement("button");
  btnVerify.type = "button";
  btnVerify.className = "btn";
  btnVerify.textContent = "Verify (free)";
  const btnReveal = document.createElement("button");
  btnReveal.type = "button";
  btnReveal.className = "btn";
  btnReveal.textContent = "Reveal 15s";
  const format = document.createElement("select");
  format.setAttribute("aria-label", "Copy format for " + cfg.name);
  [["raw", "Copy: raw"], ["ps", "Copy: PowerShell"], ["bash", "Copy: bash"], ["dotenv", "Copy: .env line"]]
    .forEach(([v, label]) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = label;
      format.appendChild(opt);
    });
  const btnCopy = document.createElement("button");
  btnCopy.type = "button";
  btnCopy.className = "btn";
  btnCopy.textContent = "Copy";
  const btnClear = document.createElement("button");
  btnClear.type = "button";
  btnClear.className = "btn btn-danger";
  btnClear.textContent = "Clear";
  row2.appendChild(btnVerify);
  row2.appendChild(btnReveal);
  row2.appendChild(format);
  row2.appendChild(btnCopy);
  row2.appendChild(btnClear);

  const result = document.createElement("p");
  result.className = "result";
  result.setAttribute("role", "status");

  const revealBox = document.createElement("div");
  revealBox.className = "reveal-box";
  revealBox.hidden = true;
  const revealValue = document.createElement("div");
  revealValue.className = "reveal-value";
  const revealMeta = document.createElement("div");
  revealMeta.className = "reveal-meta";
  const revealLabel = document.createElement("span");
  revealLabel.textContent = "visible · auto-hides in";
  const countdown = document.createElement("span");
  const track = document.createElement("span");
  track.className = "countdown-track";
  const fill = document.createElement("span");
  fill.className = "countdown-fill";
  track.appendChild(fill);
  revealMeta.appendChild(revealLabel);
  revealMeta.appendChild(countdown);
  revealMeta.appendChild(track);
  revealBox.appendChild(revealValue);
  revealBox.appendChild(revealMeta);

  card.appendChild(head);
  card.appendChild(hint);
  card.appendChild(row1);
  card.appendChild(row2);
  card.appendChild(result);
  card.appendChild(revealBox);
  slotsEl.appendChild(card);

  const slot = {
    cfg, card, pillEl: pill, fpEl: fp, inputEl: input, formatEl: format,
    resultEl: result, revealBoxEl: revealBox, revealValueEl: revealValue,
    revealCountdownEl: countdown, revealFillEl: fill,
    revealed: "", revealTimer: null, revealInterval: null
  };

  btnSave.addEventListener("click", () => doSave(slot));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSave(slot);
  });
  btnVerify.addEventListener("click", () => doVerify(slot));
  btnReveal.addEventListener("click", () => doReveal(slot));
  btnCopy.addEventListener("click", () => doCopy(slot));
  btnClear.addEventListener("click", () => armConfirm(btnClear, "Clear", () => doClear(slot)));
  return slot;
}

let slots = [];

async function refreshStatuses() {
  if (!IN_TAURI) return;
  let list = [];
  try {
    list = await invoke("km_list_slots");
  } catch (e) {
    log("Status read failed: " + String((e && e.message) || e), "error");
    return;
  }
  const byId = {};
  list.forEach((s) => { byId[s.slot] = s; });
  slots.forEach((slot) => {
    const st = byId[slot.cfg.id];
    if (st && st.configured) {
      slot.card.classList.add("saved");
      slot.pillEl.textContent = "SAVED";
      slot.pillEl.className = "pill pill-on";
      slot.fpEl.textContent = st.fingerprint || "";
    } else {
      slot.card.classList.remove("saved");
      slot.pillEl.textContent = "NOT SET";
      slot.pillEl.className = "pill pill-off";
      slot.fpEl.textContent = "";
    }
  });
}

/* ---------- boot ---------- */

function boot() {
  slots = SLOTS.map(buildSlotCard);
  document.getElementById("btn-refresh").addEventListener("click", () => {
    refreshStatuses();
    log("Statuses refreshed.", "info");
  });
  document.getElementById("btn-export-env")
    .addEventListener("click", (e) => doExportEnv(e.currentTarget));

  if (!IN_TAURI) {
    bannerEl.hidden = false;
    badgeEl.textContent = "browser preview (disabled)";
    badgeEl.className = "pill pill-idle";
    document.querySelectorAll("#slots button, #slots input, #slots select, #btn-export-env")
      .forEach((el) => { el.disabled = true; });
    log("Running outside the Tauri runtime; controls disabled.", "warn");
    return;
  }
  badgeEl.textContent = "desktop vault ●";
  badgeEl.className = "pill pill-on";
  log("Vault ready - OS credential store reachable.", "ok");
  refreshStatuses();
}

document.addEventListener("DOMContentLoaded", boot);
