// Prevents additional console window on Windows in release build, do not remove!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    fourweird_aiplay::run();
}
