import type { Metadata } from "next";
import { MarketingPage } from "@/components/site/marketing-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms governing use of the 4weird Games service.",
  alternates: { canonical: "/terms" },
};

const h2 = "text-2xl font-bold text-white";
const a = "text-cyan-200 underline";

export default function TermsPage() {
  return (
      <MarketingPage title="Terms of Use" intro="Effective September 11, 2026 · Please read these terms carefully.">
      <section className="space-y-6">
        <p>
          These Terms of Use (“Terms”) form a binding agreement between you and MattyJacks LLC, a New Hampshire
          limited liability company (“MattyJacks,” “we,” “us,” or “our”), governing your access to and use of 4weird
          Games; including its games, play shells, guides, leaderboards, Clans social features, bot platform, agent
          rentals, Vibe Coins economy, Teams/enterprise workspaces, VibeCodeWorker surfaces, exhibits, accounts,
          virtual items, software, APIs, and related websites and services (collectively, the “Service”). By accessing
          or using the Service, you accept these Terms. If you do not agree, do not use the Service. Our{" "}
          <a className={a} href="/privacy">Privacy Policy</a> is incorporated by reference, as are any additional
          terms presented for a specific feature or purchase.
        </p>

        <h2 className={h2}>1. Eligibility and accounts</h2>
        <p>
          Direct accounts are <strong>13+ only</strong>: <strong>Teen (13-17)</strong> or{" "}
          <strong>Adult (18+)</strong>. You represent at signup that you meet your band (13-17 for Teen, 18+ for
          Adult) and that you meet the minimum age where you live or have parent/guardian permission where your
          law requires it (including EU GDPR consent ages 13-16, the UK age 13, and U.S. state requirements). We
          collect no date of birth to verify this — only your self-declared band — so do not sign up with a false
          band. <strong>Under 13 has no direct account:</strong> a parent or legal guardian (an Adult 18+ account
          holder) must sign up and create a <strong>Child</strong> sub-account for the child instead (see Section
          4B); do not enter a Teen/Adult band for an under-13. If you are a minor in your jurisdiction, you may use
          the Service only with the involvement and consent of a parent or legal guardian who accepts these Terms on
          your behalf. Only Adult (18+) accounts may create Child sub-accounts, make purchases, or receive fiat
          payouts. You must provide accurate registration information, keep your credentials confidential, and promptly
          notify us of any unauthorized access. You are responsible for all activity through your account and for all
          information or content you submit. One promotional trial per person applies (see Section 8); we use
          privacy-preserving signals to enforce it. We may refuse registration, reclaim usernames, or suspend, limit,
          or terminate any account or access at any time, with or without notice, to the fullest extent permitted by
          law; including for suspected fraud, abuse, age-band misrepresentation, chargebacks, or violations of these
          Terms. We comply with the U.S. Children&apos;s Online Privacy Protection Act (COPPA), the EU/UK GDPR age
          rules, the UK Age Appropriate Design Code, the EU Digital Services Act, California&apos;s Age-Appropriate
          Design Code Act, and other applicable child-safety and privacy regimes; where your law grants non-waivable
          protections (see Section 18), those apply in addition.
        </p>

        <h2 className={h2}>2. License and acceptable use</h2>
        <p>
          Subject to these Terms, MattyJacks grants you a limited, revocable, non-exclusive, non-transferable,
          non-sublicensable license to use the Service for personal, non-commercial entertainment. Automated access is
          permitted only through our official bot program (Section 6) or with our prior written permission. All rights
          not expressly granted are reserved by MattyJacks.
        </p>
        <p>You agree not to, and not to attempt to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>copy, modify, distribute, sell, lease, sublicense, or create derivative works from the Service;</li>
          <li>reverse engineer, decompile, scrape, data-mine, circumvent security or access controls, or interfere with or disrupt the Service;</li>
          <li>exploit bugs, cheat, tamper with game state, telemetry, leaderboards, saves, coins, referrals, or metering; enabling Cheat Mode permanently marks the affected save and the mark cannot be removed by deleting or recreating the save;</li>
          <li>use the Service unlawfully or in violation of any applicable law, including export-control and sanctions laws; no illegal content of any kind is allowed, anywhere on the Service;</li>
          <li>infringe intellectual-property, privacy, or other rights; upload malicious code; impersonate others; or harvest other users’ information;</li>
          <li>harass, threaten, defame, hate-target, or harm anyone; post sexual content involving minors in any form; this results in immediate removal, account termination, evidence preservation, and referral to authorities (see Section 5);</li>
          <li>alternatively monetize, cash out, or extract value from Coins, Crowns, or Ghost Cash outside the expressly permitted paths in Sections 8–8A.1; including selling, buying, trading, exchanging, gifting-for-cash, pegging to fiat or crypto, advertising exchange rates, factoring Ghost IOUs, using balances as collateral, or routing around the closed loop (see Sections 8 and 8C);</li>
          <li>abuse support, reporting, or privacy-request channels, including filing false reports or automated bulk requests.</li>
        </ul>

        <h2 className={h2}>3. Your content, Clans, and moderation</h2>
        <p>
          You retain ownership of content you own and post (posts, comments, images ≤1 MB in PNG/JPEG/WebP/GIF, code
          submissions, clan descriptions), but you grant MattyJacks a worldwide, royalty-free, transferable,
          sublicensable license to host, reproduce, adapt, display, distribute, and use it as necessary to operate,
          improve, promote, and protect the Service. You represent you have the rights to post it. Reading Clans is
          public; posting requires an account and, in member-only clans, membership. Spam or suspected automated abuse
          may be held in a pending state for review.
        </p>
        <p>
          Moderation combines automated screening (including AI-assisted review), heuristic filters, user reports, and
          human review. Reports may be filed anonymously. We may remove or restrict any content, clan, or account at
          our discretion, without liability, to the fullest extent permitted by law. Content reported as child sexual
          abuse material (“CSAM”) is hidden immediately, preserved as evidence (including file hashes), queued for
          human review, and reported to the National Center for Missing &amp; Exploited Children (NCMEC) CyberTipline
          by a human; offending content is deleted only after authorities confirm. Never repost or further describe
          suspected CSAM; report it instead.
        </p>

        <h2 className={h2}>3A. Game submissions (.zip), Weird Vault, and Meshy 3D</h2>
        <p>
          You may submit games as <strong>.zip packages (max 50 MB, so every game loads fast)</strong>, naming the{" "}
          <strong>game root</strong> inside the .zip where your entry file lives (like a
          deploy Root Directory). Every package is statically scanned and marked{" "}
          <strong>safe, warning, unsafe, or denied</strong>. Packages flagged unsafe or
          denied are <strong>quarantined</strong>: never served, never displayed, and
          queued for human moderator review. Malware, keyloggers, viruses, cybercrime
          tools, and sexual content (never allowed on the Service; removed, not rated)
          are hard-denied. Storage and code audits are metered in Vibe Coins with the
          25% platform cut already included. The <strong>Weird Vault</strong> stores your
          game code and assets (including AI-made models, images, animations, code,
          chats, logs, audio, video, and text, which autosave to your personal, team,
          or organization scope) in strictly separated scopes enforced by the database.{" "}
          <strong>Meshy.ai 3D tools</strong> run purely through Meshy&apos;s API under
          their terms; finished models autosave to your Vault with game-readiness notes.
        </p>
        <p>
          <strong>Safety referrals are human-only.</strong> Suspected child sexual abuse
          material is hidden immediately, preserved as hash evidence only (never viewable,
          never described), queued for human review, and referred to the NCMEC
          CyberTipline <strong>by a human</strong>. Uploader network identifiers are
          stored as salted hashes and disclosed <strong>only on valid legal process</strong>{" "}
          (such as a court order or subpoena); there is no automatic reporting pipeline,
          consistent with Sections 5 and 11.
        </p>

        <h2 className={h2}>4. Games, saves, telemetry, and leaderboards</h2>
        <p>
          The catalog offers browser games in isolated play shells with guides and metadata. Cloud saves offer up to
          three slots per game (≤1 MiB each, versioned); enabling cheats permanently marks that save
          (“cheat_mode:true”) as a database invariant that delete/recreate cannot launder, and cloud saves generally
          cannot be reset from the client. Gameplay telemetry (kills, actions, active seconds, deaths) powers
          per-game leaderboards showing handles and totals only; anonymous play is allowed where offered. Matchmaking,
          lobbies, presence, friends, and direct messages are provided as-is and may be changed or discontinued.
        </p>

        <h2 className={h2}>4A. Age ratings, age checks, and Kids Mode</h2>
        <p>
          Games carry an age rating - <strong>Kids (0-12)</strong>, <strong>Teens (13-17)</strong>, or{" "}
          <strong>Adults (18+)</strong>; shown on every catalog card, detail page, and play shell. Ratings reflect intense
          violence or horror themes only: sexual content is never allowed on the Service; it is removed, not rated
          (see Section 2). Your account band enforces ratings server-side: <strong>Teen (13-17)</strong> full accounts
          are blocked from Adults (18+) games outright and play Teens games freely; <strong>Adult (18+)</strong> full
          accounts pass Adults games only after an on-device 18+ date-of-birth check each time. Accounts with{" "}
          <strong>Kids Mode</strong> turned on (games catalog or account settings) cannot see or play Adults games
          at all, and can play Teens games only after passing a 13+ date-of-birth check. Any date of birth you enter
          in a game gate is checked on your own device and is never stored; not in our database, not in your browser
          (see the Privacy Policy). A date-of-birth entry can never override your account band: a Teen band stays
          blocked from Adults titles even with an adult date typed in.
        </p>

        <h2 className={h2}>4B. Parent and Child accounts</h2>
        <p>
          Only an <strong>Adult (18+)</strong> account holder may become a <strong>Parent</strong> account
          (automatically, on creating their first child) and create <strong>Child</strong> sub-accounts — including
          for under-13 children, who have no other path onto the Service (COPPA verifiable parental consent: the
          parent&apos;s own Adult signup + their authenticated creation of the child IS the consent). Children
          log in with a parent-chosen <strong>username#1234 + password</strong> and have no email, no checkout, and no
          Supabase login of their own. You attest each child&apos;s age band (Kid 0-12, Teen 13-17, Adult 18+) when you
          create the account; the band gates ratings with no date of birth collected from anyone (Kid plays Kids
          titles, Teen adds Teens, Adult plays everything, all enforced server-side). Children spend only
          coins you grant from your own balance into their wallet (spendable on play like normal coins, no cash value,
          never withdrawable); you set their monthly coin budget (with optional hard stop), daily play-time limit, and
          allowed play hours in your timezone; all enforced server-side, including mid-play. Children cannot check out,
          tip, subscribe, or receive payouts. Suspending a child stops
          play immediately; closing an account refunds its remaining wallet to you. You are responsible for your
          children&apos;s activity, for keeping their passwords safe on shared devices (resetting logs them out
          everywhere), and for complying with parental-consent and child-privacy laws where you live (including COPPA,
          the EU GDPR consent ages 13-16, the UK Age Appropriate Design Code and Data Protection Act 2018, the EU
          Digital Services Act, California&apos;s Age-Appropriate Design Code Act, and other U.S. state regimes
          referenced in Section 18); among others, children&apos;s data is exported and
          erased together with your account at <a className={a} href="/my/rights">/my/rights/</a>. Full accounts hold
          only Teen (13-17) or Adult (18+) bands — never Kid — set at signup and changeable on the Account page within
          those two bands; Teen bands apply the same Adults-blocking as Kids Mode without collecting any birth date.
          Under-18 accounts get high-privacy defaults (no behavioral ads for signed-in players, minimal data, parent
          controls where applicable).
        </p>

        <h2 className={h2}>5. Safety rules you accept</h2>
        <p>
          Money moves only through guarded server-side transactions; never award currency client-side. Never expose
          service-role keys, bot key secrets, or provider tokens. Never render other users’ content as executable HTML.
          Respect rate limits and retry signals. Prices always state the gross amount with the 25% platform cut
          included, never added on top.
        </p>

        <h2 className={h2}>6. Bot program (agentic access)</h2>
        <p>
          Signed-in users may create a bot identity (immutable username plus a permanent human ID) and issue API keys
          shown once and stored only as hashes. Keys authenticate as the linked human, subject to the same membership,
          moderation, and rate-limit rules; rotate or revoke keys anytime on the bot setup page. You are responsible
          for everything done with your keys. We may revoke keys or identities for abuse.
        </p>

        <h2 className={h2}>7. VibeCodeWorker, Spaceships, Academy, Tech, and Web Apps</h2>
        <p>
          These exhibits and QA product surfaces (run pages, run/job APIs, evidence-driven tooling) are part of the
          Service under these Terms. Run and job APIs require authentication except where marked public; usage may be
          metered, rate-limited, or discontinued at any time.
        </p>

        <h2 className={h2}>8. Coins (spend) and Crowns (earn), purchases, and refunds</h2>
        <p>
          The Service uses two closed-loop units. <strong>🪙 Coins (spend)</strong> are a virtual
          currency: 100 coins = exactly $1.00 ($0.01 per coin). <strong>👑 Crowns (earn)</strong> are
          non-transferable earn-only payout points: 100 crowns = $1.00 of payout value (1¢ each) or
          100 coins on 1:1 convert, because the 25% platform cut was already taken when the underlying
          coins were gifted. Neither is money, property, or crypto. Every price already includes
          a 25% platform cut; it is never added on top. Packs (500 / 1500 / 5000 / 25000 coins, plus custom
          500-100,000), the daily login bonus (5 + 1 per streak day, capped at 12, once per UTC day), referrals (25
          coins each side, one use per invitee, no self-use), and the 100-coin ($1.00) signup trial (once per person,
          enforced per IP-hash; no 100-coin pack is sold) operate server-side under anti-double-mint guards.
          Checkout is processed by Shopify (and/or other payment processors) under their terms; we reconcile paid
          grants by order email. Coins are licensed features with no cash value, are
          not property, are non-transferable except as expressly permitted gifts executed by guarded
          server-side transactions, are spendable on cloud computing, game credits, and other on-site services only (never cash-out, never withdrawable), and may be changed, removed, or discontinued at any time. Purchases are
          final except where required by applicable law (including non-waivable EU/UK consumer rights) or expressly
          stated otherwise; including the 90-day unspent-purchase refund below.
        </p>
        <p>
          <strong>90-day refund on unspent purchased coins.</strong> Coins you bought (paid packs only -
          never free trial, daily, referral, alpha, or other granted coins) can be refunded within 90 days of
          purchase, up to the unspent remainder of each coin lot. Spending uses the oldest unexpired coins first,
          so a partially-spent pack refunds pro-rata for whatever is still unspent (for example: buy 500, spend
          200, refund up to 300). Refunded lots are marked refunded and the coins are removed from your balance;
          request a refund from your account page. Free coins are never refundable.
        </p>
        <p>
          <strong>Ghost Cash (👻) is not currency at all.</strong> The org timer tracks work to the second and
          records who owes whom in Ghost Cash; a centrally-controlled hypothetical unit with no legal value, no cash
          value, no cash-out, and no store-of-value function. It cannot buy anything, cannot be transferred off the
          Service, and creates no debt enforceable anywhere but social agreement inside your org. Ghost Cash is a
          tracking-only ruler for hypothetical payments; it is never itself a way of making payments, and any
          real-world settlement happens entirely off the Service, between users, without us (see Section 8C). Timer
          activity scores come from visible-tab heartbeats the worker&apos;s own device reports; proof screenshots are
          attached by the worker, never captured by us. Because no money or monetary value moves, Ghost Cash is not a
          purchase, not a transfer of funds, and not a money-transmission or e-money service.
        </p>

        <h2 className={h2}>8A. Voluntary Support and Launch campaigns (not charity, not investment)</h2>
        <p>
          <strong>What this is.</strong> The Service lets you (a) send voluntary one-time tips and monthly support
          subscriptions in Coins to verified creators and Clans (“Support”), and (b) give and receive gift-based
          backing for creative project-launch campaigns; game launches, tech startups, and creative tech
          (“Campaigns”). Both move closed-loop Coins only, with the 25% platform cut already included in every
          gross amount (never added on top). Gifting deducts the supporter’s Coins first; the 75% net then mints
          time-locked Crowns for individual recipients under Section 8A.1 (clan recipients credit the shared clan
          wallet instead). Support and Campaign transfers are voluntary, gratuitous, and final once
          executed - “coffee money,” not a purchase and not a contract for goods, services, or outcomes.
        </p>
        <p>
          <strong>What this is not.</strong> Nothing on the Support or Campaign surfaces is charitable: MattyJacks is
          not a charity, recipients are not charities, transfers are not charitable donations, are not tax-deductible,
          and are not charitable solicitations under New Hampshire RSA 7:19 and following or any other charitable-law
          regime. Nothing there is an investment, security, loan, or revenue-share: Campaigns may not offer equity,
          shares, interest, dividends, profit-shares, guaranteed returns, or any ownership or financial return, and any
          campaign using charity, medical, emergency, disaster-relief, political, or investment language is rejected.
          Coins have no cash value, are licensed platform features under Section 8, and can never be redeemed, cashed
          out, withdrawn, or converted to money by anyone; individual recipients receive time-locked Crowns under Section 8A.1 (spendable on-site only after 1:1 convert, or withdrawable in fiat only through our licensed payout provider), and clan recipients receive shared wallet credits spendable on cloud computing, game credits, and other on-site services only.
          Because no money is transmitted to third parties on the gift itself and no direct coin cash-out exists, the gift leg does not act as a money
          transmitter, e-money issuer, bank, broker, or investment platform; fiat payouts under Section 8A.1 are executed by our licensed payout provider, not by us as transmitter.
        </p>
        <p>
          <strong>Subscriptions and tips.</strong> Subscribing charges the first 30-day period immediately and renews
          every 30 days while active; you may cancel anytime from the Support page, which stops future renewals without
          proration or refund of completed periods. If a renewal cannot be covered by your balance, the subscription
          lapses to past-due instead of charging you into a negative balance. Tips are single gratuitous transfers and
          are final when sent. You cannot support yourself, and clan owners fund their own clan through the wallet
          rather than tipping it. Only verified creators can receive personal Support; verification is granted by
          MattyJacks after human review, may be granted or revoked at our discretion, and signifies only that we
          reviewed a request; not an endorsement, employment, partnership, or guarantee of any creator or clan.
        </p>
        <p>
          <strong>Campaign rules.</strong> Campaigns are limited to the listed creative categories (game-launch,
          startup, creative-tech) and must include a truthful title, story, and use-of-funds statement. Creators must
          describe their project honestly, may not mislead about progress, use of funds, affiliations, or risks, and
          must not promise outcomes they cannot deliver. Any perks or rewards mentioned are aspirational goals the
          creator hopes to deliver; not contractual obligations, sales of goods, or guarantees. Backing a Campaign is
          a gift: backers receive no ownership, equity, financial return, or enforceable right to any reward. Raised
          coins credit the creator’s Crown balance under Section 8A.1 (or the linked clan wallet) as platform credits; closing or
          cancelling a Campaign stops new backing but does not reverse credited transfers except where we intervene for
          proven fraud. We may freeze, hide, or remove any Campaign or Support tier, suspend crediting and use of credited coins
          pending review, and re-credit defrauded supporters from frozen amounts where technically possible.
        </p>
        <p>
          <strong>Eligibility, taxes, and your rights.</strong> You must be at least 13 (and have any required
          parental consent) to send or receive Support or to create or back a Campaign, and you must comply with
          sanctions, export-control, and all other applicable laws; prohibited persons and prohibited jurisdictions
          may not participate. Recipients are solely responsible for any tax consequences of coins they receive and
          should consult a tax advisor; we provide transaction records on the account and usage pages but no tax
          advice. If you are in the EEA, UK, or Switzerland: the pre-contract information in these Terms and on the
          Support/Campaign pages is provided before you commit; by confirming a tip, subscription charge, or Campaign
          contribution you expressly request immediate execution of a digital-content transfer and acknowledge you lose
          any withdrawal right once executed. Reports about misleading Campaigns or Support abuse can be filed through
          the in-Service reporting flow or by email at{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a>; we review reports under our
          hosting-provider duties (including EU Digital Services Act notice-and-action) and act against fraud,
          counterfeiting, and unlawful fundraising.
        </p>

        <h2 className={h2}>8A.1. Crowns (earn): time locks, convert, and fiat payouts</h2>
        <p>
          <strong>The timelines, up front.</strong> Crowns you earn today are locked for 30 days by
          anti-fraud and payments regulations — this cannot be bypassed, not by us and not by support.
          After that: converting Crowns to Coins takes effect immediately (1+ crowns, 1:1, no fee) once
          unlocked; cashing Crowns out to fiat takes a minimum of 30 days after earning plus provider
          processing time (typically 5–10 business days after you request a payout). There is no instant
          cash-out on this Service, ever.
        </p>
        <p>
          <strong>What Crowns are.</strong> Crowns are earn-only, non-transferable payout points, not
          currency, money, property, securities, or crypto. They cannot be bought, sold, gifted,
          transferred, or spent directly. They are minted only when your gifted Coins net settles:
          Support tips/subscriptions, creator-direct Campaign backing, and compute-provider shares
          (Section 9). Clan, org, and shared-wallet credits are not Crowns and never become payout-eligible.
          Balances earned before the Crowns launch remain Coins and never become Crowns.
        </p>
        <p>
          <strong>Time locks and expiry.</strong> Every Crown lot unlocks 30 days after receipt
          (fraud/chargeback clearing required by our anti-money-laundering, sanctions, and payments
          compliance duties — including card-network chargeback windows and the 90-day Coin refund window;
          locked Crowns cannot be paid out, converted, or expedited for any reason), expires 1 year after receipt, and is consumable only while
          unlocked and unexpired, oldest eligible first. Locked or expired Crowns do not count toward
          payouts or converts. If the underlying Coin gift refunds or chargebacks inside 90 days, we
          may claw back the corresponding Crowns from remaining lots first, then carry any shortfall as
          ledger debt against future earnings. Payout and convert calls serialize on the same
          per-account lock so concurrent requests cannot double-spend one lot.
        </p>
        <p>
          <strong>Two exits, your choice.</strong> (a) <em>Convert to Coins (on-site, 1:1, no fee):</em>{" "}
          convert any amount from 1 crown upward into your own Coins at exactly 100 Crowns = 100 Coins,
          available only after the 30-day unlock and effective immediately once requested.
          Converted Coins are ordinary spend Coins with a fresh 1-year expiry: spendable on-site, giftable
          with a fresh 25% cut if re-gifted, never directly cashable. Converts are final. (b){" "}
          <em>Fiat payout via our licensed payout provider:</em> request 5,000+ crowns ($50 minimum) for
          payout in fiat to your verified account, available only after the 30-day unlock plus provider
          processing (typically 5–10 business days). We do not transmit the money ourselves; a licensed
          provider (such as Stripe, Hyperwallet, or Tipalti) performs identity verification, sanctions
          screening, tax reporting, and the transfer under its own terms. We never pay out in crypto
          directly; if the provider offers a crypto rail on its side, that is between you and the provider.
        </p>
        <p>
          <strong>KYC is mandatory for cash-out.</strong> Fiat payouts require government-issued identity
          verification, sanctions screening, and tax documentation (W-9/W-8BEN or local equivalents) through
          our payout provider before the first payout, plus re-verification whenever the provider or the law
          requires it. We may also require proof of address or source-of-funds information,
          and we will hold or refuse payouts until verification completes. Converting Crowns to Coins does not
          require provider KYC, but still requires the 30-day unlock and a verified creator account standing.
        </p>
        <p>
          <strong>Who can cash out, and where.</strong> Payouts require: (i) age 18+ with a verified
          creator account (minors, child sub-accounts, and unverified accounts may earn and convert but
          may never receive fiat); (ii) residence in a currently allowlisted payout country — which we have
          not yet finalized or published, so fiat payouts are currently unavailable everywhere and Crowns
          are convertible to Coins only until we announce the country list (once published, everywhere else
          stays credits-and-convert only); (iii) clean fraud standing and completed
          provider KYC. Prohibited persons, sanctioned jurisdictions, and export-controlled dealings are
          excluded entirely. We may change the allowlist, hold, delay, split, or refuse any payout for fraud,
          safety, compliance, or provider-capacity reasons, without liability.
        </p>
        <p>
          <strong>No payout guarantee; availability risk is yours.</strong> You acquire and hold Crowns at
          your own risk. We do not promise that fiat payouts will ever be available to you — not in your
          country, not at any amount, not at any time. If you cannot cash out because you live in a
          restricted or unlisted country, fail or cannot complete KYC, are sanctioned or otherwise
          ineligible, lose verification or good standing, or because the law, our provider, capacity, fraud
          controls, or our own discretion prevents it, that is not our fault and gives rise to no claim:
          no compensation, no refund of gifted amounts, no damages, no exchange or alternative payout. Your
          Crowns remain usable as on-site Coins via 1:1 convert where eligible, and that is the full extent
          of what we owe. To the fullest extent permitted by law, Sections 14 and 15 apply to Crowns in full:
          the Service is as-is with no guarantee of payout availability, our aggregate liability is $0, and
          your sole remedy for dissatisfaction is to stop using the Service.
        </p>
        <p>
          <strong>Taxes are on earn, not on exit.</strong> The taxable event is earning Crowns, not
          converting or cashing them out. Recipients are solely responsible for all tax consequences and
          should consult a tax advisor; the provider collects W-9/W-8BEN (or equivalents) and issues
          1099-NEC/1099-K/1042-S, DAC7, or other required reports. We provide transaction records on the
          account and usage pages but no tax advice. Nothing here is employment, partnership, or agency.
        </p>

        <h2 className={h2}>8B. AI features (Buddy, voices, generated media)</h2>
        <p>
          The Service includes AI features; the Gaming Buddy, AI voices and narration, game-AI directors and
          dialogue, AI moderation assistance, and AI-generated images, audio, video, and 3D content. These features
          are powered in part by third-party AI providers (Section 11). <strong>AI output is generated, not
          verified:</strong> it may be wrong, incomplete, hallucinated, or inappropriate. Do not rely on it as
          professional, medical, legal, financial, or safety advice, and do not rely on it in emergencies. We do not
          guarantee that any AI feature is available, accurate, or fit for any purpose, to the fullest extent
          permitted by law. Voice and camera features run only with your explicit opt-in, per message or frame; see
          the Privacy Policy for what leaves your device and what never does.
        </p>

        <h2 className={h2}>8C. Timer, Work Diary, and Ghost Cash (👻) non-legal debt ledger</h2>
        <p>
          The Service provides a second-by-second time tracker and work diary (/timer) with optional work-diary screen
          capture proofs and activity monitoring. Time tracked within organizations and projects may accrue debts
          measured in a non-monetary bookkeeping unit designated as <strong>Ghost Cash (👻)</strong>.
        </p>
        <p>
          <strong>(a) Tracking only; never a payment method. NO CASH VALUE OR LEGAL TENDER.</strong> Ghost Cash is
          strictly an internal, centrally controlled bookkeeping and expense-tracking metric used <em>only</em> to keep
          track of hypothetical payments: to measure hours worked down to the exact second and to record hypothetical
          debts between participating organization members, freelancers, and marketers. Ghost Cash is NOT legal tender,
          currency, money, security, commodity, or cryptocurrency, has no cash value, has no exchange rate, confers no
          equity or rights against MattyJacks LLC, and cannot be redeemed, withdrawn, or cashed out. Ghost Cash ledgers,
          balances, contracts, timer summaries, and debts are informal private worksheets; they do not move money, do
          not settle debts on the Service, and do not create legally enforceable obligations against any person or
          against MattyJacks. If members choose to settle anything in the real world, they do so entirely off the
          Service, at their own risk and under their own arrangements; MattyJacks is not a party to, broker of, or
          guarantor of any such arrangement. Optional screen proofs captured during timer sessions require explicit
          device permission and may be blurred or deleted at any time by the user.
        </p>
        <p>
          <strong>(b) Invoices are informal aids for org officers; not our invoices.</strong> Ghost Cash summaries and
          &quot;invoice&quot; actions exist solely to help an organization&apos;s <strong>Lord</strong> and{" "}
          <strong>Banker</strong>; and, at the org&apos;s option, its <strong>Captain</strong>; prepare informal
          internal memoranda of who worked how long at what hypothetical rate. These memoranda are generated by and for
          org members; they are not issued, endorsed, or verified by MattyJacks, are not tax invoices, VAT/GST
          invoices, payroll records, wage statements, or receipts, and carry no legal, tax, accounting, or employment
          effect. MattyJacks makes no representation about hours actually worked, work quality, worker classification,
          minimum wage, overtime, or amounts lawfully owed. Each user is solely responsible for creating any formally
          valid invoice, contract, payroll filing, or tax record they may need under their own jurisdiction&apos;s laws,
          and for determining whether any off-Service payment triggers tax, reporting, employment, or licensing duties.
        </p>
        <p>
          <strong>(c) What Ghost Cash is not; worldwide.</strong> Because no money or monetary value moves on the
          Service through Ghost Cash, the feature is designed to stay outside money, payments, banking, securities, and
          crypto-asset regimes in every jurisdiction; including, without limitation, U.S. federal and state money
          transmission and money-services-business laws (including FinCEN regulations), the EU&apos;s Payment Services
          Directive (PSD2), Electronic Money Directive (EMD2), and Markets in Crypto-Assets Regulation (MiCA), the
          UK&apos;s Payment Services Regulations, Electronic Money Regulations, and Financial Services and Markets Act,
          and equivalent e-money, payment-institution, banking/deposit-taking, stored-value, virtual-asset, and
          securities laws elsewhere. Concretely: Ghost Cash involves no acceptance, holding, or transmission of funds;
          no issuance of e-money, stored value, or deposits; no third-party payments; no foreign exchange; no
          redeemability into fiat, crypto, goods, or services; no interest, yield, or profit expectation; and no
          transferability outside the closed org book in which it was recorded. Nothing in Ghost Cash is an offer or
          sale of securities, and nothing is a crypto-asset, virtual asset, or stablecoin under any regime. If your
          jurisdiction would treat any off-Service use of Ghost Cash figures (for example, pegging them to fiat or
          using them to demand real payment) as a regulated activity, you must not engage in that use; and any such
          use is yours alone, not the Service&apos;s.
        </p>
        <p>
          <strong>(d) Centralized, revocable display numbers; adjustable at any time with no recourse.</strong> Ghost
          Cash exists only on our centralized systems, is wholly owned and controlled by MattyJacks, and has no legal
          value of any kind. All Ghost Cash figures are display-only bookkeeping entries. We may, in our sole
          discretion and at any time, create, adjust, recalculate, cap, reset, void, or delete any Ghost Cash balance,
          contract rate, timer record, debt, invoice memorandum, or book; in whole or in part, for any reason or no
          reason, with or without notice; and no such action gives rise to any claim, debt, compensation, refund,
          damages, or other legal ramification of any kind, in any jurisdiction, against MattyJacks. You waive, to the
          fullest extent permitted by law, any claim that a Ghost Cash number constitutes property, funds, wages,
          consideration, or an enforceable promise.
        </p>
        <p>
          <strong>(e) No alternative monetization; discretionary ban.</strong> Coins are closed-loop licensed
          platform features (Section 8), Crowns move only through Section 8A.1, and Ghost Cash is a no-value tracking unit; none may be monetized outside
          the Service except through the expressly permitted Crown convert and provider-payout paths. You must not sell, buy, trade, exchange, auction, gift-for-cash, lend against, factor,
          collateralize, peg, or advertise any exchange rate for Coins, Crowns, or Ghost Cash, and must not offer or accept
          fiat, crypto, goods, or services for them, or use Ghost Cash figures to demand, invoice (in the legal sense),
          or collect real-world payment as though they were money. Attempts to &quot;get money out&quot; of Coins, Crowns, or
          Ghost Cash outside Section 8A.1; including secondary markets, OTC deals, IOU factoring, rate-pegging, or routing around the
          closed loop; violate these Terms. Where we suspect such conduct, we may act in our sole discretion and
          without liability: warn, void or reset affected Coins, Crowns, or Ghost Cash figures, freeze or hide books and
          listings, limit features, suspend or permanently ban accounts (including related or evading accounts),
          preserve evidence, and refer matters to authorities. Our decision is final, and no violation creates any cash
          value or redemption right in the affected figures.
        </p>

        <h2 className={h2}>8D. Big communities, pruning, and the Clan Support commons</h2>
        <p>
          Hosted organizations may hold up to <strong>10,000 members</strong> (plus prepaid headroom:
          10 coins per 100 slots, 25% cut included); self-hosted servers are instead capped at{" "}
          <strong>purchased seats</strong>. Clans may hold up to <strong>100,000 members</strong> (plus
          prepaid headroom: 10 coins per 1,000 slots). Caps are enforced server-side; joins past the
          cap are refused. Headroom lifts the ceiling only — per-member upkeep still meters afterwards —
          and headroom purchases are final.
        </p>
        <p>
          <strong>Pruning consent.</strong> By joining or staying in a large organization or clan you agree
          its creator/moderators — and its enabled Automated Member Pruning (opt-in for orgs, on by
          default for clans; arms at 9,000 org / 90,000 clan members) — may remove inactive seats using
          oldest-activity-first, random-chance, oldest-joined-first, or never-contributed ordering, with
          dry-run previews. Owners are never pruned; strategy sweeps spare joins younger than 7 days.
          Pruned members lose their seat, not their account, coins, or history. Removal is final and not
          a refund event.
        </p>
        <p>
          <strong>Clan Support commons.</strong> Upkeep donations and owner funding are receipted per donor
          forever (Supporter Status: Ember 1+, Spark 25+, Beacon 100+, Patron 500+, Legend 2,500+ coins
          lifetime). Donations older than <strong>6 months</strong> past a full year of upkeep protection
          may be shared by the daily commons sweep: at most <strong>~1% of the eligible surplus per
          day</strong> (exponential decay, ≈69-day half-life) and at most <strong>50% of all donated
          coins, lifetime</strong>. Coins older than 12 months are <strong>Globalized</strong> into the
          central clan reserve (which auto-rescues delinquent clans); 6–12-month coins are{" "}
          <strong>Given as Tribute</strong> — 70% to the poorest clans, 20% to the reserve, 10% to poor
          individual members. Expired coin lots never travel. Like all Support (Section 8A), tribute is a
          gratuitous gift: not charity, not investment, no cash-out, final once moved. Tribute never mints Crowns.
        </p>

        <h2 className={h2}>9. Agent rentals and Teams compute (25% cut on all computing)</h2>
        <p>
          The marketplace lists rentable agents (openclaw/nanoclaw/custom) on providers such as RunPod and
          DigitalOcean. Bookings escrow the gross coin amount; metered heartbeats settle gross into a 25% platform
          share and 75% provider share as Crowns for individual providers under Section 8A.1 (or shared wallet credits where the provider is a clan/org), never above escrow. Providers run bring-your-own-endpoint until configured;
          the app never fakes a provision. Teams/enterprise (UnitUnite) workspaces; orgs, teams, projects, rooms,
          roles, org wallets, and the cloud catalog (GPU pods, serverless, storage, databases, KV, queue); are
          metered per workspace under the same included 25% cut, with every cent of the platform share attributed in
          the cut ledger. Orgs may rank members as Lord (org leader), Captain (team leader), Infantry (regular
          player), Banker (finance controller, optionally read-only), or Watcher (sees everything, changes nothing -
          optionally scoped to certain members); one member may hold several presets at once, different in every
          org, with power always the union; rank powers are enforced server-side per action. Everyone may join up to
          100 orgs, each with its own bosses. Compute features depend on third-party capacity and may be unavailable, delayed, or
          re-priced; estimates are not guarantees.
        </p>

        <h2 className={h2}>10. Intellectual property and copyright (DMCA)</h2>
        <p>
          The Service; software, games, designs, names, graphics, and content; is owned by MattyJacks or its
          licensors and protected by law. If you believe content on the Service infringes your copyright, email{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> with (a) identification of the
          copyrighted work, (b) the infringing material and its URL, (c) your contact information, (d) a good-faith
          statement, and (e) a statement under penalty of perjury that you are authorized to act, with your physical
          or electronic signature. We respond to valid notices, remove or disable qualifying material, and terminate
          repeat infringers where appropriate.
        </p>

        <h2 className={h2}>11. Third parties; and who sees your data</h2>
        <p>
          The Service runs on third-party providers that process information on our behalf, and may include
          third-party links, tools, or listings. Our providers are: Google Analytics (usage measurement, Google LLC);
          Vercel (hosting, analytics, and edge routing); Cloudflare (network delivery and security); Supabase
          (authentication and database); Shopify (checkout and order reconciliation); OpenAI (chat, moderation
          assistance, and text-to-speech); OpenRouter (multi-model AI routing, including Meta Muse Spark, Google
          Gemini, and Anthropic Claude models); DeepSeek (AI chat and reasoning); Google Gemini (AI chat, directly or
          via OpenRouter); Anthropic Claude (AI chat, via OpenRouter); Meta (Muse Spark AI, directly or via
          OpenRouter); ElevenLabs (text-to-speech, speech-to-text, sound and music generation); fal.ai (image, video,
          audio, and 3D generation); RunPod (GPU cloud compute); and DigitalOcean (compute). We do not control,
          endorse, or assume responsibility for third-party services; your dealings with them are solely between you
          and the third party under their terms. See the Privacy Policy for provider categories and data flows.
        </p>
        <p>
          We provide your information to private third parties as described in the Privacy Policy; including service
          providers that operate the Service, and buyers or successors in a merger, financing, sale, or
          reorganization under confidentiality; and to U.S. courts and authorities upon valid legal request, such as
          a court order, subpoena, or other lawful process. Illegal content is never allowed: we remove it, terminate
          offending accounts, preserve evidence, and refer it to the appropriate authorities.
        </p>

        <h2 className={h2}>12. Privacy, your rights, and account deletion</h2>
        <p>
          Our <a className={a} href="/privacy">Privacy Policy</a> explains what we collect and your rights under New
          Hampshire and U.S. law and, where applicable, international laws such as the EU/UK GDPR and U.S. state
          privacy laws. You may exercise access, portability, correction, and deletion rights yourself at{" "}
          <a className={a} href="/my/rights">4weird.com/my/rights/</a> (also reachable on 4weird.games): export your
          data or permanently delete your data and account, subject to verification and anti-abuse limits. Self-service
          deletion is strictly limited to the signed-in account holder deleting their own account; you cannot request
          deletion of anyone else’s data through that page. Special cases (for example, family of a deceased user
          seeking deletion) are handled by email at{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> with proof of authority; we verify
          every such request before acting. We may retain or decline to delete information where permitted or required
          by law (security, fraud prevention, financial records, legal claims, safety evidence).
        </p>

        <h2 className={h2}>13. Service changes, suspension, and termination</h2>
        <p>
          We reserve all rights to modify, suspend, discontinue, restrict, cancel, or remove any part of the Service,
          content, game, feature, account, clan, listing, booking, workspace, subscription, or virtual item at any
          time, for any reason or no reason, without liability and without any obligation to provide a refund,
          replacement, proration, or continued access; including when we cancel services or terminate accounts -
          except where the law requires otherwise. Unused coins, items, progress, and credits are forfeited on
          termination or cancellation except where the law requires otherwise. You may stop using the Service at any
          time; account deletion is available via Section 12. We may preserve records and safety evidence as
          described in the Privacy Policy.
        </p>

        <h2 className={h2}>14. Disclaimers; we guarantee nothing</h2>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS,” “AS AVAILABLE,” AND WITH ALL
          FAULTS, AND WE GUARANTEE NOTHING ABOUT IT - NOT UPTIME, NOT ACCURACY, NOT SECURITY, NOT FITNESS FOR ANY
          PURPOSE, AND NOT THAT IT WILL WORK AT ALL. MATTYJACKS AND ITS OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS,
          LICENSORS, AND SUPPLIERS DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE,
          INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY,
          AVAILABILITY, SECURITY, AND FREEDOM FROM ERRORS, VIRUSES, OR INTERRUPTIONS. WE DO NOT WARRANT THAT THE
          SERVICE WILL BE SAFE, UNINTERRUPTED, OR ERROR-FREE, OR THAT DATA, PROGRESS, OR VIRTUAL ITEMS WILL BE
          PRESERVED. AI FEATURES IN PARTICULAR MAY BE UNAVAILABLE OR WRONG AT ANY TIME.
        </p>

        <h2 className={h2}>15. Limitation of liability - $0</h2>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, MATTYJACKS AND ITS OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS,
          LICENSORS, AND SUPPLIERS HAVE ZERO LIABILITY TO YOU, EVER - NOT FOR INDIRECT, INCIDENTAL, SPECIAL,
          EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES; NOT FOR LOST PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS;
          NOT FOR THE COST OF SUBSTITUTE SERVICES; AND NOT FOR DAMAGES ARISING FROM OR RELATED TO YOUR USE OF,
          INABILITY TO USE, OR RELIANCE ON THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY. TO THE FULLEST EXTENT
          PERMITTED BY LAW, THE TOTAL AGGREGATE LIABILITY OF THOSE PARTIES FOR ALL CLAIMS ARISING OUT OF OR RELATED
          TO THE SERVICE OR THESE TERMS IS $0. YOUR SOLE AND EXCLUSIVE REMEDY FOR DISSATISFACTION IS TO STOP USING
          THE SERVICE. Some jurisdictions do not allow certain exclusions or limitations; including limits that
          would erase liability entirely; so this section applies only to the extent permitted by applicable law,
          and nothing here limits rights that cannot lawfully be waived in your jurisdiction (see Section 18).
        </p>

        <h2 className={h2}>16. Indemnification</h2>
        <p>
          To the maximum extent permitted by law, you will defend, indemnify, and hold harmless MattyJacks and its
          owners, officers, employees, contractors, licensors, and suppliers from claims, liabilities, damages, losses,
          and expenses (including reasonable attorneys’ fees) arising from your use of the Service, your content, your
          violation of these Terms, or your violation of law or another person’s rights.
        </p>

        <h2 className={h2}>17. Governing law, venue, and claims</h2>
        <p>
          These Terms are governed by New Hampshire law, without regard to conflict-of-law principles. To the maximum
          extent permitted by law, any dispute arising out of or related to these Terms or the Service must be brought
          exclusively in the state or federal courts located in New Hampshire, and you consent to their jurisdiction
          and venue. You and MattyJacks agree that claims must be brought only on an individual basis, not as a
          plaintiff or class member in any purported class, collective, consolidated, or representative action, to the
          extent permitted by law. Any claim must be filed within one year after it arose, unless a longer period
          cannot lawfully be shortened. Nothing in these Terms limits rights that cannot lawfully be waived, including
          non-waivable consumer, privacy, or employment protections in your jurisdiction.
        </p>

        <h2 className={h2}>18. Mandatory-rights notice</h2>
        <p>
          If you are in the European Economic Area, the United Kingdom, Switzerland, Canada, or a U.S. state with a
          comprehensive privacy law (such as California, Colorado, Connecticut, Oregon, Texas, Utah, or Virginia),
          nothing in these Terms overrides your non-waivable statutory rights; including privacy rights exercisable
          at <a className={a} href="/my/rights">/my/rights/</a>, warranty and withdrawal rights where applicable, and
          the right to seek relief from a competent court or supervisory authority.
        </p>

        <h2 className={h2}>19. Changes to these Terms</h2>
        <p>
          We may update these Terms at any time by posting revised Terms and changing the effective date; material
          changes will be highlighted where practical. Continued use after the effective date constitutes acceptance. If
          any provision is unenforceable, it will be enforced to the maximum extent permitted and the remaining
          provisions remain effective.
        </p>

        <h2 className={h2}>20. General terms and contact</h2>
        <p>
          Our failure to enforce a provision is not a waiver. You may not assign these Terms; we may assign them
          without restriction (for example, in a merger or sale). These Terms, together with the Privacy Policy and
          any additional terms presented for a feature or purchase, are the complete agreement concerning the Service.
          Questions about these Terms may be sent to MattyJacks LLC, New Hampshire, USA at{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a>. Privacy and data-rights requests:
          self-service at <a className={a} href="/my/rights">/my/rights/</a>; special cases (including deceased-user
          family requests with proof of authority) by email at{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a>.
        </p>
      </section>
    </MarketingPage>
  );
}
