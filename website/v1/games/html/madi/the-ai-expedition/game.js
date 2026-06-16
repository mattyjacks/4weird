// The AI Expedition - Three.js Game

let scene, camera, renderer;
let centerNode;
let outerNodes = [];
let pipes = [];
let connectedCount = 0;
let gameActive = false;

// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const routesSpan = document.getElementById('game-routes');
const syncSpan = document.getElementById('game-sync');

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04020a);

    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 10);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xa855f7, 2, 30);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    setupNetworkNodes();

    // Event listeners
    canvas.addEventListener('click', onCanvasClick);
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}

function setupNetworkNodes() {
    // 1. Center Hub Node (MADI Engine)
    const hubGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const hubMat = new THREE.MeshPhongMaterial({ color: 0xa855f7, emissive: 0x3b0764, shininess: 100 });
    centerNode = new THREE.Mesh(hubGeo, hubMat);
    scene.add(centerNode);

    // 2. 4 Outlying Nodes (AI Agents, Data Lakes, Automations, Markets)
    const nodeGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const nodeMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, emissive: 0x1e3a8a });

    const positions = [
        { x: 0, y: 3, label: 'AI Agents' },
        { x: 3, y: 0, label: 'Data Lakes' },
        { x: 0, y: -3, label: 'Automations' },
        { x: -3, y: 0, label: 'Markets' }
    ];

    positions.forEach((pos, idx) => {
        const node = new THREE.Mesh(nodeGeo, nodeMat.clone());
        node.position.set(pos.x, pos.y, 0);
        scene.add(node);
        outerNodes.push({ mesh: node, connected: false, idx: idx, label: pos.label });
    });
}

function onCanvasClick(event) {
    if (!gameActive) return;

    // Raycast click
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1,
        -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const nodeMeshes = outerNodes.map(o => o.mesh);
    const intersects = raycaster.intersectObjects(nodeMeshes);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const targetNode = outerNodes.find(o => o.mesh === hitMesh);

        if (targetNode && !targetNode.connected) {
            connectNode(targetNode);
        }
    }
}

function connectNode(node) {
    node.connected = true;
    node.mesh.material.color.setHex(0x10b981); // Turn green indicating active sync
    node.mesh.material.emissive.setHex(0x064e3b);

    // Draw connection pipe cylinder
    const startVec = new THREE.Vector3(0, 0, 0);
    const endVec = node.mesh.position.clone();
    const distance = startVec.distanceTo(endVec);

    const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, distance, 8);
    const pipeMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);

    // Position & align pipe cylinder between center and target node
    pipe.position.copy(endVec).multiplyScalar(0.5);
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), endVec.clone().normalize());
    scene.add(pipe);
    pipes.push(pipe);

    connectedCount++;
    routesSpan.textContent = `${connectedCount}/4`;
    syncSpan.textContent = `${connectedCount * 25}%`;

    if (connectedCount >= 4) {
        setTimeout(endGame, 600);
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
    pipes.forEach(p => scene.remove(p));
    pipes = [];
    outerNodes.forEach(o => {
        o.connected = false;
        o.mesh.material.color.setHex(0x3b82f6);
        o.mesh.material.emissive.setHex(0x1e3a8a);
    });
    connectedCount = 0;

    routesSpan.textContent = '0/4';
    syncSpan.textContent = '0%';

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
        // Spin the central engine hub
        centerNode.rotation.y += 0.015;
        centerNode.rotation.x += 0.005;

        // Hover effect on outer nodes
        outerNodes.forEach(node => {
            node.mesh.rotation.y += 0.01;
        });
    }

    renderer.render(scene, camera);
}
