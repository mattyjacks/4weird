import { registerCommands } from "./commands/index.js";

void registerCommands()
  .then(() => console.log("[chat-bot] commands registered"))
  .catch((err: unknown) => {
    console.error("[chat-bot] registration failed:", err);
    process.exit(1);
  });
