import fs from "node:fs";
import path from "node:path";

export type GraveGainLoreEntry = { id: string; title: string; category: string; type: string; rarity: string; content: string; audience: "kids" | "teens" | "adults"; game: string };
const root = path.join(process.cwd(), "public", "games", "html");
const sources = ["gravegain2dA", "gravegain3d"];
const records = new Map<string, GraveGainLoreEntry>();
for (const source of sources) {
  const raw = fs.readFileSync(path.join(root, source, "lore.js"), "utf8");
  const chunks = raw.split(/LoreDatabase\["/g).slice(1);
  for (const chunk of chunks) {
    const id = chunk.split("\"]", 1)[0];
    const title = /"title":\s*"((?:\\.|[^"\\])*)"/.exec(chunk)?.[1];
    const category = /"category":\s*"((?:\\.|[^"\\])*)"/.exec(chunk)?.[1] ?? "MoonRock";
    const type = /"type":\s*"((?:\\.|[^"\\])*)"/.exec(chunk)?.[1] ?? "record";
    const rarity = /"rarity":\s*"((?:\\.|[^"\\])*)"/.exec(chunk)?.[1] ?? "common";
    const content = /"content":\s*"((?:\\.|[^"\\])*)"/.exec(chunk)?.[1];
    if (!id || !title || !content) continue;
    if (!records.has(id)) records.set(id, { id, title: JSON.parse(`"${title}"`), category, type, rarity, content: JSON.parse(`"${content}"`), audience: "adults", game: "Shared canon" });
  }
}
export const GRAVEGAIN_LORE: GraveGainLoreEntry[] = [...records.values()].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
GRAVEGAIN_LORE.unshift(
  { id: "shared-kid-moonrock", title: "A Friendly Moon", category: "MoonRock", type: "storybook", rarity: "common", content: "MoonRock is home to forests that glow, mountains full of friendly forge towns, and wide plains where many neighbors live. Humans, Elves, Dwarves, and Orcs help one another. Their promise is simple: no one gets left behind.", audience: "kids", game: "Shared canon" },
  { id: "shared-teen-leyline", title: "The Ley-Line Promise", category: "The Compact", type: "field note", rarity: "common", content: "The ley-line carries more than magic. It carries memory. Every time a crew from another people holds the line beside you, the field grows steadier. The Compact began as a survival pact; keeping it is a choice made again in every generation.", audience: "teens", game: "Shared canon" },
);
