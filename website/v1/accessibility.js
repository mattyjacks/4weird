/**
 * 4weird Games - Accessibility & Eye Tracking Suite
 * Comprehensive features for keyboard navigation, eye tracking (WebGazer),
 * screen readers, and dynamic styling adjustments.
 */

(function() {
    'use strict';

    // Global settings state
    const settings = {
        reducedMotion: false,
        highContrast: false,
        textSize: 'normal', // normal, large, xlarge
        colorBlindness: 'none', // none, protanopia, deuteranopia, tritanopia
        dyslexiaFont: false,
        eyeTracking: false,
        dwellTime: 800, // ms
        gameSpeed: 1.0 // speed multiplier for games
    };

    // Load settings from localStorage
    function loadSettings() {
        const saved = localStorage.getItem('4weird_a11y_settings');
        if (saved) {
            try {
                Object.assign(settings, JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse a11y settings', e);
            }
        }
    }

    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem('4weird_a11y_settings', JSON.stringify(settings));
        applySettings();
    }

    // Apply settings to document classes & state
    function applySettings() {
        const body = document.body;
        if (!body) return;

        // Reduced Motion
        body.classList.toggle('a11y-reduced-motion', settings.reducedMotion);

        // High Contrast
        body.classList.toggle('a11y-high-contrast', settings.highContrast);

        // Text Size
        body.classList.remove('a11y-text-large', 'a11y-text-xlarge');
        if (settings.textSize === 'large') {
            body.classList.add('a11y-text-large');
        } else if (settings.textSize === 'xlarge') {
            body.classList.add('a11y-text-xlarge');
        }

        // Color Blindness Filters
        body.classList.remove('a11y-protanopia', 'a11y-deuteranopia', 'a11y-tritanopia');
        if (settings.colorBlindness !== 'none') {
            body.classList.add(`a11y-${settings.colorBlindness}`);
        }

        // Dyslexia-Friendly Font
        body.classList.toggle('a11y-dyslexic', settings.dyslexiaFont);

        // Game Speed global
        window.gameSpeedMultiplier = parseFloat(settings.gameSpeed) || 1.0;
        announceToScreenReader(`Game speed set to ${settings.gameSpeed}x`);

        // Eye Tracking status
        if (settings.eyeTracking) {
            initEyeTracking();
        } else {
            stopEyeTracking();
        }

        // Sync control elements in the settings panel
        updatePanelUI();
    }

    // Screen Reader Announcer
    let srAnnouncer = null;
    function initScreenReaderAnnouncer() {
        if (document.getElementById('a11y-announcer')) return;
        srAnnouncer = document.createElement('div');
        srAnnouncer.id = 'a11y-announcer';
        srAnnouncer.className = 'a11y-announcement-sr';
        srAnnouncer.setAttribute('aria-live', 'polite');
        srAnnouncer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(srAnnouncer);
    }

    window.announceToScreenReader = function(message) {
        if (!srAnnouncer) {
            initScreenReaderAnnouncer();
        }
        if (srAnnouncer) {
            srAnnouncer.textContent = '';
            // Timeout to force screen reader announcement trigger
            setTimeout(() => {
                srAnnouncer.textContent = message;
            }, 50);
        }
    };

    // Inject SVG filters for colorblindness
    function injectSvgFilters() {
        if (document.getElementById('a11y-svg-filters')) return;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'a11y-svg-filters';
        svg.style.display = 'none';
        svg.innerHTML = `
            <defs>
                <filter id="protanopia-filter">
                    <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0"/>
                </filter>
                <filter id="deuteranopia-filter">
                    <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0"/>
                </filter>
                <filter id="tritanopia-filter">
                    <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0"/>
                </filter>
            </defs>
        `;
        document.body.appendChild(svg);
    }

    // Keyboard Navigation Tweaks
    function setupKeyboardNavigation() {
        // Skip link
        if (!document.querySelector('.skip-to-content')) {
            const skipLink = document.createElement('a');
            skipLink.href = '#main-content-anchor';
            skipLink.className = 'skip-to-content';
            skipLink.textContent = 'Skip to main content';
            document.body.insertBefore(skipLink, document.body.firstChild);
        }

        // Find or create main content anchor
        const main = document.querySelector('main') || document.querySelector('.hero') || document.body;
        if (main && !document.getElementById('main-content-anchor')) {
            const anchor = document.createElement('div');
            anchor.id = 'main-content-anchor';
            anchor.style.position = 'absolute';
            anchor.style.top = '0';
            main.insertBefore(anchor, main.firstChild);
        }

        // WASD key remapping for game canvases
        window.addEventListener('keydown', (e) => {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'CANVAS' || activeEl.id.includes('game') || activeEl.className.includes('game'))) {
                let simulatedKey = null;
                switch(e.key.toLowerCase()) {
                    case 'w': simulatedKey = 'ArrowUp'; break;
                    case 'a': simulatedKey = 'ArrowLeft'; break;
                    case 's': simulatedKey = 'ArrowDown'; break;
                    case 'd': simulatedKey = 'ArrowRight'; break;
                }
                if (simulatedKey) {
                    // Dispatch synthetic key event
                    const eventInit = { key: simulatedKey, code: simulatedKey, bubbles: true, cancelable: true };
                    activeEl.dispatchEvent(new KeyboardEvent('keydown', eventInit));
                }
            }
        });

        // Ensure game canvases are focusable
        const canvases = document.querySelectorAll('canvas:not(#starfield):not(#TEMPLATE-4weird-starfield)');
        canvases.forEach(canvas => {
            if (!canvas.hasAttribute('tabindex')) {
                canvas.setAttribute('tabindex', '0');
            }
            if (!canvas.hasAttribute('aria-label')) {
                canvas.setAttribute('aria-label', 'Game canvas. Use arrow keys or WASD to navigate.');
            }
        });
    }

    // WebGazer Eye Tracking Manager
    let webgazerLoaded = false;
    let webgazerRunning = false;
    let gazeDot = null;
    let calibrationOverlay = null;
    let calibrationPointsLeft = 9;

    function initEyeTracking() {
        if (webgazerRunning) return;

        if (!webgazerLoaded) {
            loadWebGazerScript();
            return;
        }

        startWebGazer();
    }

    function loadWebGazerScript() {
        const urls = [
            'https://cdn.jsdelivr.net/gh/jspsych/jspsych@jspsych@7.0.0/examples/js/webgazer/webgazer.js',
            'https://webgazer.cs.brown.edu/webgazer.js'
        ];

        let index = 0;
        function loadNext() {
            if (index >= urls.length) {
                console.error('All WebGazer sources failed to load');
                settings.eyeTracking = false;
                saveSettings();
                return;
            }
            const script = document.createElement('script');
            script.src = urls[index];
            script.onload = () => {
                webgazerLoaded = true;
                startWebGazer();
            };
            script.onerror = () => {
                index++;
                loadNext();
            };
            document.head.appendChild(script);
        }
        loadNext();
    }

    function startWebGazer() {
        if (!window.webgazer) {
            console.error('WebGazer object not found globally');
            return;
        }

        // Create gaze dot visual feedback
        if (!gazeDot) {
            gazeDot = document.createElement('div');
            gazeDot.id = 'webgazerGazeDot';
            document.body.appendChild(gazeDot);
        }
        gazeDot.classList.add('active');

        // Check if calibration is required
        const calibrated = localStorage.getItem('4weird_gazer_calibrated');
        if (!calibrated) {
            showCalibrationOverlay();
        }

        // Initialize WebGazer
        window.webgazer.setGazeListener(handleGaze).begin();
        window.webgazer.showVideoPreview(true)
            .showPredictionPoints(false);

        // Position WebGazer video window to top-left securely
        setTimeout(() => {
            const video = document.getElementById('webgazerVideoFeed');
            const canvas = document.getElementById('webgazerVideoCanvas');
            [video, canvas].forEach(el => {
                if (el) {
                    el.style.position = 'fixed';
                    el.style.top = '10px';
                    el.style.left = '10px';
                    el.style.zIndex = '99999';
                    el.style.width = '160px';
                    el.style.height = '120px';
                    el.style.border = '2px solid var(--neon-cyan)';
                    el.style.borderRadius = '8px';
                }
            });
        }, 1000);

        webgazerRunning = true;
        announceToScreenReader("Eye tracking initialized. Face the camera and calibrate by clicking the red dots.");
    }

    function stopEyeTracking() {
        if (!webgazerRunning) return;
        if (window.webgazer) {
            window.webgazer.end();
        }
        if (gazeDot) {
            gazeDot.classList.remove('active');
        }
        // Remove video feedback elements if they exist
        const video = document.getElementById('webgazerVideoFeed');
        const canvas = document.getElementById('webgazerVideoCanvas');
        if (video) video.remove();
        if (canvas) canvas.remove();

        webgazerRunning = false;
        announceToScreenReader("Eye tracking disabled.");
    }

    // Dwell click detection variables
    let lastGazeTime = 0;
    let lastGazeX = 0;
    let lastGazeY = 0;
    let dwellTarget = null;
    let dwellStart = 0;
    const dwellThreshold = 50; // pixels radius

    function handleGaze(data, elapsedTime) {
        if (!data) return;

        const x = data.x;
        const y = data.y;

        // Move the gaze dot
        if (gazeDot) {
            gazeDot.style.left = `${x}px`;
            gazeDot.style.top = `${y}px`;
        }

        // Dwell Click Check
        const now = Date.now();
        const dist = Math.hypot(x - lastGazeX, y - lastGazeY);

        if (dist < dwellThreshold) {
            if (now - lastGazeTime > 50) { // update check interval
                // Check what element is under coordinates
                const element = document.elementFromPoint(x, y);
                if (element && isInteractive(element)) {
                    if (dwellTarget === element) {
                        const elapsed = now - dwellStart;
                        const ratio = Math.min(elapsed / settings.dwellTime, 1);
                        
                        // Shrink gaze dot to show clicking progress
                        if (gazeDot) {
                            gazeDot.style.transform = `translate(-10px, -10px) scale(${2 - ratio * 1.5})`;
                        }

                        if (elapsed >= settings.dwellTime) {
                            // Click target
                            element.click();
                            // Visual success flash
                            if (gazeDot) {
                                gazeDot.style.backgroundColor = '#10b981';
                                setTimeout(() => {
                                    gazeDot.style.backgroundColor = '';
                                }, 200);
                            }
                            dwellStart = now + 1000; // block repeat click for 1s
                            announceToScreenReader(`Clicked ${element.innerText || 'element'}`);
                        }
                    } else {
                        dwellTarget = element;
                        dwellStart = now;
                    }
                } else {
                    dwellTarget = null;
                    if (gazeDot) gazeDot.style.transform = 'translate(-10px, -10px) scale(1)';
                }
            }
        } else {
            dwellTarget = null;
            if (gazeDot) gazeDot.style.transform = 'translate(-10px, -10px) scale(1)';
            lastGazeX = x;
            lastGazeY = y;
        }
        lastGazeTime = now;
    }

    function isInteractive(el) {
        if (!el) return false;
        const tag = el.tagName.toLowerCase();
        if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || tag === 'textarea') return true;
        if (el.hasAttribute('onclick') || el.classList.contains('a11y-calibration-point')) return true;
        if (el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1') return true;
        return false;
    }

    // Calibration Overlay Flow
    function showCalibrationOverlay() {
        if (calibrationOverlay) {
            calibrationOverlay.remove();
        }

        calibrationOverlay = document.createElement('div');
        calibrationOverlay.className = 'a11y-calibration-overlay active';
        
        calibrationOverlay.innerHTML = `
            <div class="a11y-calibration-instructions">
                <h2>Eye Tracking Calibration</h2>
                <p>Welcome! Let's calibrate your camera for eye tracking.</p>
                <p><strong>Instructions:</strong> Look directly at each red target dot on the screen and click it. Each point requires 5 clicks while looking directly at it. When a point turns green, it is fully calibrated.</p>
                <button class="btn btn-primary a11y-calibration-btn" id="start-cal-btn">Start Calibration</button>
            </div>
        `;

        document.body.appendChild(calibrationOverlay);

        document.getElementById('start-cal-btn').addEventListener('click', () => {
            const instr = calibrationOverlay.querySelector('.a11y-calibration-instructions');
            if (instr) instr.remove();
            startCalibrationPoints();
        });
    }

    function startCalibrationPoints() {
        calibrationPointsLeft = 9;
        const counts = Array(9).fill(0);

        for (let i = 1; i <= 9; i++) {
            const pt = document.createElement('div');
            pt.className = `a11y-calibration-point a11y-cal-point-pt${i}`;
            pt.dataset.index = i - 1;
            pt.setAttribute('role', 'button');
            pt.setAttribute('aria-label', `Calibration target ${i}`);
            
            pt.addEventListener('click', (e) => {
                const idx = parseInt(pt.dataset.index);
                counts[idx]++;
                
                // Color gets progressively greener
                const progress = counts[idx] / 5;
                pt.style.backgroundColor = `rgb(${Math.floor(255 - progress * 239)}, ${Math.floor(progress * 185)}, ${Math.floor(85 + progress * 44)})`;
                
                if (counts[idx] >= 5) {
                    pt.style.pointerEvents = 'none';
                    pt.style.boxShadow = '0 0 15px #10b981';
                    pt.style.backgroundColor = '#10b981';
                    
                    calibrationPointsLeft--;
                    if (calibrationPointsLeft <= 0) {
                        // All points calibrated
                        setTimeout(() => {
                            calibrationOverlay.classList.remove('active');
                            calibrationOverlay.remove();
                            localStorage.setItem('4weird_gazer_calibrated', 'true');
                            announceToScreenReader("Calibration complete! Eye tracking is active.");
                        }, 500);
                    }
                }
            });

            calibrationOverlay.appendChild(pt);
        }
    }

    // Dynamic settings panel widget creation
    let widgetToggle = null;
    let panel = null;

    function buildSettingsUI() {
        if (document.getElementById('a11y-toggle-btn')) return;

        // Toggle button
        widgetToggle = document.createElement('button');
        widgetToggle.id = 'a11y-toggle-btn';
        widgetToggle.className = 'a11y-widget-toggle';
        widgetToggle.setAttribute('aria-label', 'Accessibility settings panel');
        widgetToggle.setAttribute('aria-haspopup', 'true');
        widgetToggle.innerHTML = '♿';
        document.body.appendChild(widgetToggle);

        // Panel Container
        panel = document.createElement('div');
        panel.className = 'a11y-panel';
        panel.id = 'a11y-settings-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'Accessibility Settings');

        // Dynamically get the base path to ensure correctness of reference pages
        let basePath = '';
        const compTag = document.querySelector('script[src*="components.js"]');
        if (compTag) {
            const src = compTag.getAttribute('src');
            const index = src.indexOf('components.js');
            if (index !== -1) {
                basePath = src.substring(0, index);
            }
        }

        panel.innerHTML = `
            <div class="a11y-panel-header">
                <h3>♿ Accessibility Settings</h3>
                <button class="a11y-panel-close" aria-label="Close panel">✕</button>
            </div>
            
            <div class="a11y-option a11y-switch-row">
                <label for="a11y-motion-toggle">Reduced Motion</label>
                <label class="a11y-switch">
                    <input type="checkbox" id="a11y-motion-toggle">
                    <span class="a11y-slider"></span>
                </label>
            </div>

            <div class="a11y-option a11y-switch-row">
                <label for="a11y-contrast-toggle">High Contrast</label>
                <label class="a11y-switch">
                    <input type="checkbox" id="a11y-contrast-toggle">
                    <span class="a11y-slider"></span>
                </label>
            </div>

            <div class="a11y-option">
                <label for="a11y-text-size">Text Size</label>
                <select id="a11y-text-size">
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                    <option value="xlarge">Extra Large</option>
                </select>
            </div>

            <div class="a11y-option">
                <label for="a11y-colorblind">Color Filter</label>
                <select id="a11y-colorblind">
                    <option value="none">None</option>
                    <option value="protanopia">Protanopia (Red-Green)</option>
                    <option value="deuteranopia">Deuteranopia (Red-Green)</option>
                    <option value="tritanopia">Tritanopia (Blue-Yellow)</option>
                </select>
            </div>

            <div class="a11y-option a11y-switch-row">
                <label for="a11y-dyslexia-toggle">Dyslexia Font</label>
                <label class="a11y-switch">
                    <input type="checkbox" id="a11y-dyslexia-toggle">
                    <span class="a11y-slider"></span>
                </label>
            </div>

            <div class="a11y-option a11y-switch-row">
                <label for="a11y-gaze-toggle">Eye Tracking Control</label>
                <label class="a11y-switch">
                    <input type="checkbox" id="a11y-gaze-toggle">
                    <span class="a11y-slider"></span>
                </label>
            </div>

            <div class="a11y-option">
                <label for="a11y-dwell-time">Eye Dwell Click (ms): <span id="a11y-dwell-val">800</span></label>
                <input type="range" id="a11y-dwell-time" min="400" max="2000" step="100" value="800">
            </div>

            <div class="a11y-option">
                <label for="a11y-game-speed">Game Speed: <span id="a11y-speed-val">1.0</span>x</label>
                <input type="range" id="a11y-game-speed" min="0.5" max="1.5" step="0.25" value="1.0">
            </div>

            <div class="a11y-option" style="margin-top: 5px; text-align: center;">
                <a href="${basePath}accessibility-info.html" style="color: var(--neon-cyan); text-decoration: none; font-size: 0.8rem; font-weight: 600;" id="a11y-info-link">
                    📖 Accessibility Features Info
                </a>
            </div>
        `;

        document.body.appendChild(panel);

        // Bind events
        widgetToggle.addEventListener('click', togglePanel);
        panel.querySelector('.a11y-panel-close').addEventListener('click', togglePanel);

        document.getElementById('a11y-motion-toggle').addEventListener('change', (e) => {
            settings.reducedMotion = e.target.checked;
            saveSettings();
        });

        document.getElementById('a11y-contrast-toggle').addEventListener('change', (e) => {
            settings.highContrast = e.target.checked;
            saveSettings();
        });

        document.getElementById('a11y-text-size').addEventListener('change', (e) => {
            settings.textSize = e.target.value;
            saveSettings();
        });

        document.getElementById('a11y-colorblind').addEventListener('change', (e) => {
            settings.colorBlindness = e.target.value;
            saveSettings();
        });

        document.getElementById('a11y-dyslexia-toggle').addEventListener('change', (e) => {
            settings.dyslexiaFont = e.target.checked;
            saveSettings();
        });

        document.getElementById('a11y-gaze-toggle').addEventListener('change', (e) => {
            settings.eyeTracking = e.target.checked;
            saveSettings();
        });

        document.getElementById('a11y-dwell-time').addEventListener('input', (e) => {
            settings.dwellTime = parseInt(e.target.value);
            document.getElementById('a11y-dwell-val').textContent = settings.dwellTime;
            saveSettings();
        });

        document.getElementById('a11y-game-speed').addEventListener('input', (e) => {
            settings.gameSpeed = parseFloat(e.target.value);
            document.getElementById('a11y-speed-val').textContent = settings.gameSpeed;
            saveSettings();
        });
    }

    function togglePanel() {
        const isActive = panel.classList.toggle('active');
        widgetToggle.classList.toggle('active', isActive);
        if (isActive) {
            panel.querySelector('.a11y-panel-close').focus();
        } else {
            widgetToggle.focus();
        }
    }

    function updatePanelUI() {
        if (!panel) return;
        document.getElementById('a11y-motion-toggle').checked = settings.reducedMotion;
        document.getElementById('a11y-contrast-toggle').checked = settings.highContrast;
        document.getElementById('a11y-text-size').value = settings.textSize;
        document.getElementById('a11y-colorblind').value = settings.colorBlindness;
        document.getElementById('a11y-dyslexia-toggle').checked = settings.dyslexiaFont;
        document.getElementById('a11y-gaze-toggle').checked = settings.eyeTracking;
        document.getElementById('a11y-dwell-time').value = settings.dwellTime;
        document.getElementById('a11y-dwell-val').textContent = settings.dwellTime;
        document.getElementById('a11y-game-speed').value = settings.gameSpeed;
        document.getElementById('a11y-speed-val').textContent = settings.gameSpeed;
    }

    // Dynamic Game "Accessible" Badging
    function badgeAccessibleGames() {
        // List of games matching accessibility targets
        const accessibleGamePaths = [
            'venturemechanically',
            'financialfreedom',
            'serversavershield',
            'overtake',
            'assassinanimals',
            'orbitaldrift',
            'DiscoverAmerica'
        ];

        // Find game grid anchors/cards on the dashboard
        const gameCards = document.querySelectorAll('.game-card, .game-item, .about-card');
        gameCards.forEach(card => {
            const anchor = card.querySelector('a') || (card.tagName === 'A' ? card : null);
            if (anchor) {
                const href = anchor.getAttribute('href') || '';
                const isMatch = accessibleGamePaths.some(p => href.includes(p));
                if (isMatch && !card.querySelector('.a11y-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'a11y-badge';
                    badge.innerHTML = '♿ Accessible';
                    card.appendChild(badge);
                }
            }
        });
    }

    // Initialization hook
    function init() {
        loadSettings();
        injectSvgFilters();
        initScreenReaderAnnouncer();
        setupKeyboardNavigation();
        buildSettingsUI();
        applySettings();
        
        // Wait briefly for main page scripts to build layout grids, then apply badges
        setTimeout(badgeAccessibleGames, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
