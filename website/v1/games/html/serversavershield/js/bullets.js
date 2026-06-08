// Bullet Management
let bullets = [];

function spawnBullet() {
    if (player.shootCooldown > 0) return;
    const weapon = WEAPONS[currentWeapon] || WEAPONS.standard;
    player.shootCooldown = weapon.fireRate;
    for (let i = 0; i < weapon.bulletCount; i++) {
        const angle = (i - (weapon.bulletCount - 1) / 2) * weapon.spread;
        bullets.push({
            x: player.x,
            y: player.y - 30,
            vx: Math.sin(angle) * 2,
            vy: -weapon.speed,
            radius: weapon.radius,
            life: 120,
            color: weapon.color,
            damage: weapon.damage,
            weapon: currentWeapon
        });
    }
    playSound('shoot');
}

function updateBullets() {
    bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
    bullets = bullets.filter(b => b.life > 0 && b.y > -20);
}

function getBullets() {
    return bullets;
}

function clearBullets() {
    bullets = [];
}
