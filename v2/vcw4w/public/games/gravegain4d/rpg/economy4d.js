(function () {
    'use strict';

    // GraveGain4D economy — three currencies:
    //   gold coins    — native dungeon trade (loot, vendors, quarters-style buys)
    //   KillCredits   — equipment requisition scrip earned from kills/bosses
    //   $UUSD         — hub currency, convertible at fixed exchange rates

    const Currency = {
        GOLD: 'gold',
        KILL_CREDITS: 'killCredits',
        UUSD: 'uusd'
    };

    const ExchangeRates = {
        // Native trade: gold <-> KillCredits (armory requisition counter).
        goldToKillCredits: 50,   // 50 gold buys 1 KillCredit
        killCreditsToGold: 40,   // 1 KillCredit sells back for 40 gold (spread)
        // Hub exchange: $UUSD bridge.
        goldToUusd: 200,         // 200 gold buys 1 $UUSD
        uusdToGold: 180,         // 1 $UUSD sells for 180 gold (spread)
        killCreditsToUusd: 4,    // 4 KillCredits buy 1 $UUSD
        uusdToKillCredits: 3     // 1 $UUSD sells for 3 KillCredits (spread)
    };

    const KillCreditRewards = {
        kill: 1,
        elite: 3,
        boss: 10,
        wAnomaly: 2
    };

    function createWallet() {
        return { gold: 0, killCredits: 0, uusd: 0 };
    }

    function convert(wallet, from, to, amount) {
        const valid = { gold: 1, killCredits: 1, uusd: 1 };
        // Resolve canonical rate keys (e.g. gold->killCredits = 'goldToKillCredits').
        const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
        const rate = ExchangeRates[from + 'To' + cap(to)];
        if (!rate || !valid[from] || !valid[to]) {
            return { ok: false, reason: 'unsupported-pair' };
        }
        if (wallet[from] < amount) return { ok: false, reason: 'insufficient-funds' };
        const out = Math.floor(amount / rate);
        if (out < 1) return { ok: false, reason: 'amount-below-rate' };
        wallet[from] -= out * rate;
        wallet[to] += out;
        return { ok: true, spent: out * rate, received: out };
    }

    window.GG4D_Economy = {
        Currency,
        ExchangeRates,
        KillCreditRewards,
        createWallet,
        convert
    };
})();
