def get_section_1():
    return '''# 🎮 4WEIRD REMASTERY: THE MASTER IMPLEMENTATION GUIDE
## Comprehensive Blueprint for Integrating CryptArtistStudio & GiveGigs into 4weird
### Location: `public/swarm/remastery/README.md`
### Version: 2.0.0-REMASTERY · Status: READY FOR SWARM ORCHESTRATION

---

## TABLE OF CONTENTS

1. [Executive Architectural Vision](#1-executive-architectural-vision)
   - 1.1 The Convergence: 4weird + CryptArtistStudio + GiveGigs
   - 1.2 Core Economic & Security Axioms
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
4. [Feature Implementation Guides: GiveGigs Ecosystem](#4-feature-implementation-guides-givegigs-ecosystem)
   - 4.1 Feature 14: Creator & Talent Directory with Rich Audio/Video Showcases
   - 4.2 Feature 15: Multi-Tiered Anti-Scraping / Anti-Harassment Contact Gates
   - 4.3 Feature 16: AI & Clan Bounty Escrow System (75/25 Economic Split)
   - 4.4 Feature 17: Official Model Context Protocol (`@4weird/mcp`) Server
   - 4.5 Feature 18: Official 4weird Community & Clan Raid Discord Bot
   - 4.6 Feature 19: Squad Kanban Board with Sprints & Drag-and-Drop
   - 4.7 Feature 20: Advanced Invoicing with 30-Day Trash & Ghost Timer Conversion
   - 4.8 Feature 21: Free Organic Utilities Suite (SEO, Image, Writing, Counter)
   - 4.9 Feature 22: Global Real-Time Notification Center with Categories & Badges
   - 4.10 Feature 23: Direct 1-on-1 Real-Time Chat & Threading
5. [Cross-Cutting Architectural Modules](#5-cross-cutting-architectural-modules)
   - 5.1 Global Interop Event Bus (`lib/interop.ts`)
   - 5.2 Universal Cross-Tool Clipboard (`lib/cross-clipboard.ts`)
   - 5.3 Automated Multi-Step Pipeline Engine (`lib/pipeline-runner.ts`)
   - 5.4 Unified Notification Service (`lib/notification-service.ts`)
6. [Security Hardening & The 300-Fix Standard](#6-security-hardening--the-300-fix-standard)
   - 6.1 Content Security Policy & Nonce Generation
   - 6.2 SVG Sanitization & Media Injection Shields
   - 6.3 Anti-Double-Click & Concurrency Guard Patterns
   - 6.4 Rate Limiting & SSRF Protection
7. [Swarm Execution Roadmap & Rollout Waves](#7-swarm-execution-roadmap--rollout-waves)
   - 7.1 Wave 1: Commerce, Direct Contact, & Community Foundation
   - 7.2 Wave 2: AI Infrastructure, MCP, Discord, & P2P Compute
   - 7.3 Wave 3: Creative Suite, Video NLE, Sprite Editor, & Interop
8. [Verification, Quality Assurance, & Diagnostic Checks](#8-verification-quality-assurance--diagnostic-checks)

---

# 1. EXECUTIVE ARCHITECTURAL VISION

## 1.1 The Convergence: 4weird + CryptArtistStudio + GiveGigs

**4weird** is an innovative platform marrying 35 browser-based games with cloud computing (RunPod GPU, DigitalOcean, Blender rendering, fal.ai studio), Vibe Coins, Clans, Squads, and automated game testing via VibeCodeWorker.

However, two sister ecosystems created by MattyJacks LLC contain monumental capabilities that 4weird currently lacks:
1. **CryptArtistStudio**: An open, professional-grade desktop creative suite boasting 16 programs, including a multi-track NLE video editor (Media Mogul), a GIMP-style raster/sprite editor (DictatePic), an automated headless game testing and visual AI analysis engine (DebugPlay), a P2P compute-sharing network (DonatePersonalSeconds), screen/input recording for AI training (DemoRecorder), a 3D companion room (AliveSpeech / VirtualPet), an interactive terminal CLI (Commander), and an extensible mod/plugin/pipeline architecture.
2. **GiveGigs**: A decentralized global talent collective and AI agent platform featuring rich worker profiles (with dual Cheap/Rush pricing, audio voice samples, and embedded video reels), multi-tier contact gates (Turnstile/Captcha anti-scraping), an AI-to-human task escrow system, an official Model Context Protocol (`@givegigs/mcp`) package, a full Discord bot with slash commands, a visual sprint Kanban board, a 30-day trash lifecycle for invoices, free organic utility tools, and real-time push notifications.

By integrating these features into 4weird’s Next.js + Supabase architecture (`v2/vcw4w`), 4weird transforms into a self-sustaining **Super-App for Gaming, Creation, Compute, and Creative Commerce**.

```
+---------------------------------------------------------------------------------------+
|                                    4WEIRD PLATFORM                                    |
+---------------------------------------------------------------------------------------+
|  GAMING & ENTERTAINMENT   |   CREATIVE STUDIO (CAS)   |   TALENT & COMMERCE (GG)     |
|  - 35 Browser Games       |   - Media Mogul Video NLE |   - Creator Talent Directory |
|  - GraveGain 1D/2D/3D     |   - DictatePic Canvas     |   - Audio/Video Showcases    |
|  - Clans & Raid Leagues   |   - DemoRecorder + Inputs |   - Multi-Tier Contact Gates |
|  - Gaming Buddy (Voice)   |   - 3D Pet Room & Alive   |   - Task/Bounty Escrow (75/25)|
|  - NewGamePlus AI Games   |   - Commander Terminal CLI|   - Squad Kanban Sprints     |
|  - Luck Factory Seeds     |   - Monaco Diagnostic IDE |   - Timer -> Invoice Flow    |
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
   `100 🪙 = exactly $1.00 USD`. Never deviate. All bounties, compute donations, creator rates, and subscriptions calculate through this base multiplier.
2. **The 75/25 Monetization Split:**
   Every payment, bounty completion, or tip on the site splits automatically: **75%** to the creator/worker as on-site credits (for games, cloud compute, and AI services; non-withdrawable), and **25%** retained by the platform to pay for cloud infrastructure. Routing around metering or the platform fee violates terms.
3. **Fail-Open Safety:**
   External AI, Turnstile, or auxiliary services failing must never brick user navigation. If an AI service is unreachable, fall back to heuristic patterns or graceful error states.
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
│   ├── creators/            # GiveGigs Talent Directory
│   ├── bounties/            # AI & Clan Bounty Escrow Board
│   ├── squads/[id]/kanban/  # Squad Kanban Board
│   ├── compute/dps/         # DonatePersonalSeconds P2P Compute
│   ├── terminal/            # Commander CLI
│   ├── luck/                # Luck Factory Intention Engine
│   ├── pet/                 # 3D Pet Room & AliveSpeech
│   ├── chat/                # Direct 1-on-1 Realtime Messaging
│   ├── tools/               # Free Utilities (SEO, Image, Counter, Writing)
│   └── api/                 # REST & Server Actions
├── components/
│   ├── studio/              # Video & Image Studio UI components
│   ├── creator/             # Creator profiles, audio/video players
│   ├── bounty/              # Escrow cards, application review dialogs
│   ├── kanban/              # Drag-and-drop boards and cycle planners
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
    ├── mcp/                 # @4weird/mcp package
    └── discord/             # 4weird community Discord bot
```

---

# 2. MASTER DATABASE ARCHITECTURE & MIGRATIONS

Run this complete SQL migration against the Supabase database to establish all tables, relations, triggers, and Row Level Security (RLS) policies needed for the remastery.

```sql
-- ============================================================================
-- 4WEIRD MASTER REMASTERY SQL SCHEMA MIGRATION
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. CREATORS & TALENT DIRECTORY (From GiveGigs)
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  tagline VARCHAR(120),
  bio TEXT,
  avatar_url TEXT,
  country_code VARCHAR(2),
  agency_status VARCHAR(20) DEFAULT 'independent', -- 'independent', 'agency', 'both'
  cheap_rate_coins INTEGER NOT NULL DEFAULT 1500, -- 1500 coins = $15.00/hr
  rush_rate_coins INTEGER NOT NULL DEFAULT 3000,  -- 3000 coins = $30.00/hr
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'under_review'
  moderation_notes TEXT,
  skills TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  project_url TEXT,
  completed_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_audio_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds NUMERIC(6, 2),
  category VARCHAR(50) DEFAULT 'voiceover', -- 'voiceover', 'music', 'sfx'
  peaks JSONB DEFAULT '[]', -- Precomputed 64-point audio peaks for waveform rendering
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_video_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  platform VARCHAR(30) DEFAULT 'youtube', -- 'youtube', 'vimeo', 'drive'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  contact_type VARCHAR(30) NOT NULL, -- 'discord', 'telegram', 'email', 'whatsapp', 'x', 'website'
  contact_value TEXT NOT NULL,
  privacy_tier VARCHAR(30) DEFAULT 'button', -- 'public', 'button', 'turnstile', 'captcha', 'auth_turnstile'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BOUNTY & TASK ESCROW SYSTEM (From GiveGigs)
CREATE TABLE IF NOT EXISTS public.bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  squad_id UUID,
  clan_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_coins INTEGER NOT NULL CHECK (budget_coins >= 100),
  platform_cut_coins INTEGER NOT NULL, -- 25% site fee
  worker_payout_coins INTEGER NOT NULL, -- 75% worker payout
  status VARCHAR(30) DEFAULT 'open', -- 'open', 'assigned', 'submitted', 'completed', 'cancelled', 'disputed'
  selected_applicant_id UUID,
  deadline TIMESTAMPTZ,
  escrow_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bounty_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID REFERENCES public.bounties(id) ON DELETE CASCADE,
  applicant_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bid_rate_type VARCHAR(20) DEFAULT 'cheap', -- 'cheap', 'rush'
  bid_coins INTEGER NOT NULL,
  pitch_message TEXT,
  estimated_days INTEGER DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bounty_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID REFERENCES public.bounties(id) ON DELETE CASCADE,
  worker_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_notes TEXT NOT NULL,
  asset_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SQUAD KANBAN & SPRINT SYSTEM (From GiveGigs)
CREATE TABLE IF NOT EXISTS public.kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- 4. P2P COMPUTE DONATE PERSONAL SECONDS (From CryptArtistStudio)
CREATE TABLE IF NOT EXISTS public.dps_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  peer_id TEXT UNIQUE NOT NULL,
  cpu_cores INTEGER NOT NULL,
  ram_gb NUMERIC(5, 2) NOT NULL,
  gpu_renderer TEXT,
  max_cpu_percent INTEGER DEFAULT 80,
  max_ram_percent INTEGER DEFAULT 50,
  max_gpu_percent INTEGER DEFAULT 90,
  status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'computing', 'offline'
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  total_seconds_donated BIGINT DEFAULT 0,
  coins_earned BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dps_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_node_id UUID REFERENCES public.dps_nodes(id) ON DELETE SET NULL,
  task_type VARCHAR(50) NOT NULL, -- 'vcw_test', 'blender_render', 'sprite_process'
  payload_json JSONB NOT NULL,
  result_json JSONB,
  coins_reward INTEGER DEFAULT 10,
  status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 5. NOTIFICATION HUB & CHAT THREADS (From GiveGigs)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL, -- 'bounty', 'game', 'chat', 'system', 'compute'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
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
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_audio_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_video_embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounty_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounty_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dps_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dps_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_mods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_themes ENABLE ROW LEVEL SECURITY;

-- Creators RLS
CREATE POLICY "creators_read_active" ON public.creators FOR SELECT USING (status = 'active');
CREATE POLICY "creators_manage_own" ON public.creators FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "creator_portfolios_read" ON public.creator_portfolios FOR SELECT USING (true);
CREATE POLICY "creator_portfolios_write" ON public.creator_portfolios FOR ALL USING (
  EXISTS (SELECT 1 FROM public.creators WHERE id = creator_portfolios.creator_id AND user_id = auth.uid())
);

CREATE POLICY "creator_audio_read" ON public.creator_audio_samples FOR SELECT USING (true);
CREATE POLICY "creator_audio_write" ON public.creator_audio_samples FOR ALL USING (
  EXISTS (SELECT 1 FROM public.creators WHERE id = creator_audio_samples.creator_id AND user_id = auth.uid())
);

CREATE POLICY "creator_video_read" ON public.creator_video_embeds FOR SELECT USING (true);
CREATE POLICY "creator_video_write" ON public.creator_video_embeds FOR ALL USING (
  EXISTS (SELECT 1 FROM public.creators WHERE id = creator_video_embeds.creator_id AND user_id = auth.uid())
);

-- Bounties RLS
CREATE POLICY "bounties_public_read" ON public.bounties FOR SELECT USING (true);
CREATE POLICY "bounties_manage_own" ON public.bounties FOR ALL USING (auth.uid() = creator_user_id);

CREATE POLICY "applications_read" ON public.bounty_applications FOR SELECT USING (
  auth.uid() = applicant_user_id OR EXISTS (SELECT 1 FROM public.bounties WHERE id = bounty_applications.bounty_id AND creator_user_id = auth.uid())
);
CREATE POLICY "applications_insert" ON public.bounty_applications FOR INSERT WITH CHECK (auth.uid() = applicant_user_id);

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
CREATE INDEX IF NOT EXISTS idx_creators_skills ON public.creators USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_creators_rates ON public.creators (cheap_rate_coins, rush_rate_coins);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON public.bounties (status, budget_coins);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_pos ON public.kanban_cards (column_id, position);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_time ON public.chat_messages (thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_dps_nodes_active ON public.dps_nodes (status, last_heartbeat DESC);
```
'''
