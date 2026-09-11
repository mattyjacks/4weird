"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Game } from "@/content/games";
import { debounce, filterGamesAsync } from "@/lib/perf-client";
import styles from "./game-catalog.module.css";

const picks = ["overtake", "lastwordszombies", "gravegain2d", "gravegain3d", "battlesharks2", "serversavershield", "assassinanimals"];
function Card({ game, recommended = false }: { game: Game; recommended?: boolean }) { return <article className={`${styles.card} perf-card`}><div className={`${styles.art} ${styles[`art${game.slug}`] ?? ""}`} aria-hidden="true"><span>{game.emoji}</span><i /><div className={styles.badges}>{recommended && <b>RECOMMENDED</b>}<em>📱 + 💻</em></div><div className={styles.playMark}>▶</div></div><div className={styles.body}><div><h3>{game.title}</h3><small>{game.genre}</small></div><p>{game.description}</p><div className={styles.tags}>{game.tags.slice(0,3).map(tag=><span key={tag}>{tag}</span>)}</div><Link href={`/games/${game.slug}/play`} className={styles.play}>PLAY NOW <span>→</span></Link></div></article> }
export function GameCatalog({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [workerSlugs, setWorkerSlugs] = useState<string[] | null>(null);
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
    if (!workerSlugs) {
      const q = debouncedQuery.toLowerCase();
      return games.filter(g => `${g.title} ${g.description} ${g.tags.join(" ")}`.toLowerCase().includes(q) && (genre === "All" || g.genre === genre));
    }
    const order = new Map(workerSlugs.map((s, i) => [s, i]));
    return games.filter(g => order.has(g.slug)).sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
  }, [games, workerSlugs, debouncedQuery, genre]);
  const surprise = () => { const pool = filtered.length ? filtered : games; const game = pool[Math.floor(Math.random() * pool.length)]; window.location.assign(`/games/${game.slug}/play`) }; const recommended = picks.map(slug => games.find(g => g.slug === slug)).filter((g): g is Game => Boolean(g)); return <><section className={styles.hero}><p>4WEIRD GAMES // ARCADE NETWORK</p><h1>Find your next <span>weird</span> world.</h1><h2>Big browser games, tiny loading times, and an arcade built for the screen in your hand.</h2><div><a href="#recommended">EXPLORE PICKS ↓</a><button type="button" onClick={surprise}>⌘ SURPRISE ME</button></div></section><section className={styles.section} id="recommended"><header><div><p>CURATED SIGNAL</p><h2>Recommended games</h2></div><span>7 hand-picked worlds</span></header><div className={`${styles.grid} perf-list`}>{recommended.map(g => <Card key={g.slug} game={g} recommended />)}</div></section><section className={styles.section}><header><div><p>FULL LIBRARY</p><h2>Choose a portal</h2></div><span>{filtered.length} games online</span></header><div className={styles.filters}><label><span>⌕</span><input aria-label="Search games" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the arcade" /></label><div>{genres.map(item => <button type="button" key={item} className={genre === item ? styles.active : ""} onClick={() => setGenre(item)}>{item}</button>)}</div></div><div className={`${styles.grid} perf-list`}>{filtered.map(g => <Card key={g.slug} game={g} />)}</div>{!filtered.length && <p className={styles.empty}>No games found. Clear the signal and try again.</p>}</section></>
}
