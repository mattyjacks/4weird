import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Getting started",
  description:
    "Create a 4weird account, claim the 100-coin trial and daily bonus, tour the account hub, and do your first useful things in 15 minutes.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";
const p = "mt-3 text-muted-foreground leading-relaxed";

export default function GettingStartedPage() {
  return (
    <article>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        Docs · Start here
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Getting started</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        From zero to playing, saving, earning, and renting in about 15 minutes —
        using only the website. No downloads, no setup.
      </p>

      <h2 className={h2}>1. Create your account (2 minutes)</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
        <li>Open <Link className="underline" href="/auth/sign-up">/auth/sign-up</Link> and register with email + password. Passwords need 8+ characters with 3 of: lowercase, UPPERCASE, digits, symbols.</li>
        <li>New accounts receive a <strong className="text-foreground">free 100-coin ($1.00) trial</strong> — once per person. Your dashboard tells you whether the trial was awarded.</li>
        <li>Sign in at <Link className="underline" href="/auth/login">/auth/login</Link>. Check your session anytime from the header (Login / Sign Up becomes Dashboard).</li>
      </ol>
      <p className={p}>
        Prefer to look around first? Everything readable — games catalog, clan pages, leaderboards,
        pricing — is public. You only need an account when you post, save, rent, or use AI.
      </p>

      <h2 className={h2}>2. Tour your account hub (/account)</h2>
      <p className={p}>
        <Link className="underline" href="/account">/account</Link> is your dashboard: coin balance
        (coins + fractional centicentcoins), checkout, daily claim button, referral code, order-grant
        recovery, and links to usage and rights. Key actions:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">Claim daily bonus:</strong> one button, once per UTC day — 5 coins + 1 per streak day, capped at 12. Streaks reward coming back.</li>
        <li><strong className="text-foreground">Refer friends:</strong> share your 8-character code from <Link className="underline" href="/account">/account</Link>. When someone redeems it, you both get 25 coins (one use per invitee, no self-use).</li>
        <li><strong className="text-foreground">Buy coins:</strong> 500 / 1,500 / 5,000 / 25,000 packs plus custom 500–100,000 at 1¢/coin on <Link className="underline" href="/pricing">/pricing</Link>. Checkout runs through Shopify; paid grants reconcile by order email.</li>
        <li><strong className="text-foreground">Audit spend:</strong> <Link className="underline" href="/my/usage/">/my/usage/</Link> itemizes every cent — game rentals, game AI, Buddy, rentals, clan fees, workspace cloud.</li>
      </ul>

      <h2 className={h2}>3. Your first 15 minutes</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
        <li><strong className="text-foreground">Play a game (5 min):</strong> browse <Link className="underline" href="/games">/games</Link>, open a detail page, read its guide, hit Play. Signed-in play meters coins per second; guests play free with ads. Details in <Link className="underline" href="/docs/playing-games">Playing games</Link>.</li>
        <li><strong className="text-foreground">Save + leaderboard (3 min):</strong> use slots 1–3 on any game, then check <Link className="underline" href="/leaderboards">/leaderboards</Link> for kills, actions, and play-time.</li>
        <li><strong className="text-foreground">Join a clan (4 min):</strong> browse <Link className="underline" href="/clans">/clans</Link>, join one, say hi in #general, react to a post. Details in <Link className="underline" href="/docs/clans">Clans</Link>.</li>
        <li><strong className="text-foreground">Meet the Buddy (3 min):</strong> open <Link className="underline" href="/buddy">/buddy</Link> or the widget on any play page and ask for coaching. Details in <Link className="underline" href="/docs/game-ai-buddy">Game AI &amp; Buddy</Link>.</li>
      </ol>

      <h2 className={h2}>4. Account hygiene</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Keep your login email current — checkout grants, referrals, and rights flows key off it.</li>
        <li>Log out on shared devices via the logout action on /account.</li>
        <li>One trial per person: creating extra accounts to farm trials violates the Terms and is blocked with privacy-preserving signals.</li>
        <li>Need your data or deletion? Self-serve at <Link className="underline" href="/my/rights">/my/rights</Link> — export, correction path, and a guarded 30-minute delete flow. Details in <Link className="underline" href="/docs/privacy-safety">Privacy &amp; safety</Link>.</li>
      </ul>

      <h2 className={h2}>5. Common first-day mistakes</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Enabling <strong className="text-foreground">Cheat Mode</strong> “just to look” — it permanently marks that save (cheat_mode:true) and the mark survives delete/recreate. Use a throwaway slot.</li>
        <li>Buying coins before claiming the free trial + daily bonus — the trial and streak often cover your first sessions.</li>
        <li>Posting before reading a clan&apos;s #announcements — each clan sets its own norms; #general is the safe first post.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/playing-games">Playing games →</Link> ·{" "}
        <Link className="underline" href="/docs/vibe-coins">Vibe Coins →</Link>
      </p>
    </article>
  );
}
