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
    console.log('[RESIZE] Resizing canvas, window:', window.innerWidth, 'x', window.innerHeight);
    
    const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
    const padding = isMobile ? 10 : 40;
    const headerSpace = isMobile ? 60 : 140;
    const maxWidth = Math.max(window.innerWidth - padding, 400);  // Minimum 400px
    const maxHeight = Math.max(window.innerHeight - headerSpace, 300);  // Minimum 300px

    // For mobile, prioritize filling the width and use more height
    let scale;
    if (isMobile) {
        // On mobile: fill width, use as much height as possible
        scale = Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT);
    } else {
        // On desktop: maintain aspect ratio, don't scale up beyond 100%
        scale = Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT, 1);
    }
    
    // Ensure scale is never zero or negative
    scale = Math.max(scale, 0.5);  // Minimum 50% scale
    
    console.log('[RESIZE] Calculated scale:', scale);

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
    
    console.log('[RESIZE] Canvas size set to:', canvas.style.width, 'x', canvas.style.height);
}

function getContext() {
    return ctx;
}

function getCanvas() {
    return canvas;
}
