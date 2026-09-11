import type { Metadata } from "next";
import { MarketingPage } from "@/components/site/marketing-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How MattyJacks LLC collects, uses, and protects information on 4weird Games.",
  alternates: { canonical: "/privacy" },
};

const h2 = "text-2xl font-bold text-white";
const a = "text-cyan-200 underline";

export default function PrivacyPage() {
  return (
      <MarketingPage title="Privacy Policy" intro="Effective September 11, 2026 · MattyJacks LLC, New Hampshire, USA">
      <section className="space-y-6">
        <p>
          This policy describes how MattyJacks LLC (“MattyJacks,” “we,” “us,” or “our”) handles information across the
          4weird Games websites, games, accounts, Clans social features, bot platform, agent rentals, Vibe Coins
          economy, Teams/enterprise workspaces, VibeCodeWorker surfaces, exhibits, APIs, and related services
          (collectively, the “Service”). It applies whenever you visit or use the Service, on 4weird.games,
          4weird.com, or any domain where the Service is served.
        </p>

        <h2 className={h2}>1. Who is responsible for your information</h2>
        <p>
          MattyJacks LLC, New Hampshire, USA, is the controller (or “business”) for information collected through the
          Service. Contact: <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a>. Exercise your
          privacy rights yourself anytime at <a className={a} href="/my/rights">/my/rights/</a>; special cases
          (including family requests for a deceased user, with proof of authority) are handled by email; see Section
          11.
        </p>

        <h2 className={h2}>2. Information we collect</h2>
        <p><strong className="text-white">Account and identity.</strong> Email address, password-authentication records, display name, public handle, permanent human ID (bot users), and account timestamps.</p>
        <p><strong className="text-white">Profiles and preferences.</strong> Display name, handle, account settings (friend requests, playtime visibility, marketing email, Kids Mode flag), accessibility controls, and creator submissions.</p>
        <p><strong className="text-white">Games.</strong> Cloud-save content (game, slot 1-3, versioned data ≤1 MiB, including any permanent cheat-mode mark), gameplay telemetry (kills, actions, active seconds, deaths), matchmaking/lobby/presence records, and leaderboard aggregates (handles + totals only).</p>
        <p><strong className="text-white">Clans and user content.</strong> Clans, memberships, posts, comments, uploaded images (≤1 MB; PNG/JPEG/WebP/GIF; hash + storage path), and moderation reports (anonymous reports allowed; CSAM reports trigger immediate quarantine and evidence preservation for authority referral).</p>
        <p><strong className="text-white">Bots.</strong> Bot usernames, human-ID links, and API-key hashes (key secrets are shown once and never stored).</p>
        <p><strong className="text-white">Vibe Coins and transactions.</strong> Coin ledger and grant entries, daily-claim streaks, referral codes and referral links, signup-trial records (privacy-preserving IP hash), checkout sessions and order reconciliation by email, voluntary Support transfers (tips, subscriptions) and gift-based launch-Campaign backing. Campaign pages publicly show the campaign story, goal, raised totals, and backer counts; individual contribution amounts are visible only to you and the campaign creator. Card and payment details are processed by our checkout provider (Shopify and/or its payment processors); we do not store full payment-card numbers.</p>
        <p><strong className="text-white">Agent rentals and Teams compute.</strong> Listings, bookings, escrow and metered-usage records, provider references, org/team/project/room memberships and roles, cloud provisions and usage, wallet ledgers, and audit entries.</p>
        <p><strong className="text-white">Communications.</strong> Support and rights-request messages you send us, including verification and authority documents for special-case requests.</p>
        <p><strong className="text-white">AI and voice/camera features.</strong> Text you send the Gaming Buddy (messages, transcripts, screen text), one downscaled image per message when you share your screen or attach a camera frame, and voice replies we generate for you. Screen snapshots and camera frames are processed for that turn only; never stored, never logged. Microphone audio for interruption detection never leaves your device (only transcripts are sent). Avatar, voice, camera, purchase, and cookie choices tied to your account or device.</p>
        <p><strong className="text-white">Age checks (never collected).</strong> Date of birth entered in a game age gate is checked on your own device, in memory, for that check only. It is never sent to our servers, never written to any database, and never stored in your browser; there is nothing to export or delete because we never receive it. The Kids Mode flag is an ordinary account/device preference, not age data.</p>
        <p><strong className="text-white">Family accounts.</strong> Parent accounts hold their children&apos;s handles (username#1234), parent-attested age bands, play controls (budgets, time limits, hours), wallet ledgers, and daily play totals; never passwords (scrypt hashes only, never exported) and never session tokens. Children have no birth dates on file because none are ever asked. A parent&apos;s data export includes their children&apos;s non-secret records; deleting the parent account erases the children&apos;s accounts with it (sessions die, wallets are gone with the ledger).</p>
        <p><strong className="text-white">Ghost Cash and timer.</strong> Org work tracking holds contracts, timer sessions with heartbeat activity counts, worker-attached proof screenshots (≤1 MB, same handling as clan images), and hypothetical debt records. Heartbeats prove a visible tab, never screen contents; screenshots are supplied by the worker, never captured. Ghost books are org-member-visible (scoped watchers see only their scope) and export with the org member&apos;s own data on request.</p>
        <p><strong className="text-white">Consent and purchase records.</strong> Cookie-banner choices (7-day renewal), accepted purchase quotes, charge receipts, and idempotency records that prove what you confirmed and what we charged.</p>
        <p><strong className="text-white">Automatic technical data.</strong> IP address, browser and device characteristics, request logs, pages or features used, approximate location derived from IP, security and fraud-prevention events (including rate-limit and trial-abuse signals). Games and accessibility controls may store preferences and progress in your browser (local storage).</p>

        <h2 className={h2}>3. How we use information (and GDPR legal bases)</h2>
        <p>We use information to provide, secure, maintain, improve, troubleshoot, personalize, and administer the Service; authenticate users; preserve progress and settings; operate Clans, bots, rentals, workspaces, and leaderboards; process and reconcile transactions; communicate about the Service; prevent fraud, abuse, and security incidents; moderate content and protect safety; and comply with legal obligations. We may create aggregated or de-identified information and use it for any lawful business purpose.</p>
        <p>Where the GDPR/UK GDPR applies, our legal bases are: <em>contract</em> (providing the Service you request, Art. 6(1)(b)); <em>legitimate interests</em> (security, fraud prevention, moderation, service improvement; balanced against your rights, Art. 6(1)(f)); <em>consent</em> (optional analytics/marketing email, Art. 6(1)(a), withdrawable anytime); and <em>legal obligation</em> (records, safety reporting, responding to lawful requests, Art. 6(1)(c)).</p>

        <h2 className={h2}>4. Cookies and similar technologies</h2>
        <p>
          A cookie banner loads on every page until you choose, and asks again once every 7 days. You get real
          options: <strong className="text-white">Accept all</strong> (which we strongly recommend; it funds free
          play, keeps every feature working, and lets us improve the Service for any purpose described here),{" "}
          <strong className="text-white">Reject non-essential</strong>, or{" "}
          <strong className="text-white">Customize</strong> by category. Categories:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong className="text-white">Essential (always on):</strong> sign-in session, security, fraud prevention, load balancing, and your cookie choice itself. The Service cannot sign you in without these.</li>
          <li><strong className="text-white">Analytics (opt-in):</strong> Google Analytics measurement (env-configured measurement ID) and privacy-friendly Vercel Analytics telemetry. Google Analytics loads only after you accept analytics cookies.</li>
          <li><strong className="text-white">Functional (opt-in):</strong> remembered preferences such as theme, voices, avatar shape and color, and game settings.</li>
          <li><strong className="text-white">Marketing (opt-in):</strong> campaign and referral measurement. Marketing email is separately off by default in account settings.</li>
        </ul>
        <p>
          Games and accessibility controls also use browser local storage for preferences and progress. You can change
          your choice anytime by clearing site data (the banner returns), with browser controls,
          “Do Not Track”-respecting settings where honored, or Google’s opt-out tools.
        </p>

        <h2 className={h2}>5. Disclosures and service providers</h2>
        <p>We provide your information to private third parties only as needed for the purposes above, to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong className="text-white">Hosting and delivery:</strong> Vercel (hosting, analytics, edge routing) and Cloudflare (network delivery and security);</li>
          <li><strong className="text-white">Accounts and data:</strong> Supabase (authentication/database);</li>
          <li><strong className="text-white">Payments:</strong> Shopify (checkout, order reconciliation) and its payment processors, under their terms;</li>
          <li><strong className="text-white">Measurement:</strong> Google Analytics (only with your analytics consent) and Vercel Analytics, under their terms;</li>
          <li><strong className="text-white">AI chat and reasoning:</strong> OpenAI; OpenRouter (routing to Meta Muse Spark, Google Gemini, and Anthropic Claude models); DeepSeek; Google Gemini; Anthropic Claude; Meta; your prompts, transcripts, and attached images are processed to produce replies under their terms, and we do not authorize them to use your inputs to train their models;</li>
          <li><strong className="text-white">AI voice and media:</strong> ElevenLabs (text-to-speech, speech-to-text, sound and music) and fal.ai (image, video, audio, 3D generation), under their terms;</li>
          <li><strong className="text-white">Compute:</strong> RunPod / DigitalOcean or your custom endpoint when you book agent or cloud compute;</li>
          <li><strong className="text-white">Moderation:</strong> OpenAI-based screening that assists human review of reported content;</li>
          <li><strong className="text-white">Safety and legal:</strong> NCMEC CyberTipline for suspected child exploitation (filed by a human); U.S. courts and authorities upon valid legal request such as a court order, subpoena, or other lawful process; and parties necessary to protect rights, safety, and the Service or enforce our Terms; including against illegal content, which is never allowed;</li>
          <li><strong className="text-white">Corporate:</strong> a buyer or successor in a merger, financing, sale, or reorganization, under confidentiality.</li>
        </ul>
        <p>
          We <strong className="text-white">do not sell personal information for money</strong> and do not share it
          for cross-context behavioral advertising. Providers process information under their own terms and may process
          it outside your state or country (see Section 6). Receipts and ledgers carry no personal details beyond
          your account reference.
        </p>

        <h2 className={h2}>6. International transfers</h2>
        <p>
          We are based in the United States and the Service is operated from the U.S. If you use the Service from the
          EEA, UK, Switzerland, or elsewhere, your information is transferred to and processed in the U.S. and other
          provider locations. Where required, we use appropriate safeguards (such as Standard Contractual Clauses) and
          retain information only under the bases in Section 3.
        </p>

        <h2 className={h2}>7. Retention</h2>
        <p>
          We retain information only as long as reasonably necessary for the purposes in Section 3: while your account
          is active; for records, security, dispute resolution, and legal compliance afterward; safety and CSAM
          evidence as required for authority referral and legal claims; and financial/transaction records as tax and
          payments law requires. When you delete your account at <a className={a} href="/my/rights">/my/rights/</a>,
          we delete or de-identify your personal data across our systems except where retention is permitted or
          required by law (Section 11 lists the exceptions). Backups age out on their normal cycle.
        </p>

        <h2 className={h2}>8. Security</h2>
        <p>
          We use reasonable administrative, technical, and organizational measures; including authentication, row-level
          database authorization, hashed bot-key storage, input validation, rate limiting, CSRF origin checks, and
          append-only money ledgers; designed to protect information. However, no system, transmission, or storage
          method is completely secure. You use the Service and submit information at your own risk, and you must keep
          your credentials and bot keys secret.
        </p>

        <h2 className={h2}>9. Your rights (U.S., GDPR, and global)</h2>
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

        <h2 className={h2}>10. Automated decision-making</h2>
        <p>
          We do not make decisions producing legal or similarly significant effects about you by purely automated means.
          Automated systems (spam triage, cheat detection, AI-assisted moderation, fraud guards) support human review;
          significant actions; account termination, CSAM referral, rights-request decisions; involve human judgment,
          and you may ask for human review of any such decision.
        </p>

        <h2 className={h2}>11. How to exercise your rights (self-service + special cases)</h2>
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

        <h2 className={h2}>12. Children</h2>
        <p>
          The Service is not directed to children under 13, and we do not knowingly collect their personal
          information. If you believe a child under 13 provided information, contact{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> so we can delete it. Account
          holders must be 13 or older (see Terms).
        </p>

        <h2 className={h2}>13. Third parties and changes</h2>
        <p>
          The Service may link to third-party websites or services; their privacy practices are governed by their own
          policies, not this one. We may update this policy at any time by posting an updated version and changing its
          effective date; material changes will be highlighted where practical. Your continued use after the effective
          date is subject to the updated policy.
        </p>

        <h2 className={h2}>14. Contact</h2>
        <p>
          MattyJacks LLC · New Hampshire, USA ·{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> · Self-service rights:{" "}
          <a className={a} href="/my/rights">/my/rights/</a> · Deceased-user family and other special-case requests:
          email with proof of authority as described in Section 11.
        </p>
      </section>
    </MarketingPage>
  );
}
