// The MADI AI Universe - Three.js Interactive Hub

let scene, camera, renderer;
let coreGlobe;
let regions = [];
let tooltip = document.getElementById('map-tooltip');

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06050b);

    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 10);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa78bfa, 1);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Core Globe
    const globeGeo = new THREE.SphereGeometry(2.0, 32, 32);
    const globeMat = new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        roughness: 0.8,
        wireframe: true
    });
    coreGlobe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(coreGlobe);

    // Spawn 4 Regional Islands
    setupRegions();

    // Event listeners
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        // Simulate mouse move to highlight and then trigger click
        onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        onClick({ clientX: touch.clientX, clientY: touch.clientY });
    }, { passive: false });

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}

function setupRegions() {
    const regionGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.4, 6);
    
    const data = [
        { x: -3.5, y: 1.5, color: 0x10b981, name: 'Revenue Jungle', url: '/games/html/madi/the-revenue-jungle/' },
        { x: 3.5, y: 1.5, color: 0xf59e0b, name: 'Temple of Lost Revenue', url: '/games/html/madi/temple-of-lost-revenue/' },
        { x: -3.5, y: -1.5, color: 0x38bdf8, name: 'Pipeline Mountain', url: '/games/html/madi/the-pipeline-mountain/' },
        { x: 3.5, y: -1.5, color: 0x06b6d4, name: 'Speed Portal', url: '/games/html/madi/the-speed-portal/' }
    ];

    data.forEach(d => {
        const mat = new THREE.MeshPhongMaterial({ color: d.color, shininess: 80 });
        const island = new THREE.Mesh(regionGeo, mat);
        island.position.set(d.x, d.y, 0);
        scene.add(island);
        regions.push({ mesh: island, name: d.name, url: d.url, defaultColor: d.color });
    });
}

function getIntersectedRegion(event) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1,
        -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const meshes = regions.map(r => r.mesh);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
        return regions.find(r => r.mesh === intersects[0].object);
    }
    return null;
}

function onMouseMove(event) {
    const intersected = getIntersectedRegion(event);

    regions.forEach(r => {
        r.mesh.material.color.setHex(r.defaultColor);
        r.mesh.scale.set(1.0, 1.0, 1.0);
    });

    if (intersected) {
        intersected.mesh.material.color.setHex(0xffffff); // highlight white
        intersected.mesh.scale.set(1.2, 1.2, 1.2);
        tooltip.textContent = `Warp to: ${intersected.name} (Click to play)`;
    } else {
        tooltip.textContent = 'Hover over a region cylinder to inspect...';
    }
}

function onClick(event) {
    const intersected = getIntersectedRegion(event);
    if (intersected) {
        window.location.href = intersected.url;
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

    // Spin core globe
    coreGlobe.rotation.y += 0.005;

    // Hover effect on islands
    regions.forEach((r, idx) => {
        r.mesh.rotation.y += 0.01;
        r.mesh.position.y = (idx < 2 ? 1.5 : -1.5) + Math.sin(Date.now() * 0.002 + idx) * 0.1;
    });

    renderer.render(scene, camera);
}
