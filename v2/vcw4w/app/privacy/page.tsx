import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { MarketingPage } from "@/components/site/marketing-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How MattyJacks LLC collects, uses, and protects information on 4weird Games.",
  alternates: { canonical: "/privacy" },
};

const h2 = "text-2xl font-bold text-white";
const a = "text-cyan-200 underline";

// Fully static legal copy: no cookies/headers/searchParams, so it is cached
// ('max' profile: legal pages rarely change) and streamed via <Suspense>.
async function CachedPrivacyBody() {
  'use cache';
  cacheLife('max');
  cacheTag('site-legal');
  return (
      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Privacy policy sections" className="max-h-56 self-start overflow-auto rounded-2xl border border-border bg-card p-3 lg:sticky lg:top-4 lg:max-h-[70vh]">
          <p className="px-1 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">On this page</p>
          <ul className="mt-2 space-y-0.5 text-[13px] leading-snug">
            <li><a href="#privacy-s1" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">1 · Controller</a></li>
            <li><a href="#privacy-s2" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">2 · Data collected</a></li>
            <li><a href="#privacy-s2a" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">2A · VocRehab</a></li>
            <li><a href="#privacy-s3" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">3 · Uses &amp; bases</a></li>
            <li><a href="#privacy-s4" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">4 · Cookies</a></li>
            <li><a href="#privacy-s5" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">5 · Providers</a></li>
            <li><a href="#privacy-s6" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">6 · Transfers</a></li>
            <li><a href="#privacy-s7" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">7 · Retention</a></li>
            <li><a href="#privacy-s8" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">8 · Security</a></li>
            <li><a href="#privacy-s9" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">9 · Your rights</a></li>
            <li><a href="#privacy-s10" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">10 · Automation</a></li>
            <li><a href="#privacy-s11" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">11 · Exercise rights</a></li>
            <li><a href="#privacy-s12" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">12 · Children</a></li>
            <li><a href="#privacy-s13" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">13 · Links &amp; changes</a></li>
            <li><a href="#privacy-s14" className="block rounded-lg px-2 py-1 text-muted-foreground transition hover:bg-white/5 hover:text-white">14 · Contact</a></li>
          </ul>
        </nav>
        <div className="min-w-0">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[560px] border-collapse text-left text-[13px] leading-snug">
              <caption className="px-3 pt-2 text-left text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Summary — the sections below control</caption>
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-3 py-1.5">Data category</th>
                  <th scope="col" className="px-3 py-1.5">Purpose</th>
                  <th scope="col" className="px-3 py-1.5">Retention</th>
                  <th scope="col" className="px-3 py-1.5">Control</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/60">
                  <td className="px-3 py-1.5 font-bold text-white">Account &amp; profile</td>
                  <td className="px-3 py-1.5">Run accounts, Clans, saves</td>
                  <td className="px-3 py-1.5">While active</td>
                  <td className="px-3 py-1.5"><a className={a} href="#privacy-s1">§1–2</a></td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="px-3 py-1.5 font-bold text-white">Gameplay &amp; telemetry</td>
                  <td className="px-3 py-1.5">Progress, leaderboards, matchmaking</td>
                  <td className="px-3 py-1.5">While active</td>
                  <td className="px-3 py-1.5"><a className={a} href="#privacy-s2">§2</a></td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="px-3 py-1.5 font-bold text-white">Coins &amp; transactions</td>
                  <td className="px-3 py-1.5">Billing, tips, campaigns</td>
                  <td className="px-3 py-1.5">Tax &amp; records law</td>
                  <td className="px-3 py-1.5"><a className={a} href="#privacy-s7">§7</a></td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="px-3 py-1.5 font-bold text-white">Technical &amp; safety</td>
                  <td className="px-3 py-1.5">Security, fraud, moderation</td>
                  <td className="px-3 py-1.5">As needed + legal holds</td>
                  <td className="px-3 py-1.5"><a className={a} href="#privacy-s8">§8</a></td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="px-3 py-1.5 font-bold text-white">Cookies &amp; prefs</td>
                  <td className="px-3 py-1.5">Sign-in, settings, consented analytics</td>
                  <td className="px-3 py-1.5">7-day banner renewal</td>
                  <td className="px-3 py-1.5"><a className={a} href="#privacy-s4">§4</a></td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 font-bold text-white">VocRehab rehearsals</td>
                  <td className="px-3 py-1.5">Practice transcripts you save</td>
                  <td className="px-3 py-1.5">§7 schedule; deletes with account</td>
                  <td className="px-3 py-1.5"><a className={a} href="#privacy-s2a">§2A</a></td>
                </tr>
              </tbody>
            </table>
          </div>
      <section className="mt-4 space-y-3">
        <p>
          This policy describes how MattyJacks LLC (“MattyJacks,” “we,” “us,” or “our”) handles information across the
          4weird Games websites, games, persistent-world/MMORPG modes, server rentals, stock media,
          accounts, Clans social features, bot platform, agent rentals, Vibe Coins
          economy, Teams/enterprise workspaces, VibeCodeWorker surfaces, exhibits, APIs, the Vocational
          Rehabilitation (VocRehab) practice module (Section 2A), and related services
          (collectively, the “Service”). It applies whenever you visit or use the Service, on 4weird.com
          or any domain where the Service is served.
        </p>

        <details id="privacy-s1" data-legal open className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>1. Who is responsible for your information</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          MattyJacks LLC, New Hampshire, USA, is the controller (or “business”) for information collected through the
          Service. Contact: <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a>. Exercise your
          privacy rights yourself anytime at <a className={a} href="/my/rights">/my/rights/</a>; special cases
          (including family requests for a deceased user, with proof of authority) are handled by email; see Section
          11.
        </p>

        </div>
        </details>
        <details id="privacy-s2" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>2. Information we collect</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p><strong className="text-white">Account and identity.</strong> Email address, password-authentication records, display name, public handle, permanent human ID (bot users), and account timestamps.</p>
        <p><strong className="text-white">Profiles and preferences.</strong> Display name, handle, account settings (friend requests, playtime visibility, marketing email, Kids Mode flag), accessibility controls, and creator submissions.</p>
        <p><strong className="text-white">Games.</strong> Cloud-save content (game, slot 0-3, versioned data ≤1 MiB, including any permanent cheat-mode mark; slot 0 can never be marked), gameplay telemetry (kills, actions, active seconds, deaths), matchmaking/lobby/presence records, and leaderboard aggregates (handles + totals only).</p>
        <p><strong className="text-white">Clans and user content.</strong> Clans, memberships, posts, comments, uploaded images (≤1 MB; PNG/JPEG/WebP/GIF; hash + storage path), and moderation reports (anonymous reports allowed; CSAM reports trigger immediate quarantine and evidence preservation for authority referral).</p>
        <p><strong className="text-white">Bots.</strong> Bot usernames, human-ID links, and API-key hashes (key secrets are shown once and never stored).</p>
        <p><strong className="text-white">Vibe Coins and transactions.</strong> Coin ledger and grant entries, daily-claim streaks, referral codes and referral links, signup-trial records (privacy-preserving IP hash), checkout sessions and order reconciliation by email, voluntary Support transfers (tips, subscriptions) and gift-based launch-Campaign backing. Campaign pages publicly show the campaign story, goal, raised totals, and backer counts; individual contribution amounts are visible only to you and the campaign creator. Card and payment details are processed by our checkout provider (Shopify and/or its payment processors); we do not store full payment-card numbers.</p>
        <p><strong className="text-white">Agent rentals and Teams compute.</strong> Listings, bookings, escrow and metered-usage records, provider references, org/team/project/room memberships and roles, cloud provisions and usage, wallet ledgers, and audit entries.</p>
        <p><strong className="text-white">Multiplayer snapshots + presence.</strong> In persistent-world/MMORPG modes we relay your handle, server ID, age band, position (x/y), hp, gold, kills, floor/sector, progress, heartbeat timestamps, and join/leave events to peers in the same shard so shared rooms stay in sync; demo and solo modes send nothing.</p>
        <p><strong className="text-white">Server rentals + hosting.</strong> When you rent or join a hosted shard we store server configs (mmorpg_servers) and session rows (mmorpg_sessions: join/leave times and minutes billed) to run and bill the rental; rental quotes touch no ledger until you confirm.</p>
        <p><strong className="text-white">Pexels searches.</strong> Stock-media searches send the query text (2-100 chars), paging, and orientation/size/color/locale filters to Pexels; your IP is visible to Pexels when it serves the request.</p>
        <p><strong className="text-white">Validation + creator tooling.</strong> Bouncer validation sends check emails to UseBouncer for deliverability screening; phone-suppression lists you upload are checked against EasyDNC.org; Blender scene files you open stay as files you supply; DPS donor hardware signals record opt-in device contributions; terminal inputs you type never leave your device; Discord IDs and messages you link are handled via Discord.</p>
        <p><strong className="text-white">Communications.</strong> Support and rights-request messages you send us, including verification and authority documents for special-case requests.</p>
        <p><strong className="text-white">AI and voice/camera features.</strong> Text you send the Gaming Buddy (messages, transcripts, screen text), one downscaled image per message when you share your screen or attach a camera frame, and voice replies we generate for you. Screen snapshots and camera frames are processed for that turn only; never stored, never logged. Microphone audio for interruption detection never leaves your device (only transcripts are sent). Avatar, voice, camera, purchase, and cookie choices tied to your account or device.</p>
        <p><strong className="text-white">Age checks (never collected).</strong> Date of birth entered in a game age gate is checked on your own device, in memory, for that check only. It is never sent to our servers, never written to any database, and never stored in your browser; there is nothing to export or delete because we never receive it. The Kids Mode flag is an ordinary account/device preference, not age data.</p>
        <p><strong className="text-white">Family accounts.</strong> Full accounts store only a self-declared band - Teen (13-17) or Adult (18+) - never a birth date. Parent accounts (Adult 18+ only) hold their children&apos;s handles (username#1234), parent-attested age bands (Kid 0-12, Teen 13-17, Adult 18+), play controls (feature allowlists, budgets, rate caps, time limits, hours), child-attributed parent coin ledger entries, and daily play totals; never passwords (scrypt hashes only, never exported) and never session tokens. Children have no birth dates on file because none are ever asked. A parent&apos;s data export includes their children&apos;s non-secret records; deleting the parent account erases the children&apos;s accounts with it.</p>
        <p><strong className="text-white">Ghosts and timer.</strong> Org work tracking holds contracts, timer sessions with heartbeat activity counts, worker-attached proof screenshots (≤1 MB, same handling as clan images), and hypothetical Ghost records. Heartbeats prove a visible tab, never screen contents; screenshots are supplied by the worker, never captured. Ghost books are org-member-visible (scoped watchers see only their scope) and export with the org member&apos;s own data on request.</p>
        <p><strong className="text-white">Consent and purchase records.</strong> Cookie-banner choices (7-day renewal), accepted purchase quotes, charge receipts, and idempotency records that prove what you confirmed and what we charged. We offer no gambling, lotteries, loot boxes, gacha, paid draws, prize draws, raffles, or wagers anywhere on the Service, so we collect no wagering, odds-participation, or prize records of any kind.</p>
        <p><strong className="text-white">Automatic technical data.</strong> IP address, browser and device characteristics, request logs, pages or features used, approximate location derived from IP, security and fraud-prevention events (including rate-limit and trial-abuse signals). Games and accessibility controls may store preferences and progress in your browser (local storage).</p>
        <p><strong className="text-white">Sources and what we do not collect.</strong> We collect directly from you, automatically from your device, from parents who create Child accounts, and from providers who confirm checkout or safety signals. We do not collect device precise GPS, phone/SMS numbers, contact lists, calendars, or biometric identifiers/voiceprints. VocRehab address lookup and Google Maps routing are paused; coordinate-based travel estimates run offline and we do not read device location. Voice is generated or transcribed per turn, microphone interruption audio never leaves your device, and screen/camera frames are processed per turn only and never stored by 4weird. We store salted IP hashes for trial-abuse and safety records; hosting, delivery, and analytics providers may independently process IP addresses and request metadata as described below. Do not enter sensitive health, disability, or case information into VocRehab reports or free-text fields; our current Supabase arrangement is not represented as HIPAA-compliant.</p>

        </div>
        </details>
        <details id="privacy-s2a" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>2A. VocRehab module (special section)</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p><strong className="text-white">Ephemeral by default; text only; no audio, ever.</strong> VocRehab rehearsals live in your tab until you explicitly tap Save while signed in. Microphone input is transcribed on your device and only the text you send is transmitted — we never record, upload, or store audio, and there is no audio export because no audio exists.</p>
        <p><strong className="text-white">What saving stores.</strong> Saving persists the text transcript plus the report card (per-turn praise/tweak/invitation and axis scores) with the job, difficulty, and mode in the session record. Saving requires the separate <em>voice-rehearsal-save</em> consent (in addition to session-assist, roleplay-save, data-export, and course-sync); guests cannot save. Counselors see only rehearsals you explicitly saved or shared — never in-progress or discarded practice.</p>
        <p><strong className="text-white">Redaction + export.</strong> Saved text passes PII redaction (email, SSN, dates, phone, ID numbers) before render and storage, and blocklisted topics (legal/medical conclusions, benefits guarantees, identifier requests) are refused with a rephrase prompt. Your export includes saved transcripts under the existing roleplay-turns allowlist; raw audio is categorically excluded. Grades and report cards are an automated practice signal, not a hiring decision.</p>
        <p><strong className="text-white">Retention.</strong> Saved VocRehab work follows the Section 7 schedule and deletes with your account at <a className={a} href="/my/rights">/my/rights/</a>, subject to the Section 11 exceptions. Do not enter Social Security numbers, claim numbers, case numbers, or birth dates — VocRehab never asks for them.</p>

        </div>
        </details>
        <details id="privacy-s3" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>3. How we use information (and GDPR legal bases)</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>We use information to provide, secure, maintain, improve, troubleshoot, personalize, and administer the Service; authenticate users; preserve progress and settings; operate Clans, bots, rentals, workspaces, and leaderboards; process and reconcile transactions; communicate about the Service; prevent fraud, abuse, and security incidents; moderate content and protect safety; and comply with legal obligations. We may create aggregated or de-identified information and use it for any lawful business purpose.</p>
        <p>Where the GDPR/UK GDPR applies, our legal bases are: <em>contract</em> (providing the Service you request, Art. 6(1)(b)); <em>legitimate interests</em> (security, fraud prevention, moderation, service improvement; balanced against your rights, Art. 6(1)(f)); <em>consent</em> (optional analytics/marketing email, Art. 6(1)(a), withdrawable anytime); and <em>legal obligation</em> (records, safety reporting, responding to lawful requests, Art. 6(1)(c)).</p>

        </div>
        </details>
        <details id="privacy-s4" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>4. Cookies and similar technologies</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          A cookie banner loads on every page until you choose, and asks again once every 7 days. You get real
          options: <strong className="text-white">Accept all</strong> (which we strongly recommend; it funds free
          play, keeps every feature working, and lets us improve the Service for any purpose described here),{" "}
          <strong className="text-white">Reject non-essential</strong>, or{" "}
          <strong className="text-white">Customize</strong> by category. Categories:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong className="text-white">Essential (always on):</strong> sign-in session, security, fraud prevention, load balancing, and your cookie choice itself. The Service cannot sign you in without these.</li>
          <li><strong className="text-white">Analytics:</strong> Vercel Analytics telemetry (always on; may include page path, referrer, device/browser and approximate region, with a short-lived pseudonymous visitor identifier) and Google Analytics measurement (opt-in only, env-configured measurement ID; loads only after you accept analytics cookies). We send GA the page path without query parameters to avoid collecting link tokens or user-entered URL values.</li>
          <li><strong className="text-white">Functional (opt-in):</strong> remembered preferences such as theme, voices, avatar shape and color, and game settings.</li>
          <li><strong className="text-white">Marketing (opt-in):</strong> campaign and referral measurement. Marketing email is separately off by default in account settings.</li>
        </ul>
        <p>
          Games and accessibility controls also use browser local storage for preferences and progress (including
          4weird-a11y, theme/voice/avatar prefs, 4weird-kids-mode, fw-favorites-v1, swarm-pins, docs-progress, and
          per-game highs/mute flags; consent choice fw-cookie-consent-v1). Essential cookies include sb-* auth
          session, kid_session (child login), and bot_tester (bot-tester restriction). Clearing site data removes
          them and returns the banner; date of birth is never stored anywhere. You can change
          your choice anytime by clearing site data (the banner returns), with browser controls,
          Global Privacy Control signals (treated as a reject-non-essential request where required by law),
          “Do Not Track”-respecting settings where honored, or Google’s opt-out tools. Legacy static game pages
          and guides no longer inject Google Analytics because they do not contain the app consent manager. We send
          no browser push notifications; the service worker is offline game caching only, with no background
          tracking. Marketing email is off by default with unsubscribe in every message; we send no marketing SMS/push.
        </p>

        </div>
        </details>
        <details id="privacy-s5" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>5. Disclosures and service providers</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>We provide your information to private third parties only as needed for the purposes above, to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong className="text-white">Hosting and delivery:</strong> Vercel (hosting, request processing, and analytics) receives IP/request metadata to serve the site; Cloudflare may receive network metadata if enabled in our DNS/proxy configuration. We do not control provider-side infrastructure logs or retention;</li>
          <li><strong className="text-white">Accounts and data:</strong> Supabase (authentication/database);</li>
          <li><strong className="text-white">Payments:</strong> Shopify (checkout, order reconciliation) and its payment processors, under their terms;</li>
          <li><strong className="text-white">Measurement:</strong> Google Analytics (only with your analytics consent) receives page paths without query strings. Vercel Analytics receives page views, referrer, device/browser details, approximate region and a short-lived pseudonymous event signal; our integration removes query strings and suppresses account, child, VocRehab, and other private routes. Vercel may also process visitor IP/request data under its terms;</li>
          <li><strong className="text-white">AI chat and reasoning:</strong> OpenAI and OpenRouter may receive prompts, transcripts, and attached images needed to produce replies. OpenRouter routes to the selected underlying model provider; Gemini is blocked in our server and official desktop client, while other models remain subject to that provider&apos;s terms and handling. Desktop integrations can also send prompts directly to OpenAI, DeepSeek, or Meta Llama API with your provider key; DeepSeek and Meta may process request content, account, and technical data under their own policies. DeepSeek states that personal information may be stored on servers in China; review its current API terms and privacy notice before enabling it. Providers may retain content or logs under their own terms and settings; OpenAI API abuse-monitoring logs may retain prompts/responses for up to 30 days by default. Desktop cloud-provider calls require a linked 4weird account and pass the server age-eligibility check; the provider key remains on-device. Local/on-device brains do not send prompts to these providers. Do not submit sensitive health, disability, case, or child-identifying information to external AI services;</li>
          <li><strong className="text-white">AI voice and media:</strong> ElevenLabs (text-to-speech, speech-to-text, sound and music), fal.ai (image, video, audio, 3D generation), and Meshy.ai (3D generation; prompts/assets sent to produce models, finished models autosaved to your Vault), under their terms. The official desktop voice integrations require Adult-band eligibility; provider-specific retention and model-improvement terms may apply;</li>
          <li><strong className="text-white">Compute and file storage:</strong> RunPod or your configured custom endpoint when you book agent/cloud compute; DigitalOcean account status and usage sync may contact DigitalOcean (provision metadata and usage shared for these functions; DigitalOcean booking/provisioning is not enabled here). Supabase Storage holds user-uploaded Blender scenes and rendered videos; a RunPod worker receives time-limited signed URLs to download a scene and upload its result;</li>
          <li><strong className="text-white">VocRehab travel estimates:</strong> address lookup and Google Maps routing are paused. Coordinates you enter are used only for a rough offline estimate; they are not sent to Google and results are not cached by the server;</li>
          <li><strong className="text-white">Fraud prevention:</strong> Kasada/BotID screening of request metadata and device signals to block bots and abuse, under <a className={a} href="https://www.kasada.io/privacy-policy" target="_blank" rel="noreferrer">Kasada&apos;s Privacy Policy</a> and applicable service terms;</li>
          <li><strong className="text-white">Delivery/CDN and software downloads:</strong> jsDelivr, cdnjs, Google Fonts, Google Tag Manager (consented analytics only), esm.sh, blender.org and johnvansickle.com (worker Blender and FFmpeg downloads), GitHub and raw.githubusercontent.com (release metadata, user-requested runtime/build assets, cloud worker source clone, and legacy workspace fallback source), Godot&apos;s official download site, Ollama (local model installer and workload runtime downloads), opencode.ai and registry.npmjs.org (user-installed OpenCode CLI), Google (Chrome package downloads to a RunPod worker), and Ubuntu package mirrors may receive IP address, User-Agent, and ordinary request metadata from your device or a cloud workload under their terms;</li>
          <li><strong className="text-white">Accessibility model downloads:</strong> when you turn on optional face control, your browser downloads the MediaPipe runtime from jsDelivr and its face-landmarker model from Google Cloud Storage. Camera video is analyzed locally in your browser and is not sent with those download requests; the download providers may receive your IP address, referrer, and ordinary request metadata;</li>
          <li><strong className="text-white">Desktop phone-link QR:</strong> QR Server receives a request to generate an image containing the active temporary pairing URL. Its published privacy information says it records request origin/referrer and IP, does not log QR contents, and briefly caches generated images. Regenerate the pairing code after use and treat it as a secret while active; see <a className={a} href="https://goqr.me/privacy-safety-security/" target="_blank" rel="noreferrer">QR Server Privacy</a> and <a className={a} href="https://goqr.me/legal/tos-api.html" target="_blank" rel="noreferrer">QR Server API Terms</a>;</li>
          <li><strong className="text-white">Optional local developer assistant:</strong> the integrated VibeCodeWorker OpenCode feature requires an Adult-band 4weird account linked by its identity key. If used, OpenCode may send prompts, selected source files, and workspace context directly to the model provider configured in OpenCode. 4weird does not receive or control those provider requests. OpenCode&apos;s terms prohibit its use by children under 13 and require parent/guardian permission for minors; because this app does not collect and verify that permission, children and teens cannot use the integrated feature. A separate OpenCode installation used outside this integration is governed by OpenCode&apos;s <a className={a} href="https://opencode.ai/legal/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</a> and the selected model provider&apos;s terms;</li>
          <li><strong className="text-white">Off-site remote play:</strong> if an adult user launches the Xonotic off-site remote-play option, the browser opens <code>dpgame.xonotic.workers.dev</code>, a third-party host. That operator may receive network metadata; the game may establish direct peer-to-peer connections that expose network addresses to other players. Game content and data handling there are outside 4weird&apos;s control. Do not submit personal or case information to it;</li>
          <li><strong className="text-white">Configured worker health checks:</strong> if an operator configures <code>VCW_SERVICE_URL</code>, the VibeCodeWorker status/dashboard routes request its <code>/health</code> endpoint without forwarding the signed-in user&apos;s account data, prompts, or cookies. The configured host receives an ordinary health request and server-network metadata; other user-configured compute endpoints can receive workload inputs as described above;</li>
          <li><strong className="text-white">Auth email:</strong> Supabase sends transactional auth emails (signup confirm, password reset); we operate no third-party marketing-email provider;</li>
          <li><strong className="text-white">Moderation:</strong> Adult-band signed-in authors&apos; clan post/comment text may be sent to OpenAI to assist automated safety review. For teen, child, unknown-age, or bot-key submissions, external AI moderation is skipped and the content follows the local heuristic and human-review/quarantine process;</li>
          <li><strong className="text-white">Safety and legal:</strong> NCMEC CyberTipline for suspected child exploitation (filed by a human); U.S. courts and authorities upon valid legal request such as a court order, subpoena, or other lawful process; and parties necessary to protect rights, safety, and the Service or enforce our Terms; including against illegal content, which is never allowed;</li>
          <li><strong className="text-white">Stock search:</strong> Pexels Inc. receives your search query or curated-feed request, filters, and our server request metadata under its terms; our API key never leaves our server and no wallet data is sent;</li>
          <li><strong className="text-white">Business and lead search:</strong> Outscraper receives query terms and optional location/filter inputs; its response may contain public business, review, search, or lead data. We return the response to the signed-in requester and do not retain raw results in the search route. See Outscraper&apos;s privacy policy and terms;</li>
          <li><strong className="text-white">In-shard peer relay:</strong> handles, positions, and run stats are visible to peers in the same multiplayer room to render the shared world;</li>
          <li><strong className="text-white">Email validation:</strong> UseBouncer receives email addresses submitted for deliverability checks. When used from CRM, we retain the email already stored on the contact plus the returned verification status, score, and check date. See Bouncer&apos;s terms, privacy policy, and DPA;</li>
          <li><strong className="text-white">Phone suppression:</strong> EasyDNC.org receives normalized phone numbers for single or batch do-not-call screening. The feature requires an Adult-band signed-in account, including when you use your own EasyDNC key; saved batch records contain totals and a hash, not the full submitted list. These lookups are not a guarantee of legal compliance and must be independently verified;</li>
          <li><strong className="text-white">Discord bot:</strong> if you interact with our community bot, Discord supplies your Discord user, guild, channel, command, and interaction metadata to the bot. Event/raid commands may temporarily retain IDs and event fields in process memory; the bot does not provide a user-account linking feature. Discord&apos;s minimum-age terms apply to bot use; see the <a className={a} href="https://discord.com/privacy" target="_blank" rel="noreferrer">Discord Privacy Policy</a>, <a className={a} href="https://support-dev.discord.com/hc/articles/8562894815383-Discord-Developer-Terms-of-Service" target="_blank" rel="noreferrer">Developer Terms</a>, and <a className={a} href="https://support-dev.discord.com/hc/articles/8563934450327-Discord-Developer-Policy" target="_blank" rel="noreferrer">Developer Policy</a>;</li>
          <li><strong className="text-white">Corporate:</strong> a buyer or successor in a merger, financing, sale, or reorganization, under confidentiality.</li>
        </ul>
        <p>
          We <strong className="text-white">do not sell personal information for money</strong> and do not share it
          for cross-context behavioral advertising. Providers act as processors/service-providers on our behalf under
          their terms (including Standard Contractual Clauses / Data Privacy Framework where they offer them) and may process
          it outside your state or country (see Section 6). We will post material subprocessor changes here where
          practical. Receipts and ledgers carry no personal details beyond
          your account reference.
        </p>

        </div>
        </details>
        <details id="privacy-s6" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>6. International transfers</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          We are based in the United States and the Service is operated from the U.S. If you use the Service from the
          EEA, UK, Switzerland, or elsewhere, your information is transferred to and processed in the U.S. and other
          provider locations. Where required, we use appropriate safeguards (such as Standard Contractual Clauses) and
          retain information only under the bases in Section 3.
        </p>

        </div>
        </details>
        <details id="privacy-s7" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>7. Retention</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          We retain information only as long as reasonably necessary for the purposes in Section 3: while your account
          is active; for records, security, dispute resolution, and legal compliance afterward; safety and CSAM
          evidence as required for authority referral and legal claims; and financial/transaction records as tax and
          payments law requires. Indicative schedule: account/profile and game saves while active; coin lots expire
          1 year after receipt (90-day purchased-lot refund window); Crowns expire 1 year, unlock 30 days; child
          sessions expire 30 days; bot-key logs per your setting (default 90 days, up to ~5 years); public lobbies
          visible 30 minutes; org invites up to 2 years; transaction/tax records per tax/payments law. When you delete your account at <a className={a} href="/my/rights">/my/rights/</a>,
          we delete or de-identify your personal data across our systems except where retention is permitted or
          required by law (Section 11 lists the exceptions). Backups age out on their normal cycle (weeks, not years).
        </p>
        <p>
          Multiplayer + hosting retention: server configs and session rows (join/leave, minutes billed) are kept as
          billing records per tax law with minimal fields; live presence is ephemeral and shards follow the 30-minute
          lobby convention above.
        </p>

        </div>
        </details>
        <details id="privacy-s8" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>8. Security</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          We use reasonable administrative, technical, and organizational measures; including authentication, row-level
          database authorization, hashed bot-key storage, input validation, rate limiting, CSRF origin checks, and
          append-only money ledgers; designed to protect information. However, no system, transmission, or storage
          method is completely secure. You use the Service and submit information at your own risk, and you must keep
          your credentials and bot keys secret.
        </p>

        </div>
        </details>
        <details id="privacy-s9" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>9. Your rights (U.S., GDPR, and global)</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          Depending on your jurisdiction and applicable law, you may have the rights below. We honor them as required
          and extend self-service access, portability, correction, and deletion to all signed-in users through{" "}
          <a className={a} href="/my/rights">/my/rights/</a>:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong className="text-white">Know / access / portability:</strong> confirm what we hold and obtain a copy in a portable format (GDPR Arts. 15, 20; CCPA/CPRA and other U.S. state laws);</li>
          <li><strong className="text-white">Correction / rectification:</strong> fix inaccurate profile and account data (GDPR Art. 16); edit it directly in <a className={a} href="/account">/account</a> or ask us;</li>
          <li><strong className="text-white">Deletion / erasure:</strong> delete your data and account (GDPR Art. 17; U.S. state delete rights) via the self-service flow, subject to Section 11 exceptions;</li>
          <li><strong className="text-white">Restrict / limit and object:</strong> restrict processing or object to legitimate-interests processing and direct marketing (GDPR Arts. 18, 21);</li>
          <li><strong className="text-white">Withdraw consent:</strong> opt out of analytics/marketing where consent was the basis, without affecting prior lawful use;</li>
          <li><strong className="text-white">Opt out of sale/share/targeted ads:</strong> we do not sell personal information or share it for cross-context behavioral advertising, so there is nothing to toggle; this statement is your opt-out notice;</li>
          <li><strong className="text-white">Non-discrimination and appeal:</strong> we will not discriminate for exercising your rights; if we deny a U.S. state-law request, you may appeal by replying to the decision email;</li>
          <li><strong className="text-white">Complain:</strong> lodge a complaint with your supervisory authority (e.g., your EU/EEA Data Protection Authority or the UK ICO) or Attorney General, without giving up the right to contact us first.</li>
        </ul>
        <p>
          New Hampshire law governs our agreement (see Terms). Where another jurisdiction grants you non-waivable
          rights, those rights apply in addition and nothing here limits them. California “Shine the Light” requests
          may be sent to <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a>.
        </p>

        </div>
        </details>
        <details id="privacy-s10" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>10. Automated decision-making</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          We do not make decisions producing legal or similarly significant effects about you by purely automated means.
          Automated systems (spam triage, cheat detection, AI-assisted moderation, fraud guards) support human review;
          significant actions; account termination, CSAM referral, rights-request decisions; involve human judgment,
          and you may ask for human review of any such decision.
        </p>

        </div>
        </details>
        <details id="privacy-s11" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>11. How to exercise your rights (self-service + special cases)</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          <strong className="text-white">Your own account; self-service only.</strong> Sign in and use{" "}
          <a className={a} href="/my/rights">/my/rights/</a> to download your data (access/portability) or permanently
          delete your data and account (erasure). Only the signed-in account holder can delete their own account -
          requests for anyone else’s data are refused there. To stop spam and abuse, self-service requests require
          sign-in, same-origin verification, per-account and per-network rate limits, a typed confirmation, and a
          short review window; confirmed deletions are final and immediately sign you out.
        </p>
        <p>
          <strong className="text-white">Special cases; email.</strong> If you cannot use self-service (for example,
          you are family or a legal representative of a deceased or incapacitated user seeking deletion, or an
          authorized agent with written permission), email{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> from an address we can verify,
          describing the request, the account (email/handle), your relationship, and attaching proof of authority
          (e.g., death certificate plus proof of kinship or legal appointment; agents: signed permission plus identity
          verification of the principal). We verify every such request, may ask for the minimum additional proof
          needed, and act only when satisfied the request is legitimate. We never accept third-party deletion demands
          without authority.
        </p>
        <p>
          <strong className="text-white">Timing and verification.</strong> We verify identity (signed-in session for
          self-service; documented authority for email requests) and respond within the applicable deadline; within
          one month for GDPR requests (extendable by two months for complexity) and within 45 days (extendable) for
          U.S. state-law requests. We may retain or decline to delete information where permitted or required by law,
          including account-security and fraud-prevention records, completed-transaction and tax records, safety/CSAM
          evidence under legal hold, information needed for legal claims, and content others lawfully retain; and we
          will explain any denial and your appeal options.
        </p>

        </div>
        </details>
        <details id="privacy-s12" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>12. Children</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          Direct accounts are <strong>13+ only (Teen 13-17, Adult 18+)</strong> - the Service is not directed to
          children under 13, and we do not knowingly collect their personal information through direct signup (which
          requires a Teen/Adult band and rejects under-13). Under-13 children may use the Service <strong>only on a
          parent-created Child sub-account</strong> (COPPA verifiable parental consent: an Adult 18+ parent signs up
          and creates the child in Account → Family, attesting the child&apos;s Kid/Teen/Adult band). We collect no
          date of birth from anyone - bands only - and apply high-privacy defaults to under-18 accounts (no
          behavioral advertising for signed-in players, minimal data, parental limits enforced server-side, no
          checkout/tips/subscriptions/payouts from child sessions), consistent with COPPA, the EU GDPR consent ages
          (13-16 by member state), the UK Age Appropriate Design Code, the EU Digital Services Act, California&apos;s
          Age-Appropriate Design Code Act, and other applicable child-safety regimes. If you believe a child under 13
          provided information through a direct account, contact{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> so we can delete it. Parents
          export and erase their children&apos;s data together with their own at{" "}
          <a className={a} href="/my/rights">/my/rights/</a>. Account holders must be 13 or older (see Terms).
        </p>
        <p>
          Kids-band servers are join-gated and parental controls apply in-shard; bands only, no date of birth is
          collected for shard access.
        </p>

        </div>
        </details>
        <details id="privacy-s13" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>13. Third parties and changes</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          The Service may link to third-party websites or services; their privacy practices are governed by their own
          policies, not this one. We may update this policy at any time by posting an updated version and changing its
          effective date; material changes will be highlighted where practical. Your continued use after the effective
          date is subject to the updated policy.
        </p>

        </div>
        </details>
        <details id="privacy-s14" data-legal className="group scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <h2 className={h2}>14. Contact</h2>
            <span aria-hidden="true" className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-black text-cyan-300 transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 border-t border-border/60 px-4 py-4">
        <p>
          MattyJacks LLC · New Hampshire, USA ·{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> · Self-service rights:{" "}
          <a className={a} href="/my/rights">/my/rights/</a> · Deceased-user family and other special-case requests:
          email with proof of authority as described in Section 11.
        </p>
          </div>
        </details>
      </section>
        </div>
      </div>
  );
}

export default function PrivacyPage() {
  return (
      <MarketingPage title="Privacy Policy" intro="Effective September 13, 2026 · MattyJacks LLC, New Hampshire, USA">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading policy…</p>}>
        <CachedPrivacyBody />
      </Suspense>
    </MarketingPage>
  );
}
