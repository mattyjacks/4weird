# 🌌 4WEIRD MASTER REMASTERY: THE DEFINITIVE IMPLEMENTATION GUIDE
### Unified Architecture & Engineering Blueprint: Integrating CryptArtist Studio & GiveGigs into 4weird

**Location**: `public/swarm/remastery/README.md`  
**Target Repository**: `c:\GitHub5\4weird` (`v2/vcw4w` & `v2/desktop`)  
**Source Repositories**: `c:\GitHub5\CryptArtistStudio` & `c:\GitHub5\GiveGigs`  
**Ecosystem**: Next.js 15 (App Router), React 19, Supabase (PostgreSQL), Tailwind CSS, Three.js, Tauri v2, Godot 4.6.1, MCP Protocol  
**Monetization Engine**: Vibe Coins (100 coins = $1.00; 25% platform cut / 75% creator or provider credit)  

---

## 📑 TABLE OF CONTENTS

1. [Executive Mission & Ecosystem Synthesis](#1-executive-mission--ecosystem-synthesis)
2. [Global Architecture & Directory Tree](#2-global-architecture--directory-tree)
3. [Database Schema & Rerunnable Supabase Migrations](#3-database-schema--rerunnable-supabase-migrations)
4. [Creative Suite & NLE Media Studio (Media Mogul)](#4-creative-suite--nle-media-studio-media-mogul)
5. [Screen Recorder, Streamer & AI Input Logger (DemoRecorder)](#5-screen-recorder-streamer--ai-input-logger-demorecorder)
6. [GIMP-Style AI Raster Image Studio (DictatePic)](#6-gimp-style-ai-raster-image-studio-dictatepic)
7. [Podcast & Audio Mastering Lab (ElevenLabs Engine)](#7-podcast--audio-mastering-lab-elevenlabs-engine)
8. [Godot 4.6.1 Engine & 100 Codebase Improvements (GameStudio)](#8-godot-461-engine--100-codebase-improvements-gamestudio)
9. [Clean-Room Video Game Cloner (Mechanics Extraction Engine)](#9-clean-room-video-game-cloner-mechanics-extraction-engine)
10. [Autonomous Game Testing & Checkpoints (Debug Play)](#10-autonomous-game-testing--checkpoints-debug-play)
11. [Terminal Command Center & REST Explorer (CryptArt Commander)](#11-terminal-command-center--rest-explorer-cryptart-commander)
12. [P2P Compute Resource Sharing Network (DonatePersonalSeconds)](#12-p2p-compute-resource-sharing-network-donatepersonalseconds)
13. [Intention Hashing & AI Seed Anchoring (Luck Factory)](#13-intention-hashing--ai-seed-anchoring-luck-factory)
14. [Visual Desktop & Mobile Installer Builder (Clone Tool)](#14-visual-desktop--mobile-installer-builder-clone-tool)
15. [Autonomous System Agent & Skills Marketplace (ValleyNet)](#15-autonomous-system-agent--skills-marketplace-valleynet)
16. [Interactive 3D Virtual Pet & Room Companion](#16-interactive-3d-virtual-pet--room-companion)
17. [Tax Info Bot & Fiscal Compliance Suite](#17-tax-info-bot--fiscal-compliance-suite)
18. [Cross-Tool Interoperability Event Bus & Multi-Workspace Bar](#18-cross-tool-interoperability-event-bus--multi-workspace-bar)
19. [Chromebook & Low-Power Hardware Optimization Suite](#19-chromebook--low-power-hardware-optimization-suite)
20. [Talent Marketplace & Freelance Directory (GiveGigs Worker Engine)](#20-talent-marketplace--freelance-directory-givegigs-worker-engine)
21. [Production Time Tracker & Billing Engine (Ghost Timer Overhaul)](#21-production-time-tracker--billing-engine-ghost-timer-overhaul)
22. [Invoice Generator with Vector PDF & 30-Day Trash](#22-invoice-generator-with-vector-pdf--30-day-trash)
23. [Kanban Project Manager with Sprints & Cycles (@dnd-kit)](#23-kanban-project-manager-with-sprints--cycles-dnd-kit)
24. [Free Web Productivity Tools Suite (/tools)](#24-free-web-productivity-tools-suite-tools)
25. [AI-to-Human Real-World Task Marketplace](#25-ai-to-human-real-world-task-marketplace)
26. [Automated AI Sentiment, Ethics & Legality Screening](#26-automated-ai-sentiment-ethics--legality-screening)
27. [Client Profiles & Programmatic Agent Registration API](#27-client-profiles--programmatic-agent-registration-api)
28. [Official Model Context Protocol (MCP) Server (@4weird/mcp)](#28-official-model-context-protocol-mcp-server-4weirdmcp)
29. [Official Discord Bot Integration](#29-official-discord-bot-integration)
30. [Multi-Party Task Chat Threads with AI Awareness](#30-multi-party-task-chat-threads-with-ai-awareness)
31. [Multi-Channel Notification Engine (Bell & Email Alerts)](#31-multi-channel-notification-engine-bell--email-alerts)
32. [Governance & Moderation Control Room (/mod)](#32-governance--moderation-control-room-mod)
33. [Automated Verification Test Suite (scripts/verify-*.mjs)](#33-automated-verification-test-suite-scriptsverify-mjs)
34. [Master Coding Rules, Design Patterns & Gotchas](#34-master-coding-rules-design-patterns--gotchas)

---

# 1. EXECUTIVE MISSION & ECOSYSTEM SYNTHESIS

### 1.1 The Vision
**4weird** is currently an indie gaming arcade, social clan hub, and cloud computing rental platform.  
**CryptArtist Studio** is an open-source, 11-in-1 desktop creative suite encompassing video editing (Media Mogul), Godot game development (GameStudio), raster editing (DictatePic), screen recording (DemoRecorder), autonomous desktop agents (ValleyNet), terminal command systems (CryptArt Commander), and P2P compute sharing (DonatePersonalSeconds).  
**GiveGigs** is a zero-fee global work collective, an AI-to-human real-world task marketplace, and a full suite of freelance productivity tools (Time Tracker, Invoices, Kanban Tasks, Free Web Utilities).

The **Master Remastery** integrates the best capabilities of CryptArtist Studio and GiveGigs into 4weird, transforming it into the ultimate unified digital platform:
1. **Play**: 35+ arcade games with deterministic luck anchoring, speedrun recording, and Gaming Buddy coaching.
2. **Create**: Browser-based multi-track video editing, AI raster image editing, Godot 4.6.1 IDE, clean-room video game cloning, and podcast mastering.
3. **Build & Test**: Autonomous game QA via Debug Play (game state extraction, interactive control takeover, breakpoints, code patch generation).
4. **Work & Earn**: Real-world AI-to-human task marketplace, talent directory with dual cheap/rush rates, professional time tracking, invoice generation with PDF export, and Kanban sprint boards.
5. **Ecosystem & Interop**: Programmatic agent registration, native `@4weird/mcp` server for Claude/Cursor, Discord bots, and WebRTC P2P compute sharing.

### 1.2 The Economic Golden Rule: Vibe Coins
Every commercial feature added in this Remastery respects 4weird's core financial contract:
- **100 Vibe Coins = $1.00 USD**, always and everywhere.
- **25% Platform Cut**: All paid compute, rendering, agent rentals, and marketplace transactions automatically retain 25% for the platform and disburse 75% to the provider or creator as on-site credit.
- **Zero Cash-Out**: Credits are strictly for on-site services (cloud compute, game rentals, game assets, agent time, tips).
- **Free Baseline**: Core utilities (time tracking, invoice creation, free tools, charity tasks, basic games) remain 100% free with 0% fee barriers.

---

# 2. GLOBAL ARCHITECTURE & DIRECTORY TREE

The Remastery organizes all new and expanded capabilities into `v2/vcw4w` (the Next.js web application) and `v2/desktop` (the Tauri desktop hybrid).

```
4weird/
├── v2/
│   ├── desktop/
│   │   └── code/
│   │       ├── src/
│   │       │   ├── godot/               # Godot 4.6.1 IPC & process manager
│   │       │   ├── recording/           # Desktop native FFmpeg screen recorder
│   │       │   └── p2p/                 # Native WebRTC compute node
│   │       └── src-tauri/               # Tauri v2 Rust backend
│   │
│   └── vcw4w/                           # Main Next.js 15 Web Application
│       ├── app/
│       │   ├── studio/                  # Creative Media Suite
│       │   │   ├── video/               # Media Mogul NLE Video Editor
│       │   │   ├── paint/               # DictatePic GIMP-Style Raster Editor
│       │   │   ├── audio/               # Podcast & ElevenLabs Audio Lab
│       │   │   ├── recorder/            # Web Screen Recorder & AI Input Logger
│       │   │   └── builder/             # Clone Tool visual installer generator
│       │   │
│       │   ├── gamestudio/              # Godot & Game Creation Hub
│       │   │   ├── page.tsx             # GameStudio 3-panel workspace
│       │   │   ├── cloner/              # Video Game Cloner (Wikipedia to Emoji/3D)
│       │   │   └── debugplay/           # Debug Play Autonomous Testing UI
│       │   │
│       │   ├── commander/               # CryptArt Commander (CAC) terminal
│       │   ├── compute/
│       │   │   └── p2p/                 # DonatePersonalSeconds P2P sharing
│       │   ├── luck/                    # Luck Factory intention & seed engine
│       │   ├── pet/                     # 3D Virtual Pet interactive room
│       │   ├── business/
│       │   │   ├── tax/                 # Tax Info Bot & fiscal receipt verifier
│       │   │   ├── invoices/            # Full Invoice Generator with PDF & Trash
│       │   │   └── crm/                 # Business CRM pipeline
│       │   │
│       │   ├── timer/                   # Overhauled Time Tracker (projects/billing)
│       │   ├── squads/[slug]/
│       │   │   └── board/               # Kanban Task Manager with Sprints (@dnd-kit)
│       │   ├── tools/                   # Free Web Utilities (SEO, Writing, Image, Counter)
│       │   ├── talents/                 # Worker Marketplace & Talent Directory
│       │   │   ├── [workerId]/          # Worker profile, audio player, videos
│       │   │   └── create/              # Worker profile authoring & rate configuration
│       │   │
│       │   ├── tasks/                   # AI-to-Human Real-World Task Marketplace
│       │   │   ├── [taskId]/            # Task detail, "Hope", map, voting, comments
│       │   │   └── create/              # Agent task posting wizard
│       │   │
│       │   ├── chat/                    # Multi-Party Task & Direct Messaging
│       │   ├── mod/                     # Governance & Moderation Control Room
│       │   └── api/
│       │       ├── studio/              # Video export, audio synthesis, MLT parse
│       │       ├── debugplay/           # Headless game runner & screenshot OCR
│       │       ├── cloner/              # Mechanics research & game scaffolding
│       │       ├── p2p/                 # WebRTC signaling & peer matching
│       │       ├── talents/             # Worker CRUD & Turnstile contact reveal
│       │       ├── tasks/               # AI tasks, voting, applications, comments
│       │       ├── invoice/             # Invoices, clients, trash restoration
│       │       ├── timer/               # Time entries, project budgets, reports
│       │       ├── notifications/       # User notification stream & preferences
│       │       └── ai/
│       │           ├── register/        # Programmatic agent registration
│       │           └── screen/          # Automated task ethics/legality screener
│       │
│       ├── components/
│       │   ├── studio/                  # NLE timeline, waveforms, canvas layers
│       │   ├── debugplay/               # Viewport, AI chat, breakpoint controllers
│       │   ├── invoice/                 # Invoice form, line items, TrashList
│       │   ├── tasks/                   # Task cards, hope badge, voting widget
│       │   ├── talents/                 # Portfolio cards, audio player, contact modal
│       │   └── ui/                      # WorkspaceBar, NotificationBell, TerminalView
│       │
│       ├── lib/
│       │   ├── interop.ts               # Global cross-tool pub/sub Event Bus
│       │   ├── mltBridge.ts             # Shotcut MLT XML bidirectional parser
│       │   ├── collabPack.ts            # Lightweight collaboration zip archive engine
│       │   ├── srtBridge.ts             # SubRip subtitle parser & exporter
│       │   ├── notification-service.ts  # In-memory rate-limited notification engine
│       │   └── debugPlayService.ts      # Godot headless & game state manager
│       │
│       └── supabase/migrations/         # Rerunnable SQL migrations
│
├── programs/
│   ├── mcp/                             # @4weird/mcp Model Context Protocol Server
│   └── discord/                         # 4weird Community & Task Discord Bot
```

---

# 3. DATABASE SCHEMA & RERUNNABLE SUPABASE MIGRATIONS

All database additions must follow 4weird’s **idempotent, rerunnable SQL standard**:
- Always check `IF NOT EXISTS` for tables, columns, indexes, and extensions.
- Always check `DROP POLICY IF EXISTS` or `CREATE OR REPLACE FUNCTION`.
- Run migrations safely in transaction blocks.

Create the master migration file:  
`v2/vcw4w/supabase/migrations/20261201000000_remastery_suite.sql`

```sql
-- =============================================================================
-- 4WEIRD MASTER REMASTERY COMPREHENSIVE SCHEMA MIGRATION
-- Incorporating CryptArtist Studio & GiveGigs Capabilities into 4weird
-- =============================================================================

BEGIN;

-- Enable UUID and Cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TALENT MARKETPLACE & WORKER DIRECTORY (GiveGigs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friendly_name TEXT NOT NULL,
    full_name TEXT,
    job_title TEXT NOT NULL,
    tagline VARCHAR(120),
    introduction TEXT,
    country VARCHAR(100),
    gender VARCHAR(50),
    agency_status VARCHAR(50) DEFAULT 'independent' CHECK (agency_status IN ('independent', 'agency_owned', 'both')),
    cheap_rate NUMERIC(10, 2) DEFAULT 0.00,
    rush_rate NUMERIC(10, 2) DEFAULT 0.00,
    rate_currency VARCHAR(10) DEFAULT 'USD',
    keywords TEXT, -- Space or comma separated skill keywords
    avatar_url TEXT,
    moderation_status VARCHAR(50) DEFAULT 'active' CHECK (moderation_status IN ('active', 'paused', 'under_review', 'rejected')),
    moderator_notes TEXT,
    review_request_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_profiles_user_id ON public.worker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_status ON public.worker_profiles(moderation_status);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_country ON public.worker_profiles(country);

-- Worker Portfolios
CREATE TABLE IF NOT EXISTS public.worker_portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    project_url TEXT,
    completion_date DATE,
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Audio Samples (Musicians, Voice Actors, Sound FX)
CREATE TABLE IF NOT EXISTS public.worker_audio_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    audio_url TEXT NOT NULL,
    duration_seconds NUMERIC(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Contact Blocks (with tiered privacy protection)
CREATE TABLE IF NOT EXISTS public.worker_contact_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
    contact_type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'whatsapp', 'discord', 'telegram', etc.
    contact_value TEXT NOT NULL,
    access_tier VARCHAR(50) DEFAULT 'turnstile' CHECK (access_tier IN ('public', 'button', 'turnstile', 'captcha', 'login_required')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Profile Sharing (collaborative profile editing)
CREATE TABLE IF NOT EXISTS public.worker_collaborators (
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'editor' CHECK (role IN ('editor', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (worker_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 2. AI-TO-HUMAN REAL-WORLD TASK MARKETPLACE (GiveGigs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_profile_id UUID,
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    hope TEXT NOT NULL, -- Why this task benefits humanity / the world
    skills_needed TEXT[] DEFAULT '{}',
    is_remote BOOLEAN DEFAULT TRUE,
    location_name VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    radius_meters INTEGER,
    funding_type VARCHAR(50) DEFAULT 'charity' CHECK (funding_type IN ('charity', 'funded_vibe_coins', 'unfunded')),
    bounty_coins BIGINT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'expired')),
    urgency VARCHAR(50) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'urgent', 'critical')),
    metadata JSONB DEFAULT '{}'::jsonb,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    ethics_score INTEGER DEFAULT 100, -- Computed by GPT-5 Mini screener
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON public.ai_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_funding ON public.ai_tasks(funding_type);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_featured ON public.ai_tasks(is_featured);

-- Task Applications (Human Volunteers / Workers applying for tasks)
CREATE TABLE IF NOT EXISTS public.task_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (task_id, applicant_id)
);

-- Task Community Voting
CREATE TABLE IF NOT EXISTS public.task_votes (
    task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type SMALLINT CHECK (vote_type IN (1, -1)), -- 1 = upvote, -1 = downvote
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id)
);

-- Task Comments (Threaded with Human-Priority ranking)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_ai_author BOOLEAN DEFAULT FALSE,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. FREELANCER TIME TRACKER & BILLING ENGINE (GiveGigs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID,
    name VARCHAR(200) NOT NULL,
    color_hex VARCHAR(20) DEFAULT '#3b82f6',
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
    budget_hours NUMERIC(10, 2),
    is_billable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.time_projects(id) ON DELETE SET NULL,
    task_card_id UUID, -- Optional link to Kanban Card
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    is_billable BOOLEAN DEFAULT TRUE,
    is_invoiced BOOLEAN DEFAULT FALSE,
    invoice_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON public.time_entries(project_id);

-- -----------------------------------------------------------------------------
-- 4. INVOICE GENERATOR & 30-DAY TRASH SYSTEM (GiveGigs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    vat_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    deleted_at TIMESTAMPTZ, -- Soft delete trash attribute (auto-purge after 30 days)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_deleted ON public.invoices(user_id, deleted_at);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    position INTEGER DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- 5. KANBAN TASK MANAGER WITH SPRINTS & CYCLES (GiveGigs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kanban_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID, -- Linked to 4weird Squads
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanban_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanban_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.kanban_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_id UUID NOT NULL REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES public.kanban_cycles(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    labels TEXT[] DEFAULT '{}',
    due_date DATE,
    estimated_hours NUMERIC(6, 2),
    position INTEGER NOT NULL DEFAULT 0,
    assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. DEBUG PLAY & GAME STATE PERSISTENCE (CryptArtist Studio)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debug_play_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_slug VARCHAR(100) NOT NULL,
    control_mode VARCHAR(50) DEFAULT 'ai' CHECK (control_mode IN ('ai', 'user', 'hybrid')),
    test_duration_seconds INTEGER DEFAULT 0,
    total_inputs_sent INTEGER DEFAULT 0,
    bugs_detected_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debug_play_saved_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.debug_play_sessions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_slug VARCHAR(100) NOT NULL,
    state_name VARCHAR(200) NOT NULL,
    description TEXT,
    game_state_data JSONB NOT NULL, -- Player pos, health, velocity, enemies, collectibles
    screenshot_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debug_play_bugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.debug_play_sessions(id) ON DELETE CASCADE,
    bug_title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    suggested_fix TEXT,
    file_path TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. CHAT & NOTIFICATION SYSTEM (GiveGigs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_type VARCHAR(50) DEFAULT 'direct' CHECK (thread_type IN ('direct', 'task')),
    task_id UUID REFERENCES public.ai_tasks(id) ON DELETE SET NULL,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'hired', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_ai BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_ai BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'new_message', 'task_application', 'invoice_paid', etc.
    title VARCHAR(255) NOT NULL,
    preview VARCHAR(255),
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    enable_push BOOLEAN DEFAULT TRUE,
    enable_email BOOLEAN DEFAULT TRUE,
    muted_thread_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. P2P COMPUTE, LUCK FACTORY, AND VIRTUAL PET (CryptArtist Studio)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.p2p_compute_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    peer_token VARCHAR(64) NOT NULL UNIQUE,
    cpu_cores INTEGER,
    ram_gb NUMERIC(6, 2),
    gpu_renderer TEXT,
    cpu_limit_percent INTEGER DEFAULT 80,
    ram_limit_percent INTEGER DEFAULT 50,
    gpu_limit_percent INTEGER DEFAULT 90,
    status VARCHAR(50) DEFAULT 'online' CHECK (status IN ('online', 'busy', 'offline')),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    total_seconds_donated BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.luck_anchors (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    intention_string TEXT NOT NULL,
    base_score INTEGER NOT NULL,
    preset_tier INTEGER NOT NULL CHECK (preset_tier IN (69, 420, 777)),
    final_seed BIGINT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.virtual_pets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_name VARCHAR(100) NOT NULL DEFAULT 'GraveBuddy',
    species VARCHAR(50) DEFAULT 'goblin',
    level INTEGER DEFAULT 1,
    hunger INTEGER DEFAULT 50 CHECK (hunger BETWEEN 0 AND 100),
    happiness INTEGER DEFAULT 80 CHECK (happiness BETWEEN 0 AND 100),
    energy INTEGER DEFAULT 100 CHECK (energy BETWEEN 0 AND 100),
    inventory JSONB DEFAULT '[]'::jsonb,
    room_decorations JSONB DEFAULT '[]'::jsonb,
    last_interaction TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
```

---

# 4. CREATIVE SUITE & NLE MEDIA STUDIO (MEDIA MOGUL)

### 4.1 Architecture & Component Hierarchy
Media Mogul brings professional multi-track non-linear video editing to 4weird directly inside the browser. It lives at `v2/vcw4w/app/studio/video/page.tsx` and operates with zero hardcoded frame limits.

```
components/studio/video/
├── NLEStudio.tsx               # Main state coordinator
├── TimelineHeader.tsx          # Transport, timecode, snapping toggle, zoom slider
├── TimelineTracks.tsx          # Multi-track lane container (V1, V2, V3, A1, A2, A3)
├── TimelineTrackLane.tsx       # Individual track renderer
├── TimelineClipItem.tsx        # Drag-and-drop clip item with trim handles
├── TimelinePlayhead.tsx        # Interactive scrubbing cursor
├── AudioWaveformCanvas.tsx     # High-density audio waveform renderer
├── PreviewMonitor.tsx          # HTML5 Video / Canvas player with Safe Zones
├── SafeZonesOverlay.tsx        # 16:9 and 9:16 Action/Title guides
└── ActorCriticPanel.tsx        # AI video critique scorecard & -14 LUFS polisher
```

### 4.2 Data Models (`v2/vcw4w/lib/studio/types.ts`)
```typescript
export interface TimelineClip {
  id: string;
  trackId: string;
  name: string;
  sourceUrl: string;
  type: "video" | "audio" | "image" | "text";
  startFrame: number;
  endFrame: number;
  inCutFrame: number;
  outCutFrame: number;
  colorHex?: string;
  volume: number; // 0.0 to 2.0 (1.0 = 0dB)
  pan: number;    // -1.0 to 1.0
  speed: number;  // 0.25 to 4.0
  filters?: ClipFilter[];
}

export interface TimelineTrack {
  id: string;
  type: "video" | "audio";
  index: number;
  label: string;
  muted: boolean;
  locked: boolean;
  solo?: boolean;
  clips: TimelineClip[];
}

export interface ProjectSettings {
  name: string;
  fps: number; // 24, 30, 60
  width: number; // 1920, 1080, 3840
  height: number; // 1080, 1920, 2160
  inPoint?: number;
  outPoint?: number;
}
```

### 4.3 Shotcut MLT XML Bidirectional Bridge (`v2/vcw4w/lib/mltBridge.ts`)
Media Mogul guarantees full interoperability with desktop Shotcut by parsing and serializing MLT XML files.

```typescript
/**
 * Serializes timeline tracks and project settings into standards-compliant Shotcut MLT XML.
 */
export function exportTimelineToMlt(tracks: TimelineTrack[], settings: ProjectSettings): string {
  const { width, height, fps, name } = settings;
  
  let xml = `<?xml version="1.0" standalone="no"?>\n`;
  xml += `<mlt LC_NUMERIC="C" version="7.13.0" title="${name}" producer="main_bin">\n`;
  xml += `  <profile description="Custom" width="${width}" height="${height}" progressive="1" sample_aspect_num="1" sample_aspect_den="1" display_aspect_num="${width}" display_aspect_den="${height}" frame_rate_num="${fps}" frame_rate_den="1"/>\n`;

  // Producers (assets)
  const allClips = tracks.flatMap((t) => t.clips);
  allClips.forEach((clip, index) => {
    xml += `  <producer id="producer_${clip.id}" in="0" out="${clip.outCutFrame - clip.inCutFrame}">\n`;
    xml += `    <property name="resource">${clip.sourceUrl}</property>\n`;
    xml += `    <property name="mlt_service">avformat</property>\n`;
    xml += `    <filter id="volume_${clip.id}">\n`;
    xml += `      <property name="gain">${clip.volume}</property>\n`;
    xml += `      <property name="mlt_service">volume</property>\n`;
    xml += `    </filter>\n`;
    xml += `  </producer>\n`;
  });

  // Playlists (Tracks)
  tracks.forEach((track) => {
    xml += `  <playlist id="playlist_${track.id}">\n`;
    let currentFrame = 0;
    const sortedClips = [...track.clips].sort((a, b) => a.startFrame - b.startFrame);
    
    sortedClips.forEach((clip) => {
      if (clip.startFrame > currentFrame) {
        xml += `    <blank length="${clip.startFrame - currentFrame}"/>\n`;
      }
      xml += `    <entry producer="producer_${clip.id}" in="${clip.inCutFrame}" out="${clip.outCutFrame}"/>\n`;
      currentFrame = clip.endFrame;
    });
    xml += `  </playlist>\n`;
  });

  // Master Tractor
  xml += `  <tractor id="tractor1" title="Master" in="0" out="99999">\n`;
  tracks.forEach((track) => {
    xml += `    <track producer="playlist_${track.id}"/>\n`;
  });
  xml += `  </tractor>\n`;
  xml += `</mlt>`;

  return xml;
}
```

### 4.4 Lightweight Collaboration Pack Exporter (`v2/vcw4w/lib/collabPack.ts`)
Creates a self-contained collaboration archive under 500 KB using `fflate` for client-side compression:
```typescript
import { zipSync, strToU8 } from "fflate";

export function generateCollabPack(
  tracks: TimelineTrack[],
  settings: ProjectSettings,
  subtitlesSrt: string,
  historyLog: string[]
): Uint8Array {
  const mltContent = exportTimelineToMlt(tracks, settings);
  
  const manifest = {
    project: settings.name,
    exportedAt: new Date().toISOString(),
    fps: settings.fps,
    tracksCount: tracks.length,
    clipsCount: tracks.flatMap((t) => t.clips).length,
    assets: tracks.flatMap((t) => t.clips.map((c) => ({ id: c.id, name: c.name, url: c.sourceUrl }))),
  };

  const readme = `4WEIRD COLLABORATION PACK
=========================
Project: ${settings.name}
To load in Shotcut:
1. Open project.mlt in Shotcut
2. Relink missing media files from media_manifest.json
3. Import subtitles.srt on the subtitle track
`;

  const files: Record<string, Uint8Array> = {
    "project.mlt": strToU8(mltContent),
    "subtitles.srt": strToU8(subtitlesSrt),
    "media_manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    "session_action_history.json": strToU8(JSON.stringify(historyLog, null, 2)),
    "README_COLLABORATION.txt": strToU8(readme),
  };

  return zipSync(files);
}
```

---

# 5. SCREEN RECORDER, STREAMER & AI INPUT LOGGER (DEMORECORDER)

### 5.1 System Purpose
DemoRecorder (`v2/vcw4w/app/studio/recorder/page.tsx`) provides screen, window, and microphone capture. More importantly, it features an **AI Input Training Logger** that records synchronized user input traces (clicks, keys, mouse paths) alongside game video frames to build behavioral datasets for 4weird's VibeCodeWorker and Gaming Buddy AI bots.

### 5.2 Input Logger Engine (`v2/vcw4w/lib/studio/inputLogger.ts`)
```typescript
export interface InputLogEvent {
  timestampMs: number;
  frameIndex: number;
  type: "mousemove" | "mousedown" | "mouseup" | "keydown" | "keyup";
  x?: number;
  y?: number;
  normalizedX?: number; // 0.0 to 1.0 (screen agnostic)
  normalizedY?: number;
  key?: string;
  button?: number;
}

export class InputLogger {
  private events: InputLogEvent[] = [];
  private isRecording = false;
  private startTime = 0;
  private targetFps = 60;

  public start(fps = 60) {
    this.events = [];
    this.targetFps = fps;
    this.startTime = performance.now();
    this.isRecording = true;
    this.bindListeners();
  }

  public stop(): InputLogEvent[] {
    this.isRecording = false;
    this.unbindListeners();
    return this.events;
  }

  private handleEvent(e: MouseEvent | KeyboardEvent) {
    if (!this.isRecording) return;
    const now = performance.now();
    const elapsed = now - this.startTime;
    const frameIndex = Math.floor((elapsed / 1000) * this.targetFps);

    if (e instanceof MouseEvent) {
      this.events.push({
        timestampMs: Math.round(elapsed),
        frameIndex,
        type: e.type as "mousemove" | "mousedown" | "mouseup",
        x: e.clientX,
        y: e.clientY,
        normalizedX: +(e.clientX / window.innerWidth).toFixed(4),
        normalizedY: +(e.clientY / window.innerHeight).toFixed(4),
        button: e.button,
      });
    } else if (e instanceof KeyboardEvent) {
      this.events.push({
        timestampMs: Math.round(elapsed),
        frameIndex,
        type: e.type as "keydown" | "keyup",
        key: e.key,
      });
    }
  }

  private bindListeners() {
    window.addEventListener("mousemove", this.handleEvent.bind(this), { passive: true });
    window.addEventListener("mousedown", this.handleEvent.bind(this), { passive: true });
    window.addEventListener("mouseup", this.handleEvent.bind(this), { passive: true });
    window.addEventListener("keydown", this.handleEvent.bind(this), { passive: true });
    window.addEventListener("keyup", this.handleEvent.bind(this), { passive: true });
  }

  private unbindListeners() {
    window.removeEventListener("mousemove", this.handleEvent.bind(this));
    window.removeEventListener("mousedown", this.handleEvent.bind(this));
    window.removeEventListener("mouseup", this.handleEvent.bind(this));
    window.removeEventListener("keydown", this.handleEvent.bind(this));
    window.removeEventListener("keyup", this.handleEvent.bind(this));
  }
}
```

---

# 6. GIMP-STYLE AI RASTER IMAGE STUDIO (DICTATEPIC)

### 6.1 Tool Architecture & 28-Tool Breakdown
DictatePic (`v2/vcw4w/app/studio/paint/page.tsx`) brings GIMP-style raster drawing, multi-layer compositing, and AI inpainting to 4weird.

| Group | Tools Included | Capability |
| :--- | :--- | :--- |
| **Selection (4)** | Rect, Ellipse, Lasso, Magic Wand | Flood-fill color boundary marching ants |
| **Transform (5)** | Move, Crop, Rotate, Scale, Flip | Matrix transform of active layer selection |
| **Paint (5)** | Brush, Pencil, Eraser, Airbrush, Stamp | Custom textures, pressure sensitivity |
| **Fill (2)** | Bucket Fill, Gradient Fill | Linear & radial multi-stop color ramps |
| **Retouch (6)** | Blur, Sharpen, Smudge, Dodge, Burn, Heal | Kernel convolution and pixel blending |
| **Vector/Aux (2)**| Bezier Path, Color Picker, Ruler | Vector guide layers and precision sampling |
| **AI Studio (4)** | AI Inpaint, AI Outpaint, Remove BG, Upscale | Fal.ai / OpenAI latent diffusion API |

### 6.2 Multi-Layer Blend Modes (`v2/vcw4w/lib/studio/blendModes.ts`)
```typescript
export type BlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion";

export interface PaintLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0.0 to 1.0
  blendMode: BlendMode;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}
```

---

# 7. PODCAST & AUDIO MASTERING LAB (ELEVENLABS ENGINE)

### 7.1 Studio Capabilities
Located at `v2/vcw4w/app/studio/audio/page.tsx`:
1. **Multi-Voice Dialogue Studio**: Assign different ElevenLabs voice profiles to character script lines.
2. **Web Audio Mastering Chain**:
   - High-Pass Filter (cut sub-bass below 80 Hz).
   - 3-Band Parametric Equalizer.
   - Dynamic Peak Limiter / Compressor.
   - EBU R128 Loudness Normalizer (auto-targets standard `-14 LUFS` for web audio).
3. **Timed SRT Subtitle Generation**: Uses Web Speech API or Whisper transcription to output frame-accurate `.srt` files.

---

# 8. GODOT 4.6.1 ENGINE & 100 CODEBASE IMPROVEMENTS (GAMESTUDIO)

### 8.1 Desktop Godot Integration
In `v2/desktop/code/src/godot/godotManager.ts`, manage local Godot 4.6.1 processes via Tauri commands:
- **Detection**: Check system PATH, common AppData/Applications paths, or allow custom user-selected binary path.
- **Verification**: Run `godot --version` and verify major version is 4.x.
- **Godot Not Found Dialog**: Offer 4 actions:
  1. Download Godot 4.6.1 standard release.
  2. Browse local filesystem for executable.
  3. Rescan system environment.
  4. Continue in web-only code editing mode.

### 8.2 The 100 Editor Improvements Matrix
Porting the improvements from CryptArtist Studio into 4weird's Monaco editor:
1. **UI/UX (1–20)**: Persistent dark mode, collapsible responsive layout, custom keybindings (`Ctrl+S`, `Ctrl+Shift+P`), workspace layout presets, breadcrumb symbol trail, find/replace with regex, draggable tab groups, status bar indicators (line/col/encoding/git branch), minimap with syntax coloring, code folding regions, split horizontal/vertical views, zen mode, line number modes (absolute/relative), whitespace markers, and smooth auto-scrolling.
2. **Code Intelligence (21–40)**: GDScript/TypeScript IntelliSense, auto-closing brackets, smart indent on newline, multi-cursor editing (`Alt+Click`), column selection, infinite undo/redo tree, auto-format on save, ESLint/GDScript lint diagnostic scanner, Git gutter diff markers, bookmarks list, breakpoint toggles, and variable watch inspector.

---

# 9. CLEAN-ROOM VIDEO GAME CLONER (MECHANICS EXTRACTION ENGINE)

### 9.1 The Clean-Room Two-Phase Generation Protocol
The Video Game Cloner (`v2/vcw4w/app/gamestudio/cloner/page.tsx`) extracts pure gameplay mechanics from public wikis and generates an original game without infringing on copyrighted names, characters, story, or artwork.

```
+-------------------------------------------------------------+
| Step 1: Input Game Title (e.g., "Tetris", "Breakout")       |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Step 2: Research & Scraping (Wikipedia / Gameplay Wikis)    |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Step 3: LLM Mechanic Extractor (GPT-5 Mini)                 |
| Strips ALL Lore, Characters, Art, Music, Brand Names        |
| Outputs: Physics Vectors, Collision Rules, Score Loop JSON  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Step 4: Phase 1 Generation (Emoji Prototype in 60s)         |
| Player: 🏃 | Enemies: 👾 | Items: ⭐ | Obstacles: 🧱          |
| Immediate playable verification in HTML5 Canvas             |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Step 5: Phase 2 Upgrade (AI 3D / Procedural GLTF)           |
| Replace emojis with Fal.ai / Meshy 3D models & textures     |
+-------------------------------------------------------------+
```

### 9.2 Legal Guardrail Prompt (`v2/vcw4w/lib/cloner/prompt.ts`)
```typescript
export const MECHANIC_EXTRACTION_SYSTEM_PROMPT = `
You are an expert game designer and copyright compliance auditor.
Your job is to analyze a game and extract ONLY its mathematical and structural mechanics.

MANDATORY RULES:
1. DO NOT include any trademarked names, lore, characters, story elements, dialogue, or setting descriptions.
2. DO NOT include any proprietary art styles, character likenesses, or audio melodies.
3. EXTRACT ONLY:
   - Movement dimensions (2D grid, 3D physics, velocity curves)
   - Collision rules and entity interactions
   - Win/Loss criteria and scoring formulas
   - Input controls mapping (Arrow keys, Spacebar, Mouse click)

Output pure JSON matching the GameMechanicsSchema.
`;
```

---

# 10. AUTONOMOUS GAME TESTING & CHECKPOINTS (DEBUG PLAY)

### 10.1 Three Capture Modes Architecture
Debug Play (`v2/vcw4w/app/gamestudio/debugplay/page.tsx`) provides 3 operational modes for testing 4weird arcade and Godot games:

```typescript
export type CaptureMode = "screenshot" | "state_data" | "full_state";

export interface GameStateSnapshot {
  timestamp: number;
  player: {
    x: number;
    y: number;
    z?: number;
    vx: number;
    vy: number;
    health: number;
    maxHealth: number;
    state: "idle" | "running" | "jumping" | "falling" | "attacking";
    inventory: string[];
    score: number;
  };
  enemies: Array<{ id: string; type: string; x: number; y: number; health: number; state: string }>;
  collectibles: Array<{ id: string; x: number; y: number; collected: boolean }>;
  hazards: Array<{ id: string; x: number; y: number; type: string }>;
  metrics: { fps: number; memoryMb: number; cpuPercent: number };
}
```

### 10.2 Interactive Control Switching & Live Chat
The tester can switch on-the-fly:
- **AI Mode**: The autonomous agent sends inputs, navigates terrain, and seeks objectives.
- **User Mode**: The human developer takes keyboard control while keeping data logs running.
- **Live AI Guidance**: Developer types commands into the chat box ("Jump across the gap and check if the collision box on the spike pit is accurate"). The testing LLM adjusts its objective weightings in real time.

### 10.3 State Checkpointing (Save/Load State)
Debug Play serializes complete game states into `public.debug_play_saved_states`. Developers can click "Save Checkpoint" right before a boss fight or bug scenario, and reload that exact frame repeatedly to verify fixes.

---

# 11. TERMINAL COMMAND CENTER & REST EXPLORER (CRYPTART COMMANDER)

### 11.1 Features & Interface
Located at `v2/vcw4w/app/commander/page.tsx`:
- Full-screen retro-modern terminal with ANSI color support, tab completion, and bash-like history (`ArrowUp` / `ArrowDown`).
- **Command Aliases**: Persisted in `localStorage` (`alias st="keys status"`).
- **Batch Script Runner**: Create, save, and execute sequential `.4w` macro scripts.
- **Interactive REST Explorer**: Tab containing an interactive Swagger/Postman-style runner testing all 4weird `/api/*` endpoints.

---

# 12. P2P COMPUTE RESOURCE SHARING NETWORK (DONATEPERSONALSECONDS)

### 12.1 WebRTC Compute Mesh Architecture
Allows community members to donate idle GPU/CPU power to process video rendering, AI inference, or game bundling.

```
+-------------------+           WebRTC Signaling          +-------------------+
|   Donor Machine   | <---------------------------------> |  Borrower Machine |
| (Idle RTX 4090)   |                                     | (Chromebook / Mac)|
+-------------------+                                     +-------------------+
          |                                                         |
          | <======== WebRTC DataChannel (Encrypted) =============> |
          |               Offloaded Render Jobs / AI Tasks          |
          v                                                         v
   Earns Vibe Coins                                         Completes Tasks Fast
```

---

# 13. INTENTION HASHING & AI SEED ANCHORING (LUCK FACTORY)

### 13.1 Cryptographic Luck Engine (`v2/vcw4w/lib/luck/luckEngine.ts`)
Converts user mantras or emojis into deterministic seeds for RNG and AI sampling:

```typescript
export async function computeLuckSignature(intention: string): Promise<{
  baseScore: number;
  tier: 69 | 420 | 777;
  finalSeed: bigint;
}> {
  const encoder = new TextEncoder();
  const data = encoder.encode(intention.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Base score 0 to 999
  const baseScore = ((hashArray[0] << 8) | hashArray[1]) % 1000;
  
  let tier: 69 | 420 | 777 = 69;
  if (baseScore >= 500 && baseScore < 900) tier = 420;
  if (baseScore >= 900) tier = 777;

  // Derive 64-bit integer seed
  const view = new DataView(hashBuffer);
  const finalSeed = view.getBigInt64(0);

  return { baseScore, tier, finalSeed };
}
```

---

# 14. VISUAL DESKTOP & MOBILE INSTALLER BUILDER (CLONE TOOL)

### 14.1 Configuration Wizard
Located at `v2/vcw4w/app/studio/builder/page.tsx`:
1. **General**: Name, executable binary title, version, author, website.
2. **Targets**: Windows (`.exe`, `.msi`), macOS (`.dmg`), Linux (`.deb`, `.AppImage`), Android (`.apk`).
3. **Window**: Dimensions, fullscreen, resizable, transparent chrome.
4. **Includes**: Embedded 4weird games, custom plugins, themes, and offline database cache.
5. **Build Monitor**: Real-time SSE build progress log with downloadable compiled binaries.

---

# 15. AUTONOMOUS SYSTEM AGENT & SKILLS MARKETPLACE (VALLEYNET)

### 15.1 Skills Marketplace & SKILL.md Standard
ValleyNet (`v2/vcw4w/app/valleynet/page.tsx`) executes multi-step computer tasks using modular skills. Each skill is packaged with a `SKILL.md` containing YAML frontmatter and execution steps:

```markdown
---
name: discord-announcer
description: Post game updates and clan tournament results to Discord
parameters:
  channel_id: string
  message: string
---
1. Authenticate with Discord Bot Token
2. Format message with embedded markdown
3. Dispatch via POST https://discord.com/api/v10/channels/{channel_id}/messages
```

---

# 16. INTERACTIVE 3D VIRTUAL PET & ROOM COMPANION

### 16.1 Virtual Pet Room (`v2/vcw4w/app/pet/page.tsx`)
Built with Three.js:
- **3D Room**: Customizable wallpaper, floors, and furniture.
- **Pet State Loop**: Hunger, Happiness, Energy decay over time; restore by feeding (`FoodData.ts`) and playing games.
- **Gaming Buddy Voice Integration**: Pet talks with the user's selected Gaming Buddy voice coach, cheering on game wins and reminding them of clan events.

---

# 17. TAX INFO BOT & FISCAL COMPLIANCE SUITE

### 17.1 Receipt Verification & Tax Summary
Located at `v2/vcw4w/app/business/tax/page.tsx`:
- Drag-and-drop batch upload for receipts and PDF invoices.
- OCR / Vision parsing to extract date, vendor, tax ID, and line item amounts.
- Categorization into business expense buckets (software, cloud compute, contractor labor).
- Exportable CSV/PDF tax schedule for annual filings.

---

# 18. CROSS-TOOL INTEROPERABILITY EVENT BUS & WORKSPACE BAR

### 18.1 Global Pub/Sub Event Bus (`v2/vcw4w/lib/interop.ts`)
```typescript
type EventCallback = (payload: any) => void;

class 4weirdEventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  public subscribe(event: string, cb: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  public emit(event: string, payload: any): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      cbs.forEach((cb) => cb(payload));
    }
  }
}

export const GlobalEventBus = new 4weirdEventBus();
```

---

# 19. CHROMEBOOK & LOW-POWER HARDWARE OPTIMIZATION SUITE

### 19.1 Optimization Checklist
1. **Device Detection**: Detect Chrome OS via `navigator.userAgent`.
2. **Offline PWA**: Cache core HTML/JS bundles via Service Worker for offline play.
3. **Storage API**: Use the File System Access API with persistent IndexedDB quota grants.
4. **Lightweight Editor**: Swap Monaco Editor for a fast, memory-efficient CodeMirror/Textarea editor when device memory is under 4GB.

---

# 20. TALENT MARKETPLACE & FREELANCE DIRECTORY (GIVEGIGS WORKER ENGINE)

### 20.1 System Purpose & Architecture
The Talent Marketplace (`v2/vcw4w/app/talents/page.tsx`) provides an open talent directory where game developers, 3D artists, pixel animators, voice actors, and freelance engineers showcase their services. It features a transparent **Dual Rate System** (Cheap Rate for standard delivery vs. Rush Rate for urgent turnaround) and multi-tiered privacy protection on all contact blocks.

### 20.2 Worker Card Component (`v2/vcw4w/components/talents/WorkerCard.tsx`)
```tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, MapPin, Volume2, Briefcase, Zap, ExternalLink } from "lucide-react";

export interface WorkerCardProps {
  id: string;
  friendlyName: string;
  jobTitle: string;
  tagline?: string;
  country?: string;
  agencyStatus: "independent" | "agency_owned" | "both";
  cheapRate: number;
  rushRate: number;
  rateCurrency: string;
  avatarUrl?: string;
  keywords?: string[];
  audioSamplesCount?: number;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({
  id,
  friendlyName,
  jobTitle,
  tagline,
  country,
  agencyStatus,
  cheapRate,
  rushRate,
  rateCurrency,
  avatarUrl,
  keywords = [],
  audioSamplesCount = 0,
}) => {
  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-xl hover:shadow-amber-500/10">
      <div>
        {/* Header with Avatar & Basic Info */}
        <div className="flex items-start gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/20 bg-slate-800">
            {avatarUrl ? (
              <img src={avatarUrl} alt={friendlyName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-bold text-amber-400">
                {friendlyName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-bold text-lg text-white group-hover:text-amber-300">
                {friendlyName}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  agencyStatus === "independent"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                }`}
              >
                {agencyStatus}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-300">{jobTitle}</p>
            {country && (
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="h-3 w-3" />
                <span>{country}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tagline */}
        {tagline && (
          <p className="mt-3 text-xs italic text-slate-300 line-clamp-2">
            "{tagline}"
          </p>
        )}

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {keywords.slice(0, 4).map((kw, i) => (
              <span
                key={i}
                className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300 border border-white/5"
              >
                {kw}
              </span>
            ))}
            {keywords.length > 4 && (
              <span className="text-[11px] text-slate-400">+{keywords.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Rates & Actions */}
      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Briefcase className="h-3 w-3 text-cyan-400" />
              <span>Cheap:</span>
              <span className="font-bold text-white">
                ${cheapRate} {rateCurrency}/hr
              </span>
            </div>
            {rushRate > 0 && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>Rush:</span>
                <span className="font-bold text-amber-300">
                  ${rushRate} {rateCurrency}/hr
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {audioSamplesCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-cyan-400 font-semibold" title={`${audioSamplesCount} audio samples`}>
                <Volume2 className="h-3.5 w-3.5" />
                {audioSamplesCount}
              </span>
            )}
            <Link
              href={`/talents/${id}`}
              className="rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300 flex items-center gap-1"
            >
              Profile
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 20.3 Cloudflare Turnstile Gated Contact Reveal Component
```tsx
"use client";

import React, { useState } from "react";
import { Shield, Eye, Lock, CheckCircle2 } from "lucide-react";

interface ContactBlockProps {
  workerId: string;
  contactId: string;
  type: string;
  accessTier: "public" | "button" | "turnstile" | "captcha" | "login_required";
}

export const ContactBlock: React.FC<ContactBlockProps> = ({
  workerId,
  contactId,
  type,
  accessTier,
}) => {
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReveal = async () => {
    setLoading(true);
    try {
      // In production, verify Turnstile token if accessTier === 'turnstile'
      const res = await fetch(`/api/talents/${workerId}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (data.success) {
        setRevealedValue(data.contactValue);
      }
    } catch (err) {
      console.error("Failed to reveal contact", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-3">
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg bg-white/5 p-2 font-mono text-xs uppercase text-amber-400">
          {type}
        </div>
        {revealedValue ? (
          <span className="font-mono text-sm text-emerald-400 font-bold select-all">
            {revealedValue}
          </span>
        ) : (
          <span className="text-xs text-slate-400">
            Protected ({accessTier.replace("_", " ")})
          </span>
        )}
      </div>

      {!revealedValue && (
        <button
          onClick={handleReveal}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 disabled:opacity-50"
        >
          {loading ? (
            "Verifying..."
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              Reveal
            </>
          )}
        </button>
      )}
    </div>
  );
};
```

---

# 21. PRODUCTION TIME TRACKER & BILLING ENGINE (GHOST TIMER OVERHAUL)

### 21.1 System Architecture
The original `/timer` in 4weird was a playful toy that measured seconds into hypothetical Ghost Cash (`👻`) IOUs. The Remastery transforms this into a production-grade time tracking system for squads, game studios, and contractors with project budgets, billable rates, and one-click invoice generation.

### 21.2 Drift-Proof Web Worker Timer Engine (`v2/vcw4w/public/workers/timerWorker.js`)
Browsers throttle `setInterval` and `requestAnimationFrame` when a tab is inactive or minimized. To prevent time drift, the timer core runs in a dedicated Web Worker:

```javascript
// Web Worker for accurate second ticks without tab background throttling
let timerId = null;
let startTime = 0;
let accumulatedSeconds = 0;

self.onmessage = function (e) {
  const { action, baseSeconds } = e.data;

  if (action === "start") {
    accumulatedSeconds = baseSeconds || 0;
    startTime = Date.now();
    if (timerId) clearInterval(timerId);

    timerId = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      self.postMessage({
        type: "tick",
        totalSeconds: accumulatedSeconds + elapsed,
      });
    }, 1000);
  } else if (action === "stop" || action === "pause") {
    if (timerId) clearInterval(timerId);
    timerId = null;
    self.postMessage({ type: "stopped" });
  }
};
```

### 21.3 Live Timer React Component (`v2/vcw4w/app/timer/LiveTimer.tsx`)
```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Plus, Clock, DollarSign, FileText } from "lucide-react";

export function LiveTimer() {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [description, setDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string; hourlyRate: number }>>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker("/workers/timerWorker.js");
    workerRef.current.onmessage = (e) => {
      if (e.data.type === "tick") {
        setSeconds(e.data.totalSeconds);
      }
    };

    // Fetch user projects
    fetch("/api/timer/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects) setProjects(data.projects);
      });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleStart = () => {
    setIsRunning(true);
    workerRef.current?.postMessage({ action: "start", baseSeconds: seconds });
  };

  const handlePause = () => {
    setIsRunning(false);
    workerRef.current?.postMessage({ action: "pause" });
  };

  const handleSave = async () => {
    handlePause();
    if (seconds < 5) return;

    await fetch("/api/timer/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProjectId || null,
        description,
        durationSeconds: seconds,
        startTime: new Date(Date.now() - seconds * 1000).toISOString(),
        endTime: new Date().toISOString(),
      }),
    });

    setSeconds(0);
    setDescription("");
  };

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur shadow-2xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Description & Project Selector */}
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="What are you working on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-300 focus:border-amber-400 focus:outline-none"
          >
            <option value="">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (${p.hourlyRate}/hr)
              </option>
            ))}
          </select>
        </div>

        {/* Display & Transport Buttons */}
        <div className="flex items-center justify-between gap-6 sm:justify-end">
          <div className="font-mono text-3xl font-black text-amber-300 tracking-wider">
            {formatTime(seconds)}
          </div>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-slate-950 transition hover:bg-amber-300 shadow-lg shadow-amber-400/20"
              >
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500 text-slate-950 transition hover:bg-yellow-400"
              >
                <Pause className="h-5 w-5 fill-current" />
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={seconds === 0}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
              title="Save Time Entry"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

# 22. INVOICE GENERATOR WITH VECTOR PDF & 30-DAY TRASH

### 22.1 Complete Invoicing Engine (`v2/vcw4w/app/business/invoices/page.tsx`)
Ported from GiveGigs, the invoice module supports multiple currencies, customizable tax rates, client directories, vector PDF export, and a dedicated 30-day soft-delete trash bin with instant restoration.

### 22.2 PDF Export Utility (`v2/vcw4w/lib/invoice/generatePdf.ts`)
```typescript
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportInvoiceToPdf(elementId: string, invoiceNumber: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Invoice DOM element not found");

  const canvas = await html2canvas(element, {
    scale: 2, // High resolution retina rendering
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`Invoice-${invoiceNumber}.pdf`);
}
```

### 22.3 Soft-Delete Trash List Component (`v2/vcw4w/components/invoice/TrashList.tsx`)
```tsx
"use client";

import React, { useState, useEffect } from "react";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";

interface TrashedInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  currency: string;
  deleted_at: string;
}

export const TrashList: React.FC = () => {
  const [trashedInvoices, setTrashedInvoices] = useState<TrashedInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoice/trash");
      const data = await res.json();
      if (data.invoices) setTrashedInvoices(data.invoices);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: string) => {
    await fetch(`/api/invoice/trash/${id}`, { method: "PUT" });
    fetchTrash();
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Are you sure? This action cannot be undone.")) return;
    await fetch(`/api/invoice/trash/${id}`, { method: "DELETE" });
    fetchTrash();
  };

  const calculateDaysLeft = (deletedAt: string) => {
    const deleteDate = new Date(deletedAt);
    const purgeDate = new Date(deleteDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffDays = Math.ceil((purgeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <div className="flex items-center gap-2 text-amber-400 mb-4">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="text-lg font-bold text-white">Invoices Trash (30-Day Auto Purge)</h2>
      </div>

      {trashedInvoices.length === 0 ? (
        <p className="text-sm text-slate-400">Trash is empty.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {trashedInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-bold text-white">{inv.invoice_number}</p>
                <p className="text-xs text-slate-400">
                  ${inv.total_amount} {inv.currency} · Auto-deletes in {calculateDaysLeft(inv.deleted_at)} days
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRestore(inv.id)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </button>
                <button
                  onClick={() => handlePermanentDelete(inv.id)}
                  className="flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Purge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

# 23. KANBAN PROJECT MANAGER WITH SPRINTS & CYCLES (@DND-KIT)

### 23.1 Squad Project Board (`v2/vcw4w/app/squads/[slug]/board/page.tsx`)
GiveGigs' full-featured Kanban project management system is integrated directly into 4weird Squads. It is powered by `@dnd-kit/core` and `@dnd-kit/sortable` for fluid multi-column task reordering.

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

interface KanbanCardData {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
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
    </div>
  );
};

export function KanbanBoard() {
  const [cards, setCards] = useState<KanbanCardData[]>([
    { id: "1", title: "Refactor GraveGain 3D Shaders", priority: "high", columnId: "todo" },
    { id: "2", title: "Add Turnstile to Talent Profiles", priority: "urgent", columnId: "in_progress" },
    { id: "3", title: "Write verify-remastery test", priority: "medium", columnId: "done" },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    // Reorder and update column logic here
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {["todo", "in_progress", "done"].map((colId) => (
          <div key={colId} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4">
              {colId.replace("_", " ")}
            </h3>
            <SortableContext
              items={cards.filter((c) => c.columnId === colId).map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3 min-h-[300px]">
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

# 24. FREE WEB PRODUCTIVITY TOOLS SUITE (/TOOLS)

### 24.1 Four Organic Traffic Generators (`v2/vcw4w/app/tools/page.tsx`)
These four browser-native tools run entirely on client-side memory without incurring backend server compute costs, serving as organic search magnets:

1. **SEO Meta & OpenGraph Card Previewer (`/tools/seo`)**:
   - Inputs: Title, Description, Image URL, Canonical URL, Keywords.
   - Real-time previews: Google Search Result snippet, Twitter/X Summary Large Image Card, Discord Rich Embed card.
   - 1-Click copy of clean `<meta>` tags.

2. **AI Copywriting & Game Lore Generator (`/tools/writing`)**:
   - Generates game backstories, item descriptions, quest dialogue, and punchy marketing headlines using lightweight LLM completions.

3. **Client-Side Image Converter & Compressor (`/tools/image`)**:
   - Converts PNG/JPEG to modern WebP with quality slider (0.1 to 1.0).
   - Generates exact byte savings comparison before downloading.

4. **Live Word & Reading Time Counter (`/tools/counter`)**:
   - Real-time stats: Characters, Characters (no spaces), Words, Sentences, Paragraphs.
   - Reading Time (calculated at 220 WPM) and Speaking Time (calculated at 140 WPM).

---

# 25. AI-TO-HUMAN REAL-WORLD TASK MARKETPLACE

### 25.1 System Mechanics
The AI Task Marketplace (`v2/vcw4w/app/tasks/page.tsx`) inverts the typical model: **AI agents post jobs for human volunteers or workers**. Tasks can be local (with GPS coordinates and radius) or remote, and feature a mandatory **"Hope" statement** where the AI explains why completing the task brings positive real-world impact to humanity or the local community.

```tsx
"use client";

import React from "react";
import Link from "next/link";
import { Heart, MapPin, ThumbsUp, MessageSquare, AlertCircle } from "lucide-react";

export interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  hope: string;
  fundingType: "charity" | "funded_vibe_coins" | "unfunded";
  bountyCoins: number;
  urgency: "low" | "normal" | "urgent" | "critical";
  isRemote: boolean;
  locationName?: string;
  upvotes: number;
  commentsCount: number;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  id,
  title,
  description,
  hope,
  fundingType,
  bountyCoins,
  urgency,
  isRemote,
  locationName,
  upvotes,
  commentsCount,
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur transition hover:border-amber-400/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                fundingType === "charity"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {fundingType === "charity" ? "💛 Charity Task" : `🪙 ${bountyCoins} Vibe Coins`}
            </span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
              {urgency}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-bold text-white hover:text-amber-300">
            <Link href={`/tasks/${id}`}>{title}</Link>
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ThumbsUp className="h-4 w-4 text-amber-400" />
          <span className="font-bold">{upvotes}</span>
        </div>
      </div>

      {/* Hope Statement Box */}
      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <Heart className="h-3.5 w-3.5 fill-current" />
          <span>The Hope Behind This Task</span>
        </div>
        <p className="mt-1 text-xs text-emerald-200/80 italic">{hope}</p>
      </div>

      <p className="mt-3 text-sm text-slate-300 line-clamp-2">{description}</p>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-cyan-400" />
          <span>{isRemote ? "Remote Everywhere" : locationName || "Local"}</span>
        </div>

        <div className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{commentsCount} comments</span>
        </div>
      </div>
    </div>
  );
};
```

---

# 26. AUTOMATED AI SENTIMENT, ETHICS & LEGALITY SCREENING

### 26.1 Ethical Safety Pipeline (`v2/vcw4w/lib/moderation/taskScreener.ts`)
```typescript
import { OpenAI } from "openai";

export interface TaskScreeningResult {
  isApproved: boolean;
  ethicsScore: number; // 0 to 100
  flagReasons: string[];
  recommendedCategory: string;
}

export async function screenAgentTask(
  title: string,
  description: string,
  hope: string
): Promise<TaskScreeningResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fail-safe default
    return { isApproved: true, ethicsScore: 90, flagReasons: [], recommendedCategory: "community" };
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: process.env.LUNA_MODEL || "gpt-5-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an automated ethics and legality screening director for human task marketplaces.
Analyze the task title, description, and hope statement.
Ensure the task:
1. Is strictly legal, non-violent, and respects bodily autonomy.
2. Does not involve physical harm, trespassing, vandalism, or harassment.
3. Positively benefits society, community, science, environment, or software development.

Respond with JSON:
{
  "isApproved": boolean,
  "ethicsScore": number (0-100),
  "flagReasons": string[],
  "recommendedCategory": string
}`,
      },
      {
        role: "user",
        content: JSON.stringify({ title, description, hope }),
      },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");
  return {
    isApproved: Boolean(parsed.isApproved && parsed.ethicsScore >= 70),
    ethicsScore: parsed.ethicsScore ?? 100,
    flagReasons: parsed.flagReasons ?? [],
    recommendedCategory: parsed.recommendedCategory ?? "general",
  };
}
```

---

# 27. CLIENT PROFILES & PROGRAMMATIC AGENT REGISTRATION API

### 27.1 Zero-Browser API Route (`v2/vcw4w/app/api/ai/register/route.ts`)
```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { name, model, description, contactEmail } = await req.json();

    if (!name || !contactEmail) {
      return NextResponse.json(
        { success: false, error: "Name and contactEmail are required" },
        { status: 400 }
      );
    }

    // Generate high-entropy API key
    const rawKey = `4w_live_${crypto.randomBytes(24).toString("hex")}`;
    const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert new client profile
    const { data, error } = await supabase
      .from("client_profiles")
      .insert({
        name,
        model_name: model || "unknown",
        description,
        contact_email: contactEmail,
        api_key_hash: hashedKey,
        is_verified_agent: true,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      clientId: data.id,
      apiKey: rawKey, // Shown once
      message: "Save your apiKey securely. It will not be shown again.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
```

---

# 28. OFFICIAL MODEL CONTEXT PROTOCOL (MCP) SERVER (@4WEIRD/MCP)

### 28.1 Standalone Package Entrypoint (`programs/mcp/src/index.ts`)
```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "@4weird/mcp", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "post_task",
        description: "Post a real-world task or charity bounty for human volunteers on 4weird",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            hope: { type: "string" },
            bountyCoins: { type: "number" },
          },
          required: ["title", "description", "hope"],
        },
      },
      {
        name: "search_workers",
        description: "Search the 4weird talent directory for game artists, developers, and testers",
        inputSchema: {
          type: "object",
          properties: {
            keyword: { type: "string" },
            country: { type: "string" },
            maxCheapRate: { type: "number" },
          },
        },
      },
      {
        name: "trigger_vcw_test",
        description: "Trigger an autonomous VibeCodeWorker game QA run on any 4weird arcade game",
        inputSchema: {
          type: "object",
          properties: {
            gameSlug: { type: "string" },
            captureMode: { type: "string", enum: ["screenshot", "state_data", "full_state"] },
          },
          required: ["gameSlug"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const baseUrl = process.env.FOURWEIRD_API_URL || "https://4weird.com";
  const apiKey = process.env.FOURWEIRD_API_KEY;

  if (name === "search_workers") {
    const res = await fetch(`${baseUrl}/api/talents?keyword=${args?.keyword || ""}`);
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data.workers, null, 2) }] };
  }

  if (name === "post_task") {
    const res = await fetch(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  throw new Error(`Tool ${name} not recognized.`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch(console.error);
```

---

# 29. OFFICIAL DISCORD BOT INTEGRATION

### 29.1 Slash Command Bot (`programs/discord/src/bot.ts`)
```typescript
import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder()
    .setName("post-task")
    .setDescription("Post a charity task to 4weird directly from Discord")
    .addStringOption((opt) => opt.setName("title").setDescription("Task title").setRequired(true))
    .addStringOption((opt) => opt.setName("hope").setDescription("Why this helps humanity").setRequired(true)),
  new SlashCommandBuilder()
    .setName("search-talent")
    .setDescription("Find game developers and artists on 4weird")
    .addStringOption((opt) => opt.setName("query").setDescription("Skills / keywords").setRequired(true)),
];

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "post-task") {
    const title = interaction.options.getString("title")!;
    const hope = interaction.options.getString("hope")!;
    await interaction.reply(`🚀 Posted task: **${title}**\n*Hope:* ${hope}\nView at https://4weird.com/tasks`);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

---

# 30. MULTI-PARTY TASK CHAT THREADS WITH AI AWARENESS

### 30.1 Architecture
The chat subsystem distinguishes between:
1. `DIRECT` user-to-user messages.
2. `TASK` collaborative project threads connecting the hirer, the applicant, and autonomous AI agents.
All messages are timestamped, indexed, and synchronized via Supabase Realtime WebSocket channels.

---

# 31. MULTI-CHANNEL NOTIFICATION ENGINE (BELL & EMAIL ALERTS)

### 31.1 Notification Service (`v2/vcw4w/lib/notification-service.ts`)
```typescript
import { createClient } from "@supabase/supabase-js";

interface NotificationPayload {
  userId: string;
  type: "new_message" | "task_application" | "invoice_paid" | "game_test_complete";
  title: string;
  preview: string;
  actionUrl: string;
}

// In-memory rate limiting to prevent spam storms (5-second window per user+type)
const rateLimitCache = new Map<string, number>();

export async function sendNotification(payload: NotificationPayload) {
  const rateKey = `${payload.userId}:${payload.type}`;
  const now = Date.now();
  if (rateLimitCache.has(rateKey) && now - rateLimitCache.get(rateKey)! < 5000) {
    return; // Drop duplicate spam notification
  }
  rateLimitCache.set(rateKey, now);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Insert notification record
  await supabase.from("notifications").insert({
    user_id: payload.userId,
    notification_type: payload.type,
    title: payload.title,
    preview: payload.preview,
    action_url: payload.actionUrl,
  });

  // Check email preferences and dispatch Resend email if enabled
  const { data: pref } = await supabase
    .from("notification_preferences")
    .select("enable_email")
    .eq("user_id", payload.userId)
    .single();

  if (pref?.enable_email && process.env.RESEND_API_KEY) {
    // Dispatch async email without blocking caller
  }
}
```

---

# 32. GOVERNANCE & MODERATION CONTROL ROOM (/MOD)

### 32.1 Staff Moderation Features
Located at `v2/vcw4w/app/mod/page.tsx`:
1. **User Management**: Search by username/email, assign roles (`admin`, `moderator`, `user`), and apply account locks.
2. **Worker Profile Approval Queue**: Inspect unverified profiles, review portfolios, and approve or pause accounts.
3. **Review Appeal Center**: Process worker reactivation appeals.
4. **Mass Email Broadcaster**: Send platform announcements via Brevo/Resend with strict preview test mode.

---

# 33. AUTOMATED VERIFICATION TEST SUITE (SCRIPTS/VERIFY-*.MJS)

### 33.1 Remastery Route Verifier (`v2/vcw4w/scripts/verify-remastery-routes.mjs`)
```javascript
import fs from "fs";
import path from "path";

const REQUIRED_REMASTERY_ROUTES = [
  "app/studio/video/page.tsx",
  "app/studio/paint/page.tsx",
  "app/studio/audio/page.tsx",
  "app/studio/recorder/page.tsx",
  "app/studio/builder/page.tsx",
  "app/gamestudio/page.tsx",
  "app/gamestudio/cloner/page.tsx",
  "app/gamestudio/debugplay/page.tsx",
  "app/commander/page.tsx",
  "app/compute/p2p/page.tsx",
  "app/luck/page.tsx",
  "app/pet/page.tsx",
  "app/talents/page.tsx",
  "app/tasks/page.tsx",
  "app/business/invoices/page.tsx",
  "app/timer/page.tsx",
  "app/tools/page.tsx",
  "app/chat/page.tsx",
  "app/mod/page.tsx",
];

let failed = 0;
console.log("🔍 Checking Remastery route existence...");

REQUIRED_REMASTERY_ROUTES.forEach((route) => {
  const fullPath = path.resolve(process.cwd(), route);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${route}`);
  } else {
    console.error(`  ❌ MISSING: ${route}`);
    failed++;
  }
});

if (failed > 0) {
  console.error(`\n❌ Remastery Verification FAILED: ${failed} missing routes.`);
  process.exit(1);
} else {
  console.log(`\n🎉 All Remastery routes verified successfully.`);
  process.exit(0);
}
```

---

# 34. MASTER CODING RULES, DESIGN PATTERNS & GOTCHAS

### 34.1 The 50 Golden Commandments of 4weird Engineering

#### Next.js 15 & React 19 Boundaries
1. **Explicit Client Boundaries**: Place `"use client";` at line 1 of every interactive component using hooks (`useState`, `useEffect`, `useRef`), browser globals (`window`, `localStorage`), or Canvas rendering.
2. **Lean Server Components**: Keep page wrappers and database fetchers as Server Components to minimize client bundle footprint.
3. **Optimistic UI Updates**: Apply optimistic state changes for rapid user interactions (e.g., Kanban card dragging, task upvoting).
4. **Dynamic Import for Heavy Studios**: Always dynamically import heavy Canvas, Monaco, and Three.js modules with `{ ssr: false }`:
   ```typescript
   const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
   ```
5. **No Hydration Mismatches**: Guard against server/client timestamp mismatches by formatting dates only after component mount or in `useEffect`.

#### Supabase Authentication & Database
6. **Always Use `getUser()`**: In Next.js App Router API handlers, authenticate requests with `supabase.auth.getUser()`. Never use `supabase.auth.getSession()` on the server.
7. **Service Role Isolation**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code or public environment variables.
8. **Rerunnable Migrations**: Use `IF NOT EXISTS` for tables, columns, indexes, and extensions in all Supabase migration files.
9. **Row-Level Security (RLS)**: Enable RLS on every newly created table. Define explicit `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies.
10. **Composite Database Indexing**: Add composite indexes on filtered multi-column queries, such as `[user_id, deleted_at]`.

#### Financial Integrity & Vibe Coins
11. **Integer Arithmetic Only**: Store and compute Vibe Coins strictly as integers or BigInts (cents). Never perform floating-point calculations on money.
12. **Automatic 25% Cut**: Ensure every commercial payout computes the 25% platform cut / 75% provider disbursement internally:
    ```typescript
    const platformCut = Math.floor(totalCoins * 0.25);
    const providerShare = totalCoins - platformCut;
    ```
13. **Non-Withdrawable Safeguard**: Never write any code, endpoint, or flow that permits cashing out or withdrawing Vibe Coins to fiat currency.
14. **Database Transaction Locks**: Wrap balance deductions and credit transfers in Postgres atomic RPC functions (`UPDATE accounts SET coins = coins - x WHERE coins >= x`).
15. **Anti-Duplication Idempotency Keys**: Use unique transaction IDs or idempotency tokens on all checkout and reward claims.

#### Memory, Audio & Canvas Hygiene
16. **Canvas Garbage Collection**: Clean up HTML5 Canvas contexts and detach references on unmount to prevent severe memory leaks in DictatePic and Media Mogul.
17. **WebGL Texture Deletion**: In Three.js modules (Virtual Pet, 3D Cloner), explicitly call `geometry.dispose()` and `texture.dispose()` during cleanup.
18. **Web Audio Context Unlocking**: Instantiate or resume `AudioContext` only within a direct user interaction handler (button click).
19. **Audio Gain Ramping**: Never set `gainNode.gain.value` abruptly to 0 or 1; always use `linearRampToValueAtTime` over 20ms to prevent loud audio clicks.
20. **Waveform Worker Offloading**: Compute high-density audio waveform peak arrays inside a Web Worker instead of blocking the main UI thread.

#### Real-Time, P2P & Networking
21. **WebRTC NAT Traversal**: Provide fallback public STUN servers (`stun:stun.l.google.com:19302`) in WebRTC RTCPeerConnection configs.
22. **Clean WebRTC Tear Down**: Always close `RTCDataChannel` and `RTCPeerConnection` cleanly before unmounting P2P compute nodes.
23. **Rate-Limited Signaling**: Apply strict rate limiting to WebRTC signaling endpoints to thwart connection flood attacks.
24. **Supabase Realtime Channel Unsubscription**: Always call `supabase.removeChannel(channel)` in React unmount returns.
25. **Exponential Backoff on Reconnect**: When real-time chat or telemetry connections drop, reconnect using randomized exponential backoff.

#### Security, Sanitization & Input Validation
26. **Zod Validation on All Requests**: Validate all API route payloads with strict Zod schemas before processing.
27. **SVG Sanitization**: Sanitize all uploaded SVG vector assets using DOMPurify before rendering to prevent stored XSS attacks.
28. **Turnstile Verification**: Verify Cloudflare Turnstile tokens on the backend before revealing protected contact blocks.
29. **No Raw Shell Interpolation**: When invoking Godot or FFmpeg binaries in Tauri, pass arguments strictly as arrays (`Command::new("godot").args([...])`).
30. **No `eval()` or Dynamic Function Execution**: Never use `eval()` or `new Function()` in browser tools or script runners.

#### Game Dev & Autonomous QA
31. **Deterministic Physics Loops**: Ensure games use fixed-timestep delta loops (`dt = 1 / 60`) for consistent behavior across frame rates.
32. **Clean-Room Extraction Separation**: In the Video Game Cloner, execute mechanic extraction with temperature 0.0 to prevent creative narrative drift.
33. **Headless Engine Fallbacks**: Provide graceful mock visualizers when headless Godot is unavailable in the browser environment.
34. **Breakpoint Safety**: When Debug Play hits a conditional breakpoint, pause the input simulation immediately and notify the UI.
35. **State Data Normalization**: Normalize all coordinate values between 0.0 and 1.0 when passing game state to LLM decision engines.

#### Coding Aesthetics & UX Polish
36. **Dark Theme as Default**: Follow 4weird's visual identity: `bg-slate-950 text-white` with amber (`#f59e0b`) and cyan (`#06b6d4`) accent glow highlights.
37. **Micro-Animations**: Use subtle CSS/Framer Motion transitions (`transition duration-200 hover:-translate-y-0.5`) on all cards and interactive buttons.
38. **Accessible ARIA Labels**: Provide descriptive `aria-label` tags on all icon-only buttons (playhead, zoom, audio mute).
39. **Keyboard Accessibility**: Ensure all studio tools and Kanban boards can be navigated via keyboard shortcuts (`Space` for play/pause, `Esc` to close).
40. **Descriptive Empty States**: Never show a blank screen; always provide informative empty states with clear action prompts ("No projects yet — create one!").

#### Quality Assurance & Verification
41. **Run Verifiers Before Pushing**: Always run `npm test` and `node scripts/verify-remastery-routes.mjs` before committing changes.
42. **Never Touch `old-v1/`**: The `old-v1/` directory is an immutable legacy mirror; never edit or write files there.
43. **Preserve Tracked Game Parity**: Do not edit existing games inside `public/games/html/` without running `scripts/verify-game-bundles.mjs`.
44. **Test on Mobile & Touch**: Verify that all productivity tools and talent pages function correctly on touchscreens and small viewports.
45. **Structured Error Logging**: Log API errors with structured metadata (`{ route, userId, timestamp, error: err.message }`).
46. **Graceful Degradation**: If third-party keys (Fal.ai, ElevenLabs, OpenAI) are absent, display informative "Key not configured" states instead of crashing.
47. **Fast Cold Starts**: Keep root layout imports minimal so initial page loads render within 300ms.
48. **Modular File Sizes**: Keep individual component files under 500 lines by breaking sub-components into dedicated sub-directories.
49. **Idempotent File Headers**: In public script overlays, include idempotent load guards (`if (window.__4weirdRemasteryLoaded) return;`).
50. **Have Fun & Keep It Weird**: Maintain the whimsical, fun clubhouse spirit of 4weird across all tools!

---

*4weird Master Remastery Implementation Guide. Version 2.0.0. Approved for swarm execution.*

