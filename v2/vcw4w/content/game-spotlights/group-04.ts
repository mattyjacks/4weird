import type { GameSpotlight } from "./spotlight";

// Group 04 spotlights. Fill each entry: 3+ about paragraphs (60-100 words
// each) + 3+ faq pairs (answers 40-70 words). Unique prose per game.
// HARD RULE: no em-dash character (U+2014) anywhere.
export const GROUP_04_SPOTLIGHTS: GameSpotlight[] = [
  {
    slug: "aiwhackamole",
    about: [
      "AI-whack-a-mole drops you in front of a chunky 3D arcade cabinet where cartoon AI agents spring from the holes with chat bubbles overhead. Some bubbles carry helpful advice drawn from good_quotes.json, while others carry scheming or dangerous lines from bad_quotes.json. You hold a cartoon hammer, a match timer ticks down, and a health bar tracks every escaped rogue and every mistaken whack on a friendly.",
      "Reflex arcade fans and AI meme enjoyers will feel at home here. Kids like the simple tap to bonk loop, while older players enjoy the reading comprehension twist. The skill curve starts with slow single popups, then ramps to overlapping bubbles that force scanning, prioritizing, and restraint. Replay value comes from chasing higher combo multipliers, cleaner accuracy, and longer survival streaks in short two minute bursts.",
      "Compared to Server Saver Shield, which rewards constant shield sweeping, AI-whack-a-mole rewards selective strikes, since restraint beats volume. Compared to Last Words Zombies, which tests typing speed under pressure, this game tests reading judgment under pressure. Per session, read one full bubble before swinging, let ambiguous popups cycle again, bank safe whacks to build toward x5, and protect health over score. Keep the cursor near center holes to shorten travel, and treat each escape as cheaper than a bad hit on a friendly.",
    ],
    faq: [
      {
        q: "How do I tell rogue AIs from helpful ones?",
        a: "Read the full chat bubble before you swing. Rogue lines sound dangerous, deceptive, or destructive, while helpful lines sound encouraging or constructive. Early rounds give you time to study the tone. When unsure, skip the swing and wait for the next popup, because a missed rogue costs less than a punished friendly.",
      },
      {
        q: "How do combos and health work?",
        a: "Chaining rogue whacks without mistakes builds a combo multiplier up to x5, which greatly boosts scoring. Letting a rogue escape drains health, and whacking a helpful AI penalizes your score and breaks the combo. Play for clean streaks first, then speed up once your eyes learn the common bad phrases.",
      },
      {
        q: "What is a good session strategy?",
        a: "Start slow and lock in timing on one confirmed rogue. Patrol the middle holes, scan bubbles left to right, and whack only confirmed threats. Never guess on overlapping popups. Protect an active x3 or x4 combo by passing on risky targets, and accept small health loss rather than breaking a big multiplier.",
      },
    ],
  },
  {
    slug: "soundpainter2",
    about: [
      "Sound Painter 2 is the sequel that turns the original paint with sound toy into a compact browser music studio. You get four sequencer channels called Melody, Bass, Chords, and Drums, laid out as clickable step grids, plus synth controls for filter cutoff, reverb, decay, and tempo. Preset songs show what is possible, and every composition can be shared through a URL for friends to open and remix.",
      "Aspiring beat makers, loop experimenters, and Sound Painter veterans ready for structure will love this one. The skill curve moves from toggling four melody steps and pressing Space, to layering bass on strong beats, adding chords for color, programming drums for drive, and shaping tone with filters. Replay value lives in endless loop variations, preset teardowns, and shared URL songs. Save favorite grids by copying the share link, then reload them later to compare mix choices.",
      "Compared to Sound Painter, the original tile painter with instant color melodies, this sequel is slower and deeper, built for repeatable tracks rather than quick doodles. Compared to Overtake, where garage tuning means faster cars, here tuning means filter sweeps and tempo shifts. Per session, build drums first, add bass on beats one and three, then decorate with melody. Start with drums every time, since a steady beat makes bass and melody decisions much easier to judge.",
    ],
    faq: [
      {
        q: "I loved the original. What is new here?",
        a: "The original paints single notes as colored tiles. This sequel adds separate instrument tracks, a true step sequencer grid, synth parameters like cutoff and reverb, tempo control, preset songs, and URL sharing. Think of Sound Painter as a sketchbook and Sound Painter 2 as a small studio for finished loops.",
      },
      {
        q: "How should a beginner build a first track?",
        a: "Pick the Melody track and toggle four spaced cells, then press Space to loop them. Add a simple four on the floor drum pattern, place bass notes on beats one and three, and add sparse chords. Change only one element at a time, listen each pass, and clear the current track with C if it gets cluttered.",
      },
      {
        q: "How do I make loops sound fuller?",
        a: "Anchor rhythm with steady drums, keep bass simple and low, and leave gaps in the melody so chords can breathe. Raise tempo slightly for energy, open the filter cutoff for brightness, add light reverb for space, and longer decay for smoothness. Save versions by copying the share URL after each change you like.",
      },
    ],
  },
  {
    slug: "soundpainter",
    about: [
      "Sound Painter, the original in the series, is a calm audio visual sandbox where every tile is both a color and a musical note. Columns map to pitch, rows map to instrument timbre, so diagonal strokes, blocks, and scattered dots each produce different phrases. You click tiles to paint, press Space to play the whole canvas as a sequence, and press R to wipe the board and start a fresh sketch.",
      "Relaxed creators, young musicians, parents playing with kids, and anyone intimidated by real instruments will love it. There is no score, no timer, and no failure state. The skill curve is gentle: first you tap random tiles for fun, then you notice columns control melody direction, then you start planning rows, repeats, and visual shapes that double as musical patterns worth replaying. Kids enjoy pure color play while teens start hunting for repeatable hooks worth saving and replaying.",
      "Compared to Sound Painter 2, the sequel with multitrack sequencing and synth effects, this original is faster, simpler, and more visual, ideal for two minute improvisations. Compared to Discover America, another relaxed click and sort experience, Sound Painter is fully open ended. Per session, paint a short row, press Space, adjust one column, and replay until the loop feels catchy.",
    ],
    faq: [
      {
        q: "How does painting become music?",
        a: "Each column plays a different note and each row uses a different timbre, so tile position controls pitch and tone. Painted tiles form a sequence you hear with Play All. Start with a diagonal line to hear pitch climb, then try clusters, gaps, and repeating blocks to shape rhythm and melody together.",
      },
      {
        q: "Is there a wrong way to play?",
        a: "No, the game treats every combination as valid. That said, musical patterns emerge faster if you work in short rows, repeat a motif, and leave empty space for rhythm. Paint five or six tiles, press Space, keep what you like, reset with R only when the canvas feels too crowded to judge.",
      },
      {
        q: "Should I play this or Sound Painter 2?",
        a: "Play this original for instant color first music play with zero learning curve, perfect for kids and quick creative breaks. Move to Sound Painter 2 when you want separate drums, bass, chords, synth shaping, presets, and shareable song links. Many players sketch ideas here, then rebuild favorites in the sequel.",
      },
    ],
  },
  {
    slug: "friendslop",
    about: [
      "FriendSlop is a meme fueled arcade party where chaotic slop rains from the sky and your job is to catch it, then hurl it at your friends to build combos and raise the vibe meter. Cringe hazards drift through the chaos to punish greedy positioning. The art leans absurd, the physics lean slippery, and survival time steadily turns up portion size, fall speed, and crowd disorder.",
      "Couch chaos fans, meme enjoyers, and casual high score chasers will love the vibe first scoring. The skill curve starts with simply standing under falling slop, then grows into alignment throws, hazard reads, and center stage control. Replay value comes from daily leaderboard runs, longer survival streaks, and the comedy of failed throws that flip a promising combo into instant cringe. Each wipe teaches spacing, timing, and when to pass on a risky throw instead of forcing it.",
      "Compared to Server Saver Shield, another catch and defend arcade game, FriendSlop is looser and funnier, with throws that demand alignment instead of beam toggling. Compared to Neon Snake, which punishes tight turns, FriendSlop punishes blind throws. Per session, hold center, catch the lowest slop first, throw only when lined up, and dodge early rather than threading hazards. Treat every throw like a short pass, square up first, then release cleanly for consistent combos.",
    ],
    faq: [
      {
        q: "How do I score big without eating cringe?",
        a: "Catch falling slop by standing under it, align horizontally with a friend, then throw with Space or click. Aligned throws build combos and vibe, while blind throws waste slop and invite hazards. Stay near center stage, move early to the next drop, and skip throws that need long diagonal arcs.",
      },
      {
        q: "What should I do when the screen gets chaotic?",
        a: "Slow down and survive. Return to center, track only the lowest falling slop, and dodge the first hazard instead of racing it. Chaos scales with survival time, so calm positioning beats sprinting. A clean catch and one aligned throw earns more than three rushed misses plus a cringe penalty.",
      },
      {
        q: "Is FriendSlop multiplayer?",
        a: "The friends on screen are targets you feed, not separate player slots in this browser build. The multiplayer flavor comes from shared chaos, leaderboard rivalry, and pass and play sessions where friends alternate runs. Treat each run as a leaderboard attempt, then hand off and compare vibe meter peaks.",
      },
    ],
  },
  {
    slug: "semester-survival",
    about: [
      "Semester Survival turns university stress into a three lane endless runner across eight chaotic semesters. You sprint past assignment deadlines, exam walls, portal crashes, stress clouds, and empty wallet gaps, while grabbing coffee, lecture notes, and HELB loans to stay eligible. Each semester ends with a final exam style boss objective, and clearing it advances the academic year toward graduation without expulsion. Lanes stay readable thanks to bold campus colors, chunky icons, and clear jump or slide prompts before each gate.",
      "Students, runner fans, and anyone who survived enrollment portals will recognize the jokes immediately. The skill curve opens with simple lane switches and single jumps, then adds slide gates, tight obstacle pairs, and faster scroll speeds that punish late reactions. Replay value comes from pushing further into later semesters, beating distance records, and mastering coffee routing under pressure. Coffee lines often sit slightly off the racing line, so plan small detours early instead of lunging late.",
      "Compared to Neon Void Runner, a pure endless dodger, Semester Survival adds themed progression with semesters, pickups, and boss exams. Compared to Neon Racer, another lane switching survival game, this runner adds vertical moves with jumps and slides. Per session, hold center lane, jump low barriers, slide tall ones, and grab coffee before chasing risky note lines. Watch the top lane first during warnings, since portal blocks cascade downward and trap edge runners quickly.",
    ],
    faq: [
      {
        q: "How do I get past the early semesters?",
        a: "Hold the center lane for maximum escape options, switch only for confirmed obstacles, and make single lane moves instead of double swerves. Jump low barriers with W or Up, slide tall barriers with S or Down, and collect the first coffee before chasing score pickups. Learn one obstacle type per run.",
      },
      {
        q: "What matters more, coffee or score pickups?",
        a: "Coffee is survival fuel, so prioritize it over lecture notes and risky loan lines. Notes and loans boost your total, but missing coffee or hitting a deadline wall ends the run. Take pickups that sit on your current safe lane, skip lines that pull you across two lanes into traffic, and bank consistency first.",
      },
      {
        q: "How do portal crashes and boss exams work?",
        a: "Portal crashes telegraph across the upper lanes before blocking paths, so watch the top of the screen and pre move to center. Each semester ends with a final exam sequence that mixes learned obstacles faster and denser. Stay calm, reuse the same jump and slide timing, and treat the boss as a survival check rather than a sprint.",
      },
    ],
  },
];
