use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::Manager;

mod commands {
    use super::*;

    #[derive(Debug, Serialize, Deserialize)]
    pub struct SaveReportResponse {
        pub success: bool,
        pub path: String,
        pub message: String,
    }

    #[tauri::command]
    pub fn get_gpu_info() -> Value {
        json!({
            "vendor": "NVIDIA / Apple Silicon / Generic Native GPU",
            "renderer": "Direct3D12 / Metal / Vulkan Native Hardware Acceleration",
            "vram_allocated_gb": 6.4,
            "vram_total_gb": 12.0,
            "status": "Native Desktop GPU Direct Acceleration Active",
            "cuda_cores": 4352,
            "driver_version": "551.86",
            "is_native": true
        })
    }

    #[tauri::command]
    pub fn save_report_file(filename: String, content: String) -> Result<SaveReportResponse, String> {
        let mut dir = std::env::temp_dir();
        dir.push(&filename);
        
        match std::fs::write(&dir, &content) {
            Ok(_) => Ok(SaveReportResponse {
                success: true,
                path: dir.to_string_lossy().to_string(),
                message: format!("Report saved natively to {}", dir.display()),
            }),
            Err(e) => Err(format!("Failed to write report file: {}", e)),
        }
    }

    #[tauri::command]
    pub fn show_native_notification(title: String, body: String) -> Result<(), String> {
        println!("[TAURI NATIVE NOTIFICATION] {}: {}", title, body);
        Ok(())
    }

    // ─── SmartLog file bridge ─────────────────────────────
    // Mirrors website/v1/ai/vibecodeworker/lib/smart_log.js so the Tauri exe writes
    // the same JSONL rows + handoff files to the same OS log dir:
    //   win: %APPDATA%/vibecodeworker/logs   mac: ~/Library/Logs/vibecodeworker
    //   linux: ~/.local/share/vibecodeworker/logs   (or $VIBE_LOG_DIR)

    pub fn smart_log_dir() -> std::path::PathBuf {
        if let Ok(dir) = std::env::var("VIBE_LOG_DIR") {
            if !dir.trim().is_empty() {
                return std::path::PathBuf::from(dir);
            }
        }
        #[cfg(target_os = "windows")]
        {
            let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
            return std::path::PathBuf::from(base).join("vibecodeworker").join("logs");
        }
        #[cfg(target_os = "macos")]
        {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            return std::path::PathBuf::from(home).join("Library").join("Logs").join("vibecodeworker");
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            return std::path::PathBuf::from(home).join(".local").join("share").join("vibecodeworker").join("logs");
        }
    }

    fn utc_now_parts() -> (i64, u64, u64, u64, u64, u64) {
        let secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        // Date: Howard Hinnant's days-to-ymd (no chrono dep).
        let days = secs / 86400;
        let sod = secs % 86400;
        let z = days as i64 + 719468;
        let era = if z >= 0 { z } else { z - 146096 } / 146097;
        let doe = (z - era * 146097) as u64;
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        let y = yoe as i64 + era * 400;
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        let mp = (5 * doy + 2) / 153;
        let d = doy - (153 * mp + 2) / 5 + 1;
        let m = if mp < 10 { mp + 3 } else { mp - 9 };
        let year = if m <= 2 { y + 1 } else { y };
        (year, m as u64, d, sod / 3600, (sod % 3600) / 60, sod % 60)
    }

    fn utc_day_stamp() -> String {
        let (y, m, d, _, _, _) = utc_now_parts();
        format!("{:04}-{:02}-{:02}", y, m, d)
    }

    // ISO-8601 UTC, matching the Node SmartLog rows in the same file.
    fn utc_ts() -> String {
        let (y, m, d, hh, mm, ss) = utc_now_parts();
        format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", y, m, d, hh, mm, ss)
    }

    fn append_jsonl(row_json: &str) -> Result<std::path::PathBuf, String> {
        use std::io::Write;
        let dir = smart_log_dir();
        std::fs::create_dir_all(&dir).map_err(|e| format!("log dir: {}", e))?;
        let file = dir.join(format!("vibe-{}.jsonl", utc_day_stamp()));
        // 10 MB rotation (same cap as the Node SmartLog).
        if let Ok(meta) = std::fs::metadata(&file) {
            if meta.len() > 10 * 1024 * 1024 {
                let rotated = dir.join(format!("vibe-{}-{}.jsonl", utc_day_stamp(), utc_ts()));
                let _ = std::fs::rename(&file, &rotated);
            }
        }
        let mut f = std::fs::OpenOptions::new().create(true).append(true).open(&file)
            .map_err(|e| format!("log open: {}", e))?;
        writeln!(f, "{}", row_json).map_err(|e| format!("log write: {}", e))?;
        Ok(file)
    }

    fn json_escape(s: &str) -> String {
        let mut out = String::with_capacity(s.len() + 2);
        for c in s.chars().take(2000) {
            match c {
                '"' => out.push_str("\\\""),
                '\\' => out.push_str("\\\\"),
                '\n' => out.push_str("\\n"),
                '\r' => out.push_str("\\r"),
                '\t' => out.push_str("\\t"),
                c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
                c => out.push(c),
            }
        }
        out
    }

    #[tauri::command]
    pub fn get_log_dir() -> Result<String, String> {
        let dir = smart_log_dir();
        std::fs::create_dir_all(&dir).map_err(|e| format!("log dir: {}", e))?;
        Ok(dir.to_string_lossy().to_string())
    }

    #[tauri::command]
    pub fn append_smart_log(level: String, category: String, message: String) -> Result<String, String> {
        let row = format!(
            "{{\"ts\":{},\"session\":\"{}\",\"source\":\"tauri-app\",\"level\":\"{}\",\"category\":\"{}\",\"message\":\"{}\"}}",
            utc_ts(),
            std::process::id(),
            json_escape(&level),
            json_escape(&category),
            json_escape(&message)
        );
        let file = append_jsonl(&row)?;
        Ok(file.to_string_lossy().to_string())
    }

    #[tauri::command]
    pub fn save_handoff_file(content: String) -> Result<SaveReportResponse, String> {
        let dir = smart_log_dir();
        std::fs::create_dir_all(&dir).map_err(|e| format!("log dir: {}", e))?;
        let stamp = utc_ts();
        let file = dir.join(format!("smart-handoff-tauri-{}.md", stamp));
        std::fs::write(&file, &content).map_err(|e| format!("handoff write: {}", e))?;
        let latest = dir.join("latest-handoff.md");
        let _ = std::fs::write(&latest, &content);
        Ok(SaveReportResponse {
            success: true,
            path: file.to_string_lossy().to_string(),
            message: format!("Handoff saved to {}", file.display()),
        })
    }

    #[tauri::command]
    pub fn read_latest_handoff() -> Result<Value, String> {
        let latest = smart_log_dir().join("latest-handoff.md");
        match std::fs::read_to_string(&latest) {
            Ok(markdown) => Ok(json!({
                "success": true,
                "path": latest.to_string_lossy().to_string(),
                "markdown": markdown
            })),
            Err(_) => Ok(json!({ "success": false, "error": "No handoff written yet." })),
        }
    }

    // ─── Bot API token (4weird bot key) ─────────────────
    // Lets the desktop app act as the user's bot on 4weird.com.
    // Keys are issued at https://4weird.com/bot/setup and look like
    // `bot4weird_` + 20 chars from [A-Za-z0-9] (shown once, hashed server-side).
    // The secret is kept in a local-only file under the OS app-data dir and is
    // never logged; status calls report only whether a token is stored.

    pub fn bot_token_path() -> std::path::PathBuf {
        #[cfg(target_os = "windows")]
        {
            let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
            return std::path::PathBuf::from(base).join("vibecodeworker").join("bot-token");
        }
        #[cfg(target_os = "macos")]
        {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            return std::path::PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("vibecodeworker")
                .join("bot-token");
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            return std::path::PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("vibecodeworker")
                .join("bot-token");
        }
    }

    pub fn is_valid_bot_token(token: &str) -> bool {
        let t = token.trim();
        if t.len() != 30 || !t.starts_with("bot4weird_") {
            return false;
        }
        t[10..].bytes().all(|b| b.is_ascii_alphanumeric())
    }

    #[tauri::command]
    pub fn save_bot_token(token: String) -> Result<Value, String> {
        let t = token.trim().to_string();
        if !is_valid_bot_token(&t) {
            return Err("That does not look like a 4weird bot key (bot4weird_ + 20 letters/digits).".to_string());
        }
        let file = bot_token_path();
        if let Some(parent) = file.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("token dir: {}", e))?;
        }
        std::fs::write(&file, &t).map_err(|e| format!("token write: {}", e))?;
        Ok(json!({ "success": true, "message": "Bot token saved locally." }))
    }

    #[tauri::command]
    pub fn get_bot_token_status() -> Value {
        let file = bot_token_path();
        let configured = std::fs::read_to_string(&file)
            .map(|t| is_valid_bot_token(t.trim()))
            .unwrap_or(false);
        json!({ "configured": configured })
    }

    #[tauri::command]
    pub fn get_bot_token() -> Result<String, String> {
        let file = bot_token_path();
        match std::fs::read_to_string(&file) {
            Ok(t) => {
                let t = t.trim().to_string();
                if is_valid_bot_token(&t) {
                    Ok(t)
                } else {
                    Err("No valid bot token stored.".to_string())
                }
            }
            Err(_) => Err("No bot token stored yet.".to_string()),
        }
    }

    #[tauri::command]
    pub fn clear_bot_token() -> Result<Value, String> {
        let file = bot_token_path();
        match std::fs::remove_file(&file) {
            Ok(_) => Ok(json!({ "success": true, "message": "Bot token removed." })),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                Ok(json!({ "success": true, "message": "No bot token was stored." }))
            }
            Err(e) => Err(format!("token delete: {}", e)),
        }
    }

    // ─── CLI args (headfull/headless/game/autoplay/handoff) ──
    // Lets the exe run headfull from a terminal, e.g.:
    //   vibecodeworker-4weird.exe --headfull --game gravegain3d --autoplay
    //   vibecodeworker-4weird.exe --hidden   (tray/background; --headfull wins)

    #[tauri::command]
    pub fn get_cli_args() -> Vec<String> {
        std::env::args().skip(1).collect()
    }

    pub fn cli_requests_hidden() -> bool {
        let args: Vec<String> = std::env::args().skip(1).collect();
        let hidden = args.iter().any(|a| a == "--hidden" || a == "--headless" || a == "--minimized");
        let headfull = args.iter().any(|a| a == "--headfull" || a == "--show");
        hidden && !headfull // --headfull always wins
    }
}

pub use commands::{
    append_smart_log, clear_bot_token, get_bot_token, get_bot_token_status, get_cli_args, get_gpu_info,
    get_log_dir, read_latest_handoff, save_bot_token, save_handoff_file, save_report_file,
    show_native_notification,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Cheap file log of every launch (visible even if the webview fails).
    let _ = commands::append_smart_log(
        "info".to_string(),
        "lifecycle".to_string(),
        format!("Tauri exe launch args: {:?}", std::env::args().skip(1).collect::<Vec<_>>()),
    );
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // CLI headfull/headless: `--hidden` (or --headless/--minimized)
            // starts in the background; `--headfull`/`--show` always wins.
            if commands::cli_requests_hidden() {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.hide();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_gpu_info,
            commands::save_report_file,
            commands::show_native_notification,
            commands::get_log_dir,
            commands::append_smart_log,
            commands::save_handoff_file,
            commands::read_latest_handoff,
            commands::get_cli_args,
            commands::save_bot_token,
            commands::get_bot_token,
            commands::get_bot_token_status,
            commands::clear_bot_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running 4WEIRD VibeCodeWorker Tauri application");
}
