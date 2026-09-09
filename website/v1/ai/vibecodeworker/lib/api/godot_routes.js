'use strict';
const path = require('path');
const runtime = require('../godot_runtime');

function isCloud() { return process.platform === 'linux' && Boolean(process.env.VIBE_GODOT_CLOUD); }

async function handleGodotRequest(pathname, req, readBody, sendJSON, sendText) {
  if (pathname === '/api/godot/release') {
    if (req.method !== 'GET') return sendText(405, 'Method Not Allowed');
    try { return sendJSON(200, { success: true, release: await runtime.getLatestStableGodot() }); }
    catch (error) { return sendJSON(502, { success: false, error: error.message }); }
  }
  if (pathname === '/api/godot/status') {
    if (req.method !== 'GET') return sendText(405, 'Method Not Allowed');
    return sendJSON(200, { success: true, cloud: isCloud(), display: isCloud() ? ':1' : null, project: process.env.VIBE_GODOT_PROJECT || null, installRoot: process.env.GODOT_INSTALL_ROOT || null });
  }
  if (pathname === '/api/godot/install') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    try {
      const result = await runtime.installLatestStableGodot({ installRoot: process.env.GODOT_INSTALL_ROOT || path.join(process.cwd(), 'data', 'godot') });
      return sendJSON(200, { success: true, godot: result });
    } catch (error) { return sendJSON(502, { success: false, error: error.message }); }
  }
  if (pathname === '/api/godot/action') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    if (!isCloud()) return sendJSON(501, { success: false, error: 'Cloud Godot input needs the cloud desktop; local native input is served by the VCW desktop runtime.' });
    try { return sendJSON(200, await runtime.controlGodotOnLinux(await readBody(), process.env.VIBE_GODOT_DISPLAY || ':1')); }
    catch (error) { return sendJSON(400, { success: false, error: error.message }); }
  }
  if (pathname === '/api/godot/screenshot') {
    if (req.method !== 'GET') return sendText(405, 'Method Not Allowed');
    if (!isCloud()) return sendJSON(501, { success: false, error: 'Cloud screenshot capture needs the cloud desktop; local capture is served by the VCW desktop runtime.' });
    try { return sendJSON(200, await runtime.captureGodotOnLinux(process.env.VIBE_GODOT_DISPLAY || ':1')); }
    catch (error) { return sendJSON(500, { success: false, error: error.message }); }
  }
  return null;
}
module.exports = { handleGodotRequest };
