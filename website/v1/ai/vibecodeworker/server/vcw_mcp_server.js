#!/usr/bin/env node
'use strict';
// VCW stdio MCP bridge. Dependency-free JSON-RPC so the bridge works with any MCP host.
const readline = require('readline');
const base = (process.env.VCW_API_URL || 'http://127.0.0.1:42069').replace(/\/$/, '');
const token = process.env.VIBE_API_TOKEN || '';
const rawTools = [
  ['vcw_status', 'Read VCW health and active target.', 'GET', '/api/status', {}],
  ['vcw_list_games', 'List available local games.', 'GET', '/api/games', {}],
  ['vcw_get_state', 'Read the active game state.', 'GET', '/api/game/state', {}],
  ['vcw_get_logs', 'Read recent VCW and game logs.', 'GET', '/api/game/logs', {}],
  ['vcw_launch_game', 'Launch one discovered game by id.', 'POST', '/api/game/launch', { gameId: { type: 'string', description: 'Exact VCW game id' } }],
  ['vcw_send_action', 'Send one supervised input action to the active target.', 'POST', '/api/game/action', { type: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' }, key: { type: 'string' } }],
  ['vcw_create_bug', 'Record a human-reviewable bug report.', 'POST', '/api/bugs', { title: { type: 'string' }, description: { type: 'string' }, severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } }],
  ['vcw_generate_handoff', 'Write a portable AI handoff brief.', 'POST', '/api/opencode/handoff', { reason: { type: 'string' } }]
];
const tools = new Map(rawTools.map(([name, description, method, path, properties]) => [name, { name, description, method, path, inputSchema: { type: 'object', properties, additionalProperties: false } }]));
async function call(tool, args) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Vibe-Auth'] = token;
  const response = await fetch(base + tool.path, { method: tool.method, headers, body: tool.method === 'GET' ? undefined : JSON.stringify(args || {}) });
  const data = await response.json().catch(async () => ({ error: await response.text() }));
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: !response.ok };
}
function emit(payload) { process.stdout.write(JSON.stringify(payload) + '\n'); }
readline.createInterface({ input: process.stdin }).on('line', async (line) => {
  let request;
  try { request = JSON.parse(line); } catch (error) { return emit({ jsonrpc: '2.0', id: null, error: { code: -32700, message: error.message } }); }
  try {
    if (request.method === 'initialize') return emit({ jsonrpc: '2.0', id: request.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'vcw', version: '2.0.0' } } });
    if (request.method === 'tools/list') return emit({ jsonrpc: '2.0', id: request.id, result: { tools: [...tools.values()].map(({ method, path, ...tool }) => tool) } });
    if (request.method === 'tools/call') {
      const tool = tools.get(request.params && request.params.name);
      if (!tool) return emit({ jsonrpc: '2.0', id: request.id, error: { code: -32602, message: 'Unknown VCW tool' } });
      return emit({ jsonrpc: '2.0', id: request.id, result: await call(tool, request.params.arguments) });
    }
    if (request.id !== undefined) emit({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } });
  } catch (error) { emit({ jsonrpc: '2.0', id: request.id || null, error: { code: -32603, message: error.message } }); }
});
