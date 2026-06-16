// The Cave of Bottlenecks - Three.js Game

let scene, camera, renderer, clock;
let emitter;
let beam;
let stalactites = [];
let gameActive = false;

// Spotlight parameters
let beamAngle = 0; // angle in radians (0 = straight up)
let rotateDir = 0; // -1 = Left, 1 = Right
const rotationSpeed = 2.0;

// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const progressSpan = document.getElementById('game-progress');
const leftSpan = document.getElementById('game-left');

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020105);

    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 10);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const purpleLight = new THREE.PointLight(0xa78bfa, 1, 30);
    purpleLight.position.set(0, 0, 5);
    scene.add(purpleLight);

    // Create emitter & spotlight beam
    setupEmitter();

    // Create stalactites
    setupStalactites();

    // Event listeners
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    // Mobile Virtual controls rotation
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    const setLeft = (e) => { e.preventDefault(); rotateDir = 1; };
    const setRight = (e) => { e.preventDefault(); rotateDir = -1; };
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

function setupEmitter() {
    emitter = new THREE.Group();

    // Green Cat body
    const emitterMat = new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x064e3b });
    const emitterGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const body = new THREE.Mesh(emitterGeo, emitterMat);
    emitter.add(body);

    emitter.position.set(0, -3.8, 0);
    scene.add(emitter);

    // Visual Spotlight Cone
    const coneGeo = new THREE.ConeGeometry(0.8, 8, 16, 1, true); // open ended cone
    // Shift geometry center so it rotates around the emitter pivot
    coneGeo.translate(0, 4, 0);
    const coneMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    beam = new THREE.Mesh(coneGeo, coneMat);
    emitter.add(beam);
}

function setupStalactites() {
    const stalGeo = new THREE.ConeGeometry(0.8, 2.5, 4);
    const stalMat = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x580505, shininess: 80 });

    const positions = [
        { x: -3.0, y: 2.8, name: 'Hiring Delays' },
        { x: 0.0, y: 2.8, name: 'Approval Chains' },
        { x: 3.0, y: 2.8, name: 'CRM Complexity' }
    ];

    positions.forEach(pos => {
        const stal = new THREE.Mesh(stalGeo, stalMat.clone());
        // point downward
        stal.rotation.x = Math.PI;
        stal.position.set(pos.x, pos.y, 0);
        scene.add(stal);
        stalactites.push({ mesh: stal, hp: 100, name: pos.name });
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
    stalactites.forEach(s => scene.remove(s.mesh));
    stalactites = [];

    beamAngle = 0;
    emitter.rotation.z = 0;

    setupStalactites();
    leftSpan.textContent = '3';
    progressSpan.textContent = '0%';

    startGame();
}

function onKeyDown(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') rotateDir = 1; // Counterclockwise
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') rotateDir = -1; // Clockwise
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else resumeGame();
    }
}

function onKeyUp(e) {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && rotateDir === 1) rotateDir = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && rotateDir === -1) rotateDir = 0;
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
        const delta = clock.getDelta();

        // 1. Rotate Emitter/Beam
        beamAngle += rotateDir * rotationSpeed * delta;
        // Limit range between -60 to +60 degrees
        beamAngle = Math.max(-1.1, Math.min(1.1, beamAngle));
        emitter.rotation.z = beamAngle;

        // Calculate line ray direction vector from emitter
        // Straight up vector rotated by beamAngle
        const dirX = -Math.sin(beamAngle);
        const dirY = Math.cos(beamAngle);

        let activeProgress = 0;
        let activeLeft = 0;

        // 2. Stalactites update
        stalactites.forEach(stal => {
            if (stal.hp > 0) {
                activeLeft++;

                // Check intersection with searchlight beam line:
                // Project stalactite position relative to emitter
                const relX = stal.mesh.position.x - emitter.position.x;
                const relY = stal.mesh.position.y - emitter.position.y;

                // Angle of stalactite relative to emitter
                const stalAngle = Math.atan2(relX, relY);

                // If beam direction points close to stalactite
                if (Math.abs(stalAngle - (-beamAngle)) < 0.15) {
                    // Is illuminated! Shrink/destroy
                    stal.hp -= 40 * delta;
                    stal.mesh.material.emissive.setHex(0xffaa22); // glow orange-gold
                    
                    // Shrink scale
                    const newScale = Math.max(0.1, stal.hp / 100);
                    stal.mesh.scale.set(newScale, newScale, newScale);

                    if (stal.hp <= 0) {
                        scene.remove(stal.mesh);
                    }
                } else {
                    stal.mesh.material.emissive.setHex(0x580505);
                }

                activeProgress += (100 - stal.hp);
            }
        });

        const progressPercent = Math.floor(activeProgress / 3);
        progressSpan.textContent = progressPercent + '%';
        leftSpan.textContent = activeLeft;

        if (activeLeft === 0) {
            endGame();
        }
    }

    renderer.render(scene, camera);
}
