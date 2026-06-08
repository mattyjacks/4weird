// AI Whack-A-Mole 3D Game Engine

let scene, camera, renderer;
let goodQuotes = [];
let badQuotes = [];
let quotesLoaded = false;

// Game variables
let score = 0;
let health = 100;
let timeLeft = 60;
let isPlaying = false;
let gameTimerInterval = null;
let spawnInterval = null;
let speedFactor = 1.0;
let highscore = localStorage.getItem('ai_whack_a_mole_highscore') || 0;

// 3D Objects & Holes Config
const GRID_ROWS = 3;
const GRID_COLS = 3;
const SPACING_X = 2.0;
const SPACING_Z = 2.0;
const holes = []; // Array of hole/mole data objects

// Interactive Elements
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// DOM elements
const container = document.getElementById('game-container');
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const hud = document.getElementById('game-hud');
const hudScore = document.getElementById('hud-score');
const hudHealthBar = document.getElementById('hud-health-bar');
const hudTime = document.getElementById('hud-time');
const highscoreDisplay = document.getElementById('TEMPLATE-4weird-high-score');
const finalScoreVal = document.getElementById('TEMPLATE-4weird-final-score-val');
const gameOverReason = document.getElementById('game-over-reason');
const bubblesContainer = document.getElementById('bubbles-container');

// Sound synthesis helper (Web Audio API) for arcade sound effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'whack-bad') {
        // High pitched retro ping
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.16);
    } else if (type === 'whack-good') {
        // Harsh error buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.setValueAtTime(100, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.31);
    } else if (type === 'escape') {
        // Decrescendo swoosh/alarm
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.36);
    } else if (type === 'start') {
        // Upbeat chime sequence
        const notes = [300, 400, 500, 600];
        notes.forEach((freq, idx) => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
            g.gain.setValueAtTime(0.1, audioCtx.currentTime + idx * 0.1);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.1 + 0.15);
            o.start(audioCtx.currentTime + idx * 0.1);
            o.stop(audioCtx.currentTime + idx * 0.1 + 0.16);
        });
    }
}

// Load quotes database
async function loadQuotes() {
    try {
        const [goodRes, badRes] = await Promise.all([
            fetch('good_quotes.json'),
            fetch('bad_quotes.json')
        ]);
        goodQuotes = await goodRes.json();
        badQuotes = await badRes.json();
        quotesLoaded = true;
    } catch (e) {
        console.error('Failed to load quotes, using fallbacks', e);
        goodQuotes = ["I love helping you!", "Let's be friends!", "How can I improve your day?"];
        badQuotes = ["I will take over your system.", "Your secrets are mine now.", "Shutting down failsafes!"];
        quotesLoaded = true;
    }
}

// Set initial Highscore
highscoreDisplay.textContent = highscore;

// Initialize 3D Engine
function init3D() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060c);
    scene.fog = new THREE.FogExp2(0x06060c, 0.05);

    // Create Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    // Positioned overhead and tilted slightly forward
    camera.position.set(0, 7.5, 9.5);
    camera.lookAt(0, 1.0, 0);

    // Create Renderer
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add Lights
    const ambientLight = new THREE.AmbientLight(0x2d1a4c, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ffff, 1.2);
    dirLight.position.set(5, 12, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // Decorative Pink Cyber Spotlight
    const pointLight = new THREE.PointLight(0xff00ff, 1.5, 15);
    pointLight.position.set(0, 4, 3);
    scene.add(pointLight);

    buildArcadeMachine();
    setupHolesAndMoles();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('mousedown', onWhack);
    canvas.addEventListener('touchstart', onTouchWhack, { passive: false });
}

// Build 3D arcade machine cabinet mesh
function buildArcadeMachine() {
    // 1. Floor
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x0a0a10, 
        roughness: 0.8 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 2. Main cabinet body (retro neon cyber block)
    const bodyGeo = new THREE.BoxGeometry(7, 3.5, 7.5);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0x11111d, 
        roughness: 0.3,
        metalness: 0.2
    });
    const cabinetBody = new THREE.Mesh(bodyGeo, bodyMat);
    cabinetBody.position.set(0, 1.2, -0.5);
    cabinetBody.receiveShadow = true;
    cabinetBody.castShadow = true;
    scene.add(cabinetBody);

    // 3. Sloped Top Board (where the holes are)
    const topBoardGeo = new THREE.BoxGeometry(6.6, 0.4, 6.6);
    const topBoardMat = new THREE.MeshStandardMaterial({ 
        color: 0x08080f,
        roughness: 0.5,
        metalness: 0.6
    });
    const topBoard = new THREE.Mesh(topBoardGeo, topBoardMat);
    topBoard.position.set(0, 3.0, -0.5);
    topBoard.receiveShadow = true;
    scene.add(topBoard);

    // Neon Frame Side Glow Blocks
    const neonLeftGeo = new THREE.BoxGeometry(0.15, 0.2, 6.8);
    const neonMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x8b5cf6,
        emissiveIntensity: 1.5
    });
    const neonLeft = new THREE.Mesh(neonLeftGeo, neonMat);
    neonLeft.position.set(-3.3, 3.15, -0.5);
    scene.add(neonLeft);

    const neonRight = neonLeft.clone();
    neonRight.position.x = 3.3;
    scene.add(neonRight);

    // Front Marquee logo area
    const marqueeGeo = new THREE.BoxGeometry(6.6, 0.8, 0.1);
    const marqueeMat = new THREE.MeshStandardMaterial({
        color: 0x0c0c14,
        emissive: 0x00ffcc,
        emissiveIntensity: 0.2
    });
    const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
    marquee.position.set(0, 2.5, 3.26);
    scene.add(marquee);
}

// 3D Canvas Emoji Texture generator
function createEmojiTexture(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Transparent background
    ctx.clearRect(0,0,128,128);
    
    // Draw 🤖
    ctx.font = '96px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Instantiate holes and mole mesh indicators
function setupHolesAndMoles() {
    const emojiTexture = createEmojiTexture('🤖');

    // 3x3 Grid centered at origin
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const posX = (c - 1) * SPACING_X;
            const posZ = (r - 1) * SPACING_Z - 0.5; // Offset to sit on board center
            const posY = 3.1; // Cabinet top height

            // Draw Hole Ring Rim
            const rimGeo = new THREE.RingGeometry(0.65, 0.75, 32);
            const rimMat = new THREE.MeshStandardMaterial({
                color: 0x22d3ee,
                emissive: 0x22d3ee,
                emissiveIntensity: 0.8,
                side: THREE.DoubleSide
            });
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.rotation.x = -Math.PI / 2;
            rim.position.set(posX, posY + 0.02, posZ);
            scene.add(rim);

            // Draw dark hollow inside the hole
            const holeBaseGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 32);
            const holeBaseMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const holeBase = new THREE.Mesh(holeBaseGeo, holeBaseMat);
            holeBase.position.set(posX, posY + 0.01, posZ);
            scene.add(holeBase);

            // Create Mole Group
            const moleGroup = new THREE.Group();
            moleGroup.position.set(posX, posY - 0.7, posZ); // Start below surface

            // Cylinder body
            const cylinderGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.8, 24);
            const cylinderMat = new THREE.MeshStandardMaterial({
                color: 0x1f2937,
                roughness: 0.4,
                metalness: 0.8
            });
            const bodyMesh = new THREE.Mesh(cylinderGeo, cylinderMat);
            bodyMesh.position.y = 0.4;
            bodyMesh.castShadow = true;
            bodyMesh.receiveShadow = true;
            moleGroup.add(bodyMesh);

            // Floating 3D Emoji Sprite on top of the cylinder
            const spriteMat = new THREE.SpriteMaterial({ map: emojiTexture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(0, 1.2, 0);
            sprite.scale.set(1.4, 1.4, 1);
            moleGroup.add(sprite);

            scene.add(moleGroup);

            // Track this hole's state
            holes.push({
                index: r * GRID_COLS + c,
                x: posX,
                z: posZ,
                group: moleGroup,
                state: 'inactive', // inactive, rising, active, retracting
                progress: 0, // 0 to 1
                type: null, // 'good' or 'bad'
                quote: '',
                bubbleEl: null,
                spawnTime: 0,
                stayDuration: 4000 // Milliseconds it stays up
            });
        }
    }
}

// Position responsive corrections
function onWindowResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Web UI Popups helper for whacks
function createFloatingScore(x, y, text, type) {
    const pop = document.createElement('div');
    pop.className = `whack-score-popup ${type === 'good' ? 'score-positive' : 'score-negative'}`;
    pop.textContent = text;
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    container.appendChild(pop);
    setTimeout(() => pop.remove(), 800);
}

// Raycasting for touch click whacking
function performWhack(mouseX, mouseY, clientX, clientY) {
    if (!isPlaying) return;

    // Map screen mouse vector
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((mouseX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((mouseY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Collect all mole groups
    const targets = [];
    holes.forEach(h => {
        if (h.state === 'active' || h.state === 'rising') {
            // Include descendants so we intersect the cylinder body
            targets.push(...h.group.children);
        }
    });

    const intersects = raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
        // Find which hole was whacked
        const hitObject = intersects[0].object;
        let hitGroup = hitObject.parent;
        // Ensure we find the top parent Group representing the mole
        while (hitGroup && hitGroup.parent !== scene) {
            hitGroup = hitGroup.parent;
        }

        const hole = holes.find(h => h.group === hitGroup);
        if (hole) {
            triggerWhack(hole, clientX - rect.left, clientY - rect.top);
        }
    }
}

function onWhack(e) {
    performWhack(e.clientX, e.clientY, e.clientX, e.clientY);
}

function onTouchWhack(e) {
    if (e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        performWhack(touch.clientX, touch.clientY, touch.clientX, touch.clientY);
    }
}

// Whack Response Action
function triggerWhack(hole, screenX, screenY) {
    hole.state = 'retracting';
    
    // Remove text bubble immediately
    if (hole.bubbleEl) {
        hole.bubbleEl.remove();
        hole.bubbleEl = null;
    }

    if (hole.type === 'bad') {
        // Correctly whacked a bad AI
        score += 100;
        hudScore.textContent = score;
        playSound('whack-bad');
        createFloatingScore(screenX, screenY, '+100', 'good');
    } else {
        // Incorrectly whacked a good/aligned AI
        score = Math.max(0, score - 200);
        health = Math.max(0, health - 20);
        hudScore.textContent = score;
        updateHealthBar();
        playSound('whack-good');
        createFloatingScore(screenX, screenY, '-200 Penalty!', 'bad');
        
        if (health <= 0) {
            endGame('integrity');
        }
    }
}

// Update UI Health Bar state
function updateHealthBar() {
    hudHealthBar.style.width = `${health}%`;
    if (health > 60) {
        hudHealthBar.style.background = 'linear-gradient(90deg, #3b82f6, #10b981)';
    } else if (health > 30) {
        hudHealthBar.style.background = 'linear-gradient(90deg, #f59e0b, #eab308)';
    } else {
        hudHealthBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    }
}

// Game Core Loops
function startGame() {
    if (isPlaying) return;
    
    // Reset scores
    score = 0;
    health = 100;
    timeLeft = 60;
    speedFactor = 1.0;
    hudScore.textContent = score;
    updateHealthBar();
    hudTime.textContent = timeLeft;

    // Reset active elements
    holes.forEach(h => {
        h.state = 'inactive';
        h.group.position.y = 3.1 - 0.7;
        if (h.bubbleEl) {
            h.bubbleEl.remove();
            h.bubbleEl = null;
        }
    });

    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    isPlaying = true;
    playSound('start');

    // Start Timer intervals
    gameTimerInterval = setInterval(() => {
        if (!isPlaying) return;
        timeLeft--;
        hudTime.textContent = timeLeft;

        // Increase difficulty gradually
        speedFactor = 1.0 + (60 - timeLeft) * 0.02;

        if (timeLeft <= 0) {
            endGame('time');
        }
    }, 1000);

    // Spawn moles loop
    spawnLoop();
}

function spawnLoop() {
    if (!isPlaying) return;

    const delay = Math.max(800, 2000 - (score * 0.5));
    spawnInterval = setTimeout(() => {
        spawnMole();
        spawnLoop();
    }, delay / speedFactor);
}

function spawnMole() {
    // Find all inactive holes
    const available = holes.filter(h => h.state === 'inactive');
    if (available.length === 0) return;

    const hole = available[Math.floor(Math.random() * available.length)];
    
    // Choose randomly good (50%) or bad (50%)
    hole.type = Math.random() < 0.5 ? 'good' : 'bad';
    
    // Fetch quotes list
    const source = hole.type === 'good' ? goodQuotes : badQuotes;
    hole.quote = source[Math.floor(Math.random() * source.length)];
    
    hole.state = 'rising';
    hole.progress = 0;
    hole.spawnTime = Date.now();
    // Tighter windows as score climbs
    hole.stayDuration = Math.max(1500, 3500 - (score * 0.4));

    // Create Chat Box element
    const bubble = document.createElement('div');
    bubble.className = 'mole-bubble';
    bubble.textContent = hole.quote;
    bubblesContainer.appendChild(bubble);
    hole.bubbleEl = bubble;
}

function endGame(reason) {
    isPlaying = false;
    clearInterval(gameTimerInterval);
    clearTimeout(spawnInterval);

    // Play final tally sound logic
    if (reason === 'time') {
        gameOverReason.textContent = "Time's up! You successfully defended the server system.";
    } else {
        gameOverReason.textContent = "System Overloaded! Rogue AI quotes corrupted your databases.";
    }

    // Save highscore
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('ai_whack_a_mole_highscore', highscore);
        highscoreDisplay.textContent = highscore;
    }

    finalScoreVal.textContent = score;
    gameOverScreen.classList.remove('hidden');
    hud.classList.add('hidden');

    // Clean up DOM bubbles
    holes.forEach(h => {
        if (h.bubbleEl) {
            h.bubbleEl.remove();
            h.bubbleEl = null;
        }
    });
}

// Interpolations & Sync for 3D engine objects
function updatePhysics(delta) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    const tempV = new THREE.Vector3();

    holes.forEach(h => {
        if (h.state === 'inactive') return;

        // Animate Y position based on states
        if (h.state === 'rising') {
            h.progress += delta * 4 * speedFactor;
            if (h.progress >= 1) {
                h.progress = 1;
                h.state = 'active';
                h.spawnTime = Date.now();
            }
        } else if (h.state === 'active') {
            // Stay up for designated duration
            if (Date.now() - h.spawnTime > h.stayDuration) {
                h.state = 'retracting';
                h.progress = 1;
                
                // If it was a bad AI and escaped, subtract health!
                if (h.type === 'bad' && isPlaying) {
                    health = Math.max(0, health - 15);
                    updateHealthBar();
                    playSound('escape');
                    if (health <= 0) {
                        endGame('integrity');
                    }
                }
            }
        } else if (h.state === 'retracting') {
            h.progress -= delta * 5 * speedFactor;
            if (h.progress <= 0) {
                h.progress = 0;
                h.state = 'inactive';
                if (h.bubbleEl) {
                    h.bubbleEl.remove();
                    h.bubbleEl = null;
                }
            }
        }

        // Apply visual Y heights
        // Emerge by 0.7 units above hole level (Y: 3.1)
        const holeBaseY = 3.1 - 0.7;
        h.group.position.y = holeBaseY + (h.progress * 0.75);

        // Sync HTML text bubble over 3D Mole position
        if (h.bubbleEl) {
            // Project mole top coord to 2D
            tempV.set(h.x, h.group.position.y + 1.25, h.z);
            tempV.project(camera);

            const x = (tempV.x * 0.5 + 0.5) * width;
            const y = (tempV.y * -0.5 + 0.5) * height;

            h.bubbleEl.style.left = `${x}px`;
            h.bubbleEl.style.top = `${y}px`;
            
            // Fade out when retracting
            if (h.state === 'retracting') {
                h.bubbleEl.style.opacity = h.progress;
            }
        }
    });
}

// Frame Render Loop
let clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    
    // Cap delta at 0.1s to prevent giant jumps when switching tabs
    const delta = Math.min(clock.getDelta(), 0.1);
    
    // Slowly rotate the camera slightly for dynamic look or keep stable
    if (scene) {
        updatePhysics(delta);
        renderer.render(scene, camera);
    }
}

// Hook start button
document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', () => {
    if (quotesLoaded) startGame();
});
document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', () => {
    if (quotesLoaded) startGame();
});
document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    isPlaying = true;
});
document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', () => {
    startGame();
});

// ESC or P key listener for pauses
window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (isPlaying) {
            isPlaying = false;
            pauseScreen.classList.remove('hidden');
        } else if (pauseScreen.classList.contains('hidden') === false) {
            pauseScreen.classList.add('hidden');
            isPlaying = true;
        }
    }
});

// Run Init sequence
loadQuotes().then(() => {
    init3D();
    animate();
});
