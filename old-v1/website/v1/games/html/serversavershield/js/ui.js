// UI and Text Management
var floatingTexts = [];
var shieldTimer = 0;
var comboCount = 0;
var comboTimer = 0;

function addText(x, y, text, color, size) {
    floatingTexts.push({ x, y, text, color, size, life: 60 });
}

function updateUI() {
    floatingTexts.forEach(t => { t.life--; });
    floatingTexts = floatingTexts.filter(t => t.life > 0);
    
    if (shieldTimer > 0) shieldTimer--;
    if (comboTimer > 0) { comboTimer--; if (comboTimer <= 0) comboCount = 0; }
}

function getFloatingTexts() {
    return floatingTexts;
}

function getShieldTimer() {
    return shieldTimer;
}

function setShieldTimer(time) {
    shieldTimer = time;
}

function getComboCount() {
    return comboCount;
}

function setComboCount(count) {
    comboCount = count;
    comboTimer = 180;
}

function getComboTimer() {
    return comboTimer;
}

function clearUI() {
    floatingTexts = [];
    shieldTimer = 0;
    comboCount = 0;
    comboTimer = 0;
}
