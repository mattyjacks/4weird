// Input Handling
var inputInitialized = false;
var keysPressed = {};
var KEYBOARD_SPEED = 8; // Movement speed for keyboard controls

function initInput() {
    if (inputInitialized) return; // Prevent duplicate listeners
    inputInitialized = true;

    const gameCanvas = getCanvas();
    gameCanvas.addEventListener('mousemove', (e) => {
        const rect = gameCanvas.getBoundingClientRect();
        const scale = gameCanvas.width / rect.width;
        inputX = (e.clientX - rect.left) * scale;
        inputY = (e.clientY - rect.top) * scale;
    });

    gameCanvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isShooting = !isShooting;
    });

    gameCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = gameCanvas.getBoundingClientRect();
        const scale = gameCanvas.width / rect.width;
        const t = e.touches[0];
        inputX = (t.clientX - rect.left) * scale;
        inputY = (t.clientY - rect.top) * scale;
    }, { passive: false });

    gameCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isShooting = !isShooting;
        const rect = gameCanvas.getBoundingClientRect();
        const scale = gameCanvas.width / rect.width;
        const t = e.touches[0];
        inputX = (t.clientX - rect.left) * scale;
        inputY = (t.clientY - rect.top) * scale;
    }, { passive: false });

    gameCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
    });
    
    // Keyboard controls - WASD and Arrow keys
    window.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;
        
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (gameRunning && !gamePaused) pauseGame();
            else if (gamePaused) resumeGame();
        }
        
        // Spacebar to toggle shooting
        if (e.key === ' ') {
            e.preventDefault();
            isShooting = !isShooting;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });
}

// Update player position based on keyboard input
function updateKeyboardMovement() {
    if (!gameRunning || gamePaused) return;
    
    let dx = 0;
    let dy = 0;
    
    // WASD and Arrow key support
    if (keysPressed['w'] || keysPressed['arrowup']) dy -= KEYBOARD_SPEED;
    if (keysPressed['s'] || keysPressed['arrowdown']) dy += KEYBOARD_SPEED;
    if (keysPressed['a'] || keysPressed['arrowleft']) dx -= KEYBOARD_SPEED;
    if (keysPressed['d'] || keysPressed['arrowright']) dx += KEYBOARD_SPEED;
    
    // Apply movement if keys are pressed
    if (dx !== 0 || dy !== 0) {
        inputX = player.x + dx;
        inputY = player.y + dy;
    }
}
