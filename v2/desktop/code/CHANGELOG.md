# VibeCodeWorker changelog

This project follows semantic versioning: `MAJOR.MINOR.PATCH`. Release tags should use `vcw-v<version>`.

## Unreleased

- Hardened config: allowlisted updates, range clamping, provider/channel validation, redacted toJSON, loadFromEnv, validate().
- Hardened API server: security headers, per-IP rate limiting, URL length guard, request timeouts, prod-safe errors, getHealth, graceful stop.
- Hardened core: validated screenshots/files/projects, processing guards, timestamped logs, getStatus, dispose.
- Hardened pricing: sanitized token counts, NaN-safe formatting, tier listing, char-based estimator.
- Added zero-dependency lib/vcw_utils.js (clamp, sleep, withTimeout, retryAsync, safe JSON, request ids, URL/port checks, truncate, debounce, escapeHtml).
- Added SmartLog debug/tail/clear/count helpers with level allowlisting.
- Added storage key-preview/plausibility/masking helpers for safe logging.
- Added engines>=18, test:utils, lint scripts; documented NODE_ENV, log dir, rate limits in .env.example.
- Added main-process crash handlers + before-quit window-state save.
- Added tests/test_vcw_utils.js regression suite.
- Added official Godot 4 stable-release discovery and safe Windows/Linux installers.
- Added a Godot native game profile plus MCP tools for release lookup, install, cloud screenshots, and allow-listed play actions.
- Updated the dual-desktop cloud image to boot an official Godot demo and give the agent a visual, key-constrained control loop.

## 2.0.0 - 2026-09-08

- Established the first tracked VCW release baseline.
- Built Windows Tauri installers (MSI and NSIS setup executable).
- Added a dependency-free stdio MCP bridge for the local REST control plane.
- Added public VCW web, desktop, and agent-control routes and green/black VCW identity assets.
