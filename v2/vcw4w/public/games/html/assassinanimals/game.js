/**
 * AssassinAnimals - Tactical Stealth-Action Rogue-like Engine
 * Inspired by Hitman, featuring 9 unique animal operatives, body dragging, disguises,
 * throwing coin distractions, silent takedowns, tactical gadgets, procedural complexes,
 * extreme gore feedback, and dynamic procedural Web Audio synthesizer.
 */

(function() {
    'use strict';

    // ==========================================
    // 1. PROCEDURAL WEB AUDIO SYNTHESIZER & MUSIC
    // ==========================================
    const audio = {
        ctx: null,
        musicGain: null,
        sfxGain: null,
        masterGain: null,
        muted: false,
        musicPlaying: false,
        musicTimer: null,
        musicStep: 0,
        currentMode: 'STEALTH', // 'STEALTH' or 'COMBAT'

        init() {
            if (this.ctx) return;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.startMusic();
        },

        ensureActive() {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },

        toggleMute() {
            this.ensureActive();
            this.muted = !this.muted;
            if (this.masterGain) {
                this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime);
            }
            return !this.muted;
        },

        setMode(mode) {
            this.currentMode = mode;
        },

        startMusic() {
            if (this.musicPlaying) return;
            this.musicPlaying = true;
            this.musicStep = 0;
            const stepDuration = 140; // ~107 BPM 16th-notes

            const tick = () => {
                if (!this.muted && this.ctx && this.ctx.state === 'running') {
                    this.playMusicStep(this.musicStep, this.currentMode);
                }
                this.musicStep = (this.musicStep + 1) % 16;
                this.musicTimer = setTimeout(tick, stepDuration);
            };
            this.musicTimer = setTimeout(tick, stepDuration);
        },

        playMusicStep(step, mode) {
            const now = this.ctx.currentTime;

            // Stealth Bassline Notes (A minor / D minor progression)
            const stealthNotes = [110, 0, 110, 130.81, 0, 110, 146.83, 0, 98, 0, 98, 123.47, 0, 98, 110, 0];
            // Combat High-Energy Notes
            const combatNotes = [110, 110, 164.81, 110, 146.83, 110, 130.81, 146.83, 98, 98, 146.83, 98, 130.81, 98, 123.47, 130.81];

            const freq = mode === 'COMBAT' ? combatNotes[step] : stealthNotes[step];

            if (freq > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();

                osc.type = mode === 'COMBAT' ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(freq, now);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(mode === 'COMBAT' ? 650 : 350, now);
                filter.Q.setValueAtTime(mode === 'COMBAT' ? 4 : 2, now);

                const vol = mode === 'COMBAT' ? 0.28 : 0.18;
                gain.gain.setValueAtTime(vol, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicGain);

                osc.start(now);
                osc.stop(now + 0.19);
            }

            // Percussion / Hi-Hat Noise
            if (step % 2 === 0 || (mode === 'COMBAT' && step % 4 === 2)) {
                this.playSynthHat(mode === 'COMBAT' ? 0.05 : 0.02);
            }

            // Combat Kick & Snare
            if (mode === 'COMBAT') {
                if (step === 0 || step === 8) {
                    this.playSynthKick();
                } else if (step === 4 || step === 12) {
                    this.playSynthSnare();
                }
            }
        },

        playSynthKick() {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(32, now + 0.1);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + 0.12);
        },

        playSynthSnare() {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.08;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(1200, now);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);
            noise.start(now);
        },

        playSynthHat(vol = 0.03) {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.03;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(8000, now);
            filter.Q.setValueAtTime(3, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);
            noise.start(now);
        },

        // Sound Effects
        playTone(freq, type, duration, volume = 0.1) {
            this.ensureActive();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + duration);
        },

        playSlice() {
            this.ensureActive();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(360, now);
            osc.frequency.exponentialRampToValueAtTime(65, now + 0.12);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.12);
        },

        playTakedown() {
            this.ensureActive();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            // Crisp snap + deep choke thud
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc1.type = 'square';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(180, now);
            osc1.frequency.exponentialRampToValueAtTime(40, now + 0.18);
            osc2.frequency.setValueAtTime(90, now);
            osc2.frequency.exponentialRampToValueAtTime(25, now + 0.25);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.sfxGain);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.25);
            osc2.stop(now + 0.25);
        },

        playHeavySlam() {
            this.ensureActive();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(130, now);
            osc.frequency.exponentialRampToValueAtTime(25, now + 0.38);
            gain.gain.setValueAtTime(0.38, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.38);
        },

        playHacking() {
            this.playTone(950, 'sine', 0.07, 0.08);
            setTimeout(() => this.playTone(1900, 'sine', 0.08, 0.08), 70);
            setTimeout(() => this.playTone(2850, 'sine', 0.1, 0.08), 140);
        },

        playAlarm() {
            this.ensureActive();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(650, now);
            osc.frequency.linearRampToValueAtTime(880, now + 0.2);
            osc.frequency.linearRampToValueAtTime(650, now + 0.4);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.45);
        },

        playGunshot() {
            this.ensureActive();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.15;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1400, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.15);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(now);
        },

        playCoin() {
            this.ensureActive();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(1046.5, now);
            osc2.frequency.setValueAtTime(1567.98, now + 0.06);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.sfxGain);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.35);
            osc2.stop(now + 0.35);
        },

        playDart() {
            this.ensureActive();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.09);
        },

        playSmoke() {
            this.ensureActive();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * 0.45;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(700, now);
            filter.Q.setValueAtTime(1.5, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(now);
        },

        playSuspicious() {
            this.playTone(480, 'triangle', 0.12, 0.08);
            setTimeout(() => this.playTone(720, 'triangle', 0.15, 0.08), 90);
        },

        playAlert() {
            this.playTone(880, 'sawtooth', 0.18, 0.14);
            setTimeout(() => this.playTone(1174, 'sawtooth', 0.22, 0.14), 80);
        },

        playLevelUp() {
            const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
            notes.forEach((f, i) => {
                setTimeout(() => this.playTone(f, 'triangle', 0.3, 0.1), i * 90);
            });
        },

        playFailure() {
            const notes = [360, 320, 270, 180];
            notes.forEach((f, i) => {
                setTimeout(() => this.playTone(f, 'sawtooth', 0.35, 0.12), i * 110);
            });
        }
    };

    // ==========================================
    // 2. OPERATIVE ROSTER (9 UNIQUE ANIMALS)
    // ==========================================
    const ROSTER = [
        {
            id: "panther",
            name: "Cyber-Panther",
            emoji: "🐱",
            role: "Stealth Specialist",
            desc: "Apex infiltration operative with light-bending shadow camouflage. Executes lethal silent strikes from behind.",
            hp: 100,
            speed: 4.6,
            stealth: 100,
            noise: 15,
            primaryName: "Silent Claws",
            primaryDesc: "Instant kill from behind (140 dmg, zero noise), 40 frontal damage.",
            specialName: "Assassination Pounce",
            specialDesc: "Leaps forward 140px. Executes the first guard hit silently. 6s cooldown.",
            specialCooldown: 6000,
            passiveDesc: "Shadow Camo: Invisible while stationary in foliage or shadows. Crawls smoothly through wall vents.",
            statsPercent: { hp: 60, speed: 88, stealth: 100, noise: 15 }
        },
        {
            id: "gorilla",
            name: "Mech-Gorilla",
            emoji: "🦍",
            role: "Heavy Brawler",
            desc: "Heavy cybernetic combat suit. Shrugs off ballistic fire and smashes guards through security barriers.",
            hp: 190,
            speed: 3.3,
            stealth: 30,
            noise: 75,
            primaryName: "Titanium Fists",
            primaryDesc: "Heavy punch deals 65 damage and stuns targets against walls.",
            specialName: "Tectonic Ground Slam",
            specialDesc: "Slams the floor, damaging (55 dmg) and stunning all guards in 130px radius. Shatters laser emitters. 7.5s cooldown.",
            specialCooldown: 7500,
            passiveDesc: "Kinetic Armor: Absorbs 40% of all incoming damage. Heavy footsteps (cannot use vents).",
            statsPercent: { hp: 100, speed: 52, stealth: 30, noise: 75 }
        },
        {
            id: "cobra",
            name: "Nano-Cobra",
            emoji: "🐍",
            role: "Poison Specialist",
            desc: "Genetically modified serpent operative. Moves in complete silence and exhales corrosive chemical weapons.",
            hp: 95,
            speed: 4.1,
            stealth: 95,
            noise: 0,
            primaryName: "Neurotoxic Strike",
            primaryDesc: "Deals 25 impact damage, then inflicts poison dealing 16 dmg/sec for 5 seconds.",
            specialName: "Corrosive Acid Cloud",
            specialDesc: "Spits a dense acid cloud that completely blocks vision cones and blinds guards entering it. 7s cooldown.",
            specialCooldown: 7000,
            passiveDesc: "Silent Slither: Completely silent movement (Noise 0). Immune to laser tripwires. Squeezes through vents.",
            statsPercent: { hp: 50, speed: 72, stealth: 95, noise: 0 }
        },
        {
            id: "hawk",
            name: "Shadow-Hawk",
            emoji: "🦅",
            role: "Recon & Intel",
            desc: "Avian scout hybrid equipped with thermal imaging arrays. Spots targets through solid walls and glides over hazards.",
            hp: 85,
            speed: 5.1,
            stealth: 80,
            noise: 35,
            primaryName: "Talon Strike",
            primaryDesc: "Rapid slashing strikes dealing 35 damage with quick recovery.",
            specialName: "Sensor Recon Ping",
            specialDesc: "Sends thermal sonar revealing all guards, cameras, terminals, and items through walls for 10 seconds. 11s cooldown.",
            specialCooldown: 11000,
            passiveDesc: "Glider Hover: Glides over floor hazard traps, blood pools, and ground security lasers with enhanced speed.",
            statsPercent: { hp: 45, speed: 96, stealth: 80, noise: 35 }
        },
        {
            id: "badger",
            name: "Psycho-Badger",
            emoji: "🦡",
            role: "Burrowing Berserker",
            desc: "Fearless honey badger with titanium claws. Burrows under the security deck to ambush enemies and enters frenzy states.",
            hp: 115,
            speed: 3.9,
            stealth: 65,
            noise: 45,
            primaryName: "Frenzy Claws",
            primaryDesc: "Deals 30 damage. Attack speed doubles when below 50% HP.",
            specialName: "Burrow Tunnel",
            specialDesc: "Digs underground for 4.5 seconds, becoming completely invulnerable and able to move through solid walls. 9s cooldown.",
            specialCooldown: 9000,
            passiveDesc: "Berserk Enrage: Automatically triggers 4 seconds of invulnerability and rage speed when HP drops below 35%.",
            statsPercent: { hp: 65, speed: 68, stealth: 65, noise: 45 }
        },
        {
            id: "octopus",
            name: "Cyber-Octopus",
            emoji: "🐙",
            role: "Infiltrator / Hacker",
            desc: "Camouflage master with cybernetic hacking tentacles. Disrupts security mainframes and wraps guards cleanly.",
            hp: 95,
            speed: 3.6,
            stealth: 90,
            noise: 25,
            primaryName: "Tentacle Constrict",
            primaryDesc: "Silent stranglehold that pacifies guards without alarming nearby patrols.",
            specialName: "Mainframe EMP Overload",
            specialDesc: "Remotely shuts down all cameras, turrets, and laser gates within 220px range for 10 seconds. 8.5s cooldown.",
            specialCooldown: 8500,
            passiveDesc: "Adaptive Chromatophores: Guard and camera detection rate is reduced by 75% when moving slowly. Can use vents.",
            statsPercent: { hp: 55, speed: 58, stealth: 90, noise: 25 }
        },
        {
            id: "kangaroo",
            name: "Jet-Kangaroo",
            emoji: "🦘",
            role: "Agility Combatant",
            desc: "Equipped with twin pneumatic rocket thrusters. Bounces over obstacles and delivers bone-crushing piston kicks.",
            hp: 125,
            speed: 4.8,
            stealth: 55,
            noise: 55,
            primaryName: "Piston Kick",
            primaryDesc: "Deals 50 damage and knocks guards backwards, stunning them if they collide with walls.",
            specialName: "Rocket Thruster Dash",
            specialDesc: "Ignites explosive twin rocket thrusters, dashing forward and knocking down all guards in vector. 5s cooldown.",
            specialCooldown: 5000,
            passiveDesc: "Agility Leap: Can jump over guard vision cones and floor tripwires. Faster stun recovery.",
            statsPercent: { hp: 70, speed: 92, stealth: 55, noise: 55 }
        },
        {
            id: "beaver",
            name: "Electro-Beaver",
            emoji: "🦫",
            role: "Saboteur Engineer",
            desc: "Master saboteur utilizing high-speed plasma blades and deployable distraction bots to disrupt security networks.",
            hp: 105,
            speed: 3.7,
            stealth: 75,
            noise: 40,
            primaryName: "Circular Plasma Saw",
            primaryDesc: "High-RPM plasma saw deals 35 damage and tears through mechanical defenses.",
            specialName: "Deploy Decoy Drone",
            specialDesc: "Deploys a noisy decoy bot that lures guards away, then detonates with a blinding stun flash. 8s cooldown.",
            specialCooldown: 8000,
            passiveDesc: "Circuit Chewer: Automatically cuts and disables laser tripwires upon contact without raising alarms. Can use vents.",
            statsPercent: { hp: 60, speed: 64, stealth: 75, noise: 40 }
        },
        {
            id: "rhino",
            name: "Heavy-Rhino",
            emoji: "🦏",
            role: "Unstoppable Juggernaut",
            desc: "Clad in composite ballistic armor plating. Charges forward with immense kinetic power, crushing obstacles.",
            hp: 210,
            speed: 3.1,
            stealth: 15,
            noise: 85,
            primaryName: "Horn Impale",
            primaryDesc: "Devastating frontal puncture dealing 75 damage.",
            specialName: "Demolition Charge",
            specialDesc: "Charges forward at extreme speed, smashing through minor guards and cracking doors. 9.5s cooldown.",
            specialCooldown: 9500,
            passiveDesc: "Frontal Bulwark: Immune to ballistic bullets hitting from the front while moving forward. Huge health pool.",
            statsPercent: { hp: 100, speed: 45, stealth: 15, noise: 85 }
        }
    ];

    // ==========================================
    // 3. DNA UPGRADES IN ELEVATOR SHOP
    // ==========================================
    const UPGRADES = [
        { id: "health", name: "Chitin Plating", desc: "+25 Max HP mutation compound", cost: 12 },
        { id: "speed", name: "Adrenaline Injector", desc: "+12% Base movement speed", cost: 10 },
        { id: "damage", name: "Carbon Claws", desc: "+25% Strike & ability damage", cost: 15 },
        { id: "vision", name: "Thermal Retinas", desc: "+20% Sight range & camera outlines", cost: 8 },
        { id: "noise", name: "Silencer Pads", desc: "-25% Footstep sound output", cost: 10 },
        { id: "cooldown", name: "Synaptic Coolers", desc: "-18% Special ability recharge time", cost: 14 }
    ];

    // ==========================================
    // 4. MAP DEFINITIONS & TILES
    // ==========================================
    const CELL = {
        FLOOR: 0,
        WALL: 1,
        VENT: 2,
        ELEVATOR: 3
    };

    const TILE_SIZE = 50;

    // ==========================================
    // 5. GLOBAL GAME STATE
    // ==========================================
    const state = {
        mode: 'MENU',
        selectedId: 'panther',
        player: null,
        run: {
            floor: 1,
            dna: 0,
            score: 0,
            kills: 0,
            pacifications: 0,
            hasKey: false,
            silentAssassin: true,
            bodiesDiscovered: 0,
            bodiesHidden: 0,
            alarmsTriggered: 0,
            knockouts: 0,
            runStartTime: 0,
            floorStartTime: 0,
            contractId: null,
            contractFailed: false,
            contractFlags: {},
            reconPingUsed: false,
            decoyUsed: false,
            hackCount: 0,
            pickpocketCount: 0,
            upgrades: { health: 0, speed: 0, damage: 0, vision: 0, noise: 0, cooldown: 0 },
            gadgets: { medkit: 1, tranq: 2, smoke: 1, decoy: 1, surge: 1 }
        },
        map: null,
        guards: [],
        cameras: [],
        lasers: [],
        chests: [],
        supplyCrates: [],
        bushes: [],
        coverCrates: [],
        terminals: [],
        particles: [],
        bullets: [],
        projectiles: [],
        droppedUniforms: [],
        deadBodies: [],
        dumpsters: [],
        thrownCoins: [],
        floorBlood: [],
        gibs: [],
        slashes: [],
        floatingTexts: [],
        smokeClouds: [],
        screenShake: { intensity: 0, duration: 0 },
        alerts: { active: false, timer: 0 },
        hack: { active: false, target: null, kind: null, progress: 0, required: 120 },
        surge: { active: false, timer: 0 },
        drones: [],
        camera: { x: 0, y: 0 },
        keys: {},
        mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
        touch: {
            enabled: false,
            joystickActive: false,
            startX: 0,
            startY: 0,
            moveX: 0,
            moveY: 0
        },
        currentContextAction: null
    };

    // Canvas references
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // ==========================================
    // 6. RESPONSIVE CANVAS RESIZE
    // ==========================================
    function resizeCanvas() {
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Logical internal resolution maintains crisp aspect ratio
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 100));

    // Starfield Background
    const starfieldCanvas = document.getElementById('TEMPLATE-4weird-starfield');
    if (starfieldCanvas) {
        const sctx = starfieldCanvas.getContext('2d');
        let width = starfieldCanvas.width = window.innerWidth;
        let height = starfieldCanvas.height = window.innerHeight;
        const stars = Array.from({ length: 70 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.5,
            speed: Math.random() * 0.2 + 0.05
        }));

        function drawStars() {
            sctx.fillStyle = '#06060e';
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
        window.addEventListener('resize', () => {
            width = starfieldCanvas.width = window.innerWidth;
            height = starfieldCanvas.height = window.innerHeight;
        });
    }

    // ==========================================
    // 7. PROCEDURAL LEVEL GENERATOR
    // ==========================================
    function generateProceduralMap(floorNum) {
        const cols = 28 + Math.min(12, floorNum * 2);
        const rows = 20 + Math.min(10, floorNum * 2);
        const grid = Array.from({ length: rows }, () => Array(cols).fill(CELL.WALL));

        const rooms = [];
        const minRoomSize = 6;
        const maxRoomSize = 10;
        const roomCount = 6 + Math.min(6, floorNum);

        for (let attempts = 0; attempts < 140; attempts++) {
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

        // Carve connecting corridors
        for (let i = 0; i < rooms.length - 1; i++) {
            carveCorridor(grid, rooms[i].cx, rooms[i].cy, rooms[i + 1].cx, rooms[i + 1].cy);
        }

        // Add loop corridor for tactical flanking routes
        if (rooms.length >= 4) {
            carveCorridor(grid, rooms[0].cx, rooms[0].cy, rooms[rooms.length - 2].cx, rooms[rooms.length - 2].cy);
        }

        // Place ventilation shafts between adjacent rooms or corridors
        rooms.forEach((r, idx) => {
            if (idx > 0 && Math.random() < 0.6) {
                const sides = [
                    { x: r.cx, y: r.y - 1, checkY: r.y - 2 },
                    { x: r.cx, y: r.y + r.h, checkY: r.y + r.h + 1 },
                    { x: r.x - 1, y: r.cy, checkX: r.x - 2 },
                    { x: r.x + r.w, y: r.cy, checkX: r.x + r.w + 1 }
                ];
                sides.forEach(s => {
                    if (s.y > 0 && s.y < rows - 1 && s.x > 0 && s.x < cols - 1) {
                        grid[s.y][s.x] = CELL.VENT;
                    }
                });
            }
        });

        const spawnRoom = rooms[0];
        const elevatorRoom = rooms[rooms.length - 1];
        grid[elevatorRoom.cy][elevatorRoom.cx] = CELL.ELEVATOR;

        return {
            grid,
            cols,
            rows,
            spawn: { x: spawnRoom.cx * TILE_SIZE + TILE_SIZE / 2, y: spawnRoom.cy * TILE_SIZE + TILE_SIZE / 2 },
            elevator: { x: elevatorRoom.cx * TILE_SIZE + TILE_SIZE / 2, y: elevatorRoom.cy * TILE_SIZE + TILE_SIZE / 2 },
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

    // Line of sight raycasting check
    function isLineBlocked(x1, y1, x2, y2, mapGrid) {
        const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 10);
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

            // Cover crates also block line of sight
            for (let crate of state.coverCrates) {
                if (Math.hypot(crate.x - checkX, crate.y - checkY) < crate.r) {
                    return true;
                }
            }

            // Smoke clouds block line of sight
            for (let smoke of state.smokeClouds) {
                if (Math.hypot(smoke.x - checkX, smoke.y - checkY) < smoke.r) {
                    return true;
                }
            }
        }
        return false;
    }

    // ==========================================
    // 8. SCREEN SHAKE & FLOATING POPUPS
    // ==========================================
    function triggerScreenShake(intensity = 8, duration = 15) {
        state.screenShake.intensity = intensity;
        state.screenShake.duration = duration;
    }

    // Agent D (presentation) hook: broadcast game moments without touching systems.
    function emitAssassinEvent(name, detail) {
        try {
            window.dispatchEvent(new CustomEvent('assassin:' + name, { detail: detail || {} }));
        } catch (e) { /* never throw into game loop */ }
    }

    function spawnFloatingText(x, y, text, color = '#ffffff', size = 13) {
        state.floatingTexts.push({
            x,
            y,
            text,
            color,
            size,
            vy: -1.2,
            life: 55,
            maxLife: 55
        });
    }

    // ==========================================
    // 9. GORE & PARTICLE SYSTEM
    // ==========================================
    function spawnFloorBlood(x, y, r = 12) {
        state.floorBlood.push({
            x: x + (Math.random() * 18 - 9),
            y: y + (Math.random() * 18 - 9),
            r: Math.random() * r + r / 2,
            color: `rgba(${Math.floor(180 + Math.random() * 75)}, 0, ${Math.floor(20 + Math.random() * 40)}, ${0.65 + Math.random() * 0.25})`
        });
        if (state.floorBlood.length > 550) {
            state.floorBlood.shift();
        }
    }

    function spawnGibs(x, y, amount = 5) {
        for (let i = 0; i < amount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 3;
            state.gibs.push({
                x,
                y,
                r: Math.random() * 4 + 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 70 + Math.random() * 40
            });
        }
    }

    function spawnParticle(x, y, color, size, vx, vy, life) {
        state.particles.push({ x, y, color, size, vx, vy, life, maxLife: life });
    }

    function triggerBloodSplatter(x, y, count = 25) {
        const decalsCount = Math.floor(count / 3);
        for (let d = 0; d < decalsCount; d++) {
            spawnFloorBlood(x, y, 14);
        }
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

    function triggerAcidPuff(x, y, count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 0.5;
            spawnParticle(x, y, 'rgba(0, 255, 102, 0.55)', Math.random() * 8 + 6, Math.cos(angle) * speed, Math.sin(angle) * speed, 50 + Math.random() * 30);
        }
    }

    // ==========================================
    // 10. RUN & LEVEL INITIALIZATION
    // ==========================================
    function initRun() {
        state.run.floor = 1;
        state.run.dna = 0;
        state.run.score = 0;
        state.run.kills = 0;
        state.run.pacifications = 0;
        state.run.knockouts = 0;
        state.run.hasKey = false;
        state.run.silentAssassin = true;
        state.run.bodiesDiscovered = 0;
        state.run.bodiesHidden = 0;
        state.run.alarmsTriggered = 0;
        state.run.runStartTime = Date.now();
        state.run.floorStartTime = Date.now();
        state.run.vipDeadAt = null;
        state.run.contractFailed = false;
        state.run.contractFlags = {};
        state.run.reconPingUsed = false;
        state.run.decoyUsed = false;
        state.run.hackCount = 0;
        state.run.pickpocketCount = 0;
        try {
            const api = aaGetContracts();
            if (api && typeof api.getActive === 'function') {
                const a = api.getActive();
                state.run.contractId = a ? a.id : (state.run.contractId || null);
            }
        } catch (e) {}
        // Contract operative enforcement: fall back to free run with notice
        try {
            const c = aaGetActiveContract();
            if (c && c.operative && c.operative !== 'any' && state.selectedId !== c.operative) {
                const need = ROSTER.find(r => r.id === c.operative);
                if (need) {
                    state.selectedId = c.operative;
                    try { renderRosterGrid(); } catch (e) {}
                }
            }
        } catch (e) {}
        state.run.upgrades = { health: 0, speed: 0, damage: 0, vision: 0, noise: 0, cooldown: 0 };
        state.run.gadgets = { medkit: 1, tranq: 2, smoke: 1, decoy: 1, surge: 1 };
        state.hack = { active: false, target: null, kind: null, progress: 0, required: 120 };
        state.surge = { active: false, timer: 0 };
        state.drones = [];
        state.floorBlood = [];

        launchFloor();
    }

    function launchFloor() {
        state.run.hasKey = false;
        state.alerts.active = false;
        state.alerts.timer = 0;
        audio.setMode('STEALTH');

        state.particles = [];
        state.bullets = [];
        state.projectiles = [];
        state.deadBodies = [];
        state.droppedUniforms = [];
        state.dumpsters = [];
        state.bushes = [];
        state.coverCrates = [];
        state.supplyCrates = [];
        state.thrownCoins = [];
        state.gibs = [];
        state.slashes = [];
        state.floatingTexts = [];
        state.smokeClouds = [];

        state.map = generateProceduralMap(state.run.floor);

        const info = ROSTER.find(r => r.id === state.selectedId);
        const maxHP = info.hp + (state.run.upgrades.health * 25);
        const speed = info.speed * (1 + state.run.upgrades.speed * 0.12);
        const noise = Math.max(0, info.noise * (1 - state.run.upgrades.noise * 0.25));

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
            abilityCooldownMax: info.specialCooldown * (1 - state.run.upgrades.cooldown * 0.18),
            invulnerableTimer: 0,
            burrowTimer: 0,
            rageTriggered: false,
            camoActive: false,
            inCover: false,
            disguise: 'NONE',
            draggingBody: null,
            reconActiveTimer: 0,
            dashTimer: 0,
            dashVelocityX: 0,
            dashVelocityY: 0,
            chargeTimer: 0,
            chargeAngle: 0
        };

        const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
        state.camera.x = state.player.x - logicalWidth / 2;
        state.camera.y = state.player.y - logicalHeight / 2;

        state.guards = [];
        state.cameras = [];
        state.lasers = [];
        state.chests = [];
        state.terminals = [];

        // Spawn interactive Dumpsters & Lockers
        state.map.rooms.forEach((r, idx) => {
            if (idx !== 0) {
                state.dumpsters.push({
                    x: (r.x + 1.2) * TILE_SIZE,
                    y: (r.y + 1.2) * TILE_SIZE,
                    r: 22,
                    bodiesInside: 0
                });
            }
        });

        // Spawn Bushes / Foliage for stealth cover
        state.map.rooms.forEach((r, idx) => {
            if (idx !== 0) {
                const bushCount = Math.floor(Math.random() * 3) + 1;
                for (let b = 0; b < bushCount; b++) {
                    state.bushes.push({
                        x: (r.x + 1 + Math.random() * (r.w - 2)) * TILE_SIZE,
                        y: (r.y + 1 + Math.random() * (r.h - 2)) * TILE_SIZE,
                        r: 26
                    });
                }
            }
        });

        // Spawn Cover Crates (blocks line of sight & bullets)
        state.map.rooms.forEach((r, idx) => {
            if (idx !== 0 && Math.random() < 0.75) {
                state.coverCrates.push({
                    x: (r.x + 2 + Math.random() * (r.w - 4)) * TILE_SIZE,
                    y: (r.y + 2 + Math.random() * (r.h - 4)) * TILE_SIZE,
                    r: 20
                });
            }
        });

        // Spawn Interactive Security Terminals
        const termRoom = state.map.rooms[Math.floor(Math.random() * (state.map.rooms.length - 2)) + 1];
        state.terminals.push({
            x: termRoom.cx * TILE_SIZE + TILE_SIZE / 2,
            y: termRoom.cy * TILE_SIZE + TILE_SIZE / 2,
            hacked: false,
            pulse: 0
        });

        // Spawn DNA Chests
        state.map.rooms.forEach((r, idx) => {
            if (idx !== 0 && Math.random() < 0.65) {
                state.chests.push({
                    x: (r.x + 1 + Math.random() * (r.w - 2)) * TILE_SIZE,
                    y: (r.y + 1 + Math.random() * (r.h - 2)) * TILE_SIZE,
                    dnaAmount: Math.floor(Math.random() * 4) + 4,
                    opened: false
                });
            }
        });

        // Spawn Supply Weapon Crates (Gadget pickups, incl. new decoy/surge)
        state.map.rooms.forEach((r, idx) => {
            if (idx !== 0 && Math.random() < 0.5) {
                const gadgetTypes = ['medkit', 'tranq', 'smoke', 'decoy', 'surge'];
                const loot = gadgetTypes[Math.floor(Math.random() * gadgetTypes.length)];
                state.supplyCrates.push({
                    x: (r.x + 1 + Math.random() * (r.w - 2)) * TILE_SIZE,
                    y: (r.y + 1 + Math.random() * (r.h - 2)) * TILE_SIZE,
                    loot: loot,
                    opened: false
                });
            }
        });

        // Spawn Security Cameras
        state.map.rooms.forEach((r, idx) => {
            if (idx > 1 && Math.random() < 0.55) {
                state.cameras.push({
                    x: r.x * TILE_SIZE + TILE_SIZE / 2,
                    y: r.y * TILE_SIZE + TILE_SIZE / 2,
                    angle: Math.random() * Math.PI * 2,
                    rotSpeed: 0.007 + Math.random() * 0.007,
                    rotRange: Math.PI / 2.2,
                    baseAngle: Math.random() * Math.PI * 2,
                    fov: 0.65,
                    range: 180,
                    disabledTimer: 0
                });
            }
        });

        // Spawn Guards & VIP Target(s)
        let createdVips = 0;
        const targetRoomIndex = state.map.rooms.length - 2;

        state.map.rooms.forEach((r, idx) => {
            if (idx > 0) {
                const guardCount = Math.floor(Math.random() * 2) + 1 + Math.floor(state.run.floor / 3);
                for (let g = 0; g < guardCount; g++) {
                    const gx = (r.x + 1 + Math.random() * (r.w - 2)) * TILE_SIZE;
                    const gy = (r.y + 1 + Math.random() * (r.h - 2)) * TILE_SIZE;

                    let isVIP = false;
                    if (createdVips === 0 && idx === targetRoomIndex) {
                        isVIP = true;
                        createdVips++;
                    }

                    const isEnforcer = !isVIP && Math.random() < 0.3;

                    const guard = {
                        x: gx,
                        y: gy,
                        r: 16,
                        angle: Math.random() * Math.PI * 2,
                        targetAngle: Math.random() * Math.PI * 2,
                        state: 'PATROL',
                        speed: isVIP ? 1.7 : 2.1 + (state.run.floor * 0.08),
                        patrolNode: { x: gx, y: gy },
                        patrolRoute: null,
                        patrolIdx: 0,
                        patrolTimer: Math.random() * 120,
                        inspectTimer: 0,
                        inspectTarget: null,
                        searchTarget: null,
                        searchTimer: 0,
                        lastKnownX: null,
                        lastKnownY: null,
                        suspicion: 0,
                        suspicionRate: 4.5,
                        shootCooldown: 0,
                        hp: isVIP ? 45 : 55 + state.run.floor * 10,
                        maxHp: isVIP ? 45 : 55 + state.run.floor * 10,
                        isVIP: isVIP,
                        isEnforcer: isEnforcer,
                        elite: null,
                        revealed: false
                    };
                    try {
                        aaScaleGuardForFloor(guard, state.run.floor);
                        aaBuildPatrolRoute(guard, r);
                    } catch (e) {}

                    state.guards.push(guard);
                }
            }
        });

        if (createdVips === 0 && state.guards.length > 0) {
            state.guards[state.guards.length - 1].isVIP = true;
        }

        // Spawn Laser Barriers
        for (let r = 0; r < state.map.rows; r++) {
            for (let c = 0; c < state.map.cols; c++) {
                if (state.map.grid[r][c] === CELL.FLOOR && Math.random() < 0.025 && c > 4 && r > 4) {
                    if (state.map.grid[r - 1][c] === CELL.WALL && state.map.grid[r + 1][c] === CELL.WALL) {
                        state.lasers.push({
                            x1: c * TILE_SIZE + TILE_SIZE / 2,
                            y1: (r - 0.45) * TILE_SIZE,
                            x2: c * TILE_SIZE + TILE_SIZE / 2,
                            y2: (r + 1.45) * TILE_SIZE,
                            active: true,
                            toggleTimer: 0,
                            frequency: 2400 + Math.random() * 1200
                        });
                    }
                }
            }
        }

        // Update HUD elements
        document.getElementById('hudFloor').textContent = state.run.floor;
        document.getElementById('hudDNA').textContent = state.run.dna;
        document.getElementById('hudKey').textContent = state.run.hasKey ? '🔑 YES' : '❌';
        document.getElementById('hudDisguiseText').textContent = state.player && state.player.disguise ? state.player.disguise : 'NONE';
        try {
            state.run.floorStartTime = Date.now();
            state.hack = { active: false, target: null, kind: null, progress: 0, required: 120 };
            // Drone (camera-mobile) elites from floor 4+
            state.drones = [];
            if (state.run.floor >= 4) {
                const n = Math.min(3, 1 + Math.floor((state.run.floor - 4) / 2));
                for (let di = 0; di < n; di++) {
                    const rr = state.map.rooms[Math.floor(Math.random() * state.map.rooms.length)];
                    const dx = (rr.cx + (Math.random() * 2 - 1)) * TILE_SIZE;
                    const dy = (rr.cy + (Math.random() * 2 - 1)) * TILE_SIZE;
                    state.drones.push({
                        x: dx, y: dy, r: 12,
                        angle: Math.random() * Math.PI * 2,
                        baseAngle: Math.random() * Math.PI * 2,
                        rotSpeed: 0.008 + Math.random() * 0.006,
                        rotRange: 1.2, fov: 0.7, range: 170,
                        speed: 0.7, disabledTimer: 0,
                        wp: [{ x: rr.cx * TILE_SIZE, y: rr.cy * TILE_SIZE }, { x: dx, y: dy }],
                        wpi: 0
                    });
                }
            }
            // Active contract: floor warning + score hook
            const ac = aaGetActiveContract();
            if (ac) {
                state.run.score += 0;
                spawnFloatingText(state.player.x, state.player.y - 40, '📜 CONTRACT: ' + ac.name, '#00e5ff', 13);
            }
            aaEnsureGadgetSlots();
            aaUpdateContractBadge();
        } catch (e) {}
        updateVIPCount();
        updateGadgetHUD();
        updateSARatingDisplay();
        resizeCanvas();
        emitAssassinEvent('floor', { floor: state.run.floor });
    }

    function updateVIPCount() {
        const vips = state.guards.filter(g => g.isVIP && g.state !== 'PACIFIED').length;
        document.getElementById('hudGuardsLeft').textContent = vips;

        if (vips === 0 && !state.run.hasKey) {
            state.run.hasKey = true;
            document.getElementById('hudKey').textContent = '🔑 YES';
            audio.playCoin();
            spawnFloatingText(state.player.x, state.player.y - 30, '🔑 KEYCARD SECURED!', '#00ff66', 15);
            try {
                state.run.vipDeadAt = state.run.vipDeadAt || Date.now();
                const c = aaGetActiveContract();
                if (c && !state.run.contractFailed) {
                    state.run.dna += (c.rewardDNA || 0);
                    document.getElementById('hudDNA').textContent = state.run.dna;
                    spawnFloatingText(state.player.x, state.player.y - 55, '📜 CONTRACT FEE: +' + (c.rewardDNA || 0) + ' DNA', '#00e5ff', 13);
                }
            } catch (e) {}
        }
    }

    function updateGadgetHUD() {
        try { aaEnsureGadgetSlots(); } catch (e) {}
        document.getElementById('countMedkit').textContent = state.run.gadgets.medkit;
        document.getElementById('countTranq').textContent = state.run.gadgets.tranq;
        document.getElementById('countSmoke').textContent = state.run.gadgets.smoke;
        try {
            const dc = document.getElementById('countDecoy');
            if (dc) dc.textContent = state.run.gadgets.decoy || 0;
            const sc = document.getElementById('countSurge');
            if (sc) sc.textContent = state.run.gadgets.surge || 0;
        } catch (e) {}

        document.getElementById('slotMedkit').classList.toggle('empty', state.run.gadgets.medkit <= 0);
        document.getElementById('slotTranq').classList.toggle('empty', state.run.gadgets.tranq <= 0);
        document.getElementById('slotSmoke').classList.toggle('empty', state.run.gadgets.smoke <= 0);
    }

    function updateSARatingDisplay() {
        const el = document.getElementById('hudSAText');
        if (!el) return;
        try {
            const rating = aaComputeRating();
            if (rating === 'PHANTOM') {
                el.textContent = 'PHANTOM 👻 (+150% / no-knockout legend)';
                el.className = 'sa-status highlight-green';
            } else if (rating === 'GHOST') {
                el.textContent = 'GHOST 👻 (+100% / zero alarms, zero kills)';
                el.className = 'sa-status highlight-green';
            } else if (rating === 'SILENT_ASSASSIN') {
                el.textContent = 'SILENT ASSASSIN';
                el.className = 'sa-status highlight-green';
            } else if (rating === 'SHADOW') {
                el.textContent = 'SHADOW (SA lost, undetected streak)';
                el.className = 'sa-status highlight-cyan';
            } else {
                el.textContent = 'COVER COMPROMISED';
                el.className = 'sa-status blown';
            }
        } catch (e) {
            if (state.run.silentAssassin) {
                el.textContent = 'SILENT ASSASSIN';
                el.className = 'sa-status highlight-green';
            } else {
                el.textContent = 'COVER COMPROMISED';
                el.className = 'sa-status blown';
            }
        }
        try { aaUpdateContractBadge(); } catch (e) {}
    }

    // ==========================================
    // 11. COMBAT, TAKEDOWNS & ABILITIES
    // ==========================================
    function triggerPrimaryAttack() {
        if (state.mode !== 'PLAY' || !state.player || state.player.hp <= 0) return;

        if (state.currentContextAction && state.currentContextAction.type === 'TAKEDOWN') {
            performSilentTakedown(state.currentContextAction.target);
            return;
        }

        if (state.player.disguise !== 'NONE') {
            state.player.disguise = 'NONE';
            document.getElementById('hudDisguiseText').textContent = 'NONE';
            spawnFloatingText(state.player.x, state.player.y - 20, 'DISGUISE LOST!', '#ff0055', 12);
        }

        const info = ROSTER.find(r => r.id === state.selectedId);
        const reach = 55;
        const noiseMade = info.noise * 1.5;
        state.player.currentNoise = noiseMade;

        if (state.selectedId === 'gorilla' || state.selectedId === 'rhino' || state.selectedId === 'kangaroo') {
            audio.playHeavySlam();
            triggerScreenShake(6, 10);
        } else {
            audio.playSlice();
        }

        const ax = state.player.x + Math.cos(state.player.angle) * reach;
        const ay = state.player.y + Math.sin(state.player.angle) * reach;

        state.slashes.push({
            x: state.player.x,
            y: state.player.y,
            angle: state.player.angle,
            radius: reach + 10,
            life: 12
        });

        triggerSparkEffect(ax, ay, 8);

        state.guards.forEach(g => {
            if (g.state === 'PACIFIED') return;
            const dist = Math.hypot(g.x - ax, g.y - ay);
            if (dist < g.r + 22) {
                // Shielded Enforcer: immune from the front — flank for full damage
                try {
                    if (g.elite === 'SHIELDED') {
                        const toPlayer = Math.atan2(state.player.y - g.y, state.player.x - g.x);
                        const frontDiff = Math.abs(normalizeAngle(toPlayer - g.angle));
                        if (frontDiff < Math.PI / 2.2) {
                            spawnFloatingText(g.x, g.y - 20, '🛡️ BLOCKED (FLANK!)', '#94a3b8', 12);
                            triggerSparkEffect(g.x, g.y, 6);
                            return;
                        }
                    }
                } catch (e) {}
                let damage = 40;

                if (state.selectedId === 'panther') {
                    const angleToGuard = Math.atan2(g.y - state.player.y, g.x - state.player.x);
                    const angleDiff = Math.abs(normalizeAngle(angleToGuard - g.angle));
                    if (angleDiff < Math.PI / 2.8) {
                        damage = 140;
                        state.player.currentNoise = 0;
                        spawnFloatingText(g.x, g.y - 20, 'BACKSTAB!', '#ff0055', 14);
                    }
                } else if (state.selectedId === 'gorilla') {
                    damage = 65;
                    g.x += Math.cos(state.player.angle) * 50;
                    g.y += Math.sin(state.player.angle) * 50;
                    g.inspectTimer = 90;
                    g.state = 'INSPECT';
                    spawnFloatingText(g.x, g.y - 20, 'STUNNED!', '#00e5ff', 13);
                } else if (state.selectedId === 'cobra') {
                    damage = 25;
                    g.poisonTimer = 300;
                    spawnFloatingText(g.x, g.y - 20, 'POISONED!', '#00ff66', 13);
                } else if (state.selectedId === 'rhino') {
                    damage = 75;
                    triggerScreenShake(7, 12);
                } else if (state.selectedId === 'kangaroo') {
                    damage = 50;
                    g.x += Math.cos(state.player.angle) * 45;
                    g.y += Math.sin(state.player.angle) * 45;
                } else if (state.selectedId === 'badger' && state.player.hp < state.player.maxHp / 2) {
                    damage = 55;
                }

                damage *= (1 + state.run.upgrades.damage * 0.25);
                g.hp -= damage;

                triggerBloodSplatter(g.x, g.y, 20);
                spawnGibs(g.x, g.y, 3);

                if (state.player.currentNoise > 15) {
                    alertGuardsNear(g.x, g.y, 240);
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

    // Non-lethal Silent Takedown (Hitman Subdue)
    function performSilentTakedown(guard) {
        if (!guard || guard.state === 'PACIFIED') return;

        audio.playTakedown();
        triggerScreenShake(4, 8);

        guard.state = 'PACIFIED';
        guard.hp = 0;
        state.run.pacifications++;
        state.run.knockouts = (state.run.knockouts || 0) + 1;
        state.run.score += guard.isVIP ? 1500 : 200;
        try {
            if (guard.isVIP) state.run.vipDeadAt = Date.now();
            const c = aaGetActiveContract();
            if (c && c.rules && c.rules.vipOnlyKills && !guard.isVIP) aaContractFail('non-target neutralized');
        } catch (e) {}

        spawnFloatingText(guard.x, guard.y - 25, guard.isVIP ? '🎯 VIP ELIMINATED!' : '💤 PACIFIED (NON-LETHAL)', '#00ff66', 14);

        state.deadBodies.push({
            x: guard.x,
            y: guard.y,
            r: 15,
            isVIP: guard.isVIP,
            isPacified: true,
            disguiseStolen: false,
            discovered: false
        });

        if (!guard.isVIP) {
            state.droppedUniforms.push({
                x: guard.x,
                y: guard.y,
                r: 15,
                type: 'GUARD'
            });
        }

        state.run.dna += Math.floor(Math.random() * 2) + 2;
        document.getElementById('hudDNA').textContent = state.run.dna;

        const idx = state.guards.indexOf(guard);
        if (idx !== -1) state.guards.splice(idx, 1);

        updateVIPCount();
        emitAssassinEvent('takedown', { x: guard.x, y: guard.y, isVIP: !!guard.isVIP, silent: true });
    }

    function handleGuardDeath(guard) {
        const idx = state.guards.indexOf(guard);
        if (idx !== -1) {
            state.guards.splice(idx, 1);
        }
        state.run.kills++;
        try {
            state.run.knockouts = (state.run.knockouts || 0) + 1;
            if (guard.isVIP) state.run.vipDeadAt = Date.now();
            const c = aaGetActiveContract();
            if (c && c.rules) {
                if (c.rules.pacifyOnly) aaContractFail('lethal force used');
                else if (c.rules.vipOnlyKills && !guard.isVIP) aaContractFail('non-target killed');
            }
        } catch (e) {}

        if (guard.isVIP) {
            state.run.score += 1500;
            spawnFloatingText(guard.x, guard.y - 25, '🎯 VIP ELIMINATED!', '#ff0055', 15);
        } else {
            state.run.score += 100;
            state.run.silentAssassin = false;
            updateSARatingDisplay();
            spawnFloatingText(guard.x, guard.y - 25, 'NON-TARGET CASUALTY', '#ff0055', 12);
        }

        state.deadBodies.push({
            x: guard.x,
            y: guard.y,
            r: 15,
            isVIP: guard.isVIP,
            isPacified: false,
            disguiseStolen: false,
            discovered: false
        });

        if (!guard.isVIP) {
            state.droppedUniforms.push({
                x: guard.x,
                y: guard.y,
                r: 15,
                type: 'GUARD'
            });
        }

        state.run.dna += Math.floor(Math.random() * 3) + 2;
        audio.playCoin();
        document.getElementById('hudDNA').textContent = state.run.dna;

        updateVIPCount();

        triggerBloodSplatter(guard.x, guard.y, 45);
        spawnGibs(guard.x, guard.y, 7);
        for (let j = 0; j < 6; j++) {
            spawnFloorBlood(guard.x + Math.random() * 28 - 14, guard.y + Math.random() * 28 - 14, 16);
        }
        emitAssassinEvent('kill', {
            x: guard.x, y: guard.y,
            isVIP: !!guard.isVIP, isEnforcer: !!guard.isEnforcer,
            kills: state.run.kills, silentAssassin: state.run.silentAssassin
        });
    }

    // Active Signature Ability
    function triggerSpecialAbility() {
        if (state.mode !== 'PLAY' || !state.player || state.player.hp <= 0) return;
        if (state.player.abilityCooldown > 0) return;

        state.player.abilityCooldown = state.player.abilityCooldownMax;

        if (state.selectedId === 'panther') {
            audio.playSlice();
            const pounceDist = 140;
            const tx = state.player.x + Math.cos(state.player.angle) * pounceDist;
            const ty = state.player.y + Math.sin(state.player.angle) * pounceDist;

            state.player.x = tx;
            state.player.y = ty;
            keepInBounds(state.player);

            state.slashes.push({
                x: state.player.x,
                y: state.player.y,
                angle: state.player.angle,
                radius: 70,
                life: 15
            });

            state.guards.forEach(g => {
                if (g.state === 'PACIFIED') return;
                const dist = Math.hypot(g.x - state.player.x, g.y - state.player.y);
                if (dist < g.r + 35) {
                    g.hp -= 160;
                    triggerBloodSplatter(g.x, g.y, 40);
                    spawnGibs(g.x, g.y, 6);
                    spawnFloatingText(g.x, g.y - 25, 'POUNCE EXECUTION!', '#ff0055', 14);
                    if (g.hp <= 0) handleGuardDeath(g);
                }
            });
        }
        else if (state.selectedId === 'gorilla') {
            audio.playHeavySlam();
            triggerScreenShake(12, 20);
            triggerSparkEffect(state.player.x, state.player.y, 25);

            state.guards.forEach(g => {
                if (g.state === 'PACIFIED') return;
                const dist = Math.hypot(g.x - state.player.x, g.y - state.player.y);
                if (dist < 140) {
                    g.hp -= 55;
                    g.state = 'INSPECT';
                    g.inspectTimer = 200;
                    triggerBloodSplatter(g.x, g.y, 25);
                    spawnGibs(g.x, g.y, 3);
                    spawnFloatingText(g.x, g.y - 20, 'GROUND STUN!', '#00e5ff', 13);
                    if (g.hp <= 0) handleGuardDeath(g);
                }
            });
            state.lasers.forEach(l => {
                const dist = Math.hypot((l.x1 + l.x2) / 2 - state.player.x, (l.y1 + l.y2) / 2 - state.player.y);
                if (dist < 140) l.active = false;
            });
        }
        else if (state.selectedId === 'cobra') {
            audio.playSmoke();
            triggerAcidPuff(state.player.x, state.player.y, 25);
            state.smokeClouds.push({
                x: state.player.x,
                y: state.player.y,
                r: 110,
                life: 360,
                maxLife: 360,
                isAcid: true
            });
            spawnFloatingText(state.player.x, state.player.y - 25, 'ACID CLOUD DEPLOYED!', '#00ff66', 13);
        }
        else if (state.selectedId === 'hawk') {
            audio.playHacking();
            state.player.reconActiveTimer = 600;
            try { state.run.reconPingUsed = true; state.run.contractFlags.recon = true; } catch (e) {}
            spawnFloatingText(state.player.x, state.player.y - 25, 'THERMAL RECON PING ACTIVE!', '#00e5ff', 13);
        }
        else if (state.selectedId === 'badger') {
            audio.playHeavySlam();
            state.player.burrowTimer = 270;
            spawnFloatingText(state.player.x, state.player.y - 25, 'BURROWING UNDERGROUND!', '#ffea00', 13);
        }
        else if (state.selectedId === 'octopus') {
            audio.playHacking();
            triggerSparkEffect(state.player.x, state.player.y, 20);
            state.cameras.forEach(c => {
                const dist = Math.hypot(c.x - state.player.x, c.y - state.player.y);
                if (dist < 240) c.disabledTimer = 600;
            });
            state.lasers.forEach(l => {
                const dist = Math.hypot((l.x1 + l.x2) / 2 - state.player.x, (l.y1 + l.y2) / 2 - state.player.y);
                if (dist < 240) {
                    l.active = false;
                    l.disabledTimer = 600;
                }
            });
            spawnFloatingText(state.player.x, state.player.y - 25, 'MAINFRAME EMP OVERLOAD!', '#00e5ff', 14);
        }
        else if (state.selectedId === 'kangaroo') {
            audio.playHeavySlam();
            triggerScreenShake(7, 12);
            const dashSpeed = 16;
            const dashTime = 16;
            state.player.dashVelocityX = Math.cos(state.player.angle) * dashSpeed;
            state.player.dashVelocityY = Math.sin(state.player.angle) * dashSpeed;
            state.player.dashTimer = dashTime;
        }
        else if (state.selectedId === 'beaver') {
            audio.playHacking();
            const decoy = {
                x: state.player.x,
                y: state.player.y,
                r: 12,
                angle: state.player.angle,
                vx: Math.cos(state.player.angle) * 4,
                vy: Math.sin(state.player.angle) * 4,
                life: 260
            };
            state.particles.push({
                type: 'DECOY_BOT',
                bot: decoy,
                life: 260
            });
            spawnFloatingText(state.player.x, state.player.y - 25, 'DECOY BOT DEPLOYED!', '#ffea00', 13);
        }
        else if (state.selectedId === 'rhino') {
            audio.playHeavySlam();
            triggerScreenShake(10, 18);
            state.player.chargeTimer = 50;
            state.player.chargeAngle = state.player.angle;
            spawnFloatingText(state.player.x, state.player.y - 25, 'DEMOLITION CHARGE!', '#ff0055', 14);
        }
    }

    // ==========================================
    // 12. TACTICAL GADGETS (MEDKIT, TRANQ, SMOKE)
    // ==========================================
    function useGadget(type) {
        if (state.mode !== 'PLAY' || !state.player || state.player.hp <= 0) return;
        try {
            if (type === 'decoy' || type === 'surge') {
                if (aaUseGadgetExtended(type)) return;
                else {
                    spawnFloatingText(state.player.x, state.player.y - 20, 'NONE LEFT!', '#94a3b8', 12);
                    return;
                }
            }
        } catch (e) {}

        if (type === 'medkit') {
            if (state.run.gadgets.medkit <= 0) return;
            if (state.player.hp >= state.player.maxHp) {
                spawnFloatingText(state.player.x, state.player.y - 20, 'HP ALREADY FULL!', '#94a3b8', 12);
                return;
            }
            state.run.gadgets.medkit--;
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 50);
            audio.playLevelUp();
            triggerSparkEffect(state.player.x, state.player.y, 15);
            spawnFloatingText(state.player.x, state.player.y - 25, '+50 HP (HEALED)', '#00ff66', 14);
            updateGadgetHUD();
        }
        else if (type === 'tranq') {
            if (state.run.gadgets.tranq <= 0) return;
            state.run.gadgets.tranq--;
            audio.playDart();

            const dartSpeed = 12;
            state.projectiles.push({
                x: state.player.x,
                y: state.player.y,
                vx: Math.cos(state.player.angle) * dartSpeed,
                vy: Math.sin(state.player.angle) * dartSpeed,
                type: 'TRANQ',
                life: 45
            });
            updateGadgetHUD();
        }
        else if (type === 'smoke') {
            if (state.run.gadgets.smoke <= 0) return;
            state.run.gadgets.smoke--;
            audio.playSmoke();

            const targetX = state.mouse.worldX;
            const targetY = state.mouse.worldY;

            state.smokeClouds.push({
                x: targetX,
                y: targetY,
                r: 130,
                life: 480,
                maxLife: 480,
                isAcid: false
            });
            spawnFloatingText(targetX, targetY - 20, 'SMOKE SCREEN', '#cbd5e1', 13);
            updateGadgetHUD();
        }
    }

    // Toss Coin Distraction (Q or Right Click)
    function tossCoin(targetX, targetY) {
        if (state.mode !== 'PLAY' || !state.player || state.player.hp <= 0) return;

        audio.playCoin();
        state.thrownCoins.push({
            x: state.player.x,
            y: state.player.y,
            tx: targetX,
            ty: targetY,
            progress: 0,
            speed: 0.045
        });
    }

    function handleCoinLanding(cx, cy) {
        audio.playCoin();
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            spawnParticle(cx, cy, '#ffea00', 3, Math.cos(angle) * 1.8, Math.sin(angle) * 1.8, 22);
        }

        state.particles.push({
            type: 'SOUND_RIPPLE',
            x: cx,
            y: cy,
            r: 10,
            maxR: 200,
            life: 30
        });

        state.guards.forEach(g => {
            if (g.state === 'PACIFIED') return;
            const dist = Math.hypot(g.x - cx, g.y - cy);
            if (dist < 220 && g.state !== 'CHASE') {
                if (!isLineBlocked(g.x, g.y, cx, cy, state.map.grid)) {
                    g.state = 'INSPECT';
                    g.inspectTarget = { x: cx, y: cy };
                    g.inspectTimer = 240;
                    audio.playSuspicious();
                    spawnFloatingText(g.x, g.y - 25, '?', '#ffea00', 16);
                }
            }
        });
    }

    // Dragging Dead/Unconscious Body (G key)
    function toggleDragBody() {
        if (!state.player || state.player.hp <= 0) return;

        if (state.player.draggingBody) {
            state.player.draggingBody = null;
            audio.playTone(380, 'triangle', 0.1, 0.05);
            spawnFloatingText(state.player.x, state.player.y - 20, 'BODY RELEASED', '#94a3b8', 11);
        } else {
            let closest = null;
            let minDist = 40;
            state.deadBodies.forEach(b => {
                const dist = Math.hypot(b.x - state.player.x, b.y - state.player.y);
                if (dist < minDist) {
                    closest = b;
                    minDist = dist;
                }
            });

            if (closest) {
                state.player.draggingBody = closest;
                audio.playTone(620, 'triangle', 0.1, 0.05);
                spawnFloatingText(state.player.x, state.player.y - 20, 'DRAGGING BODY [G TO DROP]', '#00e5ff', 11);
            }
        }
    }

    // General Context Interaction (E key)
    function handleInteraction() {
        if (!state.player || state.player.hp <= 0) return;
        const player = state.player;

        if (state.currentContextAction && state.currentContextAction.type === 'TAKEDOWN') {
            performSilentTakedown(state.currentContextAction.target);
            return;
        }

        if (player.draggingBody) {
            let dumpster = null;
            state.dumpsters.forEach(d => {
                const dist = Math.hypot(d.x - player.x, d.y - player.y);
                if (dist < d.r + 25) dumpster = d;
            });

            if (dumpster) {
                const idx = state.deadBodies.indexOf(player.draggingBody);
                if (idx !== -1) state.deadBodies.splice(idx, 1);
                player.draggingBody = null;
                dumpster.bodiesInside++;
                audio.playHeavySlam();
                triggerSparkEffect(dumpster.x, dumpster.y, 12);
                spawnFloatingText(dumpster.x, dumpster.y - 25, 'BODY CONCEALED! (SAFE)', '#00ff66', 13);
                try {
                    state.run.bodiesHidden = (state.run.bodiesHidden || 0) + 1;
                    state.run.score += 150;
                } catch (e) {}
                return;
            }
        }

        let nearTerminal = state.terminals.find(t => !t.hacked && Math.hypot(t.x - player.x, t.y - player.y) < 45);
        if (nearTerminal) {
            // Minigame-lite: hold E ~2s (progress in aaHackTick). Instant fallback if E not held.
            try {
                if (!state.hack.active || state.hack.target !== nearTerminal) {
                    aaStartHack('TERMINAL', nearTerminal, 120);
                    spawnFloatingText(nearTerminal.x, nearTerminal.y - 25, 'HACKING… HOLD E', '#00e5ff', 12);
                    return;
                } else {
                    return; // hold-E progress continues in aaHackTick; instant path below is fallback only
                }
            } catch (e) {}
            nearTerminal.hacked = true;
            audio.playHacking();
            triggerSparkEffect(nearTerminal.x, nearTerminal.y, 20);

            state.run.hasKey = true;
            document.getElementById('hudKey').textContent = '🔑 YES';
            state.cameras.forEach(c => c.disabledTimer = 600);
            state.run.score += 400;

            spawnFloatingText(nearTerminal.x, nearTerminal.y - 25, 'TERMINAL HACKED: CAMERAS LOOPED & KEYCARD OVERRIDE!', '#00e5ff', 14);
            try {
                state.run.hackCount++;
                state.run.contractFlags.hacked = true;
                state.guards.forEach(g => { if (g.isVIP) g.revealed = true; });
                state.hack.active = false;
            } catch (e) {}
            return;
        }

        // Pickpocket keycard: sneak behind VIP, hold E 1.5s
        try {
            const vip = state.guards.find(g => g.isVIP && g.state !== 'PACIFIED' && Math.hypot(g.x - player.x, g.y - player.y) < 46);
            if (vip && !state.run.hasKey) {
                const angToVip = Math.atan2(vip.y - player.y, vip.x - player.x);
                const behind = Math.abs(normalizeAngle(angToVip - vip.angle)) < Math.PI / 2.6;
                const undetected = (vip.state !== 'CHASE');
                if (behind && undetected) {
                    if (!state.hack.active || state.hack.target !== vip) {
                        aaStartHack('PICKPOCKET', vip, 90);
                        spawnFloatingText(player.x, player.y - 25, 'LIFTING KEYCARD… HOLD E', '#00ff66', 12);
                        return;
                    }
                }
            }
            if (state.hack.active && state.hack.kind === 'PICKPOCKET') {
                const still = state.guards.includes(state.hack.target);
                if (!still) state.hack.active = false;
                else return; // hold-E progress continues in aaHackTick
            }
        } catch (e) {}

        let nearSupply = state.supplyCrates.find(c => !c.opened && Math.hypot(c.x - player.x, c.y - player.y) < 40);
        if (nearSupply) {
            nearSupply.opened = true;
            state.run.gadgets[nearSupply.loot] = (state.run.gadgets[nearSupply.loot] || 0) + 1;
            audio.playCoin();
            triggerSparkEffect(nearSupply.x, nearSupply.y, 12);
            updateGadgetHUD();
            const lootNames = { medkit: 'MEDKIT (+1)', tranq: 'TRANQ DART (+1)', smoke: 'SMOKE BOMB (+1)', decoy: 'NOISE DECOY (+1)', surge: 'ADRENAL SURGE (+1)' };
            spawnFloatingText(nearSupply.x, nearSupply.y - 25, `ACQUIRED: ${lootNames[nearSupply.loot]}`, '#00ff66', 13);
            return;
        }

        let uniform = null;
        let uIdx = -1;
        state.droppedUniforms.forEach((u, index) => {
            const dist = Math.hypot(u.x - player.x, u.y - player.y);
            if (dist < 40) {
                uniform = u;
                uIdx = index;
            }
        });

        if (uniform) {
            player.disguise = uniform.type;
            state.droppedUniforms.splice(uIdx, 1);
            audio.playCoin();
            document.getElementById('hudDisguiseText').textContent = 'GUARD SECURITY';
            triggerSparkEffect(player.x, player.y, 10);
            spawnFloatingText(player.x, player.y - 25, 'DISGUISE EQUIPPED: SECURITY GUARD', '#00ff66', 13);
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
            if (g.state === 'PACIFIED') return;
            const dist = Math.hypot(g.x - x, g.y - y);
            if (dist < radius) {
                g.state = 'INSPECT';
                g.inspectTarget = { x, y };
                g.inspectTimer = 200;
            }
        });
    }

    // ==========================================
    // 13. SMART GUARD AI & SUSPICION
    // ==========================================
    function updateGuardsAI() {
        const player = state.player;
        const mapGrid = state.map.grid;
        const decoyBot = state.particles.find(p => p.type === 'DECOY_BOT');

        let anyChase = false;

        state.guards.forEach(g => {
            if (g.state === 'PACIFIED') return;

            if (g.poisonTimer && g.poisonTimer > 0) {
                g.poisonTimer--;
                if (g.poisonTimer % 60 === 0) {
                    g.hp -= 16 * (1 + state.run.upgrades.damage * 0.25);
                    triggerBloodSplatter(g.x, g.y, 6);
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
                if (dist < 260 && !isLineBlocked(g.x, g.y, db.x, db.y, mapGrid)) {
                    g.state = 'INSPECT';
                    g.inspectTarget = { x: db.x, y: db.y };
                    g.inspectTimer = 35;
                }
            }

            state.deadBodies.forEach(b => {
                if (!b.discovered) {
                    const distToBody = Math.hypot(b.x - g.x, b.y - g.y);
                    if (distToBody < 190) {
                        const dirToBody = Math.atan2(b.y - g.y, b.x - g.x);
                        const angleDiff = Math.abs(normalizeAngle(dirToBody - g.angle));
                        if (angleDiff < 0.65 && !isLineBlocked(g.x, g.y, b.x, b.y, mapGrid)) {
                            b.discovered = true;
                            state.run.silentAssassin = false;
                            state.run.bodiesDiscovered++;
                            updateSARatingDisplay();

                            if (!state.alerts.active) {
                                state.alerts.active = true;
                                state.alerts.timer = 500;
                                state.run.alarmsTriggered++;
                                audio.playAlarm();
                                audio.setMode('COMBAT');
                                alertGuardsNear(b.x, b.y, 500);
                                spawnFloatingText(g.x, g.y - 30, 'BODY DISCOVERED! ALARM!', '#ff0055', 14);
                            }
                        }
                    }
                }
            });

            let canSeePlayer = false;
            if (player.hp > 0 && player.burrowTimer <= 0) {
                const dist = Math.hypot(player.x - g.x, player.y - g.y);

                let stealthMultiplier = 1.0;
                if (state.selectedId === 'panther' && (player.inCover || player.currentNoise === 0)) {
                    stealthMultiplier = 0.2;
                } else if (state.selectedId === 'octopus' && player.currentNoise < 5) {
                    stealthMultiplier = 0.35;
                } else if (player.inCover) {
                    stealthMultiplier = 0.35;
                }

                let disguiseProtects = false;
                if (player.disguise === 'GUARD' && !g.isVIP) {
                    if (g.isEnforcer) {
                        // Enforcer vision: longer range, sees through disguise at close range
                        if (dist > 120) disguiseProtects = true;
                        else if (dist < 45) disguiseProtects = false; // close-range burn
                    } else {
                        if (dist > 65) disguiseProtects = true;
                    }
                }

                // Enforcer vision range bonus (compatible with stealth multiplier)
                let visionRange = 190 * stealthMultiplier;
                try {
                    if (g.isEnforcer) visionRange = Math.max(visionRange, 250 * Math.max(0.35, stealthMultiplier));
                    if (g.elite === 'VETERAN') visionRange *= 1.15;
                } catch (e) {}
                if (!disguiseProtects && dist < visionRange) {
                    const dirToPlayer = Math.atan2(player.y - g.y, player.x - g.x);
                    const angleDiff = Math.abs(normalizeAngle(dirToPlayer - g.angle));

                    if (angleDiff < 0.65) {
                        if (!isLineBlocked(g.x, g.y, player.x, player.y, mapGrid)) {
                            canSeePlayer = true;
                        }
                    }
                }
            }

            if (canSeePlayer) {
                g.suspicion = Math.min(100, g.suspicion + (g.suspicionRate || 4.5));
                // Enforcer close-range burn: suspicion spikes through disguise
                try {
                    if (g.isEnforcer && player.disguise !== 'NONE') {
                        const dd = Math.hypot(player.x - g.x, player.y - g.y);
                        if (dd < 60) g.suspicion = Math.min(100, g.suspicion + 3);
                    }
                } catch (e) {}
                g.targetAngle = Math.atan2(player.y - g.y, player.x - g.x);
                try {
                    g.lastKnownX = player.x;
                    g.lastKnownY = player.y;
                } catch (e) {}

                if (g.suspicion >= 40 && player.disguise !== 'NONE') {
                    player.disguise = 'NONE';
                    document.getElementById('hudDisguiseText').textContent = 'NONE';
                    spawnFloatingText(player.x, player.y - 20, 'COVER BLOWN!', '#ff0055', 12);
                }

                if (g.suspicion >= 85) {
                    g.state = 'CHASE';
                    anyChase = true;
                    try { aaEscalate(g); } catch (e) {}

                    if (!state.alerts.active) {
                        state.alerts.active = true;
                        state.alerts.timer = 350;
                        state.run.alarmsTriggered++;
                        state.run.silentAssassin = false;
                        updateSARatingDisplay();
                        audio.playAlert();
                        audio.setMode('COMBAT');
                    }

                    if (g.shootCooldown <= 0) {
                        g.shootCooldown = 48;
                        audio.playGunshot();
                        triggerScreenShake(4, 6);

                        const targetX = player.x + (Math.random() * 24 - 12);
                        const targetY = player.y + (Math.random() * 24 - 12);

                        if (!isLineBlocked(g.x, g.y, targetX, targetY, mapGrid)) {
                            state.bullets.push({
                                x1: g.x,
                                y1: g.y,
                                x2: targetX,
                                y2: targetY,
                                life: 8,
                                damage: 16
                            });
                        } else {
                            state.bullets.push({
                                x1: g.x,
                                y1: g.y,
                                x2: (g.x + targetX) / 2,
                                y2: (g.y + targetY) / 2,
                                life: 6,
                                damage: 0
                            });
                            triggerSparkEffect((g.x + targetX) / 2, (g.y + targetY) / 2, 6);
                        }
                    }
                }
            } else {
                g.suspicion = Math.max(0, g.suspicion - 0.6);
                if (g.state === 'CHASE' && g.suspicion <= 0) {
                    // Fall back to SEARCH (investigate last-known position) — INSPECT-compatible
                    g.state = 'SEARCH';
                    const lx = (g.lastKnownX != null) ? g.lastKnownX : player.x;
                    const ly = (g.lastKnownY != null) ? g.lastKnownY : player.y;
                    g.searchTarget = { x: lx, y: ly };
                    g.searchTimer = 260;
                    g.inspectTarget = { x: lx, y: ly };
                    g.inspectTimer = 200;
                }
            }

            g.angle += normalizeAngle(g.targetAngle - g.angle) * 0.12;

            let targetMoveX = 0;
            let targetMoveY = 0;

            if (g.state === 'CHASE') {
                anyChase = true;
                const dx = player.x - g.x;
                const dy = player.y - g.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 38) {
                    targetMoveX = (dx / dist) * g.speed * 1.3;
                    targetMoveY = (dy / dist) * g.speed * 1.3;
                }
            } else if (g.state === 'SEARCH') {
                // SEARCH: investigate last-known position with suspicion decay
                g.searchTimer = (g.searchTimer || 0) - 1;
                g.suspicion = Math.max(0, g.suspicion - 0.35);
                if (g.searchTarget) {
                    const sdx = g.searchTarget.x - g.x;
                    const sdy = g.searchTarget.y - g.y;
                    const sdist = Math.hypot(sdx, sdy);
                    g.targetAngle = Math.atan2(sdy, sdx);
                    if (sdist > 20) {
                        targetMoveX = (sdx / sdist) * g.speed;
                        targetMoveY = (sdy / sdist) * g.speed;
                    } else {
                        g.targetAngle += 0.06;
                    }
                }
                if (g.searchTimer <= 0) {
                    g.state = 'PATROL';
                }
            } else if (g.state === 'INSPECT') {
                g.inspectTimer--;
                if (g.inspectTarget) {
                    const dx = g.inspectTarget.x - g.x;
                    const dy = g.inspectTarget.y - g.y;
                    const dist = Math.hypot(dx, dy);
                    g.targetAngle = Math.atan2(dy, dx);
                    if (dist > 20) {
                        targetMoveX = (dx / dist) * g.speed;
                        targetMoveY = (dy / dist) * g.speed;
                    }
                }
                if (g.inspectTimer <= 0) {
                    g.state = 'PATROL';
                }
            } else {
                g.patrolTimer++;
                if (g.patrolTimer % 180 === 0) {
                    try { aaAdvancePatrol(g); } catch (e) {}
                }

                const dx = g.patrolNode.x - g.x;
                const dy = g.patrolNode.y - g.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 20) {
                    g.targetAngle = Math.atan2(dy, dx);
                    targetMoveX = (dx / dist) * (g.speed * 0.7);
                    targetMoveY = (dy / dist) * (g.speed * 0.7);
                } else {
                    // Reached waypoint: advance 2-3 node route
                    try { aaAdvancePatrol(g); } catch (e) {}
                    g.patrolTimer = 0;
                }
            }

            if (targetMoveX !== 0 || targetMoveY !== 0) {
                const nextX = g.x + targetMoveX;
                const nextY = g.y + targetMoveY;
                const cellX = Math.floor(nextX / TILE_SIZE);
                const cellY = Math.floor(nextY / TILE_SIZE);
                const currCellX = Math.floor(g.x / TILE_SIZE);
                const currCellY = Math.floor(g.y / TILE_SIZE);

                if (cellX >= 0 && cellX < mapGrid[0].length && mapGrid[currCellY][cellX] !== CELL.WALL) {
                    g.x = nextX;
                }
                if (cellY >= 0 && cellY < mapGrid.length && mapGrid[cellY][currCellX] !== CELL.WALL) {
                    g.y = nextY;
                }
            }

            if (g.shootCooldown > 0) g.shootCooldown--;
            keepInBounds(g);
        });

        if (anyChase && audio.currentMode !== 'COMBAT') {
            audio.setMode('COMBAT');
        } else if (!anyChase && !state.alerts.active && audio.currentMode !== 'STEALTH') {
            audio.setMode('STEALTH');
        }
    }

    // ==========================================
    // 14. GENERAL GAME UPDATE
    // ==========================================
    function updateGame(deltaTime) {
        if (state.mode !== 'PLAY' || !state.player) return;
        const player = state.player;
        try { aaSurgeTick(); } catch (e) {}
        try { aaHackTick(); } catch (e) {}
        try { aaUpdateDrones(); } catch (e) {}
        try { aaCheckContractRulesTick(); } catch (e) {}

        if (state.screenShake.duration > 0) {
            state.screenShake.duration--;
        } else {
            state.screenShake.intensity = 0;
        }

        player.currentNoise = Math.max(0, player.currentNoise - 1);

        state.gibs.forEach(g => {
            g.x += g.vx;
            g.y += g.vy;
            g.vx *= 0.92;
            g.vy *= 0.92;
            g.life--;
            if (g.life > 10 && Math.random() < 0.25) {
                spawnFloorBlood(g.x, g.y, 4);
            }
        });
        state.gibs = state.gibs.filter(g => g.life > 0);

        state.slashes.forEach(s => s.life--);
        state.slashes = state.slashes.filter(s => s.life > 0);

        state.floatingTexts.forEach(t => {
            t.y += t.vy;
            t.life--;
        });
        state.floatingTexts = state.floatingTexts.filter(t => t.life > 0);

        state.smokeClouds.forEach(s => {
            s.life--;
            if (s.isAcid) {
                state.guards.forEach(g => {
                    if (g.state === 'PACIFIED') return;
                    if (Math.hypot(g.x - s.x, g.y - s.y) < s.r) {
                        g.hp -= 0.6;
                        if (Math.random() < 0.2) triggerBloodSplatter(g.x, g.y, 2);
                        if (g.hp <= 0) handleGuardDeath(g);
                    }
                });
            }
        });
        state.smokeClouds = state.smokeClouds.filter(s => s.life > 0);

        state.projectiles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.type === 'TRANQ') {
                state.guards.forEach(g => {
                    if (g.state === 'PACIFIED') return;
                    if (Math.hypot(g.x - p.x, g.y - p.y) < g.r + 8) {
                        p.life = 0;
                        performSilentTakedown(g);
                    }
                });
            }
        });
        state.projectiles = state.projectiles.filter(p => p.life > 0);

        if (player.abilityCooldown > 0) {
            player.abilityCooldown = Math.max(0, player.abilityCooldown - 16.67);
            const percent = (player.abilityCooldown / player.abilityCooldownMax) * 100;
            document.getElementById('abilityCooldownFill').style.width = `${100 - percent}%`;
            document.getElementById('abilityStatusText').textContent = player.abilityCooldown === 0 ? "READY" : "CHARGING";
        }

        player.inCover = false;
        state.bushes.forEach(b => {
            if (Math.hypot(b.x - player.x, b.y - player.y) < b.r) {
                player.inCover = true;
            }
        });

        if (player.dashTimer && player.dashTimer > 0) {
            player.dashTimer--;
            player.x += player.dashVelocityX;
            player.y += player.dashVelocityY;
            keepInBounds(player);

            state.guards.forEach(g => {
                if (g.state === 'PACIFIED') return;
                const d = Math.hypot(g.x - player.x, g.y - player.y);
                if (d < g.r + player.r + 12) {
                    g.hp -= 25;
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
            const rhinoSpeed = 9.8;
            player.x += Math.cos(player.chargeAngle) * rhinoSpeed;
            player.y += Math.sin(player.chargeAngle) * rhinoSpeed;
            keepInBounds(player);

            state.guards.forEach(g => {
                if (g.state === 'PACIFIED') return;
                const d = Math.hypot(g.x - player.x, g.y - player.y);
                if (d < g.r + player.r + 16) {
                    g.hp -= 95;
                    g.x += Math.cos(player.chargeAngle) * 55;
                    g.y += Math.sin(player.chargeAngle) * 55;
                    triggerBloodSplatter(g.x, g.y, 30);
                    spawnGibs(g.x, g.y, 5);
                    if (g.hp <= 0) handleGuardDeath(g);
                }
            });
        }
        else if (player.burrowTimer && player.burrowTimer > 0) {
            player.burrowTimer--;
            player.currentNoise = 0;
            if (Math.random() < 0.35) {
                spawnParticle(player.x, player.y, '#78350f', Math.random() * 4 + 2, Math.random() * 2 - 1, Math.random() * 2 - 1, 30);
            }
        }
        else {
            let vx = 0;
            let vy = 0;

            if (state.keys['KeyW'] || state.keys['ArrowUp']) vy -= 1;
            if (state.keys['KeyS'] || state.keys['ArrowDown']) vy += 1;
            if (state.keys['KeyA'] || state.keys['ArrowLeft']) vx -= 1;
            if (state.keys['KeyD'] || state.keys['ArrowRight']) vx += 1;

            if (state.touch.enabled && state.touch.joystickActive) {
                vx = state.touch.moveX;
                vy = state.touch.moveY;
            }

            if (vx !== 0 || vy !== 0) {
                const length = Math.hypot(vx, vy);
                const dragPenalty = player.draggingBody ? 0.45 : 1.0;
                let surgeMul = 1.0;
                try { surgeMul = aaSurgeSpeedMul(); } catch (e) {}
                const moveSpeed = player.speed * dragPenalty * surgeMul;

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

                state.coverCrates.forEach(crate => {
                    if (Math.hypot(crate.x - nextX, crate.y - player.y) < crate.r + player.r) blockX = true;
                    if (Math.hypot(crate.x - player.x, crate.y - nextY) < crate.r + player.r) blockY = true;
                });

                if (!blockX) player.x = nextX;
                if (!blockY) player.y = nextY;

                keepInBounds(player);

                player.currentNoise = player.noiseBase * dragPenalty;

                if (player.draggingBody) {
                    player.draggingBody.x = player.x - Math.cos(player.angle) * 22;
                    player.draggingBody.y = player.y - Math.sin(player.angle) * 22;

                    if (Math.random() < 0.2) {
                        spawnFloorBlood(player.draggingBody.x, player.draggingBody.y, 6);
                    }
                }
            }
        }

        const wavesEl = document.getElementById('noiseWaves');
        const noiseText = document.getElementById('hudNoiseText');
        if (wavesEl) {
            if (player.currentNoise > 45) {
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

        const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
        state.mouse.worldX = state.mouse.x + state.camera.x;
        state.mouse.worldY = state.mouse.y + state.camera.y;

        if (!state.touch.enabled || !state.touch.joystickActive) {
            player.angle = Math.atan2(state.mouse.worldY - player.y, state.mouse.worldX - player.x);
        } else if (state.touch.moveX !== 0 || state.touch.moveY !== 0) {
            player.angle = Math.atan2(state.touch.moveY, state.touch.moveX);
        }

        const targetCamX = player.x - logicalWidth / 2;
        const targetCamY = player.y - logicalHeight / 2;
        state.camera.x += (targetCamX - state.camera.x) * 0.09;
        state.camera.y += (targetCamY - state.camera.y) * 0.09;

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
                    if (state.selectedId === 'cobra') {
                        // Passive immune
                    } else if (state.selectedId === 'beaver') {
                        l.active = false;
                        audio.playHacking();
                        triggerSparkEffect(player.x, player.y, 10);
                        spawnFloatingText(player.x, player.y - 20, 'CIRCUIT CHEWED (DISABLED)', '#ffea00', 12);
                    } else {
                        if (!window.gameDebug?.godMode) {
                            player.hp -= 2;
                        }
                        triggerSparkEffect(player.x, player.y, 4);
                        if (Math.random() < 0.15) spawnFloorBlood(player.x, player.y, 5);
                        if (player.hp <= 0) handlePlayerDeath();
                    }
                }
            }
        });

        state.thrownCoins.forEach(coin => {
            coin.progress += coin.speed;
            const cx = coin.x + (coin.tx - coin.x) * coin.progress;
            const cy = coin.y + (coin.ty - coin.y) * coin.progress;

            if (Math.random() < 0.4) {
                spawnParticle(cx, cy, '#ffea00', 2.5, 0, 0, 10);
            }

            if (coin.progress >= 1.0) {
                handleCoinLanding(coin.tx, coin.ty);
            }
        });
        state.thrownCoins = state.thrownCoins.filter(c => c.progress < 1.0);

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
                                state.alerts.timer = 320;
                                state.run.alarmsTriggered++;
                                state.run.silentAssassin = false;
                                updateSARatingDisplay();
                                audio.playAlarm();
                                audio.setMode('COMBAT');
                                alertGuardsNear(c.x, c.y, 420);
                                spawnFloatingText(player.x, player.y - 25, 'CAMERA DETECTED!', '#ff0055', 13);
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
                    triggerSparkEffect(player.x, player.y, 8);
                    spawnFloatingText(player.x, player.y - 20, 'DEFLECTED!', '#00e5ff', 12);
                } else {
                    let bulletDmg = b.damage;
                    if (state.selectedId === 'gorilla') bulletDmg *= 0.6;

                    if (!window.gameDebug?.godMode) {
                        player.hp -= bulletDmg;
                    }
                    triggerBloodSplatter(player.x, player.y, 16);
                    triggerScreenShake(5, 8);
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
                    audio.playHeavySlam();
                    triggerSparkEffect(db.x, db.y, 25);
                    alertGuardsNear(db.x, db.y, 240);
                    spawnFloatingText(db.x, db.y - 20, 'FLASHBANG STUN!', '#ffea00', 14);
                }
            }
        });
        state.particles = state.particles.filter(p => p.life > 0);

        state.terminals.forEach(t => {
            t.pulse = (t.pulse + 0.05) % (Math.PI * 2);
        });

        state.chests.forEach(c => {
            if (!c.opened) {
                const dist = Math.hypot(player.x - c.x, player.y - c.y);
                if (dist < 38) {
                    c.opened = true;
                    audio.playCoin();
                    state.run.dna += c.dnaAmount;
                    state.run.score += 250;
                    document.getElementById('hudDNA').textContent = state.run.dna;
                    triggerSparkEffect(c.x, c.y, 14);
                    spawnFloatingText(c.x, c.y - 20, `+${c.dnaAmount} DNA`, '#00e5ff', 13);
                }
            }
        });

        const elevatorDist = Math.hypot(player.x - state.map.elevator.x, player.y - state.map.elevator.y);
        if (elevatorDist < 42 && state.run.hasKey) {
            handleElevatorUnlock();
        }

        updateContextPrompt();

        document.getElementById('healthBar').style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
        document.getElementById('hudHealthText').textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
        document.getElementById('hudScoreText').textContent = state.run.score;

        const alarmPanel = document.getElementById('alarmOverlay');
        if (state.alerts.active) {
            state.alerts.timer--;
            alarmPanel.classList.remove('hidden');
            if (state.alerts.timer <= 0) {
                state.alerts.active = false;
                audio.setMode('STEALTH');
            }
        } else {
            alarmPanel.classList.add('hidden');
        }
    }

    function updateContextPrompt() {
        const player = state.player;
        const promptEl = document.getElementById('contextPrompt');
        const promptKey = document.getElementById('promptKey');
        const promptText = document.getElementById('promptText');

        state.currentContextAction = null;

        let takedownCandidate = null;
        state.guards.forEach(g => {
            if (g.state === 'PACIFIED' || g.state === 'CHASE') return;
            const dist = Math.hypot(g.x - player.x, g.y - player.y);
            if (dist < 46) {
                const angleToGuard = Math.atan2(g.y - player.y, g.x - player.x);
                const angleDiff = Math.abs(normalizeAngle(angleToGuard - g.angle));
                if (angleDiff < Math.PI / 2.6) {
                    takedownCandidate = g;
                }
            }
        });

        if (takedownCandidate) {
            state.currentContextAction = { type: 'TAKEDOWN', target: takedownCandidate };
            promptKey.textContent = 'E / SPACE';
            promptText.textContent = takedownCandidate.isVIP ? 'ASSASSINATE TARGET' : 'SILENT TAKEDOWN (NON-LETHAL)';
            promptEl.classList.remove('hidden');
            return;
        }

        if (player.draggingBody) {
            const nearDumpster = state.dumpsters.find(d => Math.hypot(d.x - player.x, d.y - player.y) < d.r + 25);
            if (nearDumpster) {
                state.currentContextAction = { type: 'DUMP' };
                promptKey.textContent = 'E';
                promptText.textContent = 'HIDE BODY IN DUMPSTER';
                promptEl.classList.remove('hidden');
                return;
            }
        }

        const nearTerminal = state.terminals.find(t => !t.hacked && Math.hypot(t.x - player.x, t.y - player.y) < 45);
        if (nearTerminal) {
            state.currentContextAction = { type: 'HACK' };
            promptKey.textContent = 'E (HOLD)';
            try {
                if (state.hack.active && state.hack.target === nearTerminal) {
                    const pct = Math.round((state.hack.progress / state.hack.required) * 100);
                    promptText.textContent = 'HACKING TERMINAL… ' + pct + '% (HOLD E)';
                } else {
                    promptText.textContent = 'HACK TERMINAL (HOLD E: DISABLE CAMS 20s + REVEAL VIP)';
                }
            } catch (e) {
                promptText.textContent = 'HACK TERMINAL (LOOP CAMERAS)';
            }
            promptEl.classList.remove('hidden');
            return;
        }

        // Pickpocket prompt: sneak behind VIP
        try {
            const pvip = state.guards.find(g => g.isVIP && g.state !== 'PACIFIED' && Math.hypot(g.x - player.x, g.y - player.y) < 46);
            if (pvip && !state.run.hasKey && pvip.state !== 'CHASE') {
                state.currentContextAction = { type: 'PICKPOCKET', target: pvip };
                promptKey.textContent = 'E (HOLD)';
                if (state.hack.active && state.hack.kind === 'PICKPOCKET') {
                    const pct = Math.round((state.hack.progress / state.hack.required) * 100);
                    promptText.textContent = 'LIFTING KEYCARD… ' + pct + '% (HOLD E, STAY UNSEEN)';
                } else {
                    promptText.textContent = 'PICKPOCKET KEYCARD (SNEAK BEHIND VIP, HOLD E)';
                }
                promptEl.classList.remove('hidden');
                return;
            }
        } catch (e) {}

        const nearSupply = state.supplyCrates.find(c => !c.opened && Math.hypot(c.x - player.x, c.y - player.y) < 40);
        if (nearSupply) {
            state.currentContextAction = { type: 'SUPPLY' };
            promptKey.textContent = 'E';
            promptText.textContent = 'LOOT EQUIPMENT CRATE';
            promptEl.classList.remove('hidden');
            return;
        }

        const nearUniform = state.droppedUniforms.find(u => Math.hypot(u.x - player.x, u.y - player.y) < 40);
        if (nearUniform) {
            state.currentContextAction = { type: 'UNIFORM' };
            promptKey.textContent = 'E';
            promptText.textContent = 'STEAL GUARD UNIFORM';
            promptEl.classList.remove('hidden');
            return;
        }

        promptEl.classList.add('hidden');
    }

    function distToSegment(p, v, w) {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    // ==========================================
    // 15. RENDERING PIPELINE
    // ==========================================
    function drawGame() {
        const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = canvas.height / (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, logicalWidth, logicalHeight);

        if (!state.map) return;

        ctx.save();

        if (state.screenShake.intensity > 0) {
            const shakeX = (Math.random() - 0.5) * state.screenShake.intensity;
            const shakeY = (Math.random() - 0.5) * state.screenShake.intensity;
            ctx.translate(-state.camera.x + shakeX, -state.camera.y + shakeY);
        } else {
            ctx.translate(-state.camera.x, -state.camera.y);
        }

        const cols = state.map.cols;
        const rows = state.map.rows;
        const grid = state.map.grid;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tx = c * TILE_SIZE;
                const ty = r * TILE_SIZE;

                if (grid[r][c] === CELL.WALL) {
                    ctx.fillStyle = '#0f1026';
                    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
                } else if (grid[r][c] === CELL.VENT) {
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#334155';
                    for (let k = 4; k < TILE_SIZE - 4; k += 8) {
                        ctx.fillRect(tx + k, ty + 4, 3, TILE_SIZE - 8);
                    }
                } else if (grid[r][c] === CELL.ELEVATOR) {
                    ctx.fillStyle = state.run.hasKey ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255, 0, 127, 0.1)';
                    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = state.run.hasKey ? '#00ff66' : '#ff007f';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                    ctx.font = '24px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🏢', tx + TILE_SIZE / 2, ty + TILE_SIZE / 2);
                } else {
                    ctx.fillStyle = '#070712';
                    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
                }
            }
        }

        state.floorBlood.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        });

        state.coverCrates.forEach(crate => {
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.fillRect(crate.x - 18, crate.y - 18, 36, 36);
            ctx.strokeRect(crate.x - 18, crate.y - 18, 36, 36);
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(crate.x - 14, crate.y - 14);
            ctx.lineTo(crate.x + 14, crate.y + 14);
            ctx.moveTo(crate.x + 14, crate.y - 14);
            ctx.lineTo(crate.x - 14, crate.y + 14);
            ctx.stroke();
        });

        state.bushes.forEach(b => {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌿', b.x, b.y);
        });

        state.dumpsters.forEach(d => {
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 2;
            ctx.fillRect(d.x - 20, d.y - 15, 40, 30);
            ctx.strokeRect(d.x - 20, d.y - 15, 40, 30);
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🗑️', d.x, d.y);
            if (d.bodiesInside > 0) {
                ctx.fillStyle = '#00ff66';
                ctx.font = 'bold 10px Orbitron, sans-serif';
                ctx.fillText(`CONCEALED:${d.bodiesInside}`, d.x, d.y - 22);
            }
        });

        state.deadBodies.forEach(b => {
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.font = '22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (b.isPacified) {
                ctx.fillText(b.isVIP ? '💤👔' : '💤👮', 0, 0);
            } else {
                ctx.fillText(b.isVIP ? '💀👔' : '💀👮', 0, 0);
            }
            ctx.restore();

            if (b.isVIP) {
                ctx.strokeStyle = '#ff0055';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(b.x, b.y, 22, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        state.droppedUniforms.forEach(u => {
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👔', u.x, u.y);
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(u.x, u.y, 16, 0, Math.PI * 2);
            ctx.stroke();
        });

        state.supplyCrates.forEach(c => {
            if (!c.opened) {
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🧰', c.x, c.y);
            }
        });

        state.chests.forEach(c => {
            if (!c.opened) {
                ctx.font = '22px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('📦', c.x, c.y);
            }
        });

        state.terminals.forEach(t => {
            if (!t.hacked) {
                ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 16 + Math.sin(t.pulse) * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🖥️', t.x, t.y);
            } else {
                ctx.fillStyle = 'rgba(0, 255, 102, 0.2)';
                ctx.strokeStyle = '#00ff66';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 16, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🟢', t.x, t.y);
            }
        });

        state.lasers.forEach(l => {
            if (l.active) {
                ctx.strokeStyle = '#ff007f';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff007f';
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

        state.thrownCoins.forEach(coin => {
            const cx = coin.x + (coin.tx - coin.x) * coin.progress;
            const cy = coin.y + (coin.ty - coin.y) * coin.progress;
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        state.projectiles.forEach(p => {
            if (p.type === 'TRANQ') {
                ctx.fillStyle = '#00e5ff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        state.cameras.forEach(c => {
            const isDis = c.disabledTimer && c.disabledTimer > 0;
            ctx.save();
            ctx.translate(c.x, c.y);

            if (!isDis) {
                ctx.fillStyle = state.alerts.active ? 'rgba(255, 0, 127, 0.16)' : 'rgba(0, 229, 255, 0.12)';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, c.range, c.angle - c.fov / 2, c.angle + c.fov / 2);
                ctx.closePath();
                ctx.fill();
            }

            ctx.rotate(c.angle);
            ctx.fillStyle = isDis ? '#475569' : '#1e293b';
            ctx.strokeStyle = isDis ? '#64748b' : '#00e5ff';
            ctx.lineWidth = 2;
            ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = isDis ? '#94a3b8' : '#e11d48';
            ctx.fillRect(8, -4, 6, 8);
            ctx.restore();
        });

        state.smokeClouds.forEach(s => {
            const alpha = Math.min(0.55, (s.life / s.maxLife) * 0.6);
            ctx.fillStyle = s.isAcid ? `rgba(0, 255, 102, ${alpha})` : `rgba(203, 213, 225, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        state.guards.forEach(g => {
            if (g.state === 'PACIFIED') return;

            const hasDisguise = state.player && state.player.disguise === 'GUARD' && !g.isVIP;
            const coneColor = g.state === 'CHASE' ? 'rgba(255, 0, 85, 0.18)' :
                             (hasDisguise ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 234, 0, 0.12)');

            ctx.fillStyle = coneColor;
            ctx.beginPath();
            ctx.moveTo(g.x, g.y);
            const visDist = hasDisguise ? 65 : 180;
            ctx.arc(g.x, g.y, visDist, g.angle - 0.65, g.angle + 0.65);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(g.x, g.y);
            ctx.lineTo(g.x + Math.cos(g.angle) * visDist, g.y + Math.sin(g.angle) * visDist);
            ctx.stroke();

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
                ctx.font = 'bold 10px Orbitron, sans-serif';
                ctx.fillText('TARGET', g.x, g.y - 26);
            } else if (g.isEnforcer) {
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(g.x, g.y - 20, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            // Agent C elites: minimal functional markers (presentation owns the rest)
            try {
                if (g.elite === 'SHIELDED') {
                    ctx.font = '13px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('🛡️', g.x + 14, g.y - 14);
                } else if (g.elite === 'VETERAN') {
                    ctx.font = '13px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('⭐', g.x + 14, g.y - 14);
                }
            } catch (e) {}

            if (g.suspicion > 0 && g.state !== 'CHASE') {
                ctx.fillStyle = '#ffea00';
                ctx.font = 'bold 14px Orbitron, sans-serif';
                ctx.fillText('?', g.x, g.y - (g.isVIP ? 38 : 24));

                ctx.strokeStyle = '#ffea00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(g.x, g.y - (g.isVIP ? 38 : 24), 9, -Math.PI / 2, -Math.PI / 2 + (g.suspicion / 100) * (Math.PI * 2));
                ctx.stroke();
            } else if (g.state === 'CHASE') {
                ctx.fillStyle = '#ff0055';
                ctx.font = 'bold 13px Orbitron, sans-serif';
                ctx.fillText('!', g.x, g.y - (g.isVIP ? 38 : 24));
            } else if (g.state === 'INSPECT') {
                ctx.fillStyle = '#ffea00';
                ctx.font = 'bold 10px Orbitron, sans-serif';
                ctx.fillText('SEARCHING', g.x, g.y - (g.isVIP ? 38 : 24));
            }

            ctx.fillStyle = '#1e1e2f';
            ctx.fillRect(g.x - 15, g.y + 18, 30, 4);
            ctx.fillStyle = '#10b981';
            const maxGuardHp = g.maxHp || (g.isVIP ? 45 : 55 + state.run.floor * 10);
            ctx.fillRect(g.x - 15, g.y + 18, Math.max(0, 30 * (g.hp / maxGuardHp)), 4);
        });

        // Agent C drones (camera-mobile elites): minimal functional render
        try {
            (state.drones || []).forEach(d => {
                const isDis = d.disabledTimer && d.disabledTimer > 0;
                if (!isDis) {
                    ctx.fillStyle = 'rgba(255, 0, 127, 0.10)';
                    ctx.beginPath();
                    ctx.moveTo(d.x, d.y);
                    ctx.arc(d.x, d.y, d.range || 170, d.angle - (d.fov || 0.7) / 2, d.angle + (d.fov || 0.7) / 2);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(isDis ? '🛰️' : '🛸', d.x, d.y);
            });
        } catch (e) {}

        state.bullets.forEach(b => {
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            ctx.lineTo(b.x2, b.y2);
            ctx.stroke();
        });

        state.gibs.forEach(g => {
            ctx.fillStyle = 'rgba(160, 10, 20, 0.9)';
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
            ctx.fill();
        });

        state.slashes.forEach(s => {
            ctx.strokeStyle = 'rgba(255, 0, 70, 0.7)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, s.angle - 0.75, s.angle + 0.75);
            ctx.stroke();
        });

        if (state.player && state.player.hp > 0) {
            const player = state.player;

            if (player.currentNoise > 0) {
                ctx.strokeStyle = player.currentNoise > 45 ? 'rgba(255, 0, 127, 0.35)' : 'rgba(0, 229, 255, 0.2)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(player.x, player.y, player.currentNoise * 1.6, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.save();
            ctx.translate(player.x, player.y);

            ctx.rotate(player.angle);
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(24, 0);
            ctx.stroke();
            ctx.restore();

            const info = ROSTER.find(r => r.id === state.selectedId);

            if (player.inCover || (state.selectedId === 'panther' && player.currentNoise === 0)) {
                ctx.globalAlpha = 0.45;
            }

            ctx.font = '26px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (player.burrowTimer > 0) {
                ctx.font = '20px Arial';
                ctx.fillText('🕳️', player.x, player.y);
            } else {
                ctx.fillText(info.emoji, player.x, player.y);

                if (player.disguise === 'GUARD') {
                    ctx.font = '12px Arial';
                    ctx.fillText('👮', player.x + 10, player.y - 12);
                }
            }
            ctx.globalAlpha = 1.0;
        }

        const isHawkRecon = state.player && state.player.reconActiveTimer && state.player.reconActiveTimer > 0;
        if (state.player && !isHawkRecon) {
            const rad = 240 + (state.run.upgrades.vision * 40);
            const grad = ctx.createRadialGradient(state.player.x, state.player.y, rad * 0.45, state.player.x, state.player.y, rad);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.92)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(state.player.x, state.player.y, Math.max(state.map.cols * TILE_SIZE, state.map.rows * TILE_SIZE), 0, Math.PI * 2);
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
            } else if (p.type === 'SOUND_RIPPLE') {
                p.r += 6;
                ctx.strokeStyle = `rgba(255, 234, 0, ${p.life / 30})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        state.floatingTexts.forEach(t => {
            ctx.font = `bold ${t.size}px Orbitron, sans-serif`;
            ctx.fillStyle = t.color;
            ctx.textAlign = 'center';
            ctx.fillText(t.text, t.x, t.y);
        });

        ctx.restore();
    }

    // ==========================================
    // 16. STATE MANAGERS & SCREEN NAVIGATION
    // ==========================================
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
            try { aaInjectContractUI(); } catch (e) {}
        }
        else if (newMode === 'PLAY') {
            document.getElementById('gameMain').classList.remove('hidden');
            resizeCanvas();
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
            try {
                const res = aaComputeFinalScore();
                totalScore = res.total;
                const rating = res.rating;
                if (rating === 'PHANTOM') saRatingText = "YES (👻 PHANTOM ×2.5 +5000/FLR: zero alarms, zero knockouts, bodies hidden!)";
                else if (rating === 'GHOST') saRatingText = "YES (👻 GHOST ×2.0 +2500/FLR: zero alarms, zero kills!)";
                else if (rating === 'SILENT_ASSASSIN') saRatingText = "YES (👑 SILENT ASSASSIN ×1.5 +2500/FLR!)";
                else if (rating === 'SHADOW') saRatingText = "PARTIAL (SHADOW ×1.2: SA lost but streak kept)";
                state.run.score = totalScore;
                // Persist run best + settings
                try { aaRecordRunBest(); } catch (e) {}
                // Record contract result
                try {
                    const c = aaGetActiveContract();
                    const api = aaGetContracts();
                    if (c && api && typeof api.recordResult === 'function') {
                        const rank = state.run.contractFailed ? 'BRONZE' :
                            (rating === 'PHANTOM' ? 'PHANTOM' : rating === 'GHOST' ? 'GHOST' :
                             rating === 'SILENT_ASSASSIN' ? 'SILENT_ASSASSIN' : rating === 'SHADOW' ? 'SILVER' : 'BRONZE');
                        api.recordResult(c.id, rank, { floor: state.run.floor, score: totalScore });
                    }
                } catch (e) {}
            } catch (e) {
                if (state.run.silentAssassin) {
                    totalScore += 2500 * state.run.floor;
                    saRatingText = "YES (👑 SILENT ASSASSIN BONUS +2500/FLR!)";
                }
            }

            document.getElementById('finalKills').innerHTML = `${state.run.kills} (Silent Assassin: <span style="color:${state.run.silentAssassin ? '#00ff66' : '#ff0055'}">${saRatingText}</span>)`;
            document.getElementById('finalDNA').textContent = state.run.dna;
            document.getElementById('finalScore').textContent = totalScore;
        }
        else if (newMode === 'PAUSE') {
            document.getElementById('pauseScreen').classList.remove('hidden');
        }
    }

    function handleElevatorUnlock() {
        audio.playLevelUp();
        emitAssassinEvent('elevator', { floor: state.run.floor });
        try { aaRecordRunBest(); } catch (e) {}
        changeState('SHOP');
    }

    function handlePlayerDeath() {
        audio.playFailure();
        emitAssassinEvent('playerdown', { x: state.player ? state.player.x : 0, y: state.player ? state.player.y : 0 });
        triggerBloodSplatter(state.player.x, state.player.y, 60);
        spawnGibs(state.player.x, state.player.y, 10);
        state.player.hp = 0;
        try { aaRecordRunBest(); } catch (e) {}
        setTimeout(() => changeState('GAMEOVER'), 1000);
    }

    // ==========================================
    // 17. UI RENDERING: ROSTER, SHOP, MANUAL
    // ==========================================
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
                audio.playTone(500, 'sine', 0.1, 0.05);
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
                    audio.playLevelUp();
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

    // ==========================================
    // 18. TOUCH CONTROLS & EVENT BINDINGS
    // ==========================================
    function setupTouchControls() {
        const joystickZone = document.getElementById('touchJoystickZone');
        const thumb = document.getElementById('joystickThumb');

        let touchId = null;

        joystickZone.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            touchId = touch.identifier;
            state.touch.joystickActive = true;
            const rect = joystickZone.getBoundingClientRect();
            state.touch.startX = rect.left + rect.width / 2;
            state.touch.startY = rect.top + rect.height / 2;
        }, { passive: false });

        window.addEventListener('touchmove', e => {
            if (!state.touch.joystickActive) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === touchId) {
                    const dx = touch.clientX - state.touch.startX;
                    const dy = touch.clientY - state.touch.startY;
                    const dist = Math.hypot(dx, dy);
                    const maxDist = 45;

                    const clampedX = dist > maxDist ? (dx / dist) * maxDist : dx;
                    const clampedY = dist > maxDist ? (dy / dist) * maxDist : dy;

                    thumb.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
                    state.touch.moveX = clampedX / maxDist;
                    state.touch.moveY = clampedY / maxDist;
                }
            }
        }, { passive: false });

        const endTouch = e => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    state.touch.joystickActive = false;
                    state.touch.moveX = 0;
                    state.touch.moveY = 0;
                    thumb.style.transform = `translate(0px, 0px)`;
                    touchId = null;
                }
            }
        };

        window.addEventListener('touchend', endTouch);
        window.addEventListener('touchcancel', endTouch);

        document.getElementById('btnTouchAttack').addEventListener('touchstart', e => {
            e.preventDefault();
            triggerPrimaryAttack();
        });
        document.getElementById('btnTouchAbility').addEventListener('touchstart', e => {
            e.preventDefault();
            triggerSpecialAbility();
        });
        document.getElementById('btnTouchCoin').addEventListener('touchstart', e => {
            e.preventDefault();
            tossCoin(state.mouse.worldX, state.mouse.worldY);
        });
        document.getElementById('btnTouchInteract').addEventListener('touchstart', e => {
            e.preventDefault();
            handleInteraction();
        });
    }

    function bindGameEvents() {
        window.addEventListener('keydown', e => {
            audio.ensureActive();
            state.keys[e.code] = true;

            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (state.mode === 'PLAY') changeState('PAUSE');
                else if (state.mode === 'PAUSE') changeState('PLAY');
            }

            if (e.code === 'Space') {
                e.preventDefault();
                triggerPrimaryAttack();
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

            if (e.code === 'KeyQ') {
                tossCoin(state.mouse.worldX, state.mouse.worldY);
            }

            if (e.code === 'Digit1') useGadget('medkit');
            if (e.code === 'Digit2') useGadget('tranq');
            if (e.code === 'Digit3') useGadget('smoke');
            if (e.code === 'Digit4') useGadget('decoy');
            if (e.code === 'Digit5') useGadget('surge');
        });

        window.addEventListener('keyup', e => {
            state.keys[e.code] = false;
        });

        const getMousePos = (c, evt) => {
            const rect = c.getBoundingClientRect();
            return {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top
            };
        };

        canvas.addEventListener('mousemove', e => {
            const pos = getMousePos(canvas, e);
            state.mouse.x = pos.x;
            state.mouse.y = pos.y;
        });

        canvas.addEventListener('mousedown', e => {
            audio.ensureActive();
            if (e.button === 0) {
                triggerPrimaryAttack();
            } else if (e.button === 2) {
                e.preventDefault();
                tossCoin(state.mouse.worldX, state.mouse.worldY);
            }
        });

        canvas.addEventListener('contextmenu', e => e.preventDefault());

        document.getElementById('slotMedkit').addEventListener('click', () => useGadget('medkit'));
        document.getElementById('slotTranq').addEventListener('click', () => useGadget('tranq'));
        document.getElementById('slotSmoke').addEventListener('click', () => useGadget('smoke'));

        document.getElementById('btnToggleSound').addEventListener('click', () => {
            const isSoundOn = audio.toggleMute();
            document.getElementById('btnToggleSound').textContent = isSoundOn ? '🔊 Sound: ON' : '🔇 Sound: OFF';
            try { aaPersistSettings(); } catch (e) {}
        });

        document.getElementById('btnToggleTouch').addEventListener('click', () => {
            state.touch.enabled = !state.touch.enabled;
            const container = document.getElementById('touchControlsContainer');
            if (state.touch.enabled) {
                container.classList.remove('hidden');
                document.getElementById('btnToggleTouch').textContent = '📱 Touch: ON';
            } else {
                container.classList.add('hidden');
                document.getElementById('btnToggleTouch').textContent = '📱 Touch: OFF';
            }
        });

        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            state.touch.enabled = true;
            document.getElementById('touchControlsContainer').classList.remove('hidden');
            document.getElementById('btnToggleTouch').textContent = '📱 Touch: ON';
        }

        document.getElementById('btnGoToCharSelect').addEventListener('click', () => {
            audio.playTone(600, 'sine', 0.1, 0.05);
            changeState('SELECT');
        });

        document.getElementById('btnOpenGuide').addEventListener('click', () => {
            audio.playTone(600, 'sine', 0.1, 0.05);
            renderFieldGuideRoster();
            document.getElementById('guideOverlay').classList.remove('hidden');
        });

        document.getElementById('btnCloseGuide').addEventListener('click', () => {
            audio.playTone(400, 'sine', 0.1, 0.05);
            document.getElementById('guideOverlay').classList.add('hidden');
        });

        document.getElementById('btnResumeFromGuide').addEventListener('click', () => {
            audio.playTone(500, 'sine', 0.1, 0.05);
            document.getElementById('guideOverlay').classList.add('hidden');
        });

        const tabs = document.querySelectorAll('.guide-tab');
        tabs.forEach(t => {
            t.addEventListener('click', () => {
                audio.playTone(500, 'sine', 0.08, 0.05);
                tabs.forEach(tab => tab.classList.remove('active'));
                t.classList.add('active');

                const paneId = `guide-pane-${t.getAttribute('data-guide-tab')}`;
                document.querySelectorAll('.guide-pane').forEach(p => p.classList.remove('active'));
                document.getElementById(paneId).classList.add('active');
            });
        });

        document.getElementById('btnBackToMenu').addEventListener('click', () => {
            audio.playTone(400, 'sine', 0.1, 0.05);
            changeState('MENU');
        });

        document.getElementById('btnLaunchRun').addEventListener('click', () => {
            audio.playTone(800, 'sine', 0.15, 0.08);
            try {
                // Sync contract select (if player picked one in char select)
                const sel = document.getElementById('aaContractSelect');
                if (sel) aaSetContract(sel.value || null);
            } catch (e) {}
            initRun();
            changeState('PLAY');
        });

        document.getElementById('btnPauseGame').addEventListener('click', () => changeState('PAUSE'));
        document.getElementById('btnResumeMission').addEventListener('click', () => changeState('PLAY'));
        document.getElementById('btnRestartFromPause').addEventListener('click', () => {
            initRun();
            changeState('PLAY');
        });
        document.getElementById('btnPauseToMenu').addEventListener('click', () => changeState('MENU'));

        document.getElementById('btnDescendNextFloor').addEventListener('click', () => {
            audio.playLevelUp();
            state.run.floor++;
            launchFloor();
            changeState('PLAY');
        });

        document.getElementById('btnRestartRun').addEventListener('click', () => {
            initRun();
            changeState('PLAY');
        });
        document.getElementById('btnGameOverToMenu').addEventListener('click', () => changeState('MENU'));

        setupTouchControls();
    }

    // ==========================================
    // 19. 60FPS ENGINE LOOP
    // ==========================================
    let lastTimestamp = 0;
    function gameLoop(timestamp) {
        const rawDeltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        const speed = state.speedMultiplier || 1;
        const deltaTime = Math.min(rawDeltaTime, 100) * speed;

        if (state.mode === 'PLAY') {
            try {
                updateGame(deltaTime);
            } catch (e) {
                // Frame loop must survive errors from any system (Agent C contract).
                try { state.hack.active = false; } catch (e2) {}
            }
            try {
                drawGame();
            } catch (e) { /* render must never kill the loop */ }
            try { aaDrawHackBar(); } catch (e) {}
        }
        requestAnimationFrame(gameLoop);
    }

    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SET_GAME_SPEED') {
            const speed = parseFloat(event.data.speed);
            if (!isNaN(speed) && speed > 0) {
                state.speedMultiplier = speed;
            }
        }
    });

    bindGameEvents();
    // Agent C: load persisted settings (mute) on boot — never crash boot.
    try {
        const saved = aaLoadSave();
        if (saved && typeof saved.muted === 'boolean' && saved.muted) {
            audio.muted = true;
            const sb = document.getElementById('btnToggleSound');
            if (sb) sb.textContent = '🔇 Sound: OFF';
        }
    } catch (e) {}
    requestAnimationFrame(gameLoop);
    changeState('MENU');

    // Agent D presentation hook (additive, read-only for fx/ modules).
    try {
        window.AssassinGame = {
            version: '2.0.0',
            state: state,
            audio: audio,
            roster: ROSTER,
            fns: {
                triggerScreenShake: triggerScreenShake,
                spawnParticle: spawnParticle,
                spawnFloorBlood: spawnFloorBlood,
                spawnGibs: spawnGibs,
                spawnFloatingText: spawnFloatingText,
                triggerBloodSplatter: triggerBloodSplatter,
                triggerSparkEffect: triggerSparkEffect,
                triggerAcidPuff: triggerAcidPuff
            }
        };
    } catch (e) { /* never break boot */ }

    // ==========================================
    // 19B. SYSTEMS UPGRADE PACK (Agent C) - additive + defensive
    // Contracts, persistence, guard AI helpers, hacking/pickpocket,
    // new gadgets, difficulty scaling, scoring tiers. No render/CSS work.
    // Every public helper is try/catch guarded; frame loop must survive.
    // ==========================================
    const AASAVE_KEY = 'assassinanimals_save_v1';

    function aaSafe(fn, fallback) {
        try { return fn(); } catch (e) { return fallback; }
    }

    function aaGetContracts() {
        try { return window.AssassinContracts || null; } catch (e) { return null; }
    }

    function aaGetActiveContract() {
        try {
            const api = aaGetContracts();
            if (!api) return null;
            if (state.run.contractId) {
                const c = api.get(state.run.contractId);
                if (c) return c;
            }
            if (typeof api.getActive === 'function') {
                const a = api.getActive();
                if (a) return a;
            }
            return null;
        } catch (e) { return null; }
    }

    function aaLoadSave() {
        try {
            const raw = localStorage.getItem(AASAVE_KEY);
            if (!raw) return null;
            const s = JSON.parse(raw);
            if (!s || typeof s !== 'object') return null;
            if (typeof s.muted === 'boolean') {
                audio.muted = s.muted;
            }
            return s;
        } catch (e) { return null; }
    }

    function aaWriteSave(patch) {
        try {
            let cur = {};
            try {
                cur = JSON.parse(localStorage.getItem(AASAVE_KEY) || '{}') || {};
            } catch (e) {}
            const next = Object.assign({}, cur, patch || {});
            localStorage.setItem(AASAVE_KEY, JSON.stringify(next));
        } catch (e) {}
    }

    function aaPersistSettings() {
        aaSafe(() => {
            aaWriteSave({ muted: !!audio.muted });
            return true;
        }, false);
    }

    function aaRecordRunBest() {
        aaSafe(() => {
            let cur = {};
            try { cur = JSON.parse(localStorage.getItem(AASAVE_KEY) || '{}') || {}; } catch (e) {}
            const best = cur.best || { floor: 0, score: 0 };
            let dirty = false;
            if (state.run.floor > (best.floor || 0)) { best.floor = state.run.floor; dirty = true; }
            if (state.run.score > (best.score || 0)) { best.score = state.run.score; dirty = true; }
            cur.best = best;
            cur.lastRun = { floor: state.run.floor, score: state.run.score, kills: state.run.kills, at: Date.now() };
            cur.muted = !!audio.muted;
            localStorage.setItem(AASAVE_KEY, JSON.stringify(cur));
            return dirty;
        }, false);
    }

    function aaContractFail(reason) {
        try {
            if (!state.run.contractId || state.run.contractFailed) return;
            state.run.contractFailed = true;
            spawnFloatingText(state.player.x, state.player.y - 30, 'CONTRACT FAILED: ' + reason, '#ff0055', 13);
        } catch (e) {}
    }

    // ---- Difficulty scaling helpers ----
    function aaScaleGuardForFloor(g, floorNum) {
        try {
            const f = Math.max(1, floorNum | 0);
            const hpMul = 1 + (f - 1) * 0.12;
            const spMul = 1 + Math.min(0.5, (f - 1) * 0.05);
            g.hp = Math.round(g.hp * hpMul);
            g.maxHp = g.hp;
            g.speed = +(g.speed * spMul).toFixed(2);
            // Elites from floor 4+
            if (f >= 4 && !g.isVIP && !g.elite) {
                const roll = Math.random();
                if (roll < 0.12 + (f - 4) * 0.03) {
                    g.elite = 'SHIELDED';
                    g.hp = Math.round(g.hp * 1.8);
                    g.maxHp = g.hp;
                    g.speed = +(g.speed * 0.95).toFixed(2);
                } else if (roll < 0.22 + (f - 4) * 0.04) {
                    g.elite = 'VETERAN';
                    g.hp = Math.round(g.hp * 1.35);
                    g.maxHp = g.hp;
                    g.speed = +(g.speed * 1.15).toFixed(2);
                    g.suspicionRate = 6.5;
                }
            }
        } catch (e) {}
    }

    function aaBuildPatrolRoute(g, room) {
        try {
            const pts = [];
            const n = 2 + Math.floor(Math.random() * 2); // 2-3 nodes
            for (let i = 0; i < n; i++) {
                const px = (room.x + 1 + Math.random() * Math.max(1, room.w - 2)) * TILE_SIZE;
                const py = (room.y + 1 + Math.random() * Math.max(1, room.h - 2)) * TILE_SIZE;
                pts.push({ x: px, y: py });
            }
            if (pts.length) {
                g.patrolRoute = pts;
                g.patrolIdx = 0;
                g.patrolNode = pts[0];
            }
        } catch (e) {}
    }

    function aaAdvancePatrol(g) {
        try {
            if (g.patrolRoute && g.patrolRoute.length > 1) {
                g.patrolIdx = ((g.patrolIdx || 0) + 1) % g.patrolRoute.length;
                g.patrolNode = g.patrolRoute[g.patrolIdx];
            } else {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 110 + 40;
                g.patrolNode = { x: g.x + Math.cos(angle) * dist, y: g.y + Math.sin(angle) * dist };
            }
        } catch (e) {}
    }

    // ESCALATE: caller alerts nearby guards within 250px (SEARCH state)
    function aaEscalate(sourceGuard) {
        try {
            state.guards.forEach(g => {
                if (g === sourceGuard || g.state === 'PACIFIED') return;
                const d = Math.hypot(g.x - sourceGuard.x, g.y - sourceGuard.y);
                if (d < 250 && g.state !== 'CHASE') {
                    g.state = 'SEARCH';
                    g.searchTarget = { x: state.player.x, y: state.player.y };
                    g.searchTimer = 300;
                    g.suspicion = Math.max(g.suspicion || 0, 60);
                }
            });
        } catch (e) {}
    }

    // ---- Scoring tiers ----
    function aaComputeRating() {
        try {
            const r = state.run;
            if (r.alarmsTriggered === 0 && r.kills === 0 && r.knockouts === 0 && r.bodiesDiscovered === 0) return 'PHANTOM';
            if (r.alarmsTriggered === 0 && r.kills === 0 && r.bodiesDiscovered === 0) return 'GHOST';
            if (r.silentAssassin && r.alarmsTriggered === 0) return 'SILENT_ASSASSIN';
            if (r.silentAssassin) return 'SHADOW';
            return 'COMPROMISED';
        } catch (e) { return 'COMPROMISED'; }
    }

    function aaComputeFinalScore() {
        try {
            const r = state.run;
            let total = r.score;
            const rating = aaComputeRating();
            const floorBonus = 250 * r.floor;
            total += floorBonus;
            if (rating === 'SILENT_ASSASSIN') total = Math.round(total * 1.5 + 2500 * r.floor);
            else if (rating === 'GHOST') total = Math.round(total * 2.0 + 2500 * r.floor);
            else if (rating === 'PHANTOM') total = Math.round(total * 2.5 + 5000 * r.floor);
            else if (rating === 'SHADOW') total = Math.round(total * 1.2);
            // Time bonus: faster floors pay (par 150s per floor)
            try {
                const elapsed = (Date.now() - (r.runStartTime || Date.now())) / 1000;
                const par = 150 * r.floor;
                if (elapsed < par) total += Math.round((par - elapsed) * 5);
            } catch (e) {}
            // Body-hidden bonus
            total += (r.bodiesHidden || 0) * 150;
            // Active contract multiplier
            try {
                const c = aaGetActiveContract();
                if (c && !r.contractFailed && typeof c.scoreMult === 'number') {
                    total = Math.round(total * c.scoreMult);
                }
            } catch (e) {}
            return { total, rating };
        } catch (e) { return { total: state.run.score, rating: 'COMPROMISED' }; }
    }

    function aaSetContract(id) {
        try {
            const api = aaGetContracts();
            if (api && typeof api.setActive === 'function') api.setActive(id || null);
            state.run.contractId = id || null;
            state.run.contractFailed = false;
            state.run.contractFlags = {};
            aaUpdateContractBadge();
            return true;
        } catch (e) { return false; }
    }

    function aaUpdateContractBadge() {
        try {
            let badge = document.getElementById('hudContractBadge');
            const c = aaGetActiveContract();
            if (!c) {
                if (badge) badge.textContent = '';
                return;
            }
            if (!badge) {
                const anchor = document.getElementById('hudSAText');
                if (anchor && anchor.parentElement) {
                    badge = document.createElement('span');
                    badge.id = 'hudContractBadge';
                    badge.className = 'sa-status';
                    badge.style.marginLeft = '8px';
                    anchor.parentElement.appendChild(badge);
                } else return;
            }
            const prog = aaGetContracts() ? aaGetContracts().getBest(c.id) : 'NONE';
            badge.textContent = '📜 ' + c.name + (prog && prog !== 'NONE' ? ' (BEST: ' + prog + ')' : '');
        } catch (e) {}
    }

    function aaInjectContractUI() {
        try {
            const host = document.getElementById('charSelectScreen') || document.getElementById('mainMenuScreen');
            if (!host || document.getElementById('aaContractPanel')) return;
            const api = aaGetContracts();
            if (!api) return;
            const panel = document.createElement('div');
            panel.id = 'aaContractPanel';
            panel.style.cssText = 'margin:12px auto;max-width:640px;padding:10px;border:1px solid rgba(0,229,255,.4);border-radius:8px;background:rgba(0,20,30,.55);color:#cbd5e1;font-size:13px;';
            const title = document.createElement('div');
            title.innerHTML = '<strong style="color:#00e5ff">📜 CONTRACT SELECT</strong> <span style="opacity:.7">(optional — bonus DNA/score)</span>';
            panel.appendChild(title);
            const sel = document.createElement('select');
            sel.id = 'aaContractSelect';
            sel.style.cssText = 'width:100%;margin-top:8px;padding:6px;background:#0b1220;color:#e2e8f0;border:1px solid #334155;border-radius:6px;';
            const none = document.createElement('option');
            none.value = '';
            none.textContent = '— No contract (free run) —';
            sel.appendChild(none);
            api.list().forEach(c => {
                const o = document.createElement('option');
                let best = 'NONE';
                try { best = api.getBest(c.id); } catch (e) {}
                o.value = c.id;
                o.textContent = c.name + ' · Fl.' + c.floor + ' · ×' + c.scoreMult + ' · +' + c.rewardDNA + ' DNA' + (best !== 'NONE' ? ' · BEST ' + best : '');
                sel.appendChild(o);
            });
            sel.value = state.run.contractId || api.activeId || '';
            sel.addEventListener('change', () => {
                aaSafe(() => {
                    aaSetContract(sel.value || null);
                    const c = aaGetActiveContract();
                    const b = document.getElementById('aaContractBrief');
                    if (b) b.textContent = c ? ('📋 ' + c.briefing + ' (Reward: +' + c.rewardDNA + ' DNA, ×' + c.scoreMult + ' score)') : '';
                    return true;
                }, false);
            });
            panel.appendChild(sel);
            const brief = document.createElement('div');
            brief.id = 'aaContractBrief';
            brief.style.cssText = 'margin-top:8px;opacity:.9;';
            const cur = aaGetActiveContract();
            brief.textContent = cur ? ('📋 ' + cur.briefing) : '';
            panel.appendChild(brief);
            // Insert at top of char select container, else end of host
            const anchor = host.querySelector('.char-select-container') || host.querySelector('.menu-container');
            if (anchor) anchor.insertBefore(panel, anchor.firstChild);
            else host.appendChild(panel);
        } catch (e) {}
    }

    function aaEnforceContractOperative() {
        try {
            const c = aaGetActiveContract();
            if (!c || !c.operative || c.operative === 'any') return true;
            return state.selectedId === c.operative;
        } catch (e) { return true; }
    }

    // ---- Hack / pickpocket hold-E progress ----
    function aaHackTick() {
        try {
            const h = state.hack;
            if (!h.active || !state.player || state.player.hp <= 0) return;
            // Moving cancels precision work (still allow tiny drift)
            const moving = state.keys['KeyW'] || state.keys['KeyS'] || state.keys['KeyA'] || state.keys['KeyD'] ||
                state.keys['ArrowUp'] || state.keys['ArrowDown'] || state.keys['ArrowLeft'] || state.keys['ArrowRight'];
            if (moving) {
                h.progress = Math.max(0, h.progress - 2);
                return;
            }
            const eHeld = !!state.keys['KeyE'];
            if (!eHeld) return;
            h.progress++;
            if (h.progress >= h.required) {
                if (h.kind === 'TERMINAL' && h.target && !h.target.hacked) {
                    h.target.hacked = true;
                    audio.playHacking();
                    triggerSparkEffect(h.target.x, h.target.y, 20);
                    state.run.hasKey = true;
                    const hk = document.getElementById('hudKey');
                    if (hk) hk.textContent = '🔑 YES';
                    state.cameras.forEach(c => { c.disabledTimer = 1200; });
                    try {
                        state.drones.forEach(d => { d.disabledTimer = 1200; });
                    } catch (e) {}
                    state.run.score += 400;
                    state.run.hackCount++;
                    state.run.contractFlags.hacked = true;
                    // reveal VIP
                    state.guards.forEach(g => { if (g.isVIP) g.revealed = true; });
                    spawnFloatingText(h.target.x, h.target.y - 25, 'TERMINAL HACKED: CAMERAS LOOPED 20s + VIP REVEALED!', '#00e5ff', 13);
                } else if (h.kind === 'PICKPOCKET' && h.target && h.target.state !== 'PACIFIED') {
                    state.run.hasKey = true;
                    const hk2 = document.getElementById('hudKey');
                    if (hk2) hk2.textContent = '🔑 YES';
                    state.run.pickpocketCount++;
                    state.run.contractFlags.pickpocketed = true;
                    state.run.score += 600;
                    audio.playCoin();
                    spawnFloatingText(state.player.x, state.player.y - 25, '🔑 KEYCARD LIFTED (UNDETECTED)!', '#00ff66', 13);
                }
                state.hack.active = false;
                state.hack.target = null;
                state.hack.progress = 0;
            }
        } catch (e) {
            try { state.hack.active = false; } catch (e2) {}
        }
    }

    function aaStartHack(kind, target, requiredTicks) {
        try {
            state.hack.active = true;
            state.hack.kind = kind;
            state.hack.target = target;
            state.hack.progress = 0;
            state.hack.required = requiredTicks || 120;
        } catch (e) {}
    }

    function aaDrawHackBar() {
        try {
            if (!state.hack.active) return;
            const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
            const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
            ctx.save();
            ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
            const w = 260, h = 14;
            const x = (logicalWidth - w) / 2, y = logicalHeight - 90;
            const pct = Math.min(1, state.hack.progress / state.hack.required);
            ctx.fillStyle = 'rgba(0,0,0,.65)';
            ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
            ctx.fillStyle = '#164e63';
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = state.hack.kind === 'PICKPOCKET' ? '#00ff66' : '#00e5ff';
            ctx.fillRect(x, y, w * pct, h);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(state.hack.kind === 'PICKPOCKET' ? 'LIFTING KEYCARD… HOLD E' : 'HACKING TERMINAL… HOLD E', logicalWidth / 2, y - 8);
            ctx.restore();
        } catch (e) {}
    }

    // ---- New gadgets: Noise Decoy (4) + Adrenal Surge (5) ----
    function aaUseGadgetExtended(type) {
        try {
            if (state.mode !== 'PLAY' || !state.player || state.player.hp <= 0) return false;
            if (type === 'decoy') {
                if ((state.run.gadgets.decoy || 0) <= 0) return false;
                state.run.gadgets.decoy--;
                audio.playCoin();
                const tx = state.mouse.worldX, ty = state.mouse.worldY;
                state.particles.push({ type: 'SOUND_RIPPLE', x: tx, y: ty, r: 10, maxR: 200, life: 40 });
                state.guards.forEach(g => {
                    if (g.state === 'PACIFIED' || g.state === 'CHASE') return;
                    const d = Math.hypot(g.x - tx, g.y - ty);
                    if (d < 260 && !isLineBlocked(g.x, g.y, tx, ty, state.map.grid)) {
                        g.state = 'SEARCH';
                        g.searchTarget = { x: tx, y: ty };
                        g.searchTimer = 260;
                    }
                });
                state.run.decoyUsed = true;
                state.run.contractFlags.decoyUsed = true;
                spawnFloatingText(tx, ty - 20, '🔊 NOISE DECOY', '#ffea00', 13);
                updateGadgetHUD();
                return true;
            }
            if (type === 'surge') {
                if ((state.run.gadgets.surge || 0) <= 0) return false;
                if (state.surge.active) return false;
                state.run.gadgets.surge--;
                state.surge.active = true;
                state.surge.timer = 360; // ~6s
                audio.playLevelUp();
                spawnFloatingText(state.player.x, state.player.y - 25, '⚡ ADRENAL SURGE!', '#00e5ff', 14);
                updateGadgetHUD();
                return true;
            }
            return false;
        } catch (e) { return false; }
    }

    function aaSurgeTick() {
        try {
            if (state.surge.active) {
                state.surge.timer--;
                if (state.surge.timer <= 0) {
                    state.surge.active = false;
                    state.surge.timer = 0;
                }
            }
        } catch (e) {
            try { state.surge.active = false; } catch (e2) {}
        }
    }

    function aaSurgeSpeedMul() {
        try { return state.surge.active ? 1.45 : 1.0; } catch (e) { return 1.0; }
    }

    function aaEnsureGadgetSlots() {
        try {
            const bar = document.getElementById('gadgetBar');
            if (!bar || document.getElementById('slotDecoy')) return;
            const mk = (id, key, icon, name, title) => {
                const b = document.createElement('button');
                b.className = 'gadget-slot';
                b.id = id;
                b.title = title;
                b.innerHTML = '<span class="slot-key">' + key + '</span> <span class="slot-icon">' + icon + '</span> <span class="slot-name">' + name + '</span> <span class="slot-count" id="count' + key + '">1</span>';
                return b;
            };
            const d = mk('slotDecoy', 'Decoy', '🔊', 'Noise Decoy', 'Press 4: Noise Decoy (lure patrols to a point)');
            const s = mk('slotSurge', 'Surge', '⚡', 'Adrenal Surge', 'Press 5: Adrenal Surge (6s speed boost)');
            // fix count ids to match updateGadgetHUD expectations
            d.querySelector('.slot-count').id = 'countDecoy';
            s.querySelector('.slot-count').id = 'countSurge';
            d.addEventListener('click', () => { try { useGadget('decoy'); } catch (e) {} });
            s.addEventListener('click', () => { try { useGadget('surge'); } catch (e) {} });
            bar.appendChild(d);
            bar.appendChild(s);
            const hint = document.querySelector('.ability-hint-panel');
            if (hint && !document.getElementById('aaHint45')) {
                const sp = document.createElement('span');
                sp.id = 'aaHint45';
                sp.innerHTML = ' <span class="separator">|</span> <span><strong>4-5</strong>: Decoy/Surge</span>';
                hint.appendChild(sp);
            }
        } catch (e) {}
    }

    function aaUpdateDrones() {
        try {
            (state.drones || []).forEach(d => {
                if (d.disabledTimer && d.disabledTimer > 0) { d.disabledTimer--; return; }
                d.angle = (d.baseAngle || 0) + Math.sin(Date.now() * (d.rotSpeed || 0.01)) * (d.rotRange || 1.2);
                // mobile patrol: drift along small circuit
                if (d.wp && d.wp.length) {
                    const t = d.wp[d.wpi || 0];
                    const dx = t.x - d.x, dy = t.y - d.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 12) d.wpi = ((d.wpi || 0) + 1) % d.wp.length;
                    else { d.x += (dx / dist) * (d.speed || 0.7); d.y += (dy / dist) * (d.speed || 0.7); }
                }
                // detection like a camera
                const p = state.player;
                if (p && p.hp > 0 && p.burrowTimer <= 0 && !state.alerts.active) {
                    const dist = Math.hypot(p.x - d.x, p.y - d.y);
                    if (dist < (d.range || 170)) {
                        const dir = Math.atan2(p.y - d.y, p.x - d.x);
                        if (Math.abs(normalizeAngle(dir - d.angle)) < (d.fov || 0.7) / 2) {
                            if (!isLineBlocked(d.x, d.y, p.x, p.y, state.map.grid)) {
                                state.alerts.active = true;
                                state.alerts.timer = 320;
                                state.run.alarmsTriggered++;
                                state.run.silentAssassin = false;
                                try { updateSARatingDisplay(); } catch (e) {}
                                audio.playAlarm();
                                audio.setMode('COMBAT');
                                alertGuardsNear(d.x, d.y, 420);
                                spawnFloatingText(p.x, p.y - 25, 'DRONE SPOTTED!', '#ff0055', 13);
                            }
                        }
                    }
                }
            });
        } catch (e) {}
    }

    function aaCheckContractRulesTick() {
        try {
            const c = aaGetActiveContract();
            if (!c || !c.rules) return;
            const r = state.run;
            if (c.rules.noAlarms && r.alarmsTriggered > 0 && !r.contractFailed) {
                aaContractFail('alarm raised');
            }
            if (c.rules.timeLimitSec) {
                const el = (Date.now() - (r.floorStartTime || Date.now())) / 1000;
                if (el > c.rules.timeLimitSec && !r.vipDeadAt) {
                    // only fail once VIP still alive past limit on starting floor
                    if (!r.contractFailed) aaContractFail('time expired');
                }
            }
        } catch (e) {}
    }

    // ==========================================
    // 20. DEVELOPER & PLAYTEST DEBUG API
    // ==========================================
    window.gameDebug = {
        name: "Assassin Animals",
        getScore: () => state.run.score,
        setScore: (s) => { state.run.score = s; },
        getHealth: () => state.player ? state.player.hp : 0,
        setHealth: (h) => { if (state.player) state.player.hp = h; },
        getDNA: () => state.run.dna,
        setDNA: (d) => { state.run.dna = d; document.getElementById('hudDNA').textContent = d; },
        getSilentAssassin: () => state.run.silentAssassin,
        giveGadgets: (amount = 5) => {
            state.run.gadgets.medkit += amount;
            state.run.gadgets.tranq += amount;
            state.run.gadgets.smoke += amount;
            updateGadgetHUD();
        },
        win: () => {
            state.run.hasKey = true;
            document.getElementById('hudKey').textContent = '🔑 YES';
            handleElevatorUnlock();
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
})();
