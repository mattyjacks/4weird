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
          Games — including its games, play shells, guides, leaderboards, Clans social features, bot platform, agent
          rentals, Vibe Coins economy, Teams/enterprise workspaces, VibeCodeWorker surfaces, exhibits, accounts,
          virtual items, software, APIs, and related websites and services (collectively, the “Service”). By accessing
          or using the Service, you accept these Terms. If you do not agree, do not use the Service. Our{" "}
          <a className={a} href="/privacy">Privacy Policy</a> is incorporated by reference, as are any additional
          terms presented for a specific feature or purchase.
        </p>

        <h2 className={h2}>1. Eligibility and accounts</h2>
        <p>
          You represent that you may lawfully enter into these Terms and that you are at least 13 years old. The
          Service is not directed to children under 13. If you are a minor in your jurisdiction, you may use the
          Service only with the involvement and consent of a parent or legal guardian who accepts these Terms on your
          behalf. You must provide accurate registration information, keep your credentials confidential, and promptly
          notify us of any unauthorized access. You are responsible for all activity through your account and for all
          information or content you submit. One promotional trial per person applies (see Section 8); we use
          privacy-preserving signals to enforce it. We may refuse registration, reclaim usernames, or suspend, limit,
          or terminate any account or access at any time, with or without notice, to the fullest extent permitted by
          law — including for suspected fraud, abuse, chargebacks, or violations of these Terms.
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
          <li>exploit bugs, cheat, tamper with game state, telemetry, leaderboards, saves, coins, referrals, or metering — enabling Cheat Mode permanently marks the affected save and the mark cannot be removed by deleting or recreating the save;</li>
          <li>use the Service unlawfully or in violation of any applicable law, including export-control and sanctions laws — no illegal content of any kind is allowed, anywhere on the Service;</li>
          <li>infringe intellectual-property, privacy, or other rights; upload malicious code; impersonate others; or harvest other users’ information;</li>
          <li>harass, threaten, defame, hate-target, or harm anyone; post sexual content involving minors in any form — this results in immediate removal, account termination, evidence preservation, and referral to authorities (see Section 5);</li>
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
          by a human — offending content is deleted only after authorities confirm. Never repost or further describe
          suspected CSAM; report it instead.
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

        <h2 className={h2}>5. Safety rules you accept</h2>
        <p>
          Money moves only through guarded server-side transactions — never award currency client-side. Never expose
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

        <h2 className={h2}>8. Vibe Coins, purchases, and refunds</h2>
        <p>
          Vibe Coins are a virtual currency: 100 coins = exactly $1.00 ($0.01 per coin). Every price already includes
          a 25% platform cut — it is never added on top. Packs (500 / 1500 / 5000 / 25000 coins, plus custom
          500–100,000), the daily login bonus (5 + 1 per streak day, capped at 12, once per UTC day), referrals (25
          coins each side, one use per invitee, no self-use), and the 100-coin ($1.00) signup trial (once per person,
          enforced per IP-hash; no 100-coin pack is sold) operate server-side under anti-double-mint guards.
          Checkout is processed by Shopify (and/or other payment processors) under their terms; we reconcile paid
          grants by order email. Virtual currency, progress, and items are licensed features with no cash value, are
          not property, are non-transferable, and may be changed, removed, or discontinued at any time. Purchases are
          final except where required by applicable law (including non-waivable EU/UK consumer rights) or expressly
          stated otherwise.
        </p>

        <h2 className={h2}>8A. Voluntary Support and Launch campaigns (not charity, not investment)</h2>
        <p>
          <strong>What this is.</strong> The Service lets you (a) send voluntary one-time tips and monthly support
          subscriptions in Vibe Coins to verified creators and Clans (“Support”), and (b) give and receive gift-based
          backing for creative project-launch campaigns — game launches, tech startups, and creative tech
          (“Campaigns”). Both move closed-loop Vibe Coins only, with the 25% platform cut already included in every
          gross amount (never added on top). Support and Campaign transfers are voluntary, gratuitous, and final once
          executed — “coffee money,” not a purchase and not a contract for goods, services, or outcomes.
        </p>
        <p>
          <strong>What this is not.</strong> Nothing on the Support or Campaign surfaces is charitable: MattyJacks is
          not a charity, recipients are not charities, transfers are not charitable donations, are not tax-deductible,
          and are not charitable solicitations under New Hampshire RSA 7:19 and following or any other charitable-law
          regime. Nothing there is an investment, security, loan, or revenue-share: Campaigns may not offer equity,
          shares, interest, dividends, profit-shares, guaranteed returns, or any ownership or financial return, and any
          campaign using charity, medical, emergency, disaster-relief, political, or investment language is rejected.
          Coins have no cash value, are licensed platform features under Section 8, and can never be redeemed, cashed
          out, or converted to money by anyone — recipients receive platform credits spendable on the Service only.
          Because no money is transmitted to third parties and no cash-out exists, the Service does not act as a money
          transmitter, e-money issuer, bank, broker, or investment platform.
        </p>
        <p>
          <strong>Subscriptions and tips.</strong> Subscribing charges the first 30-day period immediately and renews
          every 30 days while active; you may cancel anytime from the Support page, which stops future renewals without
          proration or refund of completed periods. If a renewal cannot be covered by your balance, the subscription
          lapses to past-due instead of charging you into a negative balance. Tips are single gratuitous transfers and
          are final when sent. You cannot support yourself, and clan owners fund their own clan through the wallet
          rather than tipping it. Only verified creators can receive personal Support; verification is granted by
          MattyJacks after human review, may be granted or revoked at our discretion, and signifies only that we
          reviewed a request — not an endorsement, employment, partnership, or guarantee of any creator or clan.
        </p>
        <p>
          <strong>Campaign rules.</strong> Campaigns are limited to the listed creative categories (game-launch,
          startup, creative-tech) and must include a truthful title, story, and use-of-funds statement. Creators must
          describe their project honestly, may not mislead about progress, use of funds, affiliations, or risks, and
          must not promise outcomes they cannot deliver. Any perks or rewards mentioned are aspirational goals the
          creator hopes to deliver — not contractual obligations, sales of goods, or guarantees. Backing a Campaign is
          a gift: backers receive no ownership, equity, financial return, or enforceable right to any reward. Raised
          coins credit the creator’s coin balance (or the linked clan wallet) as platform credits; closing or
          cancelling a Campaign stops new backing but does not reverse credited transfers except where we intervene for
          proven fraud. We may freeze, hide, or remove any Campaign or Support tier, suspend payouts of credited coins
          pending review, and re-credit defrauded supporters from frozen amounts where technically possible.
        </p>
        <p>
          <strong>Eligibility, taxes, and your rights.</strong> You must be at least 13 (and have any required
          parental consent) to send or receive Support or to create or back a Campaign, and you must comply with
          sanctions, export-control, and all other applicable laws — prohibited persons and prohibited jurisdictions
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

        <h2 className={h2}>9. Agent rentals and Teams compute (25% cut on all computing)</h2>
        <p>
          The marketplace lists rentable agents (openclaw/nanoclaw/custom) on providers such as RunPod and
          DigitalOcean. Bookings escrow the gross coin amount; metered heartbeats settle gross into a 25% platform
          share and 75% provider share, never above escrow. Providers run bring-your-own-endpoint until configured;
          the app never fakes a provision. Teams/enterprise (UnitUnite) workspaces — orgs, teams, projects, rooms,
          roles, org wallets, and the cloud catalog (GPU pods, serverless, storage, databases, KV, queue) — are
          metered per workspace under the same included 25% cut, with every cent of the platform share attributed in
          the cut ledger. Compute features depend on third-party capacity and may be unavailable, delayed, or
          re-priced; estimates are not guarantees.
        </p>

        <h2 className={h2}>10. Intellectual property and copyright (DMCA)</h2>
        <p>
          The Service — software, games, designs, names, graphics, and content — is owned by MattyJacks or its
          licensors and protected by law. If you believe content on the Service infringes your copyright, email{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> with (a) identification of the
          copyrighted work, (b) the infringing material and its URL, (c) your contact information, (d) a good-faith
          statement, and (e) a statement under penalty of perjury that you are authorized to act, with your physical
          or electronic signature. We respond to valid notices, remove or disable qualifying material, and terminate
          repeat infringers where appropriate.
        </p>

        <h2 className={h2}>11. Third parties</h2>
        <p>
          The Service uses third-party providers (including analytics, authentication/database hosting, checkout and
          payment processing, compute, and AI moderation) and may include third-party links, tools, or listings. We do
          not control, endorse, or assume responsibility for them; your dealings are solely between you and the third
          party under their terms. See the Privacy Policy for provider categories.
        </p>

        <h2 className={h2}>12. Privacy, your rights, and account deletion</h2>
        <p>
          Our <a className={a} href="/privacy">Privacy Policy</a> explains what we collect and your rights under New
          Hampshire and U.S. law and, where applicable, international laws such as the EU/UK GDPR and U.S. state
          privacy laws. You may exercise access, portability, correction, and deletion rights yourself at{" "}
          <a className={a} href="/my/rights">4weird.com/my/rights/</a> (also reachable on 4weird.games): export your
          data or permanently delete your data and account, subject to verification and anti-abuse limits. Self-service
          deletion is strictly limited to the signed-in account holder deleting their own account — you cannot request
          deletion of anyone else’s data through that page. Special cases (for example, family of a deceased user
          seeking deletion) are handled by email at{" "}
          <a className={a} href="mailto:matt@mattyjacks.com">matt@mattyjacks.com</a> with proof of authority; we verify
          every such request before acting. We may retain or decline to delete information where permitted or required
          by law (security, fraud prevention, financial records, legal claims, safety evidence).
        </p>

        <h2 className={h2}>13. Service changes, suspension, and termination</h2>
        <p>
          We may modify, suspend, discontinue, restrict, or remove any part of the Service, content, game, feature,
          account, clan, listing, booking, workspace, or virtual item at any time, without liability or obligation to
          provide a refund, replacement, or continued access, except where the law requires otherwise. You may stop
          using the Service at any time; account deletion is available via Section 12. We may preserve records and
          safety evidence as described in the Privacy Policy.
        </p>

        <h2 className={h2}>14. Disclaimers</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS,” “AS AVAILABLE,” AND WITH ALL
          FAULTS. MATTYJACKS AND ITS OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS, LICENSORS, AND SUPPLIERS DISCLAIM ALL
          WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, AVAILABILITY, SECURITY, AND FREEDOM FROM ERRORS,
          VIRUSES, OR INTERRUPTIONS. WE DO NOT WARRANT THAT THE SERVICE WILL BE SAFE, UNINTERRUPTED, OR ERROR-FREE, OR
          THAT DATA, PROGRESS, OR VIRTUAL ITEMS WILL BE PRESERVED.
        </p>

        <h2 className={h2}>15. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, MATTYJACKS AND ITS OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS,
          LICENSORS, AND SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR
          CONSEQUENTIAL DAMAGES; LOST PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS; COST OF SUBSTITUTE SERVICES; OR
          DAMAGES ARISING FROM OR RELATED TO YOUR USE OF, INABILITY TO USE, OR RELIANCE ON THE SERVICE, EVEN IF
          ADVISED OF THE POSSIBILITY. TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE TOTAL AGGREGATE LIABILITY OF THOSE
          PARTIES FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE OR THESE TERMS WILL NOT EXCEED THE GREATER
          OF $100 USD OR THE AMOUNT YOU PAID DIRECTLY TO MATTYJACKS FOR THE SERVICE IN THE 12 MONTHS BEFORE THE EVENT
          GIVING RISE TO THE CLAIM. YOUR SOLE AND EXCLUSIVE REMEDY FOR DISSATISFACTION IS TO STOP USING THE SERVICE.
          Some jurisdictions do not allow certain exclusions or limitations, so they apply only to the extent permitted
          by applicable law.
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
          nothing in these Terms overrides your non-waivable statutory rights — including privacy rights exercisable
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
