// Demo Lichdom - Full Game Engine
// Pure HTML5 Canvas with Emoji Graphics

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, UPGRADE: 3, WIN: 4, LOSE: 5 };

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
        case 'cast':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        case 'summon':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'hit':
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'explosion':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'levelup':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(500, now + 0.1);
            osc.frequency.setValueAtTime(600, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'win':
            for (let i = 0; i < 3; i++) {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.type = 'sine';
                o.frequency.setValueAtTime(440 * Math.pow(1.5, i), now + i * 0.15);
                g.gain.setValueAtTime(0.12, now + i * 0.15);
                g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
                o.start(now + i * 0.15);
                o.stop(now + i * 0.15 + 0.3);
            }
            break;
    }
}

class Game {
    constructor() {
        this.state = STATE.MENU;
        this.lastTime = 0;
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.player = {
            x: 400, y: 400,
            vx: 0, vy: 0,
            speed: 3,
            hp: 100, maxHp: 100,
            mana: 100, maxMana: 100,
            manaRegen: 0.12,
            xp: 0, maxXp: 100,
            level: 1,
            summonCooldown: 0,
            maxSkeletons: 3
        };
        this.skeletons = [];
        this.projectiles = [];
        this.particles = [];
        this.buildings = [];
        this.enemies = [];
        this.debris = [];
        this.phase = 1;
        this.score = 0;
        this.buildingsDestroyed = 0;
        this.shake = 0;
        this.upgrades = [
            { id: 'mana', name: 'Mana Mastery', emoji: '💧', desc: '+30 Mana, +50% Regen' },
            { id: 'army', name: 'Lich Lord', emoji: '💀', desc: '+2 Skeletons, +5 HP each' },
            { id: 'spell', name: 'Void Bolt', emoji: '⚡', desc: '+15 Spell Damage, Piercing' },
            { id: 'speed', name: 'Spectral Dash', emoji: '👻', desc: '+30% Speed, Blink (Space)' },
            { id: 'armor', name: 'Death Ward', emoji: '🛡️', desc: '+25 HP, HP Regen' }
        ];
        this.blinkCooldown = 0;
        this.setupBuildings();
        this.setupInput();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    setupBuildings() {
        this.buildings = [{
            x: 400, y: 150,
            hp: 300, maxHp: 300,
            type: 'church',
            emoji: '⛪',
            active: true,
            phase: 1,
            attackCooldown: 0
        }];
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === ' ' && this.player.hasBlink && this.blinkCooldown <= 0) this.blink();
            if (e.key.toLowerCase() === 's' && this.state === STATE.PLAYING) this.summonSkeleton();
            if (e.key.toLowerCase() === 'p') this.togglePause();
        });
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        canvas.addEventListener('mousedown', () => {
            this.mouse.down = true;
            if (this.state === STATE.PLAYING) this.castSpell();
        });
        canvas.addEventListener('mouseup', () => this.mouse.down = false);
    }

    blink() {
        const angle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);
        this.player.x += Math.cos(angle) * 100;
        this.player.y += Math.sin(angle) * 100;
        this.player.x = Math.max(30, Math.min(770, this.player.x));
        this.player.y = Math.max(30, Math.min(470, this.player.y));
        this.blinkCooldown = 180;
        this.spawnParticles(this.player.x, this.player.y, '👻', 5);
    }

    start() {
        initAudio();
        this.state = STATE.PLAYING;
        document.getElementById('mainMenu').classList.add('hidden');
    }

    resume() {
        this.state = STATE.PLAYING;
        document.getElementById('pauseMenu').classList.add('hidden');
    }

    pause() {
        this.state = STATE.PAUSED;
        document.getElementById('pauseMenu').classList.remove('hidden');
    }

    togglePause() {
        if (this.state === STATE.PLAYING) this.pause();
        else if (this.state === STATE.PAUSED) this.resume();
    }

    restart() {
        this.player = {
            x: 400, y: 400,
            vx: 0, vy: 0,
            speed: 3,
            hp: 100, maxHp: 100,
            mana: 100, maxMana: 100,
            manaRegen: 0.12,
            xp: 0, maxXp: 100,
            level: 1,
            summonCooldown: 0,
            maxSkeletons: 3
        };
        this.skeletons = [];
        this.projectiles = [];
        this.particles = [];
        this.enemies = [];
        this.debris = [];
        this.phase = 1;
        this.score = 0;
        this.buildingsDestroyed = 0;
        this.setupBuildings();
        this.state = STATE.PLAYING;
        document.getElementById('pauseMenu').classList.add('hidden');
        document.getElementById('winScreen').classList.add('hidden');
        document.getElementById('loseScreen').classList.add('hidden');
        document.getElementById('upgradeMenu').classList.add('hidden');
    }

    toMenu() {
        this.state = STATE.MENU;
        document.getElementById('pauseMenu').classList.add('hidden');
        document.getElementById('loseScreen').classList.add('hidden');
        document.getElementById('winScreen').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
    }

    showHowToPlay() {
        alert('HOW TO PLAY:\n\n' +
            '🧙‍♂️ You are a Necromancer demolition contractor\n' +
            '🏰 Destroy 3 buildings to win\n\n' +
            'CONTROLS:\n' +
            'WASD / Arrows - Move\n' +
            'Click - Cast skull spell (10 mana)\n' +
            'S - Summon skeleton (25 mana)\n' +
            'P - Pause\n\n' +
            'Your skeletons attack buildings automatically!\n' +
            'Watch out for falling debris in later phases!');
    }

    castSpell() {
        if (this.player.mana < 10) return;
        this.player.mana -= 10;
        const angle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);
        this.projectiles.push({
            x: this.player.x, y: this.player.y,
            vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
            damage: 15 + (this.player.voidBolt ? 15 : 0),
            piercing: this.player.voidBolt || false,
            life: 60, emoji: '💀'
        });
        this.spawnParticles(this.player.x, this.player.y, '✨', 3);
        playSound('cast');
    }

    summonSkeleton() {
        if (this.player.mana < 25 || this.skeletons.length >= this.player.maxSkeletons || this.player.summonCooldown > 0) return;
        this.player.mana -= 25;
        this.player.summonCooldown = 180;
        this.skeletons.push({
            x: this.player.x + (Math.random() - 0.5) * 40,
            y: this.player.y + (Math.random() - 0.5) * 40 + 20,
            hp: 30 + (this.player.armyBonus || 0),
            maxHp: 30 + (this.player.armyBonus || 0),
            attackCooldown: 0,
            target: null
        });
        this.spawnParticles(this.player.x, this.player.y, '🦴', 5);
        playSound('summon');
    }

    spawnParticles(x, y, emoji, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * (2 + Math.random() * 2),
                vy: Math.sin(angle) * (2 + Math.random() * 2),
                life: 30 + Math.random() * 20,
                emoji: emoji,
                scale: 0.8 + Math.random() * 0.4
            });
        }
    }

    spawnDebris() {
        const building = this.buildings.find(b => b.active);
        if (!building) return;
        this.debris.push({
            x: building.x + (Math.random() - 0.5) * 60,
            y: building.y,
            vx: (this.player.x - building.x) * 0.008 + (Math.random() - 0.5) * 2,
            vy: -4 - Math.random() * 3,
            damage: 10,
            emoji: '🧱'
        });
    }

    checkLevelUp() {
        if (this.player.xp >= this.player.maxXp) {
            this.player.xp -= this.player.maxXp;
            this.player.level++;
            this.player.maxXp = Math.floor(this.player.maxXp * 1.25);
            playSound('levelup');
            this.showUpgradeMenu();
        }
    }

    showUpgradeMenu() {
        this.state = STATE.UPGRADE;
        const options = [];
        const available = [...this.upgrades];
        for (let i = 0; i < 3 && available.length > 0; i++) {
            const idx = Math.floor(Math.random() * available.length);
            options.push(available.splice(idx, 1)[0]);
        }
        const container = document.getElementById('upgradeOptions');
        container.innerHTML = '';
        options.forEach(upg => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `<span class="emoji">${upg.emoji}</span><h3>${upg.name}</h3><p>${upg.desc}</p>`;
            card.onclick = () => this.applyUpgrade(upg.id);
            container.appendChild(card);
        });
        document.getElementById('upgradeMenu').classList.remove('hidden');
    }

    applyUpgrade(id) {
        switch(id) {
            case 'mana':
                this.player.maxMana += 30;
                this.player.manaRegen *= 1.5;
                this.player.mana = this.player.maxMana;
                break;
            case 'army':
                this.player.maxSkeletons += 2;
                this.player.armyBonus = (this.player.armyBonus || 0) + 5;
                break;
            case 'spell':
                this.player.voidBolt = true;
                break;
            case 'speed':
                this.player.speed *= 1.3;
                this.player.hasBlink = true;
                break;
            case 'armor':
                this.player.maxHp += 25;
                this.player.hpRegen = (this.player.hpRegen || 0) + 0.1;
                this.player.hp = this.player.maxHp;
                break;
        }
        document.getElementById('upgradeMenu').classList.add('hidden');
        this.state = STATE.PLAYING;
    }

    showPhaseText(text) {
        const el = document.getElementById('phaseIndicator');
        el.textContent = text;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2500);
    }

    advancePhase() {
        this.buildingsDestroyed++;
        this.score += 1000 * this.phase;
        this.shake = 20;
        playSound('explosion');
        if (this.phase === 1) {
            this.phase = 2;
            this.showPhaseText('PHASE 2');
            this.buildings.push({
                x: 200, y: 120,
                hp: 500, maxHp: 500,
                type: 'factory',
                emoji: '🏭',
                active: true,
                phase: 2,
                attackCooldown: 0
            });
            this.buildings[0].active = false;
        } else if (this.phase === 2) {
            this.phase = 3;
            this.showPhaseText('PHASE 3 - BOSS!');
            this.buildings.push({
                x: 600, y: 100,
                hp: 1000, maxHp: 1000,
                type: 'skyscraper',
                emoji: '🏙️',
                active: true,
                phase: 3,
                attackCooldown: 0,
                guards: true
            });
            this.buildings[1].active = false;
            this.spawnGuards();
        } else {
            this.win();
        }
    }

    spawnGuards() {
        const building = this.buildings[2];
        for (let i = 0; i < 3; i++) {
            this.enemies.push({
                x: building.x + (Math.random() - 0.5) * 100,
                y: building.y + 50 + Math.random() * 50,
                hp: 50,
                maxHp: 50,
                vx: (Math.random() - 0.5) * 2,
                vy: 0,
                attackCooldown: 0,
                emoji: '👮'
            });
        }
    }

    win() {
        this.state = STATE.WIN;
        playSound('win');
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.player.level;
        document.getElementById('winScreen').classList.remove('hidden');
    }

    lose() {
        this.state = STATE.LOSE;
        document.getElementById('deathScore').textContent = this.score;
        document.getElementById('buildingsDestroyed').textContent = this.buildingsDestroyed;
        document.getElementById('loseScreen').classList.remove('hidden');
    }

    update() {
        if (this.state !== STATE.PLAYING) return;

        if (this.shake > 0) this.shake *= 0.9;
        if (this.shake < 0.5) this.shake = 0;

        if (this.player.summonCooldown > 0) this.player.summonCooldown--;
        if (this.blinkCooldown > 0) this.blinkCooldown--;

        if (this.player.mana < this.player.maxMana) {
            this.player.mana = Math.min(this.player.maxMana, this.player.mana + this.player.manaRegen);
        }
        if (this.player.hpRegen && this.player.hp < this.player.maxHp) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.hpRegen);
        }

        if (this.keys['w'] || this.keys['arrowup']) this.player.vy = -this.player.speed;
        else if (this.keys['s'] || this.keys['arrowdown']) this.player.vy = this.player.speed;
        else this.player.vy *= 0.85;

        if (this.keys['a'] || this.keys['arrowleft']) this.player.vx = -this.player.speed;
        else if (this.keys['d'] || this.keys['arrowright']) this.player.vx = this.player.speed;
        else this.player.vx *= 0.85;

        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        this.player.x = Math.max(25, Math.min(775, this.player.x));
        this.player.y = Math.max(25, Math.min(475, this.player.y));

        this.projectiles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0 || p.x < 0 || p.x > 800 || p.y < 0 || p.y > 500) {
                this.projectiles.splice(i, 1);
            }
        });

        this.skeletons.forEach((skel, si) => {
            const building = this.buildings.find(b => b.active);
            if (building) {
                const dx = building.x - skel.x;
                const dy = building.y - skel.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 50) {
                    skel.x += (dx / dist) * 1.5;
                    skel.y += (dy / dist) * 1.5;
                } else if (skel.attackCooldown <= 0) {
                    building.hp -= 8;
                    skel.attackCooldown = 45;
                    this.spawnParticles(building.x, building.y, '💥', 3);
                    playSound('hit');
                    this.player.xp += 2;
                    this.score += 10;
                }
            }
            if (skel.attackCooldown > 0) skel.attackCooldown--;
        });

        this.enemies.forEach((enemy, ei) => {
            const nearestSkel = this.skeletons.length > 0 ? 
                this.skeletons.reduce((closest, skel) => {
                    const d1 = Math.hypot(skel.x - enemy.x, skel.y - enemy.y);
                    const d2 = Math.hypot(closest.x - enemy.x, closest.y - enemy.y);
                    return d1 < d2 ? skel : closest;
                }) : null;

            if (nearestSkel) {
                const dx = nearestSkel.x - enemy.x;
                const dy = nearestSkel.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 30) {
                    enemy.x += (dx / dist) * 1;
                    enemy.y += (dy / dist) * 1;
                } else if (enemy.attackCooldown <= 0) {
                    nearestSkel.hp -= 10;
                    enemy.attackCooldown = 60;
                    if (nearestSkel.hp <= 0) {
                        this.spawnParticles(nearestSkel.x, nearestSkel.y, '🦴', 8);
                        this.skeletons = this.skeletons.filter(s => s !== nearestSkel);
                    }
                }
            }
            enemy.x += enemy.vx;
            if (enemy.x < 50 || enemy.x > 750) enemy.vx *= -1;
            if (enemy.attackCooldown > 0) enemy.attackCooldown--;
        });

        this.enemies = this.enemies.filter(e => e.hp > 0);

        this.debris.forEach((d, di) => {
            d.x += d.vx;
            d.y += d.vy;
            d.vy += 0.3;
            const dist = Math.hypot(d.x - this.player.x, d.y - this.player.y);
            if (dist < 25) {
                this.player.hp -= d.damage;
                this.shake = 10;
                this.debris.splice(di, 1);
            } else if (d.y > 520) {
                this.debris.splice(di, 1);
            }
        });

        this.buildings.forEach(b => {
            if (!b.active) return;
            if (b.phase >= 2 && b.attackCooldown-- <= 0) {
                this.spawnDebris();
                b.attackCooldown = b.phase === 3 ? 60 : 120;
            }
            if (b.hp <= 0) {
                this.spawnParticles(b.x, b.y, '🔥', 15);
                this.spawnParticles(b.x, b.y, '🧱', 10);
                b.active = false;
                this.advancePhase();
            }
        });

        this.skeletons = this.skeletons.filter(s => s.hp > 0);

        this.projectiles.forEach((p, pi) => {
            this.buildings.forEach(b => {
                if (!b.active) return;
                const dist = Math.hypot(p.x - b.x, p.y - (b.y + 30));
                if (dist < 60) {
                    b.hp -= p.damage;
                    this.player.xp += 3;
                    this.score += 15;
                    this.spawnParticles(p.x, p.y, '💥', 4);
                    playSound('hit');
                    if (!p.piercing) this.projectiles.splice(pi, 1);
                }
            });
        });

        this.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vx *= 0.95;
            p.vy *= 0.95;
            if (p.life <= 0) this.particles.splice(i, 1);
        });

        if (this.player.hp <= 0) this.lose();
        this.checkLevelUp();
        this.updateUI();
    }

    updateUI() {
        document.getElementById('hpBar').style.width = (this.player.hp / this.player.maxHp * 100) + '%';
        document.getElementById('manaBar').style.width = (this.player.mana / this.player.maxMana * 100) + '%';
        document.getElementById('xpBar').style.width = (this.player.xp / this.player.maxXp * 100) + '%';
        document.getElementById('levelDisplay').textContent = this.player.level;
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('phaseDisplay').textContent = this.phase;
        document.getElementById('skeletonCount').textContent = this.skeletons.length + '/' + this.player.maxSkeletons;
    }

    draw() {
        ctx.save();
        if (this.shake > 0) {
            ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
        }

        ctx.clearRect(0, 0, 800, 500);

        const skyGrad = ctx.createLinearGradient(0, 0, 0, 500);
        skyGrad.addColorStop(0, '#0f0f23');
        skyGrad.addColorStop(0.5, '#1a1a3e');
        skyGrad.addColorStop(1, '#2a2a4e');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, 800, 500);

        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.ellipse(100, 80, 40, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '60px Arial';
        ctx.fillText('🌕', 70, 100);

        for (let i = 0; i < 20; i++) {
            const x = (i * 137) % 800;
            const y = (i * 73) % 200 + 20;
            const alpha = 0.3 + Math.sin(Date.now() * 0.001 + i) * 0.2;
            ctx.globalAlpha = alpha;
            ctx.font = '12px Arial';
            ctx.fillText('✨', x, y);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 420, 800, 80);

        this.buildings.forEach(b => {
            if (!b.active) return;
            ctx.font = '80px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let healthPct = b.hp / b.maxHp;
            let emoji = b.emoji;
            if (healthPct < 0.7) emoji = '💢';
            if (healthPct < 0.3) emoji = '🔥';
            
            ctx.fillText(emoji, b.x, b.y);
            
            if (b.guards) {
                ctx.font = '20px Arial';
                ctx.fillText('👮', b.x - 40, b.y + 50);
                ctx.fillText('👮', b.x + 40, b.y + 50);
                ctx.fillText('👮', b.x, b.y + 60);
            }

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(b.x - 40, b.y - 70, 80, 8);
            const hpColor = healthPct > 0.5 ? '#10b981' : healthPct > 0.25 ? '#f59e0b' : '#ef4444';
            ctx.fillStyle = hpColor;
            ctx.fillRect(b.x - 38, b.y - 68, 76 * healthPct, 4);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(Math.floor(b.hp), b.x, b.y - 80);
        });

        this.skeletons.forEach(s => {
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('💀', s.x, s.y);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(s.x - 15, s.y - 25, 30, 4);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(s.x - 14, s.y - 24, 28 * (s.hp / s.maxHp), 2);
        });

        this.enemies.forEach(e => {
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(e.emoji, e.x, e.y);
        });

        this.projectiles.forEach(p => {
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.emoji, p.x, p.y);
        });

        this.debris.forEach(d => {
            ctx.font = '22px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(d.emoji, d.x, d.y);
        });

        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🧙‍♂️', this.player.x, this.player.y);

        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life / 30;
            ctx.font = (20 * p.scale) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.emoji, p.x, p.y);
            ctx.restore();
        });

        ctx.restore();
    }

    loop(timestamp) {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}

const game = new Game();
