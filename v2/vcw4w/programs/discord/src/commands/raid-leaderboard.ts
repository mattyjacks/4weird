import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { rankedSignups } from "./raid-signup.js";

/**
 * /raid-leaderboard (STUB): ranks the in-memory signups from raid-signup.ts.
 * Signup order = rank order here. Reads ONLY the stub signup store — never
 * the coin ledger, never any persistent table.
 */
export const raidLeaderboardData = new SlashCommandBuilder()
  .setName("raid-leaderboard")
  .setDescription("Show the raid signup leaderboard (STUB: in-memory only)")
  .addStringOption((opt) =>
    opt.setName("raid").setDescription("Raid id or name").setRequired(true),
  );

export async function handleRaidLeaderboard(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const raid = interaction.options.getString("raid", true);
  const ranked = rankedSignups(interaction.guildId, raid);
  if (ranked.length === 0) {
    await interaction.reply({
      content: `STUB: no signups yet for raid **${raid}**. Use /raid-signup first.`,
      ephemeral: true,
    });
    return;
  }
  const lines = ranked.map((id, i) => `${i + 1}. <@${id}>`);
  await interaction.reply({
    content: `STUB leaderboard for raid **${raid}** (signup order, in-memory):\n${lines.join("\n")}`,
    ephemeral: true,
  });
}
