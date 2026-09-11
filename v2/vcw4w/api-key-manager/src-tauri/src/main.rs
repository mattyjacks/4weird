//! 4weird API Key Manager; entry point.
//!
//! `--smoke` runs a headless credential-store self-test (write/read/delete)
//! and exits WITHOUT opening a window, so CI and this repo's scripts can
//! prove the vault works without a display.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if std::env::args().skip(1).any(|a| a == "--smoke") {
        match fourweird_api_key_manager::smoke_test() {
            Ok(detail) => {
                println!("SMOKE OK: {detail}");
                std::process::exit(0);
            }
            Err(e) => {
                // Static messages only; smoke_test never returns secret material.
                eprintln!("SMOKE FAIL: {e}");
                std::process::exit(1);
            }
        }
    }
    fourweird_api_key_manager::run();
}
