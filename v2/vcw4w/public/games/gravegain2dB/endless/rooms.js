/* GraveGain2dB Endless - rooms (8 authored templates, sectors 1-8).
   Every room: entry/exit sockets, objective + anchor, protected floor,
   destructible layer, supports, spawns, civilian/pickup anchors, nav zones,
   palette, safe route, Valley Net breach location.
   Global surface: window.GraveGain2dBEndlessRegistry only. */
(function () {
    'use strict';

    function registry() {
        try {
            if (typeof window !== 'undefined' && window.GraveGain2dBEndlessRegistry) return window.GraveGain2dBEndlessRegistry;
            if (typeof globalThis !== 'undefined' && globalThis.GraveGain2dBEndlessRegistry) return globalThis.GraveGain2dBEndlessRegistry;
        } catch (_) {}
        return null;
    }

    var ROOMS = [
        {
            id: 'room-s1-crater-row', sector: 1, name: 'Crater Row',
            entry: { edge: 'west', x: 20, y: 150 }, exit: { edge: 'east', x: 780, y: 150 },
            objective: { desc: 'Clear 6 crawlers, then tag the exit beacon.' },
            objectiveAnchor: { x: 400, y: 150 },
            protectedFloor: { desc: 'Beacon pad + entry muster are protected (no collapse).' },
            destructibleLayer: [{ id: 'rim-rocks', desc: 'Crater rim rocks - drop for cover or kills.' }],
            supports: [{ id: 'rim-arch', holds: 'north rim overlook', state: 'stable' }],
            spawns: [{ id: 'spawn-west', x: 120, y: 150, enemies: ['crawler'] }, { id: 'spawn-mid', x: 420, y: 160, enemies: ['crawler'] }],
            anchors: { civilian: { x: 90, y: 220, desc: 'Cowering runner at muster.' }, pickup: { x: 400, y: 220, desc: 'Ammo cache mid-field.' } },
            navZones: [{ id: 'main-lane', desc: 'West-east lane, always walkable.' }],
            palette: 'dust-amber',
            safeRoute: { desc: 'Muster -> mid cover -> beacon.', waypoints: [{ x: 20, y: 150 }, { x: 400, y: 150 }, { x: 780, y: 150 }] },
            breachLocation: { x: 400, y: 280, desc: 'Valley Net breach opens a rim ramp if the lane seals.' }
        },
        {
            id: 'room-s2-root-span', sector: 2, name: 'Root Span',
            entry: { edge: 'west', x: 20, y: 160 }, exit: { edge: 'east', x: 780, y: 140 },
            objective: { desc: 'Hold the living bridge 30s, then cross.' },
            objectiveAnchor: { x: 400, y: 160 },
            protectedFloor: { desc: 'Entry camp + exit ledge protected; bridge deck is live.' },
            destructibleLayer: [{ id: 'dead-limbs', desc: 'Dead limbs drop onto the sinkhole patrol.' }],
            supports: [{ id: 'anchor-tree-n', holds: 'living bridge', state: 'stable' }],
            spawns: [{ id: 'spawn-sink', x: 400, y: 240, enemies: ['thorn-crawler', 'spore-bat'] }],
            anchors: { civilian: { x: 80, y: 220, desc: 'Scout tangled at entry.' }, pickup: { x: 640, y: 140, desc: 'Sap cache at exit ledge.' } },
            navZones: [{ id: 'bridge-deck', desc: 'Bridge deck, collapses if anchor-tree falls.' }, { id: 'rim-path', desc: 'Rim path, always walkable.' }],
            palette: 'grove-green',
            safeRoute: { desc: 'Camp -> bridge -> ledge.', waypoints: [{ x: 20, y: 160 }, { x: 400, y: 160 }, { x: 780, y: 140 }] },
            breachLocation: { x: 400, y: 300, desc: 'Breach fells a rim tree into a ramp.' }
        },
        {
            id: 'room-s3-chute-drop', sector: 3, name: 'Chute Drop (boss sector)',
            entry: { edge: 'north', x: 400, y: 20 }, exit: { edge: 'south', x: 400, y: 300 },
            objective: { desc: 'Ride the chute, then survive the boss: PIT FOREMAN.' },
            objectiveAnchor: { x: 400, y: 200 },
            protectedFloor: { desc: 'Chute rails + boss door floor protected.' },
            destructibleLayer: [{ id: 'ore-plug', desc: 'Ore plug blasts open the fast chute.' }],
            supports: [{ id: 'gantry-frame', holds: 'upper gantry', state: 'stable' }, { id: 'boss-gate', holds: 'boss door lintel', state: 'stable' }],
            spawns: [{ id: 'spawn-upper', x: 400, y: 100, enemies: ['risen-miner'] }, { id: 'spawn-boss', x: 400, y: 220, enemies: ['pit-foreman'] }],
            anchors: { civilian: { x: 200, y: 80, desc: 'Pinned crew under spill.' }, pickup: { x: 560, y: 200, desc: 'Ore cache by boss door.' } },
            navZones: [{ id: 'chute-lane', desc: 'Vertical chute lane.' }, { id: 'boss-ring', desc: 'Boss ring, sealed during fight.' }],
            palette: 'shaft-ochre',
            safeRoute: { desc: 'Top -> chute -> boss ring -> south door.', waypoints: [{ x: 400, y: 20 }, { x: 400, y: 200 }, { x: 400, y: 300 }] },
            breachLocation: { x: 200, y: 280, desc: 'Breach opens the service ladder if the chute jams.' }
        },
        {
            id: 'room-s4-fuel-ramp', sector: 4, name: 'Fuel Ramp',
            entry: { edge: 'west', x: 20, y: 180 }, exit: { edge: 'east', x: 780, y: 120 },
            objective: { desc: 'Vent 3 bladders in order, then push the depot door.' },
            objectiveAnchor: { x: 480, y: 150 },
            protectedFloor: { desc: 'Entry trench + exit stair protected from fire.' },
            destructibleLayer: [{ id: 'bladder-row', desc: 'Fuel bladders vent into burn lanes.' }, { id: 'upper-trestle', desc: 'Trestle drops onto the depot patrol.' }],
            supports: [{ id: 'ramp-trestles', holds: 'upper ramp', state: 'stable' }],
            spawns: [{ id: 'spawn-ramp', x: 340, y: 170, enemies: ['ash-runner', 'risen-trooper'] }],
            anchors: { civilian: { x: 120, y: 230, desc: 'Depot crew in trench.' }, pickup: { x: 620, y: 120, desc: 'Sealed cells at exit stair.' } },
            navZones: [{ id: 'burn-lane', desc: 'Burn lane, lethal while vented.' }, { id: 'high-side', desc: 'High side path, always safe.' }],
            palette: 'ember-rust',
            safeRoute: { desc: 'Trench -> high side -> stair.', waypoints: [{ x: 20, y: 180 }, { x: 400, y: 140 }, { x: 780, y: 120 }] },
            breachLocation: { x: 480, y: 280, desc: 'Breach douses one burn lane with retardant.' }
        },
        {
            id: 'room-s5-bell-causeway', sector: 5, name: 'Bell Causeway',
            entry: { edge: 'west', x: 20, y: 160 }, exit: { edge: 'east', x: 780, y: 160 },
            objective: { desc: 'Ring 3 bells in order to raise the causeway.' },
            objectiveAnchor: { x: 400, y: 160 },
            protectedFloor: { desc: 'Jetty entry + far jetty protected; causeway tiles are live.' },
            destructibleLayer: [{ id: 'bell-frame-w', desc: 'West frame collapses into a dry ramp (precision skip).' }],
            supports: [{ id: 'bell-frame-e', holds: 'east causeway span', state: 'stable' }],
            spawns: [{ id: 'spawn-shallows', x: 400, y: 220, enemies: ['drowner', 'mire-crab'] }],
            anchors: { civilian: { x: 500, y: 230, desc: 'Stranded pair on sandbar.' }, pickup: { x: 240, y: 160, desc: 'Wreck bell by second buoy.' } },
            navZones: [{ id: 'causeway', desc: 'Causeway tiles, sink if bells mis-ordered.' }, { id: 'pontoon', desc: 'Breach pontoon lane, emergency only.' }],
            palette: 'flood-teal',
            safeRoute: { desc: 'Jetty -> buoys west/mid/east -> far jetty.', waypoints: [{ x: 20, y: 160 }, { x: 400, y: 160 }, { x: 780, y: 160 }] },
            breachLocation: { x: 400, y: 280, desc: 'Breach floats a pontoon if the causeway drops.' }
        },
        {
            id: 'room-s6-vent-gallery', sector: 6, name: 'Vent Gallery (elite director)',
            entry: { edge: 'west', x: 20, y: 150 }, exit: { edge: 'east', x: 780, y: 150 },
            objective: { desc: 'Cycle 2 vents while the elite director rotates affixes.' },
            objectiveAnchor: { x: 400, y: 150 },
            protectedFloor: { desc: 'Entry stair + exit crypt protected; gallery lanes are live.' },
            destructibleLayer: [{ id: 'tank-row-a', desc: 'Sealed tanks vent gas lanes (dangerous cover).' }],
            supports: [{ id: 'vent-trunk', holds: 'gallery ceiling - breaking it buries the lane', state: 'stable' }],
            spawns: [{ id: 'spawn-gallery', x: 400, y: 150, enemies: ['risen-acolyte', 'tank-abomination', 'elite-director-pick'] }],
            anchors: { civilian: { x: 100, y: 220, desc: 'Lost novitiate at stair.' }, pickup: { x: 660, y: 150, desc: 'Reliquary at exit crypt.' } },
            navZones: [{ id: 'vent-lane-a', desc: 'Lane A, clear while vent runs.' }, { id: 'vent-lane-b', desc: 'Lane B, clear while vent runs.' }],
            palette: 'crypt-violet',
            safeRoute: { desc: 'Stair -> lane A -> lane B -> crypt.', waypoints: [{ x: 20, y: 150 }, { x: 400, y: 150 }, { x: 780, y: 150 }] },
            breachLocation: { x: 400, y: 280, desc: 'Breach cracks the service vent if the gallery seals.' }
        },
        {
            id: 'room-s7-dais-approach', sector: 7, name: 'Dais Approach (boss sector)',
            entry: { edge: 'west', x: 20, y: 150 }, exit: { edge: 'east', x: 780, y: 150 },
            objective: { desc: 'Align 2 pylons between volleys, then face the boss: MIRROR SPOTTER.' },
            objectiveAnchor: { x: 420, y: 150 },
            protectedFloor: { desc: 'Dome shadow + dais floor protected from bombardment.' },
            destructibleLayer: [{ id: 'relay-mast', desc: 'Dead mast topples onto the bombardier nest.' }],
            supports: [{ id: 'pylon-pair', holds: 'mirror focus - both must stand', state: 'stable' }, { id: 'dais-arch', holds: 'boss dais roof', state: 'stable' }],
            spawns: [{ id: 'spawn-field', x: 330, y: 160, enemies: ['bombardier', 'star-tick'] }, { id: 'spawn-boss', x: 560, y: 150, enemies: ['mirror-spotter'] }],
            anchors: { civilian: { x: 300, y: 230, desc: 'Pinned observer in field.' }, pickup: { x: 120, y: 150, desc: 'Star charts under dome.' } },
            navZones: [{ id: 'shadow', desc: 'Dome shadow, safe during volleys.' }, { id: 'boss-ring', desc: 'Dais ring, sealed during fight.' }],
            palette: 'star-indigo',
            safeRoute: { desc: 'Dome -> pylons -> dais -> funicular east.', waypoints: [{ x: 20, y: 150 }, { x: 420, y: 150 }, { x: 780, y: 150 }] },
            breachLocation: { x: 420, y: 290, desc: 'Breach holds one extra shadow window.' }
        },
        {
            id: 'room-s8-collapse-run', sector: 8, name: 'Collapse Run (8+ loop seed)',
            entry: { edge: 'west', x: 20, y: 150 }, exit: { edge: 'east', x: 780, y: 130 },
            objective: { desc: 'Crack armor supports in floor order, then outrun the collapse.' },
            objectiveAnchor: { x: 440, y: 150 },
            protectedFloor: { desc: 'Entry antechamber + lift pad protected; ring floor collapses on timer.' },
            destructibleLayer: [{ id: 'armor-supports', desc: 'Armor supports crack in etched order.' }, { id: 'side-arch', desc: 'Side arch precision drop skips one guard wave.' }],
            supports: [{ id: 'armor-ring', holds: 'core vault roof - ordered crack only', state: 'stable' }],
            spawns: [{ id: 'spawn-ring', x: 440, y: 150, enemies: ['sanctum-guard', 'ash-wraith'] }],
            anchors: { civilian: { x: 380, y: 230, desc: 'Last survivor in ring.' }, pickup: { x: 600, y: 150, desc: 'Genesis shard by vault.' } },
            navZones: [{ id: 'ring', desc: 'Ring floor, collapses behind the run.' }, { id: 'lift-lane', desc: 'Lift lane, always walkable.' }],
            palette: 'core-crimson',
            safeRoute: { desc: 'Antechamber -> ring order -> lift.', waypoints: [{ x: 20, y: 150 }, { x: 440, y: 150 }, { x: 780, y: 130 }] },
            breachLocation: { x: 440, y: 290, desc: 'Breach holds the lift 10s extra.' }
        }
    ];

    try {
        var reg = registry();
        if (!reg) return;
        for (var i = 0; i < ROOMS.length; i++) {
            try { reg.register(ROOMS[i]); } catch (_) { /* keep going */ }
        }
    } catch (_) { /* never throw */ }
})();
