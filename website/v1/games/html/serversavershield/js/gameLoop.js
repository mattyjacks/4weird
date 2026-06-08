// Main Game Loop
function update() {
    if (!gameRunning || gamePaused) return;
    
    try {
        if (typeof updatePlayer === 'function') updatePlayer();
        if (typeof updateBullets === 'function') updateBullets();
        if (typeof updateEnemies === 'function') updateEnemies();
        if (typeof updatePowerups === 'function') updatePowerups();
        if (typeof updateParticles === 'function') updateParticles();
        if (typeof updateUI === 'function') updateUI();
        if (typeof updateWaves === 'function') updateWaves();
        if (typeof updateServers === 'function') updateServers();
        if (typeof updateStaff === 'function') updateStaff();
        
        if (typeof checkBulletEnemyCollisions === 'function') checkBulletEnemyCollisions();
        if (typeof checkServerCollisions === 'function') checkServerCollisions();
        if (typeof checkPowerupCollisions === 'function') checkPowerupCollisions();
        if (typeof checkManagementZoneEntry === 'function') checkManagementZoneEntry();
        if (typeof updateReviews === 'function') updateReviews();
        
        if (gameState && typeof gameState === 'object') {
            gameState.customerTrust = Math.max(0, Math.min(100, gameState.customerTrust - 0.01 + (upgrades && upgrades.prCampaign ? 0.05 : 0)));
            
            if (gameState.balance < 0) gameState.bankruptcyTimer++;
            else gameState.bankruptcyTimer = 0;
        }
        
        if (gameState && gameState.bankruptcyTimer > 600 && typeof gameOver === 'function') gameOver();
        if (gameState && gameState.balance <= 0 && typeof getOnlineServerCount === 'function' && getOnlineServerCount() === 0 && typeof gameOver === 'function') gameOver();
        if (wave >= 10 && waveTimer > 100 && enemies.length === 0 && typeof victory === 'function') victory();
    } catch (error) {
        console.error('[UPDATE] Error in update function:', error);
    }
}

function draw() {
    try {
        const ctx = getContext();
        if (!ctx) {
            console.warn('[DRAW] No context available');
            return;
        }
        
        const shake = getScreenShake ? getScreenShake() : { x: 0, y: 0 };
        ctx.save();
        ctx.translate(shake.x, shake.y);
        
        if (typeof drawBackground === 'function') drawBackground();
        if (typeof updateStars === 'function') updateStars();
        if (typeof drawStars === 'function') drawStars();
        if (typeof drawShopZone === 'function') drawShopZone();
        if (typeof drawManagementZone === 'function') drawManagementZone();
        if (typeof drawPowerups === 'function') drawPowerups();
        if (typeof drawParticles === 'function') drawParticles();
        if (typeof drawEnemies === 'function') drawEnemies();
        if (typeof drawPlayer === 'function') drawPlayer();
        if (typeof drawBullets === 'function') drawBullets();
        if (typeof drawCombo === 'function') drawCombo();
        if (typeof drawFloatingTexts === 'function') drawFloatingTexts();
        if (typeof drawServers === 'function') drawServers();
        if (typeof drawHUD === 'function') drawHUD();
        
        ctx.restore();
        if (typeof updateScreenShake === 'function') updateScreenShake();
    } catch (error) {
        console.error('[DRAW] Error in draw function:', error);
    }
}

function gameLoop() {
    try {
        if (gameRunning) {
            update();
            draw();
        } else {
            // Draw idle screen (background + stars) when game is not running
            drawBackground();
            if (typeof updateStars === 'function') updateStars();
            if (typeof drawStars === 'function') drawStars();
        }
    } catch (error) {
        console.error('[GAMELOOP] Error in game loop:', error);
    }
    requestAnimationFrame(gameLoop);
}

function startGameLoop() {
    console.log('[GAMELOOP] Starting game loop...');
    
    // Initialize stars for idle animation
    if (typeof initStars === 'function') {
        try {
            initStars();
            console.log('[GAMELOOP] Stars initialized');
        } catch (e) {
            console.warn('[GAMELOOP] Failed to init stars:', e);
        }
    } else {
        console.warn('[GAMELOOP] initStars not available');
    }
    
    // Ensure we have a context before starting
    const testCtx = getContext();
    if (!testCtx) {
        console.error('[GAMELOOP] No canvas context available!');
        return;
    }
    
    console.log('[GAMELOOP] Context found, starting loop');
    gameLoop();
}
