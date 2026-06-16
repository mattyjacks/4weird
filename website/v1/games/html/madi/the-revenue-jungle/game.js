// The Revenue Jungle - Three.js Game

// Game variables
let scene, camera, renderer, clock;
let blueCat, greenCat;
let floorTiles = [];
let obstacles = [];
let coins = [];
let score = 0;
let revenue = 0;
let gameActive = false;
let isJumping = false;
let jumpVelocity = 0;
const gravity = -35;
const playerX = -6;
let speedMultiplier = 1.0;

// Materials
let vineMaterial, quicksandMaterial, coinMaterial;

// DOM elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const scoreSpan = document.getElementById('game-score');
const revenueSpan = document.getElementById('game-revenue');
const finalScoreSpan = document.getElementById('final-score-val');
const finalRevSpan = document.getElementById('final-rev-val');

// Initialize Game
init();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070f);
    scene.fog = new THREE.FogExp2(0x05070f, 0.015);

    // Camera setup
    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 1000);
    camera.position.set(0, 4, 15);
    camera.lookAt(new THREE.Vector3(-2, 1, 0));

    // Renderer setup
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Point light to create glowing atmosphere
    const glowLight = new THREE.PointLight(0x34d399, 1.5, 30);
    glowLight.position.set(0, 5, 0);
    scene.add(glowLight);

    // Define materials
    vineMaterial = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x551111, shininess: 30 }); // Manual Processes
    quicksandMaterial = new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x331100, flatShading: true }); // Bad Data
    coinMaterial = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x553300, shininess: 80 }); // Revenue Coin

    // Create environment
    createJungleFloor();

    // Create Mascots
    createMascots();

    // Event listeners
    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('click', jump);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        jump();
    }, { passive: false });
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    // Resize handling
    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    // Start rendering loop
    animate();
}

function createJungleFloor() {
    // Create segment blocks that will slide under player
    for (let i = 0; i < 5; i++) {
        const floorGeo = new THREE.BoxGeometry(40, 1, 15);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x111c12, roughness: 0.8 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(i * 40 - 20, -0.5, 0);
        floor.receiveShadow = true;
        scene.add(floor);
        floorTiles.push(floor);

        // Add foliage/trees on the sides for jungle aesthetic
        for (let j = 0; j < 6; j++) {
            const treeGeo = new THREE.ConeGeometry(1.5, 6, 5);
            const treeMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9 });
            const tree = new THREE.Mesh(treeGeo, treeMat);
            tree.position.set(i * 40 - 20 + (Math.random() * 30 - 15), 3, (j % 2 === 0 ? 5 : -5) + (Math.random() * 2 - 1));
            scene.add(tree);
            floor.add(tree); // link foliage to floor tile for automatic movement
        }
    }
}

function createMascots() {
    // 1. Blue Cat (Action - Runs on floor)
    const blueGroup = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    const blueMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 50 });
    const body = new THREE.Mesh(bodyGeo, blueMat);
    body.position.y = 0.4;
    blueGroup.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const head = new THREE.Mesh(headGeo, blueMat);
    head.position.set(0.6, 0.9, 0);
    blueGroup.add(head);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const leftEar = new THREE.Mesh(earGeo, blueMat);
    leftEar.position.set(0.6, 1.4, 0.25);
    leftEar.rotation.z = -0.2;
    const rightEar = leftEar.clone();
    rightEar.position.z = -0.25;
    blueGroup.add(leftEar);
    blueGroup.add(rightEar);

    blueGroup.position.set(playerX, 0, 0);
    scene.add(blueGroup);
    blueCat = blueGroup;

    // 2. Green Cat (Intelligence - Flies ahead)
    const greenGroup = new THREE.Group();
    const greenMat = new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x022c22, shininess: 50 });
    
    // Body
    const gBodyGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const gBody = new THREE.Mesh(gBodyGeo, greenMat);
    greenGroup.add(gBody);

    // visor/AI eye
    const visorGeo = new THREE.BoxGeometry(0.3, 0.15, 0.6);
    const visorMat = new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x06b6d4 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0.2, 0.1, 0);
    greenGroup.add(visor);

    // Floating wing rings
    const ringGeo = new THREE.TorusGeometry(0.5, 0.05, 8, 24);
    const ring = new THREE.Mesh(ringGeo, greenMat);
    ring.rotation.x = Math.PI / 2;
    greenGroup.add(ring);

    greenGroup.position.set(playerX + 3, 2.5, 0);
    scene.add(greenGroup);
    greenCat = greenGroup;
}

function spawnObstacle() {
    const r = Math.random();
    if (r < 0.5) {
        // Spawn vine obstacle (Manual Processes)
        const obstacleGeo = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);
        const vine = new THREE.Mesh(obstacleGeo, vineMaterial);
        vine.position.set(30, 1.5, 0);
        scene.add(vine);
        obstacles.push({ mesh: vine, type: 'vine', label: 'Manual Processes' });
    } else {
        // Spawn Quicksand (Bad Data)
        const obstacleGeo = new THREE.BoxGeometry(3, 0.2, 3);
        const quicksand = new THREE.Mesh(obstacleGeo, quicksandMaterial);
        quicksand.position.set(30, 0.05, 0);
        scene.add(quicksand);
        obstacles.push({ mesh: quicksand, type: 'quicksand', label: 'Bad Data' });
    }

    // Spawn Coin along with it
    const coinGeo = new THREE.TorusGeometry(0.4, 0.1, 8, 16);
    const coin = new THREE.Mesh(coinGeo, coinMaterial);
    coin.position.set(30, Math.random() > 0.5 ? 2.8 : 1.2, 0);
    coin.rotation.y = Math.PI / 2;
    scene.add(coin);
    coins.push(coin);
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameActive = true;
    clock.getDelta(); // reset clock
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
    // Clear old elements
    obstacles.forEach(o => scene.remove(o.mesh));
    coins.forEach(c => scene.remove(c));
    obstacles = [];
    coins = [];

    score = 0;
    revenue = 0;
    speedMultiplier = 1.0;
    blueCat.position.y = 0;
    isJumping = false;
    jumpVelocity = 0;
    
    scoreSpan.textContent = '0';
    revenueSpan.textContent = '$0';

    startGame();
}

function jump() {
    if (!gameActive || isJumping) return;
    isJumping = true;
    jumpVelocity = 14;
}

function onKeyDown(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
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

function checkCollision(box1, box2) {
    return box1.intersectsBox(box2);
}

function endGame() {
    gameActive = false;
    finalScoreSpan.textContent = Math.floor(score);
    finalRevSpan.textContent = '$' + revenue;
    gameOverScreen.classList.remove('hidden');
}

let spawnTimer = 0;

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = clock.getDelta();
        const baseSpeed = 12 * speedMultiplier * delta;

        // Increase difficulty slightly over time
        speedMultiplier += 0.01 * delta;

        // 1. Move Jungle Floor (infinite scroll)
        floorTiles.forEach(tile => {
            tile.position.x -= baseSpeed;
            if (tile.position.x < -30) {
                tile.position.x += 200; // warp to end
            }
        });

        // 2. Mascot jumping physics
        if (isJumping) {
            blueCat.position.y += jumpVelocity * delta;
            jumpVelocity += gravity * delta;
            if (blueCat.position.y <= 0) {
                blueCat.position.y = 0;
                isJumping = false;
            }
        }

        // Green Cat hovering
        greenCat.position.y = 2.5 + Math.sin(Date.now() * 0.005) * 0.3;
        // Minor forward/backward movement
        greenCat.position.x = playerX + 3 + Math.sin(Date.now() * 0.002) * 0.5;

        // 3. Obstacle management
        spawnTimer += delta;
        if (spawnTimer > (1.8 / speedMultiplier)) {
            spawnObstacle();
            spawnTimer = 0;
        }

        // Bounding box for player
        const playerBox = new THREE.Box3().setFromObject(blueCat);

        // Update obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.mesh.position.x -= baseSpeed;
            
            // Spin/float obstacles
            if (obs.type === 'vine') {
                obs.mesh.rotation.y += delta;
            }

            // Check Collision
            const obsBox = new THREE.Box3().setFromObject(obs.mesh);
            if (checkCollision(playerBox, obsBox)) {
                endGame();
            }

            // Clean up out of bounds
            if (obs.mesh.position.x < -15) {
                scene.remove(obs.mesh);
                obstacles.splice(i, 1);
            }
        }

        // Update coins
        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            coin.position.x -= baseSpeed;
            coin.rotation.z += delta * 2;

            // Check Coin Collection
            const coinBox = new THREE.Box3().setFromObject(coin);
            if (checkCollision(playerBox, coinBox)) {
                revenue += 100;
                revenueSpan.textContent = '$' + revenue;
                scene.remove(coin);
                coins.splice(i, 1);
                continue;
            }

            if (coin.position.x < -15) {
                scene.remove(coin);
                coins.splice(i, 1);
            }
        }

        // Update Score
        score += delta * 15;
        scoreSpan.textContent = Math.floor(score);
    }

    renderer.render(scene, camera);
}
