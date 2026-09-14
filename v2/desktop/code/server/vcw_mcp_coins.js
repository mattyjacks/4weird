#!/usr/bin/env node
'use strict';
//
// vcw_mcp_coins.js — desktop MCP coin-payment module.
//
// Registers ONE read-only tool, `heal_quote`, ALONGSIDE the existing
// server/vcw_mcp_server.js bridge. It does NOT replace or rewrite that file:
// it reuses its dependency-free tool-table pattern verbatim
// (rawTools rows -> Map -> fetch caller -> JSON-RPC content payload),
// so a host can merge `coinTools` into the main server's table:
//
//   const { coinTools } = require('./vcw_mcp_coins.js');
//   for (const [name, tool] of coinTools) tools.set(name, tool);
//
// What `heal_quote` does:
//   Calls the web heal-quote API (GET /api/budgets/heal-quote?tokens=<n>&bugs=<k>)
//   READ-ONLY via the global fetch. It returns a coin QUOTE for a heal-loop run
//   and NEVER moves coins itself: zero writes, zero ledger touches, no settlement.
//
// Auth/secrets: none in this file. The bearer token (if any) comes ONLY from
// the VIBE_API_TOKEN environment variable at runtime, same convention as
// vcw_mcp_server.js. Never hardcode tokens, keys, or cookies here.
//
// QUEUED ECONOMY-LANE ITEM (future work, NOT implemented here):
//   `heal_pay` — actual coin settlement for an accepted heal quote
//   (debit payer, credit worker cut, ledger write with idempotency key).
//   Settlement stays a later economy-lane envelope; this module must remain
//   quote-only until that lane lands. Do NOT add payment writes here.

const base = (process.env.VCW_WEB_URL || process.env.VCW_API_URL || 'http://127.0.0.1:42069').replace(/\/$/, '');
const token = process.env.VIBE_API_TOKEN || '';

// Same row shape as vcw_mcp_server.js:
// [name, description, method, path, properties]
const rawCoinTools = [
  ['heal_quote', 'Read-only coin QUOTE for a heal-loop run. Never moves coins; settlement is a future economy-lane item.', 'GET', '/api/budgets/heal-quote', {
    tokens: { type: 'number', description: 'Estimated heal-loop tokens consumed' },
    bugs: { type: 'number', description: 'Estimated bug reports filed by the run' },
  }],
];

const coinTools = new Map(rawCoinTools.map(([name, description, method, path, properties]) => [name, { name, description, method, path, inputSchema: { type: 'object', properties, additionalProperties: false } }]));

async function callCoinTool(tool, args) {
  const params = new URLSearchParams();
  if (args && args.tokens !== undefined) params.set('tokens', String(args.tokens));
  if (args && args.bugs !== undefined) params.set('bugs', String(args.bugs));
  const query = params.toString();
  const url = base + tool.path + (query ? '?' + query : '');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Vibe-Auth'] = token;
  const response = await fetch(url, { method: tool.method, headers });
  const data = await response.json().catch(async () => ({ error: await response.text() }));
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: !response.ok };
}

module.exports = { coinTools, callCoinTool, rawCoinTools };
