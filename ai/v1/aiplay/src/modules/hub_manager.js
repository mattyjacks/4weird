const fs = require('fs');
const path = require('path');
const { dialog } = require('electron').remote || require('electron');

const plansDir = path.join(__dirname, '..', '..', '..', 'games_plan');
if (!fs.existsSync(plansDir)) {
  fs.mkdirSync(plansDir, { recursive: true });
}

const { mechanics, themes, word1, word2, word3 } = require('./vocabulary_pool');

function generateRandomName() {
  const w1 = word1[Math.floor(Math.random() * word1.length)];
  const w2 = word2[Math.floor(Math.random() * word2.length)];
  const w3 = word3[Math.floor(Math.random() * word3.length)];
  
  const structures = [
    `${w1} ${w2} ${w3}`,
    `${w1} ${w2}`,
    `The ${w1} ${w2}`,
    `${w2} of ${w1}`,
    `${w1} ${w2}: ${w3}`,
    `${w2} of the ${w1} ${w3}`,
    `Escape from ${w1} ${w2}`,
    `Return to ${w1} ${w2} ${w3}`
  ];
  return structures[Math.floor(Math.random() * structures.length)];
}

function generateBraidDiagram(name, mechanic, theme) {
  const primaryMech = mechanic.split(' ')[0];
  const collName = theme.split(' ').pop();
  return `(S_START) Start Agent Loop
 ├─ [State Check] ──> Is Game Over?
 │     ├─ [Yes] ──> (A_RESTART) Wait 1000ms -> Click center screen or press space -> Transition to (S_PLAY)
 │     └─ [No] ───> Is Menu visible?
 │           ├─ [Yes] ──> (A_START_GAME) Click "Start Game" coordinates -> Transition to (S_PLAY)
 │           └─ [No] ───> Continue to Core Play Loop (S_PLAY)
 │
 ├─ [Autopilot Fail-Safe] ──> Is Agent Stuck? (Checks: player.x/y velocity = 0 for 60 consecutive frames)
 │     ├─ [Yes] ──> (R_RECOVER) Back away from nearest wall/obstacle vector (vx = -vx, vy = -vy)
 │     │     ├─ [Time out reached > 30f] ──> Reset position, trigger jump impulse (${primaryMech})
 │     │     └─ [Time out active < 30f] ───> Apply random lateral steering force (90 deg relative to velocity)
 │     └─ [No] ───> Continue to Hazard Scan
 │
 ├─ [Hazard Matrix Scan] ──> Is Hazard / Enemy / Projectile detected in close radius (< 150px)?
 │     ├─ [Yes] ──> Evaluate Hazard speed and trajectory vector
 │     │     ├─ [High Speed > 5px/f] ──> (R_FAST_EVADE) Apply hard lateral force matching (${primaryMech})
 │     │     │     ├─ [Wall Nearby] ───> Perform immediate bounce steering maneuver
 │     │     │     └─ [Open Space] ────> Boost velocity vector in opposite direction of hazard
 │     │     └─ [Low Speed <= 5px/f] ─> (R_SMART_EVADE) Drift around hazard utilizing circle trajectory
 ├─ [Target Acquisition] ──> Is Collectible (${collName}) visible in camera viewport?
 ├─ [Environment Scan] ──> Are environmental modifiers active? (Wind currents, magnetic fields, low gravity)
 └─ (S_EXPLORE) Maintain Default Pattern`;
}

function pitchGame() {
  const name = generateRandomName();
  const mechanic = mechanics[Math.floor(Math.random() * mechanics.length)];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const braid = generateBraidDiagram(name, mechanic, theme);

  // Automatically decide if the game is 3D based on mechanic or theme keywords
  const is3D = /3D|Three\.js|spatial|perspective|first-person|voxel|cube|sphere/i.test(mechanic + " " + theme) || Math.random() < 0.4;

  const gameplayModifiers = [
    "Gravity flips direction every 10 seconds dynamically.",
    "Collecting items triggers a slow-motion matrix time effect for 2 seconds.",
    "Hazards split into two smaller, faster child obstacles when colliding with walls.",
    "The player avatar dynamically shrinks as velocity vector magnitudes increase.",
    "Vaporwave audio frequencies map directly to hazard spawn velocity scalars.",
    "Light grids shift color phase under trigger collisions, altering physics friction.",
    "Magnetic field polarity reverses when score matches prime numbers.",
    "Screen colors invert completely under hazard detection alarms.",
    "A trailing shadow copy of the player repeats the last 60 frames of actions.",
    "Quantum entanglement state binds collectibles to hazard movement patterns."
  ];

  // Pick 1 to 2 random modifiers
  const numMods = Math.floor(Math.random() * 2) + 1;
  const activeMods = [];
  while (activeMods.length < numMods) {
    const rMod = gameplayModifiers[Math.floor(Math.random() * gameplayModifiers.length)];
    if (!activeMods.includes(rMod)) {
      activeMods.push(rMod);
    }
  }
  const modifiersList = activeMods.map(m => `- ${m}`).join('\n');

  // Randomize platform target specs
  const targetFpsList = ["60 FPS (V-Sync locked)", "30 FPS (Retro chiptune lock)", "120 FPS (High-refresh vector physics)"];
  const targetFps = targetFpsList[Math.floor(Math.random() * targetFpsList.length)];
  
  const viewportDimsList = ["800x600 fixed bounds", "1920x1080 cinematic scaler", "100vw x 100vh fluid stretch", "Aspect Ratio 4:3 boxed viewport"];
  const viewportDims = viewportDimsList[Math.floor(Math.random() * viewportDimsList.length)];

  let platform = "HTML5 Browser (Canvas 2D API)";
  let fileLayout = `  1. index.html   : Hosts the Canvas DOM layout, high-performance viewport styling, and script tags importing the modules.
  2. game.js      : The main game engine controller managing requestAnimationFrame, game state transitions, and canvas scaling.
  3. physics.js   : Game physics containing Euler movement integration, speed limits, and circle-to-circle collision equations.
  4. assets.js    : Aesthetic drawing library containing custom methods for glow lines, vaporwave grid lines, and particles.
  5. agent_braid.js: Houses the AI playtest heuristics representing the BRAID diagram below.`;

  let stateVariables = `   - \`canvas\`, \`ctx\`: DOM elements and 2D rendering context.
   - \`player\`: Object storing position {x, y}, velocity {vx, vy}, radius, and current control state.
   - \`collectibles\`: Array of active collectible objects with position, value, and particle trail states.
   - \`hazards\`: Array of obstacles tracking speed vectors and spawn intervals.`;

  let functionsLayout = `   1. \`init()\` [game.js]: Query canvas element, set dimension to fill screen (${viewportDims}), bind event listeners.
   2. \`spawnHazard()\` [game.js]: Calculate random entry points from edges, matching target velocity vector.
   3. \`update(deltaTime)\` [physics.js]: 
      - Update player position based on "${mechanic}" physics equations.
      - Handle bounds collisions (wrap around or bounce).
      - Check circle-to-circle collisions between Player and Collectibles.
      - Check circle-to-circle or point-in-polygon collisions between Player and Hazards.
   4. \`draw()\` [assets.js]: Clear viewport, render modern backdrop grid, draw collectibles with glowing aura effect, render player avatar, render status text.
   5. \`gameLoop(timestamp)\` [game.js]: Calculate frame time, update state, render screen, request next frame.`;

  let controlsLayout = `   - Handle keydown and keyup events or pointer actions.
   - If mechanic is "drifting", implement drift physics (friction coefficient, velocity inertia).`;

  if (is3D) {
    platform = "HTML5 Browser (3D WebGL API via Three.js library)";
    fileLayout = `  1. index.html   : Hosts the 3D canvas viewport container, imports Three.js CDN script (https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js), and project modules.
  2. game.js      : The main game loop and engine orchestration, setting up the THREE.Scene, THREE.PerspectiveCamera, and THREE.WebGLRenderer.
  3. physics.js   : Calculates 3D physics updates (position vector additions, velocity damping, bounding box or bounding sphere collisions in 3D).
  4. assets.js    : Manages 3D geometry creation (THREE.BoxGeometry, THREE.SphereGeometry), materials, lights (THREE.AmbientLight, THREE.DirectionalLight), and animations.
  5. agent_braid.js: Houses the AI playtest heuristics representing the BRAID diagram below.`;

    stateVariables = `   - \`scene\`, \`camera\`, \`renderer\`: Three.js core rendering components.
   - \`playerMesh\`: THREE.Mesh representing the player's 3D avatar.
   - \`hazardMeshes\`: Array of active hazard meshes moving through the 3D viewport.
   - \`collectibleMeshes\`: Array of meshes representing stardust/slimes.`;

    functionsLayout = `   1. \`init()\` [game.js]: Set up THREE.Scene, THREE.PerspectiveCamera, WebGLRenderer size (${viewportDims}), attach canvas container to DOM, add lights.
   2. \`spawn3DObstacle()\` [game.js]: Instantiate new mesh, place at outer bounding boundaries, assign velocity vector.
   3. \`update(deltaTime)\` [physics.js]: Update player's 3D mesh coordinates based on controls, check distance thresholds (bounding sphere collision check) in 3D space.
   4. \`draw()\` [assets.js]: Call \`renderer.render(scene, camera)\` each frame, animate mesh rotations, particle auras.
   5. \`gameLoop(timestamp)\` [game.js]: Calculate frame time, update state, render scene, request next frame.`;

    controlsLayout = `   - Keyboard: WASD / Arrow keys mapping to 3D movement axes (X/Y or X/Z planes).
   - Mouse/Pointer: Raycasting to click/select objects in 3D projection space.`;
  }

  const creativeHooks = [
    "The camera slowly rotates 360 degrees as score increases, turning the screen upside down at key thresholds.",
    "Every hazard avoided plays a high-quality chiptune musical note, transforming gameplay into a procedural song generator.",
    "The viewport renders inside a simulated flickering CRT cabinet screen that wiggles and glitched-flips when collisions are near.",
    "Each gathered collectible dynamically swaps the entire game's color scheme to a completely different retro palette preset.",
    "A ghost trail copy of the player replicates actions from exactly 60 frames ago, acting as a dynamic obstacle the player must avoid.",
    "Collecting specialized items spawns helper mini-drones that orbit the avatar and shoot tiny laser beam particles.",
    "A slow-motion matrix-style bullet time effect triggers automatically for 2 seconds whenever a hazard gets too close.",
    "The gravity vector pulls dynamically towards the mouse cursor position, making steering feel like high-velocity space sailing.",
    "Hazards split into two smaller, faster child obstacles when they bounce off screen boundaries.",
    "Quantum superposition logic randomly swaps the visual model states of hazards and collectibles when key controls are pressed."
  ];
  const viralHook = creativeHooks[Math.floor(Math.random() * creativeHooks.length)];

  const fileContent = `================================================================================
GAME SPECIFICATION DRAFT: ${name}
================================================================================
Target Platform: ${platform}
Core Mechanic  : ${mechanic}
Visual Theme   : ${theme}
Target Framerate: ${targetFps}
Viewport Scaling: ${viewportDims}
Classification : Non-copyrighted, high-addiction viral potential

--------------------------------------------------------------------------------
1. GAME CONCEPT & CORE LOOP OVERVIEW
--------------------------------------------------------------------------------
"${name}" is designed to be a high-engagement, single-screen HTML5 experience.
The gameplay leverages the core mechanic of "${mechanic}" combined with the aesthetic of "${theme}".

- THE CORE GAMEPLAY LOOP:
  1. The player starts in a safe central zone. Hazards or goals spawn dynamically.
  2. Utilizing simple controls based on "${mechanic}", the player navigates the space.
  3. Collecting collectible elements matching the "${theme}" aesthetic increases the score and level.
  4. Obstacles/enemies scale in speed, spawn frequency, and complexity over time.
  5. Collision with hazards triggers an immediate, satisfying Game Over state, with quick-restart action.

- EXTRA GAMEPLAY MODIFIERS (RANDOMIZED):
${modifiersList}

--------------------------------------------------------------------------------
2. TECHNICAL ARCHITECTURE & DEVELOPMENT GUIDE (EXPERT BLUEPRINT)
--------------------------------------------------------------------------------
As an expert game design architect, I recommend structuring this codebase into multiple modular files to separate concerns, facilitate seamless AI vibe-coding edits, and support clean playtesting injection:

- RECOMMENDED FILE LAYOUT:
${fileLayout}

A. ARCHITECTURAL STATE VARIABLES REQUIRED:
${stateVariables}
   - \`score\`: Integer tracking progress.
   - \`gameState\`: 'START' | 'PLAYING' | 'GAMEOVER' state controller.

B. CORE FUNCTIONS IMPLEMENTATION LAYOUT:
${functionsLayout}

C. RECOMMENDED CONTROLS:
${controlsLayout}

--------------------------------------------------------------------------------
3. PLAYTESTING & QUALITY ASSURANCE PROTOCOL
--------------------------------------------------------------------------------
To verify that "${name}" is fully balanced and free of logic deadlocks:

- AUTOMATED TESTING WITH 4WEIRD AIPLAY:
  - Load the index.html file into the 4weird playtesting dashboard.
  - Set the AI Agent heuristic rules matching the decision graph below.
  - Monitor logs for "stuck" alerts to identify if player movement speed is insufficient to escape hazard spawns.
  - Run the agent for a continuous session of 10 minutes to verify frame rates (FPS) and memory heap consumption.

--------------------------------------------------------------------------------
4. AGENT BRAID ACTION FLOW GRAPHIC
--------------------------------------------------------------------------------
${braid}

--------------------------------------------------------------------------------
5. VIRAL HOOK & CREATIVE ANOMALY
--------------------------------------------------------------------------------
- ${viralHook}

================================================================================
`;

  const planPath = path.join(plansDir, `${name.replace(/\s+/g, '_')}_plan.txt`);
  fs.writeFileSync(planPath, fileContent, 'utf8');

  return {
    name,
    mechanic,
    theme,
    braid,
    planPath,
    fileContent
  };
}

// Auto-detect project types based on folder files
function detectGameType(dirPath) {
  try {
    const list = fs.readdirSync(dirPath);
    
    // Check Roblox
    if (list.some(f => f.endsWith('.rbxl') || f.endsWith('.rbxlx'))) {
      return 'Roblox';
    }
    
    // Check Godot
    if (list.some(f => f === 'project.godot' || f.endsWith('.gd'))) {
      return 'Godot';
    }
    
    // Check Unreal
    if (list.some(f => f.endsWith('.uproject'))) {
      return 'Unreal';
    }
    
    // Check Unity
    if (list.some(f => f === 'Assets' || f === 'ProjectSettings')) {
      return 'Unity';
    }
    
    // Check HTML
    if (list.some(f => f === 'index.html' || f.endsWith('.html'))) {
      return 'HTML';
    }
    
    // Recursive check for assets/index.html
    for (const item of list) {
      const fullPath = path.join(dirPath, item);
      if (fs.statSync(fullPath).isDirectory() && !['node_modules', '.git'].includes(item)) {
        const subList = fs.readdirSync(fullPath);
        if (subList.some(f => f === 'index.html')) {
          return 'HTML';
        }
      }
    }
  } catch (e) {
    console.error("Scanning directory for auto-detection failed", e);
  }
  
  return 'HTML'; // Default fallback
}

// Open folder selection dialog
function selectGameFolder() {
  const result = dialog.showOpenDialogSync({
    properties: ['openDirectory']
  });
  
  if (result && result.length > 0) {
    const selectedDir = result[0];
    const detectedType = detectGameType(selectedDir);
    return {
      folderPath: selectedDir,
      gameType: detectedType
    };
  }
  return null;
}

// Import plan file selector
function importGamePlan() {
  const result = dialog.showOpenDialogSync({
    properties: ['openFile'],
    filters: [{ name: 'Text Plans', extensions: ['txt'] }]
  });
  
  if (result && result.length > 0) {
    const filePath = result[0];
    const content = fs.readFileSync(filePath, 'utf8');
    
    let name = path.basename(filePath, '_plan.txt').replace(/_/g, ' ');
    const match = content.match(/GAME SPECIFICATION SHEET:\s*([^\r\n]+)/) || 
                  content.match(/GAME SPECS:\s*([^\r\n]+)/) || 
                  content.match(/GAME SPECIFICATION DRAFT:\s*([^\r\n]+)/);
    if (match) {
      name = match[1].trim();
    }
    
    // Attempt to parse out mechanic and theme if possible to populate modify specs
    let mechanic = "";
    let theme = "";
    const mechMatch = content.match(/Core Mechanic:\s*([^\r\n]+)/) || content.match(/Core Mechanic\s*:\s*([^\r\n]+)/);
    const themeMatch = content.match(/Visual Aesthetic:\s*([^\r\n]+)/) || content.match(/Visual Theme\s*:\s*([^\r\n]+)/);
    if (mechMatch) mechanic = mechMatch[1].trim();
    if (themeMatch) theme = themeMatch[1].trim();
    
    return {
      name,
      mechanic,
      theme,
      planPath: filePath,
      fileContent: content
    };
  }
  return null;
}

module.exports = {
  pitchGame,
  selectGameFolder,
  detectGameType,
  importGamePlan,
  plansDir
};
