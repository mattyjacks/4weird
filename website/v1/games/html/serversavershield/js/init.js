// Game Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('[INIT] DOMContentLoaded fired');
    
    try {
        // Ensure canvas is immediately visible with background
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            console.log('[INIT] Canvas found, setting initial size');
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Draw immediate background so user sees something
                ctx.fillStyle = '#0f0f23';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#8b5cf6';
                ctx.font = 'bold 24px Orbitron, Arial';
                ctx.textAlign = 'center';
                ctx.fillText('🛡️ Loading Server Saver Shield...', canvas.width / 2, canvas.height / 2);
                console.log('[INIT] Initial canvas draw complete');
            }
        } else {
            console.error('[INIT] Canvas not found!');
        }
        
        console.log('[INIT] Calling initCanvas...');
        initCanvas();
        
        console.log('[INIT] Calling initInput...');
        initInput();
        
        console.log('[INIT] Calling initEventHandlers...');
        initEventHandlers();
        
        console.log('[INIT] Calling initReviews...');
        if (typeof initReviews === 'function') {
            initReviews();
        } else {
            console.warn('[INIT] initReviews not found');
        }
        
        console.log('[INIT] Calling initServers...');
        if (typeof initServers === 'function') {
            initServers();
        } else {
            console.warn('[INIT] initServers not found');
        }
        
        console.log('[INIT] Calling startGameLoop...');
        startGameLoop();
        
        console.log('[INIT] Server Saver Shield initialized successfully');
        
        // Emergency: Ensure start screen is visible
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.classList.remove('hidden');
            console.log('[INIT] Start screen is visible');
        }
        
        // Force a canvas redraw to show something
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Emergency visual test - draw colored bars
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(50, 50, 100, 100); // Red square
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(200, 50, 100, 100); // Green square
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(350, 50, 100, 100); // Blue square
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 30px Arial';
            ctx.fillText('TEST PATTERN', 100, 200);
            
            console.log('[INIT] Emergency test pattern drawn');
        }
        
        // Add emergency click handler to force start screen
        document.body.addEventListener('click', function() {
            const startScreen = document.getElementById('startScreen');
            if (startScreen) {
                startScreen.style.display = 'flex';
                startScreen.style.opacity = '1';
                startScreen.style.visibility = 'visible';
                startScreen.style.zIndex = '999999';
                console.log('[INIT] Start screen forced visible via click');
            }
        });
        
    } catch (error) {
        console.error('[INIT] Failed to initialize game:', error);
        console.error('[INIT] Stack trace:', error.stack);
        
        // Display user-friendly error message
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = 800;
                canvas.height = 600;
                ctx.fillStyle = '#0f0f23';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ef4444';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Error loading game: ' + error.message, canvas.width / 2, canvas.height / 2);
                ctx.font = '14px Arial';
                ctx.fillStyle = '#9ca3af';
                ctx.fillText('Check console for details (F12)', canvas.width / 2, canvas.height / 2 + 30);
            }
        }
    }
});
