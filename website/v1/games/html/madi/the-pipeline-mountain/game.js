// The Pipeline Mountain - Three.js Game

let scene, camera, renderer, clock;
let player;
let platforms = [];
let items = [];
let altitude = 0;
let medals = 0;
let gameActive = false;

// Physics parameters
let playerY = 0;
let playerX = 0;
let velocityY = 0;
const gravity = -20;
const jumpForce = 12;
const horizontalSpeed = 8;
let moveDirection = 0; // -1 = Left, 1 = Right

// DOM elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const altSpan = document.getElementById('game-alt');
const medalsSpan = document.getElementById('game-medals');
const finalAltSpan = document.getElementById('final-alt-val');

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040814);
    scene.fog = new THREE.FogExp2(0x040814, 0.02);

    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 5, 12);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1);
    dirLight.position.set(5, 20, 5);
    scene.add(dirLight);

    // Initial setups
    createPlayer();
    generatePlatforms(0, 30);

    // Event listeners
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}

function createPlayer() {
    player = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 80 });
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    player.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.0, 0);
    player.add(head);

    scene.add(player);
}

function generatePlatforms(startY, count) {
    const platformGeo = new THREE.BoxGeometry(3, 0.4, 2);
    const spreadsheetMat = new THREE.MeshStandardMaterial({ color: 0xef4444 }); // red warning
    const systemMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 }); // neon blue platform
    const itemGeo = new THREE.TorusGeometry(0.3, 0.08, 8, 16);
    const itemMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x553300 });

    for (let i = 0; i < count; i++) {
        const y = startY + i * 3.5 + 2;
        const x = (Math.random() * 8) - 4; // limit range -4 to 4
        
        // Randomize platform type
        const isSpreadsheet = Math.random() > 0.85;
        const platform = new THREE.Mesh(platformGeo, isSpreadsheet ? spreadsheetMat : systemMat);
        platform.position.set(x, y, 0);
        scene.add(platform);
        platforms.push({ mesh: platform, type: isSpreadsheet ? 'spreadsheet' : 'system' });

        // Add medal item on some platforms
        if (Math.random() > 0.5) {
            const item = new THREE.Mesh(itemGeo, itemMat);
            item.position.set(x, y + 0.8, 0);
            scene.add(item);
            items.push(item);
        }
    }
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameActive = true;
}

function pauseGame() {
    if (!gameActive) return;
    gameActive = false;
    pauseScreen.classList.remove('hidden');
}

function resumeGame() {
    pauseScreen.classList.add('hidden');
    gameActive = true;
}

function resetGame() {
    // Clear old assets
    platforms.forEach(p => scene.remove(p.mesh));
    items.forEach(it => scene.remove(it));
    platforms = [];
    items = [];

    playerX = 0;
    playerY = 0;
    velocityY = 0;
    altitude = 0;
    medals = 0;

    altSpan.textContent = '0m';
    medalsSpan.textContent = '0';

    generatePlatforms(0, 30);
    startGame();
}

function onKeyDown(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveDirection = -1;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') moveDirection = 1;
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else resumeGame();
    }
}

function onKeyUp(e) {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && moveDirection === -1) moveDirection = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && moveDirection === 1) moveDirection = 0;
}

function onWindowResize() {
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
}

function endGame() {
    gameActive = false;
    finalAltSpan.textContent = Math.floor(altitude) + 'm';
    gameOverScreen.classList.remove('hidden');
}

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = clock.getDelta();

        // Left/Right control
        playerX += moveDirection * horizontalSpeed * delta;
        // Keep inside bounds
        playerX = Math.max(-5, Math.min(5, playerX));

        // Jump physics
        playerY += velocityY * delta;
        velocityY += gravity * delta;

        // Auto jump when falling and hitting a platform
        if (velocityY < 0) {
            const playerBox = new THREE.Box3().setFromObject(player);
            for (let i = 0; i < platforms.length; i++) {
                const plat = platforms[i];
                const platBox = new THREE.Box3().setFromObject(plat.mesh);
                if (playerBox.intersectsBox(platBox)) {
                    // Land on platform
                    playerY = plat.mesh.position.y + 0.2;
                    velocityY = jumpForce;

                    if (plat.type === 'spreadsheet') {
                        // Bad platform: lower jump force
                        velocityY = jumpForce * 0.5;
                    }
                    break;
                }
            }
        }

        // Apply positions
        player.position.set(playerX, playerY, 0);

        // Check medal collection
        const playerBox = new THREE.Box3().setFromObject(player);
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.rotation.y += delta * 2;
            const itBox = new THREE.Box3().setFromObject(it);
            if (playerBox.intersectsBox(itBox)) {
                medals++;
                medalsSpan.textContent = medals;
                scene.remove(it);
                items.splice(i, 1);
            }
        }

        // Generate more platforms ahead
        const highestPlatform = platforms[platforms.length - 1];
        if (highestPlatform && highestPlatform.mesh.position.y - playerY < 20) {
            generatePlatforms(highestPlatform.mesh.position.y, 15);
        }

        // Lose condition: falling past camera view
        if (playerY < camera.position.y - 8) {
            endGame();
        }

        // Update score/altitude
        if (playerY > altitude) {
            altitude = playerY;
            altSpan.textContent = Math.floor(altitude) + 'm';
        }

        // Smooth camera follow
        const targetCamY = playerY + 2;
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.1);
    }

    renderer.render(scene, camera);
}
