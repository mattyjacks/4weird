"use client";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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

const PAGE_SIZE = 24;
const picks = ["overtake", "lastwordszombies", "gravegain2dA", "gravegain3dA", "battlesharks2", "serversavershield", "assassinanimals"];

function a11yBadgesFor(slug: string) {
  const a11y = getGameA11y(slug);
  return [
    a11y.keyboardOnly ? "⌨️ keyboard" : null,
    !a11y.colorDependent ? "🎨 color-free" : "🎨 filter me",
    "♿ assists",
  ].filter(Boolean) as string[];
}

// Compact arcade card (~190px): 16:9 emoji thumb with hover-play overlay,
// title + rating + Info button. Full description/tags/a11y live in the
// side drawer (no page push), opened via onInfo.
const Card = memo(function Card({
  game,
  recommended = false,
  onInfo,
}: {
  game: Game;
  recommended?: boolean;
  onInfo: (slug: string) => void;
}) {
  return (
    <article className={`${styles.card}${recommended ? ` ${styles.recommendedCard}` : ""} perf-card`}>
      <Link
        href={`/games/${game.slug}`}
        className={`${styles.art} ${styles[`art${game.slug}`] ?? ""}`}
        aria-label={`View ${game.title} details`}
        tabIndex={-1}
      >
        <span aria-hidden="true">{game.emoji}</span>
        <i aria-hidden="true" />
        <div className={styles.badges}>
          {recommended && <b>RECOMMENDED</b>}
          <em>📱 + 💻</em>
        </div>
        <div className={styles.playMark} aria-hidden="true">
          ▶
        </div>
      </Link>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3>
            <Link href={`/games/${game.slug}`} className={styles.titleLink}>
              {game.title}
            </Link>
          </h3>
          <small>{game.genre}</small>
        </div>
        <div className={styles.metaRow}>
          <RatingBadge rating={game.rating ?? "kids"} />
          <button
            type="button"
            className={styles.infoBtn}
            onClick={(e) => { e.stopPropagation(); onInfo(game.slug); }}
            aria-label={`About ${game.title}`}
          >
            ⓘ Info
          </button>
        </div>
        <Link href={`/games/${game.slug}/play`} className={styles.play} aria-label={`Play ${game.title} now`}>
          PLAY NOW <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
});

// Side drawer: full game details without leaving the catalog view.
function GameDrawer({ game, onClose }: { game: Game; onClose: () => void }) {
  const badges = a11yBadgesFor(game.slug);
  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`About ${game.title}`}
        className={styles.drawer}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.drawerClose} onClick={onClose} aria-label="Close details">
          ✕
        </button>
        <div className={`${styles.art} ${styles.drawerArt} ${styles[`art${game.slug}`] ?? ""}`} aria-hidden="true">
          <span>{game.emoji}</span>
          <i />
        </div>
        <h2>{game.title}</h2>
        <small className={styles.drawerGenre}>{game.genre}</small>
        <div className={styles.drawerRow}>
          <RatingBadge rating={game.rating ?? "kids"} />{" "}
          <InfoTip
            side="bottom"
            text="Rating shows who the game is for: kids, teens, or adults. Adults games hide when Kids Mode is on."
            label="About ratings"
          />
        </div>
        <p className={styles.drawerDesc}>{game.description}</p>
        <div className={styles.tags}>
          {(game.tags ?? []).slice(0, 3).map((tag, index) => (
            <span key={String(tag ?? "") || index}>{String(tag ?? "")}</span>
          ))}
        </div>
        <div className={styles.tags} aria-label={`Accessibility: ${badges.join(", ")}`}>
          {(badges ?? []).map((b, index) => (
            <span key={String(b ?? "") || index}>{String(b ?? "")}</span>
          ))}
          <InfoTip
            side="bottom"
            text="Accessibility badges show input needs at a glance. Keyboard means playable without a mouse."
            label="About accessibility badges"
          />
        </div>
        <Link href={`/games/${game.slug}/play`} className={styles.play} aria-label={`Play ${game.title} now`}>
          PLAY NOW <span aria-hidden="true">→</span>
        </Link>
      </aside>
    </div>
  );
}

export function GameCatalog({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [kids, setKids] = useState(false);
  // A live child session filters by parent-attested band: kid band hides
  // Teens + Adults, teen band hides Adults. 99 = no child session.
  const [kidMaxAge, setKidMaxAge] = useState(99);
  const [workerSlugs, setWorkerSlugs] = useState<string[] | null>(null);
  // Side-drawer selection: game slug or null (closed).
  const [drawerSlug, setDrawerSlug] = useState<string | null>(null);
  // Pagination/windowing: render PAGE_SIZE cards at a time so 100+ game
  // lists scroll fast; "Show more" appends the next window.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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
  const genres = useMemo(() => ["All", ...Array.from(new Set((Array.isArray(games) ? games : []).map(g => g.genre))).sort()], [games]);
  const items = useMemo(
    () => (Array.isArray(games) ? games : []).map((g) => ({ slug: g.slug, genre: g.genre, haystack: `${g.title} ${g.description} ${(g.tags ?? []).join(" ")}` })),
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
    const visible = (Array.isArray(games) ? games : []).filter((g) => {
      const minAge = requiredAgeFor(g.rating ?? "kids");
      if (minAge > kidMaxAge) return false;
      if (kids && (g.rating ?? "kids") === "adults") return false;
      return true;
    });
    if (!workerSlugs) {
      const q = String(debouncedQuery ?? "").toLowerCase();
      return visible.filter(g => `${g.title} ${g.description} ${(g.tags ?? []).join(" ")}`.toLowerCase().includes(q) && (genre === "All" || g.genre === genre));
    }
    const order = new Map((workerSlugs ?? []).map((s, i) => [s, i]));
    return visible.filter(g => order.has(g.slug)).sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
  }, [games, workerSlugs, debouncedQuery, genre, kids, kidMaxAge]);
  // Reset the window whenever the result set identity changes.
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [debouncedQuery, genre, kids, kidMaxAge, games]);
  const visible = useMemo(() => (filtered ?? []).slice(0, visibleCount), [filtered, visibleCount]);
  const showMore = useCallback(() => { setVisibleCount((n) => Math.min(n + PAGE_SIZE, (filtered ?? []).length)); }, [filtered.length]);
  const hiddenAdults = kids ? (Array.isArray(games) ? games : []).filter((g) => (g.rating ?? "kids") === "adults").length : 0;
  const openInfo = useCallback((slug: string) => { setDrawerSlug(slug); }, []);
  const closeInfo = useCallback(() => { setDrawerSlug(null); }, []);
  // Escape closes the drawer; body scroll locks while it is open.
  useEffect(() => {
    if (!drawerSlug) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerSlug(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerSlug]);
  const surprise = () => {
    const pool = (filtered ?? []).length ? (filtered ?? []) : (Array.isArray(games) ? games : []).filter((g) => requiredAgeFor(g.rating ?? "kids") <= kidMaxAge);
    if ((pool ?? []).length === 0) return;
    const game = pool[Math.floor(Math.random() * pool.length)];
    if (!game?.slug) return;
    window.location.assign(`/games/${game.slug}/play`);
  };
  const recommended = picks
    .map(slug => (Array.isArray(games) ? games : []).find(g => g.slug === slug))
    .filter((g): g is Game => Boolean(g))
    .filter((g) => requiredAgeFor(g.rating ?? "kids") <= kidMaxAge && (!kids || (g.rating ?? "kids") !== "adults"));
  const drawerGame = drawerSlug ? ((Array.isArray(games) ? games : []).find((g) => g.slug === drawerSlug) ?? null) : null;
  const isSearching = String(debouncedQuery ?? "").trim().length > 0 || genre !== "All";
  return (
    <div className={styles.wrap}>
      {/* Sticky 48px filter bar: title + search + category pills + kids + surprise */}
      <div className={styles.bar} role="search">
        <h1 className={styles.barTitle}>Arcade ({(filtered ?? []).length})</h1>
        <label className={styles.search}>
          <span aria-hidden="true">🔍</span>
          <input
            aria-label="Search games"
            type="search"
            inputMode="search"
            autoComplete="off"
            enterKeyHint="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search the arcade"
          />
        </label>
        <div className={styles.pills} role="group" aria-label="Filter by category">
          {(genres ?? []).map(item => (
            <button
              type="button"
              key={String(item ?? "")}
              aria-pressed={genre === item}
              className={genre === item ? styles.active : ""}
              onClick={() => setGenre(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className={styles.kids} title="Hides Adults (18+) games across the catalog. Teens games still ask a 13+ check before playing.">
          <input type="checkbox" checked={kids} onChange={e => toggleKids(e.target.checked)} />
          🔒 Kids
        </label>
        <button type="button" className={styles.surprise} onClick={surprise}>
          ⌘ Surprise
        </button>
      </div>
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <KidBanner />
      </div>
      {kids && (
        <p role="status" className={styles.kidsNote}>
          🔒 Kids Mode is on - {hiddenAdults} Adults (18+) game{hiddenAdults === 1 ? " is" : "s are"} hidden. Teens
          (13-17) games ask a 13+ age check before playing.
        </p>
      )}
      <section className={styles.section} id="recommended" aria-label="Staff picks">
        <header className={styles.secHead}>
          <div>
            <p>START HERE</p>
            <h2>{recommended.length} staff picks to start with</h2>
          </div>
          <span>racers, RPGs + money sims</span>
        </header>
        {!isSearching && (
        <div className={`${styles.grid} perf-list`}>
          {(recommended ?? []).map((g, index) => (
            <Card key={g?.slug ?? index} game={g} recommended onInfo={openInfo} />
          ))}
        </div>
        )}
        {isSearching && (
          <p className={styles.empty}>Staff picks hidden while filtering — see the full library below.</p>
        )}
      </section>
      <section className={styles.section} aria-label="Full game library">
        <header className={styles.secHead}>
          <div>
            <p>FULL LIBRARY · ALL {games.length}</p>
            <h2>Choose your portal</h2>
          </div>
          <span role="status">
            {(filtered ?? []).length} games online · showing {(visible ?? []).length}
          </span>
        </header>
        <div className={`${styles.grid} perf-list`}>
          {(visible ?? []).map((g, index) => (
            <Card key={g?.slug ?? index} game={g} onInfo={openInfo} />
          ))}
        </div>
        {(visible ?? []).length < (filtered ?? []).length && (
          <div className={styles.moreWrap}>
            <button type="button" className={styles.moreBtn} onClick={showMore}>
              Show more ({(filtered ?? []).length - (visible ?? []).length} remaining)
            </button>
          </div>
        )}
        {!(filtered ?? []).length && <p className={styles.empty}>No games found. Clear the signal and try again.</p>}
      </section>
      <p className={styles.footLinks}>
        <span>
          New here? Gamers <Link href="/games/overtake/play">race Overtake</Link> · Coders{" "}
          <Link href="/games/lastwordszombies/play">survive Last Words Zombies</Link> · Business{" "}
          <Link href="/games/financialfreedom/play">run Financial Freedom</Link>
        </span>
        <Link href="/family/login">🎮 Kid &amp; teen login (name#1234)</Link>
      </p>
      {drawerGame && <GameDrawer game={drawerGame} onClose={closeInfo} />}
    </div>
  );
}
