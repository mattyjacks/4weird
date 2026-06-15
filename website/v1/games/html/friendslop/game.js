// FriendSlop - A viral indieslop arcade game
// Feed your friends slop and build your vibe meter!

const canvas = document.getElementById('friendslop-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas setup
canvas.width = 800;
canvas.height = 600;

// Game states
const GAME_STATE = {
    START: 'start',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

// Game class
class FriendSlop {
    constructor() {
        this.state = GAME_STATE.START;
        this.score = 0;
        this.combo = 0;
        this.vibeMeter = 100;
        this.time = 0;
        this.wave = 1;
        this.highScore = parseInt(localStorage.getItem('friendslop-high-score')) || 0;
        this.dailySeed = this.getDailySeed();
        document.getElementById('friendslop-4weird-high-score').textContent = Math.floor(this.highScore);
        
        this.player = new Player(canvas.width / 2, canvas.height - 80);
        this.friends = [];
        this.slop = [];
        this.hazards = [];
        this.particles = [];
        this.projectiles = [];
        
        this.spawnFriends();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    getDailySeed() {
        const today = new Date();
        const dateStr = today.getFullYear() + '' + (today.getMonth() + 1) + '' + today.getDate();
        const seed = Math.abs(parseInt(dateStr)) % 10000;
        document.getElementById('friendslop-4weird-daily-seed').textContent = `Seed: ${seed}`;
        return seed;
    }
    
    setupEventListeners() {
        document.getElementById('friendslop-4weird-start-btn').addEventListener('click', () => this.start());
        document.getElementById('friendslop-4weird-resume-btn').addEventListener('click', () => this.resume());
        document.getElementById('friendslop-4weird-restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('friendslop-4weird-play-again-btn').addEventListener('click', () => this.restart());
        document.getElementById('friendslop-4weird-share-btn').addEventListener('click', () => this.shareScore());
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        canvas.addEventListener('click', () => this.handleClick());
        canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    }
    
    handleKeyDown(e) {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            this.togglePause();
        }
        if (this.state === GAME_STATE.PLAYING) {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.player.moveLeft = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.player.moveRight = true;
            if (e.key === ' ') {
                e.preventDefault();
                this.player.throw();
            }
        }
    }
    
    handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.player.moveLeft = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.player.moveRight = false;
    }
    
    handleClick() {
        if (this.state === GAME_STATE.PLAYING) {
            this.player.throw();
        }
    }
    
    handleTouch(e) {
        if (this.state === GAME_STATE.PLAYING) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            
            if (x < canvas.width / 3) {
                this.player.moveLeft = true;
                this.player.moveRight = false;
            } else if (x > (canvas.width * 2) / 3) {
                this.player.moveRight = true;
                this.player.moveLeft = false;
            } else {
                this.player.throw();
            }
        }
    }
    
    handleTouchMove(e) {
        if (this.state === GAME_STATE.PLAYING) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            
            if (x < canvas.width / 3) {
                this.player.moveLeft = true;
                this.player.moveRight = false;
            } else if (x > (canvas.width * 2) / 3) {
                this.player.moveRight = true;
                this.player.moveLeft = false;
            }
        }
    }
    
    start() {
        this.state = GAME_STATE.PLAYING;
        document.getElementById('friendslop-4weird-start-screen').classList.add('hidden');
    }
    
    togglePause() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
            document.getElementById('friendslop-4weird-pause-screen').classList.remove('hidden');
        } else if (this.state === GAME_STATE.PAUSED) {
            this.resume();
        }
    }
    
    resume() {
        this.state = GAME_STATE.PLAYING;
        document.getElementById('friendslop-4weird-pause-screen').classList.add('hidden');
    }
    
    restart() {
        this.state = GAME_STATE.PLAYING;
        this.score = 0;
        this.combo = 0;
        this.vibeMeter = 100;
        this.time = 0;
        this.wave = 1;
        this.player = new Player(canvas.width / 2, canvas.height - 80);
        this.friends = [];
        this.slop = [];
        this.hazards = [];
        this.particles = [];
        this.projectiles = [];
        this.spawnFriends();
        document.getElementById('friendslop-4weird-game-over-screen').classList.add('hidden');
    }
    
    spawnFriends() {
        const friendEmojis = ['😂', '🤪', '🎉', '🔥', '💀'];
        const spacing = canvas.width / 6;
        for (let i = 0; i < 5; i++) {
            const x = spacing + i * spacing;
            const emoji = friendEmojis[i % friendEmojis.length];
            this.friends.push(new Friend(x, 80, emoji));
        }
    }
    
    spawnSlop() {
        if (Math.random() < 0.02 + this.wave * 0.005) {
            const x = Math.random() * canvas.width;
            const slopEmojis = ['🍝', '🍔', '🌮', '🍕', '🥗', '🍜', '🍱'];
            const emoji = slopEmojis[Math.floor(Math.random() * slopEmojis.length)];
            this.slop.push(new Slop(x, -30, emoji));
        }
    }
    
    spawnHazards() {
        if (Math.random() < 0.008 + this.wave * 0.002) {
            const x = Math.random() * canvas.width;
            const hazardEmojis = ['😬', '🤢', '💩', '🚫'];
            const emoji = hazardEmojis[Math.floor(Math.random() * hazardEmojis.length)];
            this.hazards.push(new Hazard(x, -30, emoji));
        }
    }
    
    update() {
        if (this.state !== GAME_STATE.PLAYING) return;
        
        this.time++;
        
        // Wave progression
        this.wave = Math.floor(this.time / 300) + 1;
        
        // Update player
        this.player.update();
        
        // Spawn entities
        this.spawnSlop();
        this.spawnHazards();
        
        // Update slop
        for (let i = this.slop.length - 1; i >= 0; i--) {
            this.slop[i].update();
            
            if (this.slop[i].y > canvas.height) {
                this.slop.splice(i, 1);
                this.vibeMeter -= 5;
                this.combo = 0;
                continue;
            }
            
            // Check collision with player
            if (this.player.collidesWith(this.slop[i])) {
                this.slop.splice(i, 1);
                this.score += 10 * (1 + this.combo * 0.1);
                this.combo++;
                this.vibeMeter = Math.min(100, this.vibeMeter + 2);
                this.createParticles(this.player.x, this.player.y, '✨');
                continue;
            }
            
            // Check collision with friends
            for (let friend of this.friends) {
                if (friend.collidesWith(this.slop[i])) {
                    this.slop.splice(i, 1);
                    this.score += 25 * (1 + this.combo * 0.15);
                    this.combo += 2;
                    this.vibeMeter = Math.min(100, this.vibeMeter + 5);
                    this.createParticles(friend.x, friend.y, '🎉');
                    friend.bounce();
                    break;
                }
            }
        }
        
        // Update hazards
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            this.hazards[i].update();
            
            if (this.hazards[i].y > canvas.height) {
                this.hazards.splice(i, 1);
                continue;
            }
            
            // Check collision with player
            if (this.player.collidesWith(this.hazards[i])) {
                this.hazards.splice(i, 1);
                this.vibeMeter -= 15;
                this.combo = 0;
                this.createParticles(this.player.x, this.player.y, '💥');
                this.screenShake();
                continue;
            }
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update();
            
            if (this.projectiles[i].y < 0 || this.projectiles[i].x < 0 || this.projectiles[i].x > canvas.width) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with friends
            for (let friend of this.friends) {
                if (friend.collidesWith(this.projectiles[i])) {
                    this.projectiles.splice(i, 1);
                    this.score += 50 * (1 + this.combo * 0.2);
                    this.combo += 3;
                    this.vibeMeter = Math.min(100, this.vibeMeter + 8);
                    this.createParticles(friend.x, friend.y, '💥');
                    friend.bounce();
                    break;
                }
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update friends
        for (let friend of this.friends) {
            friend.update();
        }
        
        // Vibe meter decay
        this.vibeMeter = Math.max(0, this.vibeMeter - 0.1);
        
        // Game over condition
        if (this.vibeMeter <= 0) {
            this.gameOver();
        }
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('friendslop-high-score', this.highScore);
        }
    }
    
    createParticles(x, y, emoji) {
        for (let i = 0; i < 5; i++) {
            const vx = (Math.random() - 0.5) * 8;
            const vy = (Math.random() - 0.5) * 8 - 2;
            this.particles.push(new Particle(x, y, vx, vy, emoji));
        }
    }
    
    screenShake() {
        this.shakeAmount = 5;
    }
    
    gameOver() {
        this.state = GAME_STATE.GAME_OVER;
        document.getElementById('friendslop-4weird-final-score').textContent = Math.floor(this.score);
        document.getElementById('friendslop-4weird-daily-rank').textContent = `Wave: ${this.wave}`;
        document.getElementById('friendslop-4weird-game-over-screen').classList.remove('hidden');
    }
    
    shareScore() {
        const text = `I scored ${Math.floor(this.score)} points in FriendSlop! 🍝 Can you beat my score? Play now: https://4weird.games/games/friendslop`;
        
        if (navigator.share) {
            navigator.share({
                title: 'FriendSlop',
                text: text,
                url: window.location.href
            }).catch(err => console.log('Share failed:', err));
        } else {
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        }
    }
    
    draw() {
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply screen shake
        if (this.shakeAmount) {
            const shake = Math.random() * this.shakeAmount - this.shakeAmount / 2;
            ctx.translate(shake, 0);
            this.shakeAmount *= 0.9;
        }
        
        // Draw grid background
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        // Draw friends
        for (let friend of this.friends) {
            friend.draw(ctx);
        }
        
        // Draw slop
        for (let slop of this.slop) {
            slop.draw(ctx);
        }
        
        // Draw hazards
        for (let hazard of this.hazards) {
            hazard.draw(ctx);
        }
        
        // Draw projectiles
        for (let projectile of this.projectiles) {
            projectile.draw(ctx);
        }
        
        // Draw particles
        for (let particle of this.particles) {
            particle.draw(ctx);
        }
        
        // Draw player
        this.player.draw(ctx);
        
        // Draw HUD
        this.drawHUD();
    }
    
    drawHUD() {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 20px Orbitron';
        ctx.textAlign = 'left';
        
        ctx.fillText(`Score: ${Math.floor(this.score)}`, 20, 30);
        ctx.fillText(`Wave: ${this.wave}`, 20, 60);
        ctx.fillText(`Combo: ${this.combo}x`, 20, 90);
        
        // Vibe meter
        const meterWidth = 200;
        const meterHeight = 20;
        const meterX = canvas.width - meterWidth - 20;
        const meterY = 20;
        
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 12px Orbitron';
        ctx.textAlign = 'right';
        ctx.fillText('VIBE', meterX - 10, meterY + 15);
        
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);
        
        const fillColor = this.vibeMeter > 50 ? '#00ff00' : this.vibeMeter > 25 ? '#ffff00' : '#ff0000';
        ctx.fillStyle = fillColor;
        ctx.fillRect(meterX + 2, meterY + 2, (meterWidth - 4) * (this.vibeMeter / 100), meterHeight - 4);
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = 5;
        this.moveLeft = false;
        this.moveRight = false;
    }
    
    update() {
        if (this.moveLeft && this.x > 0) this.x -= this.speed;
        if (this.moveRight && this.x < canvas.width - this.width) this.x += this.speed;
    }
    
    throw() {
        const projectile = new Projectile(this.x + this.width / 2, this.y, 0, -10);
        game.projectiles.push(projectile);
    }
    
    collidesWith(entity) {
        return this.x < entity.x + entity.width &&
               this.x + this.width > entity.x &&
               this.y < entity.y + entity.height &&
               this.y + this.height > entity.y;
    }
    
    draw(ctx) {
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🤖', this.x + this.width / 2, this.y + this.height / 2);
    }
}

// Friend class
class Friend {
    constructor(x, y, emoji) {
        this.x = x;
        this.y = y;
        this.emoji = emoji;
        this.width = 40;
        this.height = 40;
        this.bounceAmount = 0;
    }
    
    update() {
        if (this.bounceAmount > 0) {
            this.bounceAmount -= 2;
        }
    }
    
    bounce() {
        this.bounceAmount = 20;
    }
    
    collidesWith(entity) {
        return this.x < entity.x + entity.width &&
               this.x + this.width > entity.x &&
               this.y < entity.y + entity.height &&
               this.y + this.height > entity.y;
    }
    
    draw(ctx) {
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const offsetY = -this.bounceAmount;
        ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2 + offsetY);
    }
}

// Slop class
class Slop {
    constructor(x, y, emoji) {
        this.x = x;
        this.y = y;
        this.emoji = emoji;
        this.width = 30;
        this.height = 30;
        this.speed = 2 + Math.random() * 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }
    
    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, 0);
        ctx.restore();
    }
}

// Hazard class
class Hazard {
    constructor(x, y, emoji) {
        this.x = x;
        this.y = y;
        this.emoji = emoji;
        this.width = 35;
        this.height = 35;
        this.speed = 1.5 + Math.random() * 1.5;
    }
    
    update() {
        this.y += this.speed;
    }
    
    draw(ctx) {
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2);
    }
}

// Projectile class
class Projectile {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = 20;
        this.height = 20;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravity
    }
    
    draw(ctx) {
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🍝', this.x, this.y);
    }
}

// Particle class
class Particle {
    constructor(x, y, vx, vy, emoji) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.emoji = emoji;
        this.life = 30;
        this.size = 20;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3; // gravity
        this.life--;
    }
    
    draw(ctx) {
        ctx.globalAlpha = this.life / 30;
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

// Initialize game
let game;
window.addEventListener('load', () => {
    game = new FriendSlop();
});
