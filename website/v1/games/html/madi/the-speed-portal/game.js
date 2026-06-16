// The Speed Portal - Three.js Game

let scene, camera, renderer, clock;
let player;
let tunnelRings = [];
let obstacles = [];
let items = [];
let distance = 0;
let boosts = 0;
let gameActive = false;

// Racer parameters
let playerAngle = 0; // angle in radians around the tunnel center
const tunnelRadius = 4.0;
let speed = 25.0;
let rotateDir = 0; // -1 = Left, 1 = Right
const rotationSpeed = 4.5;

// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const distSpan = document.getElementById('game-dist');
const boostsSpan = document.getElementById('game-boosts');
const finalDistSpan = document.getElementById('final-dist-val');

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010308);
    scene.fog = new THREE.FogExp2(0x010308, 0.015);

    camera = new THREE.PerspectiveCamera(70, 800 / 600, 0.1, 150);
    camera.position.set(0, 0, 10);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x06b6d4, 2, 50);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // Create wireframe tunnel segments
    buildTunnel();

    // Create player ship/character
    createPlayerShip();

    // Event listeners
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    // Mobile Virtual controls steering
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    const setLeft = (e) => { e.preventDefault(); rotateDir = -1; };
    const setRight = (e) => { e.preventDefault(); rotateDir = 1; };
    const clearMove = (e) => { e.preventDefault(); rotateDir = 0; };

    btnLeft.addEventListener('mousedown', setLeft);
    btnLeft.addEventListener('touchstart', setLeft);
    btnLeft.addEventListener('mouseup', clearMove);
    btnLeft.addEventListener('touchend', clearMove);
    btnLeft.addEventListener('mouseleave', clearMove);

    btnRight.addEventListener('mousedown', setRight);
    btnRight.addEventListener('touchstart', setRight);
    btnRight.addEventListener('mouseup', clearMove);
    btnRight.addEventListener('touchend', clearMove);
    btnRight.addEventListener('mouseleave', clearMove);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}

function buildTunnel() {
    // Generate rings down the Z axis
    const ringGeo = new THREE.TorusGeometry(tunnelRadius, 0.05, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.4 });

    for (let i = 0; i < 20; i++) {
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, 0, -i * 10);
        scene.add(ring);
        tunnelRings.push(ring);
    }
}

function createPlayerShip() {
    player = new THREE.Group();

    // Jet body
    const bodyGeo = new THREE.ConeGeometry(0.3, 1.2, 4);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 100 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2; // point forward
    player.add(body);

    // AI sphere (Green Cat passenger)
    const passengerGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const passengerMat = new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x052e16 });
    const passenger = new THREE.Mesh(passengerGeo, passengerMat);
    passenger.position.set(0, 0.2, -0.2);
    player.add(passenger);

    // Placed on tunnel perimeter
    updatePlayerPosition();
    scene.add(player);
}

function updatePlayerPosition() {
    const x = Math.cos(playerAngle) * tunnelRadius;
    const y = Math.sin(playerAngle) * tunnelRadius;
    player.position.set(x, y, 0);
    // Rotate to align with tunnel wall tangent
    player.rotation.z = playerAngle - Math.PI / 2;
}

function spawnObstacle() {
    const obstacleGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const obstacleMat = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x7f1d1d });
    const obstacle = new THREE.Mesh(obstacleGeo, obstacleMat);

    // Choose random angle sector (0, 90, 180, 270 deg approx)
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * tunnelRadius;
    const y = Math.sin(angle) * tunnelRadius;
    obstacle.position.set(x, y, -120);
    scene.add(obstacle);
    obstacles.push({ mesh: obstacle, angle: angle });

    // Spawn green speed ring
    if (Math.random() > 0.4) {
        const ringGeo = new THREE.TorusGeometry(0.6, 0.1, 8, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        const ringAngle = angle + Math.PI / 2; // offset from obstacle
        ring.position.set(Math.cos(ringAngle) * tunnelRadius, Math.sin(ringAngle) * tunnelRadius, -100);
        scene.add(ring);
        items.push({ mesh: ring, angle: ringAngle });
    }
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameActive = true;
    clock.getDelta();
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
    obstacles.forEach(o => scene.remove(o.mesh));
    items.forEach(it => scene.remove(it.mesh));
    obstacles = [];
    items = [];
    playerAngle = 0;
    distance = 0;
    boosts = 0;
    speed = 25.0;

    distSpan.textContent = '0m';
    boostsSpan.textContent = '0';
    updatePlayerPosition();
    startGame();
}

function onKeyDown(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') rotateDir = -1;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') rotateDir = 1;
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else resumeGame();
    }
}

function onKeyUp(e) {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && rotateDir === -1) rotateDir = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && rotateDir === 1) rotateDir = 0;
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
    finalDistSpan.textContent = Math.floor(distance) + 'm';
    gameOverScreen.classList.remove('hidden');
}

let spawnTimer = 0;

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = clock.getDelta();

        // 1. Player angle rotation
        playerAngle += rotateDir * rotationSpeed * delta;
        updatePlayerPosition();

        // 2. Spawn scheduling
        spawnTimer += delta;
        if (spawnTimer > 1.2) {
            spawnObstacle();
            spawnTimer = 0;
        }

        // 3. Move Tunnel rings
        tunnelRings.forEach(ring => {
            ring.position.z += speed * delta;
            if (ring.position.z > 10) {
                ring.position.z -= 200;
            }
        });

        // 4. Obstacles update
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.mesh.position.z += speed * delta;
            obs.mesh.rotation.x += delta;
            obs.mesh.rotation.y += delta;

            // Check collision when Z is close
            if (Math.abs(obs.mesh.position.z) < 1.0) {
                // Compute angular delta
                let angleDiff = Math.abs(obs.angle - playerAngle) % (Math.PI * 2);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                if (angleDiff < 0.5) {
                    endGame();
                }
            }

            if (obs.mesh.position.z > 15) {
                scene.remove(obs.mesh);
                obstacles.splice(i, 1);
            }
        }

        // 5. Items update
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.mesh.position.z += speed * delta;

            if (Math.abs(it.mesh.position.z) < 1.0) {
                let angleDiff = Math.abs(it.angle - playerAngle) % (Math.PI * 2);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                if (angleDiff < 0.6) {
                    boosts++;
                    boostsSpan.textContent = boosts;
                    // Trigger flash boost effect
                    speed += 10.0;
                    setTimeout(() => { speed = Math.max(25.0, speed - 10.0); }, 500);
                    scene.remove(it.mesh);
                    items.splice(i, 1);
                    continue;
                }
            }

            if (it.mesh.position.z > 15) {
                scene.remove(it.mesh);
                items.splice(i, 1);
            }
        }

        // 6. Update Distance meter
        distance += speed * delta;
        distSpan.textContent = Math.floor(distance) + 'm';
    }

    renderer.render(scene, camera);
}
