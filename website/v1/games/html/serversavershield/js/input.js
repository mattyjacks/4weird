// Input Handling
function initInput() {
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        inputX = (e.clientX - rect.left) * scale;
        inputY = (e.clientY - rect.top) * scale;
    });
    
    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isShooting = !isShooting;
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        const t = e.touches[0];
        inputX = (t.clientX - rect.left) * scale;
        inputY = (t.clientY - rect.top) * scale;
    }, { passive: false });
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isShooting = !isShooting;
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        const t = e.touches[0];
        inputX = (t.clientX - rect.left) * scale;
        inputY = (t.clientY - rect.top) * scale;
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
    });
    
    window.addEventListener('keydown', (e) => {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (gameRunning && !gamePaused) pauseGame();
            else if (gamePaused) resumeGame();
        }
    });
}
