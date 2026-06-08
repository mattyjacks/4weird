// Auto-Save System - Saves game state periodically
// Fix #7: Auto-save game state

var autoSaveInterval = null;
var lastSaveTime = 0;
const SAVE_INTERVAL = 30000; // Save every 30 seconds
const SAVE_KEY = 'serversavershield_autosave';

function initAutoSave() {
    // Load saved game if exists
    loadGameState();
    
    // Start auto-save interval
    autoSaveInterval = setInterval(saveGameState, SAVE_INTERVAL);
    
    // Also save when page unloads
    window.addEventListener('beforeunload', saveGameState);
    
    console.log('[AUTOSAVE] Auto-save system initialized');
}

function saveGameState() {
    if (!gameRunning) return; // Only save during active gameplay
    
    const saveData = {
        timestamp: Date.now(),
        score: score,
        wave: wave,
        kills: kills,
        balance: gameState.balance,
        reputation: gameState.reputation,
        customerTrust: gameState.customerTrust,
        serverHealth: servers.map(s => ({ hp: s.hp, status: s.status })),
        staff: staff.map(s => ({ type: s.type, level: s.level })),
        highScore: highScore,
        difficulty: difficulty,
        version: '1.0'
    };
    
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        lastSaveTime = Date.now();
        console.log('[AUTOSAVE] Game saved successfully');
    } catch (e) {
        console.warn('[AUTOSAVE] Failed to save game:', e);
    }
}

function loadGameState() {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) {
            console.log('[AUTOSAVE] No saved game found');
            return false;
        }
        
        const saveData = JSON.parse(saved);
        
        // Check if save is too old (older than 7 days)
        const age = Date.now() - saveData.timestamp;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (age > maxAge) {
            console.log('[AUTOSAVE] Save is too old, starting fresh');
            clearSave();
            return false;
        }
        
        // Offer to restore (would need UI, for now just log)
        console.log('[AUTOSAVE] Found saved game:', saveData);
        
        // Store for potential restore
        window.pendingSaveData = saveData;
        
        return true;
    } catch (e) {
        console.warn('[AUTOSAVE] Failed to load game:', e);
        return false;
    }
}

function restoreGameState() {
    if (!window.pendingSaveData) return false;
    
    const data = window.pendingSaveData;
    
    // Restore stats
    score = data.score || 0;
    wave = data.wave || 1;
    kills = data.kills || 0;
    gameState.balance = data.balance || 1000;
    gameState.reputation = data.reputation || 50;
    gameState.customerTrust = data.customerTrust || 100;
    highScore = data.highScore || 0;
    difficulty = data.difficulty || 'easy';
    
    // Restore server health
    if (data.serverHealth && servers) {
        data.serverHealth.forEach((saved, i) => {
            if (servers[i]) {
                servers[i].hp = saved.hp;
                servers[i].status = saved.status;
            }
        });
    }
    
    console.log('[AUTOSAVE] Game restored successfully');
    return true;
}

function clearSave() {
    try {
        localStorage.removeItem(SAVE_KEY);
        console.log('[AUTOSAVE] Save cleared');
    } catch (e) {
        console.warn('[AUTOSAVE] Failed to clear save:', e);
    }
}

function getSaveInfo() {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return null;
        
        const data = JSON.parse(saved);
        const age = Date.now() - data.timestamp;
        const minutes = Math.floor(age / 60000);
        
        return {
            wave: data.wave,
            score: data.score,
            minutesAgo: minutes,
            difficulty: data.difficulty
        };
    } catch (e) {
        return null;
    }
}
