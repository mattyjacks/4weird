// Per-game playbooks for the full v2 catalog.
//
// The preserved v1 bundles under public/games/html/** are byte-parity locked,
// so per-game improvement lives in this v2 layer: one honest, sourced playbook
// per catalog slug drawn from each game's own game.json (controls +
// instructions). Detail pages, play pages, and /api/vcw/games all read this
// file, so players and VCW agents get the same first-party guidance for every
// game — not just the featured seven.

export type GamePlaybook = {
  slug: string;
  /** Short control summary (from the game's game.json). */
  controls: string;
  /** What winning / progress means in one sentence. */
  goal: string;
  /** First-run boot: dismiss menus and reach gameplay. */
  boot: string[];
  /** Autoplay strategy for VCW agents (observe -> reason -> act). */
  autoplay: string[];
  /** Two or three human tips that actually help. */
  tips: string[];
};

const TABLE: Record<string, GamePlaybook> = {
  "platform-wars": {
    slug: "platform-wars",
    controls: "Desktop: A/D or arrows move · W/Space jump · F dash · Phone: on-screen pad",
    goal: "Out-score the rival platform team in quick-match arena rounds.",
    boot: ["Pick Quick Match and choose a side (phone agility vs desktop precision).", "Click the arena to focus keyboard before the round starts.", "Move immediately — rounds start fast."],
    autoplay: ["Focus the arena frame, then probe A/D + Space to confirm movement.", "Alternate dashes (F) with jumps; never hold one key indefinitely.", "Track score events per round and file movement/aim bugs with the round number."],
    tips: ["Desktop wins on precision jumps; phone wins on tight turns — pick your strength.", "Dash through opponents rather than away from them.", "Rotate your phone for the best view."],
  },
  lastwordszombies: {
    slug: "lastwordszombies",
    controls: "Type the letters on each cyber-unit · First letter locks on · Esc pauses · I opens the Black Market",
    goal: "Decrypt approaching cyber-units by typing their codes before they breach the mainframe.",
    boot: ["Click the terminal to focus the keyboard.", "Type the FIRST letter of the nearest unit to lock on.", "Finish the locked word before switching targets."],
    autoplay: ["Send type_text to the focused terminal; never blind-keypress.", "Prioritize the closest unit each second; re-read after every kill.", "Open the Black Market (I) only between waves and record spend."],
    tips: ["Locking on early buys time — first letters matter most.", "Short words first when the grid floods.", "Pause with Esc to read the store between waves."],
  },
  venturemechanically: {
    slug: "venturemechanically",
    controls: "Click / tap sliders and fields · Exit slider runs the waterfall",
    goal: "Learn why a big exit can pay founders nothing: configure rounds, debt, and preferences, then drag the exit slider.",
    boot: ["Start in Sandbox mode with the default cap table.", "Adjust one funding round at a time and watch the waterfall.", "Drag the exit slider end-to-end to see who gets paid."],
    autoplay: ["Drive the UI with clicks on sliders/fields; this game is untimed.", "Change one variable per observation and screenshot the waterfall.", "Record each configuration as a run step so the trail is reproducible."],
    tips: ["Liquidation preferences eat common holders first — stack two and compare.", "Debt is paid before any equity sees a cent.", "Small exits punish employees hardest; try $10M vs $500M."],
  },
  financialfreedom: {
    slug: "financialfreedom",
    controls: "Click tabs, sliders, and Next Month · Every choice is a button or slider",
    goal: "Reach your Financial Independence number: grow net worth without tanking family happiness.",
    boot: ["Pick a starting family scenario.", "Set a budget and one investment (401k first is safest).", "Click Next Month and read the event card."],
    autoplay: ["Advance one month per loop iteration and log net worth + happiness.", "Change a single allocation between months so causes stay attributable.", "Treat event cards as findings, not noise — file the surprising ones."],
    tips: ["Debt payments beat crypto until interest is gone.", "Career training compounds harder than side hustles early.", "Watch happiness — burnout ends runs faster than bills."],
  },
  serversavershield: {
    slug: "serversavershield",
    controls: "Mouse / touch moves the shield · Hold click fires beams · P pauses · Space emergency shield",
    goal: "Defend the data centers from malware bots, DDoS waves, and viruses.",
    boot: ["Click the game to focus, then sweep the shield across the first wave.", "Hold click to fire beams once malware appears.", "Save the Space emergency shield for DDoS spikes."],
    autoplay: ["Drive with click/drag_look toward the densest attack cluster each tick.", "Hold fire on bosses; tap-fire on swarm waves to avoid overheating.", "Log wave composition per second for the threat-heat overlay."],
    tips: ["Attacks are color-coded — set a colorblind filter before wave 3.", "Keep the shield moving; parked shields get flanked.", "Emergency shield first, panic later."],
  },
  overtake: {
    slug: "overtake",
    controls: "Arrows / WASD steer, accelerate, brake · Space / Shift / N nitro · R restart route · P / Esc pause",
    goal: "Finish well to earn coins, unlock faster cars, and open later routes.",
    boot: ["Pick the first route and the starter car.", "Hold accelerate and steer with short taps, not holds.", "Save nitro for straights, never corners."],
    autoplay: ["Aggregate telemetry with segmentTicks: speed averages, hazards freshest.", "Steer toward the emptiest lane from buildThreatHeat each second.", "Fire nitro only above 70% speed on a clear lane; log every route unlock."],
    tips: ["Short steering taps beat long holds at speed.", "Nitro on straights gains seconds; nitro in traffic loses runs.", "New cars matter more than perfect lines early."],
  },
  assassinanimals: {
    slug: "assassinanimals",
    controls: "WASD sneak · Left-click / Space strike · Right-click / Q toss coin · E takedown/interact · G drag body · Shift/F ability · 1/2/3 gadgets",
    goal: "Infiltrate procedural floors, collect DNA splices, and eliminate targets unseen.",
    boot: ["Pick one of the 9 animal agents and enter floor one.", "Crouch-walk (slow WASD) until patrol paths are learned.", "Toss a coin (Q) before your first takedown."],
    autoplay: ["Move in short WASD bursts; observe patrols a full cycle before acting.", "Prefer E silent takedowns over Space strikes near guards.", "Drag bodies (G) out of lanes and log gadget spend per floor."],
    tips: ["Coins are stronger than knives — distract first.", "Steal uniforms to walk past low-tier guards.", "Signature abilities reset fights; save them for targets."],
  },
  battlesharks2: {
    slug: "battlesharks2",
    controls: "WASD / arrows / mouse swim · Left-click / Ctrl fire · Space jet dash (needs Jet Mutation) · E / Tab upgrade hub",
    goal: "Eat, gather biomass and cyber-debris, and mutate into the apex cyber-shark.",
    boot: ["Swim toward small fish first and eat to heal.", "Collect cyber-debris before picking fights.", "Open the hub (E) after your first mutagen and buy one weapon."],
    autoplay: ["Circle toward the nearest edible each tick; flee hunters with dash.", "Open the upgrade hub between fights, never mid-swarm.", "Log biomass per minute so mutation pacing is comparable across runs."],
    tips: ["Pickups are color-coded — set a filter before mutating.", "Mines kill greed; eat around them, not through them.", "Jet dash is an escape tool first, a weapon second."],
  },
  gravegain2d: {
    slug: "gravegain2d",
    controls: "WASD / arrows move · Left-click melee · Right-click timed block · F race ability · Shift sprint/ability · 1/2/3 temporal mode · Esc/P pause",
    goal: "Clear procedural dungeon floors, gather gold, and escape richer than you entered.",
    boot: ["Pick race, class, and Realtime mode for your first run.", "Move with WASD and melee with clicks toward observed content.", "Use F early — abilities swing the first fight."],
    autoplay: ["Head toward observed content with clicks leading movement (improveFromObservations).", "Right-click block on enemy wind-up; never blind-rotate away from loot.", "Emit gravegain2d_attack tags so the dispatcher routes melee correctly."],
    tips: ["Clicks lead, movement follows — attack toward content.", "Chrono-Lock is easier to learn than Realtime.", "Block pays for itself against the first elite."],
  },
  gravegain3d: {
    slug: "gravegain3d",
    controls: "WASD move · Mouse or arrows look · Left-click melee/skill · Right-click block/projectile · Shift ability · E enter buildings · Esc/P pause",
    goal: "Descend the 3D dungeon floors, kill, loot gold, and return to the LuckyStarShip hub.",
    boot: ["Click Endless Dungeon Run, pick a build, and choose Deploy.", "Confirm Realtime mode if a saved run reopens otherwise.", "Project enemies via GraveGainBotInput before swinging."],
    autoplay: ["Project enemies with projectEnemy() through the canvas rect — never 2D offsets.", "Route gravegain3d_attack through BotInput.click and aim through lookToward.", "Sweep corridors deterministically (persist the step index); drink potion (Q) under 45% HP."],
    tips: ["Aim with the mouse, move with WASD — split the work.", "Q potion at half health, not at empty.", "Hub crops grow while you delve; bank between floors."],
  },
  demolichdom: {
    slug: "demolichdom",
    controls: "WASD / arrows move necromancer · Click skull spell · S summon skeleton (-25 mana) · P pause",
    goal: "Demolish every building with your skeleton army before the city outlasts you.",
    boot: ["Move to the first building and click it to cast.", "Summon one skeleton (S) once mana allows.", "Kite guards while skeletons chew walls."],
    autoplay: ["Alternate clicks on the nearest standing structure with S summons.", "Hold position while skeletons tank; reposition only under fire.", "Log mana per summon so economy pacing is comparable."],
    tips: ["Skeletons tank, you cast — don't lead with your body.", "Summon early; the first skeleton pays for itself.", "Focus one building at a time."],
  },
  fridgesimulator: {
    slug: "fridgesimulator",
    controls: "Click buy / manage fridges · Next Day advances time",
    goal: "Keep every country's family fed: balance nutrition, stock, and budget day after day.",
    boot: ["Buy one staple food per country on day one.", "Check nutrition balance before advancing.", "Click Next Day and read who went hungry."],
    autoplay: ["Advance one day per iteration; log stock + nutrition deltas.", "Change one purchase at a time so shortages stay attributable.", "File starvation events as bugs with the day number."],
    tips: ["Staples first, variety second.", "One hungry country is a warning; two is a spiral.", "Balance nutrition, not just calories."],
  },
  discoveramerica: {
    slug: "discoveramerica",
    controls: "Click a fragment then its bin · Tap the glowing port to sail",
    goal: "Gather data fragments at each port, sort them correctly, and chart the voyage to the New World.",
    boot: ["Tap the first glowing port to gather fragments.", "Click a fragment, then click its matching bin.", "Sort all fragments before sailing on."],
    autoplay: ["Click fragment-then-bin as paired actions with a screenshot between.", "Sail only when the port glows; log sort accuracy per port.", "Treat miscategorized fragments as findings with the fragment text."],
    tips: ["Read before you sort — misclicks cost the voyage.", "Glowing ports are the only ones that advance you.", "Bins are categories, not trash — match deliberately."],
  },
  orbitaldrift: {
    slug: "orbitaldrift",
    controls: "Hold Space / click / touch for thrust · Release to drift back · P or Esc pause",
    goal: "Ride your orbit: expand to dodge debris and collect yellow stardust for combo multipliers.",
    boot: ["Hold thrust once to feel the orbit expand.", "Release and watch gravity pull you back.", "Graze stardust lines before chasing them."],
    autoplay: ["Pulse thrust in short holds; never latch the key.", "Aim orbit bands through stardust, away from purple/red debris.", "Log multiplier value per second for pacing comparison."],
    tips: ["Debris colors matter — set a filter first.", "Small pulses beat long burns.", "Combos multiply; protect the streak over one pickup."],
  },
  aiwhackamole: {
    slug: "aiwhackamole",
    controls: "Click / tap rogue AIs · Spare helpful ones · Combos to x5",
    goal: "Whack dangerous AIs, spare helpful ones, and survive the timer with your health intact.",
    boot: ["Read one full bubble before your first whack.", "Whack one confirmed rogue to feel the hammer timing.", "Let unknowns pop again rather than guessing."],
    autoplay: ["Click only confirmed rogue targets via coordinates; never blanket-click.", "Wait a beat on ambiguous bubbles — a miss costs more than a pass.", "Log combo multiplier per hit for accuracy comparison."],
    tips: ["Read the bubble, then whack — speed follows accuracy.", "Bad escapes hurt; good whacks hurt more.", "Combos to x5 win runs; protect them."],
  },
  soundpainter: {
    slug: "soundpainter",
    controls: "Click tiles to paint sound+color · Space plays all · R resets",
    goal: "Paint melodies: every tile is a note and a color — compose something yours.",
    boot: ["Click any tile to hear its note.", "Paint a short row, then press Space to hear it.", "Reset (R) and paint your first loop."],
    autoplay: ["Paint tiles via clicks with a listen (Space) between patterns.", "Vary one column per iteration so melodies stay attributable.", "Record the tile pattern with each run step."],
    tips: ["Columns are notes, rows are timbres — paint diagonally first.", "Play All turns doodles into songs.", "There are no wrong notes here."],
  },
  soundpainter2: {
    slug: "soundpainter2",
    controls: "Click cells to toggle steps · Space play/stop · C clear track · R reset all",
    goal: "Produce a track: sequence melody, bass, chords, and drums, then shape the synth.",
    boot: ["Pick the Melody track and toggle four cells.", "Press Space to hear the loop.", "Add Bass, then shape filter cutoff and tempo."],
    autoplay: ["Toggle one track's cells per iteration; play (Space) between edits.", "Adjust a single synth parameter at a time.", "Log the grid pattern plus tempo with each step."],
    tips: ["Four-on-the-floor drums glue every experiment.", "Bass on beats 1 and 3 never lies.", "Share via URL once the loop slaps."],
  },
  friendslop: {
    slug: "friendslop",
    controls: "Arrows / WASD move · Space / click throw slop · P or Esc pause",
    goal: "Catch falling slop, feed your friends for combos, and dodge the cringe.",
    boot: ["Move under the first falling slop.", "Catch it, align with a friend, and throw (Space).", "Dodge the first hazard rather than racing it."],
    autoplay: ["Track the lowest falling slop each tick and strafe under it.", "Throw only when aligned within ~15px; else reposition.", "Return to center when the sky is empty; log vibe meter per throw."],
    tips: ["Aligned throws build combos; blind throws build cringe.", "Center stage catches the most drops.", "Survival scales chaos — pace yourself."],
  },
  "semester-survival": {
    slug: "semester-survival",
    controls: "A/D or ←/→ switch lanes · W/↑ jump · S/↓ slide · P or Esc pause · Swipe on touch",
    goal: "Survive 8 semesters of deadlines, crashes, and empty wallets without expulsion.",
    boot: ["Run the first straight without switching lanes.", "Jump the first low obstacle, slide the first high one.", "Grab the first coffee before dodging for score."],
    autoplay: ["Hold center lane by default; switch only for confirmed threats.", "Jump lows and slide highs — never both for one obstacle.", "Log semester number with every near-miss."],
    tips: ["Coffee is survival, not score — prioritize it.", "Center lane gives the most options.", "Portal crashes telegraph; watch the top lane first."],
  },
  neonbreaker: {
    slug: "neonbreaker",
    controls: "←/→ or A/D move paddle · Space launch ball · P or Esc pause",
    goal: "Smash every glowing brick, catch power-ups, and clear all neon levels.",
    boot: ["Move the paddle to center and launch with Space.", "Aim rebounds off the paddle edges, not the middle.", "Catch the first power-up before chasing bricks."],
    autoplay: ["Track ball X each tick and glide the paddle under it.", "Prioritize keeping the ball alive over aiming at bricks.", "Log power-up type per catch for effect comparison."],
    tips: ["Edge hits angle the ball; center hits go straight.", "Power-ups win levels — catch first, aim second.", "Never chase with jerks; glide."],
  },
  neoninvaders: {
    slug: "neoninvaders",
    controls: "←/→ or A/D move ship · Space shoot · P or Esc pause",
    goal: "Hold the line: shoot down glowing waves and dodge return fire.",
    boot: ["Strafe once across the full width to feel the speed.", "Shoot the lowest invader first.", "Dodge into the gap return fire leaves."],
    autoplay: ["Strafe under the lowest invader and fire upward each tick.", "Sidestep return fire before the next shot, not after.", "Log wave number with every clear."],
    tips: ["Bottom invaders kill you; top ones just score.", "Move-then-shoot beats spray-and-pray.", "Corners are traps late in waves."],
  },
  neonracer: {
    slug: "neonracer",
    controls: "←/→ or A/D switch lanes · Space start/restart · P or Esc pause",
    goal: "Weave through neon traffic and survive — speed and score climb together.",
    boot: ["Start, hold center, and survive the first 10 seconds.", "Switch one lane at a time, never two.", "Restart (Space) instantly on crash and compare lines."],
    autoplay: ["Steer toward the lane with no obstacle in the threat window.", "Make one lane change per obstacle; re-center after.", "Log survival seconds per run for pacing comparison."],
    tips: ["Center lane sees the most options.", "One lane per threat — doubles kill.", "Survival time is the score; greed is the crash."],
  },
  neonsnake: {
    slug: "neonsnake",
    controls: "Arrows / WASD steer · Space start/restart · P or Esc pause",
    goal: "Eat glowing orbs, grow long, and avoid walls and your own tail.",
    boot: ["Start and eat the nearest orb with one turn.", "Circle the open center before hugging walls.", "Plan two turns ahead once past length ten."],
    autoplay: ["Steer toward the nearest orb with no tail between.", "Prefer wide loops over tight cuts as length grows.", "Log length + orbs per run for growth comparison."],
    tips: ["The center is safe; walls are hungry.", "Long snakes turn early or not at all.", "Chase the near orb, not the shiny far one."],
  },
  neonvoidrunner: {
    slug: "neonvoidrunner",
    controls: "Arrows / WASD dodge · Space start/restart · P or Esc pause",
    goal: "Dodge the digital void as speed ramps — how far can you run?",
    boot: ["Survive the first 15 seconds without risking pickups.", "Dodge early; the void speeds up relentlessly.", "Restart (Space) and beat your distance immediately."],
    autoplay: ["Dodge toward the emptiest vertical band each tick.", "Make small corrections; over-steering kills at speed.", "Log distance per run for ramp comparison."],
    tips: ["Small dodges survive; big ones splat.", "Look two obstacles ahead, not one.", "Speed is the enemy and the score."],
  },
  "temple-of-lost-revenue": {
    slug: "temple-of-lost-revenue",
    controls: "WASD / arrows guide the cat · Shift decipher map (green visor) · P / Esc pause",
    goal: "Recover lost deals, CRM data, and leads from the maze and decipher the way out.",
    boot: ["Guide the cat down the first corridor and grab one pickup.", "Stand near a door and hold Shift to decipher.", "Clear one room fully before pushing deeper."],
    autoplay: ["Sweep corridors room-by-room; decipher (Shift) at every door.", "Collect pickups before pushing to the next room.", "Log pickups per room so coverage is comparable."],
    tips: ["Decipher at doors — paths hide there.", "Green visor scans are color-coded; set a filter.", "Full rooms beat fast rooms."],
  },
  "the-ai-expedition": {
    slug: "the-ai-expedition",
    controls: "Click node A then node B to draw a pipeline · Tap nodes on touch",
    goal: "Route datasets between agents, lakes, and automations until traffic clears.",
    boot: ["Click any node, then click a neighbor to draw your first link.", "Route one package end-to-end before branching.", "Clear short links before long hauls."],
    autoplay: ["Link node pairs as click-click actions with a screenshot between.", "Complete one route before starting the next.", "Log links per route for efficiency comparison."],
    tips: ["Short links first — they fund the long ones.", "One complete route beats three half-built.", "Watch traffic flow before adding nodes."],
  },
  "the-cave-of-bottlenecks": {
    slug: "the-cave-of-bottlenecks",
    controls: "A/D or ←/→ steer the light · Hold the beam on red bottlenecks · P / Esc pause",
    goal: "Dissolve hiring delays and CRM stalactites with the Green Cat's light.",
    boot: ["Sweep the beam full left-to-right once.", "Hold it on the first red stalactite until it dissolves.", "Clear lows before highs."],
    autoplay: ["Sweep systematically; hold on red targets until they clear.", "Clear one stalactite fully before slewing to the next.", "Log clears per sweep for pacing comparison."],
    tips: ["Red targets only — greens are friends.", "Hold still; waving the beam wastes light.", "Set a color filter before the deep cave."],
  },
  "the-lost-city-of-customers": {
    slug: "the-lost-city-of-customers",
    controls: "Move the scan crosshair · Click / tap to scan · Find 5 hidden databases",
    goal: "Trace 5 buried client databases with your valley scanner.",
    boot: ["Scan the valley center once to calibrate.", "Sweep in a grid and watch for green ripples.", "Re-scan ripple zones to pinpoint."],
    autoplay: ["Scan on a deterministic grid; never random-walk.", "Re-scan ripple hits at tighter spacing.", "Log scans per find for coverage comparison."],
    tips: ["Green ripples are the tell — set a filter.", "Grid the valley; luck is not a strategy.", "Five databases; count down out loud."],
  },
  "the-madi-ai-universe": {
    slug: "the-madi-ai-universe",
    controls: "Hover regions to inspect · Click a glowing sector to play · Tap on touch",
    goal: "Explore the hub worlds — Pipeline Peaks, Revenue Jungle, Temple of Automation — then jump in.",
    boot: ["Rotate the globe once to see every sector.", "Hover each glowing zone and read its label.", "Click one sector and play it end-to-end."],
    autoplay: ["Hover each sector, screenshot, then click through one at a time.", "Record the sector label before entering.", "Treat each sector entry as its own run phase."],
    tips: ["It's a hub — the games are the goal.", "Glowing sectors are playable right now.", "Tour once, then main one world."],
  },
  "the-pipeline-mountain": {
    slug: "the-pipeline-mountain",
    controls: "A/D or ←/→ steer · Space jump platforms · P / Esc pause",
    goal: "Climb from manual spreadsheets to the revenue summit without falling.",
    boot: ["Climb the first three platforms slowly.", "Jump from platform centers, not edges.", "Pause on wide platforms and plan the next leap."],
    autoplay: ["Move in short steers; jump only from centered positions.", "Climb one platform per observation cycle.", "Log height per fall for progress comparison."],
    tips: ["Center jumps land; edge jumps fall.", "Falling tools telegraph — wait one beat.", "The summit rewards patience, not speed."],
  },
  "the-revenue-dragon": {
    slug: "the-revenue-dragon",
    controls: "A/D or ←/→ move · Space fire action beams · P / Esc pause",
    goal: "Burn down the Dragon of Delay while dodging orange data-silo fireballs.",
    boot: ["Strafe the full width once to feel the speed.", "Fire continuously while strafing under the dragon.", "Dodge orange fireballs first, aim second."],
    autoplay: ["Strafe under the dragon and fire each tick.", "Sidestep fireballs before the next volley.", "Log dragon HP per volley for DPS comparison."],
    tips: ["Fireballs are orange — set a filter first.", "Moving targets live; parked cats fry.", "Beams win by volume; keep firing."],
  },
  "the-revenue-jungle": {
    slug: "the-revenue-jungle",
    controls: "Space / ↑ jump vines, quicksand, and fog · P / Esc pause",
    goal: "Leap the jungle of manual processes and grab revenue coins as far as you can.",
    boot: ["Jump the first vine late rather than early.", "Grab the first coin line before dodging for style.", "Learn quicksand timing by watching once."],
    autoplay: ["Jump on confirmed hazards only; never spam.", "Collect coin lines that need no detour.", "Log distance + coins per run."],
    tips: ["Late jumps clear; early jumps land in vines.", "Coins on your line only — detours kill.", "Fog hides timing; listen for the rhythm."],
  },
  "the-speed-portal": {
    slug: "the-speed-portal",
    controls: "A/D or ←/→ rotate inside the tunnel · P / Esc pause",
    goal: "Race the glowing portal: dodge approvals, meetings, and legacy software, and thread speed rings.",
    boot: ["Rotate gently through the first straight.", "Dodge the first obstacle with one rotation.", "Thread the first speed ring dead-center."],
    autoplay: ["Rotate toward the gap with the speed ring each tick.", "Make one rotation per obstacle; re-center after.", "Log rings + distance per run."],
    tips: ["Rings are speed — thread them.", "Gentle rotations survive; spins splat.", "Approvals cluster; expect pairs."],
  },
  "treasure-hunters": {
    slug: "treasure-hunters",
    controls: "Space / click drops the claw · P / Esc pause",
    goal: "Time the swinging claw to grapple pipeline, meetings, revenue, and customers.",
    boot: ["Watch two full swings before dropping.", "Drop on the first high-value target crossing center.", "Retrieve and re-time after every grab."],
    autoplay: ["Observe swing phase, then drop (Space) at center crossing.", "One drop per swing cycle; never double-drop.", "Log grabs per 10 drops for timing comparison."],
    tips: ["Center crossing is the drop point.", "Patience grabs gold; spam grabs sand.", "High value beats near value."],
  },
};

export const PLAYBOOK_SLUGS = Object.keys(TABLE);

export function getGamePlaybook(slug: string): GamePlaybook | undefined {
  return TABLE[slug];
}

export function hasGamePlaybook(slug: string): boolean {
  return slug in TABLE;
}
