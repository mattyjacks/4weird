// Input Handling
var inputInitialized = false;

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
    
    window.addEventListener('keydown', (e) => {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (gameRunning && !gamePaused) pauseGame();
            else if (gamePaused) resumeGame();
        }
    });
}
