// Game Initialization
document.addEventListener('DOMContentLoaded', () => {
    try {
        initCanvas();
        initInput();
        initEventHandlers();
        initReviews(); // Initialize review system
        initServers(); // Initialize 3-server defense line
        startGameLoop();
        console.log('Server Saver Shield initialized successfully');
    } catch (error) {
        console.error('Failed to initialize game:', error);
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
                ctx.fillText('Error loading game. Please refresh.', canvas.width / 2, canvas.height / 2);
            }
        }
    }
});
