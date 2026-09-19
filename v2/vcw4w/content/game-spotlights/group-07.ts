import type { GameSpotlight } from "./spotlight";

// Group 07 spotlights. Fill each entry: 3+ about paragraphs (60-100 words
// each) + 3+ faq pairs (answers 40-70 words). Unique prose per game.
// HARD RULE: no em-dash character (U+2014) anywhere.
export const GROUP_07_SPOTLIGHTS: GameSpotlight[] = [
  {
    slug: "the-lost-city-of-customers",
    about: [
      "The Lost City of Customers drops you into a hidden 3D valley where five client databases sleep beneath the terrain. You sweep a scanner crosshair across ridges and hollows, clicking or tapping to send a pulse into the ground. Most scans return silence, but a correct region answers with expanding green ripples that narrow the hunt. The valley is quiet and readable, built for observation rather than reflexes, and every find feels like striking water in dry country.",
      "Puzzle fans, hidden object hunters, and sales minded players will feel at home here, since progress rewards patience and pattern sense over speed. The skill curve is gentle at first, because the opening scans teach grid coverage, then it sharpens as ripple zones overlap and demand tighter rescans. Replay value comes from beating your scan count and finding cleaner routes, so a second valley run often finishes in half the taps of the first.",
      "Compared with The Cave of Bottlenecks, which asks you to hold a light beam on moving targets, this hunt is calmer and fully turn based in spirit, and compared with Temple of Lost Revenue, the search space is one open valley instead of a maze. Start each session with one center calibration scan, then sweep left to right in even lanes. When ripples appear, stop sweeping and rescan the zone at half spacing until the database pops.",
    ],
    faq: [
      {
        q: "How do I find all five databases?",
        a: "Sweep the valley in a steady grid and watch for green ripples after each scan. Ripples mark a nearby database, so rescan inside the ripple ring at tighter spacing until the target surfaces. Count your finds aloud and finish one zone before drifting to another, because random taps waste time and miss corners.",
      },
      {
        q: "Is this a fast action game?",
        a: "No, it is a slow observation puzzle with no enemies chasing you and no timer pressuring each scan. Success comes from coverage discipline, careful eyes, and short focused sessions. If you enjoy quiet detective work and the satisfaction of five clean finds, the pace will feel relaxing rather than slow.",
      },
      {
        q: "How is it different from other MADI valley games?",
        a: "The Revenue Jungle tests jump timing across vines and quicksand, while this game tests search logic in one calm valley. There is no jumping, no dragon to burn, and no summit to climb. Your only tools are the crosshair, the scan pulse, and the green ripple tell, which makes it the most methodical entry in the MADI set.",
      },
    ],
  },
  {
    slug: "the-madi-ai-universe",
    about: [
      "The MADI AI Universe is the flagship hub map, a rotatable 3D globe that gathers Pipeline Peaks, Revenue Jungle, and the Temple of Automation into one glowing atlas. You drag to rotate the world, hover each sector to read its label, and click a lit zone to load that game directly. It plays like a theme park map brought to life, with each region previewing its own quest before you commit to a full run.",
      "Completionists, new MADI players, and anyone deciding which business adventure fits them will love this hub, because it removes guesswork and shows the whole set in minutes. There is almost no skill curve, since rotating and inspecting sectors takes seconds to learn, but replay value is real. Return visits become launch sessions where you tour once, pick one world to main, and track which sectors you have finished.",
      "Unlike The Pipeline Mountain, which climbs one vertical route to a summit, or The Revenue Dragon, which burns down a single boss, the Universe never asks you to win anything inside itself. Its job is orientation and fast travel. Use each session as a sampler. Rotate the full globe once, hover every glowing sector, then enter exactly one game and play it end to end before returning for the next.",
    ],
    faq: [
      {
        q: "What do I actually do in the hub?",
        a: "Rotate the globe, hover glowing sectors to inspect Pipeline Peaks, Revenue Jungle, and Temple of Automation, then click one sector to launch its game. The hub keeps no score and has no enemies. Think of it as a menu you can walk around, built to help you choose a world and jump in fast.",
      },
      {
        q: "Is the Universe good for first time players?",
        a: "Yes, it is the best starting point because every MADI quest is visible in one place with clear labels. Spend five minutes touring each glowing zone, pick the theme that excites you most, and launch it. Climbers can head to Pipeline Mountain, sharpshooters to the Revenue Dragon, and runners to the Revenue Jungle.",
      },
      {
        q: "How should I use it across sessions?",
        a: "Treat each visit as a tour plus one main run. Rotate once for orientation, check for sectors you have not cleared, then commit to a single world for the session. Logging which sectors you entered, finished, or skipped keeps the hub useful, and it stops you from bouncing between games without progress.",
      },
    ],
  },
  {
    slug: "the-pipeline-mountain",
    about: [
      "The Pipeline Mountain is a vertical 3D climber where you guide the Blue Cat from manual spreadsheets at the base to revenue and market leadership at the summit. The route is a chain of floating integration platforms suspended over the valley, with falling tools and stray spreadsheets dropping through the climb line. Jumps need centered takeoffs, short steering bursts, and calm landings, because every edge takeoff and rushed leap ends in a long fall.",
      "Platformer fans and players who like visible progress will love it, since height itself is the score and each new ledge proves cleaner timing. The curve starts forgiving on wide low platforms, then tightens as gaps widen, platforms narrow, and falling tools force pauses. Replay value is strong because falls teach routes, and a climb that took ten minutes soon takes three once your center jumps and wait beats lock in.",
      "Next to The Revenue Jungle, which is a horizontal reflex runner about late jumps and coin lines, the Mountain is slower, more deliberate, and fully about vertical routing. Next to The Lost City of Customers, it trades quiet scanning for movement skill. Each session, climb three platforms slowly to warm up, pause on wide ledges to plan two jumps ahead, and never leap while a falling tool is overhead.",
    ],
    faq: [
      {
        q: "How do I stop falling?",
        a: "Jump from platform centers, steer in short taps, and pause on wide ledges before committing. Edge takeoffs drift and rushed jumps miss, so reset to center after every landing. Watch for falling tools, wait one beat as they pass, then jump while the lane above is clear.",
      },
      {
        q: "What is the goal at the summit?",
        a: "The climb tells a business story in height, starting at manual spreadsheets and ending at revenue and market leadership. Reaching the summit completes the run and proves consistent routing, timing, and patience. Many players treat height as score, logging how far they climbed before each fall to measure progress.",
      },
      {
        q: "Mountain or Jungle for a quick session?",
        a: "Pick the Mountain when you want deliberate climbs with planning pauses and visible height gains. Pick The Revenue Jungle when you want fast horizontal runs with instant restarts and coin scoring. The Mountain rewards patience across minutes, while the Jungle rewards reflexes across seconds, so mood decides.",
      },
    ],
  },
  {
    slug: "the-revenue-dragon",
    about: [
      "The Revenue Dragon is a boss battle shooter built around one massive enemy, the Dragon of Delay, stitched from manual work, delayed responses, and data silos. You command the Blue and Green cats along the floor, strafing left and right while firing action beams upward into the beast. Orange fireballs rain down as data silo shots, so every volley is a trade between dealing damage and sliding clear. The arena is loud, bright, and built for constant motion.",
      "Shooter fans, boss rush lovers, and players who enjoy dodge plus damage loops will feel instantly at home. The curve opens kindly, with slow fireballs and a wide floor, then tightens as volleys thicken and safe lanes shrink. Replay value lives in damage efficiency, because holding continuous fire while strafing under the dragon beats cautious potshots, and each rematch sharpens positioning by a step.",
      "Beside The Pipeline Mountain, which rewards patient vertical jumps, the Dragon rewards volume of fire and lateral footwork, and beside The Revenue Jungle, it replaces jump timing with aim plus dodge choices. Open each session with one full width strafe to learn move speed, then settle under the dragon and fire without pause. Dodge orange shots first and let beams accumulate damage second.",
    ],
    faq: [
      {
        q: "How do I damage the dragon fast?",
        a: "Keep firing action beams continuously while strafing beneath the dragon, because damage comes from volume rather than perfect aim. Parked cats deal less over time and eat more fireballs. Stay mobile, hold the fire rhythm through each volley, and measure progress by health lost per pass.",
      },
      {
        q: "How do I dodge the orange fireballs?",
        a: "Treat orange as danger and move early, sidestepping out of the falling lane before the next volley starts. Small lateral slides beat long panicked runs, since wide dashes often carry you into the next shot. Watch the sky between bursts, pick the open lane, and only resume centered fire once clear.",
      },
      {
        q: "Dragon or Mountain for action players?",
        a: "Choose the Dragon when you want steady shooting, visible boss health, and dodge heavy strafing across a flat arena. Choose The Pipeline Mountain when you want jumps, falls, and vertical routing instead of projectiles. Both test positioning, but the Dragon pays for aggression while the Mountain pays for patience.",
      },
    ],
  },
  {
    slug: "the-revenue-jungle",
    about: [
      "The Revenue Jungle is a fast arcade runner set in dense growth where vines mean manual processes, quicksand means bad data, and fog means slow decisions. You sprint forward on an endless trail, jumping late over each hazard while grabbing gold coins that mark revenue. The rules are simple, jump or stumble, but the speed keeps rising and the gaps keep tightening. It is the purest reflex test in the MADI set.",
      "Endless runner fans, high score chasers, and players who want three minute sessions will love this loop. The curve is instant to learn, because one button jumps everything, yet hard to master as fog hides timing and coin lines tempt risky detours. Replay value is the whole point, since distance plus coins gives every run a number to beat, and one more leap is always tempting.",
      "Against The Pipeline Mountain, which climbs slowly with planned pauses, the Jungle never pauses and restarts in seconds, and against The Revenue Dragon, it swaps shooting for pure jump rhythm. Session strategy is strict. Take only coins on your current line, jump late rather than early over vines, watch one full quicksand cycle before committing, and never spam jumps inside fog, since rhythm beats panic.",
    ],
    faq: [
      {
        q: "When should I jump?",
        a: "Jump late over vines, because early jumps land inside the hazard more often than late ones clear it. For quicksand, watch one full cycle first, then commit on the learned beat. In fog, hold rhythm instead of guessing, jumping only when the hazard shape is confirmed rather than feared.",
      },
      {
        q: "Should I chase every coin?",
        a: "No, coins on your running line are free points, but detours into vines or quicksand end runs. Take the clean line first and skip any coin that forces a sharp correction. High scores come from distance plus steady pickups, not from one risky grab that cuts a promising run short.",
      },
      {
        q: "Jungle or Speed Portal for speed fans?",
        a: "Pick the Jungle when you want simple one button jumps, instant restarts, and coin scoring on an endless trail. Pick The Speed Portal when you want tunnel rotation, speed rings, and obstacle threading instead. The Jungle tests timing in bursts, while the Portal tests smooth steering, so try both moods.",
      },
    ],
  },
];
