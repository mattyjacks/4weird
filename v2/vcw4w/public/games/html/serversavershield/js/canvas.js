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
    
    // Initialize page-wide matrix background
    if (typeof initOuterMatrix === 'function') {
        initOuterMatrix();
    }
}

function resize() {
    console.log('[RESIZE] Resizing canvas, window:', window.innerWidth, 'x', window.innerHeight);
    
    const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

    let scale;
    if (isMobile) {
        // On mobile: fit width, also limit height to avoid needing to scroll during play
        const padding = 10;
        const headerSpace = 60;
        const maxWidth = Math.max(window.innerWidth - padding, 400);
        const maxHeight = Math.max(window.innerHeight - headerSpace, 300);
        scale = Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT);
    } else {
        // On desktop: fit to available width only — no height capping.
        // The page scrolls naturally if the canvas is taller than the viewport.
        const padding = 80; // leave room for page margins/nav
        const maxWidth = Math.max(window.innerWidth - padding, 400);
        // Scale to fit width, but never scale UP beyond 100%
        scale = Math.min(maxWidth / CANVAS_WIDTH, 1);
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
