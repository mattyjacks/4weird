import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
} from "discord.js";

/**
 * STUB store: in-memory raid signups, keyed by `${guildId}:${raidId}`.
 * Ephemeral by design — lost on restart. The Wave-2+ slice persists this
 * (e.g. a `raid_signups` table); this skeleton only proves the command shape.
 */
const signups = new Map<string, Set<string>>();

function keyFor(guildId: string | null, raidId: string): string {
  return `${guildId ?? "dm"}:${raidId}`;
}

export function signupUser(guildId: string | null, raidId: string, userId: string): number {
  const key = keyFor(guildId, raidId);
  let set = signups.get(key);
  if (!set) {
    set = new Set();
    signups.set(key, set);
  }
  set.add(userId);
  return set.size;
}

export function signupCount(guildId: string | null, raidId: string): number {
  return signups.get(keyFor(guildId, raidId))?.size ?? 0;
}

/** STUB: ranked signups for the leaderboard (insertion order = signup order). */
export function rankedSignups(guildId: string | null, raidId: string): string[] {
  return [...(signups.get(keyFor(guildId, raidId)) ?? [])];
}

export const raidSignupData = new SlashCommandBuilder()
  .setName("raid-signup")
  .setDescription("Sign up for a clan raid (STUB: in-memory, lost on restart)")
  .addStringOption((opt: SlashCommandStringOption) =>
    opt.setName("raid").setDescription("Raid id or name").setRequired(true),
  );

export async function handleRaidSignup(interaction: ChatInputCommandInteraction): Promise<void> {
  const raid = interaction.options.getString("raid", true);
  const total = signupUser(interaction.guildId, raid, interaction.user.id);
  await interaction.reply({
    content: `STUB: <@${interaction.user.id}> signed up for raid **${raid}** (${total} signed up). Signups are in-memory and reset on restart.`,
    ephemeral: true,
  });
}
