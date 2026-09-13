import { Client, Events, GatewayIntentBits, Interaction } from "discord.js";
import { dispatch } from "./commands/index.js";

/**
 * Bot entrypoint. Requires env (see README — never commit real values):
 *   CHAT_TOKEN      bot token (required to connect)
 *   CHAT_CLIENT_ID  application id (required for `npm run register`)
 *   CHAT_GUILD_ID   optional dev-guild id for instant command registration
 *   LEDGER_API_URL  optional future ledger reader endpoint (unwired stub)
 *
 * Exits(1) with a usage message when CHAT_TOKEN is absent so `npm start`
 * without secrets fails loudly instead of crash-looping.
 */
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[chat-bot] missing required env ${name} — see README.md.`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const token = requiredEnv("CHAT_TOKEN");
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (c: Client<true>) => {
    console.log(`[chat-bot] ready as ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await dispatch(interaction);
    } catch (err) {
      console.error("[chat-bot] command failed:", err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "Command failed.", ephemeral: true });
      } else {
        await interaction.reply({ content: "Command failed.", ephemeral: true });
      }
    }
  });

  await client.login(token);
}

void main();
