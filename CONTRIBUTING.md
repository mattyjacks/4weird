# Contributing to 4weird Games

Thanks for wanting to make something weird with us! 4weird is an open collection of
browser-playable games, and we love new contributions. Whether it is a tiny experiment
or a polished arcade title, if it runs in a browser and it is fun, we want it.

Every accepted game gets credited to its author on the site.

## What we are looking for

- **Pure HTML5 games** - HTML, CSS, and vanilla JavaScript (or a small self-contained library). No build step required.
- **Instant play** - the game should run by opening `index.html`, with no install or server needed.
- **Weird, creative, fun** - originality is welcome. Surprise us.
- **Family-friendly-ish** - keep it tasteful. No hateful, illegal, or explicit content.

## Project structure

Each HTML game lives in its own folder:

```
website/v1/
  index.html          <- main landing page (game cards live here)
  styles.css
  script.js
  games/
    html/
      yourgame/        <- your game folder
        index.html     <- entry point
        game.js        <- your game logic
        game.css       <- your styles
```

## Step-by-step

### 1. Fork and clone

1. Fork https://github.com/mattyjacks/4weird on GitHub.
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/4weird.git
   cd 4weird
   ```
3. Create a branch:
   ```bash
   git checkout -b game/yourgame
   ```

### 2. Build your game

1. Create your folder: `website/v1/games/html/yourgame/`.
2. Add an `index.html` entry point. Keep assets relative to your folder.
3. Add a header link back to the main site so players can return:
   ```html
   <a href="../../../index.html" class="back-btn">&larr; Back</a>
   ```
4. Test it by opening `website/v1/games/html/yourgame/index.html` in your browser.

### 3. Add your game card to the landing page

Open `website/v1/index.html`, find the `<!-- Games Section -->`, and add a new card
inside `<div class="games-grid">`. Use an existing card as a template:

```html
<div class="game-card reveal live">
    <div class="game-thumbnail">
        <div class="thumb-bg thumb-yourgame"></div>
        <div class="thumb-overlay"><span class="play-btn">&#9654;&#65039;</span></div>
        <span class="game-badge live-badge">LIVE</span>
    </div>
    <div class="game-info">
        <h3 class="game-title">Your Game</h3>
        <p class="game-desc">A short, punchy description of your weird game.</p>
        <div class="game-tags">
            <span class="tag">HTML5</span>
            <span class="tag">YourGenre</span>
        </div>
        <a href="games/html/yourgame/index.html" class="btn btn-game">
            <span class="btn-emoji">&#127918;</span> Play Now
        </a>
    </div>
</div>
```

Then add a matching thumbnail style in `website/v1/styles.css` (optional but nice):

```css
.thumb-yourgame { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); position: relative; }
.thumb-yourgame::before { content: '🎲 🚀'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2.5rem; letter-spacing: 8px; }
```

### 4. Open a pull request

1. Commit your work:
   ```bash
   git add .
   git commit -m "Add Your Game"
   git push origin game/yourgame
   ```
2. Open a pull request against `mattyjacks/4weird`.
3. In the PR description, include:
   - A one-line summary of the game.
   - How to play / controls.
   - How you would like to be credited (name + optional link).

## Review

We review quickly, give friendly feedback, and merge the weird ones live. If something
needs changes we will let you know in the PR. That is it - go make something weird!

## License and ownership

By contributing, you confirm your submission is your own work (or properly licensed),
and you agree it can be hosted and showcased as part of the 4weird Games project.
