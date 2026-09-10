// Visual Debug Mode - Shows diagnostic info on screen
// Add ?debug=true to URL to enable

(function() {
    const DEBUG_MODE = new URLSearchParams(window.location.search).get('debug') === 'true';
    
    if (!DEBUG_MODE && !window.location.href.includes('localhost')) {
        return; // Only run in debug mode or localhost
    }
    
    console.log('[DEBUG] Visual debug mode enabled');
    
    // Create debug overlay
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-overlay';
    debugDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #00ff00;
        color: #00ff00;
        padding: 15px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
        max-width: 400px;
        max-height: 80vh;
        overflow-y: auto;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    `;
    
    const logDiv = document.createElement('div');
    logDiv.id = 'debug-logs';
    debugDiv.appendChild(logDiv);
    
    document.body.appendChild(debugDiv);
    
    // Override console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    function addLog(type, args) {
        const entry = document.createElement('div');
        entry.style.cssText = `
            margin-bottom: 5px;
            border-left: 3px solid ${type === 'error' ? '#ff0000' : type === 'warn' ? '#ffff00' : '#00ff00'};
            padding-left: 8px;
            word-break: break-word;
        `;
        entry.textContent = `[${type.toUpperCase()}] ${Array.from(args).join(' ')}`;
        logDiv.appendChild(entry);
        logDiv.scrollTop = logDiv.scrollHeight;
    }
    
    console.log = function(...args) {
        addLog('log', args);
        originalLog.apply(console, args);
    };
    
    console.error = function(...args) {
        addLog('error', args);
        originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
        addLog('warn', args);
        originalWarn.apply(console, args);
    };
    
    // Element checker
    function checkElements() {
        const checks = [
            { id: 'gameCanvas', name: 'Canvas' },
            { id: 'startScreen', name: 'Start Screen' },
            { id: 'game-wrapper', selector: '.game-wrapper', name: 'Game Wrapper' },
            { id: 'body', selector: 'body', name: 'Body' }
        ];
        
        const results = {};
        
        checks.forEach(check => {
            const el = check.selector 
                ? document.querySelector(check.selector)
                : document.getElementById(check.id);
                
            if (el) {
                const styles = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                
                results[check.name] = {
                    found: true,
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity,
                    zIndex: styles.zIndex,
                    width: rect.width,
                    height: rect.height,
                    backgroundColor: styles.backgroundColor
                };
            } else {
                results[check.name] = { found: false };
            }
        });
        
        return results;
    }
    
    // Canvas checker
    function checkCanvas() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return { error: 'Canvas not found' };
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return { error: 'No 2D context' };
        
        // Try to draw test pattern
        const imageData = ctx.getImageData(0, 0, 10, 10);
        const pixels = imageData.data;
        
        return {
            width: canvas.width,
            height: canvas.height,
            offsetWidth: canvas.offsetWidth,
            offsetHeight: canvas.offsetHeight,
            hasContext: true,
            pixelSample: [pixels[0], pixels[1], pixels[2], pixels[3]]
        };
    }
    
    // Add diagnostics button
    const diagBtn = document.createElement('button');
    diagBtn.textContent = '🔍 Run Diagnostics';
    diagBtn.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        z-index: 999999;
        padding: 10px 20px;
        background: #00ff00;
        color: #000;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
    `;
    
    diagBtn.onclick = function() {
        console.log('=== DIAGNOSTICS START ===');
        console.log('URL:', window.location.href);
        console.log('User Agent:', navigator.userAgent);
        console.log('Viewport:', window.innerWidth + 'x' + window.innerHeight);
        console.log('Device Pixel Ratio:', window.devicePixelRatio);
        
        console.log('\n--- Element Check ---');
        console.log(JSON.stringify(checkElements(), null, 2));
        
        console.log('\n--- Canvas Check ---');
        console.log(JSON.stringify(checkCanvas(), null, 2));
        
        console.log('\n=== DIAGNOSTICS END ===');
        
        // Visual alert
        alert('Diagnostics complete! Check the debug panel on the right.');
    };
    
    document.body.appendChild(diagBtn);
    
    // Auto-run diagnostics on load
    setTimeout(function() {
        console.log('Auto-running diagnostics...');
        diagBtn.click();
    }, 2000);
    
    // Visual indicators
    function addVisualMarkers() {
        // Highlight canvas
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.style.outline = '5px dashed #ff00ff';
            canvas.style.outlineOffset = '5px';
        }
        
        // Highlight start screen
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.outline = '5px solid #00ff00';
            startScreen.style.outlineOffset = '5px';
        }
        
        // Add element labels
        const labels = [
            { id: 'gameCanvas', text: 'CANVAS', color: '#ff00ff' },
            { id: 'startScreen', text: 'START SCREEN', color: '#00ff00' }
        ];
        
        labels.forEach(label => {
            const el = document.getElementById(label.id);
            if (el) {
                const marker = document.createElement('div');
                marker.textContent = label.text;
                marker.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    background: ${label.color};
                    color: #000;
                    padding: 2px 5px;
                    font-size: 10px;
                    font-weight: bold;
                    z-index: 999999;
                    pointer-events: none;
                `;
                el.style.position = 'relative';
                el.appendChild(marker);
            }
        });
    }
    
    setTimeout(addVisualMarkers, 1000);
    
})();
