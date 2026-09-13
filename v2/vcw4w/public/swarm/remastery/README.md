# 🎮 4WEIRD REMASTERY: THE MASTER IMPLEMENTATION GUIDE
## Comprehensive Blueprint for Integrating CryptArtistStudio & GiveGigs into 4weird
### Location: `public/swarm/remastery/README.md`
### Version: 2.1.0-REMASTERY · Status: READY FOR SWARM ORCHESTRATION

---

## TABLE OF CONTENTS

1. [Executive Architectural Vision](#1-executive-architectural-vision)
   - 1.1 The Convergence: 4weird + CryptArtistStudio + GiveGigs
   - 1.2 Core Economic & Security Axioms (Zero Worker Marketplace Risk)
   - 1.3 Tech Stack & Runtime Environment
   - 1.4 Architectural Layering & Directory Map
2. [Master Database Architecture & Migrations](#2-master-database-architecture--migrations)
   - 2.1 Complete Supabase SQL DDL Migrations
   - 2.2 Row Level Security (RLS) Policies
   - 2.3 Database Triggers & Stored Procedures
   - 2.4 Performance Indexes & Query Optimization
   - 2.5 Supabase Realtime Channels
3. [Feature Implementation Guides: CryptArtistStudio Suite](#3-feature-implementation-guides-cryptartiststudio-suite)
   - 3.1 Feature 01: Media Mogul (MMo) — Web Video Timeline & Multi-Track Studio
   - 3.2 Feature 02: DictatePic (D(pi)c) — GIMP-Style Layered Canvas & Sprite Editor
   - 3.3 Feature 03: DebugPlay (DP) — Headless Game Tester & Visual AI Bug Analyzer
   - 3.4 Feature 04: DonatePersonalSeconds (DPS) — P2P Compute & WebGPU Sharing
   - 3.5 Feature 05: DemoRecorder (DRe) — Screen Recorder & AI Action Dataset Logger
   - 3.6 Feature 06: Interactive 3D Pet Room & AliveSpeech Voice Companion
   - 3.7 Feature 07: CryptArt Commander (CAC) — Power-User Terminal & Scripting Engine
   - 3.8 Feature 08: Luck Factory (LCK) — Intention Meditation & Cryptographic Luck Engine
   - 3.9 Feature 09: Cross-Tool Interoperability Suite (Bus, Clipboard, Pipelines)
   - 3.10 Feature 10: Universal `.4weird` Project Container Format
   - 3.11 Feature 11: Monaco IDE Diagnostic Panels (Testing, Web Audit, Problems)
   - 3.12 Feature 12: Community Mod, Plugin, and Custom Theme Engine
   - 3.13 Feature 13: ValleyNet Autonomous Computer-Use Agent & Skills System
4. [Feature Implementation Guides: GiveGigs Tooling & Squad Workspaces](#4-feature-implementation-guides-givegigs-tooling--squad-workspaces)
   - 4.1 Feature 14: Private Squad Workspaces (UnitUnite) & Internal Team Tooling
   - 4.2 Feature 15: Squad Kanban Boards with Sprints, Cycles & Drag-and-Drop
   - 4.3 Feature 16: Professional Time Tracking & 1-Click Invoice Conversion
   - 4.4 Feature 17: Invoicing Suite with Vector PDF & 30-Day Soft-Delete Trash
   - 4.5 Feature 18: Official Model Context Protocol (`@4weird/mcp`) Server
   - 4.6 Feature 19: Official 4weird Community & Clan Raid Discord Bot
   - 4.7 Feature 20: Free Organic Utilities Suite (SEO, Image, Writing, Counter)
   - 4.8 Feature 21: Global Real-Time Notification Center with Categories & Badges
   - 4.9 Feature 22: Direct 1-on-1 Real-Time Chat & Squad Threading
5. [Cross-Cutting Architectural Modules](#5-cross-cutting-architectural-modules)
   - 5.1 Universal Cross-Tool Clipboard (`lib/cross-clipboard.ts`)
   - 5.2 Automated Multi-Step Pipeline Engine (`lib/pipeline-runner.ts`)
   - 5.3 Unified Notification Service (`lib/notification-service.ts`)
6. [Security Hardening & The 300-Fix Standard](#6-security-hardening--the-300-fix-standard)
   - 6.1 Content Security Policy & Nonce Generation
   - 6.2 SVG Sanitization & Media Injection Shields
   - 6.3 Anti-Double-Click & Concurrency Guard Patterns
   - 6.4 Rate Limiting & SSRF Protection
7. [Swarm Execution Roadmap & Rollout Waves](#7-swarm-execution-roadmap--rollout-waves)
   - 7.1 Wave 1: Squad Tooling, Invoicing, Time Tracking & Free Utilities
   - 7.2 Wave 2: AI Infrastructure, MCP, Discord, & P2P Compute
   - 7.3 Wave 3: Creative Suite, Video NLE, Sprite Editor, & Interop
8. [Verification, Quality Assurance, & Diagnostic Checks](#8-verification-quality-assurance--diagnostic-checks)

---

# 1. EXECUTIVE ARCHITECTURAL VISION

## 1.1 The Convergence: 4weird + CryptArtistStudio + GiveGigs

**4weird** is an innovative platform marrying 35 browser-based games with cloud computing (RunPod GPU, DigitalOcean, Blender rendering, fal.ai studio), Vibe Coins, Clans, Squads, and automated game testing via VibeCodeWorker.

Two sister ecosystems created by MattyJacks LLC contain monumental capabilities that 4weird can incorporate:
1. **CryptArtistStudio**: An open, professional-grade desktop creative suite boasting 16 programs, including a multi-track NLE video editor (Media Mogul), a GIMP-style raster/sprite editor (DictatePic), an automated headless game testing and visual AI analysis engine (DebugPlay), a P2P compute-sharing network (DonatePersonalSeconds), screen/input recording for AI training (DemoRecorder), a 3D companion room (AliveSpeech / VirtualPet), an interactive terminal CLI (Commander), and an extensible mod/plugin/pipeline architecture.
2. **GiveGigs**: A high-efficiency suite of developer and freelancer productivity tools, featuring visual sprint Kanban boards, professional time tracking, invoice generation with 30-day trash lifecycle and PDF export, client directories, free organic utility tools (SEO, writing, image optimizer, counter), real-time push notifications, direct chat, and Model Context Protocol (`@givegigs/mcp`) integration.

> 🛡️ **ARCHITECTURAL SAFETY DECISION: ZERO WORKER MARKETPLACE RISK**  
> An open, public freelancer directory and public labor marketplace was explicitly evaluated and **REJECTED** as too risky. Public labor marketplaces introduce severe legal, financial, and operational risks:
> - **Labor Law Liability:** Worker misclassification (AB5 / 1099 compliance), employment tax withholding, and labor dispute liability.
> - **Privacy & Harassment:** Public phone/email scraping, doxxing of creators, and spam solicitation.
> - **Financial Regulation:** Holding funds for freelance contractor escrow triggers strict state and federal money transmitter licensing requirements.
> - **Off-Platform Disintermediation:** Uncontrollable communication leakage where users bypass platform safeguards.
> 
> Instead, 4weird adopts GiveGigs' powerful toolset directly into **Private Squads (UnitUnite)**. Squads are invite-only, permissioned team workspaces where trusted collaborators and friends coordinate game development, track project hours, organize Kanban sprints, and manage pooled squad coin balances without any public labor marketplace exposure!

```
+---------------------------------------------------------------------------------------+
|                                    4WEIRD PLATFORM                                    |
+---------------------------------------------------------------------------------------+
|  GAMING & ENTERTAINMENT   |   CREATIVE STUDIO (CAS)   |   SQUAD TOOLING & TEAMS (GG)  |
|  - 35 Browser Games       |   - Media Mogul Video NLE |   - UnitUnite Team Workspaces |
|  - GraveGain 1D/2D/3D     |   - DictatePic Canvas     |   - Squad Kanban Sprints      |
|  - Clans & Raid Leagues   |   - DemoRecorder + Inputs |   - Drift-Free Time Tracking  |
|  - Gaming Buddy (Voice)   |   - 3D Pet Room & Alive   |   - B2B Invoices + PDF & Trash|
|  - NewGamePlus AI Games   |   - Commander Terminal CLI|   - Free Organic SEO Utilities|
|  - Luck Factory Seeds     |   - Monaco Diagnostic IDE |   - Direct Real-Time Chat     |
+---------------------------+---------------------------+------------------------------+
|                         SHARED DISTRIBUTED INFRASTRUCTURE                             |
|  - P2P Compute (DPS WebGPU)       - Official Model Context Protocol (@4weird/mcp)    |
|  - Cloud GPUs (RunPod RTX 4090)   - 4weird Discord Bot (Slash Commands & Raids)      |
|  - Vibe Coins Economy (100 = $1)  - Global Interop Bus & Cross-Clipboard             |
|  - Supabase Realtime & RLS        - Universal .4weird Open Container Format          |
+---------------------------------------------------------------------------------------+
```

## 1.2 Core Economic & Security Axioms

Every new feature implemented into 4weird MUST adhere to these non-negotiable rules:
1. **The Vibe Coin Parity Standard:**
   `100 🪙 = exactly $1.00 USD`. Never deviate. All compute rentals, studio generation tools, and squad budgets calculate through this base multiplier.
2. **The 75/25 Monetization Split:**
   Every commercial hosted service or creator tip on the site splits automatically: **75%** to the creator/provider as on-site credits (for games, cloud compute, and AI services; non-withdrawable), and **25%** retained by the platform to pay for cloud infrastructure. Routing around metering or the platform fee violates terms.
3. **Fail-Open Safety:**
   External AI or auxiliary services failing must never brick user navigation. If an AI service is unreachable, fall back to heuristic patterns or graceful error states.
4. **Idempotency & Zero Hydration Errors:**
   All client components must sanitize localStorage and DOM states to prevent Next.js SSR/CSR mismatch errors. Always mount stateful browser APIs inside `useEffect` or client guards.
5. **Universal Event & Clipboard Interop:**
   Every tool created must publish standard events to `interopBus` and read/write to `crossClipboard` so assets flow smoothly across tools.

## 1.3 Tech Stack & Runtime Environment

* **Frontend Framework:** Next.js 15 (App Router), React 19, TypeScript 5.3+
* **Styling:** Vanilla CSS design tokens + Tailwind CSS utilities with dark-mode aesthetic
* **Database & Auth:** Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, Storage buckets, Realtime WebSockets)
* **Audio & Video Processing:** WebCodecs API, `@ffmpeg/ffmpeg` (Wasm), HTML5 Canvas, Web Audio API
* **Compute & Graphics:** WebGL2, WebGPU (Compute Shaders), WebRTC (P2P DataChannels), Three.js
* **AI & LLM Services:** OpenRouter (GPT-5 Mini, Claude 3.5 Sonnet), fal.ai Studio (Image/Video/Audio models), ElevenLabs (TTS), Whisper (STT)
* **Agent Integration:** `@modelcontextprotocol/sdk` (MCP Server), `discord.js` v14 (Discord Bot)

## 1.4 Architectural Layering & Directory Map

```
v2/vcw4w/
├── app/
│   ├── studio/
│   │   ├── video/           # Media Mogul Video NLE
│   │   └── image/           # DictatePic Canvas Editor
│   ├── squads/[id]/
│   │   ├── page.tsx         # Squad Project Workspace (UnitUnite)
│   │   └── kanban/          # Squad Kanban Board with Sprints
│   ├── timer/               # Professional Time Tracker (Web Worker)
│   ├── business/
│   │   └── invoices/        # Full Invoicing Suite with 30-day Trash
│   ├── compute/dps/         # DonatePersonalSeconds P2P Compute
│   ├── terminal/            # Commander CLI
│   ├── luck/                # Luck Factory Intention Engine
│   ├── pet/                 # 3D Pet Room & AliveSpeech
│   ├── chat/                # Direct 1-on-1 Realtime Messaging
│   ├── tools/               # Free Utilities (SEO, Image, Counter, Writing)
│   └── api/                 # REST & Server Actions
├── components/
│   ├── studio/              # Video & Image Studio UI components
│   ├── kanban/              # Drag-and-drop boards and cycle planners
│   ├── invoice/             # Invoice forms, TrashList, PDF preview
│   ├── timer/               # Live timer, project selectors, reports
│   ├── dps/                 # WebGPU compute monitors and donation sliders
│   └── chat/                # Realtime chat viewports and message lists
├── lib/
│   ├── interop.ts           # Cross-tool event bus (BroadcastChannel)
│   ├── cross-clipboard.ts   # Universal typed clipboard
│   ├── pipeline-runner.ts   # Multi-stage automated workflow runner
│   ├── notification-service.ts # Unified push/realtime notification engine
│   ├── dps-hardware.ts      # WebGPU / CPU hardware detection & workers
│   └── ssrf-guard.ts        # 300-Fix security shield
└── programs/
    ├── mcp/                 # @4weird/mcp package (Game QA, Squad tasks)
    └── discord/             # 4weird community Discord bot
```

---

# 2. MASTER DATABASE ARCHITECTURE & MIGRATIONS

Run this complete SQL migration against the Supabase database to establish all tables, relations, triggers, and Row Level Security (RLS) policies needed for the remastery.

```sql
-- ============================================================================
-- 4WEIRD MASTER REMASTERY SQL SCHEMA MIGRATION
-- Run in Supabase SQL Editor (Zero Public Labor Market Risk Standard)
-- ============================================================================

-- 1. SQUAD PROJECTS & INTERNAL TASKS (Safe Team Collaboration)
CREATE TABLE IF NOT EXISTS public.squad_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  repository_url TEXT,
  target_game_slug VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.squad_project_members (
  project_id UUID REFERENCES public.squad_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'contributor' CHECK (role IN ('lead', 'contributor', 'reviewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- 2. SQUAD KANBAN & SPRINT SYSTEM (From GiveGigs)
CREATE TABLE IF NOT EXISTS public.kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.squad_projects(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanban_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.kanban_cycles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  estimate_hours NUMERIC(5, 2) DEFAULT 0,
  due_date DATE,
  labels TEXT[] DEFAULT '{}',
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TIME TRACKING & B2B INVOICE SYSTEM (Ghost Timer Overhaul)
CREATE TABLE IF NOT EXISTS public.time_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  color_hex VARCHAR(20) DEFAULT '#3b82f6',
  hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
  budget_hours NUMERIC(10, 2),
  is_billable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.time_projects(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.kanban_cards(id) ON DELETE SET NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  is_billable BOOLEAN DEFAULT TRUE,
  is_invoiced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  vat_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.invoice_clients(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(100) NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  tax_rate NUMERIC(5, 2) DEFAULT 0.00,
  subtotal NUMERIC(12, 2) DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) DEFAULT 0.00,
  total_amount NUMERIC(12, 2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  sender_company_name VARCHAR(255),
  sender_company_address TEXT,
  sender_logo_url TEXT,
  deleted_at TIMESTAMPTZ, -- 30-Day Soft-Delete Trash Bin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  unit_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  position INTEGER DEFAULT 0
);

-- 4. P2P COMPUTE NODES & DONATIONS (From CryptArtistStudio DPS)
CREATE TABLE IF NOT EXISTS public.dps_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  peer_id TEXT UNIQUE NOT NULL,
  cpu_cores INTEGER NOT NULL DEFAULT 4,
  device_memory_gb NUMERIC(5, 2) DEFAULT 8.0,
  gpu_renderer TEXT,
  is_webgpu_supported BOOLEAN DEFAULT FALSE,
  cpu_share_percent INTEGER DEFAULT 80,
  gpu_share_percent INTEGER DEFAULT 90,
  status VARCHAR(20) DEFAULT 'offline', -- 'online', 'busy', 'offline'
  total_seconds_donated BIGINT DEFAULT 0,
  vibe_coins_earned BIGINT DEFAULT 0,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dps_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_node_id UUID REFERENCES public.dps_nodes(id) ON DELETE SET NULL,
  task_type VARCHAR(50) NOT NULL, -- 'blender_render', 'video_transcode', 'ai_embedding', 'game_bundle'
  payload_json JSONB NOT NULL,
  result_json JSONB,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  vibe_coins_cost INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 5. NOTIFICATION ENGINE & DIRECT CHAT (From GiveGigs)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL, -- 'squad', 'game', 'chat', 'compute', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COMMUNITY MODS & THEMES (From CryptArtistStudio)
CREATE TABLE IF NOT EXISTS public.community_mods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  target_game TEXT NOT NULL, -- 'gravegain3d', 'gravegain2d', 'global'
  manifest_json JSONB NOT NULL,
  script_url TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  css_tokens JSONB NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.squad_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dps_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dps_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_mods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_themes ENABLE ROW LEVEL SECURITY;

-- Squad & Kanban RLS
CREATE POLICY "squad_projects_read" ON public.squad_projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.squad_members WHERE squad_id = squad_projects.squad_id AND user_id = auth.uid())
);
CREATE POLICY "kanban_boards_access" ON public.kanban_boards FOR ALL USING (
  auth.uid() = owner_user_id OR EXISTS (SELECT 1 FROM public.squad_members WHERE squad_id = kanban_boards.squad_id AND user_id = auth.uid())
);
CREATE POLICY "kanban_cards_access" ON public.kanban_cards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.kanban_boards WHERE id = kanban_cards.board_id AND (owner_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.squad_members WHERE squad_id = kanban_boards.squad_id AND user_id = auth.uid())))
);

-- Time & Invoice RLS
CREATE POLICY "time_projects_own" ON public.time_projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "time_entries_own" ON public.time_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "invoices_own" ON public.invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "invoice_clients_own" ON public.invoice_clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "invoice_items_own" ON public.invoice_line_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_line_items.invoice_id AND user_id = auth.uid())
);

-- Notifications RLS
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Chat RLS
CREATE POLICY "chat_threads_read" ON public.chat_threads FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE thread_id = chat_threads.id AND user_id = auth.uid())
);
CREATE POLICY "chat_messages_read" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_participants WHERE thread_id = chat_messages.thread_id AND user_id = auth.uid())
);
CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_user_id AND EXISTS (SELECT 1 FROM public.chat_participants WHERE thread_id = chat_messages.thread_id AND user_id = auth.uid())
);

-- 8. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_invoices_user_deleted ON public.invoices (user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_proj ON public.time_entries (user_id, project_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_pos ON public.kanban_cards (column_id, position);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_time ON public.chat_messages (thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_dps_nodes_active ON public.dps_nodes (status, last_heartbeat DESC);
```


---

# 3. FEATURE IMPLEMENTATION GUIDES: CRYPTARTISTSTUDIO SUITE

---

## 3.1 Feature 01: Media Mogul (MMo) — Web Video Timeline & Multi-Track Studio

### Architectural Blueprint
Media Mogul in 4weird provides an in-browser video editor specifically built for game creators, clan leaders, and 3D animators. It runs on HTML5 Canvas + WebCodecs and allows combining gameplay clips, 3D Blender renders, fal.ai video generations, and ElevenLabs voiceovers into a polished video file.

```
+-----------------------------------------------------------------------------------+
| Media Mogul Architecture (app/studio/video)                                       |
+-----------------------------------------------------------------------------------+
|  [ Media Library ]  |                    [ Video Preview Viewport ]               |
|  - Uploads          |                    HTML5 Canvas 60 FPS                      |
|  - fal.ai Generations|                                                            |
|  - Blender Renders  |-------------------------------------------------------------|
|  - Audio Tracks     |  [ Timeline Controls: Play, Split, Ripple, Snap, Zoom ]     |
|                     |-------------------------------------------------------------|
|                     | Video Track 1: [ Clip A ]---------[ Clip B ]--------        |
|                     | Video Track 2: ------[ Overlay Sprite / Watermark ]         |
|                     | Audio Track 1: [ Background Music (GiveGigs / fal) ]------  |
|                     | Audio Track 2: ---------[ ElevenLabs Voiceover ]----------  |
+-----------------------------------------------------------------------------------+
```

### TypeScript Data Structures (`types/studio-video.ts`)

```typescript
export interface VideoClip {
  id: string;
  name: string;
  sourceUrl: string;
  trackIndex: number;
  startOffsetSeconds: number; // Position on timeline
  durationSeconds: number;
  trimInSeconds: number;      // Trim inside source
  trimOutSeconds: number;
  volume: number;             // 0.0 to 1.0
  playbackRate: number;
  opacity: number;
  zIndex: number;
  effects: VideoEffect[];
}

export interface VideoEffect {
  type: "color_grade" | "blur" | "chroma_key" | "speed" | "fade";
  params: Record<string, number | string | boolean>;
}

export interface TimelineState {
  currentTimeSeconds: number;
  totalDurationSeconds: number;
  isPlaying: boolean;
  zoomLevel: number;          // Pixels per second
  snapToGrid: boolean;
  selectedClipId: string | null;
  clips: VideoClip[];
}
```

### Core Timeline Engine Implementation (`components/studio/video-timeline.tsx`)

```tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { VideoClip, TimelineState } from "@/types/studio-video";

interface TimelineProps {
  timeline: TimelineState;
  onTimelineChange: (next: TimelineState) => void;
  onSeek: (timeSeconds: number) => void;
}

export function VideoTimeline({ timeline, onTimelineChange, onSeek }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const handlePointerDownPlayhead = (e: React.PointerEvent) => {
    setIsDraggingPlayhead(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingPlayhead || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left);
    const newTime = x / timeline.zoomLevel;
    onSeek(Math.min(newTime, timeline.totalDurationSeconds));
  }, [isDraggingPlayhead, timeline.zoomLevel, timeline.totalDurationSeconds, onSeek]);

  const handlePointerUp = useCallback(() => {
    setIsDraggingPlayhead(false);
  }, []);

  useEffect(() => {
    if (isDraggingPlayhead) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [isDraggingPlayhead, handlePointerMove, handlePointerUp]);

  const splitClipAtPlayhead = () => {
    if (!timeline.selectedClipId) return;
    const clip = timeline.clips.find(c => c.id === timeline.selectedClipId);
    if (!clip) return;

    const playhead = timeline.currentTimeSeconds;
    if (playhead <= clip.startOffsetSeconds || playhead >= clip.startOffsetSeconds + clip.durationSeconds) {
      return; // Playhead not within selected clip
    }

    const firstDuration = playhead - clip.startOffsetSeconds;
    const secondDuration = clip.durationSeconds - firstDuration;

    const clip1: VideoClip = {
      ...clip,
      durationSeconds: firstDuration,
      trimOutSeconds: clip.trimInSeconds + firstDuration,
    };

    const clip2: VideoClip = {
      ...clip,
      id: crypto.randomUUID(),
      startOffsetSeconds: playhead,
      durationSeconds: secondDuration,
      trimInSeconds: clip.trimInSeconds + firstDuration,
    };

    const nextClips = timeline.clips.filter(c => c.id !== clip.id).concat([clip1, clip2]);
    onTimelineChange({
      ...timeline,
      clips: nextClips,
      selectedClipId: clip2.id
    });
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden select-none">
      {/* Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSeek(0)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded font-bold text-slate-300"
          >
            |&lt; Start
          </button>
          <button
            onClick={splitClipAtPlayhead}
            disabled={!timeline.selectedClipId}
            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs rounded font-bold text-white"
          >
            ✂️ Split Clip (Razor)
          </button>
        </div>
        <div className="text-xs font-mono text-cyan-300">
          {timeline.currentTimeSeconds.toFixed(2)}s / {timeline.totalDurationSeconds.toFixed(2)}s
        </div>
      </div>

      {/* Tracks Container */}
      <div
        ref={containerRef}
        className="relative h-48 overflow-x-auto overflow-y-hidden bg-slate-950 p-2 cursor-crosshair"
      >
        {/* Playhead Marker */}
        <div
          style={{ left: `${timeline.currentTimeSeconds * timeline.zoomLevel}px` }}
          onPointerDown={handlePointerDownPlayhead}
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-auto cursor-ew-resize"
        >
          <div className="w-3 h-3 -ml-1.5 bg-red-500 rounded-full" />
        </div>

        {/* Tracks */}
        {[0, 1].map((trackIdx) => (
          <div key={trackIdx} className="h-16 relative border-b border-slate-800/80 mb-2 rounded bg-slate-900/50">
            <span className="absolute left-2 top-1 text-[10px] uppercase font-bold text-slate-600 pointer-events-none">
              Track {trackIdx + 1}
            </span>
            {timeline.clips
              .filter((c) => c.trackIndex === trackIdx)
              .map((clip) => (
                <div
                  key={clip.id}
                  onClick={() => onTimelineChange({ ...timeline, selectedClipId: clip.id })}
                  style={{
                    left: `${clip.startOffsetSeconds * timeline.zoomLevel}px`,
                    width: `${clip.durationSeconds * timeline.zoomLevel}px`,
                  }}
                  className={`absolute top-3 bottom-1 rounded px-2 text-xs font-semibold flex items-center justify-between border cursor-pointer ${
                    timeline.selectedClipId === clip.id
                      ? "bg-cyan-600/60 border-cyan-400 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                  }`}
                >
                  <span className="truncate">{clip.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">{clip.durationSeconds.toFixed(1)}s</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Tips for How to Code Media Mogul
1. **Never Decode Entire Videos in Memory:**
   Use HTML5 `<video>` elements tied to canvas draw frames via `requestVideoFrameCallback()` instead of reading raw Uint8Array buffers directly. This prevents memory leaks and browser tab crashes during 4K clip editing.
2. **Audio Syncing Standard:**
   Always drive clock timing from the primary AudioContext (`audioCtx.currentTime`), rather than `requestAnimationFrame`. Audio clocks do not drift under heavy GPU or DOM load.
3. **RunPod Cloud Rendering Export:**
   For final high-resolution MP4 delivery, do not attempt to render heavy 1080p60 exports in client JavaScript. Package the timeline state as JSON and POST it to `/api/compute/render-video` to dispatch a headless FFmpeg instance on an RTX 4090 RunPod node.

---

## 3.2 Feature 02: DictatePic (D(pi)c) — GIMP-Style Layered Canvas & Sprite Editor

### Architectural Blueprint
DictatePic brings a full raster painting and pixel-art sprite editing studio to 4weird (`app/studio/image`). It is designed to support 4weird game modders and artists working on GraveGain 2D/3D textures and NewGamePlus assets.

```
+-----------------------------------------------------------------------------------+
| DictatePic Canvas Architecture                                                    |
+-----------------------------------------------------------------------------------+
|  [ Tool Palette (28 Tools) ] |         [ Multi-Layer Viewport Canvas ]            |
|  - Marquee / Lasso Select     |         Checkerboard Transparency Background      |
|  - Brush, Pencil, Eraser      |         Rulers: Horizontal & Vertical             |
|  - Fill Bucket, Gradient      |         Zoom: 10% - 800%                          |
|  - Clone Stamp, Smudge, Blur  |---------------------------------------------------|
|  - AI Inpainting Brush        |  [ Layers Stack ]        | [ Properties / History]|
|  - AI Background Remover      |  Layer 3: Hair [Normal]  | Brush Size: 16px       |
|  - AI Upscaler (x4)           |  Layer 2: Skin [Multiply]| Opacity: 100%          |
|  - Slice Spritesheet          |  Layer 1: Base [Normal]  | Undo History: 40 steps |
+-----------------------------------------------------------------------------------+
```

### TypeScript Data Structures (`types/dictate-pic.ts`)

```typescript
export type BlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn";

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0.0 to 1.0
  blendMode: BlendMode;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export type ActiveTool =
  | "brush"
  | "pencil"
  | "eraser"
  | "bucket"
  | "eyedropper"
  | "marquee"
  | "lasso"
  | "clone_stamp"
  | "ai_inpaint"
  | "ai_remove_bg"
  | "slice";
```

### Core Canvas Multi-Layer Engine (`components/studio/dictate-canvas.tsx`)

```tsx
"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { CanvasLayer, ActiveTool } from "@/types/dictate-pic";

export function DictateCanvas() {
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>("");
  const [activeTool, setActiveTool] = useState<ActiveTool>("brush");
  const [brushColor, setBrushColor] = useState<string>("#22d3ee");
  const [brushSize, setBrushSize] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);

  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const width = 512;
  const height = 512;

  useEffect(() => {
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = width;
    baseCanvas.height = height;
    const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true })!;

    const initialLayer: CanvasLayer = {
      id: crypto.randomUUID(),
      name: "Background",
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: "source-over",
      canvas: baseCanvas,
      ctx: baseCtx
    };

    setLayers([initialLayer]);
    setActiveLayerId(initialLayer.id);
  }, []);

  const compositeLayers = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;
    const ctx = displayCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    const squareSize = 16;
    for (let x = 0; x < width; x += squareSize) {
      for (let y = 0; y < height; y += squareSize) {
        ctx.fillStyle = (x / squareSize + y / squareSize) % 2 === 0 ? "#1e293b" : "#0f172a";
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }

    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
  }, [layers]);

  useEffect(() => {
    compositeLayers();
  }, [layers, compositeLayers]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const active = layers.find((l) => l.id === activeLayerId);
    if (!active || active.locked) return;

    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    active.ctx.beginPath();
    active.ctx.moveTo(x, y);
    active.ctx.strokeStyle = activeTool === "eraser" ? "rgba(0,0,0,1)" : brushColor;
    active.ctx.lineWidth = brushSize;
    active.ctx.lineCap = "round";
    active.ctx.lineJoin = "round";

    if (activeTool === "eraser") {
      active.ctx.globalCompositeOperation = "destination-out";
    } else {
      active.ctx.globalCompositeOperation = "source-over";
    }

    active.ctx.lineTo(x, y);
    active.ctx.stroke();
    compositeLayers();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const active = layers.find((l) => l.id === activeLayerId);
    if (!active || active.locked) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    active.ctx.lineTo(x, y);
    active.ctx.stroke();
    compositeLayers();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex gap-4 p-4 bg-slate-950 text-white rounded-2xl border border-slate-800">
      <div className="flex flex-col gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTool("brush")}
          className={`p-2 rounded font-bold text-xs ${activeTool === "brush" ? "bg-cyan-500 text-black" : "bg-slate-800"}`}
        >
          🖌️ Brush
        </button>
        <button
          onClick={() => setActiveTool("eraser")}
          className={`p-2 rounded font-bold text-xs ${activeTool === "eraser" ? "bg-cyan-500 text-black" : "bg-slate-800"}`}
        >
          🧹 Eraser
        </button>
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
          className="w-full h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
        />
        <label className="text-[10px] text-slate-400">Size: {brushSize}px</label>
        <input
          type="range"
          min="1"
          max="64"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-20"
        />
      </div>

      <div className="flex flex-col items-center justify-center p-4 bg-slate-900/60 rounded-xl border border-slate-800">
        <canvas
          ref={displayCanvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="border border-slate-700 shadow-2xl rounded cursor-crosshair"
        />
      </div>
    </div>
  );
}
```

### Tips for How to Code DictatePic
1. **Pixel-Crisp Canvas Settings:**
   When editing sprites at high zoom levels (e.g. 800%), round coordinates to exact integer pixels (`Math.floor(x)`). Set `ctx.imageSmoothingEnabled = false` across all offscreen layers and display canvases to prevent blurred pixel borders.
2. **Sub-Pixel Inpainting Masking:**
   When running the AI Inpaint brush, render the user\'s stroke into an offscreen binary mask canvas (white on black). Convert this canvas to a PNG DataURL and send it to `fal.ai/bria/inpainting` alongside the base image.
3. **Memory Management for Layer Stacks:**
   Keep layer canvas dimensions identical to the document dimensions. Never allocate unbounded canvas instances. Limit undo history to 30 snapshots, storing compressed PNG data URLs or differential bounding boxes rather than full canvas DOM clones.

---

## 3.3 Feature 03: DebugPlay (DP) — Headless Game Tester & Visual AI Bug Analyzer

### Architectural Blueprint
DebugPlay hooks directly into VibeCodeWorker (`lib/vcw-autoplay.ts` and `lib/vcw-frame-analysis.ts`). Instead of purely text-based automation, DebugPlay grabs visual video frames from the running game, submits them to GPT-4o-mini or Claude 3.5 Sonnet, determines if the game is soft-locked or visually broken, and returns targeted code fixes.

```
+-----------------------------------------------------------------------------------+
| DebugPlay Framework Flow                                                          |
+-----------------------------------------------------------------------------------+
| 1. Headless Game Runner (Playwright or iframe canvas)                             |
|    |                                                                              |
|    v                                                                              |
| 2. Frame Grabber (`canvas.toDataURL("image/png")`) -> 1 frame per 2.0s            |
|    |                                                                              |
|    v                                                                              |
| 3. Visual AI Inspector (Multi-modal LLM)                                          |
|    Prompt: "Analyze this game frame. Is player stuck? Are textures missing?       |
|    Are collisions failing? Return JSON bug list."                                 |
|    |                                                                              |
|    v                                                                              |
| 4. Decision Engine                                                                |
|    - If Bug Detected: Emit `vcw:code-fix-suggested` with code diff                |
|    - If Playable: Dispatch next key/mouse input (e.g. "jump", "right")            |
|    |                                                                              |
|    v                                                                              |
| 5. Live UI Scrubber (Timeline of analyzed frames with bug flags)                  |
+-----------------------------------------------------------------------------------+
```

### Core Implementation (`lib/debug-play-analyzer.ts`)

```typescript
export interface BugReport {
  id: string;
  timestampSeconds: number;
  severity: "critical" | "warning" | "cosmetic";
  title: string;
  description: string;
  suggestedFixDiff?: string;
  screenshotBase64: string;
}

export async function analyzeGameFrameWithAI(
  frameBase64: string,
  gameSlug: string,
  currentCodeSnippet?: string
): Promise<{ bugs: BugReport[]; nextInput: string }> {
  const systemPrompt = `You are DebugPlay, an AI automated game QA engineer inspecting gameplay frames for the game "${gameSlug}".
Analyze the provided screenshot. Detect visual bugs (black screen, missing textures, player clipping out of bounds, broken UI).
Suggest whether the game is running normally and output the next recommended controller action (e.g., "arrow_right", "space", "idle").
Format output strictly as JSON.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze this game frame. Source snippet: ${currentCodeSnippet ?? "N/A"}` },
            { type: "image_url", image_url: { url: frameBase64 } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");

  return {
    bugs: parsed.bugs ?? [],
    nextInput: parsed.nextInput ?? "idle"
  };
}
```

### Tips for How to Code DebugPlay
1. **Frame Downsampling:**
   Downscale captured frames to 640x360 before sending them to the LLM API. 640x360 preserves all visual bug signals while reducing token usage and API latency by over 70%.
2. **Preventing AI Loop Hallucination:**
   Cache the last 5 decisions. If the AI suggests the same action (e.g., "arrow_right") 5 times consecutively and the canvas frame hash has not changed, conclude that the player entity is stuck against an invisible collision wall.
3. **Seamless IDE Diff Injection:**
   When a bug includes a `suggestedFixDiff`, emit an event to the Monaco editor instance via `interopBus.emit("code:fix-available", diff)`. Render an in-editor banner giving the developer a one-click "Accept AI Fix" button.

---

## 3.4 Feature 04: DonatePersonalSeconds (DPS) — P2P Compute & WebGPU Sharing

### Architectural Blueprint
DPS allows users to donate idle computing power to run background tasks (like VibeCodeWorker game QA runs, procedural terrain generation, or sprite compression) in exchange for earning **Vibe Coins** (100 🪙 = $1.00).

```
+-----------------------------------------------------------------------------------+
| DPS P2P Compute Architecture                                                      |
+-----------------------------------------------------------------------------------+
|  [ Donor Browser ]                                                                |
|  - WebGPU Compute Shader or WebAssembly Worker                                    |
|  - Hardware Detection (Cores, RAM, GPU, Battery/AC)                               |
|  - Sliders: CPU 80%, RAM 50%, GPU 90%                                             |
|        ^                                                                          |
|        | WebRTC DataChannel (P2P Mesh)                                            |
|        v                                                                          |
|  [ P2P Signaling Server (/api/dps/signal) ]                                        |
|  - Matches job requesters with available donor nodes                              |
|  - Enforces cryptographic proof-of-work validation                                |
|  - Credits Vibe Coins to donor wallet in Supabase                                 |
+-----------------------------------------------------------------------------------+
```

### Core Hardware Detector & Worker (`lib/dps-hardware.ts`)

```typescript
export interface HardwareCapabilities {
  cpuCores: number;
  memoryGb: number;
  gpuRenderer: string;
  hasWebGPU: boolean;
  networkDownlinkMbps: number;
}

export async function detectHardwareCapabilities(): Promise<HardwareCapabilities> {
  const cpuCores = navigator.hardwareConcurrency || 4;
  const memoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;

  let networkDownlinkMbps = 10;
  if ("connection" in navigator) {
    const conn = (navigator as unknown as { connection?: { downlink?: number } }).connection;
    networkDownlinkMbps = conn?.downlink || 10;
  }

  let hasWebGPU = false;
  let gpuRenderer = "Unknown WebGL";

  if ("gpu" in navigator && (navigator as unknown as { gpu?: unknown }).gpu) {
    hasWebGPU = true;
  }

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (gl) {
    const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      gpuRenderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
    }
  }

  return {
    cpuCores,
    memoryGb,
    gpuRenderer,
    hasWebGPU,
    networkDownlinkMbps
  };
}
```

### Tips for How to Code DonatePersonalSeconds
1. **Untrusted Payload Sandboxing:**
   Never execute raw JavaScript strings received over WebRTC. Tasks must be executed strictly inside a sandboxed Web Worker with no access to `localStorage`, `cookies`, or the DOM, communicating purely through typed structured cloning (`postMessage`).
2. **Thermal & Battery Protection:**
   Use the Battery Status API (`navigator.getBattery()`). Automatically pause all compute operations if the device is running on battery power below 30% or if battery charging is disconnected.
3. **Proof-of-Computation Verification:**
   To prevent spoofed compute claims, include a deterministic hash checkpoint in every task chunk (e.g. SHA-256 seed check). Validate results against a lightweight redundant node before releasing coin payouts.

---

## 3.5 Feature 05: DemoRecorder (DRe) — Screen Recorder & AI Action Dataset Logger

### Architectural Blueprint
DemoRecorder allows players to record high-resolution game clips and speedruns. Crucially, when "AI Training Mode" is toggled, it logs every keyboard press, mouse click, and cursor trajectory into a structured JSON dataset tied to exact video timestamps.

### Input Logging Hook (`lib/use-action-logger.ts`)

```typescript
import { useRef, useCallback } from "react";

export interface LoggedAction {
  timestampMs: number;
  eventType: "keydown" | "keyup" | "mousedown" | "mouseup" | "mousemove";
  key?: string;
  normalizedX?: number; // 0.0 to 1.0 (independent of window resolution)
  normalizedY?: number;
}

export function useActionLogger() {
  const actionsRef = useRef<LoggedAction[]>([]);
  const startTimeRef = useRef<number>(0);
  const isLoggingRef = useRef<boolean>(false);

  const startLogging = useCallback(() => {
    actionsRef.current = [];
    startTimeRef.current = performance.now();
    isLoggingRef.current = true;
  }, []);

  const recordEvent = useCallback((e: MouseEvent | KeyboardEvent, canvasElement?: HTMLElement) => {
    if (!isLoggingRef.current) return;
    const now = performance.now() - startTimeRef.current;

    if (e.type.startsWith("key")) {
      const ke = e as KeyboardEvent;
      actionsRef.current.push({
        timestampMs: now,
        eventType: ke.type as "keydown" | "keyup",
        key: ke.code
      });
    } else if (e.type.startsWith("mouse") && canvasElement) {
      const me = e as MouseEvent;
      const rect = canvasElement.getBoundingClientRect();
      const normalizedX = (me.clientX - rect.left) / rect.width;
      const normalizedY = (me.clientY - rect.top) / rect.height;

      actionsRef.current.push({
        timestampMs: now,
        eventType: me.type as "mousedown" | "mouseup" | "mousemove",
        normalizedX,
        normalizedY
      });
    }
  }, []);

  const stopLogging = useCallback((): LoggedAction[] => {
    isLoggingRef.current = false;
    return actionsRef.current;
  }, []);

  return { startLogging, recordEvent, stopLogging };
}
```

### Tips for How to Code DemoRecorder
1. **Resolution Normalization:**
   Always record mouse events as normalized percentages (`0.0` to `1.0`) relative to the game canvas rather than raw screen pixels. This ensures trained models work regardless of device DPI or browser zoom.
2. **Keystroke Privacy:**
   Never log input events when the active focused element is an `<input>`, `<textarea>`, or password field.
3. **Synchronized Video Export:**
   Package the WebM video Blob and the `actions.json` file together into a single downloadable ZIP archive using `jszip`.

---

## 3.6 Feature 06: Interactive 3D Pet Room & AliveSpeech Voice Companion

### Architectural Blueprint
Combines 4weird's existing ElevenLabs voice engine (`lib/buddy-voice.ts`) with a Three.js 3D room, giving players an interactive companion or Clan Mascot that reacts to voice, offers game tips, and levels up.

```
+-----------------------------------------------------------------------------------+
| 3D Pet & AliveSpeech Architecture                                                 |
+-----------------------------------------------------------------------------------+
|  [ Microphone Web Audio ]                                                         |
|  - AnalyserNode RMS Audio Meter (Silence Detection)                               |
|  - Auto-sends speech chunks to Whisper API when user stops talking                |
|        |                                                                          |
|        v                                                                          |
|  [ OpenRouter / GPT-5 Mini Brain ]                                                 |
|  - Determines response + triggers 3D animation (happy, dance, sleep, alert)        |
|        |                                                                          |
|        +-----------------------------------+                                      |
|        v                                   v                                      |
|  [ ElevenLabs Streaming Audio ]   [ Three.js 3D Viewport ]                        |
|  - Plays voice with lip-sync      - Renders Pet Mesh, Room, Furniture             |
+-----------------------------------------------------------------------------------+
```

### Tips for How to Code AliveSpeech
1. **Silence Threshold Optimization:**
   Calculate Root-Mean-Square (RMS) volume every 50ms. If RMS drops below `0.02` for more than `1,200ms`, trigger the speech cutoff and dispatch the audio buffer.
2. **Web Audio Unlock on Mobile:**
   Mobile browsers block audio playback until user interaction. Attach an empty audio play trigger to the initial "Start Voice Chat" button click.

---

## 3.7 Feature 07: CryptArt Commander (CAC) — Power-User Terminal & Scripting Engine

### Architectural Blueprint
Provides a quake-style dropdown CLI (`Ctrl+Backquote`) for power users, developers, and clan tech officers to inspect system diagnostics, run batch jobs, query Vibe Coin balances, and trigger game test runs.

### Command Execution Engine (`lib/commander-registry.ts`)

```typescript
export interface CommandContext {
  args: string[];
  print: (line: string) => void;
  printError: (line: string) => void;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void> | void;

export class CommandRegistry {
  private commands = new Map<string, CommandHandler>();

  register(name: string, handler: CommandHandler) {
    this.commands.set(name.toLowerCase(), handler);
  }

  async execute(input: string, print: (l: string) => void, printError: (l: string) => void) {
    const trimmed = input.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const handler = this.commands.get(cmd);
    if (!handler) {
      printError(`Command not found: "${cmd}". Type "help" for available commands.`);
      return;
    }

    try {
      await handler({ args, print, printError });
    } catch (err) {
      printError(`Execution failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
```

### Tips for How to Code Commander
1. **Command Line Sanitization:**
   Never pass terminal input to `eval()` or unquoted shell processes. All commands must map strictly to TypeScript handler functions.
2. **Terminal Scrollback Memory Limit:**
   Cap the terminal output history to 500 lines. Slice array buffers periodically to keep DOM memory negligible.

---

## 3.8 Feature 08: Luck Factory (LCK) — Intention Meditation & Cryptographic Luck Engine

### Architectural Blueprint
Converts player mantras, wishes, or clan rallying cries into a deterministic cryptographic luck seed using SHA-256 hashing. The seed outputs presets (69, 420, 777) and injects directly into GraveGain loot tables, NewGamePlus procedural dungeons, and daily coin rewards.

```typescript
export function computeLuckSeed(intention: string): { seed: number; preset: 69 | 420 | 777 } {
  let hash = 0;
  for (let i = 0; i < intention.length; i++) {
    hash = (hash << 5) - hash + intention.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const score = positive % 1000;

  let preset: 69 | 420 | 777 = 69;
  if (score >= 900) preset = 777;
  else if (score >= 500) preset = 420;

  return { seed: positive, preset };
}
```

---

## 3.9 Feature 09: Cross-Tool Interoperability Suite (Bus, Clipboard, Pipelines)

### Architectural Blueprint
Implements a unified pub/sub event bus (`BroadcastChannel`), a typed cross-tool clipboard, and multi-step pipeline coordinator enabling assets, code, and testing to flow across all 4weird tools.

### Global Interop Implementation (`lib/interop.ts`)

```typescript
export type InteropEventPayload = {
  "media:exported": { path: string; type: "video" | "image" | "audio" };
  "code:fix-available": { patchDiff: string; targetFile: string };
  "game:asset-imported": { assetUrl: string; assetType: string };
  "squad:task-completed": { squadId: string; taskId: string };
  "system:notification": { title: string; message: string; category: string };
};

export class InteropBus {
  private channel: BroadcastChannel;
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  constructor() {
    this.channel = new BroadcastChannel("4weird_interop_bus");
    this.channel.onmessage = (event) => {
      const { type, data } = event.data;
      this.notify(type, data);
    };
  }

  emit<K extends keyof InteropEventPayload>(type: K, data: InteropEventPayload[K]) {
    this.notify(type, data);
    this.channel.postMessage({ type, data });
  }

  on<K extends keyof InteropEventPayload>(type: K, callback: (data: InteropEventPayload[K]) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback as (data: unknown) => void);
    return () => {
      this.listeners.get(type)?.delete(callback as (data: unknown) => void);
    };
  }

  private notify(type: string, data: unknown) {
    const set = this.listeners.get(type);
    if (set) {
      set.forEach((cb) => cb(data));
    }
  }
}

export const interopBus = typeof window !== "undefined" ? new InteropBus() : null;
```

---

## 3.10 Feature 10: Universal `.4weird` Project Container Format

### Architectural Blueprint
A standardized JSON envelope allowing players and developers to download, backup, and share complete game projects, NewGamePlus drafts, or VCW test suites.

```typescript
export interface FourWeirdProjectContainer {
  $4weird: 1; // Magic version tag (Always 1)
  module: "game_project" | "video_nle" | "sprite_atlas" | "vcw_suite";
  metadata: {
    id: string;
    title: string;
    author: string;
    createdAt: string;
    appVersion: string;
    tags: string[];
  };
  payload: Record<string, unknown>;
  assets: Array<{
    filename: string;
    mimeType: string;
    dataBase64: string;
  }>;
}
```

---

## 3.11 Feature 11: Monaco IDE Diagnostic Panels (Testing, Web Audit, Problems)

### Architectural Blueprint
Equips 4weird\'s `/code` environment and VibeCodeWorker with three dedicated bottom-panel diagnostic tabs:
1. **Testing Panel:** Runs auto-tests on file save checking null assertions, boundary conditions, and type safety.
2. **Web Audit Panel:** Lighthouse-style audit checking mobile viewport, meta tags, image alt tags, ARIA attributes, and HTTPS assets.
3. **Problems Scanner:** Continuous linter highlighting `console.log`, `TODO`, debugger statements, and empty catch blocks.

---

## 3.12 Feature 12: Community Mod, Plugin, and Custom Theme System

### Architectural Blueprint
Permits community creators to upload mod packages and custom CSS token themes. Mods are sandboxed in an iframe with strict origin policies, preventing access to 4weird session tokens.

---

## 3.13 Feature 13: ValleyNet Autonomous Computer-Use Agent & Skills System

### Architectural Blueprint
Upgrades `valleynet.ts` from a simple regex automod filter into a true autonomous agent runner. Connects to the skills framework (`content/skills/`) to perform multi-step web scraping, Discord webhook announcements, and asset conversions autonomously.


---

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


---

# 5. CROSS-CUTTING ARCHITECTURAL MODULES

---

## 5.1 Universal Cross-Tool Clipboard (`lib/cross-clipboard.ts`)

```typescript
export interface ClipboardItemData {
  type: "code" | "image" | "audio" | "prompt" | "asset_url";
  sourceProgram: string;
  data: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export class CrossClipboard {
  private key = "4weird_cross_clipboard_history";

  copy(item: Omit<ClipboardItemData, "createdAt">) {
    const fullItem: ClipboardItemData = { ...item, createdAt: Date.now() };
    const history = this.getHistory();
    const next = [fullItem, ...history.slice(0, 49)];
    localStorage.setItem(this.key, JSON.stringify(next));
  }

  getLatest(typeFilter?: ClipboardItemData["type"]): ClipboardItemData | null {
    const history = this.getHistory();
    if (!typeFilter) return history[0] || null;
    return history.find((i) => i.type === typeFilter) || null;
  }

  getHistory(): ClipboardItemData[] {
    try {
      return JSON.parse(localStorage.getItem(this.key) || "[]");
    } catch {
      return [];
    }
  }
}

export const crossClipboard = typeof window !== "undefined" ? new CrossClipboard() : null;
```

---

## 5.2 Automated Multi-Step Pipeline Engine (`lib/pipeline-runner.ts`)

```typescript
export interface PipelineStep {
  name: string;
  tool: "fal" | "dictatepic" | "mediamogul" | "vcw" | "squad";
  action: string;
  inputPayload: Record<string, unknown>;
}

export class PipelineRunner {
  async executePipeline(
    pipelineName: string,
    steps: PipelineStep[],
    onProgress: (stepIdx: number, status: string) => void
  ) {
    let currentPayload: Record<string, unknown> = {};

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      onProgress(i, `Executing ${step.name}...`);

      const res = await fetch("/api/pipeline/execute-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: step.tool,
          action: step.action,
          payload: { ...step.inputPayload, ...currentPayload }
        })
      });

      if (!res.ok) {
        throw new Error(`Pipeline step failed: ${step.name}`);
      }

      const result = await res.json();
      currentPayload = result.outputPayload || {};
    }

    onProgress(steps.length, `Pipeline ${pipelineName} completed successfully!`);
    return currentPayload;
  }
}
```

---

## 5.3 Unified Notification Service (`lib/notification-service.ts`)

```typescript
import { supabaseServer } from "@/lib/supabase/server";

export async function sendNotification(
  userId: string,
  category: string,
  title: string,
  message: string,
  linkUrl?: string
) {
  const supabase = supabaseServer();
  await supabase.from("notifications").insert({
    user_id: userId,
    category,
    title,
    message,
    link_url: linkUrl,
    is_read: false
  });
}
```

---

# 6. SECURITY HARDENING & THE 300-FIX STANDARD

All new code contributed in this remastery MUST implement the 300-fix security standard:
1. **Strict SVG Sanitization:**
   Any user-uploaded SVG (for game sprites, logos, or icons) must be stripped of `<script>`, `<foreignObject>`, and all `on*` event handlers using `DOMPurify` before rendering.
2. **Double-Click Prevention on Coin Actions:**
   Every button that triggers a Vibe Coin deduction, squad balance transfer, or service purchase must disable itself immediately upon click using pointer-capture and state guards to prevent double-spending.
3. **SSRF Guard on Media Imports:**
   All external URLs passed to video/image processors must pass through `lib/ssrf-guard.ts` to block internal IP ranges (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`).
4. **WebSocket Heartbeat Leaks:**
   P2P WebRTC channels and Supabase Realtime connections must gracefully terminate on unmount to prevent dangling socket memory leaks.
5. **Constant-Time Token Comparison:**
   When verifying gateway API keys (`vcw_live_...`), use `crypto.timingSafeEqual()` to eliminate timing attack vectors.

---

# 7. SWARM EXECUTION ROADMAP & ROLLOUT WAVES

```
+-----------------------------------------------------------------------------------+
| Swarm Orchestration Rollout Schedule                                              |
+-----------------------------------------------------------------------------------+
| WAVE 1: Squad Workspaces, Invoicing, Time Tracking & Productivity Foundation      |
| - Lanes: GG-01 to GG-06                                                           |
| - Deliverables: Squad Workspaces, Kanban Boards, Time Tracking, Invoicing Suite,  |
|                 Real-Time Notifications, 1-on-1 Direct Chat                       |
|                                                                                   |
| WAVE 2: AI Infrastructure, MCP, Discord, & P2P Compute                            |
| - Lanes: GG-07 to GG-10 + CAS-01 to CAS-04                                        |
| - Deliverables: @4weird/mcp package, Discord Bot, DebugPlay, DPS WebGPU Worker    |
|                                                                                   |
| WAVE 3: Creative Suite, Video NLE, Sprite Editor, & Interop                       |
| - Lanes: CAS-05 to CAS-10                                                         |
| - Deliverables: Media Mogul Video NLE, DictatePic Canvas, Interop Bus, .4weird    |
+-----------------------------------------------------------------------------------+
```

---

# 8. VERIFICATION, QUALITY ASSURANCE, & DIAGNOSTIC CHECKS

Before declaring any lane complete, execute this verification run:

```bash
# 1. Run type check and Next.js lint
npm run test

# 2. Verify all game bundles and hash integrity
node scripts/verify-game-bundles.mjs

# 3. Test MCP server build
cd programs/mcp && npm run build && npx @modelcontextprotocol/inspector ./build/index.js
```

---
*End of 4weird Remastery Master Implementation Guide.*
