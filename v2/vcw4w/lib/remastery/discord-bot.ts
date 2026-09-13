/**
 * 4weird community / clan-raid Discord bot config + pure helpers.
 * Remastery README Feature 19 (Wave 2).
 *
 * Pure schemas/builders only — no discord.js import, no network calls,
 * no window, no tokens/secrets. Safe for server + client bundling.
 */

export const COMMAND_PREFIX = "!4w";

export interface SlashCommandSchema {
  name: string;
  description: string;
  options?: Array<{
    name: string;
    description: string;
    required?: boolean;
    type: "string" | "integer" | "boolean" | "user" | "channel";
  }>;
}

export interface RaidSchedule {
  raidId: string;
  clanId: string;
  startsAtMs: number;
  durationMinutes: number;
}

const SLASH_NAME_RE = /^[\w-]{1,32}$/;
const ALLOWED_OPTION_TYPES = new Set(["string", "integer", "boolean", "user", "channel"]);

/**
 * Validate a slash command against Discord constraints.
 * Returns a list of human-readable error strings (empty = valid).
 */
export function validateSlashCommand(cmd: SlashCommandSchema): string[] {
  const errors: string[] = [];

  if (!cmd || typeof cmd !== "object") {
    return ["command must be an object"];
  }

  // name: lowercase, 1..32, ^[\w-]{1,32}$
  if (typeof cmd.name !== "string" || cmd.name.length === 0) {
    errors.push("name must be a non-empty string (1..32 chars)");
  } else {
    if (cmd.name.length > 32) {
      errors.push("name must be 1..32 characters");
    }
    if (!SLASH_NAME_RE.test(cmd.name)) {
      errors.push("name must match /^[\\w-]{1,32}$/");
    }
    if (cmd.name !== cmd.name.toLowerCase()) {
      errors.push("name must be lowercase");
    }
  }

  // description: 1..100 chars
  if (typeof cmd.description !== "string" || cmd.description.length === 0) {
    errors.push("description must be a non-empty string (1..100 chars)");
  } else if (cmd.description.length > 100) {
    errors.push("description must be 1..100 characters");
  }

  // options
  if (cmd.options !== undefined) {
    if (!Array.isArray(cmd.options)) {
      errors.push("options must be an array");
    } else {
      cmd.options.forEach((opt, i) => {
        const where = `options[${i}]`;
        if (!opt || typeof opt !== "object") {
          errors.push(`${where} must be an object`);
          return;
        }
        if (typeof opt.name !== "string" || opt.name.length === 0) {
          errors.push(`${where}.name must be a non-empty string (1..32 chars)`);
        } else {
          if (opt.name.length > 32) {
            errors.push(`${where}.name must be 1..32 characters`);
          }
          if (!SLASH_NAME_RE.test(opt.name)) {
            errors.push(`${where}.name must match /^[\\w-]{1,32}$/`);
          }
          if (opt.name !== opt.name.toLowerCase()) {
            errors.push(`${where}.name must be lowercase`);
          }
        }
        if (typeof opt.description !== "string" || opt.description.length === 0) {
          errors.push(`${where}.description must be a non-empty string (1..100 chars)`);
        } else if (opt.description.length > 100) {
          errors.push(`${where}.description must be 1..100 characters`);
        }
        if (opt.required !== undefined && typeof opt.required !== "boolean") {
          errors.push(`${where}.required must be a boolean`);
        }
        if (!ALLOWED_OPTION_TYPES.has(opt.type)) {
          errors.push(`${where}.type must be one of string|integer|boolean|user|channel`);
        }
      });
    }
  }

  return errors;
}

/**
 * Built-in 4weird clan-raid slash commands (game-flavored, no secrets).
 */
export function builtinCommands(): SlashCommandSchema[] {
  return [
    {
      name: "raid",
      description: "Start a clan raid and rally the squad to the drop zone.",
      options: [
        {
          name: "clan",
          description: "Clan to raid with",
          required: true,
          type: "string",
        },
        {
          name: "starts-in",
          description: "Minutes until the raid gate opens",
          required: false,
          type: "integer",
        },
      ],
    },
    {
      name: "coins",
      description: "Check your 4weird coin balance, raider.",
    },
    {
      name: "squad",
      description: "Show your current squad lineup and readiness.",
      options: [
        {
          name: "squad",
          description: "Squad name to inspect",
          required: false,
          type: "string",
        },
      ],
    },
    {
      name: "challenge",
      description: "Challenge a rival to a 1v1 showdown.",
      options: [
        {
          name: "rival",
          description: "The rival to challenge",
          required: true,
          type: "user",
        },
        {
          name: "wager",
          description: "Coin wager for the showdown",
          required: false,
          type: "integer",
        },
      ],
    },
  ];
}

/**
 * Pure countdown math for a raid start timestamp.
 * Never returns a negative startsInMs. isLive is true once start time passes.
 */
export function nextRaidIn(startsAtMs: number, nowMs: number = Date.now()): {
  startsInMs: number;
  isLive: boolean;
} {
  const start = Number.isFinite(startsAtMs) ? startsAtMs : 0;
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const diff = start - now;
  return {
    startsInMs: diff > 0 ? diff : 0,
    isLive: start <= now,
  };
}

/**
 * Format a coin balance with 100 coins = $1 parity.
 * e.g. formatCoins(1250) -> "1,250 coins ($12.50)"
 */
export function formatCoins(coins: number): string {
  const safe = Number.isFinite(coins) ? Math.trunc(coins) : 0;
  const grouped = Math.abs(safe).toLocaleString("en-US");
  const sign = safe < 0 ? "-" : "";
  const dollars = (Math.abs(safe) / 100).toFixed(2);
  const dollarPart = safe < 0 ? `$-${dollars}` : `$${dollars}`;
  return `${sign}${grouped} coins (${dollarPart})`;
}
