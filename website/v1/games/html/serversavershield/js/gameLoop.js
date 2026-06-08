// Main Game Loop
function update() {
    if (!gameRunning || gamePaused) return;
    
    updatePlayer();
    updateBullets();
    updateEnemies();
    updatePowerups();
    updateParticles();
    updateUI();
    updateWaves();
    updateServers();
    updateStaff();
    
    checkBulletEnemyCollisions();
    checkEnemyServerCollisions();
    checkPowerupCollisions();
    
    gameState.customerTrust = Math.max(0, Math.min(100, gameState.customerTrust - 0.01 + (upgrades.prCampaign ? 0.05 : 0)));
    
    if (gameState.balance < 0) gameState.bankruptcyTimer++;
    else gameState.bankruptcyTimer = 0;
    
    if (gameState.bankruptcyTimer > 600) gameOver();
    if (gameState.balance <= 0 && gameState.serverCount === 0) gameOver();
    if (wave >= 10 && waveTimer > 100 && enemies.length === 0) victory();
}

function draw() {
    drawBackground();
    updateStars();
    drawStars();
    drawPowerups();
    drawParticles();
    drawEnemies();
    drawPlayer();
    drawBullets();
    drawCombo();
    drawFloatingTexts();
    drawHUD();
}

function gameLoop() {
    if (gameRunning) { update(); draw(); }
    requestAnimationFrame(gameLoop);
}

function startGameLoop() {
    gameLoop();
}
