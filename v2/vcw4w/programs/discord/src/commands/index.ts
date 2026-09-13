import {
  ChatInputCommandInteraction,
  REST,
  Routes,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { balanceData, handleBalance } from "./balance.js";
import {
  handleRaidLeaderboard,
  raidLeaderboardData,
} from "./raid-leaderboard.js";
import { handleRaidSignup, raidSignupData } from "./raid-signup.js";
import { handleRoster, rosterData } from "./roster.js";

const commands: Array<SlashCommandBuilder | SlashCommandOptionsOnlyBuilder> = [
  raidSignupData,
  raidLeaderboardData,
  balanceData,
  rosterData,
];

const handlers: Record<string, (i: ChatInputCommandInteraction) => Promise<void>> = {
  "raid-signup": handleRaidSignup,
  "raid-leaderboard": handleRaidLeaderboard,
  balance: handleBalance,
  "clan-roster": handleRoster,
};

export function commandPayloads(): unknown[] {
  return commands.map((c) => c.toJSON());
}

export async function dispatch(interaction: ChatInputCommandInteraction): Promise<void> {
  const handler = handlers[interaction.commandName];
  if (!handler) {
    await interaction.reply({ content: "Unknown command.", ephemeral: true });
    return;
  }
  await handler(interaction);
}

/** One-shot slash-command registration (run via `npm run register`). */
export async function registerCommands(): Promise<void> {
  const token = process.env["DISCORD_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];
  const guildId = process.env["DISCORD_GUILD_ID"];
  if (!token || !clientId) {
    throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required (see README).");
  }
  const rest = new REST({ version: "10" }).setToken(token);
  const body = commandPayloads();
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body });
  }
}
