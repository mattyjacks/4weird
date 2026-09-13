import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

/**
 * /clan-roster (STUB): shows the clan roster.
 *
 * No clan-membership source exists in this skeleton (future: `team_members`
 * / clan tables per the remastery data model), so this command answers with
 * an explicit stub notice. It never fabricates member lists.
 */
export const rosterData = new SlashCommandBuilder()
  .setName("clan-roster")
  .setDescription("Show the clan roster (STUB: no membership source wired yet)");

export async function handleRoster(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({
    content:
      "STUB: clan roster is not wired yet — no membership source (team_members / clan tables) is connected, so no roster is shown rather than an invented one.",
    ephemeral: true,
  });
}
