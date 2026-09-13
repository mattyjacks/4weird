/* GraveGain4D M01 - Rift Breach at the LZ. W-slice 0, prime-descent. */
(function () {
    'use strict';
    try {
        if (!window.GG4D_Campaign) return;
        window.GG4D_Campaign.register({
            id: 1,
            title: 'M01 - Rift Breach at the LZ',
            subtitle: 'The W-Rift Opens Over MoonRock',
            wSlice: 0, timeFork: 'prime-descent',
            location: 'Colony LZ Sector Alpha',
            par: 360, parSeconds: 360,
            difficulty: { hpMult: 1.0, dmgMult: 1.0, density: 0.7, eliteChance: 0.02 },
            objectives: [
                { id: 'slay_all', desc: 'Put all 15 crash-site risen back to rest', count: 15 },
                { id: 'seal_echo', desc: 'Hold the XW fold: collapse the echo landing', count: 1 }
            ],
            spawns: [
                { id: 'grave-gardener', count: 5, wave: 1 },
                { id: 'memorial-warden', count: 3, wave: 1 },
                { id: 'pulse-skull', count: 4, wave: 2 },
                { id: 'fog-lurker', count: 3, wave: 2 }
            ],
            boss: { id: 'boss-goblin-zed-leader-4d', name: 'GOBLIN ZED LEADER (RIFT-TORN)', hpMult: 0.9 },
            bossId: 'boss-goblin-zed-leader-4d',
            intro: [
                { speaker: 'Valley Net', text: 'Dropship 420 is down in Sector Alpha. Fifteen risen converging - and a W-rift tearing open above the crater field.', portrait: '👱🏻‍♀️' },
                { speaker: 'Private Lisa Park', text: 'James Wright walked at my side three days ago. Now his visor glows red. We put our people back to rest.', portrait: '👩‍🚀' },
                { speaker: 'MERCENARY', text: 'Dream-guidance, soldier: the dead walk in two slices now. Aim where the echo overlaps the flesh.', portrait: '🌙' }
            ],
            outro: [
                { speaker: 'Valley Net', text: 'LZ secured. Rift residue rising - Lucifer tore the W-rift fleeing death, and it is widening.', portrait: '👱🏻‍♀️' },
                { speaker: 'Private Lisa Park', text: 'Rest now, James. We descend after Hades - down every w-slice.', portrait: '👩‍🚀' }
            ],
            dialogueBefore: [
                { speaker: 'Valley Net', text: 'Dropship 420 is down in Sector Alpha. Fifteen risen converging - and a W-rift tearing open above the crater field.', portrait: '👱🏻‍♀️' }
            ],
            dialogueAfter: [
                { speaker: 'Valley Net', text: 'LZ secured. Rift residue rising - Lucifer tore the W-rift fleeing death, and it is widening.', portrait: '👱🏻‍♀️' }
            ],
            rewards: { killCredits: 200, gold: 200, uusd: 500, unlock: 'luckystarship-hub' }
        });
    } catch (_) { /* never throw */ }
})();
