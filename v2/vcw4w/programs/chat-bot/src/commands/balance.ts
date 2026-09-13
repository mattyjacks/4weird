import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { lookupCoinBalance } from "../lib/ledger.js";

/**
 * /balance (STUB): coin-balance lookup.
 *
 * COIN HARD RULE: the bot never invents balances. The lookup goes through
 * `lookupCoinBalance`, which mirrors the canonical `coin_ledger` SUM(delta)
 * convention — and until a real `LedgerReader` is injected it answers with
 * an explicit stub notice, surfaced verbatim. A notice is never a number.
 */
export const balanceData = new SlashCommandBuilder()
  .setName("balance")
  .setDescription("Look up your Vibe Coin balance (STUB: not wired to the ledger yet)");

export async function handleBalance(interaction: ChatInputCommandInteraction): Promise<void> {
  // TODO(clan-raids): map interaction.user.id -> 4weird user id (link table).
  // Until linked, look up by the chat id verbatim so a future reader can
  // resolve it; the STUB path below fires first anyway (no reader injected).
  const result = await lookupCoinBalance(interaction.user.id);
  if (!result.ok || !result.balance) {
    await interaction.reply({
      content: result.stubNotice ?? "STUB: balance unavailable.",
      ephemeral: true,
    });
    return;
  }
  const { balanceCoins, usdEquivalent } = result.balance;
  await interaction.reply({
    content: `<@${interaction.user.id}> balance: **${balanceCoins}** Vibe Coins (~$${usdEquivalent.toFixed(2)} at 100 coins = $1.00).`,
    ephemeral: true,
  });
}
