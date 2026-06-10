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
            gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
            document.head.appendChild(gaScript);

            const gaConfig = document.createElement('script');
            gaConfig.textContent = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'GA_MEASUREMENT_ID');
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
    }

    // Expose for manual use
    window.FourWeirdComponents = {
        injectNavbar,
        injectFooter,
        injectAnalytics,
        injectDebugHUD,
        config: SITE_CONFIG
    };
})();
