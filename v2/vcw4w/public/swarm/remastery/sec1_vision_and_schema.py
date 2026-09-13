def get_section_1():
    return r'''# 🎮 4WEIRD REMASTERY: THE MASTER IMPLEMENTATION GUIDE
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
    - 3.8 Feature 08: Luck Factory (LCK) — Intention Meditation & Deterministic Preview Engine (no gambling)
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

* **Frontend Framework:** Next.js 16 (App Router), React 19, TypeScript 5.3+
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
'''
