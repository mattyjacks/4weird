/**
 * @4weird/mcp — complementary tool definitions.
 *
 * Complements src/index.ts (which registers run_vcw_game_test,
 * get_game_state, query_squad_tasks over MCP stdio) without duplicating
 * those tools. This module is definitions-only: no transport, no fetch,
 * no side effects — index.ts (or a future host) decides how/whether to
 * wire each entry into a CallTool handler.
 *
 * Fail-open note: backends for these tools (frame analysis, squad writes,
 * coin ledger, studio export) may be unavailable in some environments.
 * Handlers built from these definitions should fail open — return a
 * placeholder/error payload via textResult-style content rather than
 * throwing past the MCP handler boundary where possible.
 */

/** MCP JSON-schema shape for a tool's input. */
export interface ToolInputSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

/** Local tool-definition shape (index.ts exports no reusable Tool type). */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  annotations?: { readOnlyHint?: boolean };
  /** Local read-only marker; mirrors annotations.readOnlyHint. */
  readOnly?: boolean;
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "game-qa.analyze-frame",
    description:
      "Analyze a single captured game frame (screenshot URL or state blob) and return QA findings.",
    inputSchema: {
      type: "object",
      properties: {
        gameSlug: {
          type: "string",
          description: "Slug of the game the frame came from",
        },
        frameUrl: {
          type: "string",
          description: "URL of the frame screenshot (or data URI)",
        },
        stateJson: {
          type: "string",
          description: "Optional serialized state blob accompanying the frame",
        },
      },
      required: ["gameSlug"],
    },
  },
  {
    name: "squad.create-task",
    description:
      "Create a Kanban task card on a 4weird Squad board. Fail-open: return an error payload if the squads backend is unreachable.",
    inputSchema: {
      type: "object",
      properties: {
        squadId: { type: "string", description: "UUID of the squad" },
        title: { type: "string", description: "Task card title" },
        body: { type: "string", description: "Optional task description" },
      },
      required: ["squadId", "title"],
    },
  },
  {
    name: "economy.coin-balance",
    description:
      "Read a player's coin balance from the 4weird economy ledger (read-only). Fail-open: return a zero/unknown-balance payload if the ledger is unreachable.",
    inputSchema: {
      type: "object",
      properties: {
        playerId: { type: "string", description: "Player or wallet id" },
      },
      required: ["playerId"],
    },
    annotations: { readOnlyHint: true },
    readOnly: true,
  },
  {
    name: "studio.export-timeline",
    description:
      "Export a studio timeline for a game run. Fail-open: return an error payload if the studio backend is unreachable.",
    inputSchema: {
      type: "object",
      properties: {
        gameSlug: { type: "string", description: "Slug of the game" },
        runId: { type: "string", description: "QA run id to export" },
        format: {
          type: "string",
          enum: ["mp4", "json"],
          description: "Export format (default json)",
        },
      },
      required: ["gameSlug", "runId"],
    },
  },
];

/** Return the tool entry for `name`, or undefined when unknown. */
export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.name === name);
}
