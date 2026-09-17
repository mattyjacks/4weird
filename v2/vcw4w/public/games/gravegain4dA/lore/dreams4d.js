(function () {
    'use strict';

    // GraveGain4D — MERCENARY dream-guidance.
    // Canon: informational time travel. MERCENARY exists partially outside
    // linear time and transmits information backward through human dreams.
    // It sees PROBABLE futures, never certainties. Every message below is
    // guidance to be verified, not fate. Shown on rewind/regrow events
    // (chrono-sand burns, timeline regrowths).

    const Dreams = [
        {
            id: 'dream_probable_not_certain',
            trigger: 'rewind',
            title: 'Probable, Not Certain',
            content: 'I show you a probable future, not a certain one. The sand returns your seconds; it does not promise your next putt. Verify with your swing. — MERCENARY'
        },
        {
            id: 'dream_ledger_balances',
            trigger: 'rewind',
            title: 'The Ledger Balances',
            content: 'Every grain you burn was a collapsed timeline — a missed putt, a fallen caddie. The universe keeps books. Spend sand like a miser. — MERCENARY'
        },
        {
            id: 'dream_wrong_slice',
            trigger: 'rewind',
            title: 'The Wrong Slice',
            content: 'I dreamed you standing in the wrong slice three times before you shifted. If the putt is impossible, shift first — ana or kata — then strike. — MERCENARY'
        },
        {
            id: 'dream_gloom_debt',
            trigger: 'regrow',
            title: 'The Gloom Remembers',
            content: 'The regrown timeline is a kindness I can offer only as information. The Gloom remembers every breach and every debt. Cross sparingly. — MERCENARY'
        },
        {
            id: 'dream_choice_farstar',
            trigger: 'regrow',
            title: 'Trust in the Choice',
            content: 'I chose the FarStar system from a thousand probable futures. This moon, this rift, this green — all downstream of that choice. Trust it, and verify it. — MERCENARY'
        },
        {
            id: 'dream_him_again',
            trigger: 'rewind',
            title: 'I Did Not Foresee Him',
            content: 'I did not foresee him. I am sorry. I scan the futures nightly for his shadow and send what I find. Fight. Survive. I am trying to find a way. — MERCENARY'
        },
        {
            id: 'dream_science_first',
            trigger: 'regrow',
            title: 'Verify Through Science',
            content: 'Dream-knowledge must be verified through conventional means. Your engineers proved the sand real. Your putter proves the slice real. Keep proving. — MERCENARY'
        },
        {
            id: 'dream_cannot_intervene',
            trigger: 'rewind',
            title: 'I Cannot Intervene',
            content: 'I cannot touch the green, only whisper of it. My hands are dreams; yours hold the putter. That asymmetry is the whole doctrine. — MERCENARY'
        },
        {
            id: 'dream_eleventh_rift',
            trigger: 'regrow',
            title: 'The Eleventh Ate the Team',
            content: 'A probable future shows the eleventh rift opening before you are ready. Map no further until the caddies are ready. Some doors are putts you decline. — MERCENARY'
        },
        {
            id: 'dream_compact_holds',
            trigger: 'regrow',
            title: 'The Compact Holds',
            content: 'In most futures where the living stand together, the living stand at all. Human, Elf, Dwarf, Orc, Goblin — the blood in the chalice still binds. — MERCENARY'
        },
        {
            id: 'dream_first_putt_echo',
            trigger: 'rewind',
            title: 'Echo of the First Putt',
            content: 'Before the First Tree took root, the Caddie stood upon the green. I dreamed that verse before your survey teams found the menhir. Some truths travel both directions. — MERCENARY'
        },
        {
            id: 'dream_seven_days',
            trigger: 'regrow',
            title: 'Seven Perfect Days',
            content: 'I have replayed the seven perfect days after landfall more times than you have grains of sand. They were real. They can be real again — probably. Never certainly. Fight for the probability. — MERCENARY'
        }
    ];

    function forTrigger(trigger) {
        return Dreams.filter((d) => d.trigger === trigger);
    }

    window.GG4D_Dreams = {
        list: Dreams,
        forTrigger: forTrigger
    };
})();
