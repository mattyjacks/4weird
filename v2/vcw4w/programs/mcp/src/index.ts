/**
 * @4weird/mcp — official 4weird Model Context Protocol server.
 *
 * Remastery README §4.5 Feature 18 (Wave 2). Exposes 4weird capabilities
 * (VibeCodeWorker game QA runs, game state lookups, squad Kanban task
 * queries) to AI coding tools over stdio. No worker-search tools.
 *
 * Transport note: this package speaks MCP over stdio only. It calls the
 * public 4weird HTTP API whose base URL comes from FOURWEIRD_API_URL
 * (default https://4weird.com). No API keys are stored here — auth, if
 * needed, is supplied at runtime via the FOURWEIRD_API_TOKEN env var
 * (placeholder only; never commit a real token).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export const MCP_SERVER_NAME = "@4weird/mcp" as const;
export const MCP_SERVER_VERSION = "2.1.0" as const;

/** Base URL of the 4weird HTTP API (env override, placeholder-friendly). */
export function apiBaseUrl(): string {
  return process.env.FOURWEIRD_API_URL || "https://4weird.com";
}

/** Optional bearer token from env only — never hardcode a real key. */
function authHeaders(): Record<string, string> {
  const token = process.env.FOURWEIRD_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`4weird API ${res.status} ${res.statusText} for ${url}`);
  }
  return (await res.json()) as unknown;
}

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function createServer(): Server {
  const server = new Server(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "run_vcw_game_test",
          description:
            "Trigger an automated VibeCodeWorker game QA run on a 4weird game and return detected bugs.",
          inputSchema: {
            type: "object",
            properties: {
              gameSlug: {
                type: "string",
                description: "Slug of the game to test (e.g. gravegain3d, xonotic)",
              },
              captureMode: {
                type: "string",
                enum: ["screenshot", "state_data", "full_state"],
              },
              durationSeconds: {
                type: "number",
                description: "Test duration in seconds (default 30)",
              },
            },
            required: ["gameSlug"],
          },
        },
        {
          name: "get_game_state",
          description:
            "Fetch live leaderboards, save state, and catalog metadata for a 4weird game.",
          inputSchema: {
            type: "object",
            properties: {
              gameSlug: { type: "string", description: "Game slug" },
            },
            required: ["gameSlug"],
          },
        },
        {
          name: "query_squad_tasks",
          description:
            "Retrieve active Kanban sprint cards and tasks for a 4weird Squad.",
          inputSchema: {
            type: "object",
            properties: {
              squadId: { type: "string", description: "UUID of the squad" },
            },
            required: ["squadId"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const baseUrl = apiBaseUrl();

    if (name === "run_vcw_game_test") {
      const data = await fetchJson(`${baseUrl}/api/vcw/runs`, {
        method: "POST",
        body: JSON.stringify({
          gameSlug: String(args?.gameSlug ?? ""),
          captureMode: String(args?.captureMode ?? "screenshot"),
          durationSeconds: Number(args?.durationSeconds ?? 30),
        }),
      });
      return textResult(data);
    }

    if (name === "get_game_state") {
      const slug = String(args?.gameSlug ?? "");
      const data = await fetchJson(`${baseUrl}/api/games/${encodeURIComponent(slug)}`);
      return textResult(data);
    }

    if (name === "query_squad_tasks") {
      const squadId = String(args?.squadId ?? "");
      const data = await fetchJson(
        `${baseUrl}/api/squads/${encodeURIComponent(squadId)}/tasks`,
      );
      return textResult(data);
    }

    throw new Error(`Tool not found: ${name}`);
  });

  return server;
}

async function run(): Promise<void> {
  const transport = new StdioServerTransport();
  await createServer().connect(transport);
}

// Only auto-connect when executed as the entrypoint, so tests and hosts
// can import createServer()/apiBaseUrl() without starting stdio.
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
