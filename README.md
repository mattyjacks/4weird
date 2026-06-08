# 4weird Games 🎮

**The open HTML5 game platform where weird ideas become playable reality.**

Started 6/6/26 | A [MattyJacks.com](https://mattyjacks.com) Company

---

## 🚀 CONTRIBUTE YOUR GAME - GET FEATURED TODAY

**Have a weird game idea? We want it.** 4weird is an **open, contributor-first platform**. Every accepted game gets:

- ✅ **Permanent featuring** on 4weird.games
- ✅ **Dedicated game page** with credits & your bio
- ✅ **Social promotion** across our channels
- ✅ **GitHub contributor credit** in the repo
- ✅ **Backlink to your portfolio** from a live site

### It takes 4 steps to go from idea to live:

```bash
# 1. Fork & clone
gh repo fork mattyjacks/4weird --clone

# 2. Copy the template
cp -r website/v1/games/html/_TEMPLATE website/v1/games/html/yourgame

# 3. Build your game (index.html + game.js + game.css)
# Edit game.json with your credits and bio

# 4. PR and ship
git add . && git commit -m "Add: Your Game Name" && git push
# Open PR -> We review fast -> You're live!
```

### 🎯 The Template Does The Heavy Lifting

Our **`_TEMPLATE/`** folder gives you everything:
- Pre-built game page structure
- Shared nav/footer (automatic)
- Credits section (populated from `game.json`)
- Maker bio section (your story, your links)
- Mobile-ready responsive layout
- "More Games" cross-promotion

**Max 10MB per game.** Big assets? Host externally and link. No build tools needed.

### [👉 CLICK HERE TO FORK AND START BUILDING](https://github.com/mattyjacks/4weird/fork)

Full details, conventions, and code standards in **[CONTRIBUTING.md](CONTRIBUTING.md)**.

---

## 🎮 Play Games

Visit [4weird.games](https://4weird.games) or open `website/v1/index.html` locally.

Current lineup:
- **Demo Lichdom** - Command skeletons to demolish buildings
- **Server Saver Shield** - Cyber defense arcade shooter
- **Fridge Simulator** - Global food logistics management
- **Madi AI: Discover America** - Sort data to chart a voyage
- **Template Demo** - See how the template works

---

## 🛠️ Tech Stack

| Requirement | Specification |
|-------------|---------------|
| **Engine** | Pure HTML5 Canvas + vanilla JS |
| **Styling** | CSS variables from `styles.css` |
| **Template** | `_TEMPLATE/` folder with namespaced classes (`TEMPLATE-4weird-*`) |
| **Size Limit** | 10MB max (external assets for large files) |
| **Build Step** | None. Zero. Just open in browser. |

---

## 📋 Quick Reference for Contributors

```
website/v1/games/html/yourgame/
├── index.html          # Uses TEMPLATE-4weird-* classes
├── game.js             # Your game logic
├── game.css            # Your styles (optional)
└── game.json           # Credits, bio, controls info
```

**Naming convention:** All template classes are prefixed with `TEMPLATE-4weird-` to avoid CSS conflicts with your game-specific styles.

---

## 🤝 Why Contribute?

- **Visibility:** Your game on a curated platform
- **Portfolio:** Live demo + source code + credits
- **Community:** Join other weird game makers
- **Simple:** Copy template, build game, PR, done

**Weird is welcome. Polished is appreciated. Both together? That's 4weird.**

---

*Do and/or DIE TRYING!!!*
