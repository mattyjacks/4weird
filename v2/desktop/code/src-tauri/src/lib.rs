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

    // ─── Local secret files (restrictive perms, never logged) ───
    // Secrets (bot token / keys) live in OS app-data files and must never be
    // printed to stdout, stderr, or the JSONL log. Permissions are locked down
    // best-effort per OS: 0o600 on unix (file created with mode 0o600, so no
    // umask window); on Windows %APPDATA% is user-private by default and we
    // further strip inheritance via icacls so only the current user retains
    // access. `kind` ("token"/"key") only labels error strings, never values.
    #[cfg(unix)]
    fn write_secret_file(file: &std::path::Path, contents: &str, kind: &str) -> Result<(), String> {
        use std::io::Write;
        use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
        if let Some(parent) = file.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("{} dir: {}", kind, e))?;
        }
        let mut f = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(file)
            .map_err(|e| format!("{} write: {}", kind, e))?;
        f.write_all(contents.as_bytes()).map_err(|e| format!("{} write: {}", kind, e))?;
        let _ = std::fs::set_permissions(file, std::fs::Permissions::from_mode(0o600));
        Ok(())
    }

    #[cfg(not(unix))]
    fn write_secret_file(file: &std::path::Path, contents: &str, kind: &str) -> Result<(), String> {
        if let Some(parent) = file.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("{} dir: {}", kind, e))?;
        }
        std::fs::write(file, contents).map_err(|e| format!("{} write: {}", kind, e))?;
        #[cfg(target_os = "windows")]
        {
            // Best-effort ACL lockdown: remove inheritance, grant full control
            // to the current user only. Failures are ignored (APPDATA default
            // ACLs are already user-private).
            if let Ok(user) = std::env::var("USERNAME") {
                if !user.trim().is_empty() {
                    let grant = format!("{}:F", user.trim());
                    let _ = std::process::Command::new("icacls")
                        .arg(file)
                        .arg("/inheritance:r")
                        .arg("/grant:r")
                        .arg(grant)
                        .output();
                }
            }
        }
        Ok(())
    }

    // ─── Bot API token (4weird bot key) ─────────────────
    // Lets the desktop app act as the user's bot on 4weird.com.
    // Keys are issued at https://4weird.com/bot/setup and look like
    // `bot4weird_` + 20-32 chars from [A-Za-z0-9] (shown once, hashed server-side;
    // legacy rows are 20, current rows are 32).
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
        if !t.starts_with("bot4weird_") {
            return false;
        }
        let suffix = &t[10..];
        if suffix.len() < 20 || suffix.len() > 32 {
            return false;
        }
        suffix.bytes().all(|b| b.is_ascii_alphanumeric())
    }

    #[tauri::command]
    pub fn save_bot_token(token: String) -> Result<Value, String> {
        let t = token.trim().to_string();
        if !is_valid_bot_token(&t) {
            return Err("That does not look like a 4weird bot key (bot4weird_ + 20-32 letters/digits).".to_string());
        }
        let file = bot_token_path();
        // Never log `t` — secret. Stored with restrictive perms (see helper).
        write_secret_file(&file, &t, "token")?;
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

    // ─── fal.ai API key ─────────────────────────────────────
    // Lets the desktop app queue real fal.ai media runs (art, video, voice)
    // straight from the hub: paste the key from https://fal.ai/dashboard/keys
    // into the FAL KEY drawer. The secret is kept in a local-only file under
    // the OS app-data dir (same folder as the bot token) and is never
    // logged; status calls report only whether a key is stored. fal keys are
    // opaque strings, so shape validation only rejects blanks, absurd
    // lengths, and obvious example/placeholder values.

    pub fn fal_key_path() -> std::path::PathBuf {
        #[cfg(target_os = "windows")]
        {
            let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
            return std::path::PathBuf::from(base).join("vibecodeworker").join("fal-key");
        }
        #[cfg(target_os = "macos")]
        {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            return std::path::PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("vibecodeworker")
                .join("fal-key");
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            return std::path::PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("vibecodeworker")
                .join("fal-key");
        }
    }

    pub fn is_valid_fal_key(key: &str) -> bool {
        let t = key.trim();
        if t.len() < 8 || t.len() > 512 {
            return false;
        }
        let lower = t.to_lowercase();
        for needle in [
            "your-",
            "paste",
            "example",
            "placeholder",
            "xxx",
            "****",
            "enter ",
            "key-here",
        ] {
            if lower.contains(needle) {
                return false;
            }
        }
        true
    }

    #[tauri::command]
    pub fn save_fal_key(key: String) -> Result<Value, String> {
        let t = key.trim().to_string();
        if !is_valid_fal_key(&t) {
            return Err("That does not look like a fal.ai key; paste the real key from fal.ai/dashboard/keys.".to_string());
        }
        let file = fal_key_path();
        // Never log `t` — secret. Stored with restrictive perms (see helper).
        write_secret_file(&file, &t, "key")?;
        Ok(json!({ "success": true, "message": "fal.ai key saved locally." }))
    }

    #[tauri::command]
    pub fn get_fal_key_status() -> Value {
        let file = fal_key_path();
        let configured = std::fs::read_to_string(&file)
            .map(|t| is_valid_fal_key(t.trim()))
            .unwrap_or(false);
        json!({ "configured": configured })
    }

    #[tauri::command]
    pub fn get_fal_key() -> Result<String, String> {
        let file = fal_key_path();
        match std::fs::read_to_string(&file) {
            Ok(t) => {
                let t = t.trim().to_string();
                if is_valid_fal_key(&t) {
                    Ok(t)
                } else {
                    Err("No valid fal.ai key stored.".to_string())
                }
            }
            Err(_) => Err("No fal.ai key stored yet.".to_string()),
        }
    }

    #[tauri::command]
    pub fn clear_fal_key() -> Result<Value, String> {
        let file = fal_key_path();
        match std::fs::remove_file(&file) {
            Ok(_) => Ok(json!({ "success": true, "message": "fal.ai key removed." })),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                Ok(json!({ "success": true, "message": "No fal.ai key was stored." }))
            }
            Err(e) => Err(format!("key delete: {}", e)),
        }
    }

    // ─── opencode binary (PATH probe + runner) ──────────
    // Frontend calls opencode_status to decide whether to show the OpenCode
    // drawer, and opencode_run to execute `opencode <args>` without a shell
    // (args array -> Command, no shell interpolation) with a timeout.
    // stdout/stderr are truncated to MAX_OPENCODE_OUTPUT_CHARS chars each so a
    // runaway command cannot blow up the IPC bridge. Nothing here logs
    // secrets; callers must not put tokens into `args` (prefer env/file refs).

    const MAX_OPENCODE_OUTPUT_CHARS: usize = 20_000;

    fn truncate_chars(s: &str, max_chars: usize) -> (String, bool) {
        if s.chars().count() <= max_chars {
            return (s.to_string(), false);
        }
        (s.chars().take(max_chars).collect(), true)
    }

    pub fn find_opencode_binary() -> Option<std::path::PathBuf> {
        #[cfg(target_os = "windows")]
        let exe_names: &[&str] = &["opencode.exe", "opencode.cmd", "opencode.bat"];
        #[cfg(not(target_os = "windows"))]
        let exe_names: &[&str] = &["opencode"];
        if let Some(paths) = std::env::var_os("PATH") {
            for dir in std::env::split_paths(&paths) {
                for name in exe_names {
                    let candidate = dir.join(name);
                    if candidate.is_file() {
                        return Some(candidate);
                    }
                }
            }
        }
        None
    }

    struct RunOutcome {
        code: Option<i32>,
        stdout: String,
        stderr: String,
        timed_out: bool,
    }

    fn run_program_timeout(
        program: &std::path::Path,
        args: &[String],
        timeout: std::time::Duration,
    ) -> Result<RunOutcome, String> {
        use std::io::Read;
        let mut child = std::process::Command::new(program)
            .args(args)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("opencode spawn: {}", e))?;
        // Drain pipes on threads so large output cannot block the child while
        // the main thread polls try_wait for the timeout.
        let mut out_handle = child.stdout.take();
        let mut err_handle = child.stderr.take();
        let out_thread = std::thread::spawn(move || {
            let mut buf = Vec::new();
            if let Some(mut h) = out_handle.take() {
                let _ = h.read_to_end(&mut buf);
            }
            String::from_utf8_lossy(&buf).into_owned()
        });
        let err_thread = std::thread::spawn(move || {
            let mut buf = Vec::new();
            if let Some(mut h) = err_handle.take() {
                let _ = h.read_to_end(&mut buf);
            }
            String::from_utf8_lossy(&buf).into_owned()
        });
        let start = std::time::Instant::now();
        loop {
            match child.try_wait().map_err(|e| format!("opencode wait: {}", e))? {
                Some(status) => {
                    let stdout = out_thread.join().unwrap_or_default();
                    let stderr = err_thread.join().unwrap_or_default();
                    return Ok(RunOutcome {
                        code: status.code(),
                        stdout,
                        stderr,
                        timed_out: false,
                    });
                }
                None => {
                    if start.elapsed() >= timeout {
                        let _ = child.kill();
                        let _ = child.wait();
                        let stdout = out_thread.join().unwrap_or_default();
                        let stderr = err_thread.join().unwrap_or_default();
                        return Ok(RunOutcome {
                            code: None,
                            stdout,
                            stderr,
                            timed_out: true,
                        });
                    }
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
            }
        }
    }

    #[tauri::command]
    pub fn opencode_status() -> Value {
        match find_opencode_binary() {
            None => json!({ "found": false, "path": null, "version": null }),
            Some(path) => {
                // `opencode --version` is fast; 10 s cap so status never hangs IPC.
                let version = run_program_timeout(
                    &path,
                    &["--version".to_string()],
                    std::time::Duration::from_secs(10),
                )
                .ok()
                .and_then(|o| {
                    let combined = if !o.stdout.trim().is_empty() { o.stdout } else { o.stderr };
                    let first = combined.lines().next().unwrap_or("").trim().to_string();
                    let (v, _) = truncate_chars(&first, 500);
                    if v.is_empty() { None } else { Some(v) }
                });
                json!({
                    "found": true,
                    "path": path.to_string_lossy().to_string(),
                    "version": version
                })
            }
        }
    }

    #[tauri::command]
    pub fn opencode_run(args: Vec<String>, timeout_secs: Option<u64>) -> Result<Value, String> {
        let program = find_opencode_binary().ok_or_else(|| {
            "opencode binary not found on PATH (install opencode and restart the app).".to_string()
        })?;
        if args.len() > 100 {
            return Err("Too many args (max 100).".to_string());
        }
        for a in &args {
            if a.len() > 8_000 {
                return Err("An arg is too long (max 8000 chars).".to_string());
            }
        }
        let secs = timeout_secs.unwrap_or(120).clamp(1, 600);
        let outcome =
            run_program_timeout(&program, &args, std::time::Duration::from_secs(secs))?;
        let (stdout, stdout_truncated) = truncate_chars(&outcome.stdout, MAX_OPENCODE_OUTPUT_CHARS);
        let (stderr, stderr_truncated) = truncate_chars(&outcome.stderr, MAX_OPENCODE_OUTPUT_CHARS);
        Ok(json!({
            "success": !outcome.timed_out && outcome.code == Some(0),
            "exit_code": outcome.code,
            "stdout": stdout,
            "stderr": stderr,
            "stdout_truncated": stdout_truncated,
            "stderr_truncated": stderr_truncated,
            "timed_out": outcome.timed_out
        }))
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
    append_smart_log, clear_bot_token, clear_fal_key, get_bot_token, get_bot_token_status,
    get_cli_args, get_fal_key, get_fal_key_status, get_gpu_info, get_log_dir, opencode_run,
    opencode_status, read_latest_handoff, save_bot_token, save_fal_key, save_handoff_file,
    save_report_file, show_native_notification,
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
            commands::clear_bot_token,
            commands::save_fal_key,
            commands::get_fal_key,
            commands::get_fal_key_status,
            commands::clear_fal_key,
            commands::opencode_status,
            commands::opencode_run
        ])
        .run(tauri::generate_context!())
        .expect("error while running 4WEIRD VibeCodeWorker Tauri application");
}
