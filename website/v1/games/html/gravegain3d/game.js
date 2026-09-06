(function() {
    'use strict';

    // =========================================================================
    // 1. DATA STRUCTURES, CONFIGURATIONS & ENUMS
    // =========================================================================
    const Race = {
        HUMAN: 'human',
        ELF: 'elf',
        DWARF: 'dwarf',
        ORC: 'orc'
    };

    const ClassType = {
        WARRIOR: 'warrior',
        TANK: 'tank',
        SUPPORT: 'support',
        MAGE: 'mage'
    };

    const RaceData = {
        [Race.HUMAN]: {
            name: 'Human',
            emoji: '👩‍🚀',
            color: 0x4c7fff,
            maxHp: 110,
            hpRegen: 1.2,
            stamina: 110,
            speed: 245,
            desc: 'Balanced infiltrator. Shield Wall ability (absorbs 25 dmg) & Jetpack thrusters (hold Space in air).'
        },
        [Race.ELF]: {
            name: 'Elf',
            emoji: '🧝‍♀️',
            color: 0x4cff7f,
            maxHp: 85,
            hpRegen: 3.5,
            stamina: 100,
            speed: 265,
            desc: 'Agile spellweaver. Nature Burst AoE spell, 100 Mana (+3/s regen), and Graceful Glide mechanics.'
        },
        [Race.DWARF]: {
            name: 'Dwarf',
            emoji: '⛏️',
            color: 0xffcc4c,
            maxHp: 160,
            hpRegen: 2.2,
            stamina: 120,
            speed: 200,
            desc: 'Stout juggernaut. Stone Form temporary invulnerability, Double Jump, and Poison immunity.'
        },
        [Race.ORC]: {
            name: 'Orc',
            emoji: '👹',
            color: 0xff4c4c,
            maxHp: 210,
            hpRegen: 3.0,
            stamina: 110,
            speed: 220,
            desc: 'Fierce berserker. Generates Rage when taking/dealing damage, unleashing explosive Rage Burst AoE.'
        }
    };

    const ClassData = {
        [ClassType.WARRIOR]: {
            title: 'Warrior',
            desc: 'Master of swordplay. 3-hit slicing combo, crisp shield parry (Right Click), and Whirlwind attack.',
            weaponName: 'Steel Longsword & Shield',
            baseDmg: 20,
            attackSpeed: 0.28,
            critChance: 0.15,
            critMult: 2.0,
            range: 68
        },
        [ClassType.MAGE]: {
            title: 'Mage',
            desc: 'Wielder of astral energy. Fires homing Arcane Bolts (Left Click), Frost Nova freeze (Right Click), and Meteor Storm.',
            weaponName: 'Celestial Arcane Staff',
            baseDmg: 26,
            attackSpeed: 0.38,
            critChance: 0.20,
            critMult: 2.2,
            range: 450
        },
        [ClassType.TANK]: {
            title: 'Tank',
            desc: 'Heavy fortress. Warhammer crush with massive knockback, Bulwark Stance (Right Click 90% block), and Ground Stomp.',
            weaponName: 'Spiked Warhammer & Tower Shield',
            baseDmg: 32,
            attackSpeed: 0.45,
            critChance: 0.10,
            critMult: 1.8,
            range: 75
        },
        [ClassType.SUPPORT]: {
            title: 'Support',
            desc: 'Combat chemist. Rapid bio-darts (Left Click), Healing/Toxic Mist Flask (Right Click), and Nanite Swarm.',
            weaponName: 'Magitech Chem-Gun',
            baseDmg: 14,
            attackSpeed: 0.18,
            critChance: 0.12,
            critMult: 1.7,
            range: 400
        }
    };

    const QuartersUpgrades = [
        { level: 1, size: '400x300 px', capacity: 100, cost: 250 },
        { level: 2, size: '600x400 px', capacity: 150, cost: 500 },
        { level: 3, size: '800x500 px', capacity: 200, cost: 900 },
        { level: 4, size: '1000x600 px', capacity: 250, cost: 1400 },
        { level: 5, size: '1200x700 px', capacity: 300, cost: 2000 },
        { level: 6, size: '1400x800 px', capacity: 350, cost: 2500 }
    ];

    const BotanySeeds = [
        { id: 'cannabis', name: 'Cannabis Sativa', space: 15, time: 60, yield: 3, value: 60, emoji: '🌿' },
        { id: 'mushroom', name: 'Magic Mushroom', space: 8, time: 45, yield: 2, value: 85, emoji: '🍄' },
        { id: 'bloodrose', name: 'Blood Rose', space: 10, time: 30, yield: 1, value: 140, emoji: '🌹' },
        { id: 'sparkite', name: 'Sparkite Spore', space: 12, time: 90, yield: 4, value: 110, emoji: '⚡' }
    ];

    const ArmoryUpgrades = [
        { id: 'health', name: 'Genetic Hull Infusion', icon: '🧬', desc: '+25 Starting Max HP per rank.', baseCost: 150, mult: 1.8, maxRank: 5 },
        { id: 'damage', name: 'Plasma Weapon Tuning', icon: '⚡', desc: '+15% Weapon & Spell Damage per rank.', baseCost: 200, mult: 2.0, maxRank: 5 },
        { id: 'speed', name: 'Kinetic Leg Servos', icon: '🏃', desc: '+10% Movement & Sprint speed per rank.', baseCost: 150, mult: 1.8, maxRank: 5 },
        { id: 'potions', name: 'Nanite Flask Satchel', icon: '🧪', desc: 'Start runs with +1 Healing Potion per rank.', baseCost: 250, mult: 2.2, maxRank: 3 },
        { id: 'greed', name: 'Matter Synthesizer', icon: '🪙', desc: '+25% Dungeon Gold and $UUSD yields.', baseCost: 180, mult: 1.9, maxRank: 5 }
    ];

    const RoguelikePerks = [
        { id: 'vampiric', name: 'Vampiric Leech', rarity: 'rare', icon: '🩸', desc: 'Heal 15% of all damage dealt to enemies.' },
        { id: 'lightning', name: 'Chain Lightning', rarity: 'rare', icon: '⚡', desc: 'Attacks discharge lightning arcing to 2 nearby enemies for 18 damage.' },
        { id: 'pyromancy', name: 'Infernal Brand', rarity: 'common', icon: '🔥', desc: 'Attacks ignite foes for 8 burn damage per second for 3 seconds.' },
        { id: 'frostbite', name: 'Frostbite Shards', rarity: 'common', icon: '❄️', desc: 'Hits chill enemies, slowing their movement and attack speed by 35%.' },
        { id: 'titan', name: 'Titan Vitality', rarity: 'epic', icon: '❤️', desc: '+50 Max HP and instantly restore all health to maximum.' },
        { id: 'swift', name: 'Warp Strides', rarity: 'common', icon: '👟', desc: '+25% Movement Speed and 40% reduced stamina consumption.' },
        { id: 'critfury', name: 'Critical Carnage', rarity: 'rare', icon: '🎯', desc: '+20% Critical Hit Chance and +50% Critical Damage.' },
        { id: 'ironclad', name: 'Carbide Plating', rarity: 'common', icon: '🛡️', desc: 'Take 20% reduced damage from all enemies and traps.' },
        { id: 'magnet', name: 'Soul Harvester', rarity: 'common', icon: '🧲', desc: '+100% Auto-pickup range and +40% Gold & XP drops.' },
        { id: 'executioner', name: 'Grim Reaper', rarity: 'legendary', icon: '💀', desc: 'Instantly execute any non-boss enemy that drops below 25% HP.' },
        { id: 'orb_havoc', name: 'Orbiting Glaive', rarity: 'epic', icon: '🔮', desc: 'Summon a mystical orb that orbits you, dealing 25 damage to enemies it touches.' },
        { id: 'cleave', name: 'Shockwave Cleave', rarity: 'rare', icon: '💥', desc: 'Attacks unleash a forward shockwave damaging enemies in a wider arc.' },
        { id: 'goldrush', name: 'Midas Fury', rarity: 'epic', icon: '🪙', desc: 'Gain +1% damage for every 20 Gold currently in your inventory.' },
        { id: 'alchemical', name: 'Toxic Catalyst', rarity: 'rare', icon: '🧪', desc: 'Enemies slain burst into a cloud of toxic fumes, poisoning nearby foes.' },
        { id: 'overclock', name: 'Adrenaline Rush', rarity: 'legendary', icon: '⏳', desc: 'Killing an enemy grants +40% Attack Speed and +30% Movement Speed for 4s.' }
    ];

    // =========================================================================
    // 2. PROCEDURAL CANVAS TEXTURE GENERATOR
    // =========================================================================
    class ProceduralTextures {
        static createStoneBrickTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#1c1830';
            ctx.fillRect(0, 0, 256, 256);

            const rows = 8;
            const cols = 4;
            const bh = 256 / rows;
            const bw = 256 / cols;

            for (let r = 0; r < rows; r++) {
                const offset = (r % 2) * (bw / 2);
                for (let c = -1; c <= cols; c++) {
                    const bx = c * bw + offset;
                    const by = r * bh;

                    // Brick base color with subtle noise
                    const lightness = 22 + Math.floor(Math.random() * 8);
                    ctx.fillStyle = `hsl(255, 20%, ${lightness}%)`;
                    ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);

                    // Top/left highlight
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.fillRect(bx + 2, by + 2, bw - 4, 3);
                    ctx.fillRect(bx + 2, by + 2, 3, bh - 4);

                    // Bottom/right shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                    ctx.fillRect(bx + 2, by + bh - 5, bw - 4, 3);
                    ctx.fillRect(bx + bw - 5, by + 2, 3, bh - 4);
                }
            }

            // Mortar grit
            ctx.fillStyle = 'rgba(10, 8, 20, 0.8)';
            for (let r = 0; r <= rows; r++) {
                ctx.fillRect(0, r * bh - 1, 256, 2);
            }

            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            return tex;
        }

        static createFloorFlagstoneTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#141724';
            ctx.fillRect(0, 0, 256, 256);

            // Large flagstone pavers
            const stones = 4;
            const size = 256 / stones;

            for (let i = 0; i < stones; i++) {
                for (let j = 0; j < stones; j++) {
                    const shade = 18 + Math.floor(Math.random() * 7);
                    ctx.fillStyle = `hsl(220, 18%, ${shade}%)`;
                    ctx.fillRect(i * size + 3, j * size + 3, size - 6, size - 6);

                    // Bevel highlights
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.fillRect(i * size + 3, j * size + 3, size - 6, 2);
                    ctx.fillRect(i * size + 3, j * size + 3, 2, size - 6);

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.fillRect(i * size + 3, j * size + size - 5, size - 6, 2);
                    ctx.fillRect(i * size + size - 5, j * size + 3, 2, size - 6);
                }
            }

            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            return tex;
        }

        static createCeilingTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#0c0d18';
            ctx.fillRect(0, 0, 256, 256);

            // Heavy timber wood beams across ceiling
            ctx.fillStyle = '#221612';
            ctx.fillRect(0, 110, 256, 36);
            ctx.fillRect(110, 0, 36, 256);

            // Iron bolts on intersections
            ctx.fillStyle = '#4a443e';
            ctx.fillRect(122, 122, 12, 12);

            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            return tex;
        }

        static createWoodCrateTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#5a3d28';
            ctx.fillRect(0, 0, 128, 128);

            // Wood planks
            ctx.fillStyle = '#49301e';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(0, i * 32, 128, 30);
            }

            // Cross braces
            ctx.lineWidth = 10;
            ctx.strokeStyle = '#322014';
            ctx.strokeRect(5, 5, 118, 118);
            ctx.beginPath();
            ctx.moveTo(5, 5);
            ctx.lineTo(123, 123);
            ctx.stroke();

            return new THREE.CanvasTexture(canvas);
        }

        static createTorchFlameSprite() {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');

            const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
            grad.addColorStop(0, 'rgba(255, 240, 180, 1.0)');
            grad.addColorStop(0.3, 'rgba(255, 140, 20, 0.85)');
            grad.addColorStop(0.7, 'rgba(220, 40, 10, 0.4)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 64, 64);

            const tex = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(16, 16, 1);
            return sprite;
        }

        static createEmojiSprite(emoji, size = 128) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.font = `${size * 0.72}px "Segoe UI Emoji", "Apple Color Emoji", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, size / 2, size / 2);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(24, 24, 1);
            return sprite;
        }
    }

    // =========================================================================
    // 3. PROCEDURAL WEB AUDIO SYNTHESIZER
    // =========================================================================
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.masterVolume = 0.8;
            this.musicVolume = 0.5;
            this.sfxVolume = 0.8;
            this.ambientOsc1 = null;
            this.ambientOsc2 = null;
            this.ambientGain = null;
            this.ambientPlaying = false;
        }

        initCtx() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        playSfx(type, pitchMod = 1.0) {
            this.initCtx();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const mainVol = this.masterVolume * this.sfxVolume;
            if (mainVol <= 0.001) return;

            if (type === 'swing') {
                // Crisp white noise swoosh
                const bufferSize = this.ctx.sampleRate * 0.15;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(800 * pitchMod, now);
                filter.frequency.exponentialRampToValueAtTime(300 * pitchMod, now + 0.15);
                filter.Q.value = 3.0;

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.3 * mainVol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                noise.start(now);
                noise.stop(now + 0.15);
            } else if (type === 'hit') {
                // Crunchy impact with low punch
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(160 * pitchMod, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.12);
                gain.gain.setValueAtTime(0.4 * mainVol, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'crit') {
                // High punchy chime + explosion
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(880 * pitchMod, now);
                osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
                gain.gain.setValueAtTime(0.5 * mainVol, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'block') {
                // High metallic parry ding
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1100, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
                gain.gain.setValueAtTime(0.45 * mainVol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'spell') {
                // Mystical rising zap
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320 * pitchMod, now);
                osc.frequency.exponentialRampToValueAtTime(950 * pitchMod, now + 0.22);
                gain.gain.setValueAtTime(0.35 * mainVol, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.22);
            } else if (type === 'explode') {
                // Deep bass rumble
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(90, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.35);
                gain.gain.setValueAtTime(0.6 * mainVol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'loot') {
                // Ascending bright chime
                [523.25, 659.25, 783.99].forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                    gain.gain.setValueAtTime(0.25 * mainVol, now + idx * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now + idx * 0.05);
                    osc.stop(now + idx * 0.05 + 0.18);
                });
            } else if (type === 'potion') {
                // Liquid gulp
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);
                osc.frequency.exponentialRampToValueAtTime(250, now + 0.16);
                gain.gain.setValueAtTime(0.3 * mainVol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'levelup') {
                // Triumphant 4-note chord fanfare
                [440, 554.37, 659.25, 880].forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.09);
                    gain.gain.setValueAtTime(0.35 * mainVol, now + idx * 0.09);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.4);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now + idx * 0.09);
                    osc.stop(now + idx * 0.09 + 0.4);
                });
            } else if (type === 'boss_roar') {
                // Low rumbling beast roar
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(70, now);
                osc.frequency.linearRampToValueAtTime(110, now + 0.25);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);
                gain.gain.setValueAtTime(0.55 * mainVol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.7);
            }
        }

        startAmbientMusic() {
            this.initCtx();
            if (!this.ctx || this.ambientPlaying) return;

            try {
                this.ambientGain = this.ctx.createGain();
                this.ambientGain.gain.setValueAtTime(0.08 * this.masterVolume * this.musicVolume, this.ctx.currentTime);

                this.ambientOsc1 = this.ctx.createOscillator();
                this.ambientOsc1.type = 'sawtooth';
                this.ambientOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(160, this.ctx.currentTime);

                this.ambientOsc1.connect(filter);
                filter.connect(this.ambientGain);
                this.ambientGain.connect(this.ctx.destination);

                this.ambientOsc1.start();
                this.ambientPlaying = true;
            } catch (e) {
                // Audio autoplay might be blocked until user gesture
            }
        }

        stopAmbientMusic() {
            if (this.ambientOsc1) {
                try { this.ambientOsc1.stop(); } catch(e) {}
                this.ambientOsc1 = null;
            }
            this.ambientPlaying = false;
        }

        speak(text) {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(text);
                u.volume = Math.min(1.0, this.masterVolume);
                u.rate = 1.05;
                window.speechSynthesis.speak(u);
            }
        }
    }

    // =========================================================================
    // 4. FLOATING COMBAT TEXT & NOTIFICATIONS
    // =========================================================================
    class CombatTextManager {
        constructor(containerEl, camera) {
            this.container = containerEl;
            this.camera = camera;
        }

        spawnText(worldX, worldY, worldZ, text, type = 'damage') {
            if (!this.container) return;

            // Project 3D coordinate to 2D screen coordinates
            const pos = new THREE.Vector3(worldX, worldY + 14, worldZ);
            pos.project(this.camera);

            // If behind camera view, don't show
            if (pos.z > 1.0) return;

            const rect = this.container.getBoundingClientRect();
            const sx = (pos.x * 0.5 + 0.5) * rect.width;
            const sy = (-(pos.y * 0.5) + 0.5) * rect.height;

            const div = document.createElement('div');
            div.className = `combat-text ${type}`;
            div.style.left = `${sx}px`;
            div.style.top = `${sy}px`;
            div.textContent = text;
            this.container.appendChild(div);

            setTimeout(() => {
                if (div.parentNode) div.parentNode.removeChild(div);
            }, 850);
        }

        showBanner(text, duration = 2500) {
            const banner = document.getElementById('hudNotification');
            if (!banner) return;
            banner.textContent = text;
            banner.classList.remove('hidden');
            clearTimeout(this.bannerTimer);
            this.bannerTimer = setTimeout(() => {
                banner.classList.add('hidden');
            }, duration);
        }
    }

    // =========================================================================
    // 5. INPUT MANAGER & FULL MOBILE CONTROLS
    // =========================================================================
    class InputManager {
        constructor() {
            this.keys = {};
            this.mouse = { click: false, rightClick: false, isBlocking: false };
            this.lookSensitivity = 0.0022;
            this.invertY = false;
            this.lastLookDelta = 0;

            // Mobile virtual analog joystick
            this.joystick = { active: false, x: 0, y: 0, originX: 0, originY: 0 };

            // Mobile touch look gesture
            this.touchLook = { active: false, lastX: 0, lastY: 0 };

            this.setupDesktopControls();
            this.setupMobileControls();
        }

        setupDesktopControls() {
            window.addEventListener('keydown', (e) => {
                this.keys[e.code] = true;
                if (e.code === 'KeyP' || e.code === 'Escape') {
                    if (window.GraveGainGame) window.GraveGainGame.togglePause();
                }
                if (e.code === 'KeyQ') {
                    if (window.GraveGainGame) window.GraveGainGame.usePotion();
                }
            });

            window.addEventListener('keyup', (e) => {
                this.keys[e.code] = false;
            });

            const container = document.getElementById('canvasContainer');
            if (!container) return;

            container.addEventListener('contextmenu', (e) => e.preventDefault());

            container.addEventListener('mousedown', (e) => {
                if (document.pointerLockElement !== container) {
                    container.requestPointerLock();
                } else {
                    if (e.button === 0) {
                        this.mouse.click = true;
                    } else if (e.button === 2) {
                        this.mouse.isBlocking = true;
                        this.mouse.rightClick = true;
                    }
                }
            });

            window.addEventListener('mouseup', (e) => {
                if (e.button === 2) {
                    this.mouse.isBlocking = false;
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (document.pointerLockElement === container && window.GraveGainGame && window.GraveGainGame.player) {
                    const p = window.GraveGainGame.player;
                    p.yaw -= e.movementX * this.lookSensitivity;
                    const dy = this.invertY ? -e.movementY : e.movementY;
                    p.pitch -= dy * this.lookSensitivity;
                    p.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, p.pitch));
                    this.lastLookDelta = (this.lastLookDelta || 0) + Math.abs(e.movementX) + Math.abs(e.movementY);
                }
            });
        }

        setupMobileControls() {
            const isTouchSupported = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            if (isTouchSupported) {
                document.body.classList.add('touch-enabled');
            }

            // Virtual Analog Joystick
            const joystickContainer = document.getElementById('mobileJoystick');
            const knob = document.getElementById('mobileJoystickKnob');

            if (joystickContainer && knob) {
                const onJoyStart = (e) => {
                    const touch = e.targetTouches ? e.targetTouches[0] : e;
                    const rect = joystickContainer.getBoundingClientRect();
                    this.joystick.active = true;
                    this.joystick.originX = rect.left + rect.width / 2;
                    this.joystick.originY = rect.top + rect.height / 2;
                    onJoyMove(e);
                };

                const onJoyMove = (e) => {
                    if (!this.joystick.active) return;
                    const touch = e.targetTouches ? e.targetTouches[0] : e;
                    const dx = touch.clientX - this.joystick.originX;
                    const dy = touch.clientY - this.joystick.originY;
                    const maxRadius = 45;
                    const dist = Math.hypot(dx, dy);

                    if (dist > 0) {
                        const clampedDist = Math.min(dist, maxRadius);
                        const angle = Math.atan2(dy, dx);
                        const kx = Math.cos(angle) * clampedDist;
                        const ky = Math.sin(angle) * clampedDist;

                        knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
                        this.joystick.x = kx / maxRadius;
                        this.joystick.y = ky / maxRadius;
                    }
                };

                const onJoyEnd = () => {
                    this.joystick.active = false;
                    this.joystick.x = 0;
                    this.joystick.y = 0;
                    knob.style.transform = 'translate(-50%, -50%)';
                };

                joystickContainer.addEventListener('touchstart', onJoyStart, { passive: false });
                window.addEventListener('touchmove', onJoyMove, { passive: false });
                window.addEventListener('touchend', onJoyEnd, { passive: false });
                window.addEventListener('touchcancel', onJoyEnd, { passive: false });
            }

            // Mobile Touch Look Gesture
            const lookZone = document.getElementById('mobileTouchLookZone');
            if (lookZone) {
                lookZone.addEventListener('touchstart', (e) => {
                    const touch = e.targetTouches[0];
                    this.touchLook.active = true;
                    this.touchLook.lastX = touch.clientX;
                    this.touchLook.lastY = touch.clientY;
                }, { passive: true });

                lookZone.addEventListener('touchmove', (e) => {
                    if (!this.touchLook.active || !window.GraveGainGame || !window.GraveGainGame.player) return;
                    const touch = e.targetTouches[0];
                    const dx = touch.clientX - this.touchLook.lastX;
                    const dy = touch.clientY - this.touchLook.lastY;
                    this.touchLook.lastX = touch.clientX;
                    this.touchLook.lastY = touch.clientY;

                    const p = window.GraveGainGame.player;
                    const sens = this.lookSensitivity * 1.5;
                    p.yaw -= dx * sens;
                    const moveY = this.invertY ? -dy : dy;
                    p.pitch -= moveY * sens;
                    p.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, p.pitch));
                    this.lastLookDelta = (this.lastLookDelta || 0) + Math.abs(dx) + Math.abs(dy);
                }, { passive: true });

                lookZone.addEventListener('touchend', () => {
                    this.touchLook.active = false;
                }, { passive: true });
            }

            // Mobile Action Buttons
            const attackBtn = document.getElementById('mobileAttackBtn');
            const blockBtn = document.getElementById('mobileBlockBtn');
            const abilityBtn = document.getElementById('mobileAbilityBtn');
            const jumpBtn = document.getElementById('mobileJumpBtn');
            const potionBtn = document.getElementById('mobilePotionBtn');
            const waitBtn = document.getElementById('mobileWaitBtn');

            if (attackBtn) {
                attackBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.mouse.click = true;
                });
            }

            if (blockBtn) {
                blockBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.mouse.isBlocking = true;
                    this.mouse.rightClick = true;
                });
                blockBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.mouse.isBlocking = false;
                });
            }

            if (abilityBtn) {
                abilityBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.keys['KeyF'] = true;
                });
            }

            if (jumpBtn) {
                jumpBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.keys['Space'] = true;
                });
            }

            if (potionBtn) {
                potionBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (window.GraveGainGame) window.GraveGainGame.usePotion();
                });
            }

            if (waitBtn) {
                waitBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (window.GraveGainGame) window.GraveGainGame.executeTurnAction('wait');
                });
                waitBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.GraveGainGame) window.GraveGainGame.executeTurnAction('wait');
                });
            }
        }
    }

    // =========================================================================
    // 6. 3D FIRST-PERSON WEAPON BUILDER
    // =========================================================================
    class WeaponFactory {
        static buildWeapon(classType) {
            const group = new THREE.Group();

            if (classType === ClassType.WARRIOR) {
                // Steel Longsword
                const swordGroup = new THREE.Group();
                const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 4.0, 8), new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.8 }));
                hilt.position.set(0, -2.0, 0);
                swordGroup.add(hilt);

                const guard = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 }));
                swordGroup.add(guard);

                const blade = new THREE.Mesh(new THREE.BoxGeometry(1.0, 14.0, 0.3), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 }));
                blade.position.set(0, 7.0, 0);
                swordGroup.add(blade);

                swordGroup.position.set(2.8, -2.8, -6.5);
                swordGroup.rotation.set(-Math.PI / 4, 0, -Math.PI / 7);
                group.add(swordGroup);
                group.mainHand = swordGroup;

                // Shield in Offhand
                const shieldGroup = new THREE.Group();
                const shieldPlate = new THREE.Mesh(new THREE.BoxGeometry(4.5, 7.0, 0.6), new THREE.MeshStandardMaterial({ color: 0x801020, metalness: 0.4, roughness: 0.5 }));
                const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(4.9, 7.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 }));
                shieldRim.position.z = -0.1;
                shieldGroup.add(shieldPlate);
                shieldGroup.add(shieldRim);

                shieldGroup.position.set(-3.2, -3.2, -6.0);
                shieldGroup.rotation.set(0, Math.PI / 6, 0);
                group.add(shieldGroup);
                group.offHand = shieldGroup;

            } else if (classType === ClassType.MAGE) {
                // Astral Staff
                const staffGroup = new THREE.Group();
                const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 18.0, 8), new THREE.MeshStandardMaterial({ color: 0x2d1a38, roughness: 0.7 }));
                staffGroup.add(shaft);

                const tip = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.8, roughness: 0.1 }));
                tip.position.set(0, 9.5, 0);
                staffGroup.add(tip);

                staffGroup.position.set(2.6, -3.0, -7.0);
                staffGroup.rotation.set(-Math.PI / 5, 0, -Math.PI / 9);
                group.add(staffGroup);
                group.mainHand = staffGroup;
                group.gemTip = tip;

            } else if (classType === ClassType.TANK) {
                // Spiked Warhammer
                const hammerGroup = new THREE.Group();
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 12.0, 8), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 }));
                handle.position.set(0, -3.0, 0);
                hammerGroup.add(handle);

                const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.0, 6.0), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.85, roughness: 0.3 }));
                hammerHead.position.set(0, 4.0, 0);
                hammerGroup.add(hammerHead);

                hammerGroup.position.set(2.9, -2.9, -6.8);
                hammerGroup.rotation.set(-Math.PI / 4.2, 0, -Math.PI / 6);
                group.add(hammerGroup);
                group.mainHand = hammerGroup;

                // Tower Shield
                const shieldGroup = new THREE.Group();
                const plate = new THREE.Mesh(new THREE.BoxGeometry(5.5, 9.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 }));
                shieldGroup.add(plate);
                shieldGroup.position.set(-3.5, -3.2, -6.0);
                shieldGroup.rotation.set(0, Math.PI / 5, 0);
                group.add(shieldGroup);
                group.offHand = shieldGroup;

            } else {
                // Support Magitech Chem-Gun
                const gunGroup = new THREE.Group();
                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 10.0, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 }));
                barrel.rotation.x = Math.PI / 2;
                gunGroup.add(barrel);

                const flask = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.0, 8), new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.7, transparent: true, opacity: 0.8 }));
                flask.position.set(0, 1.2, -1.0);
                gunGroup.add(flask);

                gunGroup.position.set(2.4, -2.5, -6.5);
                group.add(gunGroup);
                group.mainHand = gunGroup;
            }

            return group;
        }
    }

    // =========================================================================
    // 7. PROJECTILES & ENVIRONMENT PROPS
    // =========================================================================
    class Projectile {
        constructor(x, y, z, vx, vy, vz, dmg, isPlayer, color = 0xa855f7, type = 'magic') {
            this.x = x;
            this.y = y;
            this.z = z;
            this.vx = vx;
            this.vy = vy;
            this.vz = vz;
            this.dmg = dmg;
            this.isPlayer = isPlayer;
            this.color = color;
            this.type = type;
            this.life = 2.5;
            this.radius = 8;
            this.dead = false;

            this.mesh = new THREE.Mesh(
                new THREE.SphereGeometry(2.5, 8, 8),
                new THREE.MeshBasicMaterial({ color })
            );
            this.mesh.position.set(x, y, z);
        }

        update(dt, tilemap) {
            this.life -= dt;
            if (this.life <= 0) {
                this.dead = true;
                return;
            }

            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.z += this.vz * dt;
            this.mesh.position.set(this.x, this.y, this.z);

            // Tile collision
            const tx = Math.floor(this.x / 48);
            const tz = Math.floor(this.z / 48);
            if (tilemap && tilemap.grid && tilemap.grid[tx] && (tilemap.grid[tx][tz] === 1 || tilemap.grid[tx][tz] === 6)) {
                this.dead = true;
            }
        }
    }

    class DungeonProp {
        constructor(x, z, type = 'crate') {
            this.x = x;
            this.z = z;
            this.type = type;
            this.hp = type === 'chest' ? 1 : 15;
            this.radius = 16;
            this.broken = false;
            this.group3d = new THREE.Group();

            if (type === 'crate') {
                const geo = new THREE.BoxGeometry(20, 20, 20);
                const mat = new THREE.MeshStandardMaterial({
                    map: ProceduralTextures.createWoodCrateTexture(),
                    roughness: 0.8
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.y = 10;
                this.group3d.add(mesh);
            } else if (type === 'chest') {
                const geo = new THREE.BoxGeometry(24, 16, 18);
                const mat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.4, roughness: 0.4 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.y = 8;
                this.group3d.add(mesh);

                const lock = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 2), new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9 }));
                lock.position.set(0, 8, 9.5);
                this.group3d.add(lock);
            }

            this.group3d.position.set(x, 0, z);
        }

        destroy() {
            if (window.GraveGainGame) window.GraveGainGame.scene.remove(this.group3d);
        }
    }

    // =========================================================================
    // 8. PLAYER ENTITY
    // =========================================================================
    class PlayerEntity {
        constructor(race, classType, permanentStats = {}) {
            this.race = race;
            this.classType = classType;
            const rData = RaceData[race];
            const cData = ClassData[classType];

            this.x = 0;
            this.y = 0; // mapped to 3D z
            this.yElevation = 0;
            this.vx = 0;
            this.vy = 0;
            this.radius = 16;

            this.yaw = 0;
            this.pitch = 0;

            const bonusHp = permanentStats.health ? permanentStats.health * 25 : 0;
            this.maxHp = rData.maxHp + bonusHp;
            this.hp = this.maxHp;
            this.hpRegen = rData.hpRegen;
            this.stamina = rData.stamina;
            this.maxStamina = rData.stamina;

            const speedBonus = permanentStats.speed ? (1.0 + permanentStats.speed * 0.1) : 1.0;
            this.speed = rData.speed * speedBonus;

            this.mana = race === Race.ELF ? 100 : 0;
            this.maxMana = 100;
            this.rage = 0;
            this.shieldBubble = 0;
            this.shieldCooldown = 0;
            this.stoneForm = false;
            this.stoneDuration = 0;

            // Combat & stats
            this.level = 1;
            this.xp = 0;
            this.xpNext = 60;
            this.isDead = false;
            this.isBlocking = false;
            this.parryWindow = 0;

            this.potions = 1 + (permanentStats.potions || 0);
            this.perks = [];

            // Movement physics
            this.grounded = true;
            this.platVy = 0;
            this.doubleJumpsLeft = 0;
            this.abilityCooldown = 0;
        }

        update(dt, input, physics, tilemap) {
            if (this.isDead) return;

            // Health & stamina regeneration
            if (!this.stoneForm) {
                this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
            }
            if (this.race === Race.ELF) {
                this.mana = Math.min(this.maxMana, this.mana + 3.0 * dt);
            }
            if (this.race === Race.ORC) {
                this.rage = Math.max(0, this.rage - 3.0 * dt);
            }
            if (this.race === Race.HUMAN) {
                if (this.shieldCooldown > 0) this.shieldCooldown -= dt;
                else this.shieldBubble = Math.min(25.0, this.shieldBubble + 2.5 * dt);
            }

            if (this.stoneForm) {
                this.stoneDuration -= dt;
                if (this.stoneDuration <= 0) this.stoneForm = false;
            }

            if (this.parryWindow > 0) this.parryWindow -= dt;
            if (this.abilityCooldown > 0) this.abilityCooldown -= dt;

            // Movement vector relative to look yaw
            let moveX = 0;
            let moveZ = 0;

            if (input.keys['KeyW'] || input.keys['ArrowUp']) moveZ -= 1;
            if (input.keys['KeyS'] || input.keys['ArrowDown']) moveZ += 1;
            if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
            if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

            // Mobile virtual joystick input
            if (input.joystick.active) {
                moveX += input.joystick.x;
                moveZ += input.joystick.y;
            }

            let currentSpeed = this.speed;
            if (this.hasPerk('swift')) currentSpeed *= 1.25;

            const isRunning = (input.keys['ShiftLeft'] || input.keys['ShiftRight']) && this.stamina > 5;
            if (isRunning) {
                currentSpeed *= 1.4;
                const cost = this.hasPerk('swift') ? 12 : 20;
                this.stamina = Math.max(0, this.stamina - cost * dt);
            } else {
                this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
            }

            if (this.isBlocking) {
                currentSpeed *= 0.55;
            }

            const moveLen = Math.hypot(moveX, moveZ);
            if (moveLen > 0.05) {
                const normX = moveX / Math.max(1, moveLen);
                const normZ = moveZ / Math.max(1, moveLen);

                const cosYaw = Math.cos(this.yaw);
                const sinYaw = Math.sin(this.yaw);
                this.vx = (normX * cosYaw - normZ * sinYaw) * currentSpeed;
                this.vy = (normX * sinYaw + normZ * cosYaw) * currentSpeed;
            } else {
                this.vx = 0;
                this.vy = 0;
            }

            // Hazard floor effects
            const tx = Math.floor(this.x / 48);
            const ty = Math.floor(this.y / 48);
            if (tilemap && tilemap.grid && tilemap.grid[tx]) {
                const cell = tilemap.grid[tx][ty];
                if (cell === 2) { // Water
                    this.vx *= 0.6;
                    this.vy *= 0.6;
                } else if (cell === 3 && this.race !== Race.DWARF) { // Poison
                    this.takeDamage(10 * dt, 'poison');
                } else if (cell === 4) { // Fire
                    this.takeDamage(15 * dt, 'fire');
                }
            }

            // Jump & Vertical physics
            if (input.keys['Space'] && this.grounded) {
                this.platVy = 280;
                this.grounded = false;
                this.doubleJumpsLeft = this.race === Race.DWARF ? 1 : 0;
                input.keys['Space'] = false;
                if (window.GraveGainGame) window.GraveGainGame.audio.playSfx('swing', 1.4);
            } else if (input.keys['Space'] && !this.grounded && this.race === Race.DWARF && this.doubleJumpsLeft > 0) {
                this.platVy = 230;
                this.doubleJumpsLeft--;
                input.keys['Space'] = false;
                if (window.GraveGainGame) window.GraveGainGame.audio.playSfx('swing', 1.7);
            } else if (input.keys['Space'] && !this.grounded && this.race === Race.HUMAN && this.stamina > 5) {
                this.platVy = Math.min(180, this.platVy + 400 * dt);
                this.stamina = Math.max(0, this.stamina - 30 * dt);
            }

            if (!this.grounded) {
                this.platVy -= 750 * dt;
                this.yElevation += this.platVy * dt;
                if (this.yElevation <= 0) {
                    this.yElevation = 0;
                    this.platVy = 0;
                    this.grounded = true;
                }
            }

            physics.moveEntityWithCollision(this, this.vx * dt, this.vy * dt, tilemap);
        }

        hasPerk(id) {
            return this.perks.some(p => p.id === id);
        }

        takeDamage(dmg, type = 'normal') {
            if (window.gameDebug?.godMode || this.stoneForm || this.isDead) return;

            // Blocking logic
            if (this.isBlocking) {
                if (this.parryWindow > 0) {
                    // Perfect Parry!
                    if (window.GraveGainGame) {
                        window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, 'PARRIED!', 'block');
                        window.GraveGainGame.audio.playSfx('block', 1.3);
                        window.GraveGainGame.vfx.spawnSparks(this.x, this.y, 0x38bdf8, 20);
                    }
                    return;
                }
                const blockPercent = this.classType === ClassType.TANK ? 0.90 : 0.75;
                dmg *= (1.0 - blockPercent);
                if (window.GraveGainGame) {
                    window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, 'BLOCKED!', 'block');
                    window.GraveGainGame.audio.playSfx('block');
                }
            }

            if (this.hasPerk('ironclad')) {
                dmg *= 0.80;
            }

            if (this.race === Race.ORC) {
                this.rage = Math.min(100, this.rage + dmg * 0.8);
            }

            if (this.shieldBubble > 0) {
                const absorbed = Math.min(this.shieldBubble, dmg);
                this.shieldBubble -= absorbed;
                dmg -= absorbed;
                this.shieldCooldown = 5.0;
            }

            this.hp = Math.max(0, this.hp - dmg);

            if (window.GraveGainGame) {
                window.GraveGainGame.cameraController.applyShake(6);
                window.GraveGainGame.audio.playSfx('hit', 0.8);
                window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, `-${Math.round(dmg)}`, 'player-dmg');
            }

            if (this.hp <= 0 && !this.isDead) {
                this.isDead = true;
                if (window.GraveGainGame) window.GraveGainGame.gameOver(false);
            }
        }

        addXp(amt) {
            this.xp += amt;
            if (window.GraveGainGame) {
                window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, `+${amt} XP`, 'xp');
            }
            if (this.xp >= this.xpNext) {
                this.xp -= this.xpNext;
                this.level++;
                this.xpNext = Math.floor(this.xpNext * 1.55);
                if (window.GraveGainGame) window.GraveGainGame.triggerLevelUp();
            }
        }

        triggerAbility() {
            if (this.abilityCooldown > 0) return;
            this.abilityCooldown = 7.0;

            const game = window.GraveGainGame;
            if (!game) return;

            if (this.race === Race.HUMAN) {
                this.shieldBubble = 35.0;
                game.audio.playSfx('spell', 1.2);
                game.vfx.spawnSparks(this.x, this.y, 0x00d2ff, 25);
                game.combatText.spawnText(this.x, 20, this.y, 'SHIELD WALL!', 'heal');
            } else if (this.race === Race.ELF) {
                game.audio.playSfx('spell', 1.5);
                game.vfx.spawnSparks(this.x, this.y, 0x4cff7f, 35);
                game.dealAoEDamage(this.x, this.y, 160, 45, 'nature');
                game.combatText.spawnText(this.x, 20, this.y, 'NATURE BURST!', 'heal');
            } else if (this.race === Race.DWARF) {
                this.stoneForm = true;
                this.stoneDuration = 5.0;
                game.audio.playSfx('block', 0.8);
                game.vfx.spawnSparks(this.x, this.y, 0xffcc4c, 30);
                game.combatText.spawnText(this.x, 20, this.y, 'STONE FORM!', 'block');
            } else if (this.race === Race.ORC) {
                const burstDmg = 35 + this.rage * 0.75;
                this.rage = 0;
                game.audio.playSfx('explode', 1.1);
                game.cameraController.applyShake(10);
                game.vfx.spawnSparks(this.x, this.y, 0xff4c4c, 40);
                game.dealAoEDamage(this.x, this.y, 180, burstDmg, 'rage');
                game.combatText.spawnText(this.x, 20, this.y, 'RAGE BURST!', 'crit');
            }
        }
    }

    // =========================================================================
    // 9. ENEMY ENTITIES & BOSSES
    // =========================================================================
    class EnemyEntity {
        constructor(typeData, x, y, difficultyScale = 1.0) {
            this.name = typeData.name;
            this.x = x;
            this.y = y; // mapped to 3D z
            this.radius = 16;
            this.angle = 0;
            this.type = typeData.type || 'skeleton';
            this.isBoss = !!typeData.isBoss;

            this.maxHp = typeData.hp * difficultyScale;
            this.hp = this.maxHp;
            this.dmg = typeData.dmg * difficultyScale;
            this.speed = typeData.speed;
            this.scale = typeData.scale || 1.0;
            this.bloodColor = typeData.bloodColor || 0xddddcc;

            this.kx = 0;
            this.ky = 0;
            this.state = 'idle';
            this.spawnX = x;
            this.spawnY = y;
            this.attackTimer = 0;
            this.attackInterval = typeData.attackInterval || 1.0;

            this.group3d = new THREE.Group();
            this.group3d.scale.set(this.scale, this.scale, this.scale);

            this.buildModel(typeData);
        }

        buildModel(typeData) {
            const boneMat = new THREE.MeshStandardMaterial({ color: this.bloodColor, roughness: 0.8 });
            const eyeColor = this.isBoss ? 0xff0044 : (typeData.type === 'mage' ? 0x9333ea : 0xff2222);
            const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });

            if (this.type === 'skull') {
                // Flying flaming skull
                this.skull = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 8), boneMat);
                this.skull.position.y = 18;
                this.group3d.add(this.skull);

                const jaw = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 6), boneMat);
                jaw.position.set(0, -5, 1);
                this.skull.add(jaw);

                const le = new THREE.Mesh(new THREE.SphereGeometry(1.0, 6, 6), eyeMat);
                le.position.set(-2, 1, 4.2);
                this.skull.add(le);
                const re = new THREE.Mesh(new THREE.SphereGeometry(1.0, 6, 6), eyeMat);
                re.position.set(2, 1, 4.2);
                this.skull.add(re);

                // Add flame sprite halo
                const flame = ProceduralTextures.createTorchFlameSprite();
                flame.position.y = 18;
                flame.scale.set(20, 20, 1);
                this.group3d.add(flame);
            } else {
                // Standard humanoid skeleton structure
                this.torso = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 5), boneMat);
                this.torso.position.y = 16;
                this.group3d.add(this.torso);

                this.skull = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), boneMat);
                this.skull.position.set(0, 10, 0);
                this.torso.add(this.skull);

                // Eyes
                const le = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), eyeMat);
                le.position.set(-1.8, 1, 3.1);
                this.skull.add(le);
                const re = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), eyeMat);
                re.position.set(1.8, 1, 3.1);
                this.skull.add(re);

                // Limbs
                this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 12, 2.2), boneMat);
                this.leftLeg.position.set(-3, -8, 0);
                this.group3d.add(this.leftLeg);

                this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 12, 2.2), boneMat);
                this.rightLeg.position.set(3, -8, 0);
                this.group3d.add(this.rightLeg);

                this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(2, 11, 2), boneMat);
                this.leftArm.position.set(-6, 3, 0);
                this.torso.add(this.leftArm);

                this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(2, 11, 2), boneMat);
                this.rightArm.position.set(6, 3, 0);
                this.torso.add(this.rightArm);

                // Extra accessories
                if (this.isBoss) {
                    const crown = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.8, 3, 8), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 }));
                    crown.position.set(0, 4, 0);
                    this.skull.add(crown);
                } else if (typeData.armored) {
                    const helm = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 7), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }));
                    helm.position.set(0, 2, 0);
                    this.skull.add(helm);
                }
            }
        }

        update(dt, player, physics, tilemap, game) {
            const dist = Math.hypot(player.x - this.x, player.y - this.y);

            // Decay knockback
            this.x += this.kx * dt;
            this.y += this.ky * dt;
            this.kx -= this.kx * 8 * dt;
            this.ky -= this.ky * 8 * dt;

            // Attack cooldown
            if (this.attackTimer > 0) this.attackTimer -= dt;

            // AI states
            if (dist < 450 && this.state === 'idle') {
                this.state = 'chase';
            }

            if (this.state === 'chase') {
                this.angle = Math.atan2(player.y - this.y, player.x - this.x);

                if (this.type === 'mage' && dist < 320 && dist > 140) {
                    // Ranged attacker keeps distance and casts shadow skull
                    if (this.attackTimer <= 0) {
                        this.attackTimer = 2.4;
                        const forwardX = Math.cos(this.angle);
                        const forwardY = Math.sin(this.angle);
                        game.spawnProjectile(this.x, 18, this.y, forwardX * 220, 0, forwardY * 220, this.dmg, false, 0x9333ea, 'magic');
                        game.audio.playSfx('spell', 0.8);
                    }
                } else {
                    // Melee pursuit
                    const vx = Math.cos(this.angle) * this.speed * dt;
                    const vy = Math.sin(this.angle) * this.speed * dt;
                    physics.moveEntityWithCollision(this, vx, vy, tilemap);

                    // Melee attack range check
                    if (dist < this.radius + player.radius + 12) {
                        if (this.attackTimer <= 0) {
                            this.attackTimer = this.attackInterval;
                            player.takeDamage(this.dmg);

                            if (this.type === 'skull') {
                                // Kamikaze explosion
                                game.vfx.spawnSparks(this.x, this.y, 0xff4422, 30);
                                game.audio.playSfx('explode');
                                this.hp = 0;
                            }
                        }
                    }
                }

                // Walking oscillation animation
                if (this.leftLeg && this.rightLeg) {
                    const cycle = Date.now() * 0.01 * (this.speed / 80);
                    this.leftLeg.rotation.x = Math.sin(cycle) * 0.65;
                    this.rightLeg.rotation.x = -Math.sin(cycle) * 0.65;
                    this.leftArm.rotation.x = -Math.sin(cycle) * 0.45;
                    this.rightArm.rotation.x = Math.sin(cycle) * 0.45;
                }
            }

            this.group3d.position.set(this.x, 0, this.y);
            this.group3d.rotation.y = -this.angle + Math.PI / 2;
        }

        destroy() {
            if (window.GraveGainGame) {
                window.GraveGainGame.scene.remove(this.group3d);
            }
            this.group3d.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        }
    }

    // =========================================================================
    // 10. LOOT ITEMS & PARTICLE SYSTEM
    // =========================================================================
    class LootItem {
        constructor(x, y, type = 'gold', value = 15) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.value = value;
            this.radius = 12;
            this.pulse = Math.random() * Math.PI;

            this.group3d = new THREE.Group();
            const emoji = type === 'gold' ? '🪙' : (type === 'potion' ? '🧪' : '📜');
            this.sprite = ProceduralTextures.createEmojiSprite(emoji, 64);
            this.sprite.position.y = 8;
            this.group3d.add(this.sprite);
            this.group3d.position.set(x, 0, y);
        }

        update(dt, player, range) {
            this.pulse += 5 * dt;
            this.sprite.position.y = 8 + Math.sin(this.pulse) * 3;

            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < range) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                const pullSpeed = 340 * dt;
                this.x += Math.cos(angle) * pullSpeed;
                this.y += Math.sin(angle) * pullSpeed;
                this.group3d.position.set(this.x, 0, this.y);
            }
        }

        destroy() {
            if (window.GraveGainGame) window.GraveGainGame.scene.remove(this.group3d);
        }
    }

    class ParticleSystem {
        constructor(scene) {
            this.scene = scene;
            this.chunks = [];
        }

        spawnSparks(x, z, hexColor = 0xffcc4c, count = 15) {
            const mat = new THREE.MeshBasicMaterial({ color: hexColor });
            for (let i = 0; i < count; i++) {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), mat);
                mesh.position.set(x, 14, z);
                this.scene.add(mesh);
                this.chunks.push({
                    mesh,
                    vx: (Math.random() * 2 - 1) * 140,
                    vy: 80 + Math.random() * 120,
                    vz: (Math.random() * 2 - 1) * 140,
                    life: 0.4 + Math.random() * 0.3
                });
            }
        }

        spawnBlood(x, z, hexColor = 0xef4444, count = 12) {
            const mat = new THREE.MeshBasicMaterial({ color: hexColor });
            for (let i = 0; i < count; i++) {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), mat);
                mesh.position.set(x + (Math.random() * 6 - 3), 16, z + (Math.random() * 6 - 3));
                this.scene.add(mesh);
                this.chunks.push({
                    mesh,
                    vx: (Math.random() * 2 - 1) * 100,
                    vy: 100 + Math.random() * 80,
                    vz: (Math.random() * 2 - 1) * 100,
                    life: 0.5 + Math.random() * 0.3
                });
            }
        }

        update(dt) {
            this.chunks.forEach(c => {
                c.life -= dt;
                c.vy -= 600 * dt;
                c.mesh.position.x += c.vx * dt;
                c.mesh.position.y += c.vy * dt;
                c.mesh.position.z += c.vz * dt;
                if (c.mesh.position.y <= 1) {
                    c.mesh.position.y = 1;
                    c.vx *= 0.5;
                    c.vz *= 0.5;
                }
            });

            const dead = this.chunks.filter(c => c.life <= 0);
            dead.forEach(c => {
                this.scene.remove(c.mesh);
                if (c.mesh.geometry) c.mesh.geometry.dispose();
            });
            this.chunks = this.chunks.filter(c => c.life > 0);
        }

        clear() {
            this.chunks.forEach(c => {
                this.scene.remove(c.mesh);
                if (c.mesh.geometry) c.mesh.geometry.dispose();
            });
            this.chunks = [];
        }
    }

    // =========================================================================
    // 11. DUNGEON GENERATOR
    // =========================================================================
    class DungeonGenerator {
        constructor() {
            this.gridSize = 70;
            this.tileSize = 48;
        }

        generate(floorNum) {
            const grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(1));
            const rooms = [];
            const roomCount = 10 + Math.min(6, floorNum);

            for (let i = 0; i < roomCount; i++) {
                const w = Math.floor(Math.random() * 7) + 6;
                const h = Math.floor(Math.random() * 7) + 6;
                const x = Math.floor(Math.random() * (this.gridSize - w - 4)) + 2;
                const y = Math.floor(Math.random() * (this.gridSize - h - 4)) + 2;

                let overlaps = false;
                for (const r of rooms) {
                    if (x < r.x + r.w + 2 && x + w > r.x - 2 && y < r.y + r.h + 2 && y + h > r.y - 2) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    let rType = 'normal';
                    if (rooms.length === 0) rType = 'spawn';
                    else if (i === roomCount - 1) rType = (floorNum % 3 === 0) ? 'boss' : 'safespace';
                    else {
                        const types = ['normal', 'graveyard', 'treasury', 'lab', 'normal'];
                        rType = types[Math.floor(Math.random() * types.length)];
                    }

                    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2), type: rType });

                    for (let rx = x; rx < x + w; rx++) {
                        for (let ry = y; ry < y + h; ry++) {
                            grid[rx][ry] = 0;
                        }
                    }
                }
            }

            for (let i = 0; i < rooms.length - 1; i++) {
                this.digCorridor(grid, rooms[i].cx, rooms[i].cy, rooms[i + 1].cx, rooms[i + 1].cy);
            }

            // Room hazards
            rooms.forEach(room => {
                if (room.type === 'lab') {
                    for (let hx = room.x + 1; hx < room.x + room.w - 1; hx += 3) {
                        for (let hy = room.y + 1; hy < room.y + room.h - 1; hy += 3) {
                            grid[hx][hy] = Math.random() < 0.5 ? 3 : 2; // Poison or Water
                        }
                    }
                }
            });

            const spawnRoom = rooms.find(r => r.type === 'spawn') || rooms[0];
            return { grid, rooms, spawnRoom, gridSize: this.gridSize };
        }

        digCorridor(grid, x1, y1, x2, y2) {
            let curX = x1;
            let curY = y1;
            while (curX !== x2) {
                grid[curX][curY] = 0;
                curX += (x2 > curX) ? 1 : -1;
            }
            while (curY !== y2) {
                grid[curX][curY] = 0;
                curY += (y2 > curY) ? 1 : -1;
            }
        }
    }

    // =========================================================================
    // 12. PHYSICS CONTROLLER
    // =========================================================================
    class PhysicsController {
        moveEntityWithCollision(ent, dx, dy, tilemap) {
            if (!tilemap) {
                ent.x += dx;
                ent.y += dy;
                return;
            }
            const ox = ent.x;
            const oy = ent.y;

            ent.x += dx;
            if (this.isColliding(ent.x, ent.y, ent.radius, tilemap)) {
                ent.x = ox;
            }

            ent.y += dy;
            if (this.isColliding(ent.x, ent.y, ent.radius, tilemap)) {
                ent.y = oy;
            }
        }

        isColliding(x, y, radius, tilemap) {
            if (!tilemap || !tilemap.grid) return false;
            const pts = [
                { x: x - radius, y: y - radius },
                { x: x + radius, y: y - radius },
                { x: x - radius, y: y + radius },
                { x: x + radius, y: y + radius }
            ];
            for (const p of pts) {
                const tx = Math.floor(p.x / 48);
                const ty = Math.floor(p.y / 48);
                if (tx < 0 || tx >= tilemap.gridSize || ty < 0 || ty >= tilemap.gridSize) return true;
                const cell = tilemap.grid[tx][ty];
                if (cell === 1 || cell === 6) return true;
            }
            return false;
        }
    }

    // =========================================================================
    // 13. CAMERA CONTROLLER
    // =========================================================================
    class CameraController {
        constructor() {
            this.shake = 0;
            this.punchX = 0;
            this.punchY = 0;
        }

        applyShake(amt) {
            this.shake = Math.min(this.shake + amt, 14);
        }

        applyPunch(vy, vx = 0) {
            this.punchY += vy;
            this.punchX += vx;
        }

        update(dt) {
            if (this.shake > 0) this.shake = Math.max(0, this.shake - 25 * dt);
            this.punchX -= this.punchX * 10 * dt;
            this.punchY -= this.punchY * 10 * dt;
        }
    }

    // =========================================================================
    // 14. SAVE SYSTEM
    // =========================================================================
    class SaveSystem {
        static save(game) {
            localStorage.setItem('GraveGain3D_Save_V2', JSON.stringify({
                gold: game.gold,
                uusd: game.uusd,
                quartersLevel: game.quartersLevel,
                armoryRanks: game.armoryRanks,
                botanyCrops: game.botanyCrops
            }));
        }

        static load() {
            const data = localStorage.getItem('GraveGain3D_Save_V2');
            if (data) {
                try { return JSON.parse(data); } catch(e) { return null; }
            }
            return null;
        }
    }

    // =========================================================================
    // 15. MAIN GRAVEGAIN3D GAME ENGINE
    // =========================================================================
    class GraveGainGame {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.container = document.getElementById('canvasContainer');

            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
            this.renderer.setSize(this.container.clientWidth || 1000, this.container.clientHeight || 600);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = false;

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x04030a);
            this.scene.fog = new THREE.FogExp2(0x04030a, 0.0035);

            this.camera3d = new THREE.PerspectiveCamera(68, (this.container.clientWidth || 1000) / (this.container.clientHeight || 600), 2, 900);

            // Lighting
            this.ambientLight = new THREE.AmbientLight(0x18102a, 0.4);
            this.scene.add(this.ambientLight);

            this.playerLantern = new THREE.PointLight(0xffeedd, 2.0, 160, 1.4);
            this.scene.add(this.playerLantern);

            // Flashlight
            this.flashlight = new THREE.SpotLight(0xfff0d0, 3.5, 300, Math.PI / 6, 0.6, 1.2);
            this.scene.add(this.flashlight);
            this.flashlightTarget = new THREE.Object3D();
            this.scene.add(this.flashlightTarget);
            this.flashlight.target = this.flashlightTarget;

            this.scene.add(this.camera3d);

            // Subsystems
            this.input = new InputManager();
            this.audio = new SoundEngine();
            this.cameraController = new CameraController();
            this.generator = new DungeonGenerator();
            this.physics = new PhysicsController();
            this.vfx = new ParticleSystem(this.scene);
            this.combatText = new CombatTextManager(document.getElementById('combatTextContainer'), this.camera3d);

            // Textures cache
            this.textures = {
                wall: ProceduralTextures.createStoneBrickTexture(),
                floor: ProceduralTextures.createFloorFlagstoneTexture(),
                ceiling: ProceduralTextures.createCeilingTexture()
            };

            // Persistent State
            this.gold = 0;
            this.uusd = 250;
            this.quartersLevel = 1;
            this.floorIndex = 1;
            this.difficulty = 'normal';
            this.armoryRanks = { health: 0, damage: 0, speed: 0, potions: 0, greed: 0 };

            this.botanyCrops = [
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 }
            ];

            // In-run Entities
            this.player = null;
            this.weaponGroup = null;
            this.enemies = [];
            this.props = [];
            this.loot = [];
            this.projectiles = [];
            this.mapMeshes = [];
            this.torches = [];
            this.dungeon = null;
            this.activeBoss = null;

            // Combat timers & animations
            this.swingTime = 0;
            this.swingDuration = 0.26;
            this.swingCombo = 0;
            this.hitstop = 0;
            this.isPaused = false;
            this.lastFrameTime = performance.now();
            this.hordeTimer = 35.0;

            // Control Modes & Game Speed
            this.controlMode = 'realtime'; // 'realtime' | 'chrono' | 'turnbased'
            this.gameSpeed = 1.0;
            this.chronoScale = 1.0;
            this.turnCount = 1;
            this.isTurnProcessing = false;
            this.joyTurnDebounce = false;

            // Minimap setup
            this.minimapCanvas = document.getElementById('hudMinimap');
            this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

            this.setupUI();
            this.loadSave();
            this.setupWindowResize();
            this.startLoop();
        }

        setupWindowResize() {
            const onResize = () => {
                const w = this.container.clientWidth || 1000;
                const h = this.container.clientHeight || 600;
                this.camera3d.aspect = w / h;
                this.camera3d.updateProjectionMatrix();
                this.renderer.setSize(w, h);
            };
            window.addEventListener('resize', onResize);
            document.addEventListener('fullscreenchange', onResize);
        }

        loadSave() {
            const data = SaveSystem.load();
            if (data) {
                this.gold = data.gold || 0;
                this.uusd = data.uusd !== undefined ? data.uusd : 250;
                this.quartersLevel = data.quartersLevel || 1;
                if (data.armoryRanks) this.armoryRanks = data.armoryRanks;
                if (data.botanyCrops) this.botanyCrops = data.botanyCrops;
            }
            this.updateHubQuartersUI();
            this.renderArmory();
        }

        saveSave() {
            SaveSystem.save(this);
        }

        startLoop() {
            const frame = (t) => {
                const dt = Math.min((t - this.lastFrameTime) / 1000, 0.1);
                this.lastFrameTime = t;

                if (!this.isPaused) {
                    this.update(dt);
                    this.render();
                }

                requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        }

        initRun(race, classType) {
            this.player = new PlayerEntity(race, classType, this.armoryRanks);
            this.floorIndex = 1;
            this.turnCount = 1;
            this.isTurnProcessing = false;
            this.chronoScale = 1.0;
            this.setControlMode(this.controlMode || 'realtime');

            // Attach 3D First-Person Weapon
            if (this.weaponGroup) {
                this.camera3d.remove(this.weaponGroup);
            }
            this.weaponGroup = WeaponFactory.buildWeapon(classType);
            this.camera3d.add(this.weaponGroup);

            this.audio.startAmbientMusic();
            this.buildDungeonLayer();
            this.combatText.showBanner(`LAYER 1 - DEPLOYED`);
            this.audio.playSfx('spell', 1.0);
        }

        clearDungeon() {
            this.mapMeshes.forEach(m => {
                this.scene.remove(m);
                if (m.geometry) m.geometry.dispose();
                if (m.material) {
                    if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                    else m.material.dispose();
                }
            });
            this.mapMeshes = [];

            this.torches.forEach(t => {
                this.scene.remove(t.light);
                this.scene.remove(t.sprite);
            });
            this.torches = [];

            this.enemies.forEach(e => e.destroy());
            this.enemies = [];

            this.props.forEach(p => p.destroy());
            this.props = [];

            this.loot.forEach(l => l.destroy());
            this.loot = [];

            this.projectiles.forEach(p => this.scene.remove(p.mesh));
            this.projectiles = [];

            this.vfx.clear();
            this.activeBoss = null;

            const bossBar = document.getElementById('bossBarContainer');
            if (bossBar) bossBar.classList.add('hidden');
        }

        buildDungeonLayer() {
            this.clearDungeon();
            this.dungeon = this.generator.generate(this.floorIndex);

            // Spawn player in spawn room
            this.player.x = this.dungeon.spawnRoom.cx * 48 + 24;
            this.player.y = this.dungeon.spawnRoom.cy * 48 + 24;
            this.player.vx = 0;
            this.player.vy = 0;

            const wallGeo = new THREE.BoxGeometry(48, 72, 48);
            const wallMat = new THREE.MeshStandardMaterial({ map: this.textures.wall, roughness: 0.85 });

            const floorGeo = new THREE.PlaneGeometry(48, 48);
            const floorMat = new THREE.MeshStandardMaterial({ map: this.textures.floor, roughness: 0.9 });

            const ceilGeo = new THREE.PlaneGeometry(48, 48);
            const ceilMat = new THREE.MeshStandardMaterial({ map: this.textures.ceiling, roughness: 0.95 });

            const waterMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.75, roughness: 0.1 });
            const poisonMat = new THREE.MeshStandardMaterial({ color: 0x15803d, transparent: true, opacity: 0.7, roughness: 0.2 });

            for (let x = 0; x < this.dungeon.gridSize; x++) {
                for (let y = 0; y < this.dungeon.gridSize; y++) {
                    const tile = this.dungeon.grid[x][y];
                    const tx = x * 48 + 24;
                    const ty = y * 48 + 24;

                    if (tile === 1) {
                        const wall = new THREE.Mesh(wallGeo, wallMat);
                        wall.position.set(tx, 36, ty);
                        this.scene.add(wall);
                        this.mapMeshes.push(wall);
                    } else {
                        // Floor
                        const floor = new THREE.Mesh(floorGeo, floorMat);
                        floor.rotation.x = -Math.PI / 2;
                        floor.position.set(tx, 0, ty);
                        this.scene.add(floor);
                        this.mapMeshes.push(floor);

                        // Ceiling
                        const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
                        ceiling.rotation.x = Math.PI / 2;
                        ceiling.position.set(tx, 72, ty);
                        this.scene.add(ceiling);
                        this.mapMeshes.push(ceiling);

                        if (tile === 2) {
                            const water = new THREE.Mesh(floorGeo, waterMat);
                            water.rotation.x = -Math.PI / 2;
                            water.position.set(tx, 0.4, ty);
                            this.scene.add(water);
                            this.mapMeshes.push(water);
                        } else if (tile === 3) {
                            const poison = new THREE.Mesh(floorGeo, poisonMat);
                            poison.rotation.x = -Math.PI / 2;
                            poison.position.set(tx, 0.4, ty);
                            this.scene.add(poison);
                            this.mapMeshes.push(poison);
                        }
                    }
                }
            }

            // Spawn Torches, Props & Enemies in rooms
            const diffScale = 1.0 + (this.floorIndex * 0.18);

            this.dungeon.rooms.forEach((room) => {
                // Spawn torch on room wall
                const torchX = room.cx * 48 + 24;
                const torchZ = room.y * 48 + 4;
                const torchLight = new THREE.PointLight(0xff9922, 1.8, 120, 1.6);
                torchLight.position.set(torchX, 36, torchZ + 12);
                this.scene.add(torchLight);

                const torchSprite = ProceduralTextures.createTorchFlameSprite();
                torchSprite.position.set(torchX, 36, torchZ + 12);
                this.scene.add(torchSprite);

                this.torches.push({ light: torchLight, sprite: torchSprite, baseIntensity: 1.8, seed: Math.random() * 10 });

                if (room.type === 'spawn') return;

                if (room.type === 'boss') {
                    // Spawn Floor Boss: Ancient Bone Goliath
                    const boss = new EnemyEntity({
                        name: 'BONE GOLIATH',
                        hp: 450 + this.floorIndex * 150,
                        dmg: 35,
                        speed: 75,
                        scale: 2.5,
                        isBoss: true,
                        attackInterval: 1.4
                    }, room.cx * 48 + 24, room.cy * 48 + 24, diffScale);
                    this.scene.add(boss.group3d);
                    this.enemies.push(boss);
                    this.activeBoss = boss;

                    const bossBar = document.getElementById('bossBarContainer');
                    if (bossBar) bossBar.classList.remove('hidden');
                    document.getElementById('bossName').textContent = 'ANCIENT BONE GOLIATH';
                    this.audio.playSfx('boss_roar');
                    this.combatText.showBanner('⚠️ BOSS ENCOUNTER: BONE GOLIATH ⚠️');
                    return;
                }

                // Spawn props
                if (Math.random() < 0.6) {
                    const px = (room.x + 1) * 48 + 24;
                    const pz = (room.y + 1) * 48 + 24;
                    const prop = new DungeonProp(px, pz, 'crate');
                    this.scene.add(prop.group3d);
                    this.props.push(prop);
                }

                if (room.type === 'treasury') {
                    const cx = room.cx * 48 + 24;
                    const cz = room.cy * 48 + 24;
                    const chest = new DungeonProp(cx, cz, 'chest');
                    this.scene.add(chest.group3d);
                    this.props.push(chest);
                }

                // Spawn enemies
                const mobCount = room.type === 'graveyard' ? 4 : 2;
                for (let i = 0; i < mobCount; i++) {
                    const ex = (room.x + Math.floor(Math.random() * room.w)) * 48 + 24;
                    const ey = (room.y + Math.floor(Math.random() * room.h)) * 48 + 24;

                    const rand = Math.random();
                    let eData = { name: 'Goblin Skeleton', hp: 25, dmg: 8, speed: 120, scale: 0.8, type: 'skeleton' };
                    if (rand < 0.3) {
                        eData = { name: 'Flying Fire Skull', hp: 16, dmg: 28, speed: 155, scale: 0.9, type: 'skull' };
                    } else if (rand < 0.6) {
                        eData = { name: 'Armored Skeleton', hp: 65, dmg: 14, speed: 85, scale: 1.1, armored: true, type: 'skeleton' };
                    } else if (rand < 0.85) {
                        eData = { name: 'Skeleton Necromancer', hp: 45, dmg: 18, speed: 70, scale: 1.0, type: 'mage' };
                    }

                    const enemy = new EnemyEntity(eData, ex, ey, diffScale);
                    this.scene.add(enemy.group3d);
                    this.enemies.push(enemy);
                }
            });

            // Safespace exit portal
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
            if (safespace) {
                const sx = safespace.cx * 48 + 24;
                const sy = safespace.cy * 48 + 24;
                const portal = ProceduralTextures.createEmojiSprite('🌀', 128);
                portal.position.set(sx, 20, sy);
                this.scene.add(portal);
                this.mapMeshes.push(portal);
            }

            this.updateHUD();
        }

        spawnProjectile(x, y, z, vx, vy, vz, dmg, isPlayer, color, type) {
            const p = new Projectile(x, y, z, vx, vy, vz, dmg, isPlayer, color, type);
            this.scene.add(p.mesh);
            this.projectiles.push(p);
        }

        triggerMeleeAttack() {
            if (this.swingTime > 0 || !this.player) return;

            const cData = ClassData[this.player.classType];
            this.swingDuration = cData.attackSpeed;
            this.swingTime = this.swingDuration;
            this.swingCombo = (this.swingCombo + 1) % 3;

            this.cameraController.applyPunch(0.04, -0.02);

            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);

            if (this.player.classType === ClassType.MAGE) {
                // Cast projectile
                this.audio.playSfx('spell');
                const speed = 400;
                this.spawnProjectile(
                    this.player.x,
                    this.player.yElevation + 18,
                    this.player.y,
                    forward.x * speed,
                    forward.y * speed,
                    forward.z * speed,
                    cData.baseDmg,
                    true,
                    0xa855f7,
                    'magic'
                );
            } else if (this.player.classType === ClassType.SUPPORT) {
                // Rapid bio-needle
                this.audio.playSfx('spell', 1.6);
                const speed = 480;
                this.spawnProjectile(
                    this.player.x,
                    this.player.yElevation + 18,
                    this.player.y,
                    forward.x * speed,
                    forward.y * speed,
                    forward.z * speed,
                    cData.baseDmg,
                    true,
                    0x22c55e,
                    'chem'
                );
            } else {
                // Melee slash or hammer slam
                this.audio.playSfx('swing');
                const sweepRange = cData.range;

                // Check enemies
                this.enemies.forEach(e => {
                    const dx = e.x - this.player.x;
                    const dy = e.y - this.player.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist <= sweepRange) {
                        const toEnemy = new THREE.Vector3(dx, 0, dy).normalize();
                        const dot = forward.x * toEnemy.x + forward.z * toEnemy.z;

                        if (dot > 0.45) { // 70-degree cone
                            this.applyHitToEnemy(e, cData.baseDmg, forward);
                        }
                    }
                });

                // Check breakable props
                this.props.forEach(prop => {
                    if (prop.broken) return;
                    const dist = Math.hypot(prop.x - this.player.x, prop.z - this.player.y);
                    if (dist <= sweepRange) {
                        this.breakProp(prop);
                    }
                });
            }
        }

        applyHitToEnemy(enemy, baseDmg, dir) {
            let dmg = baseDmg;
            const dmgBonus = this.armoryRanks.damage ? (1.0 + this.armoryRanks.damage * 0.15) : 1.0;
            dmg *= dmgBonus;

            if (this.player.hasPerk('goldrush')) {
                dmg *= (1.0 + (this.gold / 20) * 0.01);
            }

            let isCrit = Math.random() < (ClassData[this.player.classType].critChance + (this.player.hasPerk('critfury') ? 0.20 : 0));
            if (isCrit) {
                dmg *= ClassData[this.player.classType].critMult;
            }

            enemy.hp -= dmg;
            enemy.kx = dir.x * 160;
            enemy.ky = dir.z * 160;

            // Trigger hitstop & audio
            this.hitstop = 0.04;
            this.vfx.spawnBlood(enemy.x, enemy.y, enemy.bloodColor);
            this.audio.playSfx(isCrit ? 'crit' : 'hit');

            // Crosshair hit indicator
            const crosshair = document.getElementById('hudCrosshair');
            if (crosshair) {
                crosshair.classList.add('hit');
                setTimeout(() => crosshair.classList.remove('hit'), 120);
            }

            this.combatText.spawnText(enemy.x, 20, enemy.y, `${isCrit ? 'CRIT! ' : ''}${Math.round(dmg)}`, isCrit ? 'crit' : 'damage');

            // Perks triggers
            if (this.player.hasPerk('vampiric')) {
                const leech = Math.max(1, dmg * 0.15);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + leech);
            }

            if (this.player.hasPerk('lightning')) {
                this.triggerChainLightning(enemy, 18);
            }

            if (this.player.hasPerk('executioner') && !enemy.isBoss && (enemy.hp / enemy.maxHp < 0.25)) {
                enemy.hp = 0;
                this.combatText.spawnText(enemy.x, 25, enemy.y, 'EXECUTED!', 'crit');
            }
        }

        triggerChainLightning(sourceEnemy, dmg) {
            let hits = 0;
            this.enemies.forEach(target => {
                if (target !== sourceEnemy && hits < 2) {
                    const dist = Math.hypot(target.x - sourceEnemy.x, target.y - sourceEnemy.y);
                    if (dist < 200) {
                        target.hp -= dmg;
                        this.vfx.spawnSparks(target.x, target.y, 0x38bdf8, 15);
                        this.combatText.spawnText(target.x, 20, target.y, `⚡${dmg}`, 'block');
                        hits++;
                    }
                }
            });
            if (hits > 0) this.audio.playSfx('spell', 1.8);
        }

        breakProp(prop) {
            prop.broken = true;
            this.scene.remove(prop.group3d);
            this.vfx.spawnSparks(prop.x, prop.z, 0xb45309, 20);
            this.audio.playSfx('hit', 1.2);

            if (prop.type === 'chest') {
                this.audio.playSfx('loot');
                for (let i = 0; i < 4; i++) {
                    const ox = prop.x + (Math.random() * 20 - 10);
                    const oz = prop.z + (Math.random() * 20 - 10);
                    const item = new LootItem(ox, oz, 'gold', 35);
                    this.scene.add(item.group3d);
                    this.loot.push(item);
                }
                if (Math.random() < 0.5) {
                    const pot = new LootItem(prop.x, prop.z, 'potion', 1);
                    this.scene.add(pot.group3d);
                    this.loot.push(pot);
                }
            } else {
                if (Math.random() < 0.5) {
                    const item = new LootItem(prop.x, prop.z, 'gold', 15);
                    this.scene.add(item.group3d);
                    this.loot.push(item);
                }
            }
        }

        dealAoEDamage(x, y, radius, dmg, type) {
            this.enemies.forEach(e => {
                const dist = Math.hypot(e.x - x, e.y - y);
                if (dist <= radius) {
                    e.hp -= dmg;
                    e.kx = (e.x - x) * 1.5;
                    e.ky = (e.y - y) * 1.5;
                    this.combatText.spawnText(e.x, 20, e.y, `${Math.round(dmg)}`, 'crit');
                    this.vfx.spawnSparks(e.x, e.y, type === 'nature' ? 0x4cff7f : 0xff4c4c, 15);
                }
            });
        }

        usePotion() {
            if (!this.player || this.player.isDead) return;
            if (this.player.potions > 0 && this.player.hp < this.player.maxHp) {
                this.player.potions--;
                const healAmt = Math.round(this.player.maxHp * 0.5);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
                this.audio.playSfx('potion');
                this.vfx.spawnSparks(this.player.x, this.player.y, 0x4ade80, 20);
                this.combatText.spawnText(this.player.x, 20, this.player.y, `+${healAmt} HP`, 'heal');
                this.updateHUD();
            }
        }

        triggerLevelUp() {
            this.isPaused = true;
            this.audio.playSfx('levelup');

            const screen = document.getElementById('levelUpScreen');
            const grid = document.getElementById('perkCardsGrid');
            if (!screen || !grid) return;

            // Pick 3 random distinct perks
            const pool = RoguelikePerks.filter(p => !this.player.hasPerk(p.id));
            const shuffled = [...pool].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 3);

            grid.innerHTML = selected.map(perk => `
                <div class="perk-card" data-perk="${perk.id}">
                    <span class="perk-rarity perk-rarity-${perk.rarity}">${perk.rarity}</span>
                    <span class="perk-icon">${perk.icon}</span>
                    <div class="perk-name">${perk.name}</div>
                    <div class="perk-desc">${perk.desc}</div>
                    <button class="btn-game btn-primary" style="font-size:0.8rem; padding:8px 16px; margin-top:auto;">Select Boon</button>
                </div>
            `).join('');

            const cards = grid.querySelectorAll('.perk-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const perkId = card.dataset.perk;
                    const chosen = RoguelikePerks.find(p => p.id === perkId);
                    if (chosen) {
                        this.player.perks.push(chosen);
                        this.combatText.showBanner(`BOON ACQUIRED: ${chosen.name}`);
                    }
                    screen.classList.add('hidden');
                    this.isPaused = false;
                    this.container.requestPointerLock();
                });
            });

            screen.classList.remove('hidden');
            document.exitPointerLock();
        }

        setControlMode(mode) {
            this.controlMode = mode;

            // Update Mode Buttons in HUD
            document.querySelectorAll('.btn-mode').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });

            // Update Mode Cards in Char Select
            document.querySelectorAll('.char-mode-card').forEach(card => {
                card.classList.toggle('selected', card.dataset.mode === mode);
            });

            const speedGroup = document.getElementById('speedSelectorGroup');
            const turnGroup = document.getElementById('turnDisplayGroup');
            const chronoGroup = document.getElementById('chronoDisplayGroup');
            const mobileWait = document.getElementById('mobileWaitBtn');
            const controlsHint = document.getElementById('controlsHint');

            if (mode === 'realtime') {
                if (speedGroup) speedGroup.classList.remove('hidden');
                if (turnGroup) turnGroup.classList.add('hidden');
                if (chronoGroup) chronoGroup.classList.add('hidden');
                if (mobileWait) mobileWait.classList.add('hidden');
                if (controlsHint) controlsHint.textContent = 'Controls: WASD Move | Mouse Look | Left-Click Attack | Right-Click Block | F Ability | Space Jump | Q Potion';
            } else if (mode === 'chrono') {
                if (speedGroup) speedGroup.classList.add('hidden');
                if (turnGroup) turnGroup.classList.add('hidden');
                if (chronoGroup) chronoGroup.classList.remove('hidden');
                if (mobileWait) mobileWait.classList.add('hidden');
                if (controlsHint) controlsHint.textContent = 'Chrono-Lock: Time moves ONLY when you move, look, or attack! Freeze still to dodge.';
            } else if (mode === 'turnbased') {
                if (speedGroup) speedGroup.classList.add('hidden');
                if (turnGroup) turnGroup.classList.remove('hidden');
                if (chronoGroup) chronoGroup.classList.add('hidden');
                if (mobileWait) mobileWait.classList.remove('hidden');
                if (controlsHint) controlsHint.textContent = 'Turn-Based: WASD Step (1 tile) | Left-Click Attack | ⏳ Wait Turn (Space / Button) | Q Potion';
                this.turnCount = 1;
                const turnCounter = document.getElementById('hudTurnCounter');
                if (turnCounter) turnCounter.textContent = `Turn ${this.turnCount}`;
                const turnPhase = document.getElementById('hudTurnPhase');
                if (turnPhase) {
                    turnPhase.textContent = 'YOUR TURN';
                    turnPhase.className = 'turn-phase-badge player-phase';
                }
            }
        }

        setGameSpeed(speed) {
            this.gameSpeed = parseFloat(speed) || 1.0;
            document.querySelectorAll('.btn-speed').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.dataset.speed) === this.gameSpeed);
            });
        }

        executeTurnAction(action) {
            if (this.controlMode !== 'turnbased' || this.isTurnProcessing || !this.player || this.player.isDead) return;

            this.isTurnProcessing = true;
            const phaseBadge = document.getElementById('hudTurnPhase');
            if (phaseBadge) {
                phaseBadge.textContent = 'PLAYER ACTION';
                phaseBadge.className = 'turn-phase-badge player-phase';
            }

            // 1. Execute Player Action
            if (action === 'step_forward' || action === 'step_backward' || action === 'step_left' || action === 'step_right') {
                const stepDist = 48;
                let nx = 0, nz = 0;
                if (action === 'step_forward') nz = -1;
                else if (action === 'step_backward') nz = 1;
                else if (action === 'step_left') nx = -1;
                else if (action === 'step_right') nx = 1;

                const cosYaw = Math.cos(this.player.yaw);
                const sinYaw = Math.sin(this.player.yaw);
                const dx = (nx * cosYaw - nz * sinYaw) * stepDist;
                const dy = (nx * sinYaw + nz * cosYaw) * stepDist;

                this.physics.moveEntityWithCollision(this.player, dx, dy, this.dungeon);
                this.audio.playSfx('swing', 2.0);
            } else if (action === 'attack') {
                this.triggerMeleeAttack();
            } else if (action === 'ability') {
                this.player.triggerAbility();
            } else if (action === 'wait') {
                // Recover stamina & defensive posture
                this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 35);
                if (this.player.race === Race.HUMAN) {
                    this.player.shieldBubble = Math.min(25, this.player.shieldBubble + 8);
                }
                this.combatText.spawnText(this.player.x, 20, this.player.y, 'DEFENDING / WAITING', 'block');
                this.audio.playSfx('block', 0.9);
            } else if (action === 'potion') {
                this.usePotion();
            }

            // Check loot pickups
            const pickupRange = 55;
            this.loot.forEach(l => {
                const dist = Math.hypot(this.player.x - l.x, this.player.y - l.y);
                if (dist < this.player.radius + l.radius + pickupRange) {
                    if (l.type === 'potion') {
                        this.player.potions = Math.min(5, this.player.potions + 1);
                        this.audio.playSfx('potion');
                        this.combatText.spawnText(this.player.x, 20, this.player.y, '+1 POTION', 'heal');
                    } else {
                        this.gold += l.value;
                        this.audio.playSfx('loot');
                        this.combatText.spawnText(this.player.x, 20, this.player.y, `+${l.value} Gold`, 'crit');
                    }
                    l.picked = true;
                    l.destroy();
                }
            });
            this.loot = this.loot.filter(l => !l.picked);

            // Hazard checks on current tile
            const tx = Math.floor(this.player.x / 48);
            const ty = Math.floor(this.player.y / 48);
            if (this.dungeon && this.dungeon.grid && this.dungeon.grid[tx]) {
                const cell = this.dungeon.grid[tx][ty];
                if (cell === 3 && this.player.race !== Race.DWARF) {
                    this.player.takeDamage(12, 'poison');
                } else if (cell === 4) {
                    this.player.takeDamage(16, 'fire');
                }
            }

            // Portal Descent check
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
            if (safespace && (!this.activeBoss || this.activeBoss.hp <= 0)) {
                const sx = safespace.cx * 48 + 24;
                const sy = safespace.cy * 48 + 24;
                if (Math.hypot(this.player.x - sx, this.player.y - sy) < 45) {
                    this.floorIndex++;
                    this.buildDungeonLayer();
                    this.combatText.showBanner(`DESCENDED TO LAYER ${this.floorIndex}`);
                    this.audio.playSfx('spell', 1.3);
                    this.isTurnProcessing = false;
                    return;
                }
            }

            // 2. Enemy Phase
            if (phaseBadge) {
                phaseBadge.textContent = 'ENEMY TURN';
                phaseBadge.className = 'turn-phase-badge enemy-phase';
            }

            setTimeout(() => {
                if (!this.player || this.player.isDead) {
                    this.isTurnProcessing = false;
                    return;
                }

                // Advance projectiles
                this.projectiles.forEach(p => {
                    p.x += p.vx * 0.35;
                    p.z += p.vz * 0.35;
                    p.mesh.position.set(p.x, p.y, p.z);
                    if (p.isPlayer) {
                        this.enemies.forEach(e => {
                            const dist = Math.hypot(e.x - p.x, e.y - p.z);
                            if (dist < e.radius + p.radius) {
                                p.dead = true;
                                this.applyHitToEnemy(e, p.dmg, new THREE.Vector3(p.vx, 0, p.vz).normalize());
                            }
                        });
                    } else {
                        const dist = Math.hypot(this.player.x - p.x, this.player.y - p.z);
                        if (dist < this.player.radius + p.radius) {
                            p.dead = true;
                            this.player.takeDamage(p.dmg);
                        }
                    }
                });
                this.projectiles.filter(p => p.dead).forEach(p => this.scene.remove(p.mesh));
                this.projectiles = this.projectiles.filter(p => !p.dead);

                // Enemies take turn
                this.enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);

                    if (dist < 450 && e.state === 'idle') {
                        e.state = 'chase';
                    }

                    if (e.state === 'chase') {
                        e.angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);

                        if (dist < e.radius + this.player.radius + 18) {
                            // In melee range -> attack player
                            this.player.takeDamage(e.dmg);
                            this.audio.playSfx('hit', 0.9);
                            this.combatText.spawnText(this.player.x, 20, this.player.y, `-${Math.round(e.dmg)}`, 'damage');
                            if (e.type === 'skull') {
                                this.vfx.spawnSparks(e.x, e.y, 0xff4422, 25);
                                this.audio.playSfx('explode');
                                e.hp = 0;
                            }
                        } else if (e.type === 'mage' && dist < 320 && Math.random() < 0.65) {
                            // Spell projectile
                            const forwardX = Math.cos(e.angle);
                            const forwardY = Math.sin(e.angle);
                            this.spawnProjectile(e.x, 18, e.y, forwardX * 220, 0, forwardY * 220, e.dmg, false, 0x9333ea, 'magic');
                            this.audio.playSfx('spell', 0.8);
                        } else {
                            // Step toward player
                            const stepSize = Math.min(38, dist - (e.radius + this.player.radius));
                            if (stepSize > 0) {
                                const evx = Math.cos(e.angle) * stepSize;
                                const evy = Math.sin(e.angle) * stepSize;
                                this.physics.moveEntityWithCollision(e, evx, evy, this.dungeon);
                            }
                        }
                        e.group3d.position.set(e.x, 0, e.y);
                        e.group3d.rotation.y = -e.angle + Math.PI / 2;
                    }
                });

                // Clean dead enemies & drop loot
                this.enemies.forEach(e => {
                    if (e.hp <= 0) {
                        const greedMult = this.armoryRanks.greed ? (1.0 + this.armoryRanks.greed * 0.25) : 1.0;
                        const goldGain = Math.round((e.isBoss ? 150 : 15) * greedMult);
                        const xpGain = e.isBoss ? 120 : 25;

                        this.gold += goldGain;
                        this.player.addXp(xpGain);
                        this.vfx.spawnBlood(e.x, e.y, e.bloodColor);

                        const loot = new LootItem(e.x, e.y, (Math.random() < 0.25 ? 'potion' : 'gold'), goldGain);
                        this.scene.add(loot.group3d);
                        this.loot.push(loot);

                        if (e.isBoss) {
                            this.activeBoss = null;
                            this.audio.playSfx('levelup');
                            this.combatText.showBanner('🏆 BOSS DEFEATED! 🏆');
                            const bossBar = document.getElementById('bossBarContainer');
                            if (bossBar) bossBar.classList.add('hidden');
                        }
                        e.destroy();
                    }
                });
                this.enemies = this.enemies.filter(e => e.hp > 0);

                // End of turn
                this.turnCount++;
                const turnCounter = document.getElementById('hudTurnCounter');
                if (turnCounter) turnCounter.textContent = `Turn ${this.turnCount}`;
                if (phaseBadge) {
                    phaseBadge.textContent = 'YOUR TURN';
                    phaseBadge.className = 'turn-phase-badge player-phase';
                }
                this.isTurnProcessing = false;
                this.updateHUD();
                this.drawMinimap();
            }, 130);
        }

        update(dt) {
            if (!this.player) return;
            if (this.hitstop > 0) {
                this.hitstop -= dt;
                return;
            }

            const isShake = document.getElementById('settingsCameraShake').checked;

            // 1. Determine effectiveDt based on controlMode
            let effectiveDt = dt;
            if (this.controlMode === 'realtime') {
                effectiveDt = dt * this.gameSpeed;
            } else if (this.controlMode === 'chrono') {
                // Chrono-Lock (SUPERHOT style): Time moves ONLY when you move, look, or attack
                const isMovingKeys = !!(this.input.keys['KeyW'] || this.input.keys['KeyS'] || 
                                        this.input.keys['KeyA'] || this.input.keys['KeyD'] ||
                                        this.input.keys['ArrowUp'] || this.input.keys['ArrowDown'] ||
                                        this.input.keys['ArrowLeft'] || this.input.keys['ArrowRight'] ||
                                        this.input.keys['Space']);
                const isJoyMoving = this.input.joystick.active && Math.hypot(this.input.joystick.x, this.input.joystick.y) > 0.08;
                const isLooking = (this.input.lastLookDelta || 0) > 0.8;
                const isAttacking = this.swingTime > 0 || this.input.mouse.click || this.input.mouse.isBlocking;
                const isAbilOrPot = !!(this.input.keys['KeyF'] || this.input.keys['KeyQ']);

                const hasActivity = isMovingKeys || isJoyMoving || isLooking || isAttacking || isAbilOrPot;
                const targetScale = hasActivity ? 1.0 : 0.035;
                this.chronoScale = THREE.MathUtils.lerp(this.chronoScale, targetScale, 0.22);
                effectiveDt = dt * this.chronoScale;

                if (this.input.lastLookDelta) {
                    this.input.lastLookDelta *= 0.65;
                }

                const badge = document.getElementById('chronoStatusBadge');
                if (badge) {
                    if (this.chronoScale > 0.25) {
                        badge.textContent = `TIME FLOWING (${Math.round(this.chronoScale * 100)}%)`;
                        badge.className = 'chrono-badge flowing';
                    } else {
                        badge.textContent = 'TIME FROZEN';
                        badge.className = 'chrono-badge frozen';
                    }
                }
            } else if (this.controlMode === 'turnbased') {
                // Turn-based mode: continuous physics paused, discrete actions drive turns
                effectiveDt = 0;

                if (!this.isTurnProcessing) {
                    if (this.input.keys['KeyW'] || this.input.keys['ArrowUp']) {
                        this.input.keys['KeyW'] = false;
                        this.input.keys['ArrowUp'] = false;
                        this.executeTurnAction('step_forward');
                    } else if (this.input.keys['KeyS'] || this.input.keys['ArrowDown']) {
                        this.input.keys['KeyS'] = false;
                        this.input.keys['ArrowDown'] = false;
                        this.executeTurnAction('step_backward');
                    } else if (this.input.keys['KeyA'] || this.input.keys['ArrowLeft']) {
                        this.input.keys['KeyA'] = false;
                        this.input.keys['ArrowLeft'] = false;
                        this.executeTurnAction('step_left');
                    } else if (this.input.keys['KeyD'] || this.input.keys['ArrowRight']) {
                        this.input.keys['KeyD'] = false;
                        this.input.keys['ArrowRight'] = false;
                        this.executeTurnAction('step_right');
                    } else if (this.input.keys['Space']) {
                        this.input.keys['Space'] = false;
                        this.executeTurnAction('wait');
                    } else if (this.input.mouse.click) {
                        this.input.mouse.click = false;
                        this.executeTurnAction('attack');
                    } else if (this.input.keys['KeyF']) {
                        this.input.keys['KeyF'] = false;
                        this.executeTurnAction('ability');
                    } else if (this.input.joystick.active && Math.hypot(this.input.joystick.x, this.input.joystick.y) > 0.6) {
                        if (!this.joyTurnDebounce) {
                            this.joyTurnDebounce = true;
                            const jx = this.input.joystick.x;
                            const jy = this.input.joystick.y;
                            if (Math.abs(jy) > Math.abs(jx)) {
                                this.executeTurnAction(jy < 0 ? 'step_forward' : 'step_backward');
                            } else {
                                this.executeTurnAction(jx < 0 ? 'step_left' : 'step_right');
                            }
                            setTimeout(() => { this.joyTurnDebounce = false; }, 260);
                        }
                    }
                }
            }

            // 2. Realtime/Chrono updates
            if (this.controlMode !== 'turnbased') {
                this.player.isBlocking = this.input.mouse.isBlocking;

                // Handle primary attack
                if (this.input.mouse.click) {
                    this.triggerMeleeAttack();
                    this.input.mouse.click = false;
                }

                // Handle ability
                if (this.input.keys['KeyF']) {
                    this.player.triggerAbility();
                    this.input.keys['KeyF'] = false;
                }

                this.player.update(effectiveDt, this.input, this.physics, this.dungeon);

                // Update enemies
                this.enemies.forEach(e => e.update(effectiveDt, this.player, this.physics, this.dungeon, this));

                // Clean dead enemies & drop loot
                this.enemies.forEach(e => {
                    if (e.hp <= 0) {
                        const greedMult = this.armoryRanks.greed ? (1.0 + this.armoryRanks.greed * 0.25) : 1.0;
                        const goldGain = Math.round((e.isBoss ? 150 : 15) * greedMult);
                        const xpGain = e.isBoss ? 120 : 25;

                        this.gold += goldGain;
                        this.player.addXp(xpGain);
                        this.vfx.spawnBlood(e.x, e.y, e.bloodColor);

                        // Drop loot
                        const loot = new LootItem(e.x, e.y, (Math.random() < 0.25 ? 'potion' : 'gold'), goldGain);
                        this.scene.add(loot.group3d);
                        this.loot.push(loot);

                        if (e.isBoss) {
                            this.activeBoss = null;
                            this.audio.playSfx('levelup');
                            this.combatText.showBanner('🏆 BOSS DEFEATED! 🏆');
                            const bossBar = document.getElementById('bossBarContainer');
                            if (bossBar) bossBar.classList.add('hidden');
                        }

                        e.destroy();
                    }
                });
                this.enemies = this.enemies.filter(e => e.hp > 0);

                // Update Boss health bar
                if (this.activeBoss) {
                    const percent = Math.max(0, (this.activeBoss.hp / this.activeBoss.maxHp) * 100);
                    document.getElementById('bossHpBar').style.width = `${percent}%`;
                    document.getElementById('bossHpText').textContent = `${Math.round(this.activeBoss.hp)} / ${Math.round(this.activeBoss.maxHp)}`;
                }

                // Update Projectiles
                this.projectiles.forEach(p => {
                    p.update(effectiveDt, this.dungeon);
                    if (p.isPlayer) {
                        this.enemies.forEach(e => {
                            const dist = Math.hypot(e.x - p.x, e.y - p.z);
                            if (dist < e.radius + p.radius) {
                                p.dead = true;
                                this.applyHitToEnemy(e, p.dmg, new THREE.Vector3(p.vx, 0, p.vz).normalize());
                            }
                        });
                    } else {
                        const dist = Math.hypot(this.player.x - p.x, this.player.y - p.z);
                        if (dist < this.player.radius + p.radius) {
                            p.dead = true;
                            this.player.takeDamage(p.dmg);
                        }
                    }
                });
                this.projectiles.filter(p => p.dead).forEach(p => this.scene.remove(p.mesh));
                this.projectiles = this.projectiles.filter(p => !p.dead);

                // Update Loot Pickups
                const pickupRange = parseFloat(document.getElementById('settingsPickupRange').value) * 24 || 120;
                this.loot.forEach(l => {
                    l.update(effectiveDt, this.player, pickupRange);
                    const dist = Math.hypot(this.player.x - l.x, this.player.y - l.y);
                    if (dist < this.player.radius + l.radius) {
                        if (l.type === 'potion') {
                            this.player.potions = Math.min(5, this.player.potions + 1);
                            this.audio.playSfx('potion');
                            this.combatText.spawnText(this.player.x, 20, this.player.y, '+1 POTION', 'heal');
                        } else {
                            this.gold += l.value;
                            this.audio.playSfx('loot');
                            this.combatText.spawnText(this.player.x, 20, this.player.y, `+${l.value} Gold`, 'crit');
                        }
                        l.picked = true;
                        l.destroy();
                    }
                });
                this.loot = this.loot.filter(l => !l.picked);

                // Portal Descent check
                const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
                if (safespace && (!this.activeBoss || this.activeBoss.hp <= 0)) {
                    const sx = safespace.cx * 48 + 24;
                    const sy = safespace.cy * 48 + 24;
                    if (Math.hypot(this.player.x - sx, this.player.y - sy) < 45) {
                        this.floorIndex++;
                        this.buildDungeonLayer();
                        this.combatText.showBanner(`DESCENDED TO LAYER ${this.floorIndex}`);
                        this.audio.playSfx('spell', 1.3);
                    }
                }
            }

            // Update weapon viewmodel animation
            if (this.weaponGroup) {
                const animDt = effectiveDt > 0 ? effectiveDt : dt * 1.5;
                if (this.swingTime > 0) {
                    this.swingTime -= animDt;
                    const progress = (this.swingDuration - this.swingTime) / this.swingDuration;
                    const arc = Math.sin(progress * Math.PI);

                    if (this.weaponGroup.mainHand) {
                        this.weaponGroup.mainHand.position.x = 2.8 - arc * 4.5;
                        this.weaponGroup.mainHand.position.y = -2.8 + arc * 1.8;
                        this.weaponGroup.mainHand.rotation.z = -Math.PI / 7 - arc * 1.5;
                    }
                } else {
                    // Idle bobbing
                    const idleBob = Math.sin(Date.now() * 0.003) * 0.15;
                    if (this.weaponGroup.mainHand) {
                        this.weaponGroup.mainHand.position.y = -2.8 + idleBob;
                    }
                    if (this.weaponGroup.offHand) {
                        // Raised in block position if blocking
                        if (this.player.isBlocking) {
                            this.weaponGroup.offHand.position.set(-1.0, -1.8, -4.5);
                            this.weaponGroup.offHand.rotation.set(0, 0, 0);
                        } else {
                            this.weaponGroup.offHand.position.set(-3.2, -3.2, -6.0);
                            this.weaponGroup.offHand.rotation.set(0, Math.PI / 6, 0);
                        }
                    }
                }
            }

            // Torches gentle flicker
            this.torches.forEach(t => {
                const f = Math.sin(Date.now() * 0.008 + t.seed);
                t.light.intensity = t.baseIntensity + f * 0.4;
            });

            // Camera orientation & follow
            this.cameraController.update(dt);
            this.camera3d.rotation.order = 'YXZ';
            this.camera3d.rotation.y = this.player.yaw + this.cameraController.punchX;
            this.camera3d.rotation.x = this.player.pitch + this.cameraController.punchY;

            let shakeOffset = new THREE.Vector3(0, 0, 0);
            if (isShake && this.cameraController.shake > 0) {
                const s = this.cameraController.shake * 0.15;
                shakeOffset.set((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
            }

            this.camera3d.position.set(this.player.x, this.player.yElevation + 20, this.player.y).add(shakeOffset);

            // Synchronize player lantern and flashlight
            this.playerLantern.position.copy(this.camera3d.position);
            this.flashlight.position.copy(this.camera3d.position);

            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);
            this.flashlightTarget.position.copy(this.camera3d.position).add(forward.multiplyScalar(100));

            this.vfx.update(effectiveDt > 0 ? effectiveDt : dt * 0.1);
            this.updateHUD();
            this.drawMinimap();
        }

        drawMinimap() {
            if (!this.minimapCtx || !this.dungeon || !this.player) return;
            const ctx = this.minimapCtx;
            const w = this.minimapCanvas.width;
            const h = this.minimapCanvas.height;

            ctx.clearRect(0, 0, w, h);

            // Centered on player
            const scale = 0.45;
            const cx = w / 2;
            const cy = h / 2;

            ctx.save();
            ctx.translate(cx, cy);

            // Draw rooms & corridors
            ctx.fillStyle = '#1e293b';
            for (let x = 0; x < this.dungeon.gridSize; x++) {
                for (let y = 0; y < this.dungeon.gridSize; y++) {
                    if (this.dungeon.grid[x][y] !== 1) {
                        const mx = (x * 48 + 24 - this.player.x) * scale;
                        const my = (y * 48 + 24 - this.player.y) * scale;
                        ctx.fillRect(mx - 4, my - 4, 8, 8);
                    }
                }
            }

            // Draw portal
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
            if (safespace) {
                const sx = (safespace.cx * 48 + 24 - this.player.x) * scale;
                const sy = (safespace.cy * 48 + 24 - this.player.y) * scale;
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(sx, sy, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw enemies
            ctx.fillStyle = '#ef4444';
            this.enemies.forEach(e => {
                const ex = (e.x - this.player.x) * scale;
                const ey = (e.y - this.player.y) * scale;
                ctx.beginPath();
                ctx.arc(ex, ey, e.isBoss ? 6 : 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw player arrow in center
            ctx.restore();
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-this.player.yaw + Math.PI / 2);

            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(5, 5);
            ctx.lineTo(0, 2);
            ctx.lineTo(-5, 5);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        updateHUD() {
            if (!this.player) return;

            document.getElementById('hudHpBar').style.width = `${Math.max(0, (this.player.hp / this.player.maxHp) * 100)}%`;
            document.getElementById('hudHpText').textContent = `${Math.round(this.player.hp)}/${this.player.maxHp}`;

            document.getElementById('hudStaminaBar').style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;
            document.getElementById('hudStaminaText').textContent = `${Math.round(this.player.stamina)}/${this.player.maxStamina}`;

            document.getElementById('hudXpBar').style.width = `${Math.min(100, (this.player.xp / this.player.xpNext) * 100)}%`;
            document.getElementById('hudXpText').textContent = `${this.player.xp}/${this.player.xpNext}`;
            document.getElementById('hudLevelBadge').textContent = `LV ${this.player.level}`;

            document.getElementById('hudPotionCount').textContent = this.player.potions;
            const mobPot = document.getElementById('mobilePotionCount');
            if (mobPot) mobPot.textContent = this.player.potions;

            const resBar = document.getElementById('hudResourceBar');
            const resLabel = document.getElementById('hudResourceLabel');
            const resText = document.getElementById('hudResourceText');

            if (this.player.race === Race.ELF) {
                resLabel.textContent = '🔮 Mana';
                resBar.style.width = `${(this.player.mana / this.player.maxMana) * 100}%`;
                resText.textContent = `${Math.round(this.player.mana)}/100`;
            } else if (this.player.race === Race.ORC) {
                resLabel.textContent = '🔥 Rage';
                resBar.style.width = `${this.player.rage}%`;
                resText.textContent = `${Math.round(this.player.rage)}/100`;
            } else if (this.player.race === Race.HUMAN) {
                resLabel.textContent = '🛡️ Shield';
                resBar.style.width = `${(this.player.shieldBubble / 25) * 100}%`;
                resText.textContent = `${Math.round(this.player.shieldBubble)}/25`;
            } else {
                resLabel.textContent = '💎 Stone';
                resBar.style.width = this.player.stoneForm ? '100%' : '0%';
                resText.textContent = this.player.stoneForm ? 'IMMUNE' : 'READY';
            }

            document.getElementById('hudGoldText').textContent = this.gold;
            document.getElementById('hudUusdText').textContent = this.uusd;
            document.getElementById('hudFloorText').textContent = `Layer ${this.floorIndex}`;
        }

        render() {
            this.renderer.render(this.scene, this.camera3d);
        }

        togglePause() {
            if (this.isPaused) {
                document.getElementById('pauseScreen').classList.add('hidden');
                this.container.classList.remove('paused');
                this.isPaused = false;
                this.container.requestPointerLock();
            } else {
                this.isPaused = true;
                this.container.classList.add('paused');
                document.getElementById('pauseScreen').classList.remove('hidden');
                document.exitPointerLock();
            }
        }

        gameOver(victory = false) {
            this.isPaused = true;
            document.getElementById('gameMain').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.remove('hidden');

            document.getElementById('gameOverTitle').textContent = victory ? 'RUN COMPLETED' : 'RUN TERMINATED';
            document.getElementById('gameOverSub').textContent = victory ? 'Extraction beacon established' : 'Vitals flatlined';

            document.getElementById('goRaceClass').textContent = `${this.player.race.toUpperCase()} ${this.player.classType.toUpperCase()}`;
            document.getElementById('goFloor').textContent = `Layer ${this.floorIndex}`;
            document.getElementById('goGold').textContent = this.gold;
            document.getElementById('goXp').textContent = this.player.xp;

            this.audio.speak(victory ? 'Run Completed. Returning to Starship.' : 'Game Over. Run Terminated.');
            this.audio.stopAmbientMusic();
            this.clearDungeon();
            this.saveSave();
        }

        // =========================================================================
        // 16. UI SETUP & LUCKYSTARSHIP HUB INTEGRATION
        // =========================================================================
        setupUI() {
            // Main menu buttons
            document.getElementById('btnPlay').addEventListener('click', () => {
                document.getElementById('mainMenuScreen').classList.add('hidden');
                document.getElementById('charSelectScreen').classList.remove('hidden');
                this.renderCharSelect();
            });

            document.getElementById('btnEnterHub').addEventListener('click', () => {
                document.getElementById('mainMenuScreen').classList.add('hidden');
                document.getElementById('hubScreen').classList.remove('hidden');
                this.renderBotany();
                this.renderArmory();
                this.generateRepairMiniGame();
            });

            document.getElementById('btnOpenSettings').addEventListener('click', () => {
                document.getElementById('settingsScreen').classList.remove('hidden');
            });

            document.getElementById('btnSaveSettings').addEventListener('click', () => {
                this.audio.masterVolume = document.getElementById('settingsMasterVol').value / 100;
                this.input.lookSensitivity = (parseFloat(document.getElementById('settingsMouseSens').value) || 3.5) * 0.00065;
                this.input.invertY = document.getElementById('settingsInvertY').checked;

                const touchMode = document.getElementById('settingsTouchMode').value;
                if (touchMode === 'always') {
                    document.body.classList.add('touch-enabled');
                } else if (touchMode === 'never') {
                    document.body.classList.remove('touch-enabled');
                } else {
                    if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) {
                        document.body.classList.add('touch-enabled');
                    } else {
                        document.body.classList.remove('touch-enabled');
                    }
                }

                document.getElementById('settingsScreen').classList.add('hidden');
            });

            document.getElementById('btnCharSelectBack').addEventListener('click', () => {
                document.getElementById('charSelectScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
            });

            document.getElementById('btnCharSelectStart').addEventListener('click', () => {
                const selRace = document.querySelector('.char-card.selected')?.dataset.race || 'human';
                const selClass = document.querySelector('.class-btn.selected')?.dataset.class || 'warrior';
                const selMode = document.querySelector('.char-mode-card.selected')?.dataset.mode || this.controlMode || 'realtime';
                this.setControlMode(selMode);
                document.getElementById('charSelectScreen').classList.add('hidden');
                document.getElementById('gameMain').classList.remove('hidden');
                this.initRun(selRace, selClass);
            });

            // Control Mode Buttons
            document.querySelectorAll('.btn-mode').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    this.setControlMode(mode);
                });
            });

            // Variable Speed Buttons
            document.querySelectorAll('.btn-speed').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const speed = e.currentTarget.dataset.speed;
                    this.setGameSpeed(speed);
                });
            });

            // Turn-Based Wait Button
            const waitBtn = document.getElementById('btnWaitTurn');
            if (waitBtn) {
                waitBtn.addEventListener('click', () => {
                    this.executeTurnAction('wait');
                });
            }

            // Character Select Mode Cards
            document.querySelectorAll('.char-mode-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    this.setControlMode(mode);
                });
            });

            document.getElementById('btnLeaveHub').addEventListener('click', () => {
                document.getElementById('hubScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                this.saveSave();
            });

            // Hub Navigation Tabs
            const tabBtns = document.querySelectorAll('.hub-tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    tabBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');

                    const targetTab = e.target.dataset.tab;
                    document.querySelectorAll('.hub-pane').forEach(p => p.classList.remove('active'));
                    const activePane = document.getElementById(`tab-${targetTab}`);
                    if (activePane) activePane.classList.add('active');

                    if (targetTab === 'exchange') {
                        document.getElementById('exchangeGoldBalance').textContent = `${this.gold} Gold`;
                        document.getElementById('exchangeUusdBalance').textContent = `${this.uusd} $UUSD`;
                    } else if (targetTab === 'lore') {
                        this.renderLoreList();
                    } else if (targetTab === 'armory') {
                        this.renderArmory();
                    }
                });
            });

            // Exchange Buttons
            document.getElementById('btnBuyUusd').addEventListener('click', () => {
                if (this.gold >= 10) {
                    this.gold -= 10;
                    this.uusd += 100;
                    this.audio.playSfx('loot');
                    document.getElementById('exchangeGoldBalance').textContent = `${this.gold} Gold`;
                    document.getElementById('exchangeUusdBalance').textContent = `${this.uusd} $UUSD`;
                }
            });

            document.getElementById('btnBuyGold').addEventListener('click', () => {
                if (this.uusd >= 100) {
                    this.uusd -= 100;
                    this.gold += 10;
                    this.audio.playSfx('loot');
                    document.getElementById('exchangeGoldBalance').textContent = `${this.gold} Gold`;
                    document.getElementById('exchangeUusdBalance').textContent = `${this.uusd} $UUSD`;
                }
            });

            // Quarters Upgrade
            document.getElementById('btnUpgradeQuarters').addEventListener('click', () => {
                if (this.quartersLevel < 6) {
                    const cost = QuartersUpgrades[this.quartersLevel - 1].cost;
                    if (this.uusd >= cost) {
                        this.uusd -= cost;
                        this.quartersLevel++;
                        this.audio.playSfx('levelup');
                        this.updateHubQuartersUI();
                    }
                }
            });

            // Potion Drink Buttons
            const potBtn = document.getElementById('btnUsePotion');
            if (potBtn) potBtn.addEventListener('click', () => this.usePotion());

            // Pause & Return Buttons
            document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
            document.getElementById('btnResume').addEventListener('click', () => this.togglePause());
            document.getElementById('btnAbandon').addEventListener('click', () => {
                this.isPaused = false;
                this.clearDungeon();
                this.audio.stopAmbientMusic();
                document.getElementById('pauseScreen').classList.add('hidden');
                document.getElementById('gameMain').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                document.exitPointerLock();
                this.saveSave();
            });

            document.getElementById('btnReturnToHub').addEventListener('click', () => {
                this.isPaused = false;
                this.clearDungeon();
                this.audio.stopAmbientMusic();
                document.getElementById('gameMain').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                document.exitPointerLock();
                this.saveSave();
            });

            document.getElementById('btnGoToMenu').addEventListener('click', () => {
                document.getElementById('gameOverScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
            });
        }

        renderCharSelect() {
            const raceGrid = document.getElementById('raceGrid');
            raceGrid.innerHTML = Object.keys(RaceData).map((key, i) => {
                const race = RaceData[key];
                return `
                    <div class="char-card ${i === 0 ? 'selected' : ''}" data-race="${key}">
                        <span class="char-emoji">${race.emoji}</span>
                        <div class="char-name">${race.name}</div>
                        <div class="char-desc">${race.desc}</div>
                    </div>
                `;
            }).join('');

            raceGrid.querySelectorAll('.char-card').forEach(card => {
                card.addEventListener('click', () => {
                    raceGrid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                });
            });

            const classGrid = document.getElementById('classGrid');
            classGrid.innerHTML = Object.values(ClassType).map((cls, i) => {
                const c = ClassData[cls];
                return `<button class="class-btn ${i === 0 ? 'selected' : ''}" data-class="${cls}">${c.title.toUpperCase()}</button>`;
            }).join('');

            classGrid.querySelectorAll('.class-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    classGrid.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
            });
        }

        updateHubQuartersUI() {
            document.getElementById('hubQuartersLevel').textContent = `Level ${this.quartersLevel}`;
            const upgrade = QuartersUpgrades[this.quartersLevel - 1];
            document.getElementById('hubQuartersSize').textContent = upgrade.size;
            document.getElementById('hubQuartersCapacity').textContent = `${upgrade.capacity} Space`;

            if (this.quartersLevel < 6) {
                const nextUpgrade = QuartersUpgrades[this.quartersLevel];
                document.getElementById('hubQuartersCost').textContent = `${nextUpgrade.cost} $UUSD`;
            } else {
                document.getElementById('hubQuartersCost').textContent = 'MAX LEVEL REACHED';
            }
        }

        renderArmory() {
            const grid = document.getElementById('armoryGrid');
            if (!grid) return;

            grid.innerHTML = ArmoryUpgrades.map(u => {
                const rank = this.armoryRanks[u.id] || 0;
                const cost = Math.round(u.baseCost * Math.pow(u.mult, rank));
                const isMax = rank >= u.maxRank;

                return `
                    <div class="armory-card">
                        <div class="armory-header">
                            <span class="armory-icon">${u.icon}</span>
                            <div>
                                <div class="armory-title">${u.name}</div>
                                <div class="armory-level">Rank ${rank} / ${u.maxRank}</div>
                            </div>
                        </div>
                        <div class="armory-desc">${u.desc}</div>
                        <div class="armory-footer">
                            <span class="highlight-cyan" style="font-size:0.85rem;">${isMax ? 'MAX RANK' : `${cost} $UUSD`}</span>
                            ${isMax ? '' : `<button class="btn-game btn-primary" style="font-size:0.75rem; padding:6px 12px;" onclick="window.GraveGainGame.buyArmoryUpgrade('${u.id}')">Upgrade</button>`}
                        </div>
                    </div>
                `;
            }).join('');
        }

        buyArmoryUpgrade(upgradeId) {
            const u = ArmoryUpgrades.find(item => item.id === upgradeId);
            if (!u) return;

            const rank = this.armoryRanks[u.id] || 0;
            if (rank >= u.maxRank) return;

            const cost = Math.round(u.baseCost * Math.pow(u.mult, rank));
            if (this.uusd >= cost) {
                this.uusd -= cost;
                this.armoryRanks[u.id] = rank + 1;
                this.audio.playSfx('levelup');
                this.renderArmory();
                this.saveSave();
            }
        }

        renderBotany() {
            const grid = document.getElementById('botanyGrid');
            if (!grid) return;
            const now = Math.floor(Date.now() / 1000);

            grid.innerHTML = this.botanyCrops.map((crop, index) => {
                if (!crop.seedId) {
                    return `
                        <div class="plant-slot">
                            <strong>[Empty Hydroponic Slot]</strong>
                            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                                ${BotanySeeds.map(s => `
                                    <button class="btn-game" style="font-size:0.75rem; padding:5px 10px;" onclick="window.GraveGainGame.plantSeed(${index}, '${s.id}')">
                                        Plant ${s.emoji} ${s.name} (25 $UUSD)
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    const seed = BotanySeeds.find(s => s.id === crop.seedId);
                    const elapsed = now - crop.startTime;
                    const percent = Math.min(100, Math.floor((elapsed / crop.growthTime) * 100));
                    const isReady = percent >= 100;

                    return `
                        <div class="plant-slot">
                            <div class="plant-info">
                                <span>${seed.emoji} ${seed.name}</span>
                                <strong>${percent}%</strong>
                            </div>
                            <div class="plant-progress-bg">
                                <div class="plant-progress-fill" style="width: ${percent}%;"></div>
                            </div>
                            ${isReady ? `
                                <button class="btn-game btn-primary" style="font-size:0.8rem; padding:6px 12px; margin-top:5px;" onclick="window.GraveGainGame.harvestCrop(${index})">
                                    🌾 Harvest (+${seed.yield * seed.value} $UUSD)
                                </button>
                            ` : `
                                <span style="font-size:0.75rem; color:var(--grave-text-muted);">Matures in ${Math.max(0, crop.growthTime - elapsed)}s</span>
                            `}
                        </div>
                    `;
                }
            }).join('');
        }

        plantSeed(slotIndex, seedId) {
            const seed = BotanySeeds.find(s => s.id === seedId);
            if (this.uusd >= 25) {
                this.uusd -= 25;
                this.botanyCrops[slotIndex] = {
                    seedId: seed.id,
                    startTime: Math.floor(Date.now() / 1000),
                    growthTime: seed.time
                };
                this.audio.playSfx('loot');
                this.renderBotany();
                this.saveSave();
            }
        }

        harvestCrop(slotIndex) {
            const crop = this.botanyCrops[slotIndex];
            const seed = BotanySeeds.find(s => s.id === crop.seedId);
            this.uusd += seed.yield * seed.value;
            this.botanyCrops[slotIndex] = { seedId: null, startTime: 0, growthTime: 0 };
            this.audio.playSfx('loot');
            this.renderBotany();
            this.saveSave();
        }

        generateRepairMiniGame() {
            const area = document.getElementById('repairCircuitArea');
            if (!area) return;
            area.innerHTML = '';
            document.getElementById('repairStatus').textContent = 'Status: Ready for calibration';

            const termX = 240;
            const termY = 90;

            const target = document.createElement('div');
            target.className = 'circuit-node terminal';
            target.style.left = `${termX}px`;
            target.style.top = `${termY}px`;
            target.textContent = '🎯';
            area.appendChild(target);

            const comp = document.createElement('div');
            comp.className = 'circuit-node component';
            comp.style.left = '40px';
            comp.style.top = '90px';
            comp.textContent = '💠';
            area.appendChild(comp);

            let isDragging = false;
            const startDrag = () => { isDragging = true; };
            const moveDrag = (e) => {
                if (!isDragging) return;
                const rect = area.getBoundingClientRect();
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                let px = Math.max(16, Math.min(rect.width - 16, clientX - rect.left));
                let py = Math.max(16, Math.min(rect.height - 16, clientY - rect.top));

                comp.style.left = `${px}px`;
                comp.style.top = `${py}px`;

                if (Math.hypot(px - termX, py - termY) < 22) {
                    isDragging = false;
                    comp.style.left = `${termX}px`;
                    comp.style.top = `${termY}px`;
                    document.getElementById('repairStatus').textContent = 'Status: Circuit calibrated! +50 $UUSD awarded!';
                    this.uusd += 50;
                    this.audio.playSfx('block');
                    this.saveSave();
                }
            };
            const stopDrag = () => { isDragging = false; };

            comp.addEventListener('mousedown', startDrag);
            window.addEventListener('mousemove', moveDrag);
            window.addEventListener('mouseup', stopDrag);

            comp.addEventListener('touchstart', startDrag, { passive: true });
            window.addEventListener('touchmove', moveDrag, { passive: true });
            window.addEventListener('touchend', stopDrag);
        }

        renderLoreList() {
            const listEl = document.getElementById('loreList');
            if (!listEl || !window.GraveGainLore) return;

            const allLore = window.GraveGainLore.getAll();
            listEl.innerHTML = Object.keys(allLore).map(key => {
                const item = allLore[key];
                return `<button class="class-btn" style="text-align: left; padding: 8px; font-size: 0.8rem; width: 100%;" onclick="window.GraveGainGame.viewLoreEntry('${item.id}')">${item.title}</button>`;
            }).join('');

            const speakBtn = document.getElementById('btnSpeakLore');
            if (speakBtn && !speakBtn.dataset.bound) {
                speakBtn.dataset.bound = 'true';
                speakBtn.addEventListener('click', () => {
                    const currentId = speakBtn.dataset.currentId;
                    if (currentId) {
                        const item = window.GraveGainLore.get(currentId);
                        if (item) this.audio.speak(item.content);
                    }
                });
            }
        }

        viewLoreEntry(id) {
            const item = window.GraveGainLore ? window.GraveGainLore.get(id) : null;
            if (!item) return;

            document.getElementById('loreTitle').textContent = item.title;
            document.getElementById('loreCategory').textContent = `Category: ${item.category.replace('_', ' ')}`;
            document.getElementById('loreContent').textContent = item.content;

            const speakBtn = document.getElementById('btnSpeakLore');
            if (speakBtn) {
                speakBtn.style.display = 'block';
                speakBtn.dataset.currentId = id;
            }
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.GraveGainGame = new GraveGainGame();
    });

    window.gameDebug = {
        name: "GraveGain3D (Complete FPS Edition)",
        getScore: () => window.GraveGainGame ? window.GraveGainGame.gold : 0,
        setScore: (g) => { if (window.GraveGainGame) window.GraveGainGame.gold = g; },
        getHealth: () => window.GraveGainGame && window.GraveGainGame.player ? window.GraveGainGame.player.hp : 0,
        setHealth: (h) => { if (window.GraveGainGame && window.GraveGainGame.player) window.GraveGainGame.player.hp = h; },
        addXp: (x) => { if (window.GraveGainGame && window.GraveGainGame.player) window.GraveGainGame.player.addXp(x); },
        win: () => { if (window.GraveGainGame) window.GraveGainGame.gameOver(true); },
        lose: () => { if (window.GraveGainGame) window.GraveGainGame.gameOver(false); },
        godMode: false,
        toggleGodMode: function() {
            this.godMode = !this.godMode;
            return this.godMode;
        }
    };
})();
