// Player Management
var player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 80,
    radius: 25,
    shootCooldown: 0,
    hasCompanion: false,
    companionTimer: 0
};

var inputX = CANVAS_WIDTH / 2;
var inputY = CANVAS_HEIGHT - 100;
var isShooting = false;
var currentWeapon = 'standard';
var weaponTimer = 0;
var weaponTimerMax = 600;

function updatePlayer() {
    player.x += (inputX - player.x) * 0.12;
    player.y += (inputY - player.y) * 0.12;
    player.x = Math.max(player.radius, Math.min(CANVAS_WIDTH - player.radius, player.x));
    player.y = Math.max(player.radius + 30, Math.min(CANVAS_HEIGHT - player.radius, player.y));
    
    if (isShooting) spawnBullet();
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (weaponTimer > 0) weaponTimer--; else currentWeapon = 'standard';
    if (player.companionTimer > 0) player.companionTimer--; else player.hasCompanion = false;
}

function getPlayer() {
    return player;
}

function setPlayerInput(x, y) {
    inputX = x;
    inputY = y;
}

function toggleShooting() {
    isShooting = !isShooting;
}

function getCurrentWeapon() {
    return currentWeapon;
}

function setCurrentWeapon(weapon) {
    currentWeapon = weapon;
    weaponTimer = weaponTimerMax;
}
