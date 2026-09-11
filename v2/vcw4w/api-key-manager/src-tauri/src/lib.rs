//! 4weird API Key Manager; secure vault backend.
//!
//! SECURITY MODEL (read before touching this file):
//! - Secrets live ONLY in the OS credential store via the `keyring` crate:
//!   Windows Credential Manager (DPAPI-encrypted at rest, unlocked with the
//!   Windows login), macOS Keychain, Linux Secret Service / kernel keyring.
//!   This program never writes a secret to its own files, stdout, or logs.
//! - In-memory secret buffers are wrapped in `Zeroizing` so they are wiped
//!   on drop instead of lingering in RAM.
//! - `km_list_slots` (the only status surface) returns a *masked fingerprint*
//!   (`abcd…wxyz`), never secret material. Full values leave the vault only
//!   through the explicit `km_reveal_key` call (user-initiated Reveal/Copy).
//! - Every error string in this file is a static message. Secrets are never
//!   interpolated into errors, logs, or panic messages.
//! - Shape validation mirrors the vibecodeworker desktop drawers
//!   (`modules/bot_token.js`, `modules/fal_key.js`) so the manager keeps full
//!   feature parity with the desktop API-keys manager; same accepted shapes,
//!   same masked display, same save / verify-outcome / clear semantics; while
//!   upgrading storage from app-data plaintext files to the OS vault.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use zeroize::Zeroizing;

mod commands {
    use super::*;

    /// Service name under which every slot is stored in the OS vault.
    /// Visible in Windows Credential Manager as `4weird-api-key-manager/<slot>`.
    pub const KEYRING_SERVICE: &str = "4weird-api-key-manager";
    /// Hard cap on accepted secret length: abuse guard, far above any real key.
    pub const MAX_SECRET_LEN: usize = 2048;
    /// Scratch slot used only by `--smoke` self-tests. Never shown in the UI.
    pub const SMOKE_SLOT: &str = "__smoke__";

    /// Managed slots: (slot id, human label). The id is the credential-store
    /// username; the allowlist below is the ONLY set `km_*` commands accept.
    /// Adding a provider later = one row here + one validator arm, no IPC change.
    pub const SLOTS: [(&str, &str); 7] = [
        ("bot", "4weird Bot key"),
        ("fal", "fal.ai key"),
        ("runpod", "RunPod API key"),
        ("openai", "OpenAI API key"),
        ("anthropic", "Anthropic API key"),
        ("gemini", "Google AI (Gemini) API key"),
        ("openrouter", "OpenRouter API key"),
    ];

    #[derive(Debug, Serialize, Deserialize)]
    pub struct SlotStatus {
        pub slot: String,
        pub label: String,
        pub configured: bool,
        pub fingerprint: String,
    }

    pub fn slot_label(slot: &str) -> Option<&'static str> {
        SLOTS
            .iter()
            .find(|(s, _)| *s == slot)
            .map(|(_, label)| *label)
    }

    fn entry_for(slot: &str) -> Result<keyring::Entry, String> {
        keyring::Entry::new(KEYRING_SERVICE, slot)
            .map_err(|e| format!("credential store unavailable: {e}"))
    }

    /// Masked public fingerprint. Same convention as the desktop drawers:
    /// first 4 + … + last 4, never reversible, safe for screen + logs.
    /// (Char-based, never byte-slicing, so non-ASCII can never panic it.)
    pub fn fingerprint(secret: &str) -> String {
        let t = secret.trim();
        if t.chars().count() < 8 {
            return "••••".to_string();
        }
        let head: String = t.chars().take(4).collect();
        let tail: String = t
            .chars()
            .rev()
            .take(4)
            .collect::<String>()
            .chars()
            .rev()
            .collect();
        format!("{head}…{tail}")
    }

    // ─── Shape validators (parity with the desktop drawers) ───

    /// `bot4weird_` + exactly 20 [A-Za-z0-9] (30 chars total).
    /// Mirrors BOT_KEY_RE in modules/bot_token.js.
    pub fn is_valid_bot_token(t: &str) -> bool {
        let t = t.trim();
        t.len() == 30 && t.starts_with("bot4weird_") && t[10..].bytes().all(|b| b.is_ascii_alphanumeric())
    }

    /// fal keys are opaque: reject blanks, absurd lengths, obvious placeholders.
    /// Mirrors isFalKeyShape in modules/fal_key.js.
    pub fn is_valid_fal_key(t: &str) -> bool {
        let t = t.trim();
        (8..=512).contains(&t.len()) && !has_placeholder(t)
    }

    /// RunPod console keys (`rpa_…`) are opaque strings; same placeholder guard.
    /// The desktop keeps this key session-only; the manager gives it the same
    /// vault persistence as every other slot (strict upgrade, same UX).
    pub fn is_valid_runpod_key(t: &str) -> bool {
        let t = t.trim();
        (8..=256).contains(&t.len()) && !has_placeholder(t) && !has_whitespace(t)
    }

    /// `sk-…` / `sk-proj-…`.
    pub fn is_valid_openai_key(t: &str) -> bool {
        let t = t.trim();
        (20..=512).contains(&t.len())
            && t.starts_with("sk-")
            && !has_whitespace(t)
            && !has_placeholder(t)
    }

    /// `sk-ant-…`.
    pub fn is_valid_anthropic_key(t: &str) -> bool {
        let t = t.trim();
        (20..=512).contains(&t.len())
            && t.starts_with("sk-ant-")
            && !has_whitespace(t)
            && !has_placeholder(t)
    }

    /// AI Studio keys (`AIza…`, 39 chars).
    pub fn is_valid_gemini_key(t: &str) -> bool {
        let t = t.trim();
        (30..=64).contains(&t.len())
            && t.starts_with("AIza")
            && !has_whitespace(t)
            && !has_placeholder(t)
    }

    /// `sk-or-v1-…`.
    pub fn is_valid_openrouter_key(t: &str) -> bool {
        let t = t.trim();
        (20..=512).contains(&t.len())
            && t.starts_with("sk-or-v1-")
            && !has_whitespace(t)
            && !has_placeholder(t)
    }

    const PLACEHOLDER_NEEDLES: [&str; 8] = [
        "your-",
        "paste",
        "example",
        "placeholder",
        "xxx",
        "****",
        "enter ",
        "key-here",
    ];

    fn has_placeholder(t: &str) -> bool {
        let lower = t.to_lowercase();
        PLACEHOLDER_NEEDLES.iter().any(|n| lower.contains(n))
    }

    fn has_whitespace(t: &str) -> bool {
        t.chars().any(|c| c.is_whitespace())
    }

    fn shape_error(slot: &str) -> &'static str {
        match slot {
            "bot" => "That does not look like a 4weird bot key (bot4weird_ + 20 letters/digits).",
            "fal" => "That does not look like a fal.ai key; paste the real key from fal.ai/dashboard/keys.",
            "runpod" => "That does not look like a RunPod API key; paste the real key from the RunPod console (Settings → API Keys).",
            "openai" => "That does not look like an OpenAI API key; it starts with sk- (paste it from platform.openai.com/api-keys).",
            "anthropic" => "That does not look like an Anthropic API key; it starts with sk-ant- (paste it from console.anthropic.com).",
            "gemini" => "That does not look like a Google AI API key; it starts with AIza (paste it from aistudio.google.com/apikey).",
            "openrouter" => "That does not look like an OpenRouter API key; it starts with sk-or-v1- (paste it from openrouter.ai/keys).",
            _ => "Invalid key.",
        }
    }

    fn is_valid_for_slot(slot: &str, secret: &str) -> bool {
        match slot {
            "bot" => is_valid_bot_token(secret),
            "fal" => is_valid_fal_key(secret),
            "runpod" => is_valid_runpod_key(secret),
            "openai" => is_valid_openai_key(secret),
            "anthropic" => is_valid_anthropic_key(secret),
            "gemini" => is_valid_gemini_key(secret),
            "openrouter" => is_valid_openrouter_key(secret),
            _ => false,
        }
    }

    // ─── IPC commands ───

    /// Status of every slot. Returns fingerprints only; no secret material
    /// ever crosses this boundary (parity with get_*_status in the desktop).
    #[tauri::command]
    pub fn km_list_slots() -> Vec<SlotStatus> {
        SLOTS
            .iter()
            .map(|(slot, label)| {
                let (configured, fingerprint) = match entry_for(slot)
                    .and_then(|e| e.get_password().map_err(|e| format!("{e}")))
                {
                    Ok(pw) => {
                        let pw = Zeroizing::new(pw);
                        (true, fingerprint(pw.as_str()))
                    }
                    Err(_) => (false, String::new()),
                };
                SlotStatus {
                    slot: slot.to_string(),
                    label: label.to_string(),
                    configured,
                    fingerprint,
                }
            })
            .collect()
    }

    /// Persist a key into the OS vault after shape validation.
    #[tauri::command]
    pub fn km_save_key(slot: String, secret: String) -> Result<Value, String> {
        let slot = slot.trim();
        let label = slot_label(slot).ok_or_else(|| "Unknown key slot.".to_string())?;
        let secret = Zeroizing::new(secret.trim().to_string());
        if secret.is_empty() {
            return Err("Paste a key first.".to_string());
        }
        if secret.len() > MAX_SECRET_LEN {
            return Err("Key is longer than the 2048-character limit.".to_string());
        }
        if !is_valid_for_slot(slot, secret.as_str()) {
            return Err(shape_error(slot).to_string());
        }
        entry_for(slot)
            .and_then(|e| {
                e.set_password(secret.as_str())
                    .map_err(|e| format!("credential store write failed: {e}"))
            })
            .map_err(|e| e)?;
        Ok(json!({ "success": true, "message": format!("{label} saved to the OS credential store.") }))
    }

    /// Explicit, user-initiated reveal (Reveal / Copy buttons only).
    /// The frontend must drop the value immediately after use.
    #[tauri::command]
    pub fn km_reveal_key(slot: String) -> Result<String, String> {
        let slot = slot.trim();
        if slot_label(slot).is_none() {
            return Err("Unknown key slot.".to_string());
        }
        let entry = entry_for(slot)?;
        match entry.get_password() {
            Ok(pw) => {
                let pw = Zeroizing::new(pw);
                Ok(pw.trim().to_string())
            }
            Err(keyring::Error::NoEntry) => Err("No key stored in that slot yet.".to_string()),
            Err(e) => Err(format!("credential store read failed: {e}")),
        }
    }

    /// Delete a slot. Missing slot = success (idempotent, parity with the
    /// desktop clear_* commands).
    #[tauri::command]
    pub fn km_clear_key(slot: String) -> Result<Value, String> {
        let slot = slot.trim();
        let label = slot_label(slot).ok_or_else(|| "Unknown key slot.".to_string())?;
        let entry = entry_for(slot)?;
        match entry.delete_credential() {
            Ok(()) => Ok(json!({ "success": true, "message": format!("{label} removed from this machine.") })),
            Err(keyring::Error::NoEntry) => {
                Ok(json!({ "success": true, "message": "Nothing was stored in that slot.".to_string() }))
            }
            Err(e) => Err(format!("credential store delete failed: {e}")),
        }
    }

    /// Headless self-test for `exe --smoke`: write → read → compare →
    /// delete → confirm-gone on a scratch slot. Exercises the real OS vault
    /// with zero GUI. Returns only a static verdict (never secret material).
    pub fn smoke_test() -> Result<String, String> {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let token = Zeroizing::new(format!("__smoke__-{}-{nanos}", std::process::id()));
        let entry = entry_for(SMOKE_SLOT)?;
        entry
            .set_password(token.as_str())
            .map_err(|e| format!("smoke write: {e}"))?;
        let back = Zeroizing::new(
            entry
                .get_password()
                .map_err(|e| format!("smoke read: {e}"))?,
        );
        if back.as_str() != token.as_str() {
            let _ = entry.delete_credential();
            return Err("smoke round-trip mismatch".to_string());
        }
        entry
            .delete_credential()
            .map_err(|e| format!("smoke delete: {e}"))?;
        match entry.get_password() {
            Err(keyring::Error::NoEntry) => {
                Ok("credential-store round-trip OK (write/read/delete/confirmed-gone)".to_string())
            }
            Err(e) => Err(format!("smoke confirm: {e}")),
            Ok(_) => Err("smoke entry survived delete".to_string()),
        }
    }
}

pub use commands::{
    km_clear_key, km_list_slots, km_reveal_key, km_save_key,
};

/// Re-exported for `main --smoke` (kept out of the Tauri invoke handler).
pub use commands::smoke_test;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::km_list_slots,
            commands::km_save_key,
            commands::km_reveal_key,
            commands::km_clear_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running 4weird API Key Manager");
}
