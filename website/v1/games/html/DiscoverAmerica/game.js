/* =====================================================================
   Madi AI: Discover America
   A Carmen-Sandiego-style data-organizing voyage across the Atlantic,
   played on a Donkey-Kong-style world map of connected ports.
   Pure HTML5 Canvas + DOM. No dependencies.
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   STAGE DATA
   Each stage is a node on the voyage map. Map positions are normalized
   (0..1) so the route scales to any canvas size. The route runs from the
   English Channel (right) westward to the American coast (left), so x
   decreases as Madi sails toward the New World.
   Each puzzle: collect "fragments" and drop each into its correct "bin".
--------------------------------------------------------------------- */
const STAGES = [
    {
        id: 'channel',
        name: 'English Channel',
        emoji: '🇬🇧',
        pos: { x: 0.88, y: 0.30 },
        title: '⚓ English Channel - Pack the Ship',
        brief: 'Before leaving Dover, gather the supplies floating around the dock and stow each one in the correct hold.',
        bins: [
            { id: 'nav', title: '🧭 Navigation', desc: 'Tools to find the way' },
            { id: 'sustenance', title: '🍞 Food & Water', desc: 'Keep the crew alive' },
            { id: 'safety', title: '🛟 Crew & Safety', desc: 'Survive the storms' }
        ],
        fragments: [
            { label: 'Compass', emoji: '🧭', bin: 'nav' },
            { label: 'Star Chart', emoji: '🗺️', bin: 'nav' },
            { label: 'Hourglass', emoji: '⏳', bin: 'nav' },
            { label: 'Salted Meat', emoji: '🥩', bin: 'sustenance' },
            { label: 'Fresh Water', emoji: '💧', bin: 'sustenance' },
            { label: 'Hard Biscuits', emoji: '🍪', bin: 'sustenance' },
            { label: 'Rope', emoji: '🪢', bin: 'safety' },
            { label: 'Lifeline Barrel', emoji: '🛢️', bin: 'safety' }
        ]
    },
    {
        id: 'atlantic',
        name: 'Open Atlantic',
        emoji: '🌊',
        pos: { x: 0.68, y: 0.58 },
        title: '🌊 Open Atlantic - Read the Skies',
        brief: 'Out of sight of land, Madi must navigate by nature. Sort each natural sign by what it tells you.',
        bins: [
            { id: 'sky', title: '⭐ Sky Signs', desc: 'Stars & sun' },
            { id: 'wind', title: '💨 Wind Signs', desc: 'Air & weather' },
            { id: 'water', title: '🌊 Water Signs', desc: 'Sea & currents' }
        ],
        fragments: [
            { label: 'North Star', emoji: '⭐', bin: 'sky' },
            { label: 'Sunset Bearing', emoji: '🌅', bin: 'sky' },
            { label: 'Moon Phase', emoji: '🌙', bin: 'sky' },
            { label: 'Trade Wind', emoji: '💨', bin: 'wind' },
            { label: 'Storm Front', emoji: '⛈️', bin: 'wind' },
            { label: 'Warm Current', emoji: '🌊', bin: 'water' },
            { label: 'Floating Kelp', emoji: '🌿', bin: 'water' },
            { label: 'Swell Pattern', emoji: '〰️', bin: 'water' }
        ]
    },
    {
        id: 'midocean',
        name: 'Mid-Ocean',
        emoji: '🐋',
        pos: { x: 0.48, y: 0.34 },
        title: '🐋 Mid-Ocean - Wildlife Log',
        brief: 'Strange creatures appear. Classify each sighting correctly to confirm you are halfway to the New World.',
        bins: [
            { id: 'birds', title: '🐦 Birds', desc: 'Sky dwellers' },
            { id: 'fish', title: '🐟 Fish', desc: 'Cold-blooded swimmers' },
            { id: 'mammals', title: '🐋 Sea Mammals', desc: 'Warm-blooded swimmers' }
        ],
        fragments: [
            { label: 'Albatross', emoji: '🕊️', bin: 'birds' },
            { label: 'Seagull', emoji: '🐦', bin: 'birds' },
            { label: 'Tuna', emoji: '🐟', bin: 'fish' },
            { label: 'Shark', emoji: '🦈', bin: 'fish' },
            { label: 'Flying Fish', emoji: '🐠', bin: 'fish' },
            { label: 'Whale', emoji: '🐋', bin: 'mammals' },
            { label: 'Dolphin', emoji: '🐬', bin: 'mammals' },
            { label: 'Seal', emoji: '🦭', bin: 'mammals' }
        ]
    },
    {
        id: 'approach',
        name: 'Caribbean Approach',
        emoji: '🏝️',
        pos: { x: 0.30, y: 0.62 },
        title: '🏝️ Caribbean Approach - Decode the Coast',
        brief: 'Clues drift past the hull. Decide which truly signal nearby land, which mean open sea, and which are false alarms.',
        bins: [
            { id: 'land', title: '🌴 Signs of Land', desc: 'Land is near!' },
            { id: 'sea', title: '🌊 Open Sea', desc: 'Still far out' },
            { id: 'false', title: '🚫 False Alarm', desc: 'Means nothing' }
        ],
        fragments: [
            { label: 'Fresh Leaves', emoji: '🍃', bin: 'land' },
            { label: 'Carved Driftwood', emoji: '🪵', bin: 'land' },
            { label: 'Land Birds', emoji: '🦜', bin: 'land' },
            { label: 'Endless Blue', emoji: '🟦', bin: 'sea' },
            { label: 'Deep Swell', emoji: '🌊', bin: 'sea' },
            { label: 'Tired Crewman', emoji: '😴', bin: 'false' },
            { label: 'Cloud Shadow', emoji: '☁️', bin: 'false' },
            { label: 'A Daydream', emoji: '💭', bin: 'false' }
        ]
    },
    {
        id: 'coast',
        name: 'American Coast',
        emoji: '🗽',
        pos: { x: 0.12, y: 0.32 },
        title: '🗽 American Coast - First Discoveries',
        brief: 'Madi steps ashore. Catalogue the first discoveries of the New World into the correct collection.',
        bins: [
            { id: 'plants', title: '🌽 Plants', desc: 'Flora of the land' },
            { id: 'animals', title: '🦬 Animals', desc: 'Fauna of the land' },
            { id: 'culture', title: '🏛️ People & Culture', desc: 'Human discoveries' }
        ],
        fragments: [
            { label: 'Maize', emoji: '🌽', bin: 'plants' },
            { label: 'Tobacco', emoji: '🍂', bin: 'plants' },
            { label: 'Cacao Tree', emoji: '🌳', bin: 'plants' },
            { label: 'Bison', emoji: '🦬', bin: 'animals' },
            { label: 'Turkey', emoji: '🦃', bin: 'animals' },
            { label: 'Beaver', emoji: '🦫', bin: 'animals' },
            { label: 'Canoe', emoji: '🛶', bin: 'culture' },
            { label: 'Trade Beads', emoji: '📿', bin: 'culture' }
        ]
    }
];

/* ---------------------------------------------------------------------
   GAME STATE
--------------------------------------------------------------------- */
const Game = {
    mode: 'start',          // 'start' | 'map' | 'puzzle' | 'victory'
    currentStage: 0,        // index of the port Madi is currently AT (and can enter)
    completed: [],          // booleans per stage
    score: 0,
    perfectSorts: 0,
    // puzzle runtime
    placements: {},         // fragmentIndex -> binId
    selectedFragment: null,
    activeStage: null,
    // map animation
    avatar: { x: 0, y: 0, targetX: 0, targetY: 0, t: 0, traveling: false }
};

STAGES.forEach(() => Game.completed.push(false));

/* ---------------------------------------------------------------------
   DOM REFERENCES
--------------------------------------------------------------------- */
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

const el = {
    hudScore: document.getElementById('hudScore'),
    hudStage: document.getElementById('hudStage'),
    voyageBar: document.getElementById('voyageBar'),
    locationIndicator: document.getElementById('locationIndicator'),
    mapHint: document.getElementById('mapHint'),
    startScreen: document.getElementById('startScreen'),
    puzzleScreen: document.getElementById('puzzleScreen'),
    victoryScreen: document.getElementById('victoryScreen'),
    puzzleTitle: document.getElementById('puzzleTitle'),
    puzzleBrief: document.getElementById('puzzleBrief'),
    fragmentsPool: document.getElementById('fragmentsPool'),
    binsZone: document.getElementById('binsZone'),
    puzzleFeedback: document.getElementById('puzzleFeedback'),
    btnStart: document.getElementById('btnStart'),
    btnReset: document.getElementById('btnReset'),
    btnSubmit: document.getElementById('btnSubmit'),
    btnLeave: document.getElementById('btnLeave'),
    btnVictoryRestart: document.getElementById('btnVictoryRestart'),
    victoryScore: document.getElementById('victoryScore'),
    victoryPorts: document.getElementById('victoryPorts'),
    victoryPerfect: document.getElementById('victoryPerfect')
};

/* ---------------------------------------------------------------------
   CANVAS SIZING
--------------------------------------------------------------------- */
let dpr = Math.max(1, window.devicePixelRatio || 1);

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resizeCanvas);

/* Convenience: normalized -> pixel coordinates */
function nodePixel(stage) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return { x: stage.pos.x * rect.width * dpr, y: stage.pos.y * rect.height * dpr };
}

/* ---------------------------------------------------------------------
   MAP RENDERING
--------------------------------------------------------------------- */
let waveTime = 0;

function drawMap() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width * dpr, h = rect.height * dpr;

    // Ocean gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0d3357');
    grad.addColorStop(0.5, '#0b2a4a');
    grad.addColorStop(1, '#071d33');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Animated wave lines
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#8fd3ff';
    ctx.lineWidth = 2;
    for (let row = 0; row < h; row += 46) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) {
            const y = row + Math.sin((x * 0.025) + waveTime + row) * 5;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();

    // Landmasses: England (right) and America (left) as decorative blobs
    drawLand(w * 0.985, h * 0.28, w * 0.10, h * 0.22, '#234d2e', '🇬🇧 Europe');
    drawLand(w * 0.015, h * 0.30, w * 0.13, h * 0.30, '#3a4d23', '🗽 America');

    // Route path (dashed) connecting all nodes
    ctx.save();
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
    ctx.beginPath();
    STAGES.forEach((s, i) => {
        const p = nodePixel(s);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();

    // Nodes
    STAGES.forEach((s, i) => {
        const p = nodePixel(s);
        const isDone = Game.completed[i];
        const isCurrent = i === Game.currentStage && !Game.avatar.traveling;
        const isLocked = i > Game.currentStage;
        drawNode(p.x, p.y, s, isDone, isCurrent, isLocked);
    });

    // Avatar (Madi's ship)
    drawAvatar();

    if (typeof updateAndDrawParticles === 'function') {
        updateAndDrawParticles();
    }

    waveTime += 0.04;
}

function drawLand(cx, cy, rw, rh, color, label) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy);
    ctx.restore();
}

function drawNode(x, y, stage, isDone, isCurrent, isLocked) {
    const r = 26;
    ctx.save();

    // Pulsing glow for the current playable node
    if (isCurrent) {
        const pulse = 0.5 + 0.5 * Math.sin(waveTime * 2);
        ctx.beginPath();
        ctx.arc(x, y, r + 8 + pulse * 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${0.18 + pulse * 0.18})`;
        ctx.fill();
    }

    // Node disc
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (isDone) {
        ctx.fillStyle = '#10b981';
    } else if (isCurrent) {
        ctx.fillStyle = '#06b6d4';
    } else if (isLocked) {
        ctx.fillStyle = '#33445a';
    } else {
        ctx.fillStyle = '#8b5cf6';
    }
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isLocked ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)';
    ctx.stroke();

    // Icon
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isLocked) {
        ctx.fillText('🔒', x, y + 1);
    } else if (isDone) {
        ctx.fillText('✅', x, y + 1);
    } else {
        ctx.fillText(stage.emoji, x, y + 1);
    }

    // Label
    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillStyle = isLocked ? 'rgba(255,255,255,0.4)' : '#ffffff';
    ctx.textBaseline = 'top';
    ctx.fillText(stage.name, x, y + r + 6);

    ctx.restore();
}

function drawAvatar() {
    const a = Game.avatar;
    ctx.save();
    // little wake glow
    ctx.beginPath();
    ctx.arc(a.x, a.y - 30, 16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.fill();
    ctx.font = '30px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bob = Math.sin(waveTime * 2) * 2;
    ctx.fillText('⛵', a.x, a.y - 30 + bob);
    ctx.restore();
}

/* Place avatar at a node instantly (used on load / restart) */
function snapAvatarTo(stageIndex) {
    const p = nodePixel(STAGES[stageIndex]);
    Game.avatar.x = p.x;
    Game.avatar.y = p.y;
    Game.avatar.targetX = p.x;
    Game.avatar.targetY = p.y;
    Game.avatar.traveling = false;
    Game.avatar.t = 1;
}

/* Animate avatar sailing from one node to the next */
function travelAvatarTo(stageIndex, onArrive) {
    const start = { x: Game.avatar.x, y: Game.avatar.y };
    const end = nodePixel(STAGES[stageIndex]);
    Game.avatar.traveling = true;
    Game.avatar.t = 0;
    const dur = 1400;
    const t0 = performance.now();
    function step(now) {
        const k = Math.min(1, (now - t0) / dur);
        const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        Game.avatar.x = start.x + (end.x - start.x) * ease;
        Game.avatar.y = start.y + (end.y - start.y) * ease;
        if (k < 1) {
            requestAnimationFrame(step);
        } else {
            Game.avatar.traveling = false;
            if (onArrive) onArrive();
        }
    }
    requestAnimationFrame(step);
}

/* ---------------------------------------------------------------------
   MAIN RENDER LOOP (map only)
--------------------------------------------------------------------- */
function loop() {
    if (Game.mode === 'map' || Game.mode === 'puzzle' || Game.mode === 'victory') {
        drawMap();
    }
    requestAnimationFrame(loop);
}

/* ---------------------------------------------------------------------
   HUD
--------------------------------------------------------------------- */
function updateHUD() {
    el.hudScore.textContent = Game.score;
    el.hudStage.textContent = `${Math.min(Game.currentStage + 1, STAGES.length)} / ${STAGES.length}`;
    const done = Game.completed.filter(Boolean).length;
    el.voyageBar.style.width = `${(done / STAGES.length) * 100}%`;
    const here = STAGES[Math.min(Game.currentStage, STAGES.length - 1)];
    el.locationIndicator.textContent = here.name;
}

/* ---------------------------------------------------------------------
   MAP INTERACTION - tap the current glowing node to open its puzzle
--------------------------------------------------------------------- */
function handleMapClick(clientX, clientY) {
    if (Game.mode !== 'map' || Game.avatar.traveling) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const stage = STAGES[Game.currentStage];
    if (!stage) return;
    const p = nodePixel(stage);
    const dist = Math.hypot(x - p.x, y - p.y);
    if (dist <= 34) {
        openPuzzle(Game.currentStage);
    }
}

canvas.addEventListener('click', (e) => handleMapClick(e.clientX, e.clientY));
canvas.addEventListener('touchend', (e) => {
    if (e.changedTouches && e.changedTouches.length) {
        const t = e.changedTouches[0];
        e.preventDefault();
        handleMapClick(t.clientX, t.clientY);
    }
}, { passive: false });

/* ---------------------------------------------------------------------
   PUZZLE: build, interact, validate
--------------------------------------------------------------------- */
function openPuzzle(stageIndex) {
    Game.mode = 'puzzle';
    Game.activeStage = STAGES[stageIndex];
    Game.placements = {};
    Game.selectedFragment = null;
    el.mapHint.classList.add('hidden');

    el.puzzleTitle.textContent = Game.activeStage.title;
    el.puzzleBrief.textContent = Game.activeStage.brief;
    el.puzzleFeedback.textContent = '';
    el.puzzleFeedback.className = 'puzzle-feedback';

    renderBins();
    renderFragments();
    el.puzzleScreen.classList.remove('hidden');
}

function renderBins() {
    el.binsZone.innerHTML = '';
    Game.activeStage.bins.forEach((bin) => {
        const div = document.createElement('div');
        div.className = 'bin';
        div.dataset.bin = bin.id;
        div.innerHTML = `
            <div class="bin-title">${bin.title}</div>
            <div class="bin-desc">${bin.desc}</div>
            <div class="bin-contents" data-contents="${bin.id}"></div>
        `;
        div.addEventListener('click', () => placeSelectedInBin(bin.id));
        el.binsZone.appendChild(div);
    });
}

function renderFragments() {
    el.fragmentsPool.innerHTML = '';
    Game.activeStage.fragments.forEach((frag, idx) => {
        // Skip fragments already placed in a bin
        if (Game.placements[idx] !== undefined) return;
        const span = document.createElement('div');
        span.className = 'fragment';
        span.dataset.frag = idx;
        span.innerHTML = `<span class="frag-emoji">${frag.emoji}</span>${frag.label}`;
        span.addEventListener('click', () => selectFragment(idx));
        el.fragmentsPool.appendChild(span);
    });
    refreshSelectionHighlight();
    refreshTargetableBins();
    if (!el.fragmentsPool.children.length && el.puzzleFeedback.textContent === '') {
        el.puzzleFeedback.textContent = 'All fragments placed - confirm your course!';
        el.puzzleFeedback.className = 'puzzle-feedback info';
    }
}

function selectFragment(idx) {
    Game.selectedFragment = (Game.selectedFragment === idx) ? null : idx;
    initAudio();
    playSound('select');
    refreshSelectionHighlight();
    refreshTargetableBins();
}

function refreshSelectionHighlight() {
    el.fragmentsPool.querySelectorAll('.fragment').forEach((node) => {
        const idx = Number(node.dataset.frag);
        node.classList.toggle('selected', idx === Game.selectedFragment);
    });
}

function refreshTargetableBins() {
    const active = Game.selectedFragment !== null;
    el.binsZone.querySelectorAll('.bin').forEach((b) => {
        b.classList.toggle('targetable', active);
    });
}

function placeSelectedInBin(binId) {
    if (Game.selectedFragment === null) return;
    const idx = Game.selectedFragment;
    Game.placements[idx] = binId;
    Game.selectedFragment = null;
    el.puzzleFeedback.textContent = '';
    el.puzzleFeedback.className = 'puzzle-feedback';
    playSound('place');
    renderPlacedFragments();
    renderFragments();
}

/* Render fragments that have been dropped into bins (clickable to remove) */
function renderPlacedFragments() {
    // clear all bin contents first
    el.binsZone.querySelectorAll('.bin-contents').forEach((c) => (c.innerHTML = ''));
    Object.keys(Game.placements).forEach((key) => {
        const idx = Number(key);
        const binId = Game.placements[idx];
        const frag = Game.activeStage.fragments[idx];
        const container = el.binsZone.querySelector(`.bin-contents[data-contents="${binId}"]`);
        if (!container) return;
        const span = document.createElement('div');
        span.className = 'fragment';
        span.dataset.placed = idx;
        span.innerHTML = `<span class="frag-emoji">${frag.emoji}</span>${frag.label}`;
        span.title = 'Tap to return to the pool';
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            returnFragmentToPool(idx);
        });
        container.appendChild(span);
    });
}

function returnFragmentToPool(idx) {
    delete Game.placements[idx];
    el.puzzleFeedback.textContent = '';
    el.puzzleFeedback.className = 'puzzle-feedback';
    playSound('place');
    renderPlacedFragments();
    renderFragments();
}

function resetPuzzle() {
    Game.placements = {};
    Game.selectedFragment = null;
    el.puzzleFeedback.textContent = '';
    el.puzzleFeedback.className = 'puzzle-feedback';
    renderPlacedFragments();
    renderFragments();
}

function submitPuzzle() {
    const frags = Game.activeStage.fragments;
    const placedCount = Object.keys(Game.placements).length;

    if (placedCount < frags.length) {
        el.puzzleFeedback.textContent = `Place all fragments first (${placedCount}/${frags.length}).`;
        el.puzzleFeedback.className = 'puzzle-feedback bad';
        return;
    }

    // Validate
    let correct = 0;
    frags.forEach((frag, idx) => {
        const placedSpan = el.binsZone.querySelector(`.fragment[data-placed="${idx}"]`);
        const isRight = Game.placements[idx] === frag.bin;
        if (isRight) correct++;
        if (placedSpan) {
            placedSpan.classList.remove('correct', 'wrong');
            placedSpan.classList.add(isRight ? 'correct' : 'wrong');
        }
    });

    if (correct === frags.length) {
        // Perfect / success
        const stageIndex = STAGES.indexOf(Game.activeStage);
        const firstTime = !Game.completed[stageIndex];
        Game.completed[stageIndex] = true;
        Game.perfectSorts++;
        const gained = 200 + correct * 25;
        Game.score += gained;
        el.puzzleFeedback.textContent = `Course confirmed! +${gained} data points 🎉`;
        el.puzzleFeedback.className = 'puzzle-feedback ok';
        playSound('success');
        if (typeof spawnSuccessParticles === 'function') spawnSuccessParticles();
        updateHUD();
        setTimeout(() => advanceFromPuzzle(stageIndex), 1100);
    } else {
        el.puzzleFeedback.textContent = `${correct}/${frags.length} correct. Fix the red ones and try again.`;
        el.puzzleFeedback.className = 'puzzle-feedback bad';
        playSound('error');
        
        // Trigger screen shake
        const puzzleOverlay = el.puzzleScreen;
        if (puzzleOverlay) {
            puzzleOverlay.classList.remove('shake-effect');
            void puzzleOverlay.offsetWidth; // trigger reflow
            puzzleOverlay.classList.add('shake-effect');
            setTimeout(() => puzzleOverlay.classList.remove('shake-effect'), 350);
        }
    }
}

function advanceFromPuzzle(stageIndex) {
    el.puzzleScreen.classList.add('hidden');
    Game.mode = 'map';

    const nextIndex = stageIndex + 1;
    if (nextIndex >= STAGES.length) {
        // Final port complete -> victory
        Game.currentStage = STAGES.length - 1;
        updateHUD();
        showVictory();
        return;
    }

    // Unlock and sail to next node
    Game.currentStage = nextIndex;
    updateHUD();
    travelAvatarTo(nextIndex, () => {
        el.mapHint.textContent = 'Tap the glowing port to gather data ⚓';
        el.mapHint.classList.remove('hidden');
        updateHUD();
    });
}

/* ---------------------------------------------------------------------
   SCREEN FLOW
--------------------------------------------------------------------- */
function startGame() {
    Game.mode = 'map';
    Game.currentStage = 0;
    Game.completed = STAGES.map(() => false);
    Game.score = 0;
    Game.perfectSorts = 0;
    el.startScreen.classList.add('hidden');
    el.victoryScreen.classList.add('hidden');
    el.puzzleScreen.classList.add('hidden');
    resizeCanvas();
    snapAvatarTo(0);
    el.mapHint.textContent = 'Tap the glowing port to gather data ⚓';
    el.mapHint.classList.remove('hidden');
    updateHUD();
}

function showVictory() {
    Game.mode = 'victory';
    el.mapHint.classList.add('hidden');
    playSound('victory');
    el.victoryScore.textContent = Game.score;
    el.victoryPorts.textContent = `${Game.completed.filter(Boolean).length} / ${STAGES.length}`;
    el.victoryPerfect.textContent = Game.perfectSorts;
    el.victoryScreen.classList.remove('hidden');
}

function leavePuzzle() {
    el.puzzleScreen.classList.add('hidden');
    Game.mode = 'map';
    el.mapHint.classList.remove('hidden');
}

/* ---------------------------------------------------------------------
   EVENT WIRING
--------------------------------------------------------------------- */
el.btnStart.addEventListener('click', startGame);
el.btnVictoryRestart.addEventListener('click', startGame);
el.btnReset.addEventListener('click', resetPuzzle);
el.btnSubmit.addEventListener('click', submitPuzzle);
el.btnLeave.addEventListener('click', leavePuzzle);

/* Keep avatar pinned to its node on resize */
window.addEventListener('resize', () => {
    if (!Game.avatar.traveling) {
        snapAvatarTo(Game.currentStage);
    }
});

/* ---------------------------------------------------------------------
   AUDIO & PARTICLE EFFECTS
--------------------------------------------------------------------- */
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    
    switch(type) {
        case 'select':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'place':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(350, now);
            osc.frequency.exponentialRampToValueAtTime(450, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
            break;
        case 'success':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(523.25, now + 0.1); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
            break;
        case 'error':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.25);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
            break;
        case 'victory':
            for (let i = 0; i < 5; i++) {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.type = 'sine';
                o.frequency.setValueAtTime(300 * Math.pow(1.25, i), now + i * 0.1);
                g.gain.setValueAtTime(0.1, now + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
                o.start(now + i * 0.1);
                o.stop(now + i * 0.1 + 0.4);
            }
            break;
    }
}

let particles = [];
function spawnSuccessParticles() {
    const rect = canvas.getBoundingClientRect();
    const emojis = ['🎉', '🧭', '⭐', '⛵', '🗺️', '🌊', '🗽', '✨'];
    for (let i = 0; i < 35; i++) {
        particles.push({
            x: rect.width / 2,
            y: rect.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 4,
            gravity: 0.15,
            life: 60 + Math.random() * 40,
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            size: 16 + Math.random() * 18
        });
    }
}

function updateAndDrawParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life--;
        
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / 100);
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, p.x, p.y);
        ctx.restore();
        
        return p.life > 0;
    });
}

/* ---------------------------------------------------------------------
   BOOT
--------------------------------------------------------------------- */
resizeCanvas();
snapAvatarTo(0);
updateHUD();
loop();
