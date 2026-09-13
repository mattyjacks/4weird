# VCWCODE Engines Notes

## Values (`webEngine`)

| Value       | Role                                  |
|-------------|---------------------------------------|
| `ultralight`| Default. Lightweight embedded renderer. Use unless you have a reason not to. |
| `electron`  | Alternate. Full Chromium + Node shell. Heavier; use for DevTools / native APIs. |
| `chromium`  | Alternate. System Chromium. Use for parity with external browser testing. |

Schema-enforced in `vcwcode-schema.json` as `ultralight | electron | chromium`.

## Override

- Env var `VIBE_WEB_ENGINE` wins over config file values.
- Accepted values are the same three strings (lowercase).
- Unset / empty = fall back to `webEngine` in config (`ultralight` default).
- Invalid value = fall back to `ultralight` and log a warning; never crash on a bad engine name.

## How to switch

1. Temporary (one run): set `VIBE_WEB_ENGINE=electron` (or `chromium`) in the shell, then launch.
2. Persistent: set `"webEngine": "electron"` (or `chromium`) in `config/local.json`.
3. Never edit `config/default.json` — overlays only.
