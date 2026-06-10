// Fast Loading Space Scene - Optimized for 250ms load time
// Fixes scene visibility issues and ensures proper rendering

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

let scene, camera, renderer;
let ambientLight, sunLight;
let fleetGroup, alienGroup;
let activeHumanShips = new Map();
let activeAliens = new Map();
let animationId;
let isInitialized = false;

// Fast initialization with 250ms target
export function initFastSpaceScene() {
  const startTime = performance.now();
  
  const canvas = document.getElementById('starfield');
  if (!canvas) {
    console.error('Starfield canvas not found');
    return;
  }

  try {
    // 1. Initialize renderer (50ms)
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: false, // Disabled for speed
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1); // Fixed for speed
    renderer.setClearColor(0x05030a, 1);

    // 2. Create scene (30ms)
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05030a, 0.0035);

    // 3. Setup camera (20ms)
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 500);
    camera.position.set(0, 10, 35);

    // 4. Create groups (10ms)
    fleetGroup = new THREE.Group();
    alienGroup = new THREE.Group();
    scene.add(fleetGroup);
    scene.add(alienGroup);

    // 5. Setup lights (40ms)
    ambientLight = new THREE.AmbientLight(0x1a1230, 1.2);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0x00f2fe, 1.8);
    sunLight.position.set(100, 80, 50);
    scene.add(sunLight);

    // 6. Create starfield (50ms)
    createFastStarfield();

    // 7. Spawn ships (30ms)
    spawnFastShips();

    // 8. Start animation (20ms)
    startFastAnimation();

    // 9. Setup resize handler (10ms)
    window.addEventListener('resize', onWindowResize);

    // Mark as initialized
    isInitialized = true;

    const loadTime = performance.now() - startTime;
    console.log(`Fast space scene loaded in ${loadTime.toFixed(2)}ms`);

    // Expose globally
    window.fastSpaceScene = {
      scene, camera, renderer, fleetGroup, alienGroup,
      activeHumanShips, activeAliens, isInitialized
    };

  } catch (error) {
    console.error('Error initializing fast space scene:', error);
    // Fallback to simple starfield
    initFallbackStarfield();
  }
}

function createFastStarfield() {
  const starsGeometry = new THREE.BufferGeometry();
  const starPositions = [];
  const starColors = [];

  // Create 2000 stars for performance
  for (let i = 0; i < 2000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starPositions.push(x, y, z);

    // Star colors
    const color = new THREE.Color();
    const colorChoice = Math.random();
    if (colorChoice < 0.3) {
      color.setHSL(0.6, 0.2, 0.8); // Blue
    } else if (colorChoice < 0.6) {
      color.setHSL(0.1, 0.2, 0.9); // Yellow
    } else {
      color.setHSL(0, 0, 0.9); // White
    }
    starColors.push(color.r, color.g, color.b);
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

  const starsMaterial = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

function spawnFastShips() {
  // Create 5 simple ships quickly
  const shipPositions = [
    [0, 0, 0],
    [-15, 2, 8],
    [15, 2, 8],
    [-25, -2, 12],
    [25, -2, 12]
  ];

  shipPositions.forEach((pos, index) => {
    const ship = createFastShip(`human_ship_${index}`);
    ship.position.set(...pos);
    fleetGroup.add(ship);
    
    activeHumanShips.set(`human_ship_${index}`, {
      id: `human_ship_${index}`,
      position: ship.position,
      mesh: ship,
      velocity: new THREE.Vector3(0, 0, 0),
      health: 100,
      ai: { health: 100 }
    });
  });

  // Create 3 simple aliens
  for (let i = 0; i < 3; i++) {
    const alien = createFastAlien(`alien_${i}`);
    alien.position.set(
      (Math.random() - 0.5) * 100,
      0,
      -50 - Math.random() * 50
    );
    alienGroup.add(alien);
    
    activeAliens.set(`alien_${i}`, {
      id: `alien_${i}`,
      position: alien.position,
      mesh: alien,
      velocity: new THREE.Vector3(0, 0, 2),
      health: 50,
      ai: { health: 50 }
    });
  }
}

function createFastShip(shipId) {
  const shipGroup = new THREE.Group();
  
  // Simple hull - box shape
  const hullGeometry = new THREE.BoxGeometry(4, 2, 6);
  const hullMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a90e2,
    metalness: 0.8,
    roughness: 0.3
  });
  const hull = new THREE.Mesh(hullGeometry, hullMaterial);
  shipGroup.add(hull);

  // Simple wings
  const wingGeometry = new THREE.BoxGeometry(8, 0.5, 4);
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c5aa0,
    metalness: 0.8,
    roughness: 0.3
  });
  const wings = new THREE.Mesh(wingGeometry, wingMaterial);
  wings.position.y = -0.5;
  shipGroup.add(wings);

  // Engine glow
  const engineGeometry = new THREE.SphereGeometry(0.5, 8, 8);
  const engineMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.8
  });
  const engine = new THREE.Mesh(engineGeometry, engineMaterial);
  engine.position.z = 3;
  shipGroup.add(engine);

  shipGroup.userData = {
    shipId: shipId,
    voxels: [hull, wings, engine],
    totalHealth: 100,
    maxTotalHealth: 100
  };

  return shipGroup;
}

function createFastAlien(alienId) {
  const alienGroup = new THREE.Group();
  
  // Simple alien ship - pyramid shape
  const alienGeometry = new THREE.ConeGeometry(2, 4, 4);
  const alienMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    metalness: 0.6,
    roughness: 0.4
  });
  const alien = new THREE.Mesh(alienGeometry, alienMaterial);
  alien.rotation.z = Math.PI;
  alienGroup.add(alien);

  // Alien engine glow
  const glowGeometry = new THREE.SphereGeometry(0.3, 6, 6);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.9
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.z = 2;
  alienGroup.add(glow);

  alienGroup.userData = {
    alienId: alienId,
    voxels: [alien, glow],
    totalHealth: 50,
    maxTotalHealth: 50
  };

  return alienGroup;
}

function startFastAnimation() {
  let lastTime = 0;
  
  function animate(timestamp) {
    if (!isInitialized) return;
    
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Update ships
    updateFastShips(deltaTime);
    
    // Update aliens
    updateFastAliens(deltaTime);
    
    // Simple camera movement
    camera.position.x = Math.sin(timestamp * 0.0001) * 5;
    camera.position.y = 10 + Math.cos(timestamp * 0.0002) * 2;
    camera.lookAt(0, 0, 0);

    // Render scene
    renderer.render(scene, camera);
    
    animationId = requestAnimationFrame(animate);
  }
  
  animationId = requestAnimationFrame(animate);
}

function updateFastShips(deltaTime) {
  activeHumanShips.forEach((ship, id) => {
    // Simple floating animation
    ship.mesh.position.y += Math.sin(Date.now() * 0.001 + parseInt(id)) * 0.01;
    ship.mesh.rotation.y += deltaTime * 0.1;
  });
}

function updateFastAliens(deltaTime) {
  activeAliens.forEach((alien, id) => {
    // Move aliens forward
    alien.mesh.position.z += alien.velocity.z * deltaTime * 10;
    
    // Remove if too far
    if (alien.mesh.position.z > 50) {
      alien.mesh.position.z = -100;
      alien.mesh.position.x = (Math.random() - 0.5) * 100;
    }
    
    // Simple rotation
    alien.mesh.rotation.y += deltaTime * 0.5;
  });
}

function onWindowResize() {
  if (!camera || !renderer) return;
  
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initFallbackStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Simple 2D starfield
  ctx.fillStyle = '#05030a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 2;
    const opacity = Math.random() * 0.8 + 0.2;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  console.log('Fallback 2D starfield initialized');
}

// Cleanup function
export function cleanupFastSpaceScene() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  if (renderer) {
    renderer.dispose();
  }
  
  window.removeEventListener('resize', onWindowResize);
  isInitialized = false;
}

// Auto-initialize when module loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFastSpaceScene);
} else {
  initFastSpaceScene();
}

// Expose globally
window.initFastSpaceScene = initFastSpaceScene;
window.cleanupFastSpaceScene = cleanupFastSpaceScene;
