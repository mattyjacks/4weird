# 4weird-game-dev-by-mattyjacks

## Skill Metadata

| Field | Value |
|-------|-------|
| **id** | `4weird-game-dev-by-mattyjacks` |
| **name** | 4weird Games Development |
| **version** | 1.0.0 |
| **author** | MattyJacks |
| **company** | MattyJacks.com |
| **license** | MIT |
| **runtime** | Generic (Windsurf/Devin, Google Antigravity, OpenClaw, Claude Code, etc.) |

## Description

Develop browser-playable HTML5 games for the 4weird Games platform. Games must be pure vanilla JavaScript/CSS/HTML with no build step, follow strict code conventions, and integrate with the 4weird component system. All games include standardized credits sections and maker bios.

## When to Use This Skill

Use this skill when:
- Creating a new HTML5 game for 4weird Games
- Retrofitting an existing game to the 4weird template
- Understanding the 4weird platform conventions
- Generating game boilerplate that passes all checks

## Required Context

The agent must know:
- Target game genre/type
- Game mechanics/concepts
- Maker/creator information (name, bio, portfolio URL)
- Whether mobile support is required (default: yes)
- Any external asset URLs (images, audio over 10MB limit)

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `game_title` | string | yes | Title of the game |
| `game_slug` | string | yes | URL-friendly folder name (lowercase, hyphens) |
| `genre` | string | yes | Arcade, Puzzle, Action, Strategy, etc. |
| `description` | string | yes | One-sentence pitch |
| `instructions` | string | yes | How to play |
| `maker_name` | string | yes | Creator's name |
| `maker_bio` | string | yes | 50-200 words about creator |
| `maker_url` | string | no | Portfolio/social link |
| `credits` | array | no | Additional contributors [{name, role, avatar}] |
| `canvas_size` | object | no | {width, height} - default 800x600 |
| `external_assets` | array | no | URLs for large assets [{url, type, description}] |
| `controls` | object | no | {keyboard: {}, touch: boolean, mouse: boolean} |

## Step-by-Step Workflow

### Phase 1: Setup

1. **Create folder structure**
   ```
   website/v1/games/html/{game_slug}/
   ```

2. **Copy template files** from `_TEMPLATE/`
   - `index.html` - customize GAME_* placeholders
   - `game.css` - modify as needed, keep conventions
   - `game.json` - populate all required fields

3. **Replace all template placeholders**
   - GAME_TITLE → actual title
   - GAME_MAKER → maker_name
   - GAME_DESCRIPTION → description
   - All uppercase placeholders in HTML comments

### Phase 2: Game Implementation

4. **Implement game.js following standards**
   - Use `'use strict'` mode
   - Wrap in IIFE: `(function() { ... })();`
   - Use `const`/`let`, never `var`
   - Target 60 FPS game loop with `requestAnimationFrame`
   - Implement keyboard + touch controls (mandatory)
   - Add pause with `P` or `Escape` key

5. **Canvas setup** (copy exactly)
   ```javascript
   const canvas = document.getElementById('gameCanvas');
   const ctx = canvas.getContext('2d');
   
   function resizeCanvas() {
       const rect = canvas.parentElement.getBoundingClientRect();
       const dpr = window.devicePixelRatio || 1;
       canvas.width = rect.width * dpr;
       canvas.height = rect.height * dpr;
       canvas.style.width = rect.width + 'px';
       canvas.style.height = rect.height + 'px';
       ctx.scale(dpr, dpr);
   }
   ```

6. **Game loop structure**
   ```javascript
   let lastTime = 0;
   let isPaused = false;
   
   function gameLoop(timestamp) {
       if (isPaused) return;
       const deltaTime = timestamp - lastTime;
       lastTime = timestamp;
       update(deltaTime);
       render();
       requestAnimationFrame(gameLoop);
   }
   ```

### Phase 3: Polish & Validation

7. **Enforce CRITICAL rule: No em/en dashes**
   - Search all files for `—` (em dash) and `–` (en dash)
   - Replace with `-` (hyphen) everywhere
   - This includes code AND comments

8. **Validate file paths**
   - All paths must be relative: `../../styles.css`, not `/styles.css`
   - Check `../../../index.html#games` for back link

9. **Verify game.json completeness**
   - All required fields populated
   - Maker bio 50-200 words
   - Credits array includes at least maker

10. **Size check**
    - Total folder < 10MB
    - External assets for anything large (images > 2MB, audio, video)

### Phase 4: Integration

11. **Add game card to main page**
    - Edit `website/v1/index.html`
    - Copy existing game-card structure
    - Update href, title, description, thumbnail class

12. **Add thumbnail CSS** (optional but recommended)
    ```css
    .thumb-{game_slug} {
        background: linear-gradient(...);
    }
    ```

## File Templates

### index.html (simplified structure)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>{{game_title}} - 4weird Games</title>
    <link rel="stylesheet" href="../../styles.css">
    <link rel="stylesheet" href="game.css">
</head>
<body class="game-page">
    <canvas id="starfield"></canvas>
    <div id="nav-placeholder"></div>
    
    <header class="game-header">
        <a href="../../../index.html#games" class="back-link">← Back to 4weird</a>
        <h1 class="game-title">{{game_title}}</h1>
    </header>
    
    <main class="game-main">
        <div class="game-frame">
            <canvas id="gameCanvas"></canvas>
            <!-- overlays... -->
        </div>
        <aside class="game-info-panel">
            <!-- how to play, controls, high score -->
        </aside>
    </main>
    
    <section class="credits-section" id="credits">
        <!-- auto-populated from game.json -->
    </section>
    
    <section class="bio-section" id="bio">
        <!-- auto-populated from game.json -->
    </section>
    
    <div id="footer-placeholder"></div>
    <script src="../../components.js"></script>
    <script src="game.js"></script>
</body>
</html>
```

### game.json template

```json
{
    "title": "{{game_title}}",
    "slug": "{{game_slug}}",
    "description": "{{description}}",
    "genre": "{{genre}}",
    "tags": ["HTML5", "{{genre}}"],
    "maker": {
        "name": "{{maker_name}}",
        "bio": "{{maker_bio}}",
        "url": "{{maker_url}}",
        "urlLabel": "Portfolio"
    },
    "credits": [
        {
            "name": "{{maker_name}}",
            "role": "Game Developer",
            "avatar": "🎨",
            "primary": true,
            "url": "{{maker_url}}",
            "urlLabel": "Portfolio"
        }
    ],
    "controls": {
        "keyboard": {
            "Arrow Keys / WASD": "Move",
            "Space": "Action",
            "P / Esc": "Pause"
        },
        "touch": true,
        "mouse": false
    },
    "instructions": "{{instructions}}",
    "technical": {
        "canvasSize": {"width": 800, "height": 600},
        "targetFPS": 60,
        "mobileOptimized": true
    },
    "assets": {
        "external": [{{external_assets}}],
        "local": ["game.js", "game.css"]
    }
}
```

### game.js minimal structure

```javascript
(function() {
    'use strict';
    
    // Setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Game state
    const state = {
        score: 0,
        highScore: parseInt(localStorage.getItem('{{game_slug}}_highScore') || '0'),
        isPlaying: false,
        isPaused: false
    };
    
    // Resize handling
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
    }
    
    // Input handling
    const keys = {};
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    });
    document.addEventListener('keyup', (e) => keys[e.code] = false);
    
    // Touch handling
    let touch = { active: false, x: 0, y: 0 };
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touch.active = true;
        touch.x = e.touches[0].clientX;
        touch.y = e.touches[0].clientY;
    }, { passive: false });
    canvas.addEventListener('touchend', () => touch.active = false);
    
    // Game loop
    let lastTime = 0;
    function loop(timestamp) {
        if (!state.isPlaying || state.isPaused) return;
        
        const dt = timestamp - lastTime;
        lastTime = timestamp;
        
        update(dt);
        render();
        
        requestAnimationFrame(loop);
    }
    
    function update(dt) {
        // Game logic here
    }
    
    function render() {
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, w, h);
        // Draw here
    }
    
    function togglePause() {
        state.isPaused = !state.isPaused;
        if (!state.isPaused) {
            lastTime = performance.now();
            requestAnimationFrame(loop);
        }
    }
    
    function startGame() {
        state.isPlaying = true;
        state.isPaused = false;
        state.score = 0;
        lastTime = performance.now();
        document.getElementById('start-screen').classList.add('hidden');
        resize();
        requestAnimationFrame(loop);
    }
    
    function endGame() {
        state.isPlaying = false;
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('{{game_slug}}_highScore', state.highScore);
        }
        document.getElementById('final-score').textContent = state.score;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
    
    // Event wiring
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('play-again-btn').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        startGame();
    });
    document.getElementById('resume-btn').addEventListener('click', togglePause);
    document.getElementById('restart-btn').addEventListener('click', () => {
        togglePause();
        startGame();
    });
    
    window.addEventListener('resize', resize);
    
    // Init
    document.getElementById('high-score').textContent = state.highScore;
    resize();
})();
```

## Code Conventions Reference

### Naming
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- CSS classes: `kebab-case`
- Folder: `lowercase-hyphens`

### Critical Rules
| Rule | Enforcement |
|------|-------------|
| No em dashes `—` | Replace with `-` |
| No en dashes `–` | Replace with `-` |
| Use relative paths | `../../` not `/` |
| Use CSS variables | `var(--neon-purple)` not `#8b5cf6` |
| Include standard prefix | `background-clip` with `-webkit-background-clip` |
| Max 10MB per game | External assets for large files |
| `use strict` | Required in all JS |

### Theme Variables (from styles.css)
```css
var(--bg-primary)      /* #0a0a0f */
var(--bg-secondary)    /* #12121a */
var(--neon-purple)     /* #8b5cf6 */
var(--neon-green)      /* #10b981 */
var(--text-primary)    /* #f5f5f5 */
var(--text-secondary)  /* #9ca3af */
var(--font-display)    /* 'Orbitron' */
var(--font-body)       /* 'Inter' */
```

## Testing Checklist

Before marking complete, verify:

- [ ] Game loads by opening index.html directly (no server needed)
- [ ] All paths are relative and correct
- [ ] No em/en dashes in any file
- [ ] Total size under 10MB
- [ ] Back to 4weird link works
- [ ] Credits section shows maker info from game.json
- [ ] Bio section displays properly
- [ ] Mobile touch controls functional
- [ ] Pause works with P/Escape keys
- [ ] No console errors

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Canvas blurry | Use devicePixelRatio scaling |
| Touch not working | Add `{ passive: false }` and `e.preventDefault()` |
| Game too big | Move assets to external CDN, link by URL |
| Nav not showing | Ensure `nav-placeholder` div exists before components.js loads |
| Credits not populating | Verify game.json is valid JSON, no trailing commas |

## External Resources

- Main site: `../../../index.html`
- Shared CSS: `../../styles.css`
- Components: `../../components.js`
- Template folder: `_TEMPLATE/`
- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Coding standard: [CODING_STANDARD.md](CODING_STANDARD.md)

## Contact

Matt@MattyJacks.com  
https://mattyjacks.com/contact

---

**Platform**: 4weird Games  
**Parent Company**: MattyJacks.com  
**Started**: 6/6/26  
**Location**: New Hampshire, USA
