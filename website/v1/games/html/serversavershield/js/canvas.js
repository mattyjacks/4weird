// Canvas Management
var canvas = null;
var ctx = null;

function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
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
