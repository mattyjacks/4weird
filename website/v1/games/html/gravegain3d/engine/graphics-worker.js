'use strict';

let canvas;
let ctx;
let width = 1;
let height = 1;
let pixelRatio = 1;
let active = true;
const particles = [];

function resize(nextWidth, nextHeight, nextPixelRatio) {
    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextPixelRatio;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function burst(x, y, color, strength) {
    const count = Math.min(18, Math.max(5, Math.round(strength * 9)));
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 95 * strength;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, life: 0.55 + Math.random() * 0.25, maxLife: 0.8 });
    }
}

let lastTime = 0;
function frame(time) {
    const dt = Math.min((time - lastTime) / 1000 || 0, 0.05);
    lastTime = time;
    if (active && ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.life -= dt;
            if (particle.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vx *= 0.94;
            particle.vy *= 0.94;
            const alpha = particle.life / particle.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 1.5 + alpha * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }
    self.requestAnimationFrame(frame);
}

self.onmessage = (event) => {
    const message = event.data;
    if (message.type === 'init') {
        canvas = message.canvas;
        ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
        self.requestAnimationFrame(frame);
    } else if (message.type === 'resize') {
        resize(message.width, message.height, message.pixelRatio);
    } else if (message.type === 'burst') {
        burst(message.x, message.y, message.color, message.strength);
    } else if (message.type === 'active') {
        active = message.active;
    }
};
