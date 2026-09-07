/**
 * Game Specification & Technical Blueprint Document Generator
 */

function generateSpecSheet(plannerSpecs) {
  const braid = `(S) Start -> Check if Danger nearby?
  |-[Yes] --> Evade using game controls (${plannerSpecs.mechanic || 'Pending choice'})
  L-[No] ---> Check if target goal (${plannerSpecs.goal || 'Pending choice'}) visible?
        |-[Yes] --> Glide / Move towards it
        L-[No] ----> Keep default exploring`;

  const is3D = /3D|Three\.js|spatial|perspective|first-person|voxel|cube|sphere/i.test((plannerSpecs.mechanic || '') + " " + (plannerSpecs.theme || ''));

  let platform = "HTML5 Browser (Canvas 2D API)";
  let fileLayout = `  1. index.html   : Hosts the Canvas DOM layout, high-performance viewport styling, and script tags importing the modules.
  2. game.js      : The main game engine controller managing requestAnimationFrame, game state transitions, and canvas scaling.
  3. physics.js   : Game physics containing Euler movement integration, speed limits, and circle-to-circle collision equations.
  4. assets.js    : Aesthetic drawing library containing custom methods for glow lines, vaporwave grid lines, and particles.
  5. agent_braid.js: Houses the AI playtest heuristics representing the BRAID diagram below.`;

  let stateVariables = `   - canvas, ctx: DOM controls for Canvas 2D contexts.
   - player: Object storing location and current movement state.
   - hazards: Obstacle list containing target vector offsets.`;

  let renderingPhases = `   - Clear Canvas: Redraw solid dark backgrounds matching the theme.
   - Render Grid Backdrop: Use modern vector lines to match: ${plannerSpecs.theme || 'Pending choice'}.
   - Draw Avatar: Draw player with custom particle aura.
   - Scoreboard: Print custom neon status tracker in the top-right corner.`;

  if (is3D) {
    platform = "HTML5 Browser (3D WebGL API via Three.js library)";
    fileLayout = `  1. index.html   : Hosts the 3D canvas viewport container, imports Three.js CDN script (https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js), and project modules.
  2. game.js      : The main game loop and engine orchestration, setting up the THREE.Scene, THREE.PerspectiveCamera, and THREE.WebGLRenderer.
  3. physics.js   : Calculates 3D physics updates (position vector additions, velocity damping, bounding box or bounding sphere collisions in 3D).
  4. assets.js    : Manages 3D geometry creation (THREE.BoxGeometry, THREE.SphereGeometry), materials, lights, and animations.
  5. agent_braid.js: Houses the AI playtest heuristics representing the BRAID diagram below.`;

    stateVariables = `   - scene, camera, renderer: Three.js core rendering components.
   - playerMesh: THREE.Mesh representing the player's 3D avatar.
   - hazardMeshes: Array of active hazard meshes moving through the 3D viewport.
   - collectibleMeshes: Array of meshes representing target goals.`;

    renderingPhases = `   - Clear Viewport: Reset renderer and apply background theme color.
   - Update 3D Camera: Align PerspectiveCamera to orbit player mesh position.
   - Draw 3D Avatar/Objects: Rotate meshes and emit Three.js particle groups.
   - HUD overlay: Print score tracker overlaying the 3D rendering context.`;
  }

  return `================================================================================
GAME SPECIFICATION SHEET: ${plannerSpecs.name}
================================================================================
Status: Under design / draft plan
Core Mechanic: ${plannerSpecs.mechanic || 'Pending choice'}
Visual Aesthetic: ${plannerSpecs.theme || 'Pending choice'}
Winning Goal: ${plannerSpecs.goal || 'Pending choice'}
Target Platform: ${platform}

--------------------------------------------------------------------------------
1. DETAILED MECHANICS AND STATE STRUCTURE
--------------------------------------------------------------------------------
- Player Physics: Implement simple integration vectors.
  - Core mechanics matching: ${plannerSpecs.mechanic || 'Pending choice'}.
- Goal Spawning: Spawn items within safe padding away from canvas margins.
- Hazard Scalers: Adjust spawn speed dynamically based on current game score.

--------------------------------------------------------------------------------
2. TECHNICAL ARCHITECTURE & SOURCE FILE LAYOUT (EXPERT BLUEPRINT)
--------------------------------------------------------------------------------
As an expert game design architect, I recommend structuring this codebase into multiple modular files to separate concerns, facilitate seamless AI vibe-coding edits, and support clean playtesting injection:

- RECOMMENDED FILE LAYOUT:
${fileLayout}

A. STATE VARIABLES REQUIRED:
${stateVariables}
   - score: Current count of collectable goals acquired.

B. CRITICAL RENDERING PHASES:
${renderingPhases}

--------------------------------------------------------------------------------
3. PLAYTESTING & AI AUTOMATION STEPS
--------------------------------------------------------------------------------
- Load inside 4weird aiplay debugger using local file paths.
- Setup AI Agent parameters matching the decision tree below.
- Verify game loop recovery under active obstacle vectors.

--------------------------------------------------------------------------------
4. BRAID ACTION DECISION GRAPH
--------------------------------------------------------------------------------
${braid}

================================================================================
`;
}

module.exports = {
  generateSpecSheet
};
