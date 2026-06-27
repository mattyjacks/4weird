# Contributing to 4weird Games 🚀

**Ready to ship your weird game to thousands of players? You're in the right place.**

4weird is a **contributor-first platform**. We prioritize getting your game live fast with full credit, attribution, and promotion.

---

## 🎯 WHY CONTRIBUTE? (What's In It For You)

Every accepted game receives:

| Benefit | What You Get |
|---------|--------------|
| **🌐 Live Featuring** | Permanent spot on 4weird.games with dedicated page |
| **👤 Full Credits** | Name, role, avatar, and links on your game's page |
| **📝 Maker Bio** | 200-word bio section to tell your story |
| **🔗 SEO Backlink** | Do-follow link from an established gaming site |
| **📱 Social Boost** | We promote new games on our channels |
| **⭐ GitHub Credit** | Listed as contributor in the repo |
| **🎮 Cross-Promotion** | Your game appears in "More Games" on other pages |

**Zero cost. Full attribution. You keep ownership.**

---

## 🚦 THE 4-STEP FAST TRACK

### Step 1: Fork & Clone (30 seconds)

```bash
# Using GitHub CLI (recommended)
gh repo fork mattyjacks/4weird --clone
cd 4weird

# Or manual:
git clone https://github.com/YOUR-USERNAME/4weird.git
cd 4weird
git checkout -b game/your-game-name
```

### Step 2: Use The Template (1 minute)

```bash
# Copy the template folder
cp -r website/v1/games/html/_TEMPLATE website/v1/games/html/your-game-name

# Edit the metadata file with YOUR info
# This drives credits and bio automatically
```

**What you get in `_TEMPLATE/`:**
- `index.html` - Full game page with all sections (uses `TEMPLATE-4weird-*` classes)
- `game.json` - Your metadata: title, credits, bio, controls
- `game.css` - Optional overrides (template styles come from main stylesheet)
- Automatic nav, footer, credits section, bio section, "More Games" CTA

### Step 3: Build Your Game (the fun part)

**Required files in your folder:**
```
website/v1/games/html/your-game-name/
├── index.html      # Entry point (from template)
├── game.js         # Your game logic
├── game.css        # Your styles (optional)
├── game.json       # Metadata for credits/bio
└── (external assets linked by URL)
```

**Critical requirements:**
- ✅ Pure HTML5 + vanilla JS (no frameworks, no build step)
- ✅ Max 10MB total per game
- ✅ Large files (audio, video, big images) hosted externally & linked
- ✅ Uses the dynamic header and footer template placeholders (`TEMPLATE-4weird-nav-placeholder` and `TEMPLATE-4weird-footer-placeholder`) and links `components.js` relative path
- ✅ Uses `TEMPLATE-4weird-*` classes for template elements
- ✅ Includes `game.json` with your credits and bio
- ✅ Opens directly in browser (no server needed)

**game.json template:**
```json
{
    "title": "Your Game",
    "slug": "your-game-name",
    "description": "One sentence hook",
    "genre": "Arcade",
    "maker": {
        "name": "Your Name",
        "bio": "Your story (50-200 words). What inspires you? Your style?",
        "url": "https://yourportfolio.com",
        "urlLabel": "Portfolio"
    },
    "credits": [
        {
            "name": "Your Name",
            "role": "Developer",
            "avatar": "🎨",
            "primary": true
        }
    ],
    "controls": {
        "keyboard": {"Arrow Keys": "Move", "Space": "Action"},
        "touch": true
    }
}
```

### Step 4: Add Game Card & PR (2 minutes)

**Add your game to the main page:**

Open `website/v1/index.html`, find `<div class="games-grid">`, and add:

```html
<div class="game-card reveal live">
    <div class="game-thumbnail">
        <div class="thumb-bg thumb-yourgame"></div>
        <div class="thumb-overlay"><span class="play-btn">▶️</span></div>
        <span class="game-badge live-badge">LIVE</span>
    </div>
    <div class="game-info">
        <h3 class="game-title">Your Game</h3>
        <p class="game-desc">Short punchy description of your weird game.</p>
        <div class="game-tags">
            <span class="tag">HTML5</span>
            <span class="tag">YourGenre</span>
        </div>
        <a href="games/html/your-game-name/index.html" class="btn btn-game">
            <span class="btn-emoji">🎮</span> Play Now
        </a>
    </div>
</div>
```

**Optional: Add thumbnail style to `styles.css`:**
```css
.thumb-yourgame {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    position: relative;
}
.thumb-yourgame::before {
    content: '🎲 🚀';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2.5rem;
}
```

**Commit and ship:**
```bash
git add .
git commit -m "Add: Your Game Name - short description"
git push origin game/your-game-name

# Open PR on GitHub
# Include in PR description:
# - Game summary (1 sentence)
# - How to play / controls
# - Anything special we should know
```

---

## 📋 WHAT WE ACCEPT

**YES - Send these:**
- ✅ Weird, creative, fun browser games
- ✅ Tiny experiments (even 1-day builds)
- ✅ Polished arcade/shooter/puzzle/strategy games
- ✅ Educational games with engaging mechanics
- ✅ Emoji-graphics games (no art skills required!)
- ✅ Mobile-touch friendly games

**NO - Don't send these:**
- ❌ Games requiring build tools (webpack, vite, etc.)
- ❌ Framework-dependent games (React, Vue, Angular)
- ❌ Server-side required games (PHP, Node backend)
- ❌ Hateful, illegal, or explicit content
- ❌ Games over 10MB with all assets bundled

---

## 🎨 CODE STANDARDS (Quick Checklist)

Before submitting, verify:

- [ ] Uses standard header and footer placeholders (`TEMPLATE-4weird-nav-placeholder` and `TEMPLATE-4weird-footer-placeholder`) and imports `components.js` (this automatically provides navbar, footer, and the Privacy Policy link)
- [ ] Uses `TEMPLATE-4weird-` classes for template elements
- [ ] `game.json` populated with your info
- [ ] No em/en dashes in code (use hyphens `-` only)
- [ ] All paths relative (`../../` not `/`)
- [ ] Total folder under 10MB
- [ ] Large assets linked externally (not bundled)
- [ ] Works by opening `index.html` directly
- [ ] Mobile touch controls (if applicable)
- [ ] Pause functionality (P or Esc key)

**See [CODING_STANDARD.md](CODING_STANDARD.md) for full conventions.**

---

## 🔄 REVIEW PROCESS

1. **Submit PR** → Automated checks run
2. **Human review** → We play your game (usually within 24-48 hours)
3. **Feedback** → If needed, we suggest changes (friendly, constructive)
4. **Merge** → You go live on 4weird.games immediately
5. **Promote** → We shout out new games on social channels

**We want to merge your game.** The weirder, the better.

---

## 🆘 NEED HELP?

- **Template questions?** Check `website/v1/games/html/_TEMPLATE/`
- **Code standards?** Read [CODING_STANDARD.md](CODING_STANDARD.md)
- **Skill file for AI agents?** Use `skill.md` with ID `4weird-game-dev-by-mattyjacks`
- **Direct contact:** Matt@MattyJacks.com or [mattyjacks.com/contact](https://mattyjacks.com/contact)

---

## 📜 LICENSE & OWNERSHIP

By contributing, you confirm:
- Your submission is your original work OR properly licensed
- You grant 4weird the right to host and showcase your game
- **You retain full ownership** of your game and code
- Your game stays open source in this repo under our private license (all rights reserved)

---

## 🎮 READY TO BUILD?

### [👉 FORK THE REPO AND START NOW](https://github.com/mattyjacks/4weird/fork)

**Copy the template. Make it weird. Ship it.**

*Do and/or DIE TRYING!!!*
