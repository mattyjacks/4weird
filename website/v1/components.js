/**
 * 4weird Games - Shared Components
 * Injects navbar, footer, and analytics across all pages
 * No build step required - pure vanilla JS
 */

(function() {
    'use strict';

    const SITE_CONFIG = {
        name: '4weird Games',
        tagline: 'Future Forward Fun',
        company: 'MattyJacks.com',
        email: 'Matt@MattyJacks.com',
        started: '6/6/26',
        location: 'New Hampshire, USA',
        navItems: [
            { href: '#games', label: 'Games', activeOn: ['index.html', 'games.html'] },
            { href: '#contribute', label: 'Contribute', activeOn: ['contribute.html'] },
            { href: '#contact', label: 'Contact MattyJacks', activeOn: ['contact.html'], cta: true }
        ]
    };

    const ALL_GAMES = [
        { id: 'venturemechanically', title: 'Exit Waterfall Machine', emoji: '💧', path: 'venturemechanically', desc: 'An interactive cap table simulator. Learn why a large startup acquisition can leave founders and employees with absolutely nothing.', tags: ['Simulation', 'Educational'], bg: 'linear-gradient(135deg, #09090e 0%, #1e112a 50%, #00f2fe 100%)', featured: true, weight: 10 },
        { id: 'financialfreedom', title: 'Financial Freedom', emoji: '💵', path: 'financialfreedom', desc: 'A deep, interactive finances simulator for a USA family. Navigate careers, taxes, debt, investments, real estate, and life events.', tags: ['Simulation', 'Strategy'], bg: 'linear-gradient(135deg, #1e3a8a 0%, #0d9488 50%, #10b981 100%)', featured: true, weight: 10 },
        { id: 'serversavershield', title: 'Server Saver Shield', emoji: '🛡️', path: 'serversavershield', desc: 'Defend servers from cyber attacks! Strategic security management meets arcade shooter.', tags: ['Strategy', 'Shooter'], bg: 'linear-gradient(135deg, #0f172a 0%, #111827 50%, #06b6d4 100%)', featured: true, weight: 7 },
        { id: 'overtake', title: 'Overtake', emoji: '🏁', path: 'overtake', desc: 'Race through pseudo-3D routes, unlock faster cars, and use nitro boosts.', tags: ['Racing', 'Arcade'], bg: 'linear-gradient(135deg, #05070a 0%, #3a1510 48%, #ffcf42 100%)', featured: true, weight: 8 },
        { id: 'assassinanimals', title: 'AssassinAnimals', emoji: '🕶️', path: 'assassinanimals', desc: 'Control mutated animal operatives in a stealth rogue-like complex.', tags: ['Stealth', 'Action'], bg: 'linear-gradient(135deg, #09090e 0%, #1e112a 50%, #ff0055 100%)', featured: true, weight: 9 },
        { id: 'battlesharks2', title: 'Battlesharks 2', emoji: '🦈', path: 'battlesharks2', desc: 'Command a genetically modified combat shark and evolve cybernetic weapons.', tags: ['Action', 'Arcade'], bg: 'linear-gradient(135deg, #0b1a30 0%, #1e1b4b 50%, #00f2fe 100%)', featured: true, weight: 7 },
        { id: 'gravegain2d', title: 'GraveGain2D', emoji: '⚔️', path: 'gravegain2d', desc: 'A premium 2D dark fantasy RPG action rogue-like with offline mechanics.', tags: ['Action', 'RPG'], bg: 'linear-gradient(135deg, #180512 0%, #300a1c 50%, #902850 100%)', featured: false, weight: 4 },
        { id: 'gravegain3d', title: 'GraveGain3D', emoji: '🏰', path: 'gravegain3d', desc: 'A 3D dungeon crawler/action game in a dark fantasy setting.', tags: ['Action', '3D'], bg: 'linear-gradient(135deg, #1e1b4b 0%, #0d1527 50%, #7c3aed 100%)', featured: true, weight: 7 },
        { id: 'demolichdom', title: 'Demo Lichdom', emoji: '💀', path: 'demolichdom', desc: 'Navigate the treacherous politics of undead lords.', tags: ['Strategy', 'Dark Fantasy'], bg: 'linear-gradient(135deg, #0d0d12 0%, #1c1524 50%, #8b5cf6 100%)', featured: false, weight: 3 },
        { id: 'fridgesimulator', title: 'Fridge Simulator', emoji: '🥶', path: 'fridgesimulator', desc: 'Manage your fridge, feed your family, save the world.', tags: ['Simulation', 'Strategy'], bg: 'linear-gradient(135deg, #06151f 0%, #0f2d37 50%, #38bdf8 100%)', featured: false, weight: 3 },
        { id: 'DiscoverAmerica', title: 'Madi AI: Discover America', emoji: '🗽', path: 'DiscoverAmerica', desc: 'Explore American history through interactive puzzles and adventures.', tags: ['Adventure', 'Puzzle'], bg: 'linear-gradient(135deg, #051c12 0%, #0a3a24 50%, #10b981 100%)', featured: false, weight: 2 },
        { id: 'orbitaldrift', title: 'Orbital Drift', emoji: '🛸', path: 'orbitaldrift', desc: 'Control your orbit in a beautiful 3D space field and master the rhythm.', tags: ['Arcade', '3D'], bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0891b2 100%)', featured: true, weight: 8 },
        { id: 'aiwhackamole', title: 'AI-whack-a-mole', emoji: '🤖', path: 'aiwhackamole', desc: 'Whack the misaligned/dangerous AIs and spare the user-aligned ones.', tags: ['Arcade', '3D'], bg: 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #4c1d95 100%)', featured: false, weight: 4 },
        { id: 'soundpainter2', title: 'Sound Painter 2', emoji: '🎹', path: 'soundpainter2', desc: 'An advanced, in-depth music production studio.', tags: ['Music', 'Creative'], bg: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #d946ef 100%)', featured: true, weight: 6 },
        { id: 'soundpainter', title: 'Sound Painter', emoji: '🎨', path: 'soundpainter', desc: 'Click tiles to paint music and color. Pure creative expression.', tags: ['Music', 'Creative'], bg: 'linear-gradient(135deg, #2d1b4e 0%, #6b21a8 50%, #d946ef 100%)', featured: false, weight: 4 }
    ];


    let basePath = '';
    const scriptTag = document.querySelector('script[src*="components.js"]');
    if (scriptTag) {
        const src = scriptTag.getAttribute('src');
        const index = src.indexOf('components.js');
        if (index !== -1) {
            basePath = src.substring(0, index);
        }
    }
    const isRoot = basePath === '' || basePath === './';

    function injectNavbar() {
        // Support both legacy and namespaced placeholders
        const placeholder = document.getElementById('TEMPLATE-4weird-nav-placeholder') 
            || document.getElementById('nav-placeholder');
        if (!placeholder) return;

        const navHTML = `
        <nav class="navbar" id="navbar">
            <div class="nav-container">
                <a href="${basePath}index.html" class="logo">
                    <span class="logo-emoji">🎮</span>
                    <span class="logo-text">4weird<span class="logo-accent">Games</span></span>
                </a>
                <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <ul class="nav-menu" id="navMenu">
                    <li><a href="https://4weird.com/games" class="nav-link">Games</a></li>
                    <li><a href="${basePath}games/html/madi/" class="nav-link">MADI AI</a></li>
                    <li><a href="${basePath}tech.html" class="nav-link">Technology</a></li>
                    <li><a href="${basePath}academy/index.html" class="nav-link">Academy</a></li>
                    <li><a href="${isRoot ? '#contribute' : basePath + 'index.html#contribute'}" class="nav-link">Contribute</a></li>
                    <li><a href="${isRoot ? '#contact' : basePath + 'index.html#contact'}" class="nav-link nav-cta">Contact MattyJacks</a></li>
                </ul>
            </div>
        </nav>
        `;

        placeholder.outerHTML = navHTML;

        // Initialize mobile toggle
        setTimeout(() => {
            const toggle = document.getElementById('navToggle');
            const menu = document.getElementById('navMenu');
            if (toggle && menu) {
                toggle.addEventListener('click', () => {
                    menu.classList.toggle('active');
                    toggle.classList.toggle('active');
                });
            }
        }, 0);
    }

    function injectFooter() {
        // Support both legacy and namespaced placeholders
        const placeholder = document.getElementById('TEMPLATE-4weird-footer-placeholder')
            || document.getElementById('footer-placeholder');
        if (!placeholder) return;

        const footerHTML = `
        <footer class="footer">
            <div class="container">
                <div class="footer-content">
                    <div class="footer-brand">
                        <span class="footer-logo">🎮 4weird<span class="footer-accent">Games</span></span>
                        <p class="footer-tagline">${SITE_CONFIG.tagline}</p>
                    </div>
                    <div class="footer-links">
                        <a href="https://4weird.com/games" class="footer-link">Games</a>
                        <a href="${basePath}games/html/madi/" class="footer-link">MADI AI</a>
                        <a href="${basePath}academy/index.html" class="footer-link">Academy</a>
                        <a href="${isRoot ? '#contribute' : basePath + 'index.html#contribute'}" class="footer-link">Contribute</a>
                        <a href="${isRoot ? '#contact' : basePath + 'index.html#contact'}" class="footer-link">Contact MattyJacks</a>
                        <a href="${basePath}privacy-policy.html" class="footer-link">Privacy Policy</a>
                        <a href="https://github.com/mattyjacks/4weird" target="_blank" rel="noopener" class="footer-link">GitHub</a>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p class="footer-copyright">
                        &copy; 2025 ${SITE_CONFIG.name}. A <a href="https://mattyjacks.com" target="_blank" rel="noopener">${SITE_CONFIG.company}</a> Company.
                    </p>
                    <p class="footer-location">${SITE_CONFIG.location} &bull; Global Freelancers &bull; Started ${SITE_CONFIG.started}</p>
                    <p class="footer-slogan">Do and/or DIE TRYING!!!</p>
                </div>
            </div>
        </footer>
        `;

        placeholder.outerHTML = footerHTML;
    }

    function injectAnalytics() {
        // Google Analytics
        if (!document.getElementById('ga-script')) {
            const gaScript = document.createElement('script');
            gaScript.id = 'ga-script';
            gaScript.async = true;
            gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-KZ03RW8P96';
            document.head.appendChild(gaScript);

            const gaConfig = document.createElement('script');
            gaConfig.textContent = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-KZ03RW8P96');
            `;
            document.head.appendChild(gaConfig);
        }

        // Proprietary tracking placeholder
        console.log('[4weird] Proprietary tracking initialized');
    }

    // Global Time-Dilation / Speed Hack logic
    let speedMultiplier = 1.0;
    let lastRealTime = Date.now();
    let virtualTime = Date.now();
    let lastPerfRealTime = performance.now();
    let virtualPerfTime = performance.now();

    // Intercept Date.now
    const originalDateNow = Date.now;
    Date.now = function() {
        const realNow = originalDateNow();
        const delta = realNow - lastRealTime;
        lastRealTime = realNow;
        virtualTime += delta * speedMultiplier;
        return Math.round(virtualTime);
    };

    // Intercept performance.now
    const originalPerfNow = performance.now;
    performance.now = function() {
        const realNow = originalPerfNow.call(performance);
        const delta = realNow - lastPerfRealTime;
        lastPerfRealTime = realNow;
        virtualPerfTime += delta * speedMultiplier;
        return virtualPerfTime;
    };

    // Intercept requestAnimationFrame
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
        return originalRAF(function() {
            callback(performance.now());
        });
    };

    function injectDebugHUD() {
        if (!document.body.classList.contains('TEMPLATE-4weird-game-page') && 
            !window.location.pathname.includes('/games/html/')) {
            return;
        }

        // Add Stylesheet for HUD
        const style = document.createElement('style');
        style.textContent = `
            #fourweird-debug-hud {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 320px;
                background: rgba(10, 10, 25, 0.9);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(0, 242, 254, 0.4);
                box-shadow: 0 0 20px rgba(0, 242, 254, 0.2), inset 0 0 10px rgba(0, 242, 254, 0.1);
                border-radius: 12px;
                font-family: 'Orbitron', 'Inter', sans-serif;
                color: #fff;
                z-index: 999999;
                overflow: hidden;
                font-size: 13px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #fourweird-debug-hud.collapsed {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 242, 254, 0.2);
            }
            #fourweird-debug-toggle {
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 20px;
                user-select: none;
                transition: transform 0.3s ease;
                background: none;
                border: none;
                color: #00f2fe;
            }
            #fourweird-debug-hud.collapsed #fourweird-debug-toggle {
                transform: rotate(0deg);
            }
            #fourweird-debug-hud:not(.collapsed) #fourweird-debug-toggle {
                transform: rotate(180deg);
                position: absolute;
                top: 0;
                right: 0;
            }
            #fourweird-debug-content {
                padding: 16px;
            }
            #fourweird-debug-hud.collapsed #fourweird-debug-content {
                display: none;
            }
            #fourweird-debug-title {
                margin: 0 0 12px 0;
                font-size: 15px;
                font-weight: 700;
                color: #00f2fe;
                border-bottom: 1px solid rgba(0, 242, 254, 0.2);
                padding-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .debug-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            .debug-btn {
                background: rgba(0, 242, 254, 0.1);
                border: 1px solid rgba(0, 242, 254, 0.3);
                color: #00f2fe;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-family: inherit;
                font-size: 12px;
                transition: all 0.2s ease;
                width: 48%;
            }
            .debug-btn:hover {
                background: rgba(0, 242, 254, 0.3);
                border-color: #00f2fe;
                box-shadow: 0 0 8px rgba(0, 242, 254, 0.4);
            }
            .debug-btn.active {
                background: rgba(16, 185, 129, 0.2);
                border-color: #10b981;
                color: #10b981;
                box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
            }
            .debug-input {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #fff;
                padding: 6px;
                border-radius: 6px;
                width: 100px;
                font-family: inherit;
                font-size: 12px;
                text-align: center;
            }
            .debug-slider-container {
                margin-top: 12px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                padding-top: 12px;
            }
            .debug-slider {
                width: 100%;
                accent-color: #00f2fe;
                margin-top: 6px;
            }
        `;
        document.head.appendChild(style);

        // Create HUD Container
        const hud = document.createElement('div');
        hud.id = 'fourweird-debug-hud';
        hud.className = 'collapsed';

        // Toggle Button
        const toggle = document.createElement('button');
        toggle.id = 'fourweird-debug-toggle';
        toggle.innerHTML = '🛠️';
        toggle.onclick = () => {
            hud.classList.toggle('collapsed');
        };
        hud.appendChild(toggle);

        // Content
        const content = document.createElement('div');
        content.id = 'fourweird-debug-content';
        content.innerHTML = `
            <h3 id="fourweird-debug-title">4weird Developer console</h3>
            <div class="debug-row">
                <span>God Mode:</span>
                <button id="debug-godmode-btn" class="debug-btn" style="width:120px;">Disabled</button>
            </div>
            <div class="debug-row">
                <span>Score:</span>
                <div style="display:flex; gap:6px;">
                    <input id="debug-score-val" type="number" class="debug-input" value="1000">
                    <button id="debug-score-btn" class="debug-btn" style="width:50px;">Set</button>
                </div>
            </div>
            <div class="debug-row" style="margin-top: 12px;">
                <button id="debug-win-btn" class="debug-btn">Instant Win</button>
                <button id="debug-lose-btn" class="debug-btn">Instant Lose</button>
            </div>
            <div class="debug-slider-container">
                <div class="debug-row">
                    <span>Game Speed:</span>
                    <span id="debug-speed-text">1.0x</span>
                </div>
                <input id="debug-speed-slider" type="range" min="0.1" max="5.0" step="0.1" value="1.0" class="debug-slider">
            </div>
        `;
        hud.appendChild(content);
        document.body.appendChild(hud);

        // Event Handling
        setTimeout(() => {
            const godModeBtn = document.getElementById('debug-godmode-btn');
            const scoreVal = document.getElementById('debug-score-val');
            const scoreBtn = document.getElementById('debug-score-btn');
            const winBtn = document.getElementById('debug-win-btn');
            const loseBtn = document.getElementById('debug-lose-btn');
            const speedSlider = document.getElementById('debug-speed-slider');
            const speedText = document.getElementById('debug-speed-text');

            // Synchronize with game specific title
            const syncInterval = setInterval(() => {
                if (window.gameDebug) {
                    document.getElementById('fourweird-debug-title').textContent = window.gameDebug.name + ' Debugger';
                    clearInterval(syncInterval);
                }
            }, 500);

            godModeBtn.onclick = () => {
                if (window.gameDebug) {
                    const active = window.gameDebug.toggleGodMode();
                    godModeBtn.classList.toggle('active', active);
                    godModeBtn.textContent = active ? 'ENABLED' : 'DISABLED';
                }
            };

            scoreBtn.onclick = () => {
                if (window.gameDebug) {
                    window.gameDebug.setScore(parseInt(scoreVal.value) || 0);
                }
            };

            winBtn.onclick = () => {
                if (window.gameDebug) {
                    window.gameDebug.win();
                }
            };

            loseBtn.onclick = () => {
                if (window.gameDebug) {
                    window.gameDebug.lose();
                }
            };

            speedSlider.oninput = () => {
                speedMultiplier = parseFloat(speedSlider.value);
                speedText.textContent = speedMultiplier.toFixed(1) + 'x';
            };
        }, 100);
    }

    function injectOtherGames() {
        // Only inject on game pages
        const isGamePage = document.body.classList.contains('TEMPLATE-4weird-game-page') || 
                           window.location.pathname.includes('/games/html/');
        if (!isGamePage) return;

        // Detect current game ID from path
        const pathParts = window.location.pathname.split('/');
        const currentGameId = pathParts.find((part, index) => pathParts[index - 1] === 'html') || '';

        // Use the globally defined games list
        const games = ALL_GAMES;

        // Determine Featured Game: Overtake. If currently on Overtake, use Server Saver Shield
        let featuredGameId = 'overtake';
        if (currentGameId.toLowerCase() === 'overtake') {
            featuredGameId = 'serversavershield';
        }
        const featuredGame = games.find(g => g.id === featuredGameId);

        // Get candidate random games (exclude current and featured)
        const remainingGames = games.filter(g => g.id.toLowerCase() !== currentGameId.toLowerCase() && g.id !== featuredGameId);

        // Shuffle and pick 2 random games
        const shuffled = remainingGames.sort(() => 0.5 - Math.random());
        const selectedRandom = shuffled.slice(0, 2);

        // We now have 3 games to display: featuredGame, selectedRandom[0], selectedRandom[1]
        const displayGames = [
            { ...featuredGame, isFeatured: true },
            ...selectedRandom.map(g => ({ ...g, isFeatured: false }))
        ];

        // Build the HTML for the cards
        const cardsHtml = displayGames.map(g => {
            const url = `../${g.path}/index.html`;
            return `
                <div class="TEMPLATE-4weird-other-game-card ${g.isFeatured ? 'featured' : ''}" style="background: ${g.bg};">
                    ${g.isFeatured ? '<span class="TEMPLATE-4weird-other-game-badge">Featured Game</span>' : ''}
                    <div class="TEMPLATE-4weird-other-game-emoji">${g.emoji}</div>
                    <div class="TEMPLATE-4weird-other-game-info">
                        <h4 class="TEMPLATE-4weird-other-game-title">${g.title}</h4>
                        <p class="TEMPLATE-4weird-other-game-desc">${g.desc}</p>
                        <div class="TEMPLATE-4weird-other-game-tags">
                            ${g.tags.map(t => `<span class="TEMPLATE-4weird-other-game-tag">${t}</span>`).join('')}
                        </div>
                        <a href="${url}" class="TEMPLATE-4weird-other-game-btn">Play Now</a>
                    </div>
                </div>
            `;
        }).join('');

        const otherGamesHTML = `
            <section class="TEMPLATE-4weird-other-games-section">
                <h3 class="TEMPLATE-4weird-other-games-header">Other Games</h3>
                <div class="TEMPLATE-4weird-other-games-grid">
                    ${cardsHtml}
                </div>
                <div style="margin-top: 40px;">
                    <a href="../../../index.html#games" class="TEMPLATE-4weird-back-link">
                        <span class="TEMPLATE-4weird-back-arrow">🎯</span>
                        <span>Browse All Games</span>
                    </a>
                </div>
            </section>
        `;

        // Inject styles dynamically if not already present
        if (!document.getElementById('TEMPLATE-4weird-other-games-styles')) {
            const style = document.createElement('style');
            style.id = 'TEMPLATE-4weird-other-games-styles';
            style.textContent = `
                .TEMPLATE-4weird-other-games-section {
                    background: #06060c;
                    border-top: 1px solid rgba(139, 92, 246, 0.2);
                    padding: 60px 20px;
                    text-align: center;
                    font-family: 'Inter', sans-serif;
                    color: #ffffff;
                    width: 100%;
                    box-sizing: border-box;
                }
                .TEMPLATE-4weird-other-games-header {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 2rem;
                    margin-top: 0;
                    margin-bottom: 40px;
                    color: #00f2fe;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    text-shadow: 0 0 10px rgba(0, 242, 254, 0.3);
                }
                .TEMPLATE-4weird-other-games-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 25px;
                    max-width: 1100px;
                    margin: 0 auto;
                }
                .TEMPLATE-4weird-other-game-card {
                    border-radius: 16px;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                    min-height: 320px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    text-align: center;
                    box-sizing: border-box;
                }
                .TEMPLATE-4weird-other-game-card:hover {
                    transform: translateY(-8px);
                    border-color: #00f2fe;
                    box-shadow: 0 15px 40px rgba(0, 242, 254, 0.25);
                }
                .TEMPLATE-4weird-other-game-card.featured {
                    border: 2px solid #ffcf42;
                    box-shadow: 0 10px 35px rgba(255, 207, 66, 0.2);
                }
                .TEMPLATE-4weird-other-game-card.featured:hover {
                    border-color: #ffcf42;
                    box-shadow: 0 15px 45px rgba(255, 207, 66, 0.45);
                }
                .TEMPLATE-4weird-other-game-badge {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: #ffcf42;
                    color: #000000;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 4px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                }
                .TEMPLATE-4weird-other-game-emoji {
                    font-size: 4rem;
                    margin-bottom: 15px;
                    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.2));
                    transition: transform 0.3s ease;
                }
                .TEMPLATE-4weird-other-game-card:hover .TEMPLATE-4weird-other-game-emoji {
                    transform: scale(1.1) rotate(5deg);
                }
                .TEMPLATE-4weird-other-game-info {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    flex-grow: 1;
                }
                .TEMPLATE-4weird-other-game-title {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 1.3rem;
                    margin: 0 0 10px 0;
                    color: #ffffff;
                }
                .TEMPLATE-4weird-other-game-desc {
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.7);
                    margin: 0 0 15px 0;
                    line-height: 1.5;
                    flex-grow: 1;
                }
                .TEMPLATE-4weird-other-game-tags {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .TEMPLATE-4weird-other-game-tag {
                    font-size: 0.75rem;
                    background: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.9);
                    padding: 4px 8px;
                    border-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .TEMPLATE-4weird-other-game-btn {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #ffffff;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 10px 24px;
                    border-radius: 6px;
                    text-decoration: none;
                    transition: all 0.2s ease;
                    width: 100%;
                    box-sizing: border-box;
                }
                .TEMPLATE-4weird-other-game-card:hover .TEMPLATE-4weird-other-game-btn {
                    background: #ffffff;
                    color: #000000;
                    border-color: #ffffff;
                }
                .TEMPLATE-4weird-other-game-card.featured:hover .TEMPLATE-4weird-other-game-btn {
                    background: #ffcf42;
                    color: #000000;
                    border-color: #ffcf42;
                }
            `;
            document.head.appendChild(style);
        }

        const existingMoreGames = document.querySelector('.TEMPLATE-4weird-more-games');
        if (existingMoreGames) {
            existingMoreGames.outerHTML = otherGamesHTML;
        } else {
            // Find footer placeholder or footer and insert before it
            const footerPlaceholder = document.getElementById('TEMPLATE-4weird-footer-placeholder') || 
                                      document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                const container = document.createElement('div');
                container.innerHTML = otherGamesHTML;
                footerPlaceholder.parentNode.insertBefore(container.firstElementChild, footerPlaceholder);
            }
        }
    }

    function initSmartScrollHeader() {
        const isGamePage = document.body.classList.contains('TEMPLATE-4weird-game-page') || 
                           window.location.pathname.includes('/games/html/');
        if (!isGamePage) return;

        let lastScrollY = window.scrollY;
        let ticking = false;

        function updateHeaders() {
            const currentScrollY = window.scrollY;
            const navbar = document.getElementById('navbar');
            const gameHeader = document.querySelector('.TEMPLATE-4weird-game-header');
            const scrollThreshold = 80;

            if (navbar) {
                if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
                    navbar.classList.add('nav-hidden');
                    if (gameHeader) gameHeader.classList.add('nav-hidden');
                } else if (currentScrollY < lastScrollY || currentScrollY <= scrollThreshold) {
                    navbar.classList.remove('nav-hidden');
                    if (gameHeader) gameHeader.classList.remove('nav-hidden');
                }
            }
            
            lastScrollY = Math.max(0, currentScrollY);
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(updateHeaders);
                ticking = true;
            }
        }, { passive: true });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        injectNavbar();
        injectFooter();
        injectAnalytics();
        injectDebugHUD();
        injectOtherGames();
        initSmartScrollHeader();
    }

    // Expose for manual use
    window.FourWeirdComponents = {
        injectNavbar,
        injectFooter,
        injectAnalytics,
        injectDebugHUD,
        injectOtherGames,
        config: SITE_CONFIG,
        games: ALL_GAMES
    };
})();
