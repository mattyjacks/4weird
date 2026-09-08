/**
 * AI Vision Mirror - object detection script builder.
 *
 * Builds a self-contained page-side script (runs via eval in the test
 * window) that returns a JSON string:
 *   { source: 'game'|'dom'|'error', cursor: {...}|null, objects: [...] }
 *
 * Two recognition modes, selected automatically inside the page:
 *  - GAME mode: GraveGain3D dungeon is live -> every living enemy is
 *    projected through the 3D camera (canvas-rect mapped, same math as
 *    GraveGainBotInput.projectEnemy) and boxed with name + HP.
 *  - DOM mode: anything else (menus, arbitrary WEBSITES like
 *    mattyjacks.com) -> visible interactive elements (buttons, links,
 *    inputs, headings, media) are boxed with their text labels.
 *
 * All coordinates are 0-1000 normalized viewport space, matching the
 * bot action space and the mirror canvas mapping. Pure Node module.
 */

function buildDetectScript(maxObjects) {
  const max = Math.max(5, Math.min(80, parseInt(maxObjects, 10) || 40));
  // Built with concatenation (no nested template literals) so the page
  // script stays intact when embedded in dispatcher template strings.
  return (
    '(() => {\n' +
    '  try {\n' +
    '    var W = window.innerWidth || 1, H = window.innerHeight || 1;\n' +
    '    var nx = function (px) { return Math.max(0, Math.min(1000, Math.round(px / W * 1000))); };\n' +
    '    var ny = function (py) { return Math.max(0, Math.min(1000, Math.round(py / H * 1000))); };\n' +
    '    var out = { source: "dom", cursor: null, objects: [] };\n' +
    // --- bot cursor readout (exact overlay position) ---
    '    try {\n' +
    '      var cur = document.getElementById("vibe-bot-cursor");\n' +
    '      if (cur) {\n' +
    '        var cr = cur.getBoundingClientRect();\n' +
    '        var lbl = document.getElementById("vibe-bot-cursor-label");\n' +
    '        out.cursor = { x: nx(cr.left + cr.width / 2), y: ny(cr.top + cr.height / 2),\n' +
    '          label: lbl ? String(lbl.textContent).slice(0, 40) : "",\n' +
    '          visible: cur.classList.contains("on") };\n' +
    '      }\n' +
    '    } catch (e0) {}\n' +
    // --- GAME mode: live GraveGain3D dungeon enemies ---
    '    var g = window.GraveGainGame;\n' +
    // --- GAME mode: GraveGain2D top-down enemies ---
    '    if (g && g.player && g.camera && g.enemies && document.getElementById("gameCanvas")) {\n' +
    '      out.source = "game";\n' +
    '      var c2 = document.getElementById("gameCanvas");\n' +
    '      var off2 = g.camera.getOffsets();\n' +
    '      var cw2 = c2.width || 1000, ch2 = c2.height || 600;\n' +
    '      (g.enemies || []).forEach(function (e) {\n' +
    '        if (!e || e.hp <= 0 || out.objects.length >= ' + max + ') return;\n' +
    '        var ex = e.x - off2.x, ey = e.y - off2.y;\n' +
    '        if (ex < -50 || ex > cw2 + 50 || ey < -50 || ey > ch2 + 50) return;\n' +
    '        out.objects.push({ x: nx(ex / cw2 * W), y: ny(ey / ch2 * H), w: 42, h: 42,\n' +
    '          label: (e.name || "enemy") + " " + Math.max(0, Math.round(e.hp)) + "hp", kind: "enemy" });\n' +
    '      });\n' +
    '      return JSON.stringify(out);\n' +
    '    }\n' +
    '    if (g && g.inDungeon && g.player && g.player.hp > 0 && g.camera3d && window.THREE) {\n' +
    '      out.source = "game";\n' +
    '      var canvas = document.getElementById("gameCanvas");\n' +
    '      var rect = canvas ? canvas.getBoundingClientRect() : null;\n' +
    '      var v = new window.THREE.Vector3();\n' +
    '      (g.enemies || []).forEach(function (e) {\n' +
    '        if (!e || e.hp <= 0 || out.objects.length >= ' + max + ') return;\n' +
    '        v.set(e.x, 18, e.y).project(g.camera3d);\n' +
    '        if (v.z > 1) return;\n' +
    '        var px = rect ? rect.left + (v.x * 0.5 + 0.5) * rect.width : (v.x * 0.5 + 0.5) * W;\n' +
    '        var py = rect ? rect.top + (-v.y * 0.5 + 0.5) * rect.height : (-v.y * 0.5 + 0.5) * H;\n' +
    '        var dist = Math.hypot(e.x - g.player.x, e.y - g.player.y);\n' +
    '        var size = Math.max(24, Math.min(90, Math.round(9000 / Math.max(60, dist))));\n' +
    '        out.objects.push({ x: nx(px), y: ny(py),\n' +
    '          w: nx(px + size) - nx(px - size) || 40, h: ny(py + size) - ny(py - size) || 40,\n' +
    '          label: (e.name || "enemy") + " " + Math.max(0, Math.round(e.hp)) + "hp " + Math.round(dist) + "px",\n' +
    '          kind: "enemy" });\n' +
    '      });\n' +
    '      return JSON.stringify(out);\n' +
    '    }\n' +
    // --- DOM mode: any page / website object recognition ---
    '    var SEL = "button, a, input, select, textarea, [role=button], h1, h2, h3, img, video, canvas";\n' +
    '    var els = document.querySelectorAll(SEL);\n' +
    '    for (var i = 0; i < els.length && out.objects.length < ' + max + '; i++) {\n' +
    '      var el = els[i];\n' +
    '      var r = el.getBoundingClientRect();\n' +
    '      if (r.width < 10 || r.height < 8) continue;\n' +
    '      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;\n' +
    '      var style = window.getComputedStyle(el);\n' +
    '      if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) continue;\n' +
    '      var tag = el.tagName.toLowerCase();\n' +
    '      var kind = "other";\n' +
    '      if (tag === "button" || el.getAttribute("role") === "button") kind = "button";\n' +
    '      else if (tag === "a") kind = "link";\n' +
    '      else if (tag === "input" || tag === "select" || tag === "textarea") kind = "input";\n' +
    '      else if (tag === "h1" || tag === "h2" || tag === "h3") kind = "heading";\n' +
    '      else if (tag === "img" || tag === "video" || tag === "canvas") kind = "media";\n' +
    '      var label = el.getAttribute("aria-label") || el.alt || el.value || el.title || "";\n' +
    '      if (!label && (tag === "img" || tag === "video" || tag === "canvas")) label = el.id || tag;\n' +
    '      if (!label) label = (el.innerText || "").replace(/\\s+/g, " ").trim();\n' +
    '      if (!label) label = el.id ? "#" + el.id : tag;\n' +
    '      label = String(label).slice(0, 30);\n' +
    '      out.objects.push({ x: nx(r.left), y: ny(r.top),\n' +
    '        w: Math.max(4, nx(r.right) - nx(r.left)), h: Math.max(4, ny(r.bottom) - ny(r.top)),\n' +
    '        label: label, kind: kind });\n' +
    '    }\n' +
    '    return JSON.stringify(out);\n' +
    '  } catch (err) {\n' +
    '    return JSON.stringify({ source: "error", cursor: null, objects: [], error: String(err.message || err) });\n' +
    '  }\n' +
    '})()'
  );
}

// Normalize a detect response: page returns a JSON string, but Electron
// executeJavaScript may hand back an already-parsed object.
function parseDetectResponse(raw) {
  const fallback = { source: 'error', cursor: null, objects: [], error: 'empty response' };
  try {
    if (raw === null || raw === undefined) return fallback;
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!o || typeof o !== 'object') return fallback;
    return {
      source: typeof o.source === 'string' ? o.source : 'error',
      cursor: o.cursor && typeof o.cursor === 'object' ? o.cursor : null,
      objects: Array.isArray(o.objects) ? o.objects.slice(0, 80) : [],
      error: o.error ? String(o.error) : null
    };
  } catch (e) {
    return { source: 'error', cursor: null, objects: [], error: String(e.message || e) };
  }
}

module.exports = {
  buildDetectScript,
  parseDetectResponse
};
