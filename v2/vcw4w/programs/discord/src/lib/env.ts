export interface BotConfig {
  tokenPresent: boolean;
  clientId: string | null;
  guildId: string | null;
  nodeEnv: string;
}

function cleanOptional(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function loadBotConfig(
  env: Record<string, string | undefined> = process.env,
): BotConfig {
  const token = env["DISCORD_TOKEN"];
  const nodeEnv = cleanOptional(env["NODE_ENV"]);
  return {
    tokenPresent: typeof token === "string" && token.length > 0,
    clientId: cleanOptional(env["DISCORD_CLIENT_ID"]),
    guildId: cleanOptional(env["DISCORD_GUILD_ID"]),
    nodeEnv: nodeEnv ?? "development",
  };
}

export function validateBotConfig(cfg: BotConfig): string[] {
  const errors: string[] = [];
  if (!cfg.tokenPresent) {
    errors.push("missing required env DISCORD_TOKEN");
  }
  if (cfg.clientId === null) {
    errors.push("missing required env DISCORD_CLIENT_ID");
  }
  return errors;
}
