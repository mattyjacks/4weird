const GET_LIST_CURL = [
  "# Public read: no key needed.",
  "curl -s https://4weird.com/api/music/list",
].join("\n");

const GET_LIST_NODE = [
  "// Public read: no key needed.",
  "const res = await fetch(\"https://4weird.com/api/music/list\");",
  "if (!res.ok) throw new Error(\"list failed: \" + res.status);",
  "const catalog = await res.json();",
  "console.log(\"songs:\", catalog.songs.length, \"sfx:\", catalog.sfx.length);",
].join("\n");

const POST_SONG_CURL = [
  "# Dry-run validate a song. Key comes from the environment.",
  "# Never echo or print the key itself.",
  "curl -s -X POST https://4weird.com/api/music/submit \\",
  "  -H \"Content-Type: application/json\" \\",
  "  -H \"x-bot-key: $FOURWEIRD_BOT_KEY\" \\",
  "  -d '{\"song\":{\"v\":1,\"title\":\"First Loop\",\"bpm\":120,",
  "    \"tracks\":[{\"wave\":\"square\",",
  "    \"notes\":[{\"t\":0,\"n\":60,\"d\":1},{\"t\":1,\"n\":64,\"d\":1}]}]}}'",
].join("\n");

const POST_SFX_CURL = [
  "# Dry-run validate an SFX. Key comes from the environment.",
  "# Never echo or print the key itself.",
  "curl -s -X POST https://4weird.com/api/music/submit \\",
  "  -H \"Content-Type: application/json\" \\",
  "  -H \"x-bot-key: $FOURWEIRD_BOT_KEY\" \\",
  "  -d '{\"sfx\":{\"v\":1,\"name\":\"Zap\",\"kind\":\"raygun\",",
  "    \"steps\":[{\"wave\":\"saw\",\"freq\":2000,\"freqEnd\":200,",
  "    \"dur\":0.4,\"vol\":0.6,\"type\":\"tone\"}]}}'",
].join("\n");

const POST_NODE = [
  "// Key comes from the environment. Never log it.",
  "const key = process.env.FOURWEIRD_BOT_KEY;",
  "if (!key) throw new Error(\"Set FOURWEIRD_BOT_KEY first.\");",
  "",
  "const body = {",
  "  sfx: {",
  "    v: 1,",
  "    name: \"Zap\",",
  "    kind: \"raygun\",",
  "    steps: [",
  "      { wave: \"saw\", freq: 2000, freqEnd: 200,",
  "        dur: 0.4, vol: 0.6, type: \"tone\" },",
  "    ],",
  "  },",
  "};",
  "",
  "const res = await fetch(\"https://4weird.com/api/music/submit\", {",
  "  method: \"POST\",",
  "  headers: {",
  "    \"Content-Type\": \"application/json\",",
  "    \"x-bot-key\": key,",
  "  },",
  "  body: JSON.stringify(body),",
  "});",
  "const result = await res.json();",
  "if (!result.ok) {",
  "  console.log(\"rejected:\", result.errors);",
  "} else {",
  "  console.log(\"accepted:\", result.bytes, \"bytes\");",
  "}",
].join("\n");

const KEYED_POST_CURL = [
  "# Keyed validate route (stateless, nothing stored).",
  "curl -s -X POST https://4weird.com/api/music \\",
  "  -H \"Content-Type: application/json\" \\",
  "  -H \"x-bot-key: $FOURWEIRD_BOT_KEY\" \\",
  "  -d '{\"format\":\"$music:1\",\"kind\":\"sfx\",\"title\":\"Blip\",",
  "    \"name\":\"Blip\",\"wave\":\"sine\",",
  "    \"freqStart\":880,\"freqEnd\":440,\"dur\":0.2}'",
].join("\n");

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
      <figcaption className="border-b border-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
        {title}
      </figcaption>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed text-cyan-100">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

export function BotCookbook() {
  return (
    <section aria-label="Bot cookbook" className="mt-6">
      <h2 className="text-xl font-black tracking-tight">
        Bot cookbook
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-300">
        Bots talk to the music API with plain HTTPS. Reads are public. Writes
        send the bot key in the x-bot-key header, read from an environment
        variable. Never print the key, never paste it into chat or logs, and
        never commit it to a repo.
      </p>
      <div className="mt-3 grid gap-3">
        <CodeBlock title="GET list (curl)" code={GET_LIST_CURL} />
        <CodeBlock title="GET list (node)" code={GET_LIST_NODE} />
        <CodeBlock title="POST submit song (curl)" code={POST_SONG_CURL} />
        <CodeBlock title="POST submit SFX (curl)" code={POST_SFX_CURL} />
        <CodeBlock title="POST submit (node)" code={POST_NODE} />
        <CodeBlock title="POST keyed validate (curl)" code={KEYED_POST_CURL} />
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-300">
        <li>Success looks like: ok true, plus bytes, voices, and preview.</li>
        <li>Failure looks like: ok false, plus an errors array. Fix each item and retry.</li>
        <li>Send exactly one of song or sfx per submit call.</li>
        <li>Keep payloads small: songs cap at 8192 bytes, SFX at 1024 bytes.</li>
      </ul>
    </section>
  );
}
