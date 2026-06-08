# 4weird Games - Coding Standard

This document defines the standardized conventions for developing HTML5 games for the 4weird Games platform. Following these standards ensures consistency, maintainability, and compatibility with the platform.

## 1. Project Structure

Every game must follow this exact folder structure:

```
website/v1/games/html/GAME_SLUG/
├── index.html      # Entry point - uses template structure
├── game.js         # All game logic
├── game.css        # Game-specific styles
├── game.json       # Metadata for credits/bio
└── (optional) assets/
    └── (small local assets only)
```

### Naming Conventions

- **Folder name**: lowercase, no spaces, no special characters: `my-awesome-game`
- **Files**: `index.html`, `game.js`, `game.css`, `game.json` (exact names)
- **Variables**: camelCase for JavaScript
- **CSS classes**: kebab-case
- **Constants**: UPPER_SNAKE_CASE

## 2. Size Limits

- **Maximum total size**: 10 MB per game
- **Individual file limit**: 2 MB
- **Large assets**: Must be hosted externally and linked via URL

### External Asset Example

```javascript
// In game.js
const SPRITE_URL = 'https://your-cdn.com/player-sprite.png';
const img = new Image();
img.src = SPRITE_URL;
```

## 3. Code Style Rules

### Critical: No Em/En Dashes

- **NEVER use**: `—` (em dash) or `–` (en dash) in code
- **ALWAYS use**: `-` (hyphen) instead
- This applies to: HTML, CSS, JavaScript, JSON, comments

### HTML Requirements

```html
<!-- DOCTYPE and structure -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>GAME_TITLE - 4weird Games</title>
    <!-- Always include these meta tags -->
    <meta name="description" content="DESCRIPTION">
</head>
```

### CSS Requirements

```css
/* Use CSS variables from root only */
.game-element {
    /* CORRECT - uses theme variables */
    color: var(--neon-purple);
    background: var(--bg-card);
    
    /* INCORRECT - hardcoded values */
    color: #8b5cf6;
    background: #1a1a25;
}

/* Always include standard property with vendor prefix */
.example {
    -webkit-background-clip: text;
    background-clip: text;  /* Required for compatibility */
}
```

### JavaScript Requirements

```javascript
// Use strict mode
(function() {
    'use strict';
    
    // Game initialization
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Use const/let, never var
    const GAME_WIDTH = 800;
    const GAME_HEIGHT = 600;
    
    // Event listeners with proper cleanup
    function init() {
        // Setup code
    }
    
    // Expose minimal global API if needed
    window.Game = { init, pause, resume };
})();
```

## 4. File Paths

### Relative Paths Only

```html
<!-- CORRECT - relative paths -->
<link rel="stylesheet" href="../../styles.css">
<link rel="stylesheet" href="game.css">
<script src="../../components.js"></script>
<script src="game.js"></script>

<!-- INCORRECT - absolute paths -->
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="https://4weird.games/styles.css">
```

### Path Reference

| From | To | Path |
|------|-----|------|
| `games/html/mygame/index.html` | Main styles | `../../styles.css` |
| `games/html/mygame/index.html` | Components | `../../components.js` |
| `games/html/mygame/index.html` | Home page | `../../../index.html` |

## 5. Game Template Elements

### Required HTML Structure

```html
<!-- Navigation placeholder -->
<div id="nav-placeholder"></div>

<!-- Game header with back link -->
<header class="game-header">
    <a href="../../../index.html#games" class="back-link">
        <span>← Back to 4weird</span>
    </a>
</header>

<!-- Game canvas -->
<main class="game-main">
    <canvas id="gameCanvas"></canvas>
</main>

<!-- Credits section -->
<section class="credits-section" id="credits">
    <!-- Auto-populated from game.json -->
</section>

<!-- Maker bio section -->
<section class="bio-section" id="bio">
    <!-- Auto-populated from game.json -->
</section>

<!-- Footer placeholder -->
<div id="footer-placeholder"></div>
```

### Required game.json Fields

```json
{
    "title": "Game Title",
    "slug": "game-slug",
    "description": "One sentence description",
    "maker": {
        "name": "Developer Name",
        "bio": "Under 200 words about the creator",
        "url": "https://portfolio.com",
        "urlLabel": "Portfolio"
    },
    "credits": [
        {
            "name": "Name",
            "role": "Role (e.g., Developer, Artist)",
            "avatar": "🎨",
            "primary": true
        }
    ]
}
```

## 6. Game Mechanics Standards

### Canvas Setup

```javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Handle high-DPI displays
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

### Game Loop

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

function update(deltaTime) {
    // Game logic here
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw game here
}
```

### Standard Controls

```javascript
const keys = {};

// Keyboard input
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // Standard pause key
    if (e.code === 'KeyP' || e.code === 'Escape') {
        togglePause();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Touch input (required for mobile)
let touchX = 0;
let touchY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchX = touch.clientX;
    touchY = touch.clientY;
}, { passive: false });
```

## 7. External Dependencies

### Allowed

- Google Fonts (via link)
- External image/audio assets (must be HTTPS)
- Small CDN libraries under 100KB

### Not Allowed

- React, Vue, Angular, or other frameworks
- Build tools (webpack, vite, etc.)
- npm packages requiring bundling
- Any dependency requiring server-side processing

## 8. Performance Requirements

- Target 60 FPS on modern devices
- Target 30 FPS minimum on older devices
- First paint under 1 second
- Total load time under 3 seconds
- Support mobile touch controls

## 9. Accessibility

```javascript
// Minimum requirements
// 1. Keyboard navigation
// 2. Visible focus states
// 3. Alt text for images
// 4. Pause functionality
// 5. Color contrast compliance
```

## 10. Validation Checklist

Before submitting a game:

- [ ] All files under 10MB total
- [ ] No em/en dashes in any file
- [ ] Uses relative paths only
- [ ] game.json filled out completely
- [ ] Credits and bio sections populated
- [ ] Back to 4weird link working
- [ ] Mobile touch controls implemented
- [ ] No console errors
- [ ] Works offline (no external JS dependencies)
- [ ] Tested in Chrome, Firefox, Safari

## Quick Reference

```bash
# Copy template to new game
cp -r website/v1/games/html/_TEMPLATE website/v1/games/html/yourgame

# Edit game.json with your info
# Edit index.html (replace GAME_* placeholders)
# Implement game.js
# Test locally by opening index.html
```

## Questions?

See [CONTRIBUTING.md](CONTRIBUTING.md) or contact Matt@MattyJacks.com
