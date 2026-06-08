// Particle Effects
let particles = [];

function spawnParticles(x, y, color, count, emoji) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        particles.push({
            x, y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            color,
            radius: Math.random() * 3 + 2,
            life: 1,
            emoji,
            rotation: Math.random() * Math.PI * 2
        });
    }
}

function updateParticles() {
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= 0.02;
        if (p.emoji) p.rotation += 0.1;
    });
    particles = particles.filter(p => p.life > 0);
}

function getParticles() {
    return particles;
}

function clearParticles() {
    particles = [];
}
