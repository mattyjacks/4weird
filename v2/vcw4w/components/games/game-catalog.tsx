"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Game } from "@/content/games";
import { getGameA11y } from "@/lib/game-a11y";
import { isKidsMode, requiredAgeFor, setKidsMode } from "@/lib/age-gate";
import { bandMinAge } from "@/lib/family";
import { RatingBadge } from "@/components/games/rating-badge";
import { InfoTip } from "@/components/ui/info-tip";
import { KidBanner } from "@/components/family/kid-banner";
import { debounce, filterGamesAsync } from "@/lib/perf-client";
import styles from "./game-catalog.module.css";

const picks = ["overtake", "lastwordszombies", "gravegain2d", "gravegain3d", "battlesharks2", "serversavershield", "assassinanimals"];
function Card({ game, recommended = false }: { game: Game; recommended?: boolean }) { const a11y = getGameA11y(game.slug); const a11yBadges = [a11y.keyboardOnly ? "⌨️ keyboard" : null, !a11y.colorDependent ? "🎨 color-free" : "🎨 filter me", "♿ assists"].filter(Boolean) as string[]; return <article className={`${styles.card} perf-card`}><div className={`${styles.art} ${styles[`art${game.slug}`] ?? ""}`} aria-hidden="true"><span>{game.emoji}</span><i /><div className={styles.badges}>{recommended && <b>RECOMMENDED</b>}<em>📱 + 💻</em></div><div className={styles.playMark}>▶</div></div><div className={styles.body}><div><h3>{game.title}</h3><small>{game.genre}</small></div><div className="mt-1"><RatingBadge rating={game.rating ?? "kids"} /> <InfoTip text="Rating shows who the game is for: kids, teens, or adults. Adults games hide when Kids Mode is on." label="About ratings" /></div><p>{game.description}</p><div className={styles.tags}>{game.tags.slice(0,3).map(tag=><span key={tag}>{tag}</span>)}</div><div className={styles.tags} aria-label={`Accessibility: ${a11yBadges.join(", ")}`}>{a11yBadges.map(b=><span key={b}>{b}</span>)}<InfoTip text="Accessibility badges show input needs at a glance. Keyboard means playable without a mouse." label="About accessibility badges" /></div><Link href={`/games/${game.slug}/play`} className={styles.play}>PLAY NOW <span>→</span></Link></div></article> }
export function GameCatalog({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [kids, setKids] = useState(false);
  // A live child session filters by parent-attested band: kid band hides
  // Teens + Adults, teen band hides Adults. 99 = no child session.
  const [kidMaxAge, setKidMaxAge] = useState(99);
  const [workerSlugs, setWorkerSlugs] = useState<string[] | null>(null);
  // Kids Mode hides Adults (18+) games everywhere in the catalog. The flag
  // lives on this device (localStorage) for guests and is mirrored from the
  // signed-in account's settings when available.
  useEffect(() => {
    setKids(isKidsMode());
    fetch("/api/family/kid-login", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: unknown) => {
        const band = (body as { kid?: { age_band?: string } } | null)?.kid?.age_band;
        if (band) setKidMaxAge(bandMinAge(band));
      })
      .catch(() => undefined);
    const syncKid = () => {
      fetch("/api/family/kid-login", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((body: unknown) => {
          const band = (body as { kid?: { age_band?: string } } | null)?.kid?.age_band;
          setKidMaxAge(band ? bandMinAge(band) : 99);
        })
        .catch(() => undefined);
    };
    // Guests have no settings row (a fetch would just 401 + console noise),
    // so check the session first; device-level Kids Mode still applies.
    fetch("/api/auth/session", { credentials: "include" })
      .then((s) => (s.ok ? fetch("/api/settings", { credentials: "include" }) : null))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((body: unknown) => {
        const flag = (body as { settings?: { kids_mode?: boolean } } | null)?.settings?.kids_mode;
        if (typeof flag === "boolean") {
          setKidsMode(flag);
          setKids(flag);
        }
      })
      .catch(() => undefined);
    const sync = () => setKids(isKidsMode());
    window.addEventListener("kids-mode-changed", sync);
    window.addEventListener("kid-session-changed", syncKid);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kids-mode-changed", sync);
      window.removeEventListener("kid-session-changed", syncKid);
      window.removeEventListener("storage", sync);
    };
  }, []);
  function toggleKids(next: boolean) {
    setKidsMode(next);
    setKids(next);
    window.dispatchEvent(new Event("kids-mode-changed"));
    // Best-effort account persistence for signed-in players (guests keep
    // the device-level flag only - no request, no 401 noise). Merge over the
    // stored settings so unrelated preferences are never clobbered.
    fetch("/api/auth/session", { credentials: "include" })
      .then((s) => (s.ok ? fetch("/api/settings", { credentials: "include" }) : null))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((body: unknown) => {
        const current = (body as { settings?: Record<string, boolean> } | null)?.settings;
        if (!current) return undefined;
        return fetch("/api/settings", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...current, kids_mode: next }),
        });
      })
      .catch(() => undefined);
  }
  const genres = useMemo(() => ["All", ...Array.from(new Set(games.map(g => g.genre))).sort()], [games]);
  const items = useMemo(
    () => games.map((g) => ({ slug: g.slug, genre: g.genre, haystack: `${g.title} ${g.description} ${g.tags.join(" ")}` })),
    [games],
  );
  // Debounce keystrokes so filtering runs at most ~7x/sec while typing.
  const pushQuery = useMemo(() => debounce((v: string) => setDebouncedQuery(v), 140), []);
  useEffect(() => { pushQuery(query); }, [query, pushQuery]);
  // Heavy filter runs in /workers/search-worker.js; sync fallback inside.
  useEffect(() => {
    let live = true;
    void filterGamesAsync(items, debouncedQuery, genre).then((slugs) => { if (live) setWorkerSlugs(slugs); });
    return () => { live = false; };
  }, [items, debouncedQuery, genre]);
  const filtered = useMemo(() => {
    // Kids Mode hides Adults; a live child session additionally caps by
    // parent-attested band (kid band hides Teens too).
    const visible = games.filter((g) => {
      const minAge = requiredAgeFor(g.rating ?? "kids");
      if (minAge > kidMaxAge) return false;
      if (kids && (g.rating ?? "kids") === "adults") return false;
      return true;
    });
    if (!workerSlugs) {
      const q = debouncedQuery.toLowerCase();
      return visible.filter(g => `${g.title} ${g.description} ${g.tags.join(" ")}`.toLowerCase().includes(q) && (genre === "All" || g.genre === genre));
    }
    const order = new Map(workerSlugs.map((s, i) => [s, i]));
    return visible.filter(g => order.has(g.slug)).sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
  }, [games, workerSlugs, debouncedQuery, genre, kids, kidMaxAge]);
  const hiddenAdults = kids ? games.filter((g) => (g.rating ?? "kids") === "adults").length : 0;
  const surprise = () => { const pool = filtered.length ? filtered : games.filter((g) => requiredAgeFor(g.rating ?? "kids") <= kidMaxAge); const game = pool[Math.floor(Math.random() * pool.length)]; window.location.assign(`/games/${game.slug}/play`) }; const recommended = picks.map(slug => games.find(g => g.slug === slug)).filter((g): g is Game => Boolean(g)).filter((g) => requiredAgeFor(g.rating ?? "kids") <= kidMaxAge && (!kids || (g.rating ?? "kids") !== "adults")); return <><section className={styles.hero}><p>4WEIRD GAMES // ARCADE NETWORK</p><h1>Find your next <span>weird</span> world.</h1><h2>Big browser games, tiny loading times, and an arcade built for the screen in your hand.</h2><div><a href="#recommended">EXPLORE PICKS ↓</a><button type="button" onClick={surprise}>⌘ SURPRISE ME</button></div><div><label><input type="checkbox" checked={kids} onChange={e => toggleKids(e.target.checked)} /> 🔒 Kids Mode; hide Adults (18+) games <InfoTip text="Hides Adults (18+) games across the catalog. Teens games still ask a 13+ check before playing." label="About Kids Mode" /></label></div><div><Link href="/family/login">🎮 Kid &amp; teen login (name#1234)</Link></div></section><div className="mx-auto max-w-6xl px-4 pt-4"><KidBanner /></div>{kids && <p role="status">🔒 Kids Mode is on - {hiddenAdults} Adults (18+) game{hiddenAdults === 1 ? " is" : "s are"} hidden. Teens (13-17) games ask a 13+ age check before playing.</p>}<section className={styles.section} id="recommended"><header><div><p>CURATED SIGNAL</p><h2>Recommended games</h2></div><span>7 hand-picked worlds</span></header><div className={`${styles.grid} perf-list`}>{recommended.map(g => <Card key={g.slug} game={g} recommended />)}</div></section><section className={styles.section}><header><div><p>FULL LIBRARY</p><h2>Choose a portal</h2></div><span role="status">{filtered.length} games online</span></header><div className={styles.filters}><label><span>⌕</span><input aria-label="Search games" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the arcade" /></label><div>{genres.map(item => <button type="button" key={item} className={genre === item ? styles.active : ""} onClick={() => setGenre(item)}>{item}</button>)}</div></div><div className={`${styles.grid} perf-list`}>{filtered.map(g => <Card key={g.slug} game={g} />)}</div>{!filtered.length && <p className={styles.empty}>No games found. Clear the signal and try again.</p>}</section></>
}
