"use strict";
// vcwcode-gpu-hint.js — one-paragraph guidance: --enable-gpu (default per .bat) vs --software fallback.
// Prints the exact .bat flag; always exits 0.

const GUIDANCE = [
  "Use hardware GPU (the .bat default, `--enable-gpu`) for normal runs — it keeps canvas/WebGL work on the GPU for full speed; switch to the `--software` fallback only when the GPU subprocess crashes (symptoms: 'GPU process exited', repeated renderer restarts, or blank/crashed game canvas on machines with broken drivers, RDP sessions, or headless VMs).",
  "",
  "Exact .bat flag:",
  "  normal (default):  start-vcwcode.bat --enable-gpu",
  "  fallback:          start-vcwcode.bat --software   (adds Chromium --disable-gpu --disable-software-rasterizer bypass; slower but stable)",
  "",
  "VERDICT: default to --enable-gpu; use --software only for GPU subprocess crashes.",
].join("\n");

console.log(GUIDANCE);
process.exit(0);
