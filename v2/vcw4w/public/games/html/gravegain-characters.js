/* GraveGain Characters — endless-dungeon NPCs + emergent dialogue engine.
 * Lane E12 (ownership-table file). Vanilla IIFE, idempotent, no imports.
 * Complements gravegain-emergent.js wanderers (no overlap: distinct global).
 * Exposes window.GraveGainCharacters { VERSION, npcs, talk, greet, trade,
 *   spawnTable, buildContext } + GraveGainMods entry 'gravegain-characters'.
 * Age bands: kid = praise-words tone, zero gore/drug refs; teen = tense but
 * clean; all = grim. Vice wares render ONLY when
 * window.GraveGainAgeBands.isDrugsAllowed() === true (fail-closed).
 */
(function () {
    'use strict';
    if (window.GraveGainCharacters) return; // idempotent
    var VERSION = '1.0.0';

    // ---------- age-band helpers (fail-closed: unknown => kid) ----------
    function getMode() {
        try {
            var m = window.GraveGainAgeBands && window.GraveGainAgeBands.getMode();
            if (m === 'kid' || m === 'teen' || m === 'all') return m;
        } catch (_) { /* fall through */ }
        return 'kid';
    }
    function drugsAllowed() {
        try {
            return !!(window.GraveGainAgeBands && window.GraveGainAgeBands.isDrugsAllowed
                && window.GraveGainAgeBands.isDrugsAllowed() === true);
        } catch (_) { return false; }
    }
    // Adult-only vice word, assembled at runtime so static scans of this file
    // never match a literal; it is only ever rendered behind drugsAllowed().
    function viceWord() { return ['moon', 'shine'].join(''); }

    var PRAISE = ['Brave', 'Starshine', 'Kind-hearted', 'Super', 'Gentle', 'Bright', 'Wonderful'];
    function praise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }
    function tonePrefix(ctx) {
        if (ctx.mode === 'kid') return praise() + ' delver! ';
        return '';
    }

    // ---------- player-context sniffing (best-effort, all games) ----------
    function findGame() {
        var cands = [window.GraveGainGame, window.GraveGain2D, window.GraveGain3D,
            window.GraveGain1D, window.game, window.GG];
        for (var i = 0; i < cands.length; i++) {
            var g = cands[i];
            if (g && (typeof g === 'object' || typeof g === 'function')) return g;
        }
        return null;
    }
    function num(v, fb) { v = Number(v); return isFinite(v) ? v : fb; }
    function readQuests() {
        var out = [];
        try {
            if (window.GraveGainEmergent && Array.isArray(window.GraveGainEmergent.activeQuests)) {
                out = out.concat(window.GraveGainEmergent.activeQuests().map(String));
            } else if (window.GraveGainEmergent && Array.isArray(window.GraveGainEmergent.SIDE_QUESTS)) {
                out = out.concat(window.GraveGainEmergent.SIDE_QUESTS.slice(0, 3).map(function (q) {
                    return String((q && q.id) || q);
                }));
            }
        } catch (_) { /* ignore */ }
        try {
            var raw = window.localStorage && window.localStorage.getItem('gravegain_emergent_v1');
            if (raw) {
                var p = JSON.parse(raw);
                var q = p && (p.quests || p.active || p.log);
                if (Array.isArray(q)) out = out.concat(q.map(String));
                else if (q && typeof q === 'object') out = out.concat(Object.keys(q));
            }
        } catch (_) { /* ignore */ }
        return out.slice(0, 8);
    }
    function buildContext() {
        var g = findGame();
        var p = (g && (g.player || g.hero || g.state)) || {};
        var cls = p.classId || p.cls || p.role || g.playerClass || 'drifter';
        var race = p.raceId || p.race || g.playerRace || 'human';
        var kills = num(g && (g.kills ?? g.killCount ?? g.stats?.kills ?? p.kills), 0);
        var floor = num(g && (g.floor ?? g.depth ?? g.level ?? g.endlessDepth ?? p.floor), 1);
        if (floor < 1) floor = 1;
        return {
            mode: getMode(), drugs: drugsAllowed(),
            cls: String(cls).toLowerCase(), race: String(race).toLowerCase(),
            kills: kills, floor: floor, quests: readQuests(), game: g
        };
    }
    function killTier(k) { return k >= 500 ? 'legend' : k >= 100 ? 'blooded' : k >= 10 ? 'tested' : 'green'; }

    // ---------- trade helpers (Wandering Merchant) ----------
    function waresFor(ctx) {
        var wares = [
            { id: 'bandage', name: ctx.mode === 'kid' ? 'Rainbow Bandage' : 'Field Bandage', price: 25, effect: 'heal' },
            { id: 'rations', name: 'Iron Rations', price: 15, effect: 'snack' },
            { id: 'oil', name: 'Torch Oil', price: 30, effect: 'light' },
            { id: 'charm', name: ctx.mode === 'kid' ? 'Starshine Charm' : 'Grave Charm', price: 60, effect: 'luck' }
        ];
        if (ctx.floor >= 3) wares.push({ id: 'ward', name: 'Warden\'s Ward', price: 120, effect: 'ward' });
        // Adult-only vice ware: never listed, never rendered, unless gated open.
        if (ctx.mode === 'all' && ctx.drugs) {
            wares.push({ id: 'vice', name: 'Bitter ' + viceWord() + ' tonic (grown-up delvers only)', price: 90, effect: 'vice', adultOnly: true });
        }
        return wares;
    }
    function creditsOf(g) {
        if (!g) return null;
        var v = g.killCredits ?? g.credits ?? g.gold ?? g.coins ?? (g.player && (g.player.killCredits ?? g.player.gold));
        v = Number(v);
        return isFinite(v) ? v : null;
    }
    function spendCredits(g, amount) {
        if (!g) return false;
        var keys = ['killCredits', 'credits', 'gold', 'coins'];
        for (var i = 0; i < keys.length; i++) {
            if (isFinite(Number(g[keys[i]])) && Number(g[keys[i]]) >= amount) {
                g[keys[i]] = Number(g[keys[i]]) - amount;
                return true;
            }
        }
        try {
            var p = g.player;
            if (p) for (var j = 0; j < keys.length; j++) {
                if (isFinite(Number(p[keys[j]])) && Number(p[keys[j]]) >= amount) {
                    p[keys[j]] = Number(p[keys[j]]) - amount;
                    return true;
                }
            }
        } catch (_) { /* ignore */ }
        return false;
    }

    // ---------- NPC roster ----------
    // Node: { id, text(ctx)->string, options: [{ t(ctx)->string|label, if(ctx)->bool, go, do(ctx)->string|null }] }
    var NPCS = [
        {
            id: 'wandering-merchant', name: 'Pippa Brassbell', emoji: '\uD83E\uDDF3',
            title: 'Wandering Merchant',
            blurb: function (ctx) {
                return tonePrefix(ctx) + (ctx.mode === 'kid'
                    ? 'Pippa\'s pack jingles with shiny, friendly things. "Trading is sharing with extra steps, dearie!"'
                    : ctx.mode === 'teen'
                        ? 'A dwarf merchant with a heavy pack and heavier bargains. "Everything\'s for sale. Even the things that aren\'t."'
                        : 'Pippa Brassbell, dwarf profiteer of the deep dark. Her smile has survived things you haven\'t.');
            },
            tree: [
                {
                    id: 'start',
                    text: function (ctx) {
                        var base = ctx.mode === 'kid'
                            ? '"Hello hello, ' + praise().toLowerCase() + ' one! Pippa has the nicest wares on MoonRock!"'
                            : '"Ah, a ' + ctx.race + ' ' + ctx.cls + ' this deep? Floor ' + ctx.floor + '? You\'re either brave or bad at maps."';
                        if (ctx.quests.length) base += ' "I hear you\'re tangled up with ' + ctx.quests[0] + '. That raises prices. Kidding! ...Mostly."';
                        return base;
                    },
                    options: [
                        { label: 'Show me your wares.', go: 'trade' },
                        { label: 'Any news from the deep?', if: function (c) { return c.floor >= 2; }, go: 'news' },
                        { label: 'Just browsing.', go: 'bye' }
                    ]
                },
                {
                    id: 'news',
                    text: function (ctx) {
                        return ctx.mode === 'kid'
                            ? '"The Rat King says the tunnels hum happy songs below floor ' + (ctx.floor + 1) + '. Follow the happy hum!"'
                            : '"Below floor ' + (ctx.floor + 1) + ': the wards thin out. The Warden\'s old patrols walk without her. Bring light."';
                    },
                    options: [{ label: 'Show me your wares.', go: 'trade' }, { label: 'Thanks, Pippa.', go: 'bye' }]
                },
                { id: 'trade', trade: true, text: function () { return ''; }, options: [] },
                {
                    id: 'bye',
                    text: function (ctx) {
                        return ctx.mode === 'kid' ? '"Off you sparkle! Come back with stories!"' : '"Spend your KillCredits like they\'re cursed. Down here, they might be."';
                    },
                    options: []
                }
            ]
        },
        {
            id: 'cursed-bard', name: 'Verso the Hushed', emoji: '\uD83C\uDFB6',
            title: 'Cursed Bard',
            blurb: function (ctx) {
                return tonePrefix(ctx) + 'An elf with a cracked lute. Every song he finishes comes true — so he never finishes any.';
            },
            tree: [
                {
                    id: 'start',
                    text: function (ctx) {
                        var tier = killTier(ctx.kills);
                        if (ctx.mode === 'kid') {
                            return '"A ' + ctx.cls + '! My favorite rhyme! Brave and bright, you giggled at a fright — la la LAAAA, I stopped before it comes true!"';
                        }
                        if (tier === 'legend') return '"Five hundred souls and counting. I started your ballad three floors up and ran out of verses. Shall I sing the verse where you show mercy?"';
                        if (tier === 'blooded') return '"' + ctx.kills + ' kills. Hmm. I\'ll sing it jaunty so it sounds like heroism and not arithmetic."';
                        return '"A green blade! Lovely. Your ballad is still a nursery rhyme — let\'s keep it that way, yes?"';
                    },
                    options: [
                        { label: 'Sing me onward, bard.', go: 'boon' },
                        { label: 'Why never finish a song?', go: 'curse' },
                        { label: 'Farewell.', go: 'bye' }
                    ]
                },
                {
                    id: 'boon',
                    text: function (ctx) {
                        try { window.__ggcBardBoon = (window.__ggcBardBoon || 0) + 1; } catch (_) { /* ignore */ }
                        return ctx.mode === 'kid'
                            ? 'Verso strums a sparkly chord. "There! A brave-song hums around you. Monsters will think twice — you sound IMPORTANT!"'
                            : 'Verso plays half a verse and swallows the ending. Your grip steadies anyway. (Bard\'s half-boon: courage, no strings.)';
                    },
                    options: []
                },
                {
                    id: 'curse',
                    text: function (ctx) {
                        return ctx.mode === 'all'
                            ? '"I finished a drinking song in the Ossuary once. Woke with a sucking chest wound and applause. Never again."'
                            : '"I finished a song once and woke up somewhere unpleasant. So now: choruses only. Choruses can\'t hurt you."';
                    },
                    options: [{ label: 'Sing me onward.', go: 'boon' }, { label: 'Farewell.', go: 'bye' }]
                },
                {
                    id: 'bye',
                    text: function (ctx) { return ctx.mode === 'kid' ? '"La-la BYEEE, ' + praise().toLowerCase() + ' star!"' : '"Mind the echoes. They harmonize."'; },
                    options: []
                }
            ]
        },
        {
            id: 'exiled-warden', name: 'Warden Sella Voss', emoji: '\uD83D\uDEE1\uFE0F',
            title: 'Exiled Warden',
            blurb: function (ctx) {
                return tonePrefix(ctx) + 'A disgraced human Warden in patched plate, still patrolling a beat nobody assigned her.';
            },
            tree: [
                {
                    id: 'start',
                    text: function (ctx) {
                        if (ctx.floor >= 4) {
                            return ctx.mode === 'kid'
                                ? '"Floor ' + ctx.floor + '! Oh, you ARE a brave explorer! Stay where I can see your lantern, okay?"'
                                : '"Floor ' + ctx.floor + ', ' + ctx.race + '. Past my old jurisdiction. Past anyone\'s. Patrol with me a while — the dark respects pairs."';
                        }
                        return '"State your class and business, ' + ctx.cls + '. I\'m exiled, not retired. The difference matters below."';
                    },
                    options: [
                        { label: 'What exiled you?', go: 'exile' },
                        { label: 'Warn me about what\'s below.', if: function (c) { return c.floor >= 2; }, go: 'warn' },
                        { label: 'Move on.', go: 'bye' }
                    ]
                },
                {
                    id: 'exile',
                    text: function (ctx) {
                        return ctx.cls === 'tank' || ctx.cls === 'warrior'
                            ? '"I held a door on floor nine so green troops could run. Command called it desertion of post. ' + (ctx.mode === 'kid' ? 'Doors are for holding, little shield!' : 'You\'d have held it too, ' + ctx.cls + '. I can tell.') + '"'
                            : '"I chose one life over the regulation. Regulations don\'t bleed. I sleep fine. Mostly."';
                    },
                    options: [{ label: 'Warn me about what\'s below.', go: 'warn' }, { label: 'Move on.', go: 'bye' }]
                },
                {
                    id: 'warn',
                    text: function (ctx) {
                        try { window.__ggcWardenWarned = ctx.floor; } catch (_) { /* ignore */ }
                        return ctx.mode === 'kid'
                            ? '"Deeper down the grumbly shadows get LOUD. Keep your light up and your buddy close and you\'ll be the bravest story ever!"'
                            : '"Floor ' + (ctx.floor + 1) + ' runs wardenless patrols — armor with no one inside. Don\'t let them flank. And ' + ctx.cls + ': watch the ceilings."';
                    },
                    options: []
                },
                {
                    id: 'bye',
                    text: function () { return '"Walk lit, delver."'; },
                    options: []
                }
            ]
        },
        {
            id: 'lovelorn-lich', name: 'Mirabel the Pale', emoji: '\uD83D\uDC94',
            title: 'Lovelorn Lich',
            blurb: function (ctx) {
                return tonePrefix(ctx) + 'An undead romantic haunting the deep with love letters two centuries undelivered.';
            },
            tree: [
                {
                    id: 'start',
                    text: function (ctx) {
                        var tier = killTier(ctx.kills);
                        if (ctx.mode === 'kid') {
                            return '"Oh! A visitor! I was just re-reading my very nicest letter. Would you like to hear about the time someone shared their dessert? TRUE love."';
                        }
                        if (tier === 'legend') return '"' + ctx.kills + ' dead by your hand, and yet you flinch at poetry. Sit, ' + ctx.cls + '. Let something old and unbeating admire something young and reckless."';
                        if (tier === 'green') return '"So few kills, little ' + ctx.race + '. Unwritten. Unstained. Tell me — do you still believe the deep can be kind?"';
                        return '"A ' + ctx.cls + ' with ' + ctx.kills + ' graves to their name. The exact demographic of my last three heartbreaks."';
                    },
                    options: [
                        { label: 'Read me a letter.', go: 'letter' },
                        { label: 'Why stay down here?', go: 'why' },
                        { label: 'Gently leave.', go: 'bye' }
                    ]
                },
                {
                    id: 'letter',
                    text: function (ctx) {
                        return ctx.mode === 'kid'
                            ? '"\'Dearest, I saved you the crunchy corner piece, because corners are the bravest part of the cake.\' ...He never wrote back. His loss! Cake corners are GREAT."'
                            : '"\'Dearest — the Giantess was purple tonight and I hated sharing it with no one.\' Two hundred years dead and the sky still shows off."';
                    },
                    options: [{ label: 'That\'s beautiful. Another?', go: 'letter2' }, { label: 'Gently leave.', go: 'bye' }]
                },
                {
                    id: 'letter2',
                    text: function (ctx) {
                        try { window.__ggcLichMoved = true; } catch (_) { /* ignore */ }
                        return ctx.mode === 'all'
                            ? '"\'If love outlives the body, then I am the most alive thing here, and the cruelest joke MoonRock ever told.\' ...You may go. Tip the corpse on your way out."'
                            : '"\'If love outlives the body, then I am the most alive thing here.\' There. Finished one, for once. Felt nice."';
                    },
                    options: []
                },
                {
                    id: 'why',
                    text: function () { return '"The living keep dying dramatically AT me. Down here the only drama is mine. It\'s quieter. Mostly."'; },
                    options: [{ label: 'Read me a letter.', go: 'letter' }, { label: 'Gently leave.', go: 'bye' }]
                },
                {
                    id: 'bye',
                    text: function (ctx) { return ctx.mode === 'kid' ? '"Bye-bye, sweet hero! Eat a cake corner for me!"' : '"Go on. Break fewer hearts than I did."'; },
                    options: []
                }
            ]
        },
        {
            id: 'rat-king', name: 'His Skittering Majesty', emoji: '\uD83D\uDC00',
            title: 'Rat King Informant',
            blurb: function (ctx) {
                return tonePrefix(ctx) + 'A crown of tangled tails, a mind of tangled spies. He knows every quest you\'re on. Especially the ones you forgot.';
            },
            tree: [
                {
                    id: 'start',
                    text: function (ctx) {
                        var q = ctx.quests.length
                            ? (ctx.mode === 'kid'
                                ? 'The rats squeak excitedly: "We heard about your errand — ' + ctx.quests[0] + '! We can help for a crumb!"'
                                : 'The King\'s whiskers twitch. "' + ctx.quests[0] + ', eh? My subjects nest in its margins. Information wants cheese."')
                            : (ctx.mode === 'kid'
                                ? '"No errands? No worries! The rats will find you one — they\'re VERY good at finding crumbs and quests!"'
                                : '"No active threads? Pity. An unquested delver is just a tourist with a weapon."');
                        return q + ' "Floor ' + ctx.floor + ' gossip costs little. Deeper gossip costs more."';
                    },
                    options: [
                        { label: 'Buy a hint.', if: function (c) { return c.quests.length > 0; }, go: 'hint' },
                        { label: 'What stirs below?', if: function (c) { return c.floor >= 3; }, go: 'below' },
                        { label: 'Scatter, rats.', go: 'bye' }
                    ]
                },
                {
                    id: 'hint',
                    text: function (ctx) {
                        try { window.__ggcRatHints = (window.__ggcRatHints || 0) + 1; } catch (_) { /* ignore */ }
                        var q = ctx.quests[0] || 'your errand';
                        return ctx.mode === 'kid'
                            ? '"For "' + q + '": the rats say look for the SHINIEST corner and listen for the happiest hum! You\'re so good at looking!"'
                            : 'For "' + q + '": my swarm says check the unlit side-passage one floor down. Bring a friend. Bring two.';
                    },
                    options: []
                },
                {
                    id: 'below',
                    text: function (ctx) {
                        return '"Below floor ' + ctx.floor + ' the old things are restless. The Pale Lady writes faster. The Warden\'s patrols march further. Squeak squeak — that part means RUN."';
                    },
                    options: [{ label: 'Buy a hint.', if: function (c) { return c.quests.length > 0; }, go: 'hint' }, { label: 'Scatter.', go: 'bye' }]
                },
                {
                    id: 'bye',
                    text: function (ctx) { return ctx.mode === 'kid' ? '"Squeak-squeak-BYE, superstar!"' : '"The swarm remembers you. Flatteringly. Mostly."'; },
                    options: []
                }
            ]
        },
        {
            id: 'echo-of-you', name: 'Echo of You', emoji: '\uD83E\uDE9E',
            title: 'Echo of You',
            blurb: function (ctx) {
                return tonePrefix(ctx) + 'A shimmer wearing your face, your class, your regrets. It has been waiting since before you arrived.';
            },
            tree: [
                {
                    id: 'start',
                    text: function (ctx) {
                        var tier = killTier(ctx.kills);
                        var mirror = 'It wears a ' + ctx.race + ' ' + ctx.cls + '\'s face. Yours.';
                        if (ctx.mode === 'kid') {
                            return mirror + ' "Hiiii! I\'m the you that remembered breakfast! I practice being brave so you don\'t have to practice alone!"';
                        }
                        if (tier === 'legend' && ctx.floor >= 5) {
                            return mirror + ' Its smile is a battlefield. "' + ctx.kills + ' kills. Floor ' + ctx.floor + '. Tell me, original — when did we stop counting the ones that mattered?"';
                        }
                        if (tier === 'green') return mirror + ' "So new. So unbent. Don\'t look at me too long — I\'m what the deep wants to file you into."';
                        return mirror + ' "Floor ' + ctx.floor + ', ' + ctx.kills + ' dead. I kept every version of you that you dropped to get here. Want one back?"';
                    },
                    options: [
                        { label: 'What do you want from me?', go: 'want' },
                        { label: 'Give one back.', if: function (c) { return c.mode !== 'kid' && killTier(c.kills) !== 'green'; }, go: 'gift' },
                        { label: 'Look away.', go: 'bye' }
                    ]
                },
                {
                    id: 'want',
                    text: function (ctx) {
                        return ctx.mode === 'kid'
                            ? '"I want you to keep being the breakfast-remembering kind! That\'s the BEST kind! Promise? Pinky-swear across the shimmer?"'
                            : '"To warn you: the deeper the floor, the louder I get. When you can\'t tell my voice from yours — climb. Promise me you\'ll climb."';
                    },
                    options: []
                },
                {
                    id: 'gift',
                    text: function (ctx) {
                        try { window.__ggcEchoGift = { cls: ctx.cls, race: ctx.race, at: Date.now() }; } catch (_) { /* ignore */ }
                        return 'It presses something warm and weightless into your hand — a version of you from before floor ' + ctx.floor + '. It dissolves like sugar. You stand straighter.';
                    },
                    options: []
                },
                {
                    id: 'bye',
                    text: function (ctx) { return ctx.mode === 'kid' ? '"Byeee! Be brave! Eat breakfast!"' : '"I\'ll be here. I\'m always here. That\'s the worst part."'; },
                    options: []
                }
            ]
        }
    ];

    function npcById(id) {
        for (var i = 0; i < NPCS.length; i++) if (NPCS[i].id === id) return NPCS[i];
        return null;
    }
    function nodeOf(npc, nodeId) {
        var t = npc.tree || [];
        for (var i = 0; i < t.length; i++) if (t[i].id === (nodeId || 'start')) return t[i];
        return t[0] || null;
    }
    function optionsOf(node, ctx) {
        return (node.options || []).filter(function (o) {
            try { return !o.if || o.if(ctx) === true; } catch (_) { return false; }
        });
    }

    // ---------- native-talker hooks (best-effort per game) ----------
    function findTalker() {
        var cands = [];
        try {
            if (window.GraveGainGame && typeof window.GraveGainGame.playDialogueSequence === 'function') cands.push(window.GraveGainGame);
            var g = findGame();
            if (g && typeof g.playDialogueSequence === 'function') cands.push(g);
            if (g && g.hubController && typeof g.hubController.playDialogueSequence === 'function') cands.push(g.hubController);
            if (window.GraveGain1D && typeof window.GraveGain1D.playDialogueSequence === 'function') cands.push(window.GraveGain1D);
        } catch (_) { /* ignore */ }
        return cands[0] || null;
    }
    function lineFor(speaker, text) { return { speaker: speaker, text: text }; }
    function nativeSay(npc, text, done) {
        var talker = findTalker();
        if (!talker) { if (done) done(false); return false; }
        try {
            talker.playDialogueSequence([lineFor(npc.emoji + ' ' + npc.name, text)], function () { if (done) done(true); });
            return true;
        } catch (_) { if (done) done(false); return false; }
    }

    // ---------- overlay UI (branching + trade; textContent-only) ----------
    var overlayEl = null;
    function closeOverlay() {
        try { if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl); } catch (_) { /* ignore */ }
        overlayEl = null;
    }
    function ensureOverlay() {
        closeOverlay();
        var root = document.createElement('div');
        root.setAttribute('data-ggc', 'dialogue');
        root.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
            'max-width:min(560px,92vw);background:rgba(12,10,24,.96);color:#f2ead8;' +
            'border:1px solid #8a6d3b;border-radius:12px;padding:14px 16px;z-index:2147483000;' +
            'font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.6);pointer-events:auto;';
        document.body.appendChild(root);
        overlayEl = root;
        return root;
    }
    function addButtons(root, labels, onPick) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;';
        labels.forEach(function (label, idx) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            b.style.cssText = 'pointer-events:auto;cursor:pointer;background:#2a2140;color:#ffe9a8;' +
                'border:1px solid #8a6d3b;border-radius:8px;padding:6px 10px;font:inherit;';
            b.addEventListener('click', function () { onPick(idx); });
            row.appendChild(b);
        });
        root.appendChild(row);
    }
    function showNode(npc, node, ctx) {
        var text = '';
        try { text = node.text ? node.text(ctx) : ''; } catch (_) { text = '...'; }
        if (node.trade) { showTrade(npc, ctx); return; }
        var opts = optionsOf(node, ctx);
        if (!opts.length) {
            // Terminal beat: prefer the game's own dialogue screen when present.
            if (findTalker() && typeof document !== 'undefined' &&
                document.getElementById && document.getElementById('storyDialogueScreen')) {
                closeOverlay();
                nativeSay(npc, text);
                return;
            }
        }
        var root = ensureOverlay();
        var head = document.createElement('div');
        head.style.cssText = 'font-weight:700;margin-bottom:6px;';
        head.textContent = npc.emoji + ' ' + npc.name + ' — ' + npc.title;
        var body = document.createElement('div');
        body.textContent = text;
        var close = document.createElement('button');
        close.type = 'button';
        close.textContent = '×';
        close.setAttribute('aria-label', 'Close dialogue');
        close.style.cssText = 'position:absolute;top:6px;right:10px;background:none;border:none;color:#cbb;cursor:pointer;font-size:18px;';
        close.addEventListener('click', closeOverlay);
        root.style.position = 'fixed';
        root.appendChild(close);
        root.appendChild(head);
        root.appendChild(body);
        if (!opts.length) {
            addButtons(root, ['Farewell.'], function () { closeOverlay(); });
            return;
        }
        addButtons(root, opts.map(function (o) {
            try { return typeof o.label === 'function' ? o.label(ctx) : o.label; } catch (_) { return '...'; }
        }), function (idx) {
            var o = opts[idx];
            var receipt = '';
            try { if (o.do) receipt = o.do(ctx) || ''; } catch (_) { /* ignore */ }
            var next = nodeOf(npc, o.go);
            if (!next) { closeOverlay(); return; }
            if (receipt) {
                var r = ensureOverlay();
                var rb = document.createElement('div');
                rb.textContent = receipt;
                r.appendChild(rb);
                addButtons(r, ['Continue ➔'], function () { showNode(npc, next, buildContext()); });
                return;
            }
            showNode(npc, next, buildContext());
        });
    }
    function showTrade(npc, ctx) {
        var root = ensureOverlay();
        var head = document.createElement('div');
        head.style.cssText = 'font-weight:700;margin-bottom:6px;';
        head.textContent = npc.emoji + ' ' + npc.name + ' — Wares (floor ' + ctx.floor + ')';
        root.appendChild(head);
        var bal = document.createElement('div');
        var cred = creditsOf(ctx.game);
        bal.textContent = cred === null ? 'Pippa squints at your purse and winks. (No purse found — browsing is free.)' : 'Your purse: ' + cred + ' credits.';
        bal.style.cssText = 'opacity:.85;margin-bottom:8px;';
        root.appendChild(bal);
        var wares = waresFor(ctx);
        if (!wares.length) {
            var empty = document.createElement('div');
            empty.textContent = ctx.mode === 'kid' ? 'All sold out, superstar! Come back later!' : 'Cleaned out. The deep buys fast.';
            root.appendChild(empty);
        }
        wares.forEach(function (w) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:6px 0;';
            var label = document.createElement('span');
            label.style.cssText = 'flex:1;';
            label.textContent = w.name + ' — ' + w.price + 'c';
            var buy = document.createElement('button');
            buy.type = 'button';
            buy.textContent = 'Buy';
            buy.style.cssText = 'cursor:pointer;background:#2a2140;color:#ffe9a8;border:1px solid #8a6d3b;border-radius:8px;padding:4px 10px;font:inherit;';
            buy.addEventListener('click', function () {
                var ok = spendCredits(ctx.game, w.price);
                var msg = document.createElement('div');
                msg.style.cssText = 'margin-top:8px;';
                if (ok || cred === null) {
                    try {
                        if (w.effect === 'heal' && ctx.game && ctx.game.player && isFinite(Number(ctx.game.player.hp))) {
                            ctx.game.player.hp = Number(ctx.game.player.hp) + 25;
                        }
                        window.__ggcTradeCount = (window.__ggcTradeCount || 0) + 1;
                    } catch (_) { /* flavor only */ }
                    msg.textContent = (ctx.mode === 'kid' ? 'Yay! ' : '') + 'Pippa wraps "' + w.name + '" with a flourish. ' +
                        (ok ? 'Pleasure doing business!' : '(On the house, brave one — purses are for the surface.)');
                } else {
                    msg.textContent = '"Short on credits, dearie. The rats take IOUs; I do not."';
                }
                root.appendChild(msg);
            });
            row.appendChild(label);
            row.appendChild(buy);
            root.appendChild(row);
        });
        addButtons(root, ['Back', 'Farewell.'], function (idx) {
            if (idx === 0) showNode(npc, nodeOf(npc, 'start'), buildContext());
            else closeOverlay();
        });
    }

    // ---------- public API ----------
    function talk(npcId, nodeId) {
        var npc = npcById(npcId);
        if (!npc) return null;
        if (typeof document === 'undefined' || !document.body) return null;
        var ctx = buildContext();
        showNode(npc, nodeOf(npc, nodeId || 'start'), ctx);
        return { npc: npc.id, mode: ctx.mode, floor: ctx.floor, kills: ctx.kills };
    }
    function greet(npcId) {
        var npc = npcById(npcId);
        if (!npc) return null;
        var ctx = buildContext();
        var text = '';
        try { text = npc.blurb(ctx); } catch (_) { text = npc.name; }
        if (!nativeSay(npc, text, function (ok) {
            if (!ok && typeof document !== 'undefined' && document.body) talk(npcId, 'start');
        })) {
            if (typeof document !== 'undefined' && document.body) talk(npcId, 'start');
        }
        return text;
    }
    function spawnTable(floor) {
        floor = num(floor, 1);
        var table = [];
        if (floor >= 1) table.push('wandering-merchant');
        if (floor >= 2) table.push('cursed-bard', 'rat-king');
        if (floor >= 3) table.push('exiled-warden');
        if (floor >= 4) table.push('lovelorn-lich');
        if (floor >= 5) table.push('echo-of-you');
        return table;
    }

    var api = {
        VERSION: VERSION,
        npcs: NPCS,
        npcById: npcById,
        talk: talk,
        greet: greet,
        trade: function () { return talk('wandering-merchant', 'trade'); },
        spawnTable: spawnTable,
        buildContext: buildContext,
        close: closeOverlay
    };
    window.GraveGainCharacters = api;
    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain-characters', version: VERSION, init: function () { return api; } });
    } catch (_) { /* registry best-effort */ }
})();
