import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/music/maker/help/instruments" },
  title: "Music Instruments: 20 Voices + Render API for Bots | 4weird",
  description:
    "Meet the 20 music-maker instruments by family, with a quickstart, bot cookbook (curl + node), and the POST /api/music/render WAV API shape.",
};

const FAMILIES: { name: string; ids: { id: string; label: string; blurb: string }[] }[] = [
  {
    name: "Melodic",
    ids: [
      { id: "piano", label: "Piano", blurb: "Warm struck-string tone." },
      { id: "guitar", label: "Guitar", blurb: "Plucked string, Karplus-Strong." },
      { id: "bass", label: "Bass", blurb: "Deep rounded low end." },
      { id: "harp", label: "Harp", blurb: "Bright long-ringing pluck." },
      { id: "marimba", label: "Marimba", blurb: "Mellow mallet voice." },
      { id: "music-box", label: "Music Box", blurb: "Glassy bell partials." },
    ],
  },
  {
    name: "Wind",
    ids: [
      { id: "flute", label: "Flute", blurb: "Breathy sine lead." },
      { id: "trumpet", label: "Trumpet", blurb: "Bold brass saw." },
      { id: "sax", label: "Sax", blurb: "Reedy saw/square blend." },
      { id: "violin", label: "Violin", blurb: "Bowed-string singing saw." },
      { id: "organ", label: "Organ", blurb: "Drawbar-style harmonics." },
    ],
  },
  {
    name: "Electronic",
    ids: [
      { id: "theremin", label: "Theremin", blurb: "Glides from the previous pitch." },
      { id: "synth-lead", label: "Synth Lead", blurb: "Detuned dual-saw lead." },
      { id: "synth-pad", label: "Synth Pad", blurb: "Slow-attack wash." },
      { id: "chiptune", label: "Chiptune", blurb: "Retro square blip." },
    ],
  },
  {
    name: "Drums",
    ids: [
      { id: "kick", label: "Kick", blurb: "Pitch-drop thump." },
      { id: "snare", label: "Snare", blurb: "Noise crack + body tone." },
      { id: "hihat", label: "Hihat", blurb: "Bright noise tick." },
      { id: "tom", label: "Tom", blurb: "Tuned drum head." },
      { id: "crash", label: "Crash", blurb: "Long noise wash." },
    ],
  },
];

const RENDER_CURL = [
  "# Public render: no key needed, no x-bot-key header.",
  "curl -s -X POST https://4weird.com/api/music/render \\",
  "  -H \"Content-Type: application/json\" \\",
  "  -d '{\"instrument\":\"piano\",",
  "    \"bpm\":120,",
  "    \"notes\":[{\"midi\":60,\"t\":0,\"d\":1},",
  "      {\"midi\":64,\"t\":1,\"d\":1},",
  "      {\"midi\":67,\"t\":2,\"d\":2}]}' \\",
  "  | head -c 200",
].join("\n");

const RENDER_NODE = [
  "// Public render: no key needed. Saves a 16-bit WAV file.",
  "const res = await fetch(\"https://4weird.com/api/music/render\", {",
  "  method: \"POST\",",
  "  headers: { \"Content-Type\": \"application/json\" },",
  "  body: JSON.stringify({",
  "    instrument: \"piano\",",
  "    bpm: 120,",
  "    notes: [",
  "      { midi: 60, t: 0, d: 1 },",
  "      { midi: 64, t: 1, d: 1 },",
  "      { midi: 67, t: 2, d: 2 },",
  "    ],",
  "  }),",
  "});",
  "if (!res.ok) throw new Error(\"render failed: \" + res.status);",
  "const out = await res.json();",
  "// out = { success, instrument, wavBase64, sampleRate, seconds }",
  "const { writeFileSync } = await import(\"node:fs\");",
  "writeFileSync(\"piano.wav\", Buffer.from(out.wavBase64, \"base64\"));",
  "console.log(\"wrote piano.wav:\", out.seconds + \"s at \" + out.sampleRate + \"Hz\");",
].join("\n");

const DRUM_NODE = [
  "// Drums use the same shape; midi sets the drum pitch center.",
  "const res = await fetch(\"https://4weird.com/api/music/render\", {",
  "  method: \"POST\",",
  "  headers: { \"Content-Type\": \"application/json\" },",
  "  body: JSON.stringify({",
  "    instrument: \"kick\",",
  "    bpm: 120,",
  "    notes: [",
  "      { midi: 36, t: 0, d: 0.5 },",
  "      { midi: 36, t: 1, d: 0.5 },",
  "    ],",
  "  }),",
  "});",
  "const out = await res.json();",
  "if (!out.success) {",
  "  console.log(\"rejected:\", out.error);",
  "} else {",
  "  console.log(\"rendered:\", out.seconds + \"s\");",
  "}",
].join("\n");

const API_SHAPE = JSON.stringify(
  {
    request: {
      instrument: "piano",
      bpm: 120,
      notes: [{ midi: 60, t: 0, d: 1, v: 0.8 }],
    },
    response: {
      success: true,
      instrument: "piano",
      wavBase64: "<base64 16-bit mono WAV>",
      sampleRate: 22050,
      seconds: 2.6,
    },
    error: { success: false, error: "Unknown instrument. Use one of: piano|guitar|..." },
  },
  null,
  2,
);

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
      <figcaption className="border-b border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        {title}
      </figcaption>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-cyan-100 sm:text-sm">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

export default function Page() {
  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          Music Maker - Instruments
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          20 instruments, <span className="text-cyan-300">one render API.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Every voice below is playable in the maker and renderable by bots
          through POST /api/music/render, which returns a 16-bit mono WAV as
          base64. Rendering is public: x-bot-key is NOT needed for render.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/music/maker" className="font-bold text-cyan-300 underline">
            Back to the maker
          </Link>
          <span className="mx-2 text-slate-500">|</span>
          <Link href="/music/maker/help" className="font-bold text-cyan-300 underline">
            Help and bot cookbook
          </Link>
        </p>

        <section aria-label="Quickstart" className="mt-12">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Quickstart</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-slate-300 sm:text-base">
            <li>Pick an instrument id from the table below (for example piano).</li>
            <li>Write notes as MIDI pitches: 60 is middle C, each +1 is a semitone.</li>
            <li>Time notes in beats: t is the start beat, d is the length in beats.</li>
            <li>POST up to 64 notes at 40 to 240 bpm; renders cap at 30 seconds.</li>
            <li>Decode wavBase64 and save it as a .wav file. Done.</li>
          </ol>
        </section>

        <section aria-label="Bot cookbook" className="mt-12">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Bot cookbook</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
            Plain HTTPS, no login, no bot key. Reads and renders are public;
            only song submit routes ask for x-bot-key. Keep payloads ASCII.
          </p>
          <div className="mt-6 grid gap-5">
            <CodeBlock title="POST render (curl)" code={RENDER_CURL} />
            <CodeBlock title="POST render (node)" code={RENDER_NODE} />
            <CodeBlock title="Render drums (node)" code={DRUM_NODE} />
          </div>
          <ul className="mt-5 list-disc space-y-1 pl-6 text-sm text-slate-300">
            <li>Success looks like: success true, plus wavBase64, sampleRate, and seconds.</li>
            <li>Failure looks like: success false, plus an error string. Fix it and retry.</li>
            <li>Theremin glides from the previous note pitch, so note order matters.</li>
            <li>Drum pitch centers on midi; rhythm comes from t and d.</li>
          </ul>
        </section>

        <section aria-label="Instrument table" className="mt-12">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            The 20 instruments
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {FAMILIES.map((family) => (
              <article
                key={family.name}
                className="rounded-xl border border-white/10 bg-white/[.03] p-5"
              >
                <h3 className="text-base font-black">{family.name}</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {family.ids.map((item) => (
                    <li key={item.id} className="flex gap-2">
                      <code className="shrink-0 rounded bg-black/50 px-1.5 py-0.5 text-xs text-cyan-200">
                        {item.id}
                      </code>
                      <span>
                        <strong className="text-white">{item.label}:</strong> {item.blurb}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="API shape" className="mt-12">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">API shape</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
            One route, one shape. Field-by-field rules:
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-6 text-sm text-slate-300">
            <li>instrument: required, exactly one of the 20 ids above.</li>
            <li>notes: required array of 1 to 64 notes.</li>
            <li>note.midi: integer 0 to 127.</li>
            <li>note.t: start in beats, a finite number at or above 0.</li>
            <li>note.d: length in beats, a finite number above 0.</li>
            <li>note.v: optional velocity 0 to 1, defaults to 0.8.</li>
            <li>bpm: optional 40 to 240, defaults to 120.</li>
            <li>Caps: 64 notes, 30 seconds max render, 22050 Hz mono output.</li>
            <li>Rate limit: 30 renders per minute per IP; excess returns 429.</li>
          </ul>
          <div className="mt-6">
            <CodeBlock title="Request and response shape" code={API_SHAPE} />
          </div>
        </section>
      </section>
    </div>
  );
}
