/**
 * AssassinAnimals - Game Engine (GORE EDITION)
 * A stealth action rogue-like inspired by "Hitman", featuring procedural levels,
 * 9 unique animal operatives, body dragging, disguises, throwing coin distractions, VIP targets,
 * and an EXTREME GORE & BLOOD system with permanent blood pools, flying meat gibs, and slasher arcs.
 */

// Global Audio Synth
const synth = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    play(freq, type, duration, volume = 0.1) {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playSlice() {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth'; // Rougher saw sound for flesh tearing
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.12);
    },
    playHeavySlam() {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.35);
    },
    playHacking() {
        this.play(880, 'sine', 0.08, 0.05);
        setTimeout(() => this.play(1760, 'sine', 0.08, 0.05), 80);
    },
    playAlarm() {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.25);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.5);
    },
    playGunshot() {
        this.init();
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    },
    playCoin() {
        this.init();
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now);
        osc2.frequency.setValueAtTime(1318.51, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
    },
    playLevelUp() {
        this.init();
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + i * 0.1);
            gain.gain.setValueAtTime(0.08, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(now + i * 0.1 + 0.3);
        });
    },
    playFailure() {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(150, now + 0.6);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.6);
    }
};

// 9 Animal Operatives Definitions
const ROSTER = [
    {
        id: "panther",
        name: "Cyber-Panther",
        emoji: "🐱",
        role: "Stealth Specialist",
        desc: "Infiltrates high-security sectors using shadow camo. Excels in rapid silent executions.",
        hp: 100,
        speed: 4.5,
        stealth: 100,
        noise: 20,
        primaryName: "Silent Claws",
        primaryDesc: "Deals 100 damage from behind (instant kill), 35 damage from front.",
        specialName: "Assassination Pounce",
        specialDesc: "Leaps forward. If it hits a guard, executes them silently. 6s cooldown.",
        specialCooldown: 6000,
        passiveDesc: "Invisible when standing still in tall grass, bushes, or shadows. Can crawl through narrow wall vents.",
        statsPercent: { hp: 60, speed: 85, stealth: 100, noise: 20 }
    },
    {
        id: "gorilla",
        name: "Mech-Gorilla",
        emoji: "🦍",
        role: "Heavy Brawler",
        desc: "Heavy armor combat suit. Shrugs off damage and smashes through obstacles.",
        hp: 180,
        speed: 3.2,
        stealth: 30,
        noise: 80,
        primaryName: "Titanium Fists",
        primaryDesc: "Deals 60 damage and stuns targets for 1.5 seconds.",
        specialName: "Tectonic Ground Slam",
        specialDesc: "Slam the floor, dealing 50 damage & stunning all guards in a 100px radius. Breaks cracked doors. 8s cooldown.",
        specialCooldown: 8000,
        passiveDesc: "Kinetic Shielding absorbs 40% of all incoming damage. Heavy footsteps (cannot use vents).",
        statsPercent: { hp: 100, speed: 50, stealth: 30, noise: 80 }
    },
    {
        id: "cobra",
        name: "Nano-Cobra",
        emoji: "🐍",
        role: "Poison Specialist",
        desc: "Mutated serpent. Leaves toxic damage in its wake and moves without making a sound.",
        hp: 90,
        speed: 4.0,
        stealth: 90,
        noise: 0,
        primaryName: "Neurotoxic Bite",
        primaryDesc: "Deals 20 damage, then inflicts poison dealing 15 damage/sec for 5 seconds.",
        specialName: "Corrosive Acid Cloud",
        specialDesc: "Spit acid forming a gas cloud. Blocks vision cones and stuns guards entering it. 7s cooldown.",
        specialCooldown: 7000,
        passiveDesc: "Slither movement is completely silent (Noise level 0). Ignores laser/alarm pressure plates. Can slide into vents.",
        statsPercent: { hp: 50, speed: 70, stealth: 90, noise: 0 }
    },
    {
        id: "hawk",
        name: "Shadow-Hawk",
        emoji: "🦅",
        role: "Recon & Intel",
        desc: "Aerial drone-hybrid. Spots targets through barriers and sweeps from above.",
        hp: 85,
        speed: 5.0,
        stealth: 80,
        noise: 40,
        primaryName: "Talon Strike",
        primaryDesc: "Deals 30 damage. Quickly slashes targets.",
        specialName: "Sensor Recon Ping",
        specialDesc: "Reveals all guard positions, cameras, and items through walls for 8 seconds. 12s cooldown.",
        specialCooldown: 12000,
        passiveDesc: "Gains flight: Can glide over floor hazard traps, spike pits, and low security lasers.",
        statsPercent: { hp: 45, speed: 95, stealth: 80, noise: 40 }
    },
    {
        id: "badger",
        name: "Psycho-Badger",
        emoji: "🦡",
        role: "Burrowing Berserker",
        desc: "Fearless and unpredictable. Burrows through the ground to ambush and enters frenzy states.",
        hp: 110,
        speed: 3.8,
        stealth: 65,
        noise: 50,
        primaryName: "Frenzy Claws",
        primaryDesc: "Deals 25 damage. Attack speed doubles when below half health.",
        specialName: "Burrow Tunnel",
        specialDesc: "Dig underground for 4 seconds, becoming fully invulnerable and able to move through solid walls. 10s cooldown.",
        specialCooldown: 10000,
        passiveDesc: "Rage Shield: Automatically gains temporary invulnerability for 3 seconds when HP drops below 30% (once per floor).",
        statsPercent: { hp: 65, speed: 65, stealth: 65, noise: 50 }
    },
    {
        id: "octopus",
        name: "Cyber-Octopus",
        emoji: "🐙",
        role: "Infiltrator / Hacker",
        desc: "Optical camo and hacking nodes. Bends the facility systems to its will.",
        hp: 95,
        speed: 3.5,
        stealth: 85,
        noise: 30,
        primaryName: "Tentacle Wrap",
        primaryDesc: "Stones and wraps target, dealing 15 damage per second. Completely silent.",
        specialName: "Mainframe Disruption",
        specialDesc: "Remotely disable all cameras, turrets, and laser gates within 150px range for 8 seconds. 9s cooldown.",
        specialCooldown: 9000,
        passiveDesc: "Adaptive Chromatic skin: Detection rate by security cameras and guard vision cones is reduced by 75% when moving slowly.",
        statsPercent: { hp: 55, speed: 55, stealth: 85, noise: 30 }
    },
    {
        id: "kangaroo",
        name: "Jet-Kangaroo",
        emoji: "🦘",
        role: "Agility Combatant",
        desc: "High velocity momentum kicks. Bounces around combat fields at extreme speeds.",
        hp: 120,
        speed: 4.8,
        stealth: 50,
        noise: 60,
        primaryName: "Piston Kick",
        primaryDesc: "Deals 45 damage and knocks back guard, stuns if they hit a wall.",
        specialName: "Rocket Thruster Dash",
        specialDesc: "Perform an explosive jet-dash forward, knocking down and stunning all guards in the vector. 5s cooldown.",
        specialCooldown: 5000,
        passiveDesc: "Agility Jump: Can leap over guard vision cones and pressure trap triggers. Faster recovery from stuns.",
        statsPercent: { hp: 70, speed: 90, stealth: 50, noise: 60 }
    },
    {
        id: "beaver",
        name: "Electro-Beaver",
        emoji: "🦫",
        role: "Saboteur Engineer",
        desc: "Uses jury-rigged tools to deploy distractions and sabotage grids.",
        hp: 100,
        speed: 3.6,
        stealth: 70,
        noise: 45,
        primaryName: "Circular Plasma Saw",
        primaryDesc: "Fast saw blade deals 30 damage. Decimates robotic defenses.",
        specialName: "Deploy Decoy Drone",
        specialDesc: "Launches a noisy decoy bot. Guards break patrol to follow it. Explodes, blinding them for 4s. 8s cooldown.",
        specialCooldown: 8000,
        passiveDesc: "Wire-cutter: Chews electrical circuits, automatically disabling laser tripwires when touching their emitters.",
        statsPercent: { hp: 60, speed: 60, stealth: 70, noise: 45 }
    },
    {
        id: "rhino",
        name: "Heavy-Rhino",
        emoji: "🦏",
        role: "Unstoppable Juggernaut",
        desc: "Clad in heavy plating. Charges straight through solid security infrastructure.",
        hp: 200,
        speed: 3.0,
        stealth: 10,
        noise: 90,
        primaryName: "Horn Impale",
        primaryDesc: "Deals 70 damage, pin-pointing targets.",
        specialName: "Demolition Charge",
        specialDesc: "Charge forward with extreme momentum, smashing through walls, killing minor guards in path. 10s cooldown.",
        specialCooldown: 10000,
        passiveDesc: "Heavy Bulwark: Fully immune to ballistic bullets hitting you from the front while moving forward. Cannot use vents.",
        statsPercent: { hp: 100, speed: 40, stealth: 10, noise: 90 }
    }
];

// Available Upgrades in Shop
const UPGRADES = [
    { id: "health", name: "🧬 Chitin Plating", desc: "+25 Max HP compound mutation", cost: 15 },
    { id: "speed", name: "🏃‍♂️ Adrenaline Injector", desc: "+10% Base speed boost", cost: 12 },
    { id: "damage", name: "🔪 Carbon Claws", desc: "+20% Strike damage output", cost: 18 },
    { id: "vision", name: "👁️ Thermal Retinas", desc: "+15% Sight / Camera outline range", cost: 10 },
    { id: "noise", name: "🤫 Silencer Pads", desc: "-20% Footstep sound output", cost: 14 },
    { id: "cooldown", name: "⏳ Synaptic Coolers", desc: "-15% Special ability recharge rate", cost: 16 }
];

// State variables
let state = {
    mode: 'MENU',
    selectedId: 'panther',
    player: null,
    run: {
        floor: 1,
        dna: 0,
        score: 0,
        kills: 0,
        hasKey: false,
        silentAssassin: true,
        bodiesDiscovered: 0,
        upgrades: { health: 0, speed: 0, damage: 0, vision: 0, noise: 0, cooldown: 0 }
    },
    map: null,
    guards: [],
    cameras: [],
    lasers: [],
    chests: [],
    terminals: [],
    particles: [],
    bullets: [],
    droppedUniforms: [],
    deadBodies: [],       // Corpses
    dumpsters: [],        // Trash containers to hide bodies
    thrownCoins: [],      // Coins in flight
    floorBlood: [],       // GORE: Permanent blood stains on floor
    gibs: [],             // GORE: Flying flesh chunks
    slashes: [],          // GORE: Attack arc animations
    alerts: {
        active: false,
        timer: 0
    },
    camera: { x: 0, y: 0 },
    keys: {},
    mouse: { x: 0, y: 0 }
};

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const TILE_SIZE = 50;

// Starfield Backdrop
const starfieldCanvas = document.getElementById('TEMPLATE-4weird-starfield');
if (starfieldCanvas) {
    const sctx = starfieldCanvas.getContext('2d');
    let width = starfieldCanvas.width = window.innerWidth;
    let height = starfieldCanvas.height = window.innerHeight;
    const stars = Array.from({ length: 80 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.15 + 0.05
    }));
    
    function drawStars() {
        sctx.fillStyle = '#05050a';
        sctx.fillRect(0, 0, width, height);
        sctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
        stars.forEach(s => {
            sctx.beginPath();
            sctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            sctx.fill();
            s.y += s.speed;
            if (s.y > height) s.y = 0;
        });
        requestAnimationFrame(drawStars);
    }
    drawStars();
}

// Map cell definitions
const CELL = {
    WALL: 1,
    FLOOR: 0,
    VENT: 2,
    ELEVATOR: 3
};

// Procedural Level Generator
function generateProceduralMap(floorNum) {
    const cols = 28 + floorNum * 2;
    const rows = 20 + floorNum * 2;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(CELL.WALL));

    const rooms = [];
    const minRoomSize = 6;
    const maxRoomSize = 11;
    const roomCount = 6 + Math.min(8, floorNum);

    for (let attempts = 0; attempts < 120; attempts++) {
        if (rooms.length >= roomCount) break;
        const w = Math.floor(Math.random() * (maxRoomSize - minRoomSize)) + minRoomSize;
        const h = Math.floor(Math.random() * (maxRoomSize - minRoomSize)) + minRoomSize;
        const x = Math.floor(Math.random() * (cols - w - 2)) + 1;
        const y = Math.floor(Math.random() * (rows - h - 2)) + 1;

        let overlap = false;
        for (let r of rooms) {
            if (x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y) {
                overlap = true;
                break;
            }
        }
        if (!overlap) {
            rooms.push({ x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
            for (let rIdx = y; rIdx < y + h; rIdx++) {
                for (let cIdx = x; cIdx < x + w; cIdx++) {
                    grid[rIdx][cIdx] = CELL.FLOOR;
                }
            }
        }
    }

    for (let i = 0; i < rooms.length - 1; i++) {
        carveCorridor(grid, rooms[i].cx, rooms[i].cy, rooms[i + 1].cx, rooms[i + 1].cy);
    }

    rooms.forEach(r => {
        const orientations = ['top', 'bottom', 'left', 'right'];
        orientations.forEach(side => {
            if (Math.random() < 0.3) {
                let vx = r.cx, vy = r.cy;
                if (side === 'top') vy = r.y - 1;
                else if (side === 'bottom') vy = r.y + r.h;
                else if (side === 'left') vx = r.x - 1;
                else if (side === 'right') vx = r.x + r.w;
                if (vx > 0 && vx < cols - 1 && vy > 0 && vy < rows - 1) {
                    grid[vy][vx] = CELL.VENT;
                }
            }
        });
    });

    const spawnRoom = rooms[0];
    const elevatorRoom = rooms[rooms.length - 1];
    grid[elevatorRoom.cy][elevatorRoom.cx] = CELL.ELEVATOR;

    return {
        grid,
        cols,
        rows,
        spawn: { x: spawnRoom.cx * TILE_SIZE + TILE_SIZE/2, y: spawnRoom.cy * TILE_SIZE + TILE_SIZE/2 },
        elevator: { x: elevatorRoom.cx * TILE_SIZE + TILE_SIZE/2, y: elevatorRoom.cy * TILE_SIZE + TILE_SIZE/2 },
        rooms
    };
}

function carveCorridor(grid, x1, y1, x2, y2) {
    let cx = x1;
    while (cx !== x2) {
        grid[y1][cx] = CELL.FLOOR;
        cx += x1 < x2 ? 1 : -1;
    }
    let cy = y1;
    while (cy !== y2) {
        grid[cy][x2] = CELL.FLOOR;
        cy += y1 < y2 ? 1 : -1;
    }
}

function isLineBlocked(x1, y1, x2, y2, mapGrid) {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = x1 + (x2 - x1) * t;
        const checkY = y1 + (y2 - y1) * t;
        const cellX = Math.floor(checkX / TILE_SIZE);
        const cellY = Math.floor(checkY / TILE_SIZE);
        
        if (cellY >= 0 && cellY < mapGrid.length && cellX >= 0 && cellX < mapGrid[0].length) {
            if (mapGrid[cellY][cellX] === CELL.WALL) {
                return true;
            }
        }
    }
    return false;
}

// GORE: Spawn blood decals that stay permanently on the floor
function spawnFloorBlood(x, y, r = 12) {
    state.floorBlood.push({
        x: x + (Math.random() * 16 - 8),
        y: y + (Math.random() * 16 - 8),
        r: Math.random() * r + r/2,
        color: `rgba(${Math.floor(180 + Math.random() * 75)}, 0, ${Math.floor(20 + Math.random() * 40)}, ${0.65 + Math.random() * 0.25})`
    });
    // Performance cap
    if (state.floorBlood.length > 500) {
        state.floorBlood.shift();
    }
}

// GORE: Spawn flying meat gibs
function spawnGibs(x, y, amount = 4) {
    for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 3;
        state.gibs.push({
            x,
            y,
            r: Math.random() * 4 + 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 60 + Math.random() * 40
        });
    }
}

// Particle System
function spawnParticle(x, y, color, size, vx, vy, life) {
    state.particles.push({ x, y, color, size, vx, vy, life, maxLife: life });
}

function triggerBloodSplatter(x, y, count = 25) {
    // Drop permanent floor decals
    const decalsCount = Math.floor(count / 3);
    for (let d = 0; d < decalsCount; d++) {
        spawnFloorBlood(x, y, 14);
    }

    // Flying spray particles
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        spawnParticle(
            x, y, 
            `rgba(${Math.floor(180 + Math.random() * 75)}, 0, 30, 0.85)`, 
            Math.random() * 3 + 2, 
            Math.cos(angle) * speed, 
            Math.sin(angle) * speed, 
            25 + Math.random() * 20
        );
    }
}

function triggerSparkEffect(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        spawnParticle(x, y, 'rgba(0, 229, 255, 0.9)', Math.random() * 2 + 1, Math.cos(angle) * speed, Math.sin(angle) * speed, 15 + Math.random() * 10);
    }
}

function triggerAcidPuff(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.5 + 0.5;
        spawnParticle(x, y, 'rgba(0, 255, 102, 0.45)', Math.random() * 8 + 6, Math.cos(angle) * speed, Math.sin(angle) * speed, 50 + Math.random() * 30);
    }
}

// Core Game Initialization
function initRun() {
    state.run.floor = 1;
    state.run.dna = 0;
    state.run.score = 0;
    state.run.kills = 0;
    state.run.hasKey = false;
    state.run.silentAssassin = true;
    state.run.bodiesDiscovered = 0;
    state.run.upgrades = { health: 0, speed: 0, damage: 0, vision: 0, noise: 0, cooldown: 0 };
    state.floorBlood = [];
    
    launchFloor();
}

function launchFloor() {
    state.run.hasKey = false;
    state.alerts.active = false;
    state.alerts.timer = 0;
    state.particles = [];
    state.bullets = [];
    state.deadBodies = [];
    state.droppedUniforms = [];
    state.dumpsters = [];
    state.thrownCoins = [];
    state.gibs = [];
    state.slashes = [];
    
    state.map = generateProceduralMap(state.run.floor);
    
    const info = ROSTER.find(r => r.id === state.selectedId);
    
    const maxHP = info.hp + (state.run.upgrades.health * 25);
    const speed = info.speed * (1 + state.run.upgrades.speed * 0.1);
    const noise = Math.max(0, info.noise * (1 - state.run.upgrades.noise * 0.2));
    
    state.player = {
        x: state.map.spawn.x,
        y: state.map.spawn.y,
        r: 16,
        angle: 0,
        hp: maxHP,
        maxHp: maxHP,
        speed: speed,
        noiseBase: noise,
        currentNoise: 0,
        abilityCooldown: 0,
        abilityCooldownMax: info.specialCooldown * (1 - state.run.upgrades.cooldown * 0.15),
        invulnerableTimer: 0,
        burrowTimer: 0,
        rageTriggered: false,
        camoActive: false,
        disguise: 'NONE',
        draggingBody: null
    };

    state.camera.x = state.player.x - canvas.width / 2;
    state.camera.y = state.player.y - canvas.height / 2;

    state.guards = [];
    state.cameras = [];
    state.lasers = [];
    state.chests = [];
    state.terminals = [];

    state.map.rooms.forEach((r, idx) => {
        if (idx !== 0 && idx % 2 === 0) {
            state.dumpsters.push({
                x: r.x * TILE_SIZE + TILE_SIZE * 1.5,
                y: r.y * TILE_SIZE + TILE_SIZE * 1.5,
                r: 22,
                bodiesInside: 0
            });
        }
    });

    const termRoom = state.map.rooms[Math.floor(Math.random() * (state.map.rooms.length - 2)) + 1];
    state.terminals.push({
        x: termRoom.cx * TILE_SIZE + TILE_SIZE / 2,
        y: termRoom.cy * TILE_SIZE + TILE_SIZE / 2,
        hacked: false,
        pulse: 0
    });

    state.map.rooms.forEach((r, idx) => {
        if (idx !== 0) {
            if (Math.random() < 0.6) {
                state.chests.push({
                    x: r.x * TILE_SIZE + Math.random() * r.w * TILE_SIZE,
                    y: r.y * TILE_SIZE + Math.random() * r.h * TILE_SIZE,
                    dnaAmount: Math.floor(Math.random() * 4) + 3,
                    opened: false
                });
            }
        }
    });

    state.map.rooms.forEach((r, idx) => {
        if (idx > 1 && Math.random() < 0.5) {
            state.cameras.push({
                x: r.x * TILE_SIZE + TILE_SIZE / 2,
                y: r.y * TILE_SIZE + TILE_SIZE / 2,
                angle: Math.random() * Math.PI * 2,
                rotSpeed: 0.008 + Math.random() * 0.008,
                rotRange: Math.PI / 2,
                baseAngle: Math.random() * Math.PI * 2,
                fov: 0.6,
                range: 160
            });
        }
    });

    let vipTargetCount = 1;
    let createdVips = 0;
    
    state.map.rooms.forEach((r, idx) => {
        if (idx > 0) {
            const guardCount = Math.floor(Math.random() * 2) + 1 + Math.floor(state.run.floor / 4);
            for (let g = 0; g < guardCount; g++) {
                const gx = (r.x + 1 + Math.random() * (r.w - 2)) * TILE_SIZE;
                const gy = (r.y + 1 + Math.random() * (r.h - 2)) * TILE_SIZE;
                
                let isVIP = false;
                if (createdVips < vipTargetCount && idx === state.map.rooms.length - 2) {
                    isVIP = true;
                    createdVips++;
                }

                let isEnforcer = !isVIP && Math.random() < 0.35;

                const guard = {
                    x: gx,
                    y: gy,
                    r: 15,
                    angle: Math.random() * Math.PI * 2,
                    state: 'PATROL',
                    speed: isVIP ? 1.6 : 2.0 + Math.random() * 0.5 + (state.run.floor * 0.08),
                    patrolNode: { x: gx, y: gy },
                    patrolTimer: Math.random() * 100,
                    inspectTimer: 0,
                    inspectTarget: null,
                    suspicion: 0,
                    shootCooldown: 0,
                    hp: isVIP ? 40 : 50 + state.run.floor * 10,
                    isVIP: isVIP,
                    isEnforcer: isEnforcer
                };
                
                state.guards.push(guard);
            }
        }
    });

    if (createdVips === 0 && state.guards.length > 0) {
        state.guards[0].isVIP = true;
    }

    for (let r = 0; r < state.map.rows; r++) {
        for (let c = 0; c < state.map.cols; c++) {
            if (state.map.grid[r][c] === CELL.FLOOR && Math.random() < 0.02 && c > 5 && r > 5) {
                if (state.map.grid[r-1][c] === CELL.WALL && state.map.grid[r+1][c] === CELL.WALL) {
                    state.lasers.push({
                        x1: c * TILE_SIZE + TILE_SIZE/2,
                        y1: (r - 0.4) * TILE_SIZE,
                        x2: c * TILE_SIZE + TILE_SIZE/2,
                        y2: (r + 1.4) * TILE_SIZE,
                        active: true,
                        toggleTimer: 0,
                        frequency: 2500 + Math.random() * 1000
                    });
                }
            }
        }
    }

    document.getElementById('hudFloor').textContent = state.run.floor;
    document.getElementById('hudDNA').textContent = state.run.dna;
    document.getElementById('hudKey').textContent = '❌';
    document.getElementById('hudDisguiseText').textContent = 'NONE';
    updateVIPCount();
}

function updateVIPCount() {
    const vips = state.guards.filter(g => g.isVIP).length;
    document.getElementById('hudGuardsLeft').textContent = vips;
    if (vips === 0 && state.guards.length > 0) {
        state.run.hasKey = true;
        document.getElementById('hudKey').textContent = '🔑 YES';
    }
}

// User Action - Attack
function triggerPrimaryAttack() {
    if (state.mode !== 'PLAY' || !state.player || state.player.hp <= 0) return;
    
    if (state.player.disguise !== 'NONE') {
        state.player.disguise = 'NONE';
        document.getElementById('hudDisguiseText').textContent = 'NONE';
        state.run.silentAssassin = false;
    }

    const info = ROSTER.find(r => r.id === state.selectedId);
    const reach = 50;
    
    const noiseMade = info.noise * 1.5;
    state.player.currentNoise = noiseMade;
    
    if (state.selectedId === 'gorilla' || state.selectedId === 'rhino' || state.selectedId === 'kangaroo') {
        synth.playHeavySlam();
    } else {
        synth.playSlice();
    }

    const ax = state.player.x + Math.cos(state.player.angle) * reach;
    const ay = state.player.y + Math.sin(state.player.angle) * reach;

    // GORE: Add sword / slash visual arc
    state.slashes.push({
        x: state.player.x,
        y: state.player.y,
        angle: state.player.angle,
        radius: reach + 10,
        life: 10
    });

    triggerSparkEffect(ax, ay, 6);

    state.guards.forEach(g => {
        const dist = Math.hypot(g.x - ax, g.y - ay);
        if (dist < g.r + 20) {
            let damage = 35;
            
            if (state.selectedId === 'panther') {
                const angleToGuard = Math.atan2(g.y - state.player.y, g.x - state.player.x);
                const angleDiff = Math.abs(normalizeAngle(angleToGuard - g.angle));
                if (angleDiff < Math.PI / 3) {
                    damage = 120; // Instant slice execution
                    state.player.currentNoise = 0;
                }
            } else if (state.selectedId === 'gorilla') {
                damage = 60;
                g.inspectTimer = 90; 
                g.state = 'INSPECT';
            } else if (state.selectedId === 'cobra') {
                damage = 20;
                g.poisonTimer = 300; 
            } else if (state.selectedId === 'rhino') {
                damage = 70;
            } else if (state.selectedId === 'kangaroo') {
                damage = 45;
                g.x += Math.cos(state.player.angle) * 30;
                g.y += Math.sin(state.player.angle) * 30;
            }

            damage *= (1 + state.run.upgrades.damage * 0.2);
            g.hp -= damage;
            
            // GORE: Large blood spurt on hit
            triggerBloodSplatter(g.x, g.y, 16);
            spawnGibs(g.x, g.y, 2);

            if (state.player.currentNoise > 10) {
                alertGuardsNear(g.x, g.y, 250);
            }

            if (g.hp <= 0) {
                handleGuardDeath(g);
            } else {
                g.state = 'CHASE';
                g.suspicion = 100;
            }
        }
    });
}

function handleGuardDeath(guard) {
    const idx = state.guards.indexOf(guard);
    if (idx !== -1) {
        state.guards.splice(idx, 1);
    }
    state.run.kills++;
    state.run.score += guard.isVIP ? 1000 : -300;
    if (!guard.isVIP) state.run.silentAssassin = false;

    // Drop dead body
    state.deadBodies.push({
        x: guard.x,
        y: guard.y,
        r: 14,
        isVIP: guard.isVIP,
        disguiseStolen: false,
        discovered: false
    });

    // Drop uniform disguise (if not VIP)
    if (!guard.isVIP) {
        state.droppedUniforms.push({
            x: guard.x,
            y: guard.y,
            r: 15,
            type: 'GUARD'
        });
    }

    // Spawn DNA
    state.run.dna += Math.floor(Math.random() * 2) + 2;
    synth.playCoin();
    document.getElementById('hudDNA').textContent = state.run.dna;
    
    updateVIPCount();

    // GORE: Explosive blood splat and meat gib chunks flying!
    triggerBloodSplatter(guard.x, guard.y, 50);
    spawnGibs(guard.x, guard.y, 8);
    for (let j = 0; j < 8; j++) {
        spawnFloorBlood(guard.x + Math.random()*30 - 15, guard.y + Math.random()*30 - 15, 18);
    }
}

// Active Special Ability Execution
function triggerSpecialAbility() {
    if (state.mode !== 'PLAY' || !state.player || state.player.hp <= 0) return;
    if (state.player.abilityCooldown > 0) return;

    const info = ROSTER.find(r => r.id === state.selectedId);
    state.player.abilityCooldown = state.player.abilityCooldownMax;

    if (state.selectedId === 'panther') {
        synth.playSlice();
        const pounceDist = 120;
        const tx = state.player.x + Math.cos(state.player.angle) * pounceDist;
        const ty = state.player.y + Math.sin(state.player.angle) * pounceDist;
        
        state.player.x = tx;
        state.player.y = ty;
        keepInBounds(state.player);

        state.guards.forEach(g => {
            const dist = Math.hypot(g.x - state.player.x, g.y - state.player.y);
            if (dist < g.r + 30) {
                g.hp -= 150;
                triggerBloodSplatter(g.x, g.y, 40);
                spawnGibs(g.x, g.y, 6);
                if (g.hp <= 0) handleGuardDeath(g);
            }
        });
    }
    else if (state.selectedId === 'gorilla') {
        synth.playHeavySlam();
        triggerSparkEffect(state.player.x, state.player.y, 20);
        
        // GORE: Blood shockwave
        state.guards.forEach(g => {
            const dist = Math.hypot(g.x - state.player.x, g.y - state.player.y);
            if (dist < 120) {
                g.hp -= 50;
                g.state = 'INSPECT';
                g.inspectTimer = 180;
                triggerBloodSplatter(g.x, g.y, 25);
                spawnGibs(g.x, g.y, 3);
                if (g.hp <= 0) handleGuardDeath(g);
            }
        });
        state.lasers.forEach(l => {
            const dist = Math.hypot((l.x1 + l.x2)/2 - state.player.x, (l.y1 + l.y2)/2 - state.player.y);
            if (dist < 120) l.active = false;
        });
    }
    else if (state.selectedId === 'cobra') {
        synth.playHeavySlam();
        triggerAcidPuff(state.player.x, state.player.y, 15);
        state.particles.push({
            type: 'ACID_CLOUD',
            x: state.player.x,
            y: state.player.y,
            life: 300,
            r: 90
        });
    }
    else if (state.selectedId === 'hawk') {
        synth.playHacking();
        state.player.reconActiveTimer = 480;
    }
    else if (state.selectedId === 'badger') {
        synth.playHeavySlam();
        state.player.burrowTimer = 240;
    }
    else if (state.selectedId === 'octopus') {
        synth.playHacking();
        triggerSparkEffect(state.player.x, state.player.y, 12);
        
        state.cameras.forEach(c => {
            const dist = Math.hypot(c.x - state.player.x, c.y - state.player.y);
            if (dist < 200) c.disabledTimer = 480;
        });
        state.lasers.forEach(l => {
            const dist = Math.hypot((l.x1+l.x2)/2 - state.player.x, (l.y1+l.y2)/2 - state.player.y);
            if (dist < 200) {
                l.active = false;
                l.disabledTimer = 480;
            }
        });
    }
    else if (state.selectedId === 'kangaroo') {
        synth.playHeavySlam();
        const dashSpeed = 15;
        const dashTime = 15;
        state.player.dashVelocityX = Math.cos(state.player.angle) * dashSpeed;
        state.player.dashVelocityY = Math.sin(state.player.angle) * dashSpeed;
        state.player.dashTimer = dashTime;
    }
    else if (state.selectedId === 'beaver') {
        synth.playHacking();
        const decoy = {
            x: state.player.x,
            y: state.player.y,
            r: 10,
            angle: state.player.angle,
            vx: Math.cos(state.player.angle) * 3.5,
            vy: Math.sin(state.player.angle) * 3.5,
            life: 240
        };
        state.particles.push({
            type: 'DECOY_BOT',
            bot: decoy,
            life: 240
        });
    }
    else if (state.selectedId === 'rhino') {
        synth.playHeavySlam();
        state.player.chargeTimer = 45;
        state.player.chargeAngle = state.player.angle;
    }
}

// Toss Coin Distraction (Right Click)
function tossCoin(targetX, targetY) {
    if (state.mode !== 'PLAY' || !state.player || state.player.hp <= 0) return;
    
    synth.playCoin();
    state.thrownCoins.push({
        x: state.player.x,
        y: state.player.y,
        tx: targetX,
        ty: targetY,
        progress: 0,
        speed: 0.05
    });
}

function handleCoinLanding(cx, cy) {
    synth.playCoin();
    
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        spawnParticle(cx, cy, '#ffea00', 3, Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 20);
    }

    state.guards.forEach(g => {
        const dist = Math.hypot(g.x - cx, g.y - cy);
        if (dist < 200 && g.state !== 'CHASE') {
            if (!isLineBlocked(g.x, g.y, cx, cy, state.map.grid)) {
                g.state = 'INSPECT';
                g.inspectTarget = { x: cx, y: cy };
                g.inspectTimer = 220;
            }
        }
    });
}

// Body Dragging Hook
function toggleDragBody() {
    if (!state.player || state.player.hp <= 0) return;
    
    if (state.player.draggingBody) {
        state.player.draggingBody = null;
        synth.play(400, 'triangle', 0.1, 0.05);
    } else {
        let closest = null;
        let minDist = 35;
        state.deadBodies.forEach(b => {
            const dist = Math.hypot(b.x - state.player.x, b.y - state.player.y);
            if (dist < minDist) {
                closest = b;
                minDist = dist;
            }
        });

        if (closest) {
            state.player.draggingBody = closest;
            synth.play(600, 'triangle', 0.1, 0.05);
        }
    }
}

// Disguise or Hide Body interaction
function handleInteraction() {
    if (!state.player || state.player.hp <= 0) return;
    const player = state.player;

    if (player.draggingBody) {
        let dumpster = null;
        state.dumpsters.forEach(d => {
            const dist = Math.hypot(d.x - player.x, d.y - player.y);
            if (dist < d.r + 20) dumpster = d;
        });

        if (dumpster) {
            const idx = state.deadBodies.indexOf(player.draggingBody);
            if (idx !== -1) state.deadBodies.splice(idx, 1);
            player.draggingBody = null;
            dumpster.bodiesInside++;
            synth.playHeavySlam();
            triggerSparkEffect(dumpster.x, dumpster.y, 10);
            return;
        }
    }

    let uniform = null;
    let uIdx = -1;
    state.droppedUniforms.forEach((u, index) => {
        const dist = Math.hypot(u.x - player.x, u.y - player.y);
        if (dist < 35) {
            uniform = u;
            uIdx = index;
        }
    });

    if (uniform) {
        player.disguise = uniform.type;
        state.droppedUniforms.splice(uIdx, 1);
        synth.playCoin();
        document.getElementById('hudDisguiseText').textContent = 'GUARD SECURITY';
        triggerSparkEffect(player.x, player.y, 8);
    }
}

function keepInBounds(entity) {
    const margin = entity.r || 15;
    const maxX = state.map.cols * TILE_SIZE - margin;
    const maxY = state.map.rows * TILE_SIZE - margin;
    if (entity.x < margin) entity.x = margin;
    if (entity.x > maxX) entity.x = maxX;
    if (entity.y < margin) entity.y = margin;
    if (entity.y > maxY) entity.y = maxY;
}

function normalizeAngle(a) {
    while (a < -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
}

function alertGuardsNear(x, y, radius) {
    state.guards.forEach(g => {
        const dist = Math.hypot(g.x - x, g.y - y);
        if (dist < radius) {
            g.state = 'INSPECT';
            g.inspectTarget = { x, y };
            g.inspectTimer = 180;
        }
    });
}

// Guard AI behaviors
function updateGuardsAI() {
    const player = state.player;
    const mapGrid = state.map.grid;
    
    const decoyBot = state.particles.find(p => p.type === 'DECOY_BOT');

    state.guards.forEach(g => {
        if (g.poisonTimer && g.poisonTimer > 0) {
            g.poisonTimer--;
            if (g.poisonTimer % 60 === 0) {
                g.hp -= 15 * (1 + state.run.upgrades.damage * 0.2);
                
                // GORE: Bleeding on poison ticks
                triggerBloodSplatter(g.x, g.y, 5);
                spawnFloorBlood(g.x, g.y, 6);

                if (g.hp <= 0) {
                    handleGuardDeath(g);
                    return;
                }
            }
        }

        if (decoyBot && g.state !== 'CHASE') {
            const db = decoyBot.bot;
            const dist = Math.hypot(db.x - g.x, db.y - g.y);
            if (dist < 250 && !isLineBlocked(g.x, g.y, db.x, db.y, mapGrid)) {
                g.state = 'INSPECT';
                g.inspectTarget = { x: db.x, y: db.y };
                g.inspectTimer = 30;
            }
        }

        state.deadBodies.forEach(b => {
            if (!b.discovered) {
                const distToBody = Math.hypot(b.x - g.x, b.y - g.y);
                if (distToBody < 180) {
                    const dirToBody = Math.atan2(b.y - g.y, b.x - g.x);
                    const angleDiff = Math.abs(normalizeAngle(dirToBody - g.angle));
                    if (angleDiff < 0.6 && !isLineBlocked(g.x, g.y, b.x, b.y, mapGrid)) {
                        b.discovered = true;
                        state.run.silentAssassin = false;
                        state.run.bodiesDiscovered++;
                        if (!state.alerts.active) {
                            state.alerts.active = true;
                            state.alerts.timer = 500;
                            synth.playAlarm();
                            alertGuardsNear(b.x, b.y, 500);
                        }
                    }
                }
            }
        });

        let canSeePlayer = false;
        if (player.hp > 0 && player.burrowTimer <= 0) {
            const dist = Math.hypot(player.x - g.x, player.y - g.y);
            
            let stealthBonus = 1.0;
            if (state.selectedId === 'panther' && player.currentNoise === 0) {
                stealthBonus = 0.15;
            } else if (state.selectedId === 'octopus' && player.currentNoise < 5) {
                stealthBonus = 0.3;
            }

            let disguiseCover = false;
            if (player.disguise === 'GUARD' && !g.isVIP) {
                if (g.isEnforcer) {
                    if (dist > 110) disguiseCover = true;
                } else {
                    if (dist > 60) disguiseCover = true;
                }
            }

            if (!disguiseCover && dist < 180 * stealthBonus) {
                const dirToPlayer = Math.atan2(player.y - g.y, player.x - g.x);
                const angleDiff = Math.abs(normalizeAngle(dirToPlayer - g.angle));
                
                if (angleDiff < 0.6) {
                    if (!isLineBlocked(g.x, g.y, player.x, player.y, mapGrid)) {
                        canSeePlayer = true;
                    }
                }
            }
        }

        if (canSeePlayer) {
            g.state = 'CHASE';
            g.suspicion = Math.min(100, g.suspicion + 5);
            g.angle = Math.atan2(player.y - g.y, player.x - g.x);

            if (g.suspicion >= 50 && player.disguise !== 'NONE') {
                player.disguise = 'NONE';
                document.getElementById('hudDisguiseText').textContent = 'NONE';
                state.run.silentAssassin = false;
            }

            if (g.suspicion >= 85) {
                if (!state.alerts.active) {
                    state.alerts.active = true;
                    state.alerts.timer = 300;
                    synth.playAlarm();
                }
                
                if (g.shootCooldown <= 0) {
                    g.shootCooldown = 45;
                    synth.playGunshot();
                    
                    state.bullets.push({
                        x1: g.x,
                        y1: g.y,
                        x2: player.x + (Math.random() * 20 - 10),
                        y2: player.y + (Math.random() * 20 - 10),
                        life: 8,
                        damage: 15
                    });
                }
            }
        } else {
            g.suspicion = Math.max(0, g.suspicion - 0.5);
            if (g.state === 'CHASE' && g.suspicion <= 0) {
                g.state = 'INSPECT';
                g.inspectTarget = { x: player.x, y: player.y };
                g.inspectTimer = 180;
            }
        }

        if (g.state === 'CHASE') {
            const dx = player.x - g.x;
            const dy = player.y - g.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 35) {
                g.x += (dx / dist) * g.speed * 1.25;
                g.y += (dy / dist) * g.speed * 1.25;
            }
        }
        else if (g.state === 'INSPECT') {
            g.inspectTimer--;
            if (g.inspectTarget) {
                const dx = g.inspectTarget.x - g.x;
                const dy = g.inspectTarget.y - g.y;
                const dist = Math.hypot(dx, dy);
                g.angle = Math.atan2(dy, dx);
                if (dist > 15) {
                    g.x += (dx / dist) * g.speed;
                    g.y += (dy / dist) * g.speed;
                }
            }
            if (g.inspectTimer <= 0) {
                g.state = 'PATROL';
            }
        }
        else {
            g.patrolTimer++;
            if (g.patrolTimer % 180 === 0) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 100 + 40;
                g.patrolNode = {
                    x: g.x + Math.cos(angle) * dist,
                    y: g.y + Math.sin(angle) * dist
                };
            }
            
            const dx = g.patrolNode.x - g.x;
            const dy = g.patrolNode.y - g.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 15) {
                g.angle = Math.atan2(dy, dx);
                g.x += (dx / dist) * (g.speed * 0.7);
                g.y += (dy / dist) * (g.speed * 0.7);
            }
        }

        if (g.shootCooldown > 0) g.shootCooldown--;
        keepInBounds(g);
    });
}

// General game updates
function updateGame() {
    if (state.mode !== 'PLAY' || !state.player) return;

    const player = state.player;

    player.currentNoise = Math.max(0, player.currentNoise - 1);

    // GORE: Update gib chunks physics
    state.gibs.forEach(g => {
        g.x += g.vx;
        g.y += g.vy;
        g.vx *= 0.92; // Friction
        g.vy *= 0.92;
        g.life--;
        // GORE: gibs bleed as they slide
        if (g.life > 10 && Math.random() < 0.25) {
            spawnFloorBlood(g.x, g.y, 4);
        }
    });
    state.gibs = state.gibs.filter(g => g.life > 0);

    // GORE: Update slashes arc duration
    state.slashes.forEach(s => s.life--);
    state.slashes = state.slashes.filter(s => s.life > 0);

    // Ability cooldown
    if (player.abilityCooldown > 0) {
        player.abilityCooldown = Math.max(0, player.abilityCooldown - 16.67);
        const percent = (player.abilityCooldown / player.abilityCooldownMax) * 100;
        document.getElementById('abilityCooldownFill').style.width = `${100 - percent}%`;
        document.getElementById('abilityStatusText').textContent = player.abilityCooldown === 0 ? "READY" : "CHARGING";
    }

    // Active abilities handling (Kangaroo/Rhino dash, Badger burrow)
    if (player.dashTimer && player.dashTimer > 0) {
        player.dashTimer--;
        player.x += player.dashVelocityX;
        player.y += player.dashVelocityY;
        keepInBounds(player);
        
        state.guards.forEach(g => {
            const d = Math.hypot(g.x - player.x, g.y - player.y);
            if (d < g.r + player.r + 10) {
                g.hp -= 20;
                g.state = 'INSPECT';
                g.inspectTimer = 90;
                triggerBloodSplatter(g.x, g.y, 8);
                if (g.hp <= 0) handleGuardDeath(g);
            }
        });
        if (player.dashTimer === 0) {
            player.dashVelocityX = 0;
            player.dashVelocityY = 0;
        }
    }
    else if (player.chargeTimer && player.chargeTimer > 0) {
        player.chargeTimer--;
        const rhinoSpeed = 9.5;
        player.x += Math.cos(player.chargeAngle) * rhinoSpeed;
        player.y += Math.sin(player.chargeAngle) * rhinoSpeed;
        keepInBounds(player);

        state.guards.forEach(g => {
            const d = Math.hypot(g.x - player.x, g.y - player.y);
            if (d < g.r + player.r + 15) {
                g.hp -= 90;
                g.x += Math.cos(player.chargeAngle) * 50;
                g.y += Math.sin(player.chargeAngle) * 50;
                triggerBloodSplatter(g.x, g.y, 25);
                spawnGibs(g.x, g.y, 4);
                if (g.hp <= 0) handleGuardDeath(g);
            }
        });
    }
    else if (player.burrowTimer && player.burrowTimer > 0) {
        player.burrowTimer--;
        player.currentNoise = 0;
        if (Math.random() < 0.3) {
            spawnParticle(player.x, player.y, '#78350f', Math.random() * 4 + 2, Math.random() * 2 - 1, Math.random() * 2 - 1, 30);
        }
    }
    else {
        // Standard WASD movement
        let vx = 0;
        let vy = 0;
        if (state.keys['KeyW'] || state.keys['ArrowUp']) vy = -1;
        if (state.keys['KeyS'] || state.keys['ArrowDown']) vy = 1;
        if (state.keys['KeyA'] || state.keys['ArrowLeft']) vx = -1;
        if (state.keys['KeyD'] || state.keys['ArrowRight']) vx = 1;

        if (vx !== 0 || vy !== 0) {
            const length = Math.hypot(vx, vy);
            
            const dragPenalty = player.draggingBody ? 0.45 : 1.0;
            const moveSpeed = player.speed * dragPenalty;
            
            const nextX = player.x + (vx / length) * moveSpeed;
            const nextY = player.y + (vy / length) * moveSpeed;

            const currCellX = Math.floor(player.x / TILE_SIZE);
            const currCellY = Math.floor(player.y / TILE_SIZE);
            const nextCellX = Math.floor(nextX / TILE_SIZE);
            const nextCellY = Math.floor(nextY / TILE_SIZE);

            const isSmall = ['panther', 'cobra', 'badger', 'beaver', 'octopus'].includes(state.selectedId);
            
            let blockX = false;
            let blockY = false;
            
            if (nextCellX >= 0 && nextCellX < state.map.cols) {
                const cell = state.map.grid[currCellY][nextCellX];
                if (cell === CELL.WALL || (cell === CELL.VENT && !isSmall)) blockX = true;
            }
            if (nextCellY >= 0 && nextCellY < state.map.rows) {
                const cell = state.map.grid[nextCellY][currCellX];
                if (cell === CELL.WALL || (cell === CELL.VENT && !isSmall)) blockY = true;
            }

            if (!blockX) player.x = nextX;
            if (!blockY) player.y = nextY;

            keepInBounds(player);

            player.currentNoise = player.noiseBase * dragPenalty;
            
            if (player.draggingBody) {
                player.draggingBody.x = player.x - Math.cos(player.angle) * 20;
                player.draggingBody.y = player.y - Math.sin(player.angle) * 20;
                
                // GORE: Leave a drag trail of blood under the corpse being dragged
                if (Math.random() < 0.22) {
                    spawnFloorBlood(player.draggingBody.x, player.draggingBody.y, 6);
                }
            }
        }
    }

    const wavesEl = document.getElementById('noiseWaves');
    const noiseText = document.getElementById('hudNoiseText');
    if (wavesEl) {
        if (player.currentNoise > 50) {
            wavesEl.className = "noise-waves noise-active-loud";
            noiseText.textContent = "LOUD";
            noiseText.className = "hud-value highlight-pink";
        } else if (player.currentNoise > 0) {
            wavesEl.className = "noise-waves noise-active-soft";
            noiseText.textContent = "SUSPICIOUS";
            noiseText.className = "hud-value highlight-cyan";
        } else {
            wavesEl.className = "noise-waves";
            noiseText.textContent = "SILENT";
            noiseText.className = "hud-value";
        }
    }

    const mouseWorldX = state.mouse.x + state.camera.x;
    const mouseWorldY = state.mouse.y + state.camera.y;
    player.angle = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);

    // Laser grids logic toggle
    state.lasers.forEach(l => {
        l.toggleTimer += 16.67;
        if (l.toggleTimer >= l.frequency) {
            l.toggleTimer = 0;
            l.active = !l.active;
        }

        if (l.disabledTimer && l.disabledTimer > 0) {
            l.disabledTimer--;
            if (l.disabledTimer === 0) l.active = true;
        }

        if (l.active && player.burrowTimer <= 0) {
            const dist = distToSegment({ x: player.x, y: player.y }, { x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 });
            if (dist < player.r) {
                if (!window.gameDebug?.godMode) {
                    player.hp -= 2;
                }
                triggerSparkEffect(player.x, player.y, 3);
                
                // GORE: Player bleeds from laser burns
                if (Math.random() < 0.15) spawnFloorBlood(player.x, player.y, 5);
                if (player.hp <= 0) handlePlayerDeath();
            }
        }
    });

    state.thrownCoins.forEach(coin => {
        coin.progress += coin.speed;
        const cx = coin.x + (coin.tx - coin.x) * coin.progress;
        const cy = coin.y + (coin.ty - coin.y) * coin.progress;
        
        if (Math.random() < 0.4) {
            spawnParticle(cx, cy, '#ffea00', 2, 0, 0, 10);
        }

        if (coin.progress >= 1.0) {
            handleCoinLanding(coin.tx, coin.ty);
        }
    });
    state.thrownCoins = state.thrownCoins.filter(c => c.progress < 1.0);

    const targetCamX = player.x - canvas.width / 2;
    const targetCamY = player.y - canvas.height / 2;
    state.camera.x += (targetCamX - state.camera.x) * 0.08;
    state.camera.y += (targetCamY - state.camera.y) * 0.08;

    updateGuardsAI();

    state.cameras.forEach(c => {
        if (c.disabledTimer && c.disabledTimer > 0) {
            c.disabledTimer--;
            return;
        }
        
        c.angle = c.baseAngle + Math.sin(Date.now() * c.rotSpeed) * c.rotRange;

        if (player.hp > 0 && player.burrowTimer <= 0) {
            let disguisedCameraCover = player.disguise === 'GUARD';
            const dist = Math.hypot(player.x - c.x, player.y - c.y);
            
            if (disguisedCameraCover && dist < 75) disguisedCameraCover = false;

            if (!disguisedCameraCover && dist < c.range) {
                const dirToP = Math.atan2(player.y - c.y, player.x - c.x);
                const diff = Math.abs(normalizeAngle(dirToP - c.angle));
                if (diff < c.fov / 2) {
                    if (!isLineBlocked(c.x, c.y, player.x, player.y, state.map.grid)) {
                        if (!state.alerts.active) {
                            state.alerts.active = true;
                            state.alerts.timer = 300;
                            synth.playAlarm();
                            alertGuardsNear(c.x, c.y, 400);
                        }
                        triggerSparkEffect(c.x, c.y, 2);
                    }
                }
            }
        }
    });

    state.bullets.forEach(b => {
        b.life--;
        const dist = distToSegment({ x: player.x, y: player.y }, { x: b.x1, y: b.y1 }, { x: b.x2, y: b.y2 });
        if (dist < player.r && b.life === 7 && player.burrowTimer <= 0) {
            const dir = Math.atan2(b.y1 - player.y, b.x1 - player.x);
            const facingDiff = Math.abs(normalizeAngle(dir - player.angle));
            
            if (state.selectedId === 'rhino' && facingDiff < Math.PI / 2.5) {
                triggerSparkEffect(player.x, player.y, 6);
            } else {
                let bulletDmg = b.damage;
                if (state.selectedId === 'gorilla') {
                    bulletDmg *= 0.6;
                }
                if (!window.gameDebug?.godMode) {
                    player.hp -= bulletDmg;
                }
                
                // GORE: Player blood spurt when shot
                triggerBloodSplatter(player.x, player.y, 14);
                if (player.hp <= 0) handlePlayerDeath();
            }
        }
    });
    state.bullets = state.bullets.filter(b => b.life > 0);

    state.particles.forEach(p => {
        p.life--;
        if (p.vx) p.x += p.vx;
        if (p.vy) p.y += p.vy;

        if (p.type === 'DECOY_BOT') {
            const db = p.bot;
            db.x += db.vx;
            db.y += db.vy;
            const cx = Math.floor(db.x / TILE_SIZE);
            const cy = Math.floor(db.y / TILE_SIZE);
            if (cx < 0 || cx >= state.map.cols || cy < 0 || cy >= state.map.rows || state.map.grid[cy][cx] === CELL.WALL) {
                db.vx = -db.vx;
                db.vy = -db.vy;
                db.x += db.vx * 2;
                db.y += db.vy * 2;
            }
            if (p.life === 1) {
                synth.playHeavySlam();
                triggerSparkEffect(db.x, db.y, 20);
                alertGuardsNear(db.x, db.y, 200);
            }
        }
    });
    state.particles = state.particles.filter(p => p.life > 0);

    state.terminals.forEach(t => {
        t.pulse = (t.pulse + 0.05) % (Math.PI * 2);
        if (!t.hacked) {
            const dist = Math.hypot(player.x - t.x, player.y - t.y);
            if (dist < 40) {
                t.hacked = true;
                synth.playHacking();
                state.run.hasKey = true;
                document.getElementById('hudKey').textContent = '🔑 YES';
                triggerSparkEffect(t.x, t.y, 15);
            }
        }
    });

    state.chests.forEach(c => {
        if (!c.opened) {
            const dist = Math.hypot(player.x - c.x, player.y - c.y);
            if (dist < 35) {
                c.opened = true;
                synth.playCoin();
                state.run.dna += c.dnaAmount;
                state.run.score += 250;
                document.getElementById('hudDNA').textContent = state.run.dna;
                triggerSparkEffect(c.x, c.y, 10);
            }
        }
    });

    const elevatorDist = Math.hypot(player.x - state.map.elevator.x, player.y - state.map.elevator.y);
    if (elevatorDist < 40 && state.run.hasKey) {
        handleElevatorUnlock();
    }

    document.getElementById('healthBar').style.width = `${(player.hp / player.maxHp) * 100}%`;
    document.getElementById('hudHealthText').textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
    
    const alarmPanel = document.getElementById('alarmOverlay');
    if (state.alerts.active) {
        state.alerts.timer--;
        alarmPanel.classList.remove('hidden');
        if (state.alerts.timer <= 0) {
            state.alerts.active = false;
        }
    } else {
        alarmPanel.classList.add('hidden');
    }
}

// Distance segment helper
function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

// Rendering graphics logic
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!state.map) return;
    
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);

    const cols = state.map.cols;
    const rows = state.map.rows;
    const grid = state.map.grid;

    // Draw Map grid tiles
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tx = c * TILE_SIZE;
            const ty = r * TILE_SIZE;
            
            if (grid[r][c] === CELL.WALL) {
                ctx.fillStyle = '#0f0f23';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
            } else if (grid[r][c] === CELL.VENT) {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 2;
                ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#334155';
                for (let k = 0; k < TILE_SIZE; k += 10) {
                    ctx.fillRect(tx + k, ty + 2, 4, TILE_SIZE - 4);
                }
            } else if (grid[r][c] === CELL.ELEVATOR) {
                ctx.fillStyle = 'rgba(255, 0, 127, 0.1)';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = varColor('--neon-pink');
                ctx.lineWidth = 3;
                ctx.strokeRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏢', tx + TILE_SIZE/2, ty + TILE_SIZE/2);
            } else {
                ctx.fillStyle = '#05050d';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.lineWidth = 1;
                ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // GORE: Draw permanent floor blood pools/splatters
    state.floorBlood.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Dumpsters to hide bodies
    state.dumpsters.forEach(d => {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.fillRect(d.x - 20, d.y - 15, 40, 30);
        ctx.strokeRect(d.x - 20, d.y - 15, 40, 30);
        ctx.font = '14px Arial';
        ctx.fillText('🗑️', d.x - 10, d.y + 5);
        if (d.bodiesInside > 0) {
            ctx.fillStyle = '#ff007f';
            ctx.font = '10px Orbitron';
            ctx.fillText(`HIDDEN:${d.bodiesInside}`, d.x - 20, d.y - 20);
        }
    });

    // Draw dead bodies
    state.deadBodies.forEach(b => {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.font = '22px Arial';
        ctx.fillText(b.isVIP ? '💀👔' : '💀👮', -12, 6);
        ctx.restore();
        
        if (b.isVIP) {
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 22, 0, Math.PI*2);
            ctx.stroke();
        }
    });

    // Draw dropped uniforms
    state.droppedUniforms.forEach(u => {
        ctx.font = '20px Arial';
        ctx.fillText('👔', u.x - 10, u.y + 6);
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(u.x, u.y, 16, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Draw Terminals
    state.terminals.forEach(t => {
        t.pulse = (t.pulse + 0.05) % (Math.PI * 2);
        if (!t.hacked) {
            ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
            ctx.strokeStyle = varColor('--neon-cyan');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 15 + Math.sin(t.pulse) * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🖥️', t.x, t.y);
        } else {
            ctx.fillStyle = 'rgba(0, 255, 102, 0.2)';
            ctx.strokeStyle = varColor('--neon-green');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🟢', t.x, t.y);
        }
    });

    // Draw Chests
    state.chests.forEach(c => {
        if (!c.opened) {
            ctx.font = '22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📦', c.x, c.y);
        }
    });

    // Draw Laser Gates
    state.lasers.forEach(l => {
        if (l.active) {
            ctx.strokeStyle = varColor('--neon-pink');
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = varColor('--neon-pink');
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            ctx.lineTo(l.x2, l.y2);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(l.x1, l.y1, 6, 0, Math.PI * 2);
            ctx.arc(l.x2, l.y2, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw Coins in flight
    state.thrownCoins.forEach(coin => {
        const cx = coin.x + (coin.tx - coin.x) * coin.progress;
        const cy = coin.y + (coin.ty - coin.y) * coin.progress;
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI*2);
        ctx.fill();
    });

    // Draw Cameras
    state.cameras.forEach(c => {
        const isDis = c.disabledTimer && c.disabledTimer > 0;
        
        ctx.save();
        ctx.translate(c.x, c.y);
        
        if (!isDis) {
            ctx.fillStyle = state.alerts.active ? 'rgba(255, 0, 127, 0.15)' : 'rgba(0, 229, 255, 0.12)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, c.range, c.angle - c.fov / 2, c.angle + c.fov / 2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.rotate(c.angle);
        ctx.fillStyle = isDis ? '#475569' : '#1e293b';
        ctx.strokeStyle = isDis ? '#64748b' : varColor('--neon-cyan');
        ctx.lineWidth = 2;
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = isDis ? '#94a3b8' : '#e11d48';
        ctx.fillRect(8, -4, 6, 8);
        ctx.restore();
    });

    // Draw Guard Vision Cones & Guard details
    state.guards.forEach(g => {
        const hasDisguise = state.player && state.player.disguise === 'GUARD' && !g.isVIP;
        
        ctx.fillStyle = g.state === 'CHASE' ? 'rgba(255, 0, 80, 0.15)' : 
                       (hasDisguise ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 234, 0, 0.12)');
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        const visDist = hasDisguise ? 60 : 160;
        ctx.arc(g.x, g.y, visDist, g.angle - 0.6, g.angle + 0.6);
        ctx.closePath();
        ctx.fill();
        
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.angle);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();
        ctx.restore();

        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(g.isVIP ? '👨‍🔬' : '👮', g.x, g.y);

        if (g.isVIP) {
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(g.x, g.y, 22, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = '#ff0055';
            ctx.font = 'bold 10px Orbitron';
            ctx.fillText('TARGET', g.x, g.y - 25);
        } else if (g.isEnforcer) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(g.x, g.y - 20, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        if (g.state === 'CHASE') {
            ctx.fillStyle = '#ff0055';
            ctx.font = 'bold 12px Orbitron';
            ctx.fillText('COMBAT', g.x, g.y - (g.isVIP ? 38 : 25));
        } else if (g.state === 'INSPECT') {
            ctx.fillStyle = '#ffea00';
            ctx.font = 'bold 12px Orbitron';
            ctx.fillText('INSPECT', g.x, g.y - (g.isVIP ? 38 : 25));
        }

        ctx.fillStyle = '#1e1e2f';
        ctx.fillRect(g.x - 15, g.y + 18, 30, 4);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(g.x - 15, g.y + 18, 30 * (g.hp / (g.isVIP ? 40 : 50 + state.run.floor * 10)), 4);
    });

    // Draw visual active clouds
    state.particles.forEach(p => {
        if (p.type === 'ACID_CLOUD') {
            ctx.fillStyle = 'rgba(0, 255, 102, 0.15)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            if (Math.random() < 0.2) {
                ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
                ctx.beginPath();
                ctx.arc(p.x + Math.random() * 80 - 40, p.y + Math.random() * 80 - 40, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        else if (p.type === 'DECOY_BOT') {
            ctx.font = '18px Arial';
            ctx.fillText('🪵', p.bot.x, p.bot.y);
            ctx.strokeStyle = varColor('--neon-yellow');
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.bot.x, p.bot.y, 15 + Math.sin(Date.now() / 100) * 10, 0, Math.PI*2);
            ctx.stroke();
        }
    });

    // Draw Bullets
    state.bullets.forEach(b => {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
    });

    // GORE: Draw flying meat gibs
    state.gibs.forEach(g => {
        ctx.fillStyle = 'rgba(160, 10, 20, 0.9)';
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI*2);
        ctx.fill();
    });

    // GORE: Draw slash red visual sweep arcs
    state.slashes.forEach(s => {
        ctx.strokeStyle = 'rgba(255, 0, 50, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, s.angle - 0.7, s.angle + 0.7);
        ctx.stroke();
    });

    // Draw Player
    if (state.player && state.player.hp > 0) {
        ctx.save();
        ctx.translate(state.player.x, state.player.y);
        
        if (state.player.currentNoise > 0) {
            ctx.strokeStyle = state.player.currentNoise > 50 ? 'rgba(255, 0, 127, 0.3)' : 'rgba(0, 229, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, state.player.currentNoise * 1.5, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.rotate(state.player.angle);
        ctx.strokeStyle = varColor('--neon-green');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(22, 0);
        ctx.stroke();
        ctx.restore();

        const info = ROSTER.find(r => r.id === state.selectedId);
        
        ctx.font = '26px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (state.player.burrowTimer > 0) {
            ctx.font = '18px Arial';
            ctx.fillText('🕳️', state.player.x, state.player.y);
        } else {
            ctx.fillText(info.emoji, state.player.x, state.player.y);
            
            if (state.player.disguise === 'GUARD') {
                ctx.font = '12px Arial';
                ctx.fillText('👮', state.player.x + 10, state.player.y - 12);
            }
        }
    }

    // Shadow Radar
    const isHawkRecon = state.player && state.player.reconActiveTimer && state.player.reconActiveTimer > 0;
    if (state.player && !isHawkRecon) {
        const rad = 220 + (state.run.upgrades.vision * 35);
        const grad = ctx.createRadialGradient(state.player.x, state.player.y, rad * 0.4, state.player.x, state.player.y, rad);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.92)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, Math.max(state.map.cols * TILE_SIZE, state.map.rows * TILE_SIZE), 0, Math.PI*2);
        ctx.fill();
    }
    
    if (state.player && state.player.reconActiveTimer && state.player.reconActiveTimer > 0) {
        state.player.reconActiveTimer--;
    }

    state.particles.forEach(p => {
        if (!p.type) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
        }
    });

    ctx.restore();
}

function varColor(cssVar) {
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
}

// User Actions - State Managers
function changeState(newMode) {
    state.mode = newMode;
    
    document.getElementById('mainMenuScreen').classList.add('hidden');
    document.getElementById('charSelectScreen').classList.add('hidden');
    document.getElementById('guideOverlay').classList.add('hidden');
    document.getElementById('elevatorShopOverlay').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('gameMain').classList.add('hidden');

    if (newMode === 'MENU') {
        document.getElementById('mainMenuScreen').classList.remove('hidden');
    }
    else if (newMode === 'SELECT') {
        document.getElementById('charSelectScreen').classList.remove('hidden');
        renderRosterGrid();
    }
    else if (newMode === 'PLAY') {
        document.getElementById('gameMain').classList.remove('hidden');
    }
    else if (newMode === 'SHOP') {
        document.getElementById('elevatorShopOverlay').classList.remove('hidden');
        renderShopUpgrades();
    }
    else if (newMode === 'GAMEOVER') {
        document.getElementById('gameOverScreen').classList.remove('hidden');
        
        const info = ROSTER.find(r => r.id === state.selectedId);
        document.getElementById('finalAgent').textContent = `${info.emoji} ${info.name}`;
        document.getElementById('finalFloor').textContent = `Complex Floor ${state.run.floor}`;
        
        let totalScore = state.run.score;
        let saRatingText = "NO";
        if (state.run.silentAssassin) {
            totalScore += 2500 * state.run.floor;
            saRatingText = "YES (👑 SILENT ASSASSIN BONUS +2500/FLR!)";
        }
        
        document.getElementById('finalKills').innerHTML = `${state.run.kills} (Silent Assassin: <span style="color:${state.run.silentAssassin?'#00ff66':'#ff0055'}">${saRatingText}</span>)`;
        document.getElementById('finalDNA').textContent = state.run.dna;
        document.getElementById('finalScore').textContent = totalScore;
    }
    else if (newMode === 'PAUSE') {
        document.getElementById('pauseScreen').classList.remove('hidden');
    }
}

// Animal Selection Interface Grid
function renderRosterGrid() {
    const grid = document.getElementById('charRosterGrid');
    grid.innerHTML = '';
    
    ROSTER.forEach(r => {
        const card = document.createElement('div');
        card.className = `char-card ${r.id === state.selectedId ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="card-emoji">${r.emoji}</div>
            <div class="card-name">${r.name.split('-')[1] || r.name}</div>
        `;
        card.addEventListener('click', () => {
            state.selectedId = r.id;
            synth.play(500, 'sine', 0.1, 0.05);
            renderRosterGrid();
            updateCharDetailPanel(r);
        });
        grid.appendChild(card);
    });

    const activeInfo = ROSTER.find(r => r.id === state.selectedId);
    updateCharDetailPanel(activeInfo);
}

function updateCharDetailPanel(r) {
    document.getElementById('detailsEmoji').textContent = r.emoji;
    document.getElementById('detailsName').textContent = r.name;
    document.getElementById('detailsRole').textContent = r.role.toUpperCase();
    document.getElementById('detailsDesc').textContent = r.desc;
    
    document.getElementById('statBarHP').style.width = `${r.statsPercent.hp}%`;
    document.getElementById('statBarSpeed').style.width = `${r.statsPercent.speed}%`;
    document.getElementById('statBarStealth').style.width = `${r.statsPercent.stealth}%`;
    document.getElementById('statBarNoise').style.width = `${r.statsPercent.noise}%`;
    
    document.getElementById('detailsPrimary').innerHTML = `<strong>${r.primaryName}</strong>: ${r.primaryDesc}`;
    document.getElementById('detailsSpecial').innerHTML = `<strong>${r.specialName}</strong>: ${r.specialDesc}`;
    document.getElementById('detailsPassive').innerHTML = r.passiveDesc;
}

// Upgrades shop
function renderShopUpgrades() {
    document.getElementById('shopDNACount').textContent = state.run.dna;
    document.getElementById('shopFloorIndex').textContent = state.run.floor;

    const list = document.getElementById('shopUpgradesList');
    list.innerHTML = '';

    const shuffled = [...UPGRADES].sort(() => 0.5 - Math.random()).slice(0, 3);
    
    shuffled.forEach(u => {
        const lvl = state.run.upgrades[u.id];
        const cost = Math.floor(u.cost * (1 + lvl * 0.5));
        
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
            <div class="upgrade-icon">${getUpgradeIcon(u.id)}</div>
            <div class="upgrade-details">
                <h3>${u.name} (LVL ${lvl})</h3>
                <p>${u.desc}</p>
                <div class="upgrade-cost">Cost: 🧬 ${cost} DNA</div>
            </div>
            <button class="btn btn-upgrade" ${state.run.dna < cost ? 'disabled' : ''}>Mutate</button>
        `;

        card.querySelector('.btn-upgrade').addEventListener('click', () => {
            if (state.run.dna >= cost) {
                state.run.dna -= cost;
                state.run.upgrades[u.id]++;
                synth.playLevelUp();
                renderShopUpgrades();
            }
        });

        list.appendChild(card);
    });
}

function getUpgradeIcon(id) {
    if (id === 'health') return '🩸';
    if (id === 'speed') return '🏃‍♂️';
    if (id === 'damage') return '💪';
    if (id === 'vision') return '👁️';
    if (id === 'noise') return '🔕';
    return '⏱️';
}

function handleElevatorUnlock() {
    changeState('SHOP');
}

function handlePlayerDeath() {
    synth.playFailure();
    triggerBloodSplatter(state.player.x, state.player.y, 60);
    spawnGibs(state.player.x, state.player.y, 10);
    state.player.hp = 0;
    setTimeout(() => changeState('GAMEOVER'), 1000);
}

// Guide roster lists
function renderFieldGuideRoster() {
    const list = document.getElementById('guideAgentsList');
    list.innerHTML = '';
    ROSTER.forEach(r => {
        const row = document.createElement('div');
        row.className = 'guide-agent-row';
        row.innerHTML = `
            <div class="guide-row-emoji">${r.emoji}</div>
            <div class="guide-row-text">
                <h4>${r.name} - ${r.role}</h4>
                <p>${r.desc}</p>
                <div class="tag-list">
                    <span class="tag-badge badge-ability">Ability: ${r.specialName}</span>
                    <span class="tag-badge badge-passive">Trait: ${r.primaryName}</span>
                </div>
            </div>
        `;
        list.appendChild(row);
    });
}

// Document bindings event listeners
function bindGameEvents() {
    // Keyboard inputs
    window.addEventListener('keydown', e => {
        state.keys[e.code] = true;
        
        if (e.code === 'KeyP' || e.code === 'Escape') {
            if (state.mode === 'PLAY') changeState('PAUSE');
            else if (state.mode === 'PAUSE') changeState('PLAY');
        }

        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyF') {
            triggerSpecialAbility();
        }

        if (e.code === 'KeyG') {
            toggleDragBody();
        }

        if (e.code === 'KeyE') {
            handleInteraction();
        }
    });

    window.addEventListener('keyup', e => {
        state.keys[e.code] = false;
    });

    // Mouse updates
    const getMousePos = (canvas, evt) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((evt.clientX - rect.left) / rect.width) * canvas.width,
            y: ((evt.clientY - rect.top) / rect.height) * canvas.height
        };
    };

    canvas.addEventListener('mousemove', e => {
        const pos = getMousePos(canvas, e);
        state.mouse.x = pos.x;
        state.mouse.y = pos.y;
    });

    canvas.addEventListener('mousedown', e => {
        if (e.button === 0) {
            triggerPrimaryAttack();
        } else if (e.button === 2) {
            e.preventDefault();
            const worldClickX = state.mouse.x + state.camera.x;
            const worldClickY = state.mouse.y + state.camera.y;
            tossCoin(worldClickX, worldClickY);
        }
    });

    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Navigation buttons binding
    document.getElementById('btnGoToCharSelect').addEventListener('click', () => {
        synth.play(600, 'sine', 0.1, 0.05);
        changeState('SELECT');
    });

    document.getElementById('btnOpenGuide').addEventListener('click', () => {
        synth.play(600, 'sine', 0.1, 0.05);
        renderFieldGuideRoster();
        document.getElementById('guideOverlay').classList.remove('hidden');
    });

    document.getElementById('btnCloseGuide').addEventListener('click', () => {
        synth.play(400, 'sine', 0.1, 0.05);
        document.getElementById('guideOverlay').classList.add('hidden');
    });

    document.getElementById('btnResumeFromGuide').addEventListener('click', () => {
        synth.play(500, 'sine', 0.1, 0.05);
        document.getElementById('guideOverlay').classList.add('hidden');
    });

    const tabs = document.querySelectorAll('.guide-tab');
    tabs.forEach(t => {
        t.addEventListener('click', () => {
            synth.play(500, 'sine', 0.08, 0.05);
            tabs.forEach(tab => tab.classList.remove('active'));
            t.classList.add('active');
            
            const paneId = `guide-pane-${t.getAttribute('data-guide-tab')}`;
            document.querySelectorAll('.guide-pane').forEach(p => p.classList.remove('active'));
            document.getElementById(paneId).classList.add('active');
        });
    });

    document.getElementById('btnBackToMenu').addEventListener('click', () => {
        synth.play(400, 'sine', 0.1, 0.05);
        changeState('MENU');
    });

    document.getElementById('btnLaunchRun').addEventListener('click', () => {
        synth.play(800, 'sine', 0.15, 0.08);
        initRun();
        changeState('PLAY');
    });

    // Pause systems
    document.getElementById('btnPauseGame').addEventListener('click', () => {
        changeState('PAUSE');
    });
    document.getElementById('btnResumeMission').addEventListener('click', () => {
        changeState('PLAY');
    });
    document.getElementById('btnRestartFromPause').addEventListener('click', () => {
        initRun();
        changeState('PLAY');
    });
    document.getElementById('btnPauseToMenu').addEventListener('click', () => {
        changeState('MENU');
    });

    // Shop descent
    document.getElementById('btnDescendNextFloor').addEventListener('click', () => {
        synth.playLevelUp();
        state.run.floor++;
        launchFloor();
        changeState('PLAY');
    });

    // Game over actions
    document.getElementById('btnRestartRun').addEventListener('click', () => {
        initRun();
        changeState('PLAY');
    });
    document.getElementById('btnGameOverToMenu').addEventListener('click', () => {
        changeState('MENU');
    });
}

// 60FPS Game Loop
function gameLoop(timestamp) {
    if (state.mode === 'PLAY') {
        updateGame();
        drawGame();
    }
    requestAnimationFrame(gameLoop);
}

// Run loader
bindGameEvents();
requestAnimationFrame(gameLoop);
changeState('MENU');

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = {
    name: "Assassin Animals",
    getScore: () => state.run.score,
    setScore: (s) => { state.run.score = s; },
    getHealth: () => state.player ? state.player.hp : 0,
    setHealth: (h) => { if (state.player) state.player.hp = h; },
    getDNA: () => state.run.dna,
    setDNA: (d) => { state.run.dna = d; document.getElementById('hudDNA').textContent = d; },
    win: () => {
        state.run.hasKey = true;
        document.getElementById('hudKey').textContent = '🔑 YES';
        changeState('SHOP');
    },
    lose: () => {
        changeState('GAMEOVER');
    },
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};
