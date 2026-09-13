import { registerCommands } from "./commands/index.js";

void registerCommands()
  .then(() => console.log("[discord-bot] commands registered"))
  .catch((err: unknown) => {
    console.error("[discord-bot] registration failed:", err);
    process.exit(1);
  });
