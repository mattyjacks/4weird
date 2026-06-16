// Temple of Lost Revenue - Three.js Game

let scene, camera, renderer, clock;
let player;
let mazeBlocks = [];
let items = [];
let collectedCount = 0;
const totalItems = 5;
let revenue = 0;
let gameActive = false;

// Maze grid map: 1 = wall, 0 = path, 2 = item
const mazeGrid = [
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,2,1],
    [1,0,1,0,1,0,1,1,1,0,1],
    [1,2,1,0,0,0,0,0,1,0,1],
    [1,1,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,2,1,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,2,1],
    [1,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,0,1,0,1,1,1],
    [1,2,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1]
];
const gridRows = mazeGrid.length;
const gridCols = mazeGrid[0].length;
const cellSize = 3;

// Player grid position
let playerGridPos = { r: 1, c: 1 };

// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const leadsSpan = document.getElementById('game-leads');
const revSpan = document.getElementById('game-rev');
const finalRevSpan = document.getElementById('final-rev-val');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0805);
    scene.fog = new THREE.FogExp2(0x0e0805, 0.04);

    camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 100);
    // Position camera for an isometric overview look
    camera.position.set(0, 18, 15);
    
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffb74d, 0.8);
    dirLight.position.set(10, 25, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Build the 3D maze
    buildMaze();

    // Create player representation (Blue Cat)
    createPlayer();

    // Listeners
    window.addEventListener('keydown', onKeyDown);
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}

function buildMaze() {
    // Shared geometries and materials
    const wallGeo = new THREE.BoxGeometry(cellSize, 4, cellSize);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2e1f15, roughness: 0.9, metalness: 0.1 });
    
    const floorGeo = new THREE.BoxGeometry(cellSize, 0.2, cellSize);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.8 });

    const itemGeo = new THREE.OctahedronGeometry(0.5);
    const itemMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, emissive: 0x553300, shininess: 100 });

    const startX = -(gridCols * cellSize) / 2 + cellSize / 2;
    const startZ = -(gridRows * cellSize) / 2 + cellSize / 2;

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const posX = startX + c * cellSize;
            const posZ = startZ + r * cellSize;

            // Always place a floor
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.position.set(posX, -0.1, posZ);
            floor.receiveShadow = true;
            scene.add(floor);

            if (mazeGrid[r][c] === 1) {
                // Wall column
                const wall = new THREE.Mesh(wallGeo, wallMat);
                wall.position.set(posX, 2, posZ);
                wall.castShadow = true;
                wall.receiveShadow = true;
                scene.add(wall);
                mazeBlocks.push(wall);
            } else if (mazeGrid[r][c] === 2) {
                // Collectible CRM data/lost revenue
                const item = new THREE.Mesh(itemGeo, itemMat);
                item.position.set(posX, 1.0, posZ);
                scene.add(item);
                items.push({ mesh: item, gridR: r, gridC: c });
            }
        }
    }
}

function createPlayer() {
    player = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 80 });
    const bodyGeo = new THREE.BoxGeometry(1.0, 0.8, 0.8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    player.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0.4, 0.8, 0);
    player.add(head);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.12, 0.35, 4);
    const leftEar = new THREE.Mesh(earGeo, bodyMat);
    leftEar.position.set(0.4, 1.2, 0.2);
    leftEar.rotation.z = -0.2;
    const rightEar = leftEar.clone();
    rightEar.position.z = -0.2;
    player.add(leftEar);
    player.add(rightEar);

    updatePlayerWorldPosition();
    scene.add(player);
}

function updatePlayerWorldPosition() {
    const startX = -(gridCols * cellSize) / 2 + cellSize / 2;
    const startZ = -(gridRows * cellSize) / 2 + cellSize / 2;
    player.position.set(startX + playerGridPos.c * cellSize, 0, startZ + playerGridPos.r * cellSize);
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
    // Re-create items if some were collected
    items.forEach(it => scene.remove(it.mesh));
    items = [];
    collectedCount = 0;
    revenue = 0;
    playerGridPos = { r: 1, c: 1 };
    updatePlayerWorldPosition();

    const itemGeo = new THREE.OctahedronGeometry(0.5);
    const itemMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, emissive: 0x553300, shininess: 100 });
    const startX = -(gridCols * cellSize) / 2 + cellSize / 2;
    const startZ = -(gridRows * cellSize) / 2 + cellSize / 2;

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            if (mazeGrid[r][c] === 2) {
                const item = new THREE.Mesh(itemGeo, itemMat);
                item.position.set(startX + c * cellSize, 1.0, startZ + r * cellSize);
                scene.add(item);
                items.push({ mesh: item, gridR: r, gridC: c });
            }
        }
    }

    leadsSpan.textContent = '0/5';
    revSpan.textContent = '$0';
    startGame();
}

function movePlayer(dr, dc) {
    if (!gameActive) return;
    const targetR = playerGridPos.r + dr;
    const targetC = playerGridPos.c + dc;

    // Check boundary & walls
    if (targetR >= 0 && targetR < gridRows && targetC >= 0 && targetC < gridCols) {
        if (mazeGrid[targetR][targetC] !== 1) {
            playerGridPos.r = targetR;
            playerGridPos.c = targetC;
            
            // Adjust player rotation to face movement direction
            if (dr === 0 && dc > 0) player.rotation.y = 0;
            else if (dr === 0 && dc < 0) player.rotation.y = Math.PI;
            else if (dr > 0 && dc === 0) player.rotation.y = -Math.PI / 2;
            else if (dr < 0 && dc === 0) player.rotation.y = Math.PI / 2;

            updatePlayerWorldPosition();
            checkItemCollection();
        }
    }
}

function checkItemCollection() {
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (item.gridR === playerGridPos.r && item.gridC === playerGridPos.c) {
            scene.remove(item.mesh);
            items.splice(i, 1);
            collectedCount++;
            revenue += 500;

            leadsSpan.textContent = `${collectedCount}/5`;
            revSpan.textContent = `$${revenue}`;

            if (collectedCount >= totalItems) {
                winGame();
            }
        }
    }
}

function winGame() {
    gameActive = false;
    endTitle.textContent = "Temple Cleared!";
    endDesc.textContent = "All lost revenue and missing CRM deals have been recovered.";
    finalRevSpan.textContent = '$' + revenue;
    gameOverScreen.classList.remove('hidden');
}

function onKeyDown(e) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') movePlayer(-1, 0);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') movePlayer(1, 0);
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') movePlayer(0, -1);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') movePlayer(0, 1);
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else resumeGame();
    }
}

function onWindowResize() {
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
}

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        // Spin items
        items.forEach(it => {
            it.mesh.rotation.y += 0.05;
            it.mesh.position.y = 1.0 + Math.sin(Date.now() * 0.005) * 0.1;
        });

        // Smooth camera follow
        const targetCamPos = new THREE.Vector3(player.position.x, player.position.y + 12, player.position.z + 10);
        camera.position.lerp(targetCamPos, 0.05);
        camera.lookAt(player.position);
    }

    renderer.render(scene, camera);
}
