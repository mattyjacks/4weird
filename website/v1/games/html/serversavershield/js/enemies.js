// Enemy Management
let enemies = [];
let spawnTimer = 0;

function spawnEnemy() {
    let types = ['blackhat', 'pentester'];
    if (wave >= 2) types.push('agency');
    if (wave >= 3) types.push('trojan');
    if (wave >= 4) types.push('ddos');
    if (wave >= 5) types.push('ransomware');
    if (wave >= 6) types.push('fraudster');
    if (wave >= 7) types.push('socialeng');
    if (wave >= 8) types.push('cryptominer');
    
    const typeKey = types[Math.floor(Math.random() * types.length)];
    const type = ENEMIES[typeKey];
    enemies.push({
        x: Math.random() * (CANVAS_WIDTH - 100) + 50,
        y: -40,
        vx: (Math.random() - 0.5) * 2,
        vy: type.speed + (wave * 0.1),
        ...type,
        currentHp: type.hp,
        maxHp: type.hp,
        wobble: Math.random() * Math.PI * 2,
        typeKey
    });
}

function updateEnemies() {
    const diffMult = DIFFICULTY_MULTIPLIERS[difficulty].spawnRate;
    spawnTimer--;
    if (spawnTimer <= 0) {
        spawnTimer = Math.max(20, Math.floor((60 - wave * 4) * diffMult));
        spawnEnemy();
    }
    
    enemies.forEach(e => {
        e.x += e.vx;
        e.y += e.vy;
        e.wobble += 0.05;
        if (e.behavior === 'evasive') e.x += Math.sin(e.wobble) * 2;
    });
    
    enemies = enemies.filter(e => e.y < CANVAS_HEIGHT + 50);
}

function getEnemies() {
    return enemies;
}

function clearEnemies() {
    enemies = [];
}

function removeEnemy(index) {
    enemies.splice(index, 1);
}
