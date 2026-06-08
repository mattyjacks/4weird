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
    checkServerCollisions(); // Check enemies hitting servers
    checkPowerupCollisions();
    checkManagementZoneEntry(); // Check if player entered management zone
    updateReviews(); // Generate periodic reviews
    
    gameState.customerTrust = Math.max(0, Math.min(100, gameState.customerTrust - 0.01 + (upgrades.prCampaign ? 0.05 : 0)));
    
    if (gameState.balance < 0) gameState.bankruptcyTimer++;
    else gameState.bankruptcyTimer = 0;
    
    if (gameState.bankruptcyTimer > 600) gameOver();
    if (gameState.balance <= 0 && getOnlineServerCount() === 0) gameOver();
    if (wave >= 10 && waveTimer > 100 && enemies.length === 0) victory();
}

function draw() {
    const ctx = getContext();
    const shake = getScreenShake();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    
    drawBackground();
    updateStars();
    drawStars();
    drawShopZone(); // Draw laptop shop zone
    drawManagementZone(); // Draw management zone
    drawPowerups();
    drawParticles();
    drawEnemies();
    drawPlayer();
    drawBullets();
    drawCombo();
    drawFloatingTexts();
    drawServers(); // Draw 3 defense servers
    drawHUD();
    
    ctx.restore();
    updateScreenShake(); // Update screen shake effect
}

function gameLoop() {
    if (gameRunning) {
        update();
        draw();
    } else {
        // Draw idle screen (background + stars) when game is not running
        drawBackground();
        updateStars();
        drawStars();
    }
    requestAnimationFrame(gameLoop);
}

function startGameLoop() {
    // Initialize stars for idle animation
    if (typeof initStars === 'function') {
        initStars();
    }
    gameLoop();
}
