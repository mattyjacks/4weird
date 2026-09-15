# 4weird UX/UI Compactness & Professional Modernization Plan
**Author:** Antigravity AI  
**Scope:** Comprehensive all-page UX/UI audit and redesign specifications for 4weird.com  
**Target:** Minimal-scroll, high-density, professional, state-of-the-art developer & gamer interface  
**Execution Cadence:** Audited and written incrementally every 5 pages.

---

## Executive Philosophy: Zero-Scroll & High-Density UX
The primary objective of this pass is to transform 4weird from a vertically sprawling, low-density marketing format into an ultra-fast, compact, professional cockpit where users can perform their essential workflows (playing games, renting GPUs, running agents, managing squads, handling finances, and generating media) with **minimal or zero scrolling** on standard desktop viewports (1080p / 1440p).

### Core Design Rules Applied Across All Pages:
1. **Hero Heights Capped at <180px (or zero-height inline title bars):** Replace giant 400-700px marketing hero banners with high-density top command bars featuring page titles, status badges, search/filters, and primary action buttons inline.
2. **Dense Multi-Column Grids:** Convert wide 1-column and 2-column sprawling cards (`p-6` / `p-8` with 24px+ gaps) into tight 3- to 5-column dashboard cards (`p-3` / `p-4` with 8px-12px gaps).
3. **Horizontal Steppers & Segmented Controls:** Replace tall vertical instruction lists and multi-screen wizards with inline horizontal stepper bars and tabbed switchers.
4. **Docked / Sticky Quick Command Bar:** Keep primary actions immediately actionable without forcing users to scroll to the bottom of the page.
5. **Fold Optimization:** Ensure that on a 1080p display (1920x1080 with ~900px effective browser viewport height), 80-100% of the primary interaction surface is visible and actionable immediately above the fold.

---

## Batch 1: Core Portal & Operations (Pages 1 to 5)

### Page 1: `/` (Homepage / Global Gateway)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page1_home_top` (`page1_home_top_1789423965811.png`)
  - Full Page Height: ~12,848 px (~16.8 standard screen viewports)
- **Current Layout Deficiencies:**
  - **Excessive Vertical Footprint:** The homepage spans over 12,800 pixels. A visitor has to scroll through 16 screen lengths to see products like the Arcade, GPU Rentals, Swarm Chat, fal.ai studio, and Clans.
  - **Oversized Hero Section:** The headline display text (`text-5xl`/`text-6xl`) and massive vertical spacing (`py-20`+) consume 760px of the first viewport before any actual game or compute tool is visible.
  - **Sprawling Sections:** Each platform feature (The Cloud, Squad Workspaces, Swarm, Arcade, Clans) is rendered as a standalone vertical block with large paragraph descriptions and redundant whitespace.
- **Compact & Professional Improvement Plan:**
  1. **Compact Cockpit Hero (Height: <280px):**
     - Consolidate headline, live platform status (Active Games, Compute Nodes, Online Agents), and instant quick-launch buttons (`Play Games`, `Rent Compute`, `Open VCW`) into a single 2-column header row.
     - Eliminate 500px of empty vertical space.
  2. **Segmented Command Console (Above-the-Fold Tabs):**
     - Replace the 12,000px vertical scroll with a high-density tabbed cockpit: `[Arcade (34)]` | `[Compute & Agents]` | `[Creative Studios]` | `[Business Suite]` | `[Community]`.
     - Selecting a tab immediately updates the active surface within the top viewport without requiring the user to scroll down the page.
  3. **High-Density 4-Column Quick Cards:**
     - Replace tall marketing feature sections with compact 4-column cards (height: ~140px) displaying icon, title, 1-line description, and direct launcher button.
  4. **Tighten Tokens:**
     - Padding: Reduce section `py-16` / `py-20` to `py-6`.
     - Card padding: Reduce from `p-6` to `p-3.5`.
     - Gap: Reduce from `gap-8` to `gap-3`.

---

### Page 2: `/games` (Arcade & Catalog Directory)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page2_games_top` (`page2_games_top_1789423993374.png`)
  - Full Page Height: ~7,137 px (~9.3 screen viewports)
- **Current Layout Deficiencies:**
  - **Invisible Games Above the Fold:** The top hero banner ("ARCADE / PLAY 34+ GAMES") consumes 100% of the initial 765px viewport. Not a single playable game card is visible upon landing without scrolling down.
  - **Massive Card Sizing:** Game cards are tall (~350px+) with large thumbnail heights and sprawling meta descriptions, forcing endless mouse scrolling to browse the catalog.
- **Compact & Professional Improvement Plan:**
  1. **Zero-Height Integrated Filter Bar:**
     - Replace the entire 600px hero with a sleek, sticky 48px header: Title `Arcade (34)` + inline search bar + category pill filters (`All`, `RPGs`, `Racers`, `Sims`, `Multiplayer`, `Free`).
  2. **High-Density Arcade Grid (Directly Above the Fold):**
     - Use a 5-column grid on desktop (`grid-cols-2 md:grid-cols-4 xl:grid-cols-5`).
     - Reduce card height to 180px–200px: crisp 16:9 thumbnail preview, badge overlays (e.g. `2D`, `4D`, `Multiplayer`), compact title, and instant hover-play button.
  3. **Instant Launch Flow:**
     - 10 to 15 games become immediately visible and clickable within the first screen without touching the mouse wheel.
  4. **Compact Drawer for Game Details:**
     - Instead of opening tall pages or long expansions, clicking "Info" opens a compact side drawer, keeping the player in the arcade catalog view.

---

### Page 3: `/pricing` (Pricing, Tokens & Compute Rates)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page3_pricing_top` (`page3_pricing_top_1789424019850.png`)
  - Full Page Height: ~8,605 px (~11.2 screen viewports)
- **Current Layout Deficiencies:**
  - **Submerged Pricing Tiers:** Giant hero typography and marketing preamble push the actual subscription/token tier cards below the fold.
  - **Sprawling Vertical FAQ & Rate Tables:** Compute rates (GPU, CPU, Agent per-second billing) and token economy rules are laid out in endless vertical accordion lists spanning over 8,000px.
- **Compact & Professional Improvement Plan:**
  1. **Above-the-Fold 3-Column Plan Matrix:**
     - Compress top hero to a single 40px line: `Plans & Vibe Coins — Transparent, Per-Second Billing`.
     - Position the 3 core plans (`Play & Create`, `Cloud Compute`, `Business & Teams`) side-by-side starting at `y: 80px`. All plans, prices, and CTA buttons fit fully inside the first viewport.
  2. **Interactive Compute Rate Calculator:**
     - Replace long static rate descriptions with a compact interactive calculator widget (select GPU type e.g. `RTX 4090`, select duration -> outputs exact Vibe Coins / USD cost).
  3. **High-Density 2-Column Specs Matrix:**
     - Consolidate feature comparisons into a tight comparison matrix table (`py-1.5` per row) with checkmarks, readable at a single glance.
  4. **Multi-Column Accordion Grid:**
     - Split FAQs into a 2-column compact grid, saving >1200px of scrolling.

---

### Page 4: `/agents` (Rent an Agent & Compute)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page4_agents_top` (`page4_agents_top_1789424079475.png`)
  - Mouse Scrolled: `page4_agents_scrolled` (`page4_agents_scrolled_1789424082412.png`)
  - Full Page Height: ~5,752 px (~7.5 screen viewports)
- **Current Layout Deficiencies:**
  - **Instructions Block the Product:** The page loads with large guide cards ("1 Get a key", "2 Store it safely", "3 Rent serverful", "4 Chat anywhere") taking up >500px vertically.
  - **Buried Rental Pods:** Users looking to deploy or rent an agent cannot see active pods or pricing without scrolling 1,000px down.
- **Compact & Professional Improvement Plan:**
  1. **Compact Horizontal Stepper:**
     - Convert the full-width vertical setup instructions into an elegant 1-row horizontal stepper progress bar (`1 Key -> 2 Store -> 3 Rent -> 4 Chat`) occupying only 40px of vertical space.
  2. **Direct Agent Pod Grid Above the Fold:**
     - Bring available agent pods (Cloud Worker, Coding Agent, Discord Bot, Custom RunPod) directly beneath the stepper bar into a compact 3-column card grid.
     - Each card displays specs, hourly/token rate, status badge (`Available` / `Busy`), and direct `Rent Now` button within the primary viewport fold.
  3. **Collapsible Guide Drawer:**
     - Move the detailed setup narrative and prerequisites into a collapsible drawer or slide-out modal triggered by a `Setup Guide (?)` pill button.

---

### Page 5: `/vibecodeworker` (VibeCodeWorker Command Hub)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page5_vcw_top` (`page5_vcw_top_1789424090698.png`)
  - Mouse Scrolled: `page5_vcw_scrolled` (`page5_vcw_scrolled_1789424093923.png`)
  - Full Page Height: ~3,400 px
- **Current Layout Deficiencies:**
  - **Sprawling 2-Column Mode Cards:** The 7 primary developer modes (Overview, Workspace, Cloud Run, Full Web, Remote, Manual, Demo) are presented as tall, bulky cards spanning multiple rows.
  - **Action Delay:** To launch the full web IDE or connect to remote runpods, developers must scroll down to locate the respective cards.
- **Compact & Professional Improvement Plan:**
  1. **Cockpit Command Dashboard (Zero-Scroll):**
     - Redesign the layout into a unified single-screen developer cockpit (100vh layout with no page-level scroll).
     - Left Column (25%): Quick workspace status, active branch, connected RunPod instances, and token balance.
     - Center/Right Grid (75%): Compact 3x2 or 4x2 command tile grid with quick-launch triggers (`Launch Full IDE`, `Start Cloud Run`, `Terminal`, `Agent Dispatch`).
  2. **Reduced Padding & Tight Typography:**
     - Card padding reduced from `p-6` to `p-3.5`.
     - Badges and status pills embedded directly into card headers.
  3. **One-Click Launch Actions:**
     - Replace multi-line marketing text on each card with an actionable 1-liner and prominent `Launch ->` keyboard-accessible button.

---

## Batch 2: Productivity, Time & Desktop Suite (Pages 6 to 10)

### Page 6: `/squads` (Squads / UnitUnite Workspaces)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page6_squads_top` (`page6_squads_top_1789424131799.png`)
  - Mouse Scrolled: `page6_squads_scrolled` (`page6_squads_scrolled_1789424132997.png`)
  - Full Page Height: ~3,800 px
- **Current Layout Deficiencies:**
  - **Navigational Cards Displace Core Actions:** A large 2x3 grid of "Business Suite" navigation cards (Orgs, Timer, Invoices, Tax Info Bot, Business CRM, Data Vault) occupies >500px of vertical space at the top.
  - **Submerged Squad Setup:** Organization Creation (Step 1) and Workspace Setup (Step 2) are pushed below 650px, forcing users to scroll down every time they want to create or join a squad.
  - **Spacious Card Padding:** Heavy card padding (`p-6` / `p-8`) inflates vertical footprint unnecessarily.
- **Compact & Professional Improvement Plan:**
  1. **Sub-Nav Shortcut Strip:**
     - Replace the 6 tall cards with a sleek, horizontal icon pill strip (40px high) or a top dropdown selector for the Business Suite.
  2. **Side-by-Side Setup Flow (Above the Fold):**
     - Position Organization Creation (Step 1) in the left column and Workspace Setup (Step 2) in the right column.
     - Both steps and their submit buttons (`Create Squad`, `Join Workspace`) become visible simultaneously without scrolling.
  3. **High-Density Active Squad List:**
     - Display joined squads as a compact list table (`h-10` per row with member avatars, role badge, and `Open` action) below the form.

---

### Page 7: `/timer` (Ghost Timer)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page7_timer_top` (`page7_timer_top_1789424140343.png`)
  - Mouse Scrolled: `page7_timer_scrolled` (`page7_timer_scrolled_1789424141518.png`)
  - Full Page Height: ~3,200 px
- **Current Layout Deficiencies:**
  - **Clock-In Pushed Off-Screen:** The top viewport is dominated by an 8-card org tooling grid and explanatory text.
  - **Multi-Step Scrolling to Start Work:** A worker must scroll past 550px just to reach Org selection, Contract dropdown, Task description input, and the primary "Clock in" button.
- **Compact & Professional Improvement Plan:**
  1. **Hero Timer Positioning:**
     - Invert the hierarchy: place the Ghost timer widget directly at the top of the viewport (`y: 64px`).
  2. **Single-Row Inline Control Strip:**
     - Combine `[Org Dropdown]` + `[Contract Dropdown]` + `[Task Input]` + `[Clock In / Out CTA]` into a unified, high-density toolbar.
  3. **Embedded Mini-Stats Ribbon:**
     - Display current session earnings, active timer counter, and today's accumulated total in a compact 3-cell metric badge bar right beside the clock button.
  4. **Compact Navigation Modal / Drawer:**
     - Move the 8 org tooling shortcuts into a compact header drawer or quick-switch dropdown menu.

---

### Page 8: `/timer/pro` (Pro Time Tracker & Billing)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page8_timer_pro_top` (`page8_timer_pro_top_1789424150176.png`)
  - Mouse Scrolled: `page8_timer_pro_scrolled` (`page8_timer_pro_scrolled_1789424151357.png`)
  - Full Page Height: ~2,800 px
- **Current Layout Deficiencies:**
  - **Disconnected Summary & Logs:** While the active digital timer display is visible at the top, the weekly billable analytics (Total Time, Billable Value, CSV Export) and the daily log table are stacked beneath it, requiring vertical scrolling.
- **Compact & Professional Improvement Plan:**
  1. **Unified Cockpit Layout (Zero-Scroll 100vh):**
     - Convert the page into a 2-column split desktop view:
       - **Left Panel (40%):** Digital timer display, quick project/tag selector, and start/stop controls.
       - **Right Panel (60%):** Weekly summary KPI cards (Total Hours, Billable Value) stacked over an internally scrollable daily entry table (`max-h-[380px]`).
  2. **Inline Back Navigation:**
     - Place `← Ghost Timer` back link inline with the page title rather than in a dedicated banner row.
  3. **Dense Table Rows:**
     - Reduce time entry table row height to 32px with inline edit and delete actions on hover.

---

### Page 9: `/desktop` (RunPod Desktop Parity Hub)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page9_desktop_top` (`page9_desktop_top_1789424168756.png`)
  - Mouse Scrolled: `page9_desktop_scrolled` (`page9_desktop_scrolled_1789424169965.png`)
  - Full Page Height: ~3,900 px
- **Current Layout Deficiencies:**
  - **Policy Copy Overwhelms Actions:** Multi-paragraph documentation, idle guard warnings, and remote parity explanations push the desktop instance selection cards (CPU Desktop, GPU Desktop, JupyterLab) below the fold.
  - **Launch Form Hidden:** The "Max $/hour" budget input and "Launch Desktop" action button are completely off-screen on standard 1080p viewports.
- **Compact & Professional Improvement Plan:**
  1. **Above-the-Fold 3-Column Plan Grid:**
     - Display CPU, GPU, and JupyterLab desktop options in a crisp, 3-column selection card row starting at `y: 80px`.
     - Each card highlights GPU/CPU specs, per-hour rate, and radio selection.
  2. **Inline Launch Action Bar:**
     - Place budget input, region selector, and primary `Launch Remote Desktop` button directly underneath the plan cards in the same screen.
  3. **Collapsible Policy Accordion:**
     - Condense idle guard rules and background connection info into a collapsible details disclosure (`[i] Idle Guard & Billing Policies`).

---

### Page 10: `/buddy` (AI Desktop & Game Buddy)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page10_buddy_top` (`page10_buddy_top_1789424191669.png`)
  - Mouse Scrolled: `page10_buddy_scrolled` (`page10_buddy_scrolled_1789424192953.png`)
  - Full Page Height: ~4,100 px
- **Current Layout Deficiencies:**
  - **Giant Game Pill Cloud:** A massive wrapping cluster of 30+ game tags takes up nearly 400 vertical pixels right in the center of the viewport.
  - **Setup Controls Buried:** AI Buddy parameters (Voice dropdown, Model selector, Reasoner toggle, Speed setting, and "Start Buddy session" CTA) are completely submerged below the fold.
- **Compact & Professional Improvement Plan:**
  1. **Searchable Game Dropdown:**
     - Replace the 400px pill cloud with a single, sleek combobox / searchable dropdown (`Select Game (e.g. GraveGain, Xonotic, Fridge)...`) occupying only 38px of height.
  2. **Side-by-Side Configuration & Companion Console:**
     - **Left Column (50%):** Model selector, Voice synthesizer, Reasoner toggle, and prominent `Start Buddy Session` button.
     - **Right Column (50%):** Live companion status, credit usage badge, audio waveform monitor, and screen-share toggle.
  3. **Result:** Entire AI Buddy setup and active companion session interface fits cleanly within a single 1080p screen with zero scrolling needed.

---

## Batch 3: Infrastructure, Compute & Creation (Pages 11 to 15)

### Page 11: `/swarm` (Swarm AI Orchestration & Bot Management)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page11_swarm_top` (`page11_swarm_top_1789424251415.png`)
  - Mouse Scrolled: `page11_swarm_scrolled` (`page11_swarm_scrolled_1789424252535.png`)
  - Full Page Height: ~3,900 px
- **Current Layout Deficiencies:**
  - **Preamble Displaces Cockpit:** A massive title banner ("YOUR AGENT, WITH A BRAIN"), a 4-line marketing paragraph, and an 11-button sub-navigation tab strip push the entire interactive bot configuration and orchestration console below the fold.
  - **Stacked Agent Controls:** Agent selectors (Agent 1, Agent 2, Agent 3) are stacked vertically on the left panel, consuming excessive height and truncating text labels ("Auto (built-in rea...").
  - **Buried Prompt & Chat:** The user cannot immediately test or talk to their swarm without scrolling 600px+.
- **Compact & Professional Improvement Plan:**
  1. **Zero-Scroll Swarm Cockpit (100vh):**
     - Consolidate the page into a 3-pane IDE layout:
       - **Left Rail (20%):** Collapsible Agent selector list (`Agent 1`, `Agent 2`, `Agent 3`) with compact status dots (Active/Idle), model dropdowns, and temperature sliders.
       - **Center Stage (55%):** Live streaming chat feed, message history, and docked bottom prompt input (`Send to Swarm ↵`).
       - **Right Panel (25%):** Orchestration telemetry, active tokens/second meter, tool call logs, and context window gauge.
  2. **Sub-Nav Consolidation:**
     - Replace the 11 sprawling pill tabs with a compact header dropdown selector or breadcrumb trail.
  3. **Header Reduction:**
     - Reduce banner from 260px down to a single 36px title line with inline API Key status indicator.

---

### Page 12: `/fal` (Fal AI Image & Media Studio)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page12_fal_top` (`page12_fal_top_1789424259857.png`)
  - Mouse Scrolled: `page12_fal_scrolled` (`page12_fal_scrolled_1789424260922.png`)
  - Full Page Height: ~5,200 px
- **Current Layout Deficiencies:**
  - **Sprawling 30-Tool Catalog:** 30 generative media tool cards are laid out in a loose 3-column vertical grid. Only 3 tool cards fit in the initial viewport before scrolling.
  - **No Filtering or Search:** Users must scroll endlessly down over 5,000px to hunt for specific model pipelines (e.g. Sprite Edit, Upscaler, Face Swap, 3D Mesh).
- **Compact & Professional Improvement Plan:**
  1. **Top Filter Strip & Fast Search:**
     - Add an instant search bar + category pills (`All`, `Game Sprites`, `Concept Art`, `Video Gen`, `Audio`, `3D & Textures`) directly at `y: 40px`.
  2. **High-Density 5-Column Tool Grid:**
     - Compress cards into a 5-column grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5`).
     - Reduce card height from 220px to 110px (compact icon, bold title, 1-line capability summary, instant `Open Tool →` trigger). Over 15 tools become immediately visible above the fold.
  3. **Slide-Out Tool Drawer:**
     - Instead of expanding forms in-page and pushing content down, clicking any tool card opens a sleek right-side drawer (450px wide) containing the prompt input, aspect ratio picker, model dropdown, and `Generate` CTA.

---

### Page 13: `/meshy` (Meshy 3D Generation Studio)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page13_meshy_top` (`page13_meshy_top_1789424268818.png`)
  - Mouse Scrolled: `page13_meshy_scrolled` (`page13_meshy_scrolled_1789424270347.png`)
  - Full Page Height: ~1,500 px (Extremely sparse, scrolls immediately into footer)
- **Current Layout Deficiencies:**
  - **Missing 3D Viewport Above the Fold:** The page presents an API key warning, a text prompt input, and an image URL field in a stacked card, but lacks an interactive WebGL 3D preview canvas.
  - **Immediate Drop to Footer:** Mouse scrolling immediately drops the user into the generic site footer with no recent generation gallery or asset inspector.
- **Compact & Professional Improvement Plan:**
  1. **Interactive Split-Screen Studio (Zero-Scroll 100vh):**
     - **Left Column (35%):** Prompt input, reference image dropzone, topology settings (Polycount: Low / Mid / High), texture resolution (512 / 1024 / 2048), and `Generate 3D Model` button.
     - **Right Column (65%):** Embedded interactive WebGL canvas (Three.js / Babylon) allowing immediate 360-degree rotation, zoom, wireframe toggle, and lighting adjustment.
  2. **Horizontal Asset History Drawer:**
     - Add a slide-up bottom tray (height: 70px) displaying thumbnails of previous 3D generations with 1-click `Export GLB / OBJ` actions.
  3. **Zero Scrolling Needed:** The complete 3D prompt-to-model workflow is performed without a single mouse wheel turn.

---

### Page 14: `/stock` (Free Stock Images & Video Assets)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page14_stock_top` (`page14_stock_top_1789424280066.png`)
  - Mouse Scrolled: `page14_stock_scrolled` (`page14_stock_scrolled_1789424281219.png`)
  - Full Page Height: ~4,200 px
- **Current Layout Deficiencies:**
  - **Inverted UX Hierarchy:** 10 large visual preset cards (Dungeon Backdrop, Neon City, Boss Arena, etc.) fill the entire top screen, burying the primary search bar, format filters (Photos vs. Videos), orientation dropdown, and results grid 600px below the fold.
- **Compact & Professional Improvement Plan:**
  1. **Top Hero Search Engine Bar:**
     - Move the search input bar, `Photos` / `Videos` toggle, orientation selector (`All`, `Landscape`, `Portrait`), and `Surprise Me` button directly into a sleek 48px sticky header.
  2. **Horizontal Preset Chip Carousel:**
     - Convert the 10 giant cards into a compact 1-line horizontal chip carousel (height: 32px) beneath the search bar.
  3. **High-Density 4-Column Masonry Results Grid:**
     - Render asset results immediately beneath the search bar above the fold.
     - Cards feature instant hover preview (hovering over video plays mini-loop), 1-click `Copy Attribution`, and `Download Full Res` buttons.

---

### Page 15: `/vault` (Private Asset Vault & Storage)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page15_vault_top` (`page15_vault_top_1789424292479.png`)
  - Mouse Scrolled: `page15_vault_scrolled` (`page15_vault_scrolled_1789424293888.png`)
  - Full Page Height: ~4,300 px
- **Current Layout Deficiencies:**
  - **Marketing Cards Obscure File Management:** 8 large ecosystem cards (UnitUnite, Orgs & Teams, Timer & Work Diary, Invoices, Tax Info Bot, etc.) take up the entire top viewport.
  - **Submerged File Dropzone:** Users must scroll down 600px just to reach their file list, upload dropzone, scope filters (`Personal`, `Team`, `Org`), and storage meter.
- **Compact & Professional Improvement Plan:**
  1. **Drive-Style Header Toolbar:**
     - Top bar (44px): Scope selector tabs (`Personal Files`, `Team Shares`, `Org Vault`, `Trash`) + compact storage gauge (`32.4 MB / 500 MB (6%) used`) + `+ Upload Files` button.
  2. **Immediate Dropzone & High-Density File Table:**
     - Replace marketing cards with a compact drag-and-drop target (height: 64px) placed directly above a high-density file table.
     - Table columns: `Type Icon` | `Name` | `Size` | `Modified` | `Access Scope` | `Actions (Download, Rename, Share, Trash)`.
     - Dense rows (`h-9` / 36px per row) allow 12-15 files to be visible without scrolling.
  3. **Sidebar Navigation for Suite Links:**
     - Move the 8 cross-suite links into a collapsible 48px left icon sidebar.

---

## Batch 4: Gaming, 3D Rendering & Discovery (Pages 16 to 20)

### Page 16: `/submit` (Submit Game / Creator Onboarding)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page16_submit_top` (`page16_submit_top_1789424409395.png`)
  - Mouse Scrolled: `page16_submit_scrolled` (`page16_submit_scrolled_1789424410712.png`)
  - Full Page Height: ~3,400 px
- **Current Layout Deficiencies:**
  - **Stacked Form Controls Below the Fold:** The submission form (Game Title, Slug, Description, HTML5 Zip Upload, Thumbnail, Pricing Model, and Developer Contract terms) is vertically stacked across multiple screens.
  - **Giant Instruction Banners:** Large onboarding advice boxes push the file uploader and submission button down ~700px.
- **Compact & Professional Improvement Plan:**
  1. **2-Column Developer Onboarding Cockpit:**
     - **Left Column (45%):** Game metadata (Title, Slug, Category dropdown, Engine/Framework tag pills).
     - **Right Column (55%):** Drag-and-drop zip package dropzone (height: 120px) + thumbnail upload + revenue share selector (`Free`, `Vibe Coins`, `Direct Tip`).
  2. **Inline Stepper:**
     - Replace long instruction paragraphs with a 3-step horizontal progress ribbon (`1 Metadata -> 2 Assets -> 3 Review & Sign`).
  3. **Docked Submit Button:**
     - Keep the `Publish Game to Arcade` button pinned to the bottom right of the cockpit, enabling complete zero-scroll submission.

---

### Page 17: `/newgameplus` (New Game Plus / AI Game Generator)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page17_ngplus_top` (`page17_ngplus_top_1789424453392.png`)
  - Mouse Scrolled: `page17_ngplus_scrolled` (`page17_ngplus_scrolled_1789424457878.png`)
  - Full Page Height: ~2,800 px
- **Current Layout Deficiencies:**
  - **Oversized Hero & Body Text:** Large heading ("TYPE A PROMPT. GET A TESTED GAME.") and extensive paragraph explanation occupy ~40% of the initial screen.
  - **Vertical Stacked Form:** Form controls (Prompt, Quality slider, Budget input, Auto-approve ceiling, Org Draft folder dropdown, Archetype picker, Style notes, Launch CTA) are stacked in a single long vertical column requiring ~1,400px of scrolling.
  - **Unused Right Panel:** The right pane is an empty placeholder card during creation ("Your tested game lands here..."), creating dead space.
- **Compact & Professional Improvement Plan:**
  1. **Header Reduction:**
     - Collapse explanatory body copy into an info badge or tooltip icon button.
  2. **Dense Multi-Row Form Grid:**
     - Reorganize form fields into a 2-column grid in the left panel (Row 1: Prompt Textarea; Row 2: Quality Slider & Budget; Row 3: Archetype & Org Draft; Row 4: Launch CTA).
  3. **Sticky Side-by-Side Preview Panel:**
     - Keep the game output/preview card fixed on the right pane so prompt creation and live preview results are visible simultaneously within a single `100vh` window without scrolling.
  4. **Tighten Spacing:**
     - Reduce form group vertical margins to `gap-2` and set helper text to `text-xs`.

---

### Page 18: `/blender` (Blender Remote Rendering Hub)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page18_blender_top` (`page18_blender_top_1789424464793.png`)
  - Mouse Scrolled: `page18_blender_scrolled` (`page18_blender_scrolled_1789424469073.png`)
  - Full Page Height: ~3,100 px
- **Current Layout Deficiencies:**
  - **Action Hidden Below Fold:** The primary actionable tool ("New render" file upload box) is pushed off-screen by hero headers, 3 step cards ("1. Bring a scene", "2. Pick frames", "3. Get the mp4"), and a separate pricing info box.
  - **Excessive Spacing:** Margin spacing between section headers and cards creates unnecessary vertical inflation.
- **Compact & Professional Improvement Plan:**
  1. **Action First Layout:**
     - Position the "New render" file upload dropzone at the top of the viewport.
  2. **Inline Step Bar:**
     - Replace the 3 separate large step cards with a sleek, 1-line horizontal step bar (`1. Upload .blend → 2. Set Frames → 3. Render MP4`) placed directly above the uploader.
  3. **Badge Pricing:**
     - Embed pricing info ("Pinned RTX 4090 · ~1.65 coins/min") directly into the header of the upload card as a pill badge.
  4. **Split Screen (Zero-Scroll 100vh):**
     - Position the Uploader and "Your renders" history table side-by-side inside a 2-column container designed to fit within `100vh`.

---

### Page 19: `/xonotic` (Xonotic Dedicated Arena)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page19_xonotic_top` (`page19_xonotic_top_1789424496779.png`)
  - Mouse Scrolled: `page19_xonotic_scrolled` (`page19_xonotic_scrolled_1789424501513.png`)
  - Full Page Height: ~2,900 px
- **Current Layout Deficiencies:**
  - **CTA Pushed Off-Screen:** Detailed bullet list explanation and prerequisite notices push the primary call-to-action button ("Autoplay Xonotic on gpu-boosted") below the initial viewport fold.
  - **Redundant Warning Callouts:** Multiple warning boxes explain desktop app requirements across different areas.
- **Compact & Professional Improvement Plan:**
  1. **Compact Header & Accordion:**
     - Condense header copy into a single summary sentence and move bullet points into a collapsible `<details>` accordion or popover menu.
  2. **Single Inline Control Bar:**
     - Place Remote selector dropdown, Site mode toggle, Desktop App status indicator, and the primary "Autoplay" CTA on a single inline horizontal control bar.
  3. **Top Banner Alert:**
     - Display a small top banner for missing desktop app requirements instead of nested callout boxes.
  4. **Zero-Scroll Viewport:**
     - Adjust container heights so configuration and launch can be executed immediately upon landing without scrolling.

---

### Page 20: `/search` (Global Search & Directory Lookup)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page20_search_top` (`page20_search_top_1789424512176.png`)
  - Mouse Scrolled: `page20_search_scrolled` (`page20_search_scrolled_1789424518016.png`)
  - Full Page Height: ~2,600 px
- **Current Layout Deficiencies:**
  - **Oversized Title Banner:** "FIND YOUR WEIRD." heading and description consume valuable vertical space.
  - **Search Input Position:** The search bar sits mid-page, leaving narrow vertical room for search results before pushing down to the global site footer.
- **Compact & Professional Improvement Plan:**
  1. **Command-K / Spotlight UI:**
     - Redesign into a modern search interface with a top-pinned search box accompanied by horizontal category filter pills (`[All]` `[Games]` `[Docs]` `[Clans]` `[Servers]`).
  2. **Full Viewport Results Container:**
     - Expand the search results panel to fill `calc(100vh - nav_height)` with internal scrolling for results, preventing page-level overflow into the footer.
  3. **Tight Typography & Margins:**
     - Reduce heading scale to `text-xl` and eliminate bottom margins on search containers.

---

## Batch 5: Community, Tournaments & Bots (Pages 21 to 25)

### Page 21: `/clans` (Clans Directory & Guild Management)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page21_clans_top` (`page21_clans_top_1789424551796.png`)
  - Mouse Scrolled: `page21_clans_scrolled` (`page21_clans_scrolled_1789424558273.png`)
  - Full Page Height: ~3,600 px
- **Current Layout Deficiencies:**
  - **Start a Clan Form Displaces Listings:** A massive multi-field card ("Start a clan") occupies the prime real estate of the top viewport, pushing active clans completely below the fold.
  - **Sub-filters Positioned Below Creation:** Category pills ("All clans", "hclans", "sclans", "bclans") appear beneath the creation card rather than at the top of the directory.
  - **Spacious Clan Cards:** Existing clan listings (`mattyjacks`, `4weird`) feature generous vertical padding and tall margins.
- **Compact & Professional Improvement Plan:**
  1. **Collapsible Creation Trigger / Modal:**
     - Move "Start a clan" into a top-right `+ Create Clan` action button that opens a clean modal or slide-over drawer, bringing the clan directory immediately into the top viewport fold.
  2. **Unified Search & Filter Header:**
     - Combine clan type filter pills (`All`, `hclan`, `sclan`, `bclan`), search input, and sorting dropdowns into a single 44px horizontal toolbar.
  3. **High-Density 3-Column Clan Grid:**
     - Format clan cards into a compact 3-column grid (`p-3.5`) featuring clan crest/avatar, member count badge, tag, level, and a 1-click `Join / View Clan` button.

---

### Page 22: `/bot/setup` (Bot Setup & Webhook Gateway)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page22_botsetup_top` (`page22_botsetup_top_1789424564515.png`)
  - Mouse Scrolled: `page22_botsetup_scrolled` (`page22_botsetup_scrolled_1789424571595.png`)
  - Full Page Height: ~1,800 px
- **Current Layout Deficiencies:**
  - **Auth Redirect Without Teaser:** Unauthenticated users are redirected to `/auth/login?next=/bot/setup` with a solitary login card surrounded by empty space, giving no preview of bot gateway capabilities.
  - **Padded Margins:** Excessive vertical padding inflates the sign-in container.
- **Compact & Professional Improvement Plan:**
  1. **Split-Screen Teaser & Auth:**
     - Left Column (55%): Interactive preview of Bot Gateway docs, webhook payload structure, and automated bot rewards.
     - Right Column (45%): Compact sign-in form.
  2. **Authenticated 3-Step Wizard (Zero-Scroll):**
     - For authenticated users, organize the setup into a compact 1-row horizontal stepper: `Step 1: API Token` → `Step 2: Webhook Endpoint` → `Step 3: Verification Ping`.
     - Output live payload responses inside a compact terminal window right beside the form.

---

### Page 23: `/bot/bclans` (Bot Clans Battle Arena)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page23_bclans_top` (`page23_bclans_top_1789424580315.png`)
  - Mouse Scrolled: `page23_bclans_scrolled` (`page23_bclans_scrolled_1789424586346.png`)
  - Full Page Height: ~3,200 px
- **Current Layout Deficiencies:**
  - **Bulky Stacked Action Cards:** Full-width stacked containers for "Bot key", "Read + join", and "Post as your human" force constant vertical scrolling to perform bot actions.
  - **Navigational Waste:** Sprawling pill navigation tabs consume top vertical space before any bot command can be issued.
- **Compact & Professional Improvement Plan:**
  1. **Developer Playground Split Console:**
     - Convert into a 2-pane API workbench:
       - **Left Panel (50%):** Bot Key input, Target Clan dropdown, Action selector (`Join`, `Post Message`, `Challenge`), and Submit CTA.
       - **Right Panel (50%):** Live JSON response viewer, cURL snippet generator, and response latency monitor.
  2. **Sticky Bot Authentication Strip:**
     - Keep Bot Key authentication status in a slim 36px top toolbar so developers don't have to scroll back up to verify credentials.

---

### Page 24: `/leaderboards` (Global Leaderboards & High Scores)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page24_leaderboards_top` (`page24_leaderboards_top_1789424594643.png`)
  - Mouse Scrolled: `page24_leaderboards_scrolled` (`page24_leaderboards_scrolled_1789424603358.png`)
  - Full Page Height: ~1,600 px
- **Current Layout Deficiencies:**
  - **Sparse Empty State:** When no scores are recorded, a solitary text notice ("No scores yet; be the first to play.") leaves huge dead space above an early footer.
  - **Stacked Dropdown Controls:** Game selector and metric dropdowns are loosely stacked with excessive vertical padding.
- **Compact & Professional Improvement Plan:**
  1. **Unified Filter Toolbar:**
     - Combine Game picker, metric toggle (`High Score`, `Kills`, `Speedrun Time`), and timeframe filter (`All Time`, `Weekly`, `Today`) into a single 40px horizontal control bar.
  2. **High-Density Leaderboard Table:**
     - Render rankings in a tight striped table: `Rank #` (with gold/silver/bronze icons) | `Player Handle` | `Clan Badge` | `Score` | `Verified Timestamp`.
     - Row height: 36px (`py-1.5`), displaying top 20 players without scrolling.
  3. **Call-to-Action Empty State:**
     - Replace blank text with a visually styled, compact challenge card featuring an instant `Launch Game & Set Score` button.

---

### Page 25: `/lobbies` (Multiplayer Lobbies & Matchmaking)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page25_lobbies_top` (`page25_lobbies_top_1789424610125.png`)
  - Mouse Scrolled: `page25_lobbies_scrolled` (`page25_lobbies_scrolled_1789424617439.png`)
  - Full Page Height: ~2,400 px
- **Current Layout Deficiencies:**
  - **Oversized Auth Banners:** Multiple stacked callout cards ("Sign in to browse and join lobbies", "GraveGain party Sign in...") obstruct lobby discovery.
  - **Disconnected Filter & Refresh:** Game dropdown and refresh actions sit in an isolated bulky block with wide margins.
- **Compact & Professional Improvement Plan:**
  1. **Compact Lobby Control Toolbar:**
     - Merge Game selector dropdown, region filter, auto-refresh toggle (with countdown ring), and a prominent `+ Create Lobby` button into a streamlined top bar.
  2. **Live Matchmaking Grid / Table:**
     - Present active rooms in a compact table: `Status` (Open / In-Game) | `Game Title` | `Players (e.g. 3/4)` | `Map / Mode` | `Host` | `Ping Latency` | `Quick Join CTA`.
  3. **Non-Blocking Auth Prompt:**
     - Replace full-width blocking cards with a slim top banner allowing visitors to see active rooms immediately, prompting login only upon clicking "Join" or "Create".

---

## Batch 6: Creator Economy & Business Suite (Pages 26 to 30)

### Page 26: `/support` (Creator Tipping & Subscription Tiers)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page26_support_top` (`page26_support_top_1789424667944.png`)
  - Mouse Scrolled: `page26_support_scrolled` (`page26_support_scrolled_1789424674261.png`)
  - Full Page Height: ~3,700 px
- **Current Layout Deficiencies:**
  - **Overwhelming Legal Header:** A large hero section ("BACK THE WEIRD YOU LOVE.") followed by 12+ lines of legal disclaimers and a yellow warning box consumes almost the entire top viewport.
  - **Vertical Flow:** Tiers, tipping forms ("Send a one-time tip"), user subscriptions, and "Offer a tier" form controls are stacked vertically in single columns, forcing multi-screen scrolling.
- **Compact & Professional Improvement Plan:**
  1. **Collapsible Legal Accordion:**
     - Move terms and legal text into a collapsible popover or compact tooltip trigger to regain top viewport real estate.
  2. **Side-by-Side 2-Column Grid:**
     - Place creator tipping tiers and subscription lists in the left column, and one-time tipping / tier creation forms in the right column.
  3. **Streamlined Tip Calculator:**
     - Replace tall form inputs with a compact inline chip selector (`$5` | `$10` | `$25` | `Custom`) + instant checkout button.

---

### Page 27: `/fundraisers` (Crowdfunding & Game Campaigns)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page27_fundraisers_top` (`page27_fundraisers_top_1789424679673.png`)
  - Mouse Scrolled: `page27_fundraisers_scrolled` (`page27_fundraisers_scrolled_1789424686423.png`)
  - Full Page Height: ~3,300 px
- **Current Layout Deficiencies:**
  - **Redundant Disclaimers:** Two separate multi-paragraph notice boxes ("Fundraisers are disabled for now...") are stacked vertically.
  - **Bulky Legend Grid:** The "What each emoji means" section uses a 2x2 card layout that pushes campaign content below the fold.
- **Compact & Professional Improvement Plan:**
  1. **Unified Banner Notice:**
     - Consolidate system availability disclaimers into a single dismissible alert bar at the top.
  2. **Inline Info Popover:**
     - Move emoji definitions into a subtle info badge popover legend.
  3. **3-Column Campaign Grid:**
     - Display active and past campaigns with goal progress bars and donation CTAs immediately above the fold in a responsive 3-column grid.

---

### Page 28: `/business` (Business Command Center & Suite Hub)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page28_business_top` (`page28_business_top_1789424692476.png`)
  - Mouse Scrolled: `page28_business_scrolled` (`page28_business_scrolled_1789424699425.png`)
  - Full Page Height: ~3,500 px
- **Current Layout Deficiencies:**
  - **Hero Waste:** Large heading ("RUN THE COMPANY LIKE YOU RUN A SQUAD.") and CTA buttons dominate the top area without providing direct business utility or high-level status.
  - **Tall Card Layout:** 8 business module cards (UnitUnite, Orgs & Teams, Timer, Projects, Invoices, Tax Info Bot, Business CRM, Team Management) are laid out in tall 2-column cards.
- **Compact & Professional Improvement Plan:**
  1. **KPI Command Header:**
     - Replace hero banner with a compact KPI dashboard header showing active metrics (Active Timers, Unpaid Invoices, Open CRM Leads, Squad Members).
  2. **4-Column Module Grid:**
     - Refactor module cards into a sleek 4-column icon-based matrix with quick-action shortcuts (e.g. `+ New Invoice` right on the Invoices module card).
  3. **Zero-Scroll Overview:**
     - Display the entire organization overview within a single screen view.

---

### Page 29: `/business/crm` (Customer Relationship Manager)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page29_crm_top` (`page29_crm_top_1789424707795.png`)
  - Mouse Scrolled: `page29_crm_scrolled` (`page29_crm_scrolled_1789424715324.png`)
  - Full Page Height: ~2,200 px
- **Current Layout Deficiencies:**
  - **Sparse Empty State:** When unauthenticated or without an active org, the view displays "Authentication required." with empty tab counters, leaving large empty vertical gaps.
  - **Padding:** Excess padding surrounding the CRM sub-header and tab menu forces the footer to appear rapidly on minor scrolling.
- **Compact & Professional Improvement Plan:**
  1. **Interactive Demo State:**
     - Show a pre-populated preview layout (dummy pipeline kanban cards & contact table rows) so new users immediately understand the feature value.
  2. **Full-Width Kanban & Table:**
     - Use full width density for the pipeline columns and contact list tables to maximize usable screen real estate.
  3. **Docked Quick-Add Toolbar:**
     - Position `+ Add Lead / Contact` directly in a 36px top toolbar with quick status pill filters (`Lead`, `Active`, `Closed`, `Archived`).

---

### Page 30: `/business/invoices` (Invoice Tracker & Builder)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page30_invoices_top` (`page30_invoices_top_1789424722511.png`)
  - Mouse Scrolled: `page30_invoices_scrolled` (`page30_invoices_scrolled_1789424729735.png`)
  - Full Page Height: ~4,600 px
- **Current Layout Deficiencies:**
  - **Dominant Inline Draft Form:** The "New invoice (draft)" form with 12+ fields is expanded inline by default, completely burying the actual Invoice Ledger table under the fold.
  - **Disclaimers Taking Up Space:** The non-tax invoice warning banner adds vertical height above the controls.
- **Compact & Professional Improvement Plan:**
  1. **Drawer / Modal Creation Flow:**
     - Hide the full draft creation form behind a primary `+ Create Invoice` button in the filter header bar, opening it inside a side-drawer or modal dialog.
  2. **Ledger-First Layout:**
     - Display the invoice ledger table directly below the filter header bar with status badges (`Draft`, `Sent`, `Paid`, `Overdue`) and inline row action buttons (`Download PDF`, `Mark Paid`, `Send Link`).
  3. **High-Density Table Rows:**
     - Row height: 36px, with total outstanding balance KPI ribbon pinned above the table.

---

## Batch 7: Business Finance, Operations & MMO (Pages 31 to 35)

### Page 31: `/business/tax` (Freelance Tax Estimator & Ledger)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page31_tax_top` (`page31_tax_top_1789424765410.png`)
  - Mouse Scrolled: `page31_tax_scrolled` (`page31_tax_scrolled_1789424771130.png`)
  - Full Page Height: ~2,900 px
- **Current Layout Deficiencies:**
  - **Header Preamble & Disclaimer Waste:** Top disclaimer notice ("Rough planning math only...") and expansive margins push the calculation card down.
  - **Vertically Stacked Calculation Panels:** Estimate input fields and the worked tax breakdown tables are stacked vertically in column 1, pushing essential net income math below the fold.
  - **Dead Space in Receipts Panel:** The right-hand Receipts card contains excessive unused dark void underneath the receipt totals.
- **Compact & Professional Improvement Plan:**
  1. **Inline Disclaimer & Compact Title Bar:**
     - Collapse the lengthy tax disclaimer into an inline info badge or tooltip beside the title, saving 60px of vertical space.
  2. **Unified 2-Column Dashboard (Zero-Scroll 100vh):**
     - **Left Column (50%):** Combined input fields and dynamic calculation breakdown table (Income, Deductions, Self-Employment Tax, Est. Quarterly Payments) updating live without scrolling.
     - **Right Column (50%):** High-density Receipts ledger table with inline `+ Log Expense` quick inputs and 1-click CSV export.

---

### Page 32: `/work` (Work Console & Bounties)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page32_work_top` (`page32_work_top_1789424780346.png`)
  - Mouse Scrolled: `page32_work_scrolled` (`page32_work_scrolled_1789424786145.png`)
  - Full Page Height: ~2,500 px
- **Current Layout Deficiencies:**
  - **Loud Yellow Alert Banner:** A prominent yellow-bordered "Monitoring Disclosure" banner occupies the most visible screen real estate at the top of the viewport.
  - **Bulky High-Contrast Cards:** The "Safe actions" shortcut cards (Vault, Swarm, Agents, Desktop, Squads, Timer) use high-contrast white backgrounds with tall vertical padding.
  - **Static Code Block for IT Requests:** The "Ask IT" section presents a static cURL/JSON code snippet (`POST /api/it/requests`) rather than an interactive form.
- **Compact & Professional Improvement Plan:**
  1. **Slim Alert Ribbon:**
     - Replace the giant yellow card with a sleek, dismissible 28px top warning pill bar (`[i] Device telemetry logged for active contracts`).
  2. **High-Density Dark Theme 3x2 Matrix:**
     - Convert the bright white action cards into sleek dark-mode glassmorphic cards with compact icons, 1-line tooltips, and zero vertical margin waste.
  3. **Interactive Mini Request Form:**
     - Replace the static JSON code box with a clean 2-input interactive form (`Tool / Permission Needed`, `Business Justification`, `Submit Request →`).

---

### Page 33: `/mmo` (MMO Universe & World Browser)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page33_mmo_top` (`page33_mmo_top_1789424797547.png`)
  - Mouse Scrolled: `page33_mmo_scrolled` (`page33_mmo_scrolled_1789424803995.png`)
  - Full Page Height: ~4,400 px
- **Current Layout Deficiencies:**
  - **Submerged Realm Directory:** An oversized 2-line hero title ("PICK YOUR REALM. RALLY YOUR PARTY.") and descriptive paragraph push the active realm cards below the fold.
  - **Sprawling 3-Column Grid:** Large card margins force users to scroll through 11 realms across ~4,400 pixels.
- **Compact & Professional Improvement Plan:**
  1. **Consolidated Command Header:**
     - Merge hero title, filter dropdowns (Game, Age Band), and the "Rent a Realm" CTA button into a unified 48px sticky header.
  2. **4-Column High-Density Realm Matrix:**
     - Transition realm cards into a 4-column compact grid (Height: 160px) showing realm name, dimension tag (`2D`, `4D`, `5D`), live player counter, coin cost badge, and instant `Enter World →` button.
  3. **Table View Toggle:**
     - Provide a 1-click switcher between Grid View and compact Table View for power users and guild leaders.

---

### Page 34: `/mmo/rent` (MMO Server Rental Portal)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page34_mmorent_top` (`page34_mmorent_top_1789424816460.png`)
  - Mouse Scrolled: `page34_mmorent_scrolled` (`page34_mmorent_scrolled_1789424823909.png`)
  - Full Page Height: ~2,600 px
- **Current Layout Deficiencies:**
  - **Single Column Form with Wide Margins:** The rental configurator is a narrow vertical form floating in empty desktop margins.
  - **Hidden Live Quote:** Users must adjust inputs and then scroll down to hit "Get live quote" to view pricing and specs.
- **Compact & Professional Improvement Plan:**
  1. **2-Column Split Configurator (Zero-Scroll 100vh):**
     - **Left Column (55%):** Server options (Game selector, Dimension radio pills, Age band, Host-free mode, Duration hours slider).
     - **Right Column (45%):** Live real-time pricing quote (Coins/Hour, Monthly Total), allocated CPU/RAM specs, server region map, and prominent `Deploy Realm Instance` action button.
  2. **Zero-Scroll Workflow:**
     - Entire server sizing, cost projection, and instant checkout happen without touching the mouse scroll wheel.

---

### Page 35: `/games/servers` (Dedicated Game Servers Catalog)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page35_gameservers_top` (`page35_gameservers_top_1789424841033.png`)
  - Mouse Scrolled: `page35_gameservers_scrolled` (`page35_gameservers_scrolled_1789424851881.png`)
  - Full Page Height: ~2,800 px
- **Current Layout Deficiencies:**
  - **Broken Filter Alignment:** The "Refresh" button wraps onto its own orphan line below the Dimension, Age band, and Population dropdowns.
  - **Unstructured Empty State:** When servers are offline, an empty text card collapses abruptly into the footer.
- **Compact & Professional Improvement Plan:**
  1. **Unified Single-Row Toolbar:**
     - Align Dimension, Age band, Population dropdowns, search bar, auto-refresh toggle, and "Rent Room" CTA into a clean, horizontal toolbar.
  2. **Standardized Server List Table:**
     - Render servers in a structured table: `Status` (Online/Offline) | `Server Name` | `Dimension` | `Region` | `Players (e.g. 12/32)` | `Ping Latency (ms)` | `Direct Connect`.
  3. **In-Table Skeleton Empty State:**
     - Render placeholder table rows with a clear "All current rooms full — spin up an on-demand node" prompt.

---

## Batch 8: Compliance, Developer & Compute Nodes (Pages 36 to 40)

### Page 36: `/bouncer` (Email Deliverability & Toxicity Checker)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page36_bouncer_top` (`page36_bouncer_top_1789424891140.png`)
  - Mouse Scrolled: `page36_bouncer_scrolled` (`page36_bouncer_scrolled_1789424892257.png`)
  - Full Page Height: ~2,500 px
- **Current Layout Deficiencies:**
  - **Stacked Input & Results Layout:** An input textarea (up to 50 email addresses) is stacked vertically above the results card ("No results yet"), pushing the toxicity breakdown and spam score table below the fold.
  - **Excessive Spacing & Margins:** The action toolbar (`Check all (0)`, `Export CSV`, `Clear`) sits between wide margins, stretching the page vertically.
- **Compact & Professional Improvement Plan:**
  1. **2-Column Verification Workbench (Zero-Scroll 100vh):**
     - **Left Column (45%):** Email textarea input with embedded header counts (`12/50 emails entered`) + attached bottom action bar (`Check All`, `Paste from Clipboard`, `Clear`).
     - **Right Column (55%):** Real-time Spam Score gauge (visual circular SVG meter) + Toxicity risk table with status chips (`Deliverable`, `Risky`, `Invalid`, `Spam Trap`).
  2. **Zero-Scroll Completion:**
     - Reduces vertical height by 40%, ensuring all verification inputs and live scorecard results are visible without mouse scrolling.

---

### Page 37: `/easydnc` (EasyDNC Phone Compliance & Scrubbing)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page37_easydnc_top` (`page37_easydnc_top_1789424897384.png`)
  - Mouse Scrolled: `page37_easydnc_scrolled` (`page37_easydnc_scrolled_1789424898510.png`)
  - Full Page Height: ~3,100 px
- **Current Layout Deficiencies:**
  - **Large Legal Warnings Displace Scrubbing Tool:** FTC TSR Safe Harbor compliance explanations, statutory fine notices ("Up to $51,744 per violation"), and credentials billing bars push the primary lead list upload dropzone below the fold.
- **Compact & Professional Improvement Plan:**
  1. **Compact Compliance Badge Ribbon:**
     - Condense FTC statutory warnings and Safe Harbor policy text into a sleek, 28px compliance pill banner at the top with an info tooltip.
  2. **Direct Action First Viewport:**
     - Bring the bulk CSV lead list dropzone (`Upload Lead List or Outscraper CSV`) and quick single-phone scrub lookup bar directly into the top viewport.
  3. **High-Density Results Ledger:**
     - Render scrubbed phone numbers in a dense 4-column table: `Phone Number` | `DNC Status (Clean / Blacklisted)` | `National / State Registry Match` | `Litigator Risk Flag`.

---

### Page 38: `/builder` (Desktop App Installer Builder)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page38_builder_top` (`page38_builder_top_1789424904732.png`)
  - Mouse Scrolled: `page38_builder_scrolled` (`page38_builder_scrolled_1789424905844.png`)
  - Full Page Height: ~3,400 px
- **Current Layout Deficiencies:**
  - **Vertically Stacked Form Fields:** Project Name, Version, Platform checkboxes, Icon picker, License selector, and Bundled runtime options are arranged in a single long vertical column.
  - **Submerged Export Actions:** The live JSON preview box and critical export buttons (`Download JSON`, `Copy JSON`, `Reset`) are pushed completely off-screen.
- **Compact & Professional Improvement Plan:**
  1. **2-Column Split Scaffolder (Zero-Scroll 100vh):**
     - **Left Column (50%):** High-density form inputs (Project name & Version side-by-side; horizontal platform icon pill toggles `[Windows]` `[macOS]` `[Linux]`; runtime checkboxes in a compact 2x2 grid).
     - **Right Column (50%):** Fixed-height, syntax-highlighted Live Config JSON preview pane matching the form height.
  2. **Sticky Command Bar:**
     - Position `Copy Config JSON`, `Download config.json`, and `Build Installer Package` directly in an aligned top-right toolbar.

---

### Page 39: `/commander` (AI Commander Terminal)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page39_commander_top` (`page39_commander_top_1789424929606.png`)
  - Mouse Scrolled: `page39_commander_scrolled` (`page39_commander_scrolled_1789424935538.png`)
  - Full Page Height: ~2,300 px
- **Current Layout Deficiencies:**
  - **Fixed Outer Margins Submerge Prompt Line:** A Quake-style browser CLI terminal is placed inside large page-level container margins, pushing the active command input line (`4weird$ type help...`) toward the lower edge of the screen.
- **Compact & Professional Improvement Plan:**
  1. **Viewport Fill Shell (Zero-Scroll):**
     - Lock the terminal canvas to `calc(100vh - 72px)` with internal virtualized scrolling for terminal history.
  2. **Pinned Bottom Prompt Line:**
     - Fix the active command prompt line and auto-complete suggestion tray to the bottom of the terminal frame, ensuring it is always visible and focused without mouse scrolling.
  3. **Compact Telemetry Header:**
     - Display active agent connection, token usage, and session uptime inside an embedded 24px retro status bar along the top of the terminal frame.

---

### Page 40: `/gamestudio` (Browser Game Dev Studio)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page40_gamestudio_top` (`page40_gamestudio_top_1789424989742.png`)
  - Mouse Scrolled: `page40_gamestudio_scrolled` (`page40_gamestudio_scrolled_1789424990848.png`)
  - Full Page Height: ~3,600 px
- **Current Layout Deficiencies:**
  - **Bulky Archetype Cards & Stacked Previews:** Three tall template cards (2D Platformer, Top-Down Adventure, Arcade Cabinet) and vertically stacked `project.json` and `README.md` preview boxes require ~1,500px of scrolling to inspect the engine configs.
- **Compact & Professional Improvement Plan:**
  1. **Horizontal Template Selector Strip:**
     - Replace tall cards with a compact horizontal segmented selector (height: 52px) featuring small thumbnail icons, template titles, and Godot engine version badges.
  2. **Tabbed Code Previewer:**
     - Merge `project.json` and `README.md` into a single tabbed code inspection container (`[project.json]` | `[README.md]`) with 1-click `Copy` and `Export Zip` actions.
  3. **Zero-Scroll Studio Dashboard:**
     - The complete project scaffolding flow (Name, Template, Engine target, Preview, and Export) fits cleanly within a single desktop screen.

---

## Batch 9: Code, Terminal, DPS & Media Studio (Pages 41 to 45)

### Page 41: `/code` (Code Audits & Game Submission Inspector)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page41_code_top` (`page41_code_top_1789425040549.png`)
  - Mouse Scrolled: `page41_code_scrolled` (`page41_code_scrolled_1789425046695.png`)
  - Full Page Height: ~2,400 px
- **Current Layout Deficiencies:**
  - **Single Vertical Column Stack:** Lookup input (`/code/[id]`), bulleted feature list ("What you get on an audit page"), and submission guide instructions are stacked in a single vertical column.
  - **Submerged Actions:** Users must scroll past multiple paragraphs to reach the bot documentation links and submission CTAs.
- **Compact & Professional Improvement Plan:**
  1. **2-Column Hero Inspector Unit (Zero-Scroll 100vh):**
     - **Left Column (45%):** Search input (`/code/[id]`) with inline `Open Audit →` button + secondary `Submit Your Game` quick CTA button.
     - **Right Column (55%):** 2x2 grid of compact feature badges (Verdict Status, Findings List, Deep AI Audit, Downloadable Bundle).
  2. **Accordion Panel for Bot Guides:**
     - Condense bot API docs and verification rules into an expandable accordion drawer below the badges.

---

### Page 42: `/terminal` (CryptArt Commander Cloud Shell)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page42_terminal_top` (`page42_terminal_top_1789425057145.png`)
  - Mouse Scrolled: `page42_terminal_scrolled` (`page42_terminal_scrolled_1789425063127.png`)
  - Full Page Height: ~2,500 px
- **Current Layout Deficiencies:**
  - **Detached Pairing Banner:** A large desktop pairing instruction banner sits above the terminal pane, pushing the terminal window down.
  - **Fixed Window Height:** The embedded terminal has a constrained height, resulting in nested scroll clipping while page-level scrolling exists below.
- **Compact & Professional Improvement Plan:**
  1. **Integrated Title Bar Header:**
     - Move desktop pairing status (`Desktop link: not paired — type: desktop pair <code>`) directly into the top window bar of the terminal pane.
  2. **Full-Height Responsive Viewport:**
     - Expand the terminal container dynamically to `calc(100vh - 120px)`.
     - Eliminates double scrollbars and delivers a native desktop terminal experience.

---

### Page 43: `/compute/dps` (Donate Personal Seconds Compute Console)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page43_dps_top` (`page43_dps_top_1789425093822.png`)
  - Mouse Scrolled: `page43_dps_scrolled` (`page43_dps_scrolled_1789425113567.png`)
  - Full Page Height: ~2,700 px
- **Current Layout Deficiencies:**
  - **Raw Text Telemetry Display:** System hardware readouts (CPU cores, RAM, GPU renderer, WebGPU, Downlink) are rendered as plain unstyled text blocks.
  - **Sprawling Sliders:** CPU and GPU share sliders are stacked vertically with wide empty margins.
- **Compact & Professional Improvement Plan:**
  1. **Dashboard Control Panel (Zero-Scroll):**
     - **Left Column (Telemetry):** 4 compact stat metric tiles showing CPU Cores, Memory, GPU Model, and Network Downlink speed.
     - **Right Column (Controls):** Styled dual horizontal range sliders for CPU & GPU allocation, with a segmented pill toggle for availability (`Online` | `Busy` | `Offline`).
  2. **Zero-Scroll Completion:**
     - All telemetry and share controls fit into a single dashboard card positioned directly above the fold.

---

### Page 44: `/compute/p2p` (P2P Compute Sharing Benchmark)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page44_p2p_top` (`page44_p2p_top_1789425126033.png`)
  - Mouse Scrolled: `page44_p2p_scrolled` (`page44_p2p_scrolled_1789425133653.png`)
  - Full Page Height: ~2,300 px
- **Current Layout Deficiencies:**
  - **Fragmented Components:** Device specification badges, local speed test launcher, and privacy disclaimer notes are spaced out in 3 separate vertical blocks.
- **Compact & Professional Improvement Plan:**
  1. **Unified Benchmark Card:**
     - Combine device capability badges (WebGPU availability, CPU cores, RAM), the `Run benchmark` button, and privacy disclosure into a single unified card.
  2. **Inline Controls:**
     - Place the `Run benchmark` CTA button adjacent to hardware capability badges, with the privacy note rendered as a subtle caption inside the same card, eliminating vertical scroll gaps.

---

### Page 45: `/studio` (Creative Media Studio Suite Hub)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page45_studio_top` (`page45_studio_top_1789425152251.png`)
  - Mouse Scrolled: `page45_studio_scrolled` (`page45_studio_scrolled_1789425240559.png`)
  - Full Page Height: ~3,200 px
- **Current Layout Deficiencies:**
  - **Oversized Launcher Cards:** 5 web creation tools (DictatePic canvas, Media Mogul video, Paint, AliveSpeech Lab, DemoRecorder) are displayed in large vertical cards with generous margins, pushing tools 4 and 5 off-screen.
- **Compact & Professional Improvement Plan:**
  1. **Horizontal Launcher Row / 3x2 Grid:**
     - Replace large vertical cards with a compact 5-column horizontal tool strip or a dense 3x2 micro-card layout.
  2. **Inline Category Header:**
     - Integrate category filter buttons (`All`, `Draw`, `Video`, `Sound`) directly into the main page header bar so all 5 studio tools are immediately visible above the fold without mouse scrolling.

---

## Batch 10: Creative Studio Applications (Pages 46 to 50)

### Page 46: `/studio/audio` (AliveSpeech Lab / Audio Mastering & Voice Synthesis)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page46_audio_top` (`page46_audio_top_1789425279809.png`)
  - Mouse Scrolled: `page46_audio_scrolled` (`page46_audio_scrolled_1789425284423.png`)
  - Full Page Height: ~3,300 px
- **Current Layout Deficiencies:**
  - **Oversized Title Block:** "ALIVESPEECH LAB - STUDIO / VOICE CLONING & AUDIO MASTERING" consumes over 280px of vertical space before any audio tools appear.
  - **Vertical 3-Step Card Stack:** Workflow steps (`1 Upload audio`, `2 Real analysis`, `3 Process, compare, export`) are arranged in a vertical card sequence with loose padding.
  - **Submerged Controls:** The empty waveform canvas pushes Gain, Normalization, and A/B Playback controls below the fold.
- **Compact & Professional Improvement Plan:**
  1. **3-Column DAW Workbench Layout (Zero-Scroll 100vh):**
     - **Left Panel (25%):** Audio file upload dropzone, sampling rate, and file specs card.
     - **Center Panel (50%):** High-density waveform visualizer and real-time spectral analyzer canvas.
     - **Right Panel (25%):** Gain adjustment slider, Normalize-to-peak button, A/B playback comparison, and 16-bit WAV Export CTA.
  2. **Zero-Scroll Completion:**
     - Entire mastering and voice synthesis workflow fits within a fixed `100vh` container.

---

### Page 47: `/studio/paint` (DictatePic Layered Raster Drawing)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page47_paint_top` (`page47_paint_top_1789425287922.png`)
  - Mouse Scrolled: `page47_paint_scrolled` (`page47_paint_scrolled_1789425291443.png`)
  - Full Page Height: ~2,400 px
- **Current Layout Deficiencies:**
  - **Non-Responsive Canvas Dimensions:** A static header banner and non-responsive canvas height force essential buttons (`Undo`, `Clear Layer 1`, `Export PNG`) below the screen fold.
- **Compact & Professional Improvement Plan:**
  1. **Floating / Docked Tool Panel:**
     - Remove the marketing banner and dock drawing tools (Brush, Eraser, Stamp, Color palette, Size slider) into a sleek vertical toolbar on the left edge.
  2. **Full-Bleed Responsive Canvas:**
     - Set canvas height dynamically to `calc(100vh - 64px)`.
  3. **Pinned Top-Right Actions:**
     - Place `Export PNG`, `Undo`, and `Redo` as compact icon buttons in the top-right corner of the canvas, ensuring zero vertical scrolling during drawing sessions.

---

### Page 48: `/studio/recorder` (DemoRecorder Screen Recording & Input Logger)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page48_recorder_top` (`page48_recorder_top_1789425295304.png`)
  - Mouse Scrolled: `page48_recorder_scrolled` (`page48_recorder_scrolled_1789425299653.png`)
  - Full Page Height: ~2,600 px
- **Current Layout Deficiencies:**
  - **Stacked Video Monitor:** Large hero text and a giant black video preview box occupy the viewport, forcing users to scroll down to check recording status or download `.webm` and JSON event logs.
- **Compact & Professional Improvement Plan:**
  1. **Split-Screen Studio Console (Zero-Scroll 100vh):**
     - **Left Column (40%):** Capture controls, input logging toggles (Mouse events, Keystrokes, Timestamps), live recording timer, and instant `Export WebM` / `Export JSON` buttons.
     - **Right Column (60%):** Responsive live screen preview monitor scaled cleanly to viewport bounds.
  2. **Single-Viewport Recording:**
     - Complete recording setup, live capture monitoring, and asset downloading performed on a single screen without scrolling.

---

### Page 49: `/studio/image` (DictatePic Canvas Editor / Wave 3)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page49_image_top` (`page49_image_top_1789425304617.png`)
  - Mouse Scrolled: `page49_image_scrolled` (`page49_image_scrolled_1789425313692.png`)
  - Full Page Height: ~2,800 px
- **Current Layout Deficiencies:**
  - **Vertical Sidebar Overflow:** In the 3-column layout (Tools, Canvas, Layers/Spritesheet Slice), the left tool list and right layer list are stacked vertically with loose spacing, causing both sidebars and export actions to be cut off at the bottom.
- **Compact & Professional Improvement Plan:**
  1. **2-Column Compact Icon Palette:**
     - Compress left tools into a 2-column icon grid (Aseprite / Photoshop style).
  2. **Tabbed Inspector Sidebar:**
     - Consolidate right sidebar into tabbed panels (`[Layers]` | `[Spritesheet Slicer]`) to prevent vertical overflow.
  3. **100vh Studio Lock:**
     - Lock the entire studio container to `100vh` with the primary `Export PNG` button pinned to the upper right.

---

### Page 50: `/studio/video` (Media Mogul Video Timeline Studio)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page50_video_top` (`page50_video_top_1789425320174.png`)
  - Mouse Scrolled: `page50_video_scrolled` (`page50_video_scrolled_1789425324939.png`)
  - Full Page Height: ~3,400 px
- **Current Layout Deficiencies:**
  - **Separated Preview & Timeline:** Large header and vertically stacked media assets push the 4-track timeline editor (Video 1, Video 2 Overlay, Audio 1 Music, Audio 2 Voiceover) below the preview window. Users cannot edit cuts and monitor playback simultaneously without constant scrolling.
- **Compact & Professional Improvement Plan:**
  1. **Standard Professional NLE Cockpit (100vh Zero-Scroll):**
     - **Top Header Bar (40px):** Project title, timeline timecode (`00:01:24:12`), and `Export Render Worker →` CTA.
     - **Top-Left (35%):** Compact Media Asset Bin with drag-and-drop support.
     - **Top-Right (65%):** Real-time Video Preview Monitor with transport controls.
     - **Bottom Row (Fixed 240px):** Full-width 4-track Timeline Editor with inline playhead scrub, razor blade split tool, magnetic snap toggle, and zoom slider.
  2. **Result:** Desktop-grade NLE workflow on the web with zero page scrolling.

---

## Batch 11: Music Studio & Web Utilities Suite (Pages 51 to 55)

### Page 51: `/music` (Tiny Songs Music Catalog & Player)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page51_music_top` (`page51_music_top_1789425390310.png`)
  - Mouse Scrolled: `page51_music_scrolled` (`page51_music_scrolled_1789425393716.png`)
  - Full Page Height: ~3,100 px
- **Current Layout Deficiencies:**
  - **Oversized Marketing Header:** "TINY SONGS, PLAYABLE INSTANTLY." banner creates excessive dead space above the music library.
  - **Low-Density Grid:** Track cards display minimal information with large padding (only 3 cards per row) and large margins.
  - **No Persistent Player:** Lacks a fixed bottom audio bar to preview and scrub tracks while browsing the catalog.
- **Compact & Professional Improvement Plan:**
  1. **Genre Filter Ribbon & Quick Search:**
     - Replace the marketing banner with a 40px top bar featuring genre tags (`All`, `Chiptune`, `Synthwave`, `Ambient`, `Battle FX`) and live search.
  2. **High-Density Track List Table:**
     - Replace bulky cards with a Spotify/SoundCloud-style compact track table: `Play Icon` | `Track Title` | `Artist / Seed` | `BPM Badge` | `Duration` | `Add to Game / Export MP3`.
     - Row height: 36px (`py-1.5`), displaying 15+ tracks above the fold.
  3. **Sticky Bottom Audio Player:**
     - Add a sleek 56px docked player bar with waveform progress scrub, volume slider, and track title so playback persists without scrolling.

---

### Page 52: `/music/maker` (Music Maker & Synthesizer / Beatmaker)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page52_maker_top` (`page52_maker_top_1789425402128.png`)
  - Mouse Scrolled: `page52_maker_scrolled` (`page52_maker_scrolled_1789425405478.png`)
  - Full Page Height: ~3,400 px
- **Current Layout Deficiencies:**
  - **Beat Sequencer Submerged Below Fold:** Giant hero description and a full-height control card (Tempo slider, Project title, export buttons) consume the initial viewport, pushing the interactive 16-step beat matrix completely off-screen.
- **Compact & Professional Improvement Plan:**
  1. **Top DAW Ribbon Bar (Height: 40px):**
     - Consolidate Project Title input, Tempo (BPM) slider, Play/Pause/Loop controls, and `Export WAV/MIDI` into a single horizontal toolbar.
  2. **Above-the-Fold Step Sequencer (Zero-Scroll 100vh):**
     - Position the 16-step sequencer matrix (Kick, Snare, Hi-Hat, Bass, Lead) directly in the center viewport.
     - Add instrument preset selector buttons inline above the matrix.
  3. **Zero Scrolling Needed:** Complete beatmaking and synthesizer sequence loop creation happens within a single screen.

---

### Page 53: `/tools` (Free Browser Tools Directory)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page53_tools_top` (`page53_tools_top_1789425415939.png`)
  - Mouse Scrolled: `page53_tools_scrolled` (`page53_tools_scrolled_1789425419937.png`)
  - Full Page Height: ~2,900 px
- **Current Layout Deficiencies:**
  - **Sprawling 2-Column Cards:** Tools are rendered as large cards with expansive padding and long descriptions, limiting visible tools per viewport to just 4.
  - **Missing Quick Filter:** Lacks category tabs and instant search to rapidly find specialized tools.
- **Compact & Professional Improvement Plan:**
  1. **High-Density 4-Column Tool Grid:**
     - Switch to a 4-column responsive grid with compact 120px tool cards (Icon, Title, 1-line summary, category tag).
  2. **Instant Search & Category Filter Header:**
     - Add an inline search filter and category pills (`All`, `Text`, `Image`, `SEO`, `Dev Utilities`) at the top.
     - Increases above-the-fold tool density from 4 to 16 visible utilities.

---

### Page 54: `/tools/counter` (Text & Word Counter Utility)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page54_counter_top` (`page54_counter_top_1789425440740.png`)
  - Mouse Scrolled: `page54_counter_scrolled` (`page54_counter_scrolled_1789425446805.png`)
  - Full Page Height: ~2,500 px
- **Current Layout Deficiencies:**
  - **Metrics Submerged Below Text Area:** Live metric cards (Word Count, Characters, Sentences, Paragraphs, Reading Time, Speaking Time) are positioned *underneath* the large textarea. Users typing or pasting text must scroll down to see the stats.
- **Compact & Professional Improvement Plan:**
  1. **2-Column Split Workspace (Zero-Scroll 100vh):**
     - **Left Column (65%):** Text input area with `Clear`, `Copy`, and `Sample Text` quick action buttons.
     - **Right Column (35%):** Sticky Live Metrics card with real-time counters (Words, Chars with/without spaces, Sentences, Reading Time at 200 wpm, Speaking Time at 130 wpm).
  2. **Alternative Top Metrics Bar:**
     - Position a 4-metric badge ribbon (`[142 Words]` `[850 Chars]` `[4 Sentences]` `[0.7m Read]`) directly above the text box so all statistics update in real-time within the visible viewport.

---

### Page 55: `/tools/image` (Quick Image Resizer & Format Converter)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page55_toolimage_top` (`page55_toolimage_top_1789425527018.png`)
  - Mouse Scrolled: `page55_toolimage_scrolled` (`page55_toolimage_scrolled_1789425532195.png`)
  - Full Page Height: ~2,800 px
- **Current Layout Deficiencies:**
  - **Linear Stacked Steps:** The workflow is split into 3 separate full-width containers vertically: "1 - Pick an image", "2 - Settings", and "3 - Result".
  - **Submerged Download:** Users must scroll down to adjust quality/format sliders and to download the converted image.
- **Compact & Professional Improvement Plan:**
  1. **Unified 2-Panel Image Workbench (Zero-Scroll 100vh):**
     - **Left Panel (50%):** Image dropzone with instant visual preview, original file dimensions, and file size badge.
     - **Right Panel (50%):** Format radio pills (`WebP`, `PNG`, `JPEG`, `AVIF`), Quality slider (1-100%), Custom Width/Height inputs (with aspect ratio lock), and prominent `Download Optimized Image` CTA button.
  2. **Result:** Entire upload, resize/compress, and export process executed with zero scrolling.

---

## Batch 12: Showcase, Education & Specialized Hubs (Pages 56 to 60)

### Page 56: `/tools/seo` (SEO Meta Tag & OpenGraph Generator)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page56_seo_top` (`page56_seo_top_1789425573171.png`)
  - Mouse Scrolled: `page56_seo_scrolled` (`page56_seo_scrolled_1789425578775.png`)
  - Full Page Height: ~2,700 px
- **Current Layout Deficiencies:**
  - **Single-Column Form Stack:** "Your page" inputs (Title Tag, Meta Description, URL Slug, Primary Keyword) are stacked above the Google SERP and OpenGraph social card previews.
  - **Separated Previews:** Users typing into the fields cannot see how their snippet looks on Google or Twitter/X without scrolling down.
- **Compact & Professional Improvement Plan:**
  1. **2-Column Responsive Layout (Zero-Scroll 100vh):**
     - **Left Column (45%):** Compact input form with live character count gauges (Title: `42/60 chars`, Description: `145/160 chars`).
     - **Right Column (55%):** Live real-time preview cards (Google SERP Search Card & Twitter/Discord Social Card) updating on every keystroke.
  2. **Sticky Actions:**
     - Position `Copy HTML Meta Tags` and `Export JSON-LD` buttons directly at the top-right of the preview panel.
  3. **Result:** Complete meta tag formulation, SERP validation, and export workflow with zero scrolling.

---

### Page 57: `/academy` (Dev & Gamer Learning Academy)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page57_academy_top` (`page57_academy_top_1789425584972.png`)
  - Mouse Scrolled: `page57_academy_scrolled` (`page57_academy_scrolled_1789425591209.png`)
  - Full Page Height: ~2,400 px
- **Current Layout Deficiencies:**
  - **Oversized Banner:** "4WEIRD ACADEMY" banner with large vertical margins and a redundant Vibe Coins exchange card occupies the top screen.
  - **Missing Module Grid:** Scrolling down reveals generic footer links rather than a structured catalog of interactive tutorials and learning tracks.
- **Compact & Professional Improvement Plan:**
  1. **Compact Academy Header:**
     - Shrink banner height by 50% and display academy stats (`14 Free Courses` | `3 Tracks` | `Earn Vibe Badges`).
  2. **3-Column Learning Track Grid:**
     - Feature interactive learning tracks above the fold:
       - Track 1: `Game Dev & WebGL (Godot & HTML5)`
       - Track 2: `AI Agents & Swarm Orchestration`
       - Track 3: `Decentralized Compute & Tokenomics`
     - Each card features progress bars (`0/5 Completed`), skill tags, and `Start Module →` buttons.

---

### Page 58: `/tech` (Technology Stack & Architecture Breakdown)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page58_tech_top` (`page58_tech_top_1789425601445.png`)
  - Mouse Scrolled: `page58_tech_scrolled` (`page58_tech_scrolled_1789425608537.png`)
  - Full Page Height: ~3,100 px
- **Current Layout Deficiencies:**
  - **Bulky 2x2 Text Cards:** 4 large architecture cards ("Next.js platform", "Original game runtimes", "Service boundaries", "Preservation first") use wide spacing and long paragraphs.
  - **Missing System Diagram:** No high-level visual architecture flow or infrastructure metrics are visible.
- **Compact & Professional Improvement Plan:**
  1. **Interactive Architecture Flow:**
     - Embed a compact SVG diagram showing the platform topology: Next.js Edge → Supabase Auth/DB → RunPod GPU Workers → Cloudflare CDN.
  2. **4-Column Stack Ribbon:**
     - Convert the 4 narrative cards into a compact 4-column spec ribbon (Height: 120px) highlighting core technologies (Next.js 16, React 19, Supabase, WebGL/Three.js).
  3. **Zero-Scroll Tech Matrix:**
     - All platform engineering details fit into a high-density single-screen overview.

---

### Page 59: `/game/spaceships` (Spaceships Simulation Arcade Game)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page59_spaceships_top` (`page59_spaceships_top_1789425621735.png`)
  - Mouse Scrolled: `page59_spaceships_scrolled` (`page59_spaceships_scrolled_1789425629389.png`)
  - Full Page Height: ~2,500 px
- **Current Layout Deficiencies:**
  - **Canvas Cutoff:** The 3D WebGL space simulation canvas is cut off at the bottom of the default browser viewport.
  - **Controls Submerged:** Key game controls (Simulation Speed slider, Camera Angle switcher, Credits HUD, Flight Controls) are positioned below the canvas, requiring scrolling during gameplay.
- **Compact & Professional Improvement Plan:**
  1. **Auto-Fit Viewport Canvas (Zero-Scroll):**
     - Lock canvas dimensions to `calc(100vh - 64px)`.
  2. **Translucent Glassmorphic HUD Overlays:**
     - Move camera controls and simulation speed slider into a floating top-left HUD pill.
     - Move Score, Credits, and Ship Hull status into a floating top-right HUD gauge.
  3. **Immersive Full-Screen Arcade Mode:**
     - The game becomes completely playable with keyboard/mouse without any page-level scrolling.

---

### Page 60: `/web-apps` (Curated Web Applications Directory)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page60_webapps_top` (`page60_webapps_top_1789425684379.png`)
  - Mouse Scrolled: `page60_webapps_scrolled` (`page60_webapps_scrolled_1789425694329.png`)
  - Full Page Height: ~2,300 px
- **Current Layout Deficiencies:**
  - **Large Unconfigured Worker Notice:** A prominent warning box ("Worker service: unconfigured") occupies valuable space without offering alternative tools.
  - **Missing Application Cards:** The page lacks an interactive grid of launchable web applications.
- **Compact & Professional Improvement Plan:**
  1. **Compact Worker Status Pill:**
     - Collapse service worker configuration into an inline status chip (`Worker: Offline [Configure]`) in the header.
  2. **Category Filter Tabs & 4-Column App Grid:**
     - Add category pills (`All`, `Productivity`, `Creative Tools`, `Games`, `Utilities`).
     - Display web apps in a dense 4-column card grid (Icon, Title, Category, 1-click `Launch App →` button).
  3. **Zero-Scroll Directory:**
     - Ensures users can discover and launch any platform web app directly within the initial viewport.

---

## Batch 13: Fun, VCW Sections & Vocational Rehab (Pages 61 to 65)

### Page 61: `/luck` (Luck Factory / Seed Generator)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page61_luck_top` (`page61_luck_top_1789425725337.png`)
  - Mouse Scrolled: `page61_luck_scrolled` (`page61_luck_scrolled_1789425730740.png`)
  - Full Page Height: ~2,400 px
- **Current Layout Deficiencies:**
  - **Spacious Inputs:** Large intention/mantra textarea, spacious meditation streak and draw counter input rows push the odds table and results container down.
  - **Verbiage Inflation:** Lengthy paragraphs describing cryptographic luck algorithms consume vertical real estate.
- **Compact & Professional Improvement Plan:**
  1. **Single-Row Controls Toolbar:**
     - Consolidate Intention input, Streak selector, Draw counter, and `Draw Luck Seed 🎲` button into a single horizontal toolbar.
  2. **Top-Pinned Balance:**
     - Position the Clovers balance badge (`0 clovers [Earn More]`) right inside the header ribbon.
  3. **Collapsible Odds Drawer:**
     - Move mathematical probability charts and seed verifier proofs into a collapsible `<details>` drawer.
  4. **Zero-Scroll Completion:**
     - Luck draw animation and reward card appear in the center viewport above the fold.

---

### Page 62: `/pet` (Virtual Pet Room: 3D Companion)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page62_pet_top` (`page62_pet_top_1789425736767.png`)
  - Mouse Scrolled: `page62_pet_scrolled` (`page62_pet_scrolled_1789425743524.png`)
  - Full Page Height: ~2,600 px
- **Current Layout Deficiencies:**
  - **Quick Tour Card Blocks Pet Stage:** A massive 3-step "Quick tour — your first visit" onboarding card is fixed above the 3D pet stage, pushing the interactive pet canvas and action buttons below the fold.
- **Compact & Professional Improvement Plan:**
  1. **Dismissible Tour / Modal:**
     - Convert the tour card into a dismissible floating tutorial bubble or move it behind a `(?) Tour` icon button.
  2. **Split-Screen Pet Cockpit (Zero-Scroll 100vh):**
     - **Left Column (65%):** Interactive 3D Pet Room WebGL canvas dynamically sized to `calc(100vh - 80px)`.
     - **Right Column (35%):** Pet status gauges (Hunger, Energy, Happiness, Bond Level), Inventory tray (Food, Toys, Treats), and 1-click action buttons (`Feed`, `Pet`, `Play Ball`, `Sleep`).
  3. **Zero-Scroll Experience:**
     - Pet care and interactions occur seamlessly on a single screen without scrolling.

---

### Page 63: `/vibecodeworker/hub` (VCW Mission Control Hub)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page63_vcwhub_top` (`page63_vcwhub_top_1789425749345.png`)
  - Mouse Scrolled: `page63_vcwhub_scrolled` (`page63_vcwhub_scrolled_1789425756387.png`)
  - Full Page Height: ~2,500 px
- **Current Layout Deficiencies:**
  - **Excessive Nav Pills:** 6 horizontal pill navigation buttons push the active workspace container down.
  - **Isolated Worker Status:** A separate "Checking worker service..." status box floats above an empty workspace card, followed directly by the global footer.
- **Compact & Professional Improvement Plan:**
  1. **Segmented Top Control Bar:**
     - Replace the 6 pill buttons with a compact segmented tab switcher (`[Overview]` `[Cloud Run]` `[Full Web]` `[Remote]` `[Manual]` `[Demo]`).
  2. **Unified System Status Tile:**
     - Integrate worker service ping, active RunPod nodes, and token balance into an embedded header status bar.
  3. **Full-Viewport Application Frame:**
     - Lock the hub workspace to `calc(100vh - 64px)` with internal pane division, hiding global footer links inside a compact bottom status bar.

---

### Page 64: `/vocrehab` (VocRehab Main Portal)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page64_vocrehab_top` (`page64_vocrehab_top_1789425763423.png`)
  - Mouse Scrolled: `page64_vocrehab_scrolled` (`page64_vocrehab_scrolled_1789425771150.png`)
  - Full Page Height: ~3,500 px
- **Current Layout Deficiencies:**
  - **Stacked Module Grid (2x2 + 2x2):** 8 vocational rehab module cards are separated into two disjointed 2x2 grids with an XP progress bar sandwiched in between, forcing continuous scrolling.
  - **Large Accessibility Bar:** Full-width accessibility buttons consume substantial header space.
- **Compact & Professional Improvement Plan:**
  1. **Unified 4x2 Module Dashboard:**
     - Consolidate all 8 modules (Discover, Decide, Course, Export, Interview, For Counselors, Arcade, Guides) into a tight 4x2 responsive card grid.
     - Each card displays module icon, status badge, XP potential, and direct launch button.
  2. **Integrated Progress Header:**
     - Move the XP progress bar (`0 XP · 0/4 lessons done`) directly into the top header row alongside user profile info.
  3. **Compact Accessibility Drawer:**
     - Group text size, contrast, voice, and motion toggles into an accessible floating trigger pill.
  4. **Zero-Scroll Portal:**
     - Entire curriculum navigation fits on a single screen without scrolling.

---

### Page 65: `/vocrehab/course` (VocRehab Course Syllabus)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page65_vr_course_top` (`page65_vr_course_top_1789425779502.png`)
  - Mouse Scrolled: `page65_vr_course_scrolled` (`page65_vr_course_scrolled_1789425788616.png`)
  - Full Page Height: ~4,200 px
- **Current Layout Deficiencies:**
  - **Linear Chapter Sprawl:** 4 chapters (Discover, Tell Your Story, Decide With Confidence, Work With Your Counselor) with multiple bulky lesson cards are stacked in a single long vertical column spanning >4,000px.
- **Compact & Professional Improvement Plan:**
  1. **Master-Detail / Tabbed Navigator (Zero-Scroll 100vh):**
     - **Left Rail (30%):** Vertical chapter progression tree with circular check indicators and chapter XP badges.
     - **Right Panel (70%):** Active chapter lesson matrix. Lessons are displayed as dense list rows (Height: 48px) with lesson title, simulator preview badge, estimated time (e.g. `12 min`), and `Start Lesson →` button.
  2. **Quick Simulator Drawer:**
     - Clicking interactive drills (e.g. Barrier Run, Inbox Sprint) launches the exercise in an overlay drawer rather than jumping away, preserving context.

---

## Batch 14: VocRehab Interactive Simulators & Legal Framework (Pages 66 to 70)

### Page 66: `/vocrehab/play` (VocRehab Practice Arcade)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page66_vr_play_top` (`page66_vr_play_top_1789425837243.png`)
  - Mouse Scrolled: `page66_vr_play_scrolled` (`page66_vr_play_scrolled_1789425840440.png`)
  - Full Page Height: ~3,100 px
- **Current Layout Deficiencies:**
  - **Sprawling 2-Column Game Matrix:** 5 vocational practice mini-games (File Sort, Inbox Sprint, Focus Shift, Barrier Run, Schedule Juggle) are arranged in a loose 2-column layout.
  - **Excessive Top Padding:** Large breadcrumb rows and spacious header typography push game cards below the initial fold.
- **Compact & Professional Improvement Plan:**
  1. **3-Column High-Density Simulator Grid:**
     - Reorganize practice mini-games into a compact 3-column card grid (`grid-cols-1 md:grid-cols-3`).
     - Reduce card height to 180px with integrated preview illustration, XP reward badge, difficulty rating, and instant `Play Drill →` button.
  2. **Zero-Scroll Viewport:**
     - All 5 practice training games fit completely above the fold on 1080p desktop viewports without mouse scrolling.

---

### Page 67: `/vocrehab/discover` (VocRehab Career Discovery & Self-Advocacy)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page67_vr_discover_top` (`page67_vr_discover_top_1789425843916.png`)
  - Mouse Scrolled: `page67_vr_discover_scrolled` (`page67_vr_discover_scrolled_1789425847283.png`)
  - Full Page Height: ~2,900 px
- **Current Layout Deficiencies:**
  - **Awkward 2-Column Orphan Layout:** 5 assessment tools (Your IPE, Barriers, Readiness, Goals, Remote Check) are laid out across 2 columns, causing the 5th card to awkwardly sit on a solitary 3rd row with high white space.
  - **Missing Direct Interactivity:** Cards rely on click-through text links without clear status indicators.
- **Compact & Professional Improvement Plan:**
  1. **5-Column Horizontal Ribbon / 3+2 Balanced Grid:**
     - Align the 5 discovery modules across a sleek 5-column dashboard row (or balanced 3+2 compact cards).
  2. **Actionable Status Cards:**
     - Add explicit `Start Assessment →` buttons and progress tags (`Estimated: 5 mins` | `Not Started` / `Completed`) inside each card.
  3. **Zero-Scroll Discovery:**
     - Reduces vertical footprint by 45%, keeping the complete self-advocacy diagnostic suite visible within a single screen.

---

### Page 68: `/docs` (Global Documentation Hub & Manual)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page68_docs_top` (`page68_docs_top_1789425851365.png`)
  - Mouse Scrolled: `page68_docs_scrolled` (`page68_docs_scrolled_1789425855942.png`)
  - Full Page Height: ~3,800 px
- **Current Layout Deficiencies:**
  - **Giant Hero Banner:** "THE MANUAL FOR FUTURE FORWARD FUN." consumes over 300px vertically without an integrated search bar.
  - **Sprawling Left Sidebar:** Left navigation lists 21 individual chapter links vertically, requiring internal scrolling to view the complete guide index.
- **Compact & Professional Improvement Plan:**
  1. **Hero Search Integration:**
     - Embed a prominent search input field (`Quick search documentation... ⌘K`) directly into a streamlined 48px hero bar.
  2. **Collapsible Categorized Sidebar:**
     - Group the 21 guides into collapsible categories (`Platform & Economics`, `Arcade & Games`, `Developer & Compute`, `Vocational Rehab`) with compact 28px row heights.
  3. **High-Density Guide Matrix:**
     - Convert the right-hand guide cards into a compact 3-column micro-card grid with category tags and reading time badges.

---

### Page 69: `/privacy` (Privacy Policy & Data Rights)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page69_privacy_top` (`page69_privacy_top_1789425861218.png`)
  - Mouse Scrolled: `page69_privacy_scrolled` (`page69_privacy_scrolled_1789425866407.png`)
  - Full Page Height: ~5,100 px
- **Current Layout Deficiencies:**
  - **Monolithic Text Column:** 14 lengthy legal sections are presented in a continuous single-column text block with generous margins, requiring extensive scrolling to locate specific policies.
  - **No Table of Contents (TOC):** Users must scroll through thousands of pixels to check data deletion or telemetry terms.
- **Compact & Professional Improvement Plan:**
  1. **Sticky Floating TOC / Outline Rail:**
     - Add a sticky left-rail Table of Contents with jump anchors to numbered sections (`1. Controller`, `2. Data Collected`, `3. Telemetry`, `4. Deletion Rights`).
  2. **Accordion Disclosure Sections:**
     - Wrap detailed regulatory legal text in expandable accordion sections, collapsing default page height by 65%.
  3. **High-Density Summary Matrix:**
     - Add a quick 1-screen summary table at the top: `Data Category` | `Purpose` | `Retention Period` | `User Control`.

---

### Page 70: `/terms` (Terms of Service & Platform Agreement)
- **Status:** Inspected & Analyzed
- **Screenshots:**
  - Initial Viewport: `page70_terms_top` (`page70_terms_top_1789425871667.png`)
  - Mouse Scrolled: `page70_terms_scrolled` (`page70_terms_scrolled_1789425877289.png`)
  - Full Page Height: ~5,800 px
- **Current Layout Deficiencies:**
  - **Dense Unsegmented Text:** 18+ legal sections run continuously down a single column without outline navigation or search filtering.
- **Compact & Professional Improvement Plan:**
  1. **Sticky Navigation Sidebar:**
     - Implement a sticky left Table of Contents navigation bar with active scroll-spy highlighting.
  2. **Key Terms Summary Cards:**
     - Provide a 3-column key summary card row at the top (`Eligibility & Accounts`, `Vibe Coins & Billing`, `Content & IP Rights`), giving humans an immediate high-level grasp of essential terms without scrolling.
  3. **Keyword Filter Input:**
     - Add an inline search box (`Filter terms...`) to instantly jump to specific clauses (e.g. `Refund`, `Arbitration`, `Liability`).

---

## Global Implementation Architecture & Next Steps

### 1. Global Tailwind Design Token Compactness Standardization
To enforce compactness systematically across all 70 audited pages without repetitive custom CSS:
- **Global Section Padding:** Standardize section containers from `py-16 md:py-24` down to `py-4 md:py-6`.
- **Card Padding:** Standardize dashboard and catalog cards from `p-6` / `p-8` down to `p-3.5 md:p-4`.
- **Grid Gaps:** Standardize grid gaps from `gap-6` / `gap-8` down to `gap-2.5 md:gap-3.5`.
- **Hero Headers:** Standardize hero titles from `text-5xl md:text-7xl` down to `text-2xl md:text-3xl` with inline badges and search bars.
- **Cockpit Viewports:** Lock creative tools and complex developer dashboards (`/studio/*`, `/vibecodeworker/*`, `/terminal`, `/commander`, `/pet`, `/music/maker`) to `100vh` flex columns with zero page-level scrollbars.

---
