import type { GameSpotlight } from "./spotlight";

// Group 08 spotlights. Fill each entry: 3+ about paragraphs (60-100 words
// each) + 3+ faq pairs (answers 40-70 words). Unique prose per game.
// HARD RULE: no em-dash character (U+2014) anywhere.
export const GROUP_08_SPOTLIGHTS: GameSpotlight[] = [
  {
    slug: "the-speed-portal",
    about: [
      "The Speed Portal turns office drudgery into a glowing Three.js tunnel. You pilot a craft down a neon portal while floating labels for Approvals, Meetings, and Legacy Software rush toward you as traffic. Threading golden speed rings gives you a dash burst, which makes the whole run feel like escaping a slow company intranet at light speed. The Madi AI Creative Team built it as revenue engine satire, so every obstacle is a joke you have already lived through in a real job.",
      "Reaction game fans will feel at home, especially if you like Neon Void Runner or Neon Racer. Where Void Runner is pure abstract dodging and Neon Racer is lane switching through traffic, The Speed Portal adds a racing line: rings reward centered flight, not just survival. Sessions last a minute or two, so it suits players who want a quick reflex test between tasks. If you bounce off long sims like Financial Freedom, this is the opposite end of the catalog: instant speed, zero spreadsheets.",
      "The skill curve is all rotation discipline. Beginners spin wildly and clip every second gate, while veterans make one small A or D correction per obstacle and recenter before the next. Approvals tend to arrive in pairs, so expect a follow-up after your first dodge. For scoring, thread rings dead center rather than grazing them, since centered entries keep you aligned for the next hazard. Replay value comes from chasing longer clean streaks: more rings threaded, more distance banked, fewer panicked overcorrections per run.",
    ],
    faq: [
      {
        q: "How do I steer without crashing constantly?",
        a: "Use short taps of A and D or the arrow keys, then release. The craft rotates inside the tunnel, so holding a key sends you into a full spin. Aim to make one correction per obstacle and glide back toward center while the track is clear. Thread speed rings through their middle, because a centered exit leaves you lined up for whatever comes next.",
      },
      {
        q: "What is the best session strategy for rings versus dodging?",
        a: "Treat survival first and rings second on your opening runs. Once you can clear the first straight with gentle inputs, start aiming for rings that sit near your current line instead of chasing far ones. Rings on your line are free speed, while cross tunnel chases usually end in a collision. Log distance plus rings per run so you can see whether aggression actually pays.",
      },
      {
        q: "How does it compare to other speed games here?",
        a: "Pick Neon Void Runner if you want pure survival dodging with no racing line, and Neon Racer if you want lane based traffic weaving. The Speed Portal sits between them: it has Void Runner style tunnel pressure plus a Racer style optimal path through the rings. Overtake is the longer arcade racer with cars and nitro, while this game is a two minute satire sprint.",
      },
    ],
  },
  {
    slug: "treasure-hunters",
    about: [
      "Treasure Hunters turns sales pipeline anxiety into a carnival claw machine. A mechanical claw swings above a pit of glowing business treasures labeled Pipeline, Meetings, Revenue, and Customers, all rendered in Three.js by the Madi AI Creative Team. Each drop is a small drama: the claw sways, you commit, and it either closes around a fat revenue gem or fumbles into the sand. The office satire lands because every prize is something a real sales team actually chases each quarter.",
      "Patient timing fans will love this, especially players who enjoy Neon Breaker or The Lost City of Customers. Neon Breaker rewards paddle patience and edge aiming, while Lost City rewards slow grid scanning for hidden databases. Treasure Hunters shares that deliberate tempo but compresses it into a single repeating decision: drop now or wait one more swing. It suits casual players and anyone who wants a low input arcade break rather than a reflex marathon like Neon Void Runner.",
      "The skill curve looks flat but punishes spam. New players mash Space on every swing and post terrible grab rates, while steady players watch two full swings, then drop only when a high value target crosses center. High value beats near value every time, so let small pickups pass. Replay value is the grab rate chase: count successful grabs per ten drops, then try to beat it. One clean drop per swing cycle beats three rushed ones.",
    ],
    faq: [
      {
        q: "When exactly should I drop the claw?",
        a: "Wait until your target crosses the center of the swing arc, then press Space or click once. The claw falls straight down, so center crossings give the truest aim. Watch two full swings before your first drop to learn the rhythm. Retrieve fully after every grab before judging the next one, since the swing phase resets each cycle.",
      },
      {
        q: "Should I grab everything or wait for big prizes?",
        a: "Wait for big prizes that cross near center and let small or edge items pass. A missed big target costs one swing, but a rushed grab at a small target costs the same time for fewer points. Track grabs per ten drops across sessions. If your rate climbs when you skip more, your patience is paying off.",
      },
      {
        q: "How does it compare to other arcade games here?",
        a: "Neon Breaker is the closest sibling: both reward patience over button mashing, but Breaker adds paddle aiming while this game is pure swing timing. The AI Expedition is the deliberate opposite, asking you to plan pipeline routes click by click instead of snatching them. Play Treasure Hunters for quick timing loops and Expedition when you want slow strategy.",
      },
    ],
  },
  {
    slug: "fridgesimulator",
    about: [
      "Fridge Simulator casts you as a global food coordinator keeping families alive across multiple countries. You buy food from grocery stores, pantries, charities, dumpsters, and wholesalers, stock fridges in each region, and balance nutrition as well as raw calories. Every press of Next Day makes every family hungrier, and failures compound fast: unfed families weaken, then starve. Creator MattyJacks frames the dark premise with humor, but the logistics puzzle underneath is completely serious.",
      "Systems thinkers will love this, especially players who enjoy Financial Freedom or Exit Waterfall Machine. Financial Freedom stretches household budgeting across careers, taxes, and decades, while Waterfall Machine teaches startup payout math through sliders. Fridge Simulator sits between them in tempo: daily turns like a budget sim, but with life or death triage instead of retirement planning. If you like untimed decisions where one changed variable tells a clear story, this is your game.",
      "The skill curve starts with staples and ends with nutrition juggling. On day one, buy one cheap staple per country so nobody starts hungry, then check the nutrition panel before advancing. One hungry country is a warning, two is a spiral that eats your budget. Replay value is survival time: how many days can you keep every fridge stocked. Change one purchase per day so shortages stay attributable, and learn which cheap sources cover protein versus produce gaps.",
    ],
    faq: [
      {
        q: "How do I survive the first few days?",
        a: "Buy one staple food for every country on day one, check nutrition balance, then press Next Day or Space to advance. Do not splurge on variety until every region has baseline stock. Read the hunger report after each day to see who went unfed. Early survival is about coverage first, efficiency second, and perfect menus never.",
      },
      {
        q: "What is the best buying strategy across food sources?",
        a: "Mix cheap bulk sources with targeted nutrition fixes. Use grocery and wholesale for staple calories, then fill vitamin and protein gaps with pantry or charity stock. Change only one purchase per day so you can trace shortages to their cause. Balance nutrition panels, not just calorie totals, because full but malnourished families still decline.",
      },
      {
        q: "How does it compare to Financial Freedom?",
        a: "Both are untimed management sims about stretching a budget, but Financial Freedom plays monthly across one household with careers and investments, while Fridge Simulator plays daily across whole countries with starvation pressure. Play Financial Freedom for long range planning and Fridge Simulator for daily triage. Fans of one usually enjoy the other.",
      },
    ],
  },
  {
    slug: "whenwillidie",
    about: [
      "When Will I Die is a novelty mortality oracle, not a traditional game. You answer lifestyle questions about sleep, smoking, exercise, diet, and stress, and the page combines your inputs with real life table math to produce a playful statistical death date plus a live countdown. When the server key is configured, an OpenAI narrated roast accompanies the number. A built in skeleton photo filter then renders your portrait as a skeleton on the same background, fully on device.",
      "Party crowds and curiosity seekers will love this, especially groups comparing results side by side. It has more in common with creative toys like SoundPainter than with sims like Financial Freedom: there is no fail state, no leaderboard grind, and no skill gate. Honest inputs give funnier and more believable outputs, and the countdown framing makes it a great two minute conversation piece. Treat it as entertainment with friends, not as health guidance of any kind.",
      "Replay value comes from comparing lifestyles, not from mastering mechanics. Run it once with honest answers, then rerun with one habit changed to see how the estimate shifts. The photo filter rewards good lighting and a steady pose rather than gaming skill. Session strategy is simple: self censor all personal data, never enter your name or contact details, laugh at the roast, screenshot the skeleton portrait, and remember the page states it plainly. This is entertainment only.",
    ],
    faq: [
      {
        q: "Is the death date a real prediction?",
        a: "No, it is a novelty estimate for entertainment only. The page blends your lifestyle answers with population life table averages, then adds a playful narrated roast when configured. It knows nothing about your genetics, medical history, or future. Never treat the countdown as health advice, and talk to a real professional about any health concern.",
      },
      {
        q: "What should I enter, and how do I stay safe?",
        a: "Enter only broad lifestyle answers like age range, sleep hours, and general habits. Never type your name, email, phone, address, or other identifying details into the form. Self censoring keeps the joke fun without exposing personal data. The skeleton photo filter runs on device, so pose against a plain background and keep the original photo private.",
      },
      {
        q: "How does it compare to other games in the catalog?",
        a: "SoundPainter is the closest sibling in spirit: both are open toys with no winning or losing, built for playful self expression. Financial Freedom is the serious mirror image, modeling money and life choices with lasting consequences. Play When Will I Die for a two minute party laugh, then play Financial Freedom when you want real planning.",
      },
    ],
  },
];
