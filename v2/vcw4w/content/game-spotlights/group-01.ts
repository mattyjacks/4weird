import type { GameSpotlight } from "./spotlight";

// Group 01 spotlights. Fill each entry: 3+ about paragraphs (60-100 words
// each) + 3+ faq pairs (answers 40-70 words). Unique prose per game.
// HARD RULE: no em-dash character (U+2014) anywhere.
export const GROUP_01_SPOTLIGHTS: GameSpotlight[] = [
  {
    slug: "platform-wars",
    about: [
      "Platform Wars stages a loud bragging-rights rivalry between phone players and desktop players inside compact neon arenas built for ninety second rounds. There is no story campaign or quiet exploration, only two platform tribes spawning with the same goal and different hands. Touch players slide and turn on an on screen pad, keyboard players strafe with A and D and jump with W or Space. The world is all ledges, gaps, and dash lanes, and every round resets the argument about which input really wins.",
      "Players who love quick competitive bursts and cross play arguments will feel at home, especially friends settling phone versus desktop debates in person. The skill curve is honest. Beginners can move and jump within seconds, intermediate players learn when to tap the F dash through rivals instead of away, and veterans chain jumps and dashes across arena flow. Because rounds last about ninety seconds and sides play differently, rematches stay fresh and losing quickly teaches positioning without long punishment.",
      "Compared with solo speed games like Overtake or Neon Void Runner, Platform Wars is about outscoring people, not beating a clock or surviving traffic. It also differs from cooperative party chaos because input identity matters here. For a strong session, pick the side matching your strength, desktop for precise jumps and phone for tight turns, focus the arena with one click before kickoff, move on the first frame, and save dashes for contested center ground rather than escapes. Rotate phones for visibility and queue another rematch immediately.",
    ],
    faq: [
      {
        q: "Is Platform Wars better on phone or desktop?",
        a: "Neither side is strictly better, which is the point. Desktop rewards straight line precision, long jumps, and deliberate dash timing with keys. Phone rewards quick direction changes, close range scrambles, and recovery in tight corners. New players should start with whatever they already use daily, then switch sides after three rounds. Your score gap will tell you which input fits your reflexes.",
      },
      {
        q: "How long is a match and can I pause?",
        a: "Quick Match rounds run about ninety seconds with no pause key, so treat every queue as a short commitment. Leaving exits the match, which is why the boot advice says to click the arena first and move immediately. The format suits lunch breaks, classroom free minutes, and rematch ladders. If you need a break, finish the round, step away between queues, and rejoin when you can give full attention.",
      },
      {
        q: "How do I improve fast?",
        a: "Play desktop for one session with a single goal, such as landing three clean precision jumps per round. Then play phone with a different goal, such as winning two tight turn scrambles. Practice dashing through opponents rather than away, since passing through keeps pressure and protects center control. Review which deaths came from standing still, then queue again while the lesson is fresh.",
      },
    ],
  },
  {
    slug: "lastwordszombies",
    about: [
      "Last Words Zombies drops you into a graveyard camp at night, with shambling word bound zombies crawling from the dark toward your barricade. Each attacker carries a cursed word on its body, and typing is your weapon. Locking the first letter aims your focus, finishing the word banishes the creature in a burst that staggers its neighbors. Every fifth wave sends a boss with a longer vocabulary, and your shield starts at one hundred, so every missed keystroke has visible cost.",
      "Typing game fans, horror arcade lovers, and students who want speed practice with stakes will love this loop. Early waves forgive hunt and peck typing because words are short and zombies are slow. The curve steepens when runners, brutes, and weaving ghosts arrive together and long boss words demand accuracy under pressure. Replay value comes from chasing cleaner typing, smarter power timing, and higher waves survived. The Black Market stash between runs gives keyboard players a progression reason to return.",
      "Compared with reflex shooters like Neon Invaders or Server Saver Shield, victory here comes from vocabulary speed rather than aim. Compared with calm builders like Soundpainter, tension never releases until the wave clears. For a strong session, lock the nearest breacher first, clear short words when flooded, save Shockwave for the fifth wave boss, and avoid the triple speed gamble below thirty shield. Drop bad locks with Backspace freely, then freeze or restore before the barricade cracks.",
    ],
    faq: [
      {
        q: "How do the three powers work?",
        a: "You carry three one shot tools for emergencies. Shockwave clears normal zombies and bites a chunk from boss words, Cryo freezes the field for five seconds, and Shield restores forty points. Use them when two lanes collapse at once, not for single zombies you could type. Boss waves deserve a saved power. Between sessions, keyboard players can visit the Black Market stash from the main menu to manage stored progress.",
      },
      {
        q: "Do I need fast typing to enjoy it?",
        a: "No, beginners can survive early waves with modest speed because the game auto targets the closest threat and short words dominate the opening. Focus on first letter accuracy rather than raw words per minute. Touch typists improve naturally by wave three. If the horde floods, clear short words, drop bad locks, and let kill stuns slow the pack while you reset.",
      },
      {
        q: "Why do I keep losing around boss waves?",
        a: "Bosses arrive every fifth wave with longer words and escorts that split your attention. Players lose because they enter with no saved power and low shield. Fix the setup wave by typing efficiently, holding shield above thirty, and keeping Shockwave ready. During the boss, ignore distant zombies, finish the boss word in steady chunks, and use kill stuns from escorts to buy breathing room.",
      },
    ],
  },
  {
    slug: "venturemechanically",
    about: [
      "Exit Waterfall Machine turns startup finance into a visible machine. You configure funding rounds, debt, and liquidation preferences in Sandbox mode, then drag an exit slider from small acquisition to giant public exit and watch cash fall through the waterfall. Preferred investors get paid first, debt clears before equity, and common holders, including founders and employees, receive whatever remains. Scenario mode frames the same math as practical capital puzzles drawn from real startup outcomes.",
      "Curious founders, startup employees, students, and anyone considering stock options will get the most from this simulator. There is no twitch skill curve. Progress means sharper intuition, first seeing that preferences eat common holders, then feeling how debt changes small exits, then predicting outcomes before dragging the slider. Replay value comes from testing ten million versus five hundred million exits, stacking preferences, and replaying Scenario challenges until every surprise payout makes sense.",
      "Compared with Financial Freedom, which simulates decades of household choices month by month, Exit Waterfall Machine studies one ruthless moment, the exit split. Compared with arcade catalog games like Overtake, there is no timer or reflex test, only cause and effect. For a strong session, change one variable at a time, screenshot each waterfall, run the slider end to end, and compare the same company at two exit sizes before adding a second preference or new debt.",
    ],
    faq: [
      {
        q: "Will this help me understand my own stock options?",
        a: "Yes, as an educational model rather than legal advice. It shows how liquidation preferences, participation, debt, and share counts interact before common stock receives anything. Adjust the settings to resemble a company you know, then compare small and large exits. Bring the resulting questions to a lawyer or finance mentor. The intuition you build here makes those professional conversations far more productive.",
      },
      {
        q: "Is Sandbox or Scenario mode better for beginners?",
        a: "Start in Sandbox with the default cap table because nothing is timed and every control is visible. Move one funding control, drag the exit slider fully, and observe who gains or loses. Once that loop feels clear, switch to Scenario mode, where fixed challenges test whether you can diagnose a painful payout. Alternating between free play and structured puzzles builds durable understanding fastest.",
      },
      {
        q: "Why do founders get nothing in a large exit?",
        a: "Size alone does not protect common holders when preferences and debt stack. Investors with liquidation preferences collect their multiple first, lenders collect debt before equity, and participation clauses can double dip. If those claims consume the exit amount, founders and employees split the remainder, which can be zero. Try adding two preference layers in Sandbox, then drag from a huge exit downward to see the cutoff appear.",
      },
    ],
  },
  {
    slug: "financialfreedom",
    about: [
      "Financial Freedom simulates the long financial life of a United States family, from first paychecks through investments, housing, taxes, and surprise life events. You choose a starting household, set a monthly budget, train for better careers, allocate across 401k, Roth IRA, savings, crypto, and property, pay down debt, and press Next Month to live with the results. Net worth climbs or slides while family happiness reacts to every tradeoff, so each calendar turn feels like a small story.",
      "Strategy fans, finance students, couples planning real budgets, and simulation lovers will enjoy the deliberate pace. Beginners should fund a 401k, clear high interest debt, and keep happiness stable before touching crypto or rentals. Mastery means timing career training early, balancing risk across accounts, and reading event cards as signals rather than noise. Replay value is high because different households, career paths, and housing choices create completely different decades, and burnout ends as many runs as bills do.",
      "Compared with Exit Waterfall Machine, which examines one startup payout in depth, Financial Freedom covers thousands of household decisions across years. Compared with quick arcade games like Server Saver Shield, progress is slow and cumulative rather than twitch based. For a strong session, advance one month at a time, change only one allocation between months, log net worth and happiness together, pay interest bearing debt before speculation, and treat every event card as a finding worth noting.",
    ],
    faq: [
      {
        q: "How do I win Financial Freedom?",
        a: "You win by reaching your household Financial Independence number without destroying family happiness. Grow net worth through career income, steady retirement contributions, selective real estate, and controlled debt payoff. Happiness acts as a second health bar, so overwork and constant austerity can fail a run even while savings rise. Check both numbers every few months and adjust before either trend turns sharply negative.",
      },
      {
        q: "Should beginners buy crypto or real estate first?",
        a: "Neither at first. Fund your 401k, build a small savings cushion, and attack high interest debt while happiness stays stable. Career training usually compounds harder than early side hustles. Once cash flow is predictable, test one new asset at a time, such as a modest index allocation or a single property decision, then watch two full months before adding complexity or leverage.",
      },
      {
        q: "How should I handle surprise event cards?",
        a: "Read each card fully before clicking Next Month again, then record whether it helped or hurt net worth and happiness. Treat surprises as data rather than interruptions, since job offers, medical bills, market swings, and family needs reveal weaknesses in your plan. Adjust one budget line in response, avoid overhauling everything during one emotional moment, and review the pattern after three cards.",
      },
    ],
  },
  {
    slug: "serversavershield",
    about: [
      "Server Saver Shield casts you as the last protector of humming data centers under cyber siege. Malware bots dart inward, viruses drift toward server health, and DDoS waves spike pressure across the screen. You sweep a glowing shield with mouse or touch, toggle beams to burn threats, and reposition with WASD or arrows when flanked. Coins earned from kills feed a Shop and Management Zone, where Emergency Repair restores fifty health and buys time before the next surge arrives.",
      "Arcade defense fans, cybersecurity curious players, and anyone who likes short intense runs with shop progression will enjoy this cabinet style loop. Early waves teach sweeping and beam toggling, middle waves demand constant motion and target priority, and later surges punish parked shields. Replay value comes from beating wave records, improving coin spending, and surviving compositions that previously broke your defense. Each run sharpens threat reading more than raw clicking speed.",
      "Compared with Neon Invaders, which is a pure ship shooter about lanes and return fire, Server Saver Shield adds economy and positioning defense around fixed servers. Compared with thoughtful simulations like Financial Freedom, sessions are measured in minutes and reflexes, not decades. For a strong session, keep moving, tap beams for swarms and hold for bosses, track the densest cluster each second, and bank coins for Emergency Repair before DDoS spikes rather than spending on the first affordable upgrade.",
    ],
    faq: [
      {
        q: "How do I use beams without leaving defense open?",
        a: "Treat the beam as a toggle rather than a held trigger. Click once to turn beams on when malware enters range, then click again to stop once the cluster clears. Tap fire against spread swarms so you stay mobile, and hold sustained fire for bosses or dense DDoS packs. Constant motion matters more than constant shooting, because a moving shield intercepts while a stationary beam invites flanking attacks.",
      },
      {
        q: "What should I buy first in the Shop Zone?",
        a: "Save early coins for Emergency Repair, which restores fifty health and stabilizes runs before DDoS spikes. It is tempting to buy damage first, but extra offense cannot rescue a server already near failure. Learn the rhythm of two full waves, note when your health dips fastest, enter the Shop Zone with a plan, buy repair first, and only then invest remaining coins in stronger beams.",
      },
      {
        q: "Why do I get flanked around wave three?",
        a: "Attacks are color coded and begin arriving from wider angles, so a parked shield becomes an easy target. Keep sweeping across the full defensive arc instead of camping one side. Set a colorblind filter before wave three if colors blur together, prioritize the densest cluster, and reposition with WASD or arrows when enemies slip behind. Movement prevents most flanks before beams need to finish the job.",
      },
    ],
  },
];
