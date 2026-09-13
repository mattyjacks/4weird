// @4weird/mcp tool registry (remastery README Feature 18, Wave 2).
// Pure: no window/DOM/network, no secrets, no I/O. Fail-open call semantics.

export type McpToolCategory = "game-qa" | "squad" | "economy" | "studio";

export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  category: McpToolCategory;
}

export type McpHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

export interface McpCallResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

const VALID_CATEGORIES: readonly McpToolCategory[] = ["game-qa", "squad", "economy", "studio"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

export function validateToolSchema(schema: McpToolSchema): string[] {
  const errors: string[] = [];
  if (!schema || typeof schema !== "object") return ["schema must be an object"];
  if (typeof schema.name !== "string" || schema.name.trim().length === 0) {
    errors.push("name must be a non-blank string");
  }
  if (typeof schema.description !== "string" || schema.description.trim().length === 0) {
    errors.push("description must be a non-blank string");
  }
  if (!VALID_CATEGORIES.includes(schema.category as McpToolCategory)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }
  if (!isPlainObject(schema.inputSchema)) {
    errors.push("inputSchema must be a plain object (JSON-schema style)");
  }
  return errors;
}

export class McpRegistry {
  private readonly tools = new Map<string, { schema: McpToolSchema; handler: McpHandler }>();

  register(schema: McpToolSchema, handler: McpHandler): void {
    const errors = validateToolSchema(schema);
    if (errors.length > 0) {
      throw new Error(`invalid tool schema for "${schema?.name ?? "?"}": ${errors.join("; ")}`);
    }
    if (typeof handler !== "function") {
      throw new Error(`invalid handler for "${schema.name}": handler must be a function`);
    }
    if (this.tools.has(schema.name)) {
      throw new Error(`duplicate tool name: "${schema.name}"`);
    }
    this.tools.set(schema.name, { schema, handler });
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  names(): string[] {
    return [...this.tools.keys()];
  }

  async call(name: string, args: Record<string, unknown>): Promise<McpCallResult> {
    const entry = this.tools.get(name);
    if (!entry) {
      return { ok: false, error: `unknown tool: "${name}"` };
    }
    try {
      const safeArgs: Record<string, unknown> = isPlainObject(args) ? args : {};
      const result = await entry.handler(safeArgs);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export function builtinToolSchemas(): McpToolSchema[] {
  return [
    {
      name: "game-qa.analyze-frame",
      description: "Analyze a single game QA frame snapshot and report visual/gameplay issues.",
      inputSchema: {
        type: "object",
        properties: {
          frameId: { type: "string" },
          gameSlug: { type: "string" },
        },
        required: ["frameId"],
      },
      category: "game-qa",
    },
    {
      name: "squad.create-task",
      description: "Create a new squad task with a title and optional assignee.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          assignee: { type: "string" },
        },
        required: ["title"],
      },
      category: "squad",
    },
    {
      name: "economy.coin-balance",
      description: "Read-only: fetch a player's coin balance. This economy tool is read-only and never mutates balances.",
      inputSchema: {
        type: "object",
        properties: {
          playerId: { type: "string" },
        },
        required: ["playerId"],
      },
      category: "economy",
    },
    {
      name: "studio.export-timeline",
      description: "Export a studio timeline to a rendered media artifact.",
      inputSchema: {
        type: "object",
        properties: {
          timelineId: { type: "string" },
          format: { type: "string", enum: ["video", "image", "audio"] },
        },
        required: ["timelineId"],
      },
      category: "studio",
    },
  ];
}
