import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from "discord.js";

/**
 * /challenge (STUB): issue a 1v1 challenge to a rival.
 *
 * No wagers, ever — this command declares a friendly match only, never moves
 * funds, and never touches the ledger. Do not agree coin stakes in chat.
 */
export const challengeData = new SlashCommandBuilder()
  .setName("challenge")
  .setDescription("Challenge a rival to a 1v1 (STUB: declaration only, no funds move)")
  .addUserOption((opt: SlashCommandUserOption) =>
    opt.setName("rival").setDescription("The rival to challenge").setRequired(true),
  )
  .addStringOption((opt: SlashCommandStringOption) =>
    opt.setName("game").setDescription("Game or mode for the 1v1").setRequired(false),
  );

export async function handleChallenge(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const rival = interaction.options.getUser("rival", true);
    const rawGame = interaction.options.getString("game", false);
    const game = rawGame?.trim() ? rawGame.trim().slice(0, 100) : null;

    if (rival.id === interaction.user.id) {
      await interaction.reply({
        content: "You cannot challenge yourself to a 1v1 — pick another rival.",
        ephemeral: true,
      });
      return;
    }
    if (rival.bot) {
      await interaction.reply({
        content: "Bots cannot accept 1v1 challenges — pick a human rival.",
        ephemeral: true,
      });
      return;
    }

    const gamePart = game ? ` at **${game}**` : "";
    await interaction.reply({
      content:
        `<@${interaction.user.id}> challenges <@${rival.id}> to a friendly 1v1${gamePart}! ` +
        `<@${rival.id}>, reply to accept or decline. ` +
        `STUB: declaration only — no funds move here, and wagers are not allowed.`,
    });
  } catch (err) {
    const detail = err instanceof Error ? `: ${err.message}` : "";
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: `Could not issue the 1v1 challenge${detail}. Nothing was recorded and no funds moved.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `Could not issue the 1v1 challenge${detail}. Nothing was recorded and no funds moved.`,
          ephemeral: true,
        });
      }
    } catch {
      // Fail-open: declaration-only command — never throw out of the handler.
    }
  }
}
