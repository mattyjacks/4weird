// Canvas Management
var canvas = null;
var ctx = null;
var canvasInitialized = false;

function initCanvas() {
    if (canvasInitialized) return; // Prevent duplicate initialization

    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Game canvas not found!');
        return;
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context!');
        return;
    }
    canvasInitialized = true;
    // Set initial size before resize
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    resize();
    window.addEventListener('resize', resize);
}

function resize() {
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 140;
    const scale = Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT, 1);
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
}

function getContext() {
    return ctx;
}

function getCanvas() {
    return canvas;
}
