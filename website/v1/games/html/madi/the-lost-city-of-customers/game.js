// The Lost City of Customers - Three.js Game

let scene, camera, renderer;
let terrainTiles = [];
let targets = [];
let scanWave = null;
let foundCount = 0;
let totalScans = 0;
let gameActive = false;

// Grid layout parameters
const rows = 8;
const cols = 8;
const size = 2;

// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const foundSpan = document.getElementById('found-count');
const scanSpan = document.getElementById('scan-count');

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020a07);
    scene.fog = new THREE.FogExp2(0x020a07, 0.03);

    camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 100);
    camera.position.set(0, 15, 12);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x10b981, 1);
    dirLight.position.set(5, 15, 5);
    scene.add(dirLight);

    buildTerrain();
    placeHiddenTargets();

    // Interaction Setup
    canvas.addEventListener('click', onCanvasClick);
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}

function buildTerrain() {
    const tileGeo = new THREE.BoxGeometry(size * 0.95, 0.5, size * 0.95);
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9 });

    const startX = -(cols * size) / 2 + size / 2;
    const startZ = -(rows * size) / 2 + size / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tile = new THREE.Mesh(tileGeo, tileMat);
            const py = (Math.random() * 0.3); // uneven terrain
            tile.position.set(startX + c * size, py, startZ + r * size);
            scene.add(tile);
            terrainTiles.push(tile);
        }
    }
}

function placeHiddenTargets() {
    const targetGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const targetMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x553c00, shininess: 80 });

    const gridIndices = [];
    for (let i = 0; i < terrainTiles.length; i++) {
        gridIndices.push(i);
    }

    // Pick 5 random unique tiles
    for (let k = 0; k < 5; k++) {
        const randIdx = Math.floor(Math.random() * gridIndices.length);
        const tileIdx = gridIndices.splice(randIdx, 1)[0];
        const tile = terrainTiles[tileIdx];

        const targetMesh = new THREE.Mesh(targetGeo, targetMat);
        targetMesh.position.set(tile.position.x, tile.position.y + 0.5, tile.position.z);
        targetMesh.visible = false; // Hidden at first
        scene.add(targetMesh);
        targets.push({ mesh: targetMesh, found: false });
    }
}

function onCanvasClick(event) {
    if (!gameActive) return;

    // Raycast to find click point on terrain
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1,
        -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(terrainTiles);

    if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        triggerScanPulse(hitPoint);
    }
}

function triggerScanPulse(point) {
    totalScans++;
    scanSpan.textContent = totalScans;

    // Create scan wave representation
    if (scanWave) scene.remove(scanWave);
    
    const ringGeo = new THREE.RingGeometry(0.1, 0.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    scanWave = new THREE.Mesh(ringGeo, ringMat);
    scanWave.rotation.x = -Math.PI / 2;
    scanWave.position.set(point.x, point.y + 0.1, point.z);
    scene.add(scanWave);

    // Check distance to all targets
    targets.forEach(t => {
        if (!t.found) {
            const dist = t.mesh.position.distanceTo(point);
            if (dist < 3.5) {
                // Inside radar radius: reveal target!
                t.mesh.visible = true;
            }
            if (dist < 1.0) {
                // Close enough to capture!
                t.found = true;
                t.mesh.material.color.setHex(0x10b981); // turn solid green
                foundCount++;
                foundSpan.textContent = `${foundCount}/5`;

                if (foundCount >= 5) {
                    endGame();
                }
            }
        }
    });
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
    targets.forEach(t => scene.remove(t.mesh));
    targets = [];
    if (scanWave) {
        scene.remove(scanWave);
        scanWave = null;
    }
    foundCount = 0;
    totalScans = 0;

    foundSpan.textContent = '0/5';
    scanSpan.textContent = '0';

    placeHiddenTargets();
    startGame();
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
    gameOverScreen.classList.remove('hidden');
}

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        // Expand scan wave if it exists
        if (scanWave) {
            scanWave.scale.x += 0.2;
            scanWave.scale.y += 0.2;
            scanWave.material.opacity -= 0.02;

            if (scanWave.material.opacity <= 0) {
                scene.remove(scanWave);
                scanWave = null;
            }
        }

        // Float/spin revealed targets
        targets.forEach(t => {
            if (t.mesh.visible) {
                t.mesh.rotation.y += 0.02;
                t.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.003) * 0.1;
            }
        });
    }

    renderer.render(scene, camera);
}
