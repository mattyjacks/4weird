// Event Handlers
var eventHandlersInitialized = false;

function initEventHandlers() {
    if (eventHandlersInitialized) return; // Prevent duplicate handlers
    eventHandlersInitialized = true;

    document.getElementById('btnEasy').addEventListener('click', () => {
        difficulty = 'easy';
        document.getElementById('btnEasy').style.background = 'linear-gradient(135deg, #10b981, #059669)';
        document.getElementById('btnHard').style.background = 'transparent';
    });
    
    document.getElementById('btnHard').addEventListener('click', () => {
        difficulty = 'hard';
        document.getElementById('btnHard').style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        document.getElementById('btnEasy').style.background = 'transparent';
    });
    
    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnResume').addEventListener('click', resumeGame);
    document.getElementById('btnRestart').addEventListener('click', startGame);
    document.getElementById('btnRestartPause').addEventListener('click', startGame);
    document.getElementById('btnMenuPause').addEventListener('click', () => {
        gamePaused = false;
        document.getElementById('pauseScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
    });
    document.getElementById('btnVictoryRestart').addEventListener('click', startGame);
}
