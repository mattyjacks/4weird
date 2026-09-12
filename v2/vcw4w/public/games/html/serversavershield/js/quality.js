// Graphics Quality Setting - Fast (default) vs Beautiful.
// Fast: no per-entity shadowBlur, sparser matrix rain, fullscreen matrix at ~20fps.
// Beautiful: restores all glow effects + dense matrix rain every frame.
// The choice persists in localStorage and applies live (no restart needed).
var _qualityButtonsWired = false;

function setGraphicsQuality(q) {
    if (q !== 'fast' && q !== 'beautiful') return;
    graphicsQuality = q;
    try {
        if (window.localStorage) window.localStorage.setItem('sss_graphics', q);
    } catch (e) { /* ignore */ }
    refreshQualityButtons();
    // Rebuild ambient effects at the new density (safe to call live).
    try {
        if (typeof canvasInitialized !== 'undefined' && canvasInitialized &&
            typeof initStars === 'function') initStars();
    } catch (e) { /* ignore */ }
    try {
        if (typeof initOuterMatrix === 'function') initOuterMatrix();
    } catch (e) { /* ignore */ }
}

function refreshQualityButtons() {
    const fastActive = graphicsQuality !== 'beautiful';
    const pairs = [
        ['btnFast', 'btnBeautiful'],
        ['btnFastPause', 'btnBeautifulPause']
    ];
    pairs.forEach(([fastId, prettyId]) => {
        const fastBtn = document.getElementById(fastId);
        const prettyBtn = document.getElementById(prettyId);
        if (fastBtn) {
            fastBtn.style.background = fastActive
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'transparent';
            fastBtn.style.color = fastActive ? 'white' : '';
        }
        if (prettyBtn) {
            prettyBtn.style.background = !fastActive
                ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                : 'transparent';
            prettyBtn.style.color = !fastActive ? 'white' : '';
        }
    });
}

function initQualityButtons() {
    if (_qualityButtonsWired) return;
    _qualityButtonsWired = true;
    const wiring = [
        ['btnFast', 'fast'],
        ['btnBeautiful', 'beautiful'],
        ['btnFastPause', 'fast'],
        ['btnBeautifulPause', 'beautiful']
    ];
    wiring.forEach(([id, q]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => setGraphicsQuality(q));
    });
    refreshQualityButtons();
}

// Console/debug access: window.setGraphicsQuality('beautiful')
window.setGraphicsQuality = setGraphicsQuality;
