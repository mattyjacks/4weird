// Treasure Hunters - Three.js Game

let scene, camera, renderer, clock;
let claw, cable;
let treasures = [];
let value = 0;
let timeLeft = 30;
let gameActive = false;

// Game states: 'swinging', 'extending', 'retracting'
let grabberState = 'swinging';
let swingAngle = 0;
let cableLength = 0.5;
const maxCableLength = 9.0;
let grabSpeed = 8.0;
let activeGrabTarget = null;

// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const valSpan = document.getElementById('game-value');
const timeSpan = document.getElementById('game-time');
const finalScoreSpan = document.getElementById('final-score-val');

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080c);

    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 10);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    clock = new THREE.Clock();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const light = new THREE.PointLight(0x38bdf8, 2, 30);
    light.position.set(0, 4, 5);
    scene.add(light);

    // Create Claw and Cable structures
    setupClaw();

    // Spawn floating treasures
    spawnTreasures();

    // Event listeners
    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('click', triggerExtend);
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}

function setupClaw() {
    // Top Crane Anchor
    const craneGeo = new THREE.BoxGeometry(0.8, 0.4, 0.4);
    const craneMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
    const crane = new THREE.Mesh(craneGeo, craneMat);
    crane.position.set(0, 4.4, 0);
    scene.add(crane);

    // Cable representation
    const cableGeo = new THREE.CylinderGeometry(0.05, 0.05, 1);
    // Shift cylinder center point to pivot from top end
    cableGeo.translate(0, -0.5, 0);
    const cableMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(0, 4.2, 0);
    scene.add(cable);

    // Claw head
    const clawGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const clawMat = new THREE.MeshPhongMaterial({ color: 0xfacc15 });
    claw = new THREE.Mesh(clawGeo, clawMat);
    scene.add(claw);
}

function spawnTreasures() {
    const goldGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const goldMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x4d3200 });

    const rockGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const rockMat = new THREE.MeshPhongMaterial({ color: 0x64748b });

    for (let i = 0; i < 6; i++) {
        const isGold = Math.random() > 0.3;
        const mesh = new THREE.Mesh(isGold ? goldGeo : rockGeo, isGold ? goldMat : rockMat);
        
        // Random layout below the crane (Y <= 1)
        const rx = (Math.random() * 8) - 4;
        const ry = (Math.random() * 5) - 3; // -3 to 2
        mesh.position.set(rx, ry, 0);
        scene.add(mesh);
        treasures.push({ mesh: mesh, type: isGold ? 'gold' : 'rock', value: isGold ? 1000 : 100 });
    }
}

function triggerExtend() {
    if (grabberState === 'swinging' && gameActive) {
        grabberState = 'extending';
    }
}

function onKeyDown(e) {
    if (e.code === 'Space') {
        triggerExtend();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else resumeGame();
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
    treasures.forEach(t => scene.remove(t.mesh));
    treasures = [];

    grabberState = 'swinging';
    cableLength = 0.5;
    activeGrabTarget = null;
    value = 0;
    timeLeft = 30;

    valSpan.textContent = '$0';
    timeSpan.textContent = '30s';

    spawnTreasures();
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
    finalScoreSpan.textContent = '$' + value;
    gameOverScreen.classList.remove('hidden');
}

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = clock.getDelta();

        // Game timer countdown
        timeLeft -= delta;
        timeSpan.textContent = Math.ceil(timeLeft) + 's';
        if (timeLeft <= 0) {
            endGame();
        }

        // Spin treasures
        treasures.forEach(t => {
            t.mesh.rotation.y += 0.01;
        });

        if (grabberState === 'swinging') {
            // Swing the cable back and forth
            swingAngle = Math.sin(Date.now() * 0.002) * 1.0; // range in rads
            cable.rotation.z = swingAngle;

            // Align claw head with end of cable
            claw.rotation.z = swingAngle;
            claw.position.set(
                Math.sin(swingAngle) * -cableLength,
                4.2 - Math.cos(swingAngle) * cableLength,
                0
            );
        } else if (grabberState === 'extending') {
            // Extend cable
            cableLength += grabSpeed * delta;
            cable.scale.y = cableLength;

            const tipX = Math.sin(swingAngle) * -cableLength;
            const tipY = 4.2 - Math.cos(swingAngle) * cableLength;
            claw.position.set(tipX, tipY, 0);

            // Bounding collision checks with items
            const clawBox = new THREE.Box3().setFromObject(claw);
            for (let i = 0; i < treasures.length; i++) {
                const t = treasures[i];
                const tBox = new THREE.Box3().setFromObject(t.mesh);
                if (clawBox.intersectsBox(tBox)) {
                    // Grab item!
                    activeGrabTarget = t;
                    treasures.splice(i, 1);
                    grabberState = 'retracting';
                    break;
                }
            }

            if (cableLength >= maxCableLength) {
                grabberState = 'retracting';
            }
        } else if (grabberState === 'retracting') {
            // Retract cable
            const retrieveSpeed = (activeGrabTarget && activeGrabTarget.type === 'rock') ? 3.0 : 8.0;
            cableLength -= retrieveSpeed * delta;
            cableLength = Math.max(0.5, cableLength);
            cable.scale.y = cableLength;

            const tipX = Math.sin(swingAngle) * -cableLength;
            const tipY = 4.2 - Math.cos(swingAngle) * cableLength;
            claw.position.set(tipX, tipY, 0);

            if (activeGrabTarget) {
                activeGrabTarget.mesh.position.set(tipX, tipY - 0.2, 0);
            }

            if (cableLength <= 0.5) {
                // Secure target points
                if (activeGrabTarget) {
                    value += activeGrabTarget.value;
                    valSpan.textContent = '$' + value;
                    scene.remove(activeGrabTarget.mesh);
                    activeGrabTarget = null;
                }

                // If all treasures collected, spawn new set
                if (treasures.length === 0) {
                    spawnTreasures();
                }

                grabberState = 'swinging';
            }
        }
    }

    renderer.render(scene, camera);
}
