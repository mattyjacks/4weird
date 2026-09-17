# vcwcode-engine-note.md — ultralight / electron / chromium selector persistence note

## Engines
- `ultralight` — lightweight embedded view. Fastest startup, smallest bundle.
  Use for dashboards and status pages without heavy web features.
- `electron` — full desktop shell. Use when native menus, tray, or Node
  integration is required.
- `chromium` — system/embedded Chromium. Fallback when neither Ultralight
  nor Electron is available, or for pixel-parity checks with the web build.

## Selector contract (integrator implements)
- Control id: `#vcwcode-engine-select` with options `ultralight|electron|chromium`.
- Persist the choice in `localStorage` under key `vcwcode.engine`
  (string, one of the three values above; default `electron` when unset).
- Read the stored value on startup before first render and set the
  `<select>` to match; write back on `change`.
- Never persist anything else under this key. If the stored value is not
  one of the three, discard it and fall back to `electron`.

## Minimal wiring (illustrative, framework-free)
```html
<select id="vcwcode-engine-select">
  <option value="ultralight">Ultralight</option>
  <option value="electron">Electron</option>
  <option value="chromium">Chromium</option>
</select>
<script>
  var KEY = 'vcwcode.engine', sel = document.getElementById('vcwcode-engine-select');
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  sel.value = (saved === 'ultralight' || saved === 'chromium') ? saved : 'electron';
  sel.addEventListener('change', function () {
    try { localStorage.setItem(KEY, sel.value); } catch (e) {}
  });
</script>
```
