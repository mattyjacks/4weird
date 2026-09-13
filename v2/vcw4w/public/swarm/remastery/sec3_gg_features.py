def get_section_3():
    return '''---

# 4. FEATURE IMPLEMENTATION GUIDES: GIVEGIGS ECOSYSTEM

---

## 4.1 Feature 14: Creator & Talent Directory with Rich Audio/Video Showcases

### Architectural Blueprint
4weird currently has Squads and Clan members, but no way for indie game developers to discover and hire voice actors, 3D modelers, pixel artists, or gameplay playtesters.
The Creator Directory (`/creators`) introduces rich talent profiles featuring dual-rate pricing (Cheap vs Rush), an integrated audio player for voiceover demos, and video reel embeds.

```
+-----------------------------------------------------------------------------------+
| Creator Profile Viewport (app/creators/[username]/page.tsx)                       |
+-----------------------------------------------------------------------------------+
|  [ Avatar ]  MattyPixel (Independent 3D Artist & Voice Actor)                     |
|              "Creating dark fantasy game assets and gritty character voices"      |
|                                                                                   |
|  [ Rates: 💳 Standard: 2,500 🪙/hr ($25.00)  |  ⚡ Rush: 5,000 🪙/hr ($50.00) ]   |
|-----------------------------------------------------------------------------------|
|  🎵 AUDIO SAMPLES (Voiceover Demos):                                              |
|  [ Play ] "GraveGain Boss Dialogue" (0:45) =========O=========== [Volume]        |
|  [ Play ] "Sci-Fi Radio Announcer" (1:12) ==================O=== [Volume]        |
|-----------------------------------------------------------------------------------|
|  🎬 VIDEO SHOWCASE (Embedded Reel):                                               |
|  [ YouTube / Drive Embed: 3D Blender Animation Reel 2026 ]                        |
|-----------------------------------------------------------------------------------|
|  🔒 CONTACT METHODS (Turnstile Protected):                                        |
|  [ 🛡️ Reveal Discord: Turnstile Protected ]  [ 🛡️ Reveal Telegram ]               |
+-----------------------------------------------------------------------------------+
```

### Core Creator Profile Page (`app/creators/[username]/page.tsx`)

```tsx
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AudioShowcasePlayer } from "@/components/creator/audio-showcase-player";
import { ProtectedContactButton } from "@/components/creator/protected-contact-button";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { username } = await params;
  const supabase = supabaseServer();

  const { data: creator } = await supabase
    .from("creators")
    .select("*, creator_portfolios(*), creator_audio_samples(*), creator_video_embeds(*), creator_contacts(*)")
    .eq("username", username)
    .single();

  if (!creator) notFound();

  return (
    <main className="min-h-screen bg-slate-950 text-white py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-8 bg-slate-900/60 border border-slate-800 rounded-3xl">
          <img
            src={creator.avatar_url || "/images/default-avatar.png"}
            alt={creator.display_name}
            className="w-28 h-28 rounded-full border-2 border-cyan-400 object-cover"
          />
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="text-3xl font-black">{creator.display_name}</h1>
            <p className="text-cyan-300 font-medium">@{creator.username}</p>
            <p className="text-slate-300 max-w-xl">{creator.tagline}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {creator.skills?.map((skill: string) => (
                <span key={skill} className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-xs rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Dual Rates Card */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">💳 Standard Rate</p>
            <p className="text-2xl font-black text-cyan-300 mt-2">
              {creator.cheap_rate_coins.toLocaleString()} 🪙 / hr
            </p>
            <p className="text-xs text-slate-400 mt-1">${(creator.cheap_rate_coins / 100).toFixed(2)} USD · Normal Pace</p>
          </div>
          <div className="p-6 bg-slate-900/40 border border-amber-500/30 rounded-2xl">
            <p className="text-xs uppercase tracking-widest text-amber-400 font-bold">⚡ Rush Rate</p>
            <p className="text-2xl font-black text-amber-300 mt-2">
              {creator.rush_rate_coins.toLocaleString()} 🪙 / hr
            </p>
            <p className="text-xs text-slate-400 mt-1">${(creator.rush_rate_coins / 100).toFixed(2)} USD · Priority 24h Queue</p>
          </div>
        </div>

        {/* Audio Samples Showcase */}
        {creator.creator_audio_samples?.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-200">🎙️ Audio Demos & Voice Samples</h2>
            <div className="space-y-3">
              {creator.creator_audio_samples.map((sample: { id: string; title: string; audio_url: string }) => (
                <AudioShowcasePlayer key={sample.id} title={sample.title} audioUrl={sample.audio_url} />
              ))}
            </div>
          </section>
        )}

        {/* Protected Contact Section */}
        <section className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
          <h2 className="text-xl font-bold text-slate-200">📬 Direct Contact Channels</h2>
          <div className="flex flex-wrap gap-3">
            {creator.creator_contacts?.map((contact: { id: string; contact_type: string; privacy_tier: string }) => (
              <ProtectedContactButton
                key={contact.id}
                contactId={contact.id}
                contactType={contact.contact_type}
                privacyTier={contact.privacy_tier}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
```

### Tips for How to Code the Creator Directory
1. **Audio Waveform Optimization:**
   Do not download entire MP3 files to generate visual waveforms. Store precomputed 64-point peak arrays in the database (`peaks: number[]`) during file upload so waveforms render instantly with zero network lag.
2. **SEO Optimization:**
   Inject `Schema.org/Person` JSON-LD structured data on all creator profile pages to ensure Google indexes 4weird talent profiles in freelance and voice actor search results.

---

## 4.2 Feature 15: Multi-Tiered Anti-Scraping / Anti-Harassment Contact Gates

### Architectural Blueprint
To stop web scrapers from harvesting email addresses and Discord tags from creator profiles, contact information is never rendered in raw HTML. It is gated behind a server-validated Cloudflare Turnstile token.

### Turnstile Validation API (`app/api/contact/reveal/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { contactId, turnstileToken } = await req.json();

    if (!contactId || !turnstileToken) {
      return NextResponse.json({ error: "Missing contactId or Turnstile token" }, { status: 400 });
    }

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: turnstileToken
      })
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return NextResponse.json({ error: "Turnstile verification failed" }, { status: 403 });
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("creator_contacts")
      .select("contact_type, contact_value")
      .eq("id", contactId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      contactType: data.contact_type,
      contactValue: data.contact_value
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error revealing contact" }, { status: 500 });
  }
}
```

---

## 4.3 Feature 16: AI & Clan Bounty Escrow System (75/25 Economic Split)

### Architectural Blueprint
Clans, Squads, and AI Agents can post public or clan-scoped bounties for game development tasks, art, and bug fixes. Vibe Coins are locked in escrow on creation and settled according to 4weird\'s 75/25 rule.

```
+-----------------------------------------------------------------------------------+
| 4weird Bounty Escrow Transaction Lifecycle                                        |
+-----------------------------------------------------------------------------------+
| 1. Client Posts Bounty: Budget = 10,000 🪙 ($100.00)                             |
|    - 10,000 🪙 deducted from Client Wallet & locked in Escrow                     |
|    - Platform cut calculated: 2,500 🪙 (25%)                                      |
|    - Worker payout calculated: 7,500 🪙 (75%)                                     |
|    |                                                                              |
| 2. Creators Apply (with Cheap or Rush delivery bids)                              |
|    |                                                                              |
| 3. Client Selects Worker -> Status becomes 'assigned'                            |
|    |                                                                              |
| 4. Worker Submits Deliverable (Files + Notes) -> Status 'submitted'               |
|    |                                                                              |
| 5. Client Approves Deliverable:                                                   |
|    - 7,500 🪙 credited to Worker's 4weird wallet (Non-withdrawable credits)       |
|    - 2,500 🪙 transferred to 4weird Platform Revenue account                      |
|    - Status marked 'completed'                                                    |
+-----------------------------------------------------------------------------------+
```

### Escrow Release Server Action (`lib/actions/bounty-escrow.ts`)

```typescript
"use server";

import { supabaseServer } from "@/lib/supabase/server";

export async function approveAndReleaseBounty(bountyId: string) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase.rpc("settle_bounty_escrow", {
    p_bounty_id: bountyId,
    p_caller_user_id: user.id
  });

  if (error) throw new Error(error.message);
  return { success: true, transactionId: data };
}
```

---

## 4.4 Feature 17: Official Model Context Protocol (`@4weird/mcp`) Server

### Architectural Blueprint
An official Model Context Protocol server exposing 4weird capabilities (running VibeCodeWorker, querying game leaderboards, launching Blender renders, and checking bounties) to AI coding tools like Claude Desktop, Cursor, and Antigravity.

### MCP Server Package (`programs/mcp/src/index.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "@4weird/mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "run_vcw_game_test",
        description: "Trigger an automated VibeCodeWorker game QA run on a 4weird game and return detected bugs.",
        inputSchema: {
          type: "object",
          properties: {
            gameSlug: { type: "string", description: "Slug of the game to test (e.g. gravegain3d, xonotic)" },
            durationSeconds: { type: "number", description: "Test duration in seconds (default 30)" }
          },
          required: ["gameSlug"]
        }
      },
      {
        name: "search_creators",
        description: "Search 4weird creator directory for voice actors, pixel artists, or developers.",
        inputSchema: {
          type: "object",
          properties: {
            skill: { type: "string", description: "Skill keyword (e.g. voiceover, 3d, pixelart)" }
          },
          required: ["skill"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_creators") {
    const skill = String(args?.skill ?? "");
    const res = await fetch(`https://4weird.com/api/creators/search?skill=${encodeURIComponent(skill)}`);
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  throw new Error(`Tool not found: ${name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run();
```

---

## 4.5 Feature 18: Official 4weird Community & Clan Raid Discord Bot

### Architectural Blueprint
A Discord.js v14 bot providing slash commands for Clan raid coordination, leaderboards, and Vibe Coin tipping.

```typescript
import { Client, GatewayIntentBits, SlashCommandBuilder } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

export const leaderboardCommand = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View top players for a 4weird game")
  .addStringOption((opt) =>
    opt.setName("game").setDescription("Game slug (e.g. gravegain3d)").setRequired(true)
  );

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "leaderboard") {
    const game = interaction.options.getString("game");
    const res = await fetch(`https://4weird.com/api/leaderboards?game=${game}`);
    const data = await res.json();
    await interaction.reply({
      content: `🏆 **Top Players for ${game}**\\n1. ${data[0]?.username ?? "None"} (${data[0]?.score ?? 0} pts)`
    });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

---

## 4.6 Feature 19: Squad Kanban Board with Sprints & Drag-and-Drop

### Architectural Blueprint
Equips 4weird Squads (`/squads/[id]`) with a visual Kanban board supporting drag-and-drop card columns, cycle sprint deadlines, and hourly estimates linked to the Ghost Timer.

```typescript
export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimateHours: number;
  dueDate?: string;
  labels: string[];
  assignedUserId?: string;
  position: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
  cards: KanbanCard[];
}
```

---

## 4.7 Feature 20: Advanced Invoicing with 30-Day Trash & Ghost Timer Conversion

### Architectural Blueprint
Expands 4weird\'s `/business/invoices` system with:
1. **30-Day Trash Lifecycle:** Deleted invoices receive a `deleted_at` timestamp and move to a Trash tab with a 30-day auto-purge countdown.
2. **Ghost Timer Conversion:** A button inside `GhostTimer` (`components/ghost/ghost-timer.tsx`) that turns tracked work seconds into invoice line items settled in Vibe Coins.
3. **Branded PDF Export:** Generates downloadable client-ready PDF invoices.

---

## 4.8 Feature 21: Free Organic Utilities Suite (SEO, Image, Writing, Counter)

### Architectural Blueprint
High-utility tools situated at `/tools`:
* `/tools/image`: WebP/PNG converter, lossless image compression, EXIF stripper.
* `/tools/seo`: Google SERP simulator, OpenGraph social card previewer.
* `/tools/counter`: Word, character, reading time, and syllable counter.
* `/tools/writing`: AI game title generator and marketing pitch copywriter.

---

## 4.9 Feature 22: Global Real-Time Notification Center with Categories & Badges

### Architectural Blueprint
A global notification dropdown in `components/site-header.tsx` subscribed to Supabase Realtime changes on `public.notifications`. When an event occurs (a coin tip, a completed Blender render, or a new bounty bid), an audible chime plays and an unread badge counter increments.

---

## 4.10 Feature 23: Direct 1-on-1 Real-Time Chat & Threading

### Architectural Blueprint
A dedicated private messaging portal (`/chat`) enabling private negotiations between game developers, bounty posters, and creators. Real-time delivery is achieved via Supabase Realtime broadcast channels.
'''
