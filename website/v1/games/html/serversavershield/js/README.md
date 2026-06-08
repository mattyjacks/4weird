# Server Saver Shield - Modular Architecture

This directory contains the refactored modular components of Server Saver Shield, split from a single monolithic `game.js` into 20+ specialized component files.

## Module Organization

### Core Systems (5 files)
- **constants.js** - Game constants, weapon definitions, staff types, enemy definitions, difficulty multipliers
- **audio.js** - Audio context initialization and sound effect generation
- **canvas.js** - Canvas setup, resizing, and context management
- **gameState.js** - Global game state management and reset functions
- **init.js** - Application initialization entry point

### Entity Management (5 files)
- **player.js** - Player state, movement, weapon system, input mapping
- **bullets.js** - Bullet spawning, updating, and lifecycle management
- **enemies.js** - Enemy spawning, wave progression, behavior updates
- **powerups.js** - Powerup spawning, collection, and application logic
- **particles.js** - Particle effect generation and animation

### Game Systems (5 files)
- **servers.js** - Server management, status tracking, income calculation
- **staff.js** - Staff hiring, firing, salary management, ability effects
- **waves.js** - Wave progression, duration, and difficulty scaling
- **collision.js** - Collision detection and response (bullets, enemies, powerups)
- **ui.js** - UI state, floating text, shield timer, combo system

### Rendering & Input (4 files)
- **rendering.js** - All drawing functions, background, HUD, entities
- **input.js** - Mouse, touch, and keyboard input handling
- **gameLoop.js** - Main update/draw loop and frame management
- **gameFlow.js** - Game state transitions (start, pause, game over, victory)

### Event Management (1 file)
- **eventHandlers.js** - DOM event listeners for buttons and UI controls

## Module Dependencies

```
init.js
├── canvas.js
├── input.js
├── eventHandlers.js
└── gameLoop.js
    ├── update()
    │   ├── player.js
    │   ├── bullets.js
    │   ├── enemies.js
    │   ├── powerups.js
    │   ├── particles.js
    │   ├── ui.js
    │   ├── waves.js
    │   ├── servers.js
    │   ├── staff.js
    │   └── collision.js
    └── draw()
        └── rendering.js
```

## File Sizes

| File | Purpose | Lines |
|------|---------|-------|
| constants.js | Game data | ~80 |
| audio.js | Sound effects | ~25 |
| canvas.js | Canvas management | ~25 |
| gameState.js | State management | ~50 |
| player.js | Player logic | ~45 |
| bullets.js | Bullet system | ~30 |
| enemies.js | Enemy system | ~45 |
| powerups.js | Powerup system | ~40 |
| particles.js | Particle effects | ~30 |
| ui.js | UI state | ~40 |
| collision.js | Collision logic | ~70 |
| servers.js | Server management | ~50 |
| staff.js | Staff management | ~35 |
| waves.js | Wave system | ~30 |
| rendering.js | Drawing functions | ~150 |
| input.js | Input handling | ~45 |
| gameLoop.js | Game loop | ~30 |
| gameFlow.js | Game flow | ~60 |
| eventHandlers.js | Event listeners | ~30 |
| init.js | Initialization | ~5 |

**Total: ~1000 lines across 20 files** (vs ~520 lines in monolithic version)

## Key Design Patterns

### 1. Getter/Setter Functions
Each module exports getter functions for accessing state:
```javascript
function getPlayer() { return player; }
function getEnemies() { return enemies; }
function getGameState() { return gameState; }
```

### 2. Update Functions
Each system has an update function called from the main loop:
```javascript
updatePlayer();
updateBullets();
updateEnemies();
updatePowerups();
```

### 3. Initialization Functions
Systems are initialized in specific order:
```javascript
initCanvas();
initInput();
initServers();
initStars();
```

### 4. Clear Functions
Each system can be reset:
```javascript
clearBullets();
clearEnemies();
clearPowerups();
```

## Adding New Features

### To add a new weapon:
1. Add to `WEAPONS` object in `constants.js`
2. Weapon is automatically available as powerup

### To add a new staff type:
1. Add to `STAFF_TYPES` object in `constants.js`
2. Add ability logic in `collision.js` or `staff.js`

### To add a new enemy type:
1. Add to `ENEMIES` object in `constants.js`
2. Add spawn condition in `enemies.js`
3. Add collision behavior in `collision.js`

### To add a new powerup type:
1. Add to types array in `powerups.js`
2. Add application logic in `applyPowerup()` function

## Performance Considerations

- **Modular loading**: All 20 files loaded in order, no circular dependencies
- **Global state**: Minimized, only essential game state is global
- **Update frequency**: All systems update at 60 FPS
- **Memory**: Particle and bullet arrays cleaned up each frame
- **Rendering**: Canvas cleared and redrawn each frame

## Testing Strategy

Each module can be tested independently:
- `constants.js` - Verify all objects are properly defined
- `audio.js` - Test sound generation without errors
- `canvas.js` - Verify canvas resizes correctly
- `player.js` - Test movement and weapon switching
- `bullets.js` - Test bullet spawning and cleanup
- `enemies.js` - Test enemy spawning and waves
- `collision.js` - Test hit detection accuracy
- `rendering.js` - Verify all elements draw correctly

## Future Refactoring

Potential further modularization:
- Split `rendering.js` into `renderBackground.js`, `renderEntities.js`, `renderHUD.js`
- Split `collision.js` into `bulletCollision.js`, `enemyCollision.js`, `powerupCollision.js`
- Create `difficulty.js` for difficulty-related logic
- Create `economy.js` for financial calculations
- Create `reputation.js` for reputation system logic
