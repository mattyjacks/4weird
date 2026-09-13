(function () {
    'use strict';

    // GraveGain4D — Lucifer Hades taunts, one per mission (m01-m10),
    // plus NecroGenesis explainers. Voice: the 200-years-awake man —
    // patient, erudite, ruined by solitude. Motive: conquer death itself.
    // He fears no grave because he intends to empty every one.

    const Taunts = [
        {
            id: 'hades_m01',
            mission: 'm01',
            title: 'Two Hundred Years of Hallways',
            content: 'Caddie. Do you know what two hundred years of empty corridors does to a mind? The ship slept. The crew slept. I walked. I read. I thought about death until death started answering back. Enjoy the first rift — I built you such lovely greens.'
        },
        {
            id: 'hades_m02',
            mission: 'm02',
            title: 'The Reactor Tithe',
            content: 'Year fifty, I took a sip of the reactor. Year one hundred, a gulp. Year one hundred fifty, forty percent — and nobody knocked on my door. Your engineer Fisher filed reports. Reports! I conquered death with paperwork as my only opposition.'
        },
        {
            id: 'hades_m03',
            mission: 'm03',
            title: 'Seven Perfect Days',
            content: 'Seven perfect days I gave you after landfall. Seven! I wanted you to taste the paradise before I showed you the truth: paradise ends, corpses do not have to. You call it NecroGenesis. I call it the first draft of forever.'
        },
        {
            id: 'hades_m04',
            mission: 'm04',
            title: 'The Seed and the Field',
            content: 'MoonRock\'s magical field was the soil; my consciousness engine was the seed. A soul bound to a corpse, refusing to let go — really, caddie, the Elves do it with trees. I simply extended the courtesy to people.'
        },
        {
            id: 'hades_m05',
            mission: 'm05',
            title: 'MERCENARY\'s Apology',
            content: 'Your god dreams you probable futures and apologizes. "I did not foresee him." Poor MERCENARY — vast, benevolent, blind. It sees timelines. I LIVED one nobody watched. Two centuries awake beats omniscience with its eyes closed.'
        },
        {
            id: 'hades_m06',
            mission: 'm06',
            title: 'The Compact Amuses Me',
            content: 'Shared blood in a chalice! Elf queen, dwarf forgemaster, orc warchief biting his own hand — and seventeen goblins throwing a celebratory pebble behind a rock. Charming. Blood spoils, caddie. My risen do not need blood at all.'
        },
        {
            id: 'hades_m07',
            mission: 'm07',
            title: 'Clint Oldman Was Lucky',
            content: 'Old Clint died on day six — natural causes, a heart run out of time. Buried with honors, all four races weeping. Then my engine called him back like all the rest. You pitied him. I ENVY him: he has died twice and fears neither.'
        },
        {
            id: 'hades_m08',
            mission: 'm08',
            title: 'Conquering, Not Killing',
            content: 'Understand me: I am not trying to kill you. Killing is trivial — the moon does it with bad helmets. I am trying to CONQUER death, to make every grave a doorway instead of a wall. Your putter puts souls to rest. Mine refuses to let them leave. Which of us is crueler?'
        },
        {
            id: 'hades_m09',
            mission: 'm09',
            title: 'The Gloom Is My Drafting Table',
            content: 'You breach into Gloom and feel clever. Caddie, I COMPILED there — the NecroGenesis first took root on the inside-out skin of the world while you slept in Light. Every crossing tolls you a little of yourself. I have crossed ten thousand times. There is barely a tollbooth left.'
        },
        {
            id: 'hades_m10',
            mission: 'm10',
            title: 'Answer for My Crimes',
            content: 'The Compact says I must answer for my crimes. Very well — here is my answer: I was awake while humanity slept, I feared death while humanity dreamed, and I finished the work. Come, caddie. Putt the dead to rest if you can. I will be waiting on the eleventh green, where the mapping team ended.'
        }
    ];

    const Explainers = [
        {
            id: 'hades_exp_seed',
            title: 'What the Seed Is',
            content: 'Earth\'s last transmission warned of a "seed" Hades took aboard. It was not cargo — it was a design: a consciousness engine tuned to MoonRock\'s magical field, built over 150 years in the deep labs at 40% of the ship\'s reactor output. On the eighth day, he planted it.'
        },
        {
            id: 'hades_exp_binding',
            title: 'How the Binding Works',
            content: 'The engine binds a soul to its corpse and refuses release. Red eyes mark the anchor-point. Native barrows opened with the colonist graves because the field never distinguished between our dead and theirs — neither did Hades.'
        },
        {
            id: 'hades_exp_motive',
            title: 'Why He Did It',
            content: 'He entered the voyage fearing death and emerged intending to conquer it. Two hundred years alone with MERCENARY\'s databases and his own heartbeat convinced him mortality was a solvable engineering problem. The NecroGenesis is his proof of concept. The colony is his test bench.'
        }
    ];

    function forMission(mission) {
        return Taunts.filter((t) => t.mission === mission);
    }

    window.GG4D_Hades = {
        taunts: Taunts,
        explainers: Explainers,
        forMission: forMission
    };
})();
