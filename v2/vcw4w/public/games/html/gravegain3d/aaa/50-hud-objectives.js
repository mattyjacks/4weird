/* GraveGain3D AAA — 50 objectives.
   A persistent quest card (top-right): story contract as a live checklist
   with per-objective counts (x/y) + completion checkmarks, secondary
   objective support, and a mission-complete fanfare state; warden bounty
   with live HP, or the descent directive with nearby-hostile count.
   Flashes on change. Hides itself outside of active runs.
   Null currentMission (endless mode) falls through to boss/descend. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    function esc(s) {
        return String(s === undefined || s === null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    AAA.ready((game) => {
        const c = AAA.container();
        if (!c) return;

        const card = AAA.mk('aaaObjective', 'aaa-objective', c);
        card.innerHTML = '<div class="aaa-obj-title"></div><div class="aaa-obj-body"></div>';
        const titleEl = card.querySelector('.aaa-obj-title');
        const bodyEl = card.querySelector('.aaa-obj-body');

        let lastText = '';
        let acc = 0;
        let fanfarePlayed = false;

        function bossHp(boss) {
            if (typeof boss.hp === 'number' && typeof boss.maxHp === 'number' && boss.maxHp > 0) {
                return ` · ${Math.max(0, Math.round((boss.hp / boss.maxHp) * 100))}%`;
            }
            return '';
        }

        function objRow(o, isSecondary) {
            const desc = o ? (o.desc || o.text || o.id || 'Objective') : 'Objective';
            const count = (o && o.count !== undefined && o.count !== null) ? Number(o.count) : null;
            const cur = (o && o.current !== undefined && o.current !== null) ? Number(o.current) : 0;
            const done = count !== null ? cur >= count : !!o.done;
            const mark = done ? '✔' : '○';
            const cls = `aaa-obj-row${done ? ' done' : ''}${isSecondary ? ' secondary' : ''}`;
            const tally = count !== null ? ` <span class="aaa-obj-count">${cur}/${count}</span>` : '';
            return `<div class="${cls}"><span class="aaa-obj-mark">${mark}</span><span>${esc(desc)}${tally}</span></div>`;
        }

        function missionHtml(m) {
            // Graceful: objectives missing/empty → single contract line.
            const objs = Array.isArray(m.objectives) ? m.objectives.filter(Boolean) : [];
            if (!objs.length) {
                const what = 'Complete the objective';
                return { title: '◈ CONTRACT', html: `<div class="aaa-obj-row"><span class="aaa-obj-mark">○</span><span>${esc(what)}</span></div>` };
            }
            const rows = objs.map((o, i) => objRow(o, i > 0)).join('');
            return { title: `◈ CONTRACT — ${m.title || 'Story Mission'}`, html: rows };
        }

        function describe() {
            // Story contract takes priority when a campaign mission is active.
            // Null currentMission (endless mode) → boss/descend fallbacks below.
            const m = game.currentMission || null;
            if (m) {
                const completed = !!m.completed;
                if (completed && !fanfarePlayed) {
                    fanfarePlayed = true;
                    try {
                        if (typeof AAA.announce === 'function') AAA.announce('MISSION COMPLETE', '★ contract fulfilled ★');
                        AAA.sfx(game, 'levelup');
                    } catch (_) { /* garnish */ }
                } else if (!completed) {
                    fanfarePlayed = false;
                }
                const d = missionHtml(m);
                const title = completed ? '★ MISSION COMPLETE' : d.title;
                return { title, html: d.html, complete: completed };
            }
            fanfarePlayed = false;
            if (game.activeBoss) {
                const dom = document.getElementById('bossName');
                const name = (dom && dom.textContent.trim()) || 'THE WARDEN';
                return { title: '☠ SLAY THE WARDEN', html: esc(`${name}${bossHp(game.activeBoss)}`), complete: false };
            }
            const hostiles = (game.enemies || []).filter((e) => e.hp === undefined || e.hp > 0).length;
            return {
                title: '⬇ DESCEND',
                html: esc(`Find the portal · Layer ${game.floorIndex || 1} · ${hostiles} hostile${hostiles === 1 ? '' : 's'}`),
                complete: false
            };
        }

        AAA.onTick((dt, game) => {
            acc += dt;
            if (acc < 0.3) return;
            acc = 0;

            const mainEl = document.getElementById('gameMain');
            const inRun = game.player && !game.player.isDead &&
                mainEl && !mainEl.classList.contains('hidden');
            card.style.display = inRun ? '' : 'none';
            if (!inRun) return;

            const d = describe();
            const key = `${d.title}|${d.html}|${d.complete ? 1 : 0}`;
            if (key !== lastText) {
                lastText = key;
                titleEl.textContent = d.title;
                bodyEl.innerHTML = d.html;
                card.classList.toggle('complete', !!d.complete);
                card.classList.remove('flash');
                void card.offsetWidth;
                card.classList.add('flash');
            }
        });

        // New run (any mode) resets the fanfare latch + cached text.
        AAA.wrap(game, 'initRun', (orig, ...args) => {
            fanfarePlayed = false;
            lastText = '';
            card.classList.remove('complete');
            return orig(...args);
        });
    });
})();
