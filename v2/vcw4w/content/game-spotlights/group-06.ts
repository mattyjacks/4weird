import type { GameSpotlight } from "./spotlight";

// Group 06 spotlights. Fill each entry: 3+ about paragraphs (60-100 words
// each) + 3+ faq pairs (answers 40-70 words). Unique prose per game.
// HARD RULE: no em-dash character (U+2014) anywhere.
export const GROUP_06_SPOTLIGHTS: GameSpotlight[] = [
  {
    slug: "neonsnake",
    about: [
      "The grid is dark, the lines glow cyan, and your snake starts as a short bright segment hunting its first orb. Each glowing orb you eat adds length and score, and the arena slowly fills with your own luminous trail. There is no story campaign or power fantasy here, just the classic arcade loop restaged in neon: light, motion, hunger, consequence. Walls hum at the edges, your tail follows every turn, and every meal makes the next one harder to reach.",
      "Score chasers, keyboard purists, and anyone who learned games on Snake or Nibbles will feel at home within seconds. The controls are only Arrows or WASD plus Space to restart, so the first minute is pure eating. Mastery arrives around length ten, when wide loops beat tight cuts and you must plan two turns ahead. Runs last two to ten minutes, restarts are instant, and beating your longest snake by three orbs keeps one more try irresistible.",
      "Compared with Neon Breaker, which is about smashing bricks with a paddle, Neon Snake is about restraint and route planning, and compared with Neon Racer, which tests lane reflexes at speed, it rewards patience over twitch. A strong session means circling the open center early, taking the nearest orb instead of the shiny distant one, and turning early once long. Hug walls only when the center is clogged with tail, and never reverse into a gap you have not measured.",
    ],
    faq: [
      {
        q: "How do I survive past length ten in Neon Snake?",
        a: "Steer in wide loops around the center and eat the closest orb on each pass. Start each turn a half second earlier than feels necessary, because a long tail cannot correct late. Avoid wall corridors unless the center is blocked, and never chase an orb across your own body. Two safe meals beat one risky feast, and that patience is what pushes runs past length fifteen.",
      },
      {
        q: "Is Neon Snake good for short sessions?",
        a: "Yes. A typical run lasts two to five minutes, controls load instantly, and Space restarts without menus. It fits coffee breaks, classroom free minutes, and score battles with friends. Play one run to warm up your hands, or chain five runs chasing a length record. Cloud saves and the coin metered format keep each attempt light and repeatable.",
      },
      {
        q: "What are the controls for Neon Snake?",
        a: "Steer with Arrow keys or WASD, press Space to start or restart, and press P or Escape to pause. There is no shooting or jumping to learn, which makes it ideal for touch typists and younger players. If you pause often, use it to study tail position before a tight crossing. On shared keyboards, WASD keeps your hand clear of a partner watching the score.",
      },
    ],
  },
  {
    slug: "neonvoidrunner",
    about: [
      "You sprint through an endless digital void stitched from neon grids, drifting particles, and oncoming obstacles. There is no finish line and no level select, only forward motion while the speed readout climbs. The fantasy is pure velocity: a lone runner threading gaps in a collapsing data stream. Every second survived pushes the scroll faster, so the world you learned ten seconds ago is already gone.",
      "Fans of endless runners, reaction trainers, and high score ladders will love it, especially players who prefer dodging to shooting. The input is only Arrows or WASD plus instant restart, so anyone can start. Skill shows in economy of motion: beginners swerve wall to wall, veterans make fingertip corrections. Runs compress into one to four minute bursts, and the ramp guarantees each personal best falls by a small, maddening, chaseable margin.",
      "Against Neon Racer, which locks you to traffic lanes, Void Runner feels freer and crueler, because threats arrive from more angles and speed never plateaus. Against Neon Snake, which rewards planning around a growing tail, this game rewards looking ahead and doing less. Session strategy is simple: survive the first fifteen seconds cleanly, dodge early with small taps, watch two obstacles ahead, and restart instantly after a crash while the rhythm is still in your fingers.",
    ],
    faq: [
      {
        q: "How is Neon Void Runner different from Neon Racer?",
        a: "Neon Racer is lane based traffic weaving where you hold a line and pick gaps. Void Runner is open field dodging with a relentless speed ramp and no lanes to trust. Racer tests route memory at high speed, while Void Runner tests small corrections under acceleration. If you like structured tracks, pick Racer. If you want raw survival distance, run the void.",
      },
      {
        q: "What is the best way to get higher distance scores?",
        a: "Make the smallest dodge that clears the obstacle and recenter immediately. Look two threats ahead instead of fixating on the nearest shape. Do not chase risky pickups in the first fifteen seconds, since early survival buys the rhythm you need later. When speed spikes, tap instead of holding keys, because held keys overshoot and walls forgive nothing.",
      },
      {
        q: "What are the controls and how long is a run?",
        a: "Move with Arrow keys or WASD, press Space to start or restart, and press P or Escape to pause. Most runs last one to four minutes, which suits short breaks and best distance contests. Restart with Space the moment you crash, while your eyes still track the speed. Short frequent attempts build reflexes faster than a few long cautious runs.",
      },
    ],
  },
  {
    slug: "temple-of-lost-revenue",
    about: [
      "You prowl an ancient maze as a green visored cat, hunting lost deals, scattered CRM data, and unanswered leads. Stone corridors, sealed doors, and glowing pickups sell the fantasy that revenue went missing inside a temple and only a patient explorer recovers it. The decipher mechanic is the heart: stand at a door, hold Shift, and hidden paths resolve. Business objects become treasure, and every cleared room feels like a pipeline restored.",
      "Adventure collectors, maze mappers, and sales ops players who enjoy MADI business parables will enjoy this most. Movement is simple WASD or arrows, but progress depends on full room clears rather than rushing. Early rooms teach pickup routes, middle rooms demand door decipher timing, and late rooms punish skipped corners. Replay comes from cleaner sweeps: fewer backtracks, faster deciphers, and a perfect room by room map.",
      "Compared with The Lost City of Customers, which is a scanning hunt across an open valley, the Temple is tighter and more maze driven, with doors and corridors shaping every choice. Compared with The Pipeline Mountain, which is a climb through business stages, this is a recovery crawl where coverage matters more than altitude. Clear one room fully before pushing deeper, decipher at every door, and use the shell Decipher button on touch before assuming a wall is final.",
    ],
    faq: [
      {
        q: "How does the decipher mechanic work?",
        a: "Walk the cat to a sealed door and hold Shift to scan with the green visor. Hidden passages resolve while you hold the scan, so stay still until the path appears. On touch devices, tap the shell Decipher button at doors instead of Shift. If nothing opens, sweep the room for missed pickups first, then scan again, since some doors respond only after the room is cleared.",
      },
      {
        q: "I keep getting lost. What route works?",
        a: "Play room by room and finish every pickup before leaving. Enter, loop the walls, grab the center, then decipher the exits one by one. Do not push three rooms deep with uncleared rooms behind you, because backtracking through respawned confusion wastes time. Mark doors mentally as cleared or sealed, and treat the maze like inbox zero: one room done before the next begins.",
      },
      {
        q: "Can I play Temple of Lost Revenue on touch?",
        a: "Yes. Guide the cat with touch movement, and use the on screen shell Decipher button at doors where desktop players hold Shift. Pause with the on screen P or Escape equivalent when you need to study the map. Small screens reward slower play, so clear one room at a time and zoom your attention to door edges. The maze logic is identical across phone and desktop.",
      },
    ],
  },
  {
    slug: "the-ai-expedition",
    about: [
      "Waystations glow across a dark operations map: agent nodes, data lakes, and automation endpoints waiting for pipelines. You click one node, then another, and a link carries datasets across the gap until traffic clears. The world reads like a control room for an AI company, where infrastructure is geography. There are no enemies to shoot, only congestion to untangle, and each completed route visibly calms the network.",
      "Systems thinkers, puzzle routers, and automation fans will click with this immediately, especially players who enjoy Mini Motorways style flow puzzles. The input is pure click node A then node B, with taps on touch, so the challenge is planning rather than reflexes. Early boards need one clean link, later boards stack competing routes. Replay value is efficiency: fewer links, shorter hauls, and traffic that never backs up.",
      "Against The MADI AI Universe, which is a hub for hopping between worlds, The AI Expedition is a single focused routing board where every click matters. Against Treasure Hunters, which is arcade grabbing of pipeline value, this is slower and more cerebral, closer to plumbing than hunting. Win sessions by finishing one package end to end before branching, building short links first, and watching flow direction before adding nodes that could clog a working line.",
    ],
    faq: [
      {
        q: "How do I draw pipelines in The AI Expedition?",
        a: "Click a starting node, then click its destination to draw a link between them. On touch screens, tap the same two nodes in order. Start with neighboring nodes to learn the gesture, then extend to longer hauls. If a link fails, click closer pairs first, because some routes only accept staged connections. One working link teaches the whole game.",
      },
      {
        q: "My network keeps clogging. How do I fix it?",
        a: "Stop adding nodes and finish one route completely before branching. Clear short local links first, since they move packages fast and free capacity for long hauls. Watch which direction traffic flows for a few seconds before drawing, then route around the busy junction instead of through it. A single finished pipeline beats three half built lines every time.",
      },
      {
        q: "What is a good session plan for this game?",
        a: "Play in ten to fifteen minute blocks and treat each board as one clean routing problem. Open by linking the closest pair, confirm the package arrives, then expand outward. Keep links short, avoid crossing busy lines, and screenshot tricky boards if you compare strategies. End the session after a fully cleared map, when the network runs quiet and every node shows flowing traffic.",
      },
    ],
  },
  {
    slug: "the-cave-of-bottlenecks",
    about: [
      "Deep stone swallows the screen, red stalactites labeled with hiring delays and CRM tangles hang from the ceiling, and your only tool is the Green Cat beam. Sweeping the light left to right feels like spelunking with a flashlight that dissolves trouble. Greens are allies and reds are targets, so the cave reads instantly: burn the red, spare the green. It is part puzzle cave, part operations parable, all glow.",
      "Puzzle fans who like light aiming, plus managers who laugh at hiring bottleneck jokes, will enjoy this hybrid. Steering is only A and D or arrows, with holds to dissolve, so toddlers can sweep while strategists optimize. Early sweeps clear one low stalactite at a time, later caves stack highs and lows that demand ordering. Replay is pacing: full clears, fewer wasted sweeps, and holding still instead of waving the beam across stone.",
      "Against The Revenue Dragon, which is direct combat against delays and silos, the Cave is quieter and more methodical, closer to defusing than fighting. Against The Speed Portal, which rewards racing through approvals, this rewards stillness and target discipline. Session wins come from sweeping full width once, holding the beam on one red target until it dissolves, clearing lows before highs, and ignoring green growths no matter how tempting they look.",
    ],
    faq: [
      {
        q: "How do I aim the Green Cat beam?",
        a: "Steer the light with A and D or the Left and Right arrows, then hold the beam steady on a red bottleneck until it dissolves. Do not wave across the cave, because moving light clears nothing. Plant on one stalactite, count through the dissolve, then slew to the next. Pause with P or Escape if you need to pick the next target calmly.",
      },
      {
        q: "What should I burn and what should I spare?",
        a: "Burn red stalactites only, since they mark hiring delays and CRM tangles blocking the path. Spare every green growth, because greens are healthy flow and burning them wastes time or breaks the run logic. When in doubt, hold still and read color before holding the beam. A color filter in your display settings can help red green distinction on dim screens.",
      },
      {
        q: "What order clears the cave fastest?",
        a: "Sweep full width once to map targets, then clear low reds before high reds so falling debris never blocks your beam path. Finish one stalactite completely before slewing to the next, since partial burns waste light. Work in steady passes rather than random jumps, and log clears per sweep if you compare runs. Clean order beats fast waving every session.",
      },
    ],
  },
];
