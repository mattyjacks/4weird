(function() {
    'use strict';

    // Canvas setup
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const ctx = canvas.getContext('2d');

    // Game constants
    const GRID_COLS = 8;
    const GRID_ROWS = 6;
    const TILE_SIZE = 60;
    const GRID_PADDING = 20;

    // Audio context (Web Audio API)
    let audioContext;
    let isPlaying = false;
    let isPaused = false;

    // Musical notes (frequencies in Hz)
    const NOTES = [
        261.63, // C4
        293.66, // D4
        329.63, // E4
        349.23, // F4
        392.00, // G4
        440.00, // A4
        493.88, // B4
        523.25  // C5
    ];

    // Colors for each row (different timbres)
    const COLORS = [
        '#FF6B6B', // Red - sine
        '#4ECDC4', // Teal - square
        '#45B7D1', // Blue - sawtooth
        '#96CEB4', // Green - triangle
        '#FFEAA7', // Yellow - noise
        '#DDA15E'  // Brown - mix
    ];

    // Grid state
    const grid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(false));
    let tileCount = 0;

    // Game state
    const state = {
        score: 0,
        isPlaying: false,
        isPaused: false,
        highScore: parseInt(localStorage.getItem('soundpainter_tilesCount') || '0')
    };

    // Initialize Audio Context
    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Resize canvas for high DPI
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
    }

    // Calculate tile position from mouse/touch
    function getTileAt(x, y) {
        const rect = canvas.getBoundingClientRect();
        const localX = x - rect.left;
        const localY = y - rect.top;

        const gridStartX = GRID_PADDING;
        const gridStartY = GRID_PADDING;

        const col = Math.floor((localX - gridStartX) / TILE_SIZE);
        const row = Math.floor((localY - gridStartY) / TILE_SIZE);

        if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
            return { row, col };
        }
        return null;
    }

    // Play a single note
    function playNote(frequency, duration = 0.3, waveType = 'sine', row = 0) {
        if (!audioContext) return;

        const now = audioContext.currentTime;
        const env = 0.05;

        // Oscillator
        const osc = audioContext.createOscillator();
        osc.type = waveType;
        osc.frequency.value = frequency;

        // Gain envelope
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Get waveform type based on row
    function getWaveType(row) {
        const types = ['sine', 'square', 'sawtooth', 'triangle', 'sine', 'square'];
        return types[row % types.length];
    }

    // Handle tile click
    function clickTile(row, col) {
        if (!state.isPlaying) return;

        const wasActive = grid[row][col];
        grid[row][col] = !grid[row][col];

        if (!wasActive) {
            tileCount++;
            state.score = tileCount;
            document.getElementById('TEMPLATE-4weird-high-score').textContent = tileCount;
        } else {
            tileCount--;
            state.score = tileCount;
            document.getElementById('TEMPLATE-4weird-high-score').textContent = tileCount;
        }

        // Play sound
        initAudio();
        const frequency = NOTES[col];
        const waveType = getWaveType(row);
        playNote(frequency, 0.2, waveType, row);
    }

    // Play all tiles in sequence
    function playAll() {
        if (!state.isPlaying) return;
        initAudio();

        const tiledesc = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (grid[row][col]) {
                    tiledesc.push({ row, col });
                }
            }
        }

        if (tiledesc.length === 0) return;

        // Stagger notes
        tiledesc.forEach((tile, idx) => {
            setTimeout(() => {
                const frequency = NOTES[tile.col];
                const waveType = getWaveType(tile.row);
                playNote(frequency, 0.25, waveType, tile.row);
            }, idx * 100);
        });
    }

    // Reset grid
    function resetGrid() {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                grid[r][c] = false;
            }
        }
        tileCount = 0;
        state.score = 0;
        document.getElementById('TEMPLATE-4weird-high-score').textContent = '0';
    }

    // Render function
    function render() {
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);

        ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw grid
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = GRID_PADDING + col * TILE_SIZE;
                const y = GRID_PADDING + row * TILE_SIZE;

                // Tile background
                if (grid[row][col]) {
                    ctx.fillStyle = COLORS[row];
                    ctx.globalAlpha = 0.9;
                } else {
                    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
                    ctx.globalAlpha = 0.5;
                }

                ctx.fillRect(x, y, TILE_SIZE - 4, TILE_SIZE - 4);
                ctx.globalAlpha = 1;

                // Tile border
                ctx.strokeStyle = grid[row][col] ? COLORS[row] : 'rgba(139, 92, 246, 0.3)';
                ctx.lineWidth = grid[row][col] ? 2 : 1;
                ctx.strokeRect(x, y, TILE_SIZE - 4, TILE_SIZE - 4);

                // Note label (frequency)
                if (col % 2 === 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.font = '10px var(--font-body)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(Math.round(NOTES[col]) + 'Hz', x + TILE_SIZE / 2 - 2, y + TILE_SIZE / 2 - 2);
                }
            }
        }

        // Draw instructions
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '14px var(--font-body)';
        ctx.textAlign = 'left';
        const totalHeight = GRID_PADDING + GRID_ROWS * TILE_SIZE;
        ctx.fillText('Space: Play All | R: Reset | P: Pause', GRID_PADDING, totalHeight + 30);
    }

    // Game loop
    let lastTime = 0;
    function gameLoop(timestamp) {
        if (!state.isPlaying || state.isPaused) {
            return;
        }

        const dt = timestamp - lastTime;
        lastTime = timestamp;

        render();
        requestAnimationFrame(gameLoop);
    }

    // Toggle pause
    function togglePause() {
        if (!state.isPlaying) return;
        state.isPaused = !state.isPaused;
        if (!state.isPaused) {
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        } else {
            document.getElementById('TEMPLATE-4weird-pause-screen').classList.remove('hidden');
        }
    }

    // Start game
    function startGame() {
        state.isPlaying = true;
        state.isPaused = false;
        resetGrid();
        document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
        resizeCanvas();
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    // End game
    function endGame() {
        state.isPlaying = false;
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('soundpainter_tilesCount', state.highScore);
        }
        document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    }

    // Input handling
    const keys = {};

    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;

        if (state.isPlaying) {
            if (e.code === 'KeyP' || e.code === 'Escape') {
                e.preventDefault();
                togglePause();
            }
            if (e.code === 'Space') {
                e.preventDefault();
                playAll();
            }
            if (e.code === 'KeyR') {
                e.preventDefault();
                resetGrid();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // Mouse input
    canvas.addEventListener('click', (e) => {
        const tile = getTileAt(e.clientX, e.clientY);
        if (tile) {
            clickTile(tile.row, tile.col);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const tile = getTileAt(e.clientX, e.clientY);
        canvas.style.cursor = tile ? 'pointer' : 'default';
    });

    // Touch input
    let touchActive = false;
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchActive = true;
        const touch = e.touches[0];
        const tile = getTileAt(touch.clientX, touch.clientY);
        if (tile) {
            clickTile(tile.row, tile.col);
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        touchActive = false;
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (touchActive) {
            const touch = e.touches[0];
            const tile = getTileAt(touch.clientX, touch.clientY);
            if (tile) {
                clickTile(tile.row, tile.col);
            }
        }
    }, { passive: false });

    // Button event listeners
    document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', startGame);
    document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', () => {
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
        state.isPaused = false;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    });
    document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', () => {
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
        resetGrid();
        state.isPaused = false;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    });
    document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', () => {
        document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
        startGame();
    });

    // Window resize handling
    window.addEventListener('resize', resizeCanvas);

    // Initialize
    resizeCanvas();
    document.getElementById('TEMPLATE-4weird-high-score').textContent = state.highScore;
})();
