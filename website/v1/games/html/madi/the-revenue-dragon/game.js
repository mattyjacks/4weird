// The Revenue Dragon - Three.js Game

let scene, camera, renderer, clock;
let player;
let dragon;
let beams = [];
let fireballs = [];
let score = 0;
let dragonHP = 100;
let gameActive = false;

// Movement params
let playerX = 0;
let moveDir = 0; // -1 = Left, 1 = Right
const speed = 10.0;
let fireCooldown = 0;

// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const scoreSpan = document.getElementById('game-score');
const finalScoreSpan = document.getElementById('final-score-val');
const dragonHPBar = document.getElementById('dragon-hp-bar');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0202);
    scene.fog = new THREE.FogExp2(0x0a0202, 0.02);

    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 10);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const redLight = new THREE.PointLight(0xef4444, 2, 40);
    redLight.position.set(0, 3, 5);
    scene.add(redLight);

    // Create player cats
    createPlayer();

    // Create the dragon
    createDragon();

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
    const btnFire = document.getElementById('btn-fire');

    const setLeft = (e) => { e.preventDefault(); moveDir = -1; };
    const setRight = (e) => { e.preventDefault(); moveDir = 1; };
    const clearMove = (e) => { e.preventDefault(); moveDir = 0; };

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

    btnFire.addEventListener('click', (e) => {
        e.preventDefault();
        fireBeam();
    });
    btnFire.addEventListener('touchstart', (e) => {
        e.preventDefault();
        fireBeam();
    });

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}

function createPlayer() {
    player = new THREE.Group();

    // Blue Cat body
    const blueMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
    const blueGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const blue = new THREE.Mesh(blueGeo, blueMat);
    blue.position.x = -0.3;
    player.add(blue);

    // Green Cat body
    const greenMat = new THREE.MeshPhongMaterial({ color: 0x10b981 });
    const green = new THREE.Mesh(blueGeo, greenMat);
    green.position.x = 0.3;
    player.add(green);

    player.position.set(0, -4, 0);
    scene.add(player);
}

function createDragon() {
    dragon = new THREE.Group();

    const partGeo = new THREE.BoxGeometry(1.5, 1.2, 1.2);
    const dragMat = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x4a0404, shininess: 80 });

    // Main head segment
    const head = new THREE.Mesh(partGeo, dragMat);
    dragon.add(head);

    // Left wing
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 0.8), dragMat);
    leftWing.position.set(-1.8, 0.3, -0.2);
    dragon.add(leftWing);

    // Right wing
    const rightWing = leftWing.clone();
    rightWing.position.x = 1.8;
    dragon.add(rightWing);

    // Horns
    const hornGeo = new THREE.ConeGeometry(0.2, 0.8, 4);
    const hornMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.5, 0.8, 0);
    const hornR = hornL.clone();
    hornR.position.x = 0.5;
    dragon.add(hornL);
    dragon.add(hornR);

    dragon.position.set(0, 3, 0);
    scene.add(dragon);
}

function fireBeam() {
    if (!gameActive || fireCooldown > 0) return;
    fireCooldown = 0.25; // rate of fire limit

    const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(playerX, -3.5, 0);
    scene.add(beam);
    beams.push(beam);
}

function spawnFireball() {
    const ballGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const ballMat = new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x7c2d12 });
    const ball = new THREE.Mesh(ballGeo, ballMat);

    // Spawn from dragon's horizontal position
    const dx = dragon.position.x + (Math.random() * 2 - 1);
    ball.position.set(dx, 2.5, 0);
    scene.add(ball);
    fireballs.push(ball);
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
    beams.forEach(b => scene.remove(b));
    fireballs.forEach(f => scene.remove(f));
    beams = [];
    fireballs = [];

    playerX = 0;
    score = 0;
    dragonHP = 100;
    dragonHPBar.style.width = '100%';

    scoreSpan.textContent = '0';
    player.position.set(0, -4, 0);
    dragon.position.set(0, 3, 0);

    startGame();
}

function onKeyDown(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveDir = -1;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') moveDir = 1;
    else if (e.code === 'Space') fireBeam();
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else resumeGame();
    }
}

function onKeyUp(e) {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && moveDir === -1) moveDir = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && moveDir === 1) moveDir = 0;
}

function onWindowResize() {
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
}

function endBattle(won) {
    gameActive = false;
    if (won) {
        endTitle.textContent = "Dragon Defeated!";
        endDesc.textContent = "Manual processes cleared. Growth speed unlocked!";
    } else {
        endTitle.textContent = "Defeated";
        endDesc.textContent = "You got caught in the data silos fire.";
    }
    finalScoreSpan.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

let spawnTimer = 0;

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = clock.getDelta();

        // 1. Move player
        playerX += moveDir * speed * delta;
        playerX = Math.max(-5, Math.min(5, playerX));
        player.position.x = playerX;

        // Fire cooldown decrement
        if (fireCooldown > 0) fireCooldown -= delta;

        // 2. Dragon movement (hover back and forth)
        dragon.position.x = Math.sin(Date.now() * 0.002) * 4;

        // Wings flap animation
        const flap = Math.sin(Date.now() * 0.015) * 0.3;
        dragon.children[1].rotation.z = flap;
        dragon.children[2].rotation.z = -flap;

        // 3. Spawn fireballs
        spawnTimer += delta;
        if (spawnTimer > 0.8) {
            spawnFireball();
            spawnTimer = 0;
        }

        // 4. Update beams
        const dragBox = new THREE.Box3().setFromObject(dragon);
        for (let i = beams.length - 1; i >= 0; i--) {
            const beam = beams[i];
            beam.position.y += 12 * delta;

            const beamBox = new THREE.Box3().setFromObject(beam);
            if (beamBox.intersectsBox(dragBox)) {
                // hit
                scene.remove(beam);
                beams.splice(i, 1);

                dragonHP -= 4;
                score += 50;
                scoreSpan.textContent = score;
                dragonHPBar.style.width = dragonHP + '%';

                if (dragonHP <= 0) {
                    endBattle(true);
                }
                continue;
            }

            if (beam.position.y > 6) {
                scene.remove(beam);
                beams.splice(i, 1);
            }
        }

        // 5. Update fireballs
        const playerBox = new THREE.Box3().setFromObject(player);
        for (let i = fireballs.length - 1; i >= 0; i--) {
            const ball = fireballs[i];
            ball.position.y -= 6 * delta;

            const ballBox = new THREE.Box3().setFromObject(ball);
            if (ballBox.intersectsBox(playerBox)) {
                endBattle(false);
                continue;
            }

            if (ball.position.y < -5) {
                scene.remove(ball);
                fireballs.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}
