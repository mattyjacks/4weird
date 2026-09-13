def get_section_3():
    return r'''---

# 4. FEATURE IMPLEMENTATION GUIDES: GIVEGIGS TOOLING & SQUAD WORKSPACES

---

## 4.1 Feature 14: Private Squad Workspaces (UnitUnite) & Internal Team Tooling

### Architectural Blueprint
An open public freelancer directory and labor marketplace was evaluated and **rejected** due to significant legal liability, labor misclassification risks (e.g., California AB5 / IRS 1099 compliance), PII data scraping, and escrow licensing overhead. 

Instead, 4weird brings GiveGigs' elite coordination tools into **Private Squads (UnitUnite)** at `app/squads/[id]/page.tsx`. Squads are invite-only, permissioned team workspaces where co-developers, indie game creators, and clan mates collaborate securely.

```
+-----------------------------------------------------------------------------------+
| Squad Private Workspace Viewport (app/squads/[id]/page.tsx)                       |
+-----------------------------------------------------------------------------------+
|  🚀 NEON DRIFTERS SQUAD (Invite-Only Studio)                                      |
|  "Building fast-paced cyberpunk arcade games and custom Three.js shaders"         |
|                                                                                   |
|  [ Squad Wallet: 🪙 45,000 Vibe Coins ($450.00) · Shared Compute & Asset Pool ]   |
|-----------------------------------------------------------------------------------|
|  📂 SQUAD PROJECTS:                                                               |
|  - GraveGain 3D Arena (Target: gravegain3d) [ Lead: @matty | 4 Contributors ]     |
|  - CyberRacer Physics Engine [ Lead: @alex | 2 Contributors ]                     |
|-----------------------------------------------------------------------------------|
|  📋 SQUAD KANBAN SPRINT:                                                          |
|  - Sprint #4 (Ends in 3 days) · 78% Completed [ View Kanban Board → ]            |
|-----------------------------------------------------------------------------------|
|  ⏱️ TRACKED TEAM HOURS & INVOICE MEMORANDA:                                       |
|  - 42.5 hrs logged this week · [ Start Timer ]  [ Export Invoice PDF ]           |
+-----------------------------------------------------------------------------------+
```

### Core Squad Project Component (`components/squad/squad-workspace.tsx`)

```tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Users, FolderGit2, Trello, Clock, Coins, ShieldCheck, Plus } from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  targetGameSlug?: string;
  contributorsCount: number;
}

interface SquadWorkspaceProps {
  squadId: string;
  squadName: string;
  tagline: string;
  walletCoins: number;
  projects: ProjectItem[];
  currentSprintName: string;
  sprintProgress: number;
}

export const SquadWorkspace: React.FC<SquadWorkspaceProps> = ({
  squadId,
  squadName,
  tagline,
  walletCoins,
  projects,
  currentSprintName,
  sprintProgress,
}) => {
  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-white">{squadName}</h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Private Squad
              </span>
            </div>
            <p className="mt-2 text-slate-300 max-w-2xl">{tagline}</p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-right">
            <p className="text-xs uppercase tracking-widest text-amber-400 font-bold">Shared Squad Wallet</p>
            <p className="text-3xl font-black text-amber-300 mt-1">
              🪙 {walletCoins.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">${(walletCoins / 100).toFixed(2)} USD for Cloud/Compute</p>
          </div>
        </div>
      </div>

      {/* Navigation Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href={`/squads/${squadId}/kanban`}
          className="group rounded-2xl border border-white/10 bg-slate-900/40 p-6 hover:border-amber-400/50 hover:bg-slate-900/70 transition"
        >
          <div className="flex items-center justify-between">
            <Trello className="h-6 w-6 text-cyan-400" />
            <span className="text-xs font-bold text-slate-400">{sprintProgress}% done</span>
          </div>
          <h3 className="mt-4 font-bold text-lg text-white group-hover:text-amber-300">Sprint Kanban Board</h3>
          <p className="mt-1 text-sm text-slate-300">Active: {currentSprintName}</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-amber-400" style={{ width: `${sprintProgress}%` }} />
          </div>
        </Link>

        <Link
          href="/timer"
          className="group rounded-2xl border border-white/10 bg-slate-900/40 p-6 hover:border-amber-400/50 hover:bg-slate-900/70 transition"
        >
          <Clock className="h-6 w-6 text-amber-400" />
          <h3 className="mt-4 font-bold text-lg text-white group-hover:text-amber-300">Time Tracker</h3>
          <p className="mt-1 text-sm text-slate-300">Clock hours, log activity beats, and convert to invoices</p>
          <p className="mt-4 text-xs font-bold text-amber-300">Open Work Clock →</p>
        </Link>

        <Link
          href="/business/invoices"
          className="group rounded-2xl border border-white/10 bg-slate-900/40 p-6 hover:border-amber-400/50 hover:bg-slate-900/70 transition"
        >
          <Coins className="h-6 w-6 text-emerald-400" />
          <h3 className="mt-4 font-bold text-lg text-white group-hover:text-amber-300">Invoices & Memoranda</h3>
          <p className="mt-1 text-sm text-slate-300">Generate PDF invoices with 30-day trash recovery</p>
          <p className="mt-4 text-xs font-bold text-emerald-400">View Invoices →</p>
        </Link>
      </div>

      {/* Projects List */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-cyan-400" />
            Squad Code & Game Projects
          </h2>
          <button className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300">
            <Plus className="h-3.5 w-3.5" />
            New Project
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {projects.map((proj) => (
            <div key={proj.id} className="py-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white">{proj.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{proj.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  {proj.contributorsCount} contributors
                </span>
                <button className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10">
                  Open Project
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## 4.2 Feature 15: Squad Kanban Boards with Sprints, Cycles & Drag-and-Drop

### Architectural Blueprint
Equips 4weird Squads (`/squads/[id]/kanban`) with a visual Kanban board supporting drag-and-drop card columns, cycle sprint deadlines, and hourly estimates linked to the Time Tracker.

```tsx
"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface KanbanCardData {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimateHours: number;
  columnId: string;
}

const SortableCard: React.FC<{ card: KanbanCardData }> = ({ card }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing rounded-xl border border-white/10 bg-slate-900 p-4 shadow-sm hover:border-amber-400/40"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-white">{card.title}</span>
        <span
          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
            card.priority === "urgent"
              ? "bg-rose-500/20 text-rose-400"
              : card.priority === "high"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {card.priority}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400 font-mono">⏱️ {card.estimateHours}h est.</p>
    </div>
  );
};

export function SquadKanbanBoard() {
  const [cards, setCards] = useState<KanbanCardData[]>([
    { id: "1", title: "Optimize GraveGain 3D Instanced Mesh", priority: "high", estimateHours: 4, columnId: "todo" },
    { id: "2", title: "Add Web Worker to Timer Engine", priority: "urgent", estimateHours: 2.5, columnId: "in_progress" },
    { id: "3", title: "Verify Remastery Routes Test", priority: "medium", estimateHours: 1, columnId: "done" },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    setCards((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, columnId: String(over.id) } : c))
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {["todo", "in_progress", "done"].map((colId) => (
          <div key={colId} id={colId} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4">
              {colId.replace("_", " ")}
            </h3>
            <SortableContext
              items={cards.filter((c) => c.columnId === colId).map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3 min-h-[350px]">
                {cards
                  .filter((c) => c.columnId === colId)
                  .map((card) => (
                    <SortableCard key={card.id} card={card} />
                  ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
```

---

## 4.3 Feature 16: Professional Time Tracking & 1-Click Invoice Conversion

### Architectural Blueprint
Upgrades 4weird's `/timer` from hypothetical Ghost Cash into a real, drift-proof work clock:
- **Web Worker Engine**: Runs tick cycles in a background worker so tabs never drift or lose seconds when minimized.
- **Project Budgets & Rates**: Assign hourly rates and budget hours to track team burn.
- **1-Click Invoice Conversion**: Aggregates unbilled time entries and generates a pre-filled draft invoice.

---

## 4.4 Feature 17: Invoicing Suite with Vector PDF & 30-Day Soft-Delete Trash

### Architectural Blueprint
Expands 4weird's `/business/invoices` system with:
1. **Client Directory**: Manage client companies, billing addresses, and VAT IDs.
2. **30-Day Trash Lifecycle**: Deleted invoices receive a `deleted_at` timestamp and move to a Trash tab with a 30-day auto-purge countdown and 1-click restore.
3. **Vector PDF Export**: Generates client-ready downloadable PDF invoices via `html2canvas` and `jsPDF`.

---

## 4.5 Feature 18: Official Model Context Protocol (`@4weird/mcp`) Server

### Architectural Blueprint
An official Model Context Protocol server exposing 4weird capabilities (running VibeCodeWorker game tests, inspecting game saves, querying squad Kanban tasks, running code diagnostics) to AI coding tools like Claude Desktop, Cursor, and Antigravity — completely free of any risky worker search tools.

### MCP Server Package (`programs/mcp/src/index.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "@4weird/mcp", version: "2.1.0" },
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
            captureMode: { type: "string", enum: ["screenshot", "state_data", "full_state"] },
            durationSeconds: { type: "number", description: "Test duration in seconds (default 30)" }
          },
          required: ["gameSlug"]
        }
      },
      {
        name: "get_game_state",
        description: "Fetch live leaderboards, save state, and catalog metadata for a 4weird game.",
        inputSchema: {
          type: "object",
          properties: {
            gameSlug: { type: "string", description: "Game slug" }
          },
          required: ["gameSlug"]
        }
      },
      {
        name: "query_squad_tasks",
        description: "Retrieve active Kanban sprint cards and tasks for a 4weird Squad.",
        inputSchema: {
          type: "object",
          properties: {
            squadId: { type: "string", description: "UUID of the squad" }
          },
          required: ["squadId"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const baseUrl = process.env.FOURWEIRD_API_URL || "https://4weird.com";

  if (name === "get_game_state") {
    const slug = String(args?.gameSlug ?? "");
    const res = await fetch(`${baseUrl}/api/games/${slug}`);
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  if (name === "query_squad_tasks") {
    const squadId = String(args?.squadId ?? "");
    const res = await fetch(`${baseUrl}/api/squads/${squadId}/tasks`);
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  throw new Error(`Tool not found: ${name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch(console.error);
```

---

## 4.6 Feature 19: Official 4weird Community & Clan Raid Discord Bot

### Architectural Blueprint
A Discord.js v14 bot providing slash commands for Clan raid coordination, arcade leaderboards, and squad task notifications.

```typescript
import { Client, GatewayIntentBits, SlashCommandBuilder } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

export const leaderboardCommand = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View top players for a 4weird game")
  .addStringOption((opt) =>
    opt.setName("game").setDescription("Game slug (e.g. gravegain3d)").setRequired(true)
  );

export const squadStatusCommand = new SlashCommandBuilder()
  .setName("squad-status")
  .setDescription("Check active sprint progress for your Squad")
  .addStringOption((opt) =>
    opt.setName("squad").setDescription("Squad slug or ID").setRequired(true)
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

## 4.7 Feature 20: Free Organic Utilities Suite (SEO, Image, Writing, Counter)

### Architectural Blueprint
High-utility client-side tools situated at `/tools`:
* `/tools/image`: WebP/PNG converter, lossless image compression, EXIF stripper.
* `/tools/seo`: Google SERP simulator, OpenGraph social card previewer.
* `/tools/counter`: Word, character, sentence, paragraph, reading time, and speaking time counter.
* `/tools/writing`: AI game title generator and marketing pitch copywriter.

---

## 4.8 Feature 21: Global Real-Time Notification Center with Categories & Badges

### Architectural Blueprint
A global notification dropdown subscribed to Supabase Realtime changes on `public.notifications`. When an event occurs (a completed Blender render, a sprint task update, or a clan raid call), an audible chime plays and an unread badge counter increments. Includes an in-memory 5-second rate limiter to prevent notification storms.

---

## 4.9 Feature 22: Direct 1-on-1 Real-Time Chat & Squad Threading

### Architectural Blueprint
A private messaging portal (`/chat`) enabling direct communication between squad co-developers and clan members. Real-time delivery is powered by Supabase Realtime broadcast channels.
'''
