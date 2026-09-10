// Business Management System
// Shop zones and management interface

var shopItems = [
    { id: 'weapon_upgrade', emoji: '💻', name: 'Weapon Upgrade', price: 500, description: 'Next weapon tier' },
    { id: 'emergency_repair', emoji: '💻', name: 'Emergency Repair', price: 300, description: '+50 HP to all servers' },
    { id: 'damage_buff', emoji: '💻', name: 'Damage Boost', price: 200, description: '2x damage for 30s' }
];

var managementZoneActive = false;
var analyticsData = {
    enemiesDefeated: {},
    revenueHistory: [],
    costHistory: [],
    profitHistory: [],
    totalSeverancePaid: 0,
    totalSeveranceSkipped: 0,
    unethicalFires: 0
};

// Shop Zone Functions
function drawShopZone() {
    const ctx = getContext();
    const zoneY = 500;
    const zoneHeight = 50;
    
    // Draw zone background
    ctx.fillStyle = '#1c152d';
    ctx.fillRect(0, zoneY, CANVAS_WIDTH, zoneHeight);
    
    // Draw top border
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, zoneY);
    ctx.lineTo(CANVAS_WIDTH, zoneY);
    ctx.stroke();
    
    // Draw zone label
    ctx.save();
    ctx.font = 'bold 11px Orbitron,sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'center';
    ctx.fillText('💻 WEAPON SHOP (CLICK LAPTOPS TO BUY) 💻', CANVAS_WIDTH / 2, zoneY + 14);
    
    // Draw 3 laptops with items
    const positions = [0.25, 0.5, 0.75];
    shopItems.forEach((item, index) => {
        const x = CANVAS_WIDTH * positions[index];
        const y = zoneY + 34;
        
        // Laptop emoji (slightly smaller to fit)
        ctx.font = '20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(item.emoji, x - 5, y);
        
        // Price tag & Name
        ctx.font = 'bold 10px Orbitron,sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'left';
        ctx.fillText('$' + item.price, x + 5, y - 4);
        
        ctx.font = '9px Arial';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(item.name, x + 5, y + 6);
    });
    
    ctx.restore();
}

function checkShopClick(x, y) {
    const zoneY = 500;
    const zoneHeight = 50;
    
    if (y < zoneY || y > zoneY + zoneHeight) return false;
    
    const positions = [0.25, 0.5, 0.75];
    for (let i = 0; i < positions.length; i++) {
        const itemX = CANVAS_WIDTH * positions[i];
        const dist = Math.abs(x - itemX);
        
        if (dist < 45) {
            purchaseShopItem(i);
            return true;
        }
    }
    return false;
}

function purchaseShopItem(index) {
    const item = shopItems[index];
    const zoneY = 500;
    const positions = [0.25, 0.5, 0.75];
    const itemX = CANVAS_WIDTH * positions[index];
    const itemY = zoneY + 25;
    
    if (gameState.balance >= item.price) {
        gameState.balance -= item.price;
        
        // Apply effect
        switch(item.id) {
            case 'weapon_upgrade':
                upgradeWeapon();
                break;
            case 'emergency_repair':
                if (typeof servers !== 'undefined') {
                    servers.forEach(s => {
                        if (typeof healServer === 'function') healServer(s.id, 50);
                    });
                }
                break;
            case 'damage_buff':
                activateDamageBuff();
                break;
        }
        
        playSound('powerup');
        if (typeof addText === 'function') addText(itemX, itemY - 10, 'PURCHASED!', '#10b981', 14);
    } else {
        if (typeof addText === 'function') addText(itemX, itemY - 10, 'INSUFFICIENT FUNDS', '#ef4444', 12);
    }
}

// Management Zone Functions
function drawManagementZone() {
    const ctx = getContext();
    const zoneY = 550;
    const zoneHeight = 50;
    
    // Draw zone background with pulsing effect
    const pulse = Math.sin(Date.now() * 0.003) * 0.08 + 0.12;
    ctx.fillStyle = `rgba(6, 182, 212, ${pulse})`;
    ctx.fillRect(0, zoneY, CANVAS_WIDTH, zoneHeight);
    
    // Border at the top of management zone
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, zoneY);
    ctx.lineTo(CANVAS_WIDTH, zoneY);
    ctx.stroke();
    
    ctx.save();
    // Draw business people emojis
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const people = ['🧑‍💼', '👨‍💼', '👩‍💼'];
    const positions = [0.2, 0.5, 0.8];
    
    people.forEach((emoji, index) => {
        ctx.fillText(emoji, CANVAS_WIDTH * positions[index], zoneY + 25);
    });
    
    // Draw label
    ctx.font = 'bold 12px Orbitron,sans-serif';
    ctx.fillStyle = '#06b6d4';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#06b6d4';
    ctx.fillText('👇 MANAGE BUSINESS (MOVE SHIELD HERE) 👇', CANVAS_WIDTH / 2, zoneY + 28);
    
    ctx.restore();
}

var managementZoneGracePeriod = 0;
const MANAGEMENT_ZONE_GRACE = 180; // 3 seconds at 60fps

function checkManagementZoneEntry() {
    if (!gameRunning || gamePaused) return;
    
    // Grace period after game start - don't activate management zone immediately
    if (managementZoneGracePeriod > 0) {
        managementZoneGracePeriod--;
        return;
    }
    
    const zoneY = 540; // Since management zone starts at 550, Y > 540 triggers it when shield centers on it
    
    // Check if player entered management zone (moving down)
    // Require player to be in zone for at least 30 frames (0.5 seconds) to prevent accidental triggers
    if (player.y > zoneY && !managementZoneActive) {
        if (!managementZoneEntryTimer) {
            managementZoneEntryTimer = 30; // 0.5 second delay
        }
        managementZoneEntryTimer--;
        if (managementZoneEntryTimer <= 0) {
            activateManagementZone();
            managementZoneEntryTimer = null;
        }
    } else {
        managementZoneEntryTimer = null;
    }
}

var managementZoneEntryTimer = null;

function activateManagementZone() {
    managementZoneActive = true;
    gamePaused = true;
    showManagementOverlay();
}

function deactivateManagementZone() {
    managementZoneActive = false;
    gamePaused = false;
    hideManagementOverlay();
}

// Management Overlay UI
function showManagementOverlay() {
    const overlay = document.getElementById('managementOverlay');
    if (!overlay) {
        createManagementOverlay();
    }
    document.getElementById('managementOverlay').classList.remove('hidden');
    updateAnalyticsDisplay();
}

function hideManagementOverlay() {
    const overlay = document.getElementById('managementOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function createManagementOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'managementOverlay';
    overlay.className = 'management-overlay hidden';
    overlay.innerHTML = `
        <div class="management-panel">
            <div class="management-header">
                <h2>📊 BUSINESS MANAGEMENT</h2>
                <button onclick="deactivateManagementZone()" class="btn-resume">▶️ RESUME GAME</button>
            </div>
            <div class="management-tabs">
                <button class="tab-btn active" onclick="switchTab('combat')">⚔️ Combat</button>
                <button class="tab-btn" onclick="switchTab('business')">💼 Business</button>
                <button class="tab-btn" onclick="switchTab('reviews')">⭐ Reviews</button>
                <button class="tab-btn" onclick="switchTab('staff')">👥 Staff</button>
            </div>
            <div class="tab-content" id="tab-combat">
                <h3>Combat Analytics</h3>
                <div id="combatStats"></div>
            </div>
            <div class="tab-content hidden" id="tab-business">
                <h3>Business Analytics</h3>
                <div id="businessStats"></div>
            </div>
            <div class="tab-content hidden" id="tab-reviews">
                <h3>Customer Reviews</h3>
                <div id="reviewsDisplay"></div>
            </div>
            <div class="tab-content hidden" id="tab-staff">
                <h3>Staff Management</h3>
                <div id="staffManagement"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    addManagementStyles();
}

function addManagementStyles() {
    const styles = document.createElement('style');
    styles.textContent = `
        .management-overlay {
            position: fixed;
            inset: 0;
            background: #050508;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .management-overlay.hidden { display: none; }
        .management-panel {
            background: #0d0d12; border-color: #06b6d4; box-shadow: 0 0 30px rgba(6, 182, 212, 0.3);
            border: 2px solid #8b5cf6;
            border-radius: 20px;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            padding: 30px;
        }
        .management-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #1c152d;
            padding-bottom: 15px;
        }
        .management-header h2 {
            font-family: 'Orbitron', sans-serif;
            color: #8b5cf6;
            margin: 0;
        }
        .btn-resume {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-weight: 700;
            cursor: pointer;
        }
        .management-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .tab-btn {
            background: #1c152d;
            border: 1px solid #1c152d;
            color: #a78bfa;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
        }
        .tab-btn.active {
            background: #8b5cf6;
            color: white;
        }
        .tab-content.hidden { display: none; }
        .staff-card {
            background: #1c152d;
            border: 1px solid #1c152d;
            border-radius: 12px;
            padding: 15px;
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .fire-btn {
            background: #ef4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
        }
        .review-card {
            background: #1a1a24;
            border-radius: 8px;
            padding: 12px;
            margin: 8px 0;
        }
        .review-stars { color: #f59e0b; }
    `;
    document.head.appendChild(styles);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    event.target.classList.add('active');
    
    if (tab === 'staff') renderStaffManagement();
    if (tab === 'reviews') renderReviews();
}

// Analytics Functions
function updateAnalyticsDisplay() {
    updateCombatStats();
    updateBusinessStats();
}

function updateCombatStats() {
    const container = document.getElementById('combatStats');
    if (!container) return;
    
    // Count enemies by type
    const enemyCounts = {};
    killHistory.forEach(type => {
        enemyCounts[type] = (enemyCounts[type] || 0) + 1;
    });
    
    let html = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">';
    Object.entries(ENEMIES).forEach(([key, enemy]) => {
        const count = enemyCounts[key] || 0;
        html += `
            <div style="background: #1c152d; padding: 15px; border-radius: 10px; text-align: center;">
                <div style="font-size: 2rem;">${enemy.emoji}</div>
                <div style="font-weight: 700;">${enemy.name}</div>
                <div style="color: #8b5cf6; font-size: 1.5rem;">${count}</div>
                <div style="font-size: 0.8rem; color: #ffffff;">defeated</div>
            </div>
        `;
    });
    html += '</div>';
    
    html += `
        <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
            <div style="background: #0d2d20; padding: 15px; border-radius: 10px; text-align: center;">
                <div style="color: #10b981; font-size: 1.5rem; font-weight: 700;">${score.toLocaleString()}</div>
                <div style="font-size: 0.8rem; color: #ffffff;">Total Score</div>
            </div>
            <div style="background: #0e2d35; padding: 15px; border-radius: 10px; text-align: center;">
                <div style="color: #06b6d4; font-size: 1.5rem; font-weight: 700;">${wave}</div>
                <div style="font-size: 0.8rem; color: #ffffff;">Waves Survived</div>
            </div>
            <div style="background: rgba(245, 158, 11, 0.1); padding: 15px; border-radius: 10px; text-align: center;">
                <div style="color: #f59e0b; font-size: 1.5rem; font-weight: 700;">x${maxCombo}</div>
                <div style="font-size: 0.8rem; color: #ffffff;">Max Combo</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function updateBusinessStats() {
    const container = document.getElementById('businessStats');
    if (!container) return;
    
    const totalCosts = staff.reduce((sum, s) => sum + s.salary, 0);
    const netProfit = gameState.incomePerSec - totalCosts;
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
            <div style="background: #0d2d20; padding: 20px; border-radius: 12px;">
                <div style="color: #ffffff; font-size: 0.9rem;">Current Balance</div>
                <div style="color: #10b981; font-size: 2rem; font-weight: 700;">$${Math.floor(gameState.balance).toLocaleString()}</div>
            </div>
            <div style="background: #1c152d; padding: 20px; border-radius: 12px;">
                <div style="color: #ffffff; font-size: 0.9rem;">Income per Second</div>
                <div style="color: #8b5cf6; font-size: 2rem; font-weight: 700;">$${gameState.incomePerSec}/s</div>
            </div>
        </div>
        <div style="background: #3d0f0f; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <div style="color: #ffffff; font-size: 0.9rem;">Total Staff Costs</div>
            <div style="color: #ef4444; font-size: 2rem; font-weight: 700;">$${totalCosts}/s</div>
        </div>
        <div style="background: ${netProfit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; padding: 20px; border-radius: 12px;">
            <div style="color: #ffffff; font-size: 0.9rem;">Net Profit</div>
            <div style="color: ${netProfit >= 0 ? '#10b981' : '#ef4444'}; font-size: 2rem; font-weight: 700;">
                ${netProfit >= 0 ? '+' : ''}$${netProfit}/s
            </div>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #1a1a24; border-radius: 12px;">
            <h4 style="margin-top: 0;">Ethics Tracking</h4>
            <p>Total Severance Paid: <span style="color: #10b981;">$${analyticsData.totalSeverancePaid}</span></p>
            <p>Unethical Firings: <span style="color: ${analyticsData.unethicalFires > 0 ? '#ef4444' : '#10b981'};">${analyticsData.unethicalFires}</span></p>
        </div>
    `;
}

// Staff Management with Severance
function renderStaffManagement() {
    const container = document.getElementById('staffManagement');
    if (!container) return;
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    
    if (staff.length === 0) {
        html += '<p style="text-align: center; color: #ffffff;">No staff hired yet. Hire staff to boost your business!</p>';
    } else {
        staff.forEach((s, index) => {
            const staffType = STAFF_TYPES[s.type];
            const severanceCost = s.salary * 60; // 60 seconds worth
            
            html += `
                <div class="staff-card">
                    <div>
                        <div style="font-size: 1.5rem;">${staffType.emoji}</div>
                        <div style="font-weight: 700;">${staffType.name}</div>
                        <div style="font-size: 0.8rem; color: #ffffff;">${staffType.ability}</div>
                        <div style="font-size: 0.8rem; color: #ef4444;">Salary: $${s.salary}/s</div>
                    </div>
                    <div>
                        <button class="fire-btn" onclick="initiateFireStaff(${index}, ${severanceCost})">
                            🔥 Fire (Severance: $${severanceCost})
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    html += '<h3 style="margin-top: 30px;">Hire New Staff</h3>';
    html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-height: 300px; overflow-y: auto;">';
    
    Object.entries(STAFF_TYPES).forEach(([key, type]) => {
        const alreadyHired = staff.some(s => s.type === key);
        if (!alreadyHired) {
            html += `
                <div style="background: #1c152d; border: 1px solid #1c152d; border-radius: 10px; padding: 12px;">
                    <div style="font-size: 1.5rem;">${type.emoji}</div>
                    <div style="font-weight: 700; font-size: 0.9rem;">${type.name}</div>
                    <div style="font-size: 0.75rem; color: #ffffff;">${type.ability}</div>
                    <div style="font-size: 0.8rem; color: #f59e0b;">Hire: $${type.hireCost} | Salary: $${type.salarySec}/s</div>
                    <button onclick="hireStaff('${key}')" class="tab-btn" style="margin-top: 8px; width: 100%;">Hire</button>
                </div>
            `;
        }
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function initiateFireStaff(index, severanceCost) {
    const s = staff[index];
    const staffType = STAFF_TYPES[s.type];
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: #000000;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    modal.innerHTML = `
        <div style="background: #1a1a24; border: 2px solid #ef4444; border-radius: 16px; padding: 30px; max-width: 400px; text-align: center;">
            <div style="font-size: 3rem;">⚠️</div>
            <h3 style="color: #ef4444; margin: 15px 0;">Fire ${staffType.name}?</h3>
            <p>Severance cost: <strong style="color: #f59e0b;">$${severanceCost}</strong></p>
            <p style="font-size: 0.9rem; color: #ffffff;">You can pay severance (ethical) or skip it (reputation penalty).</p>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button onclick="fireStaff(${index}, true, ${severanceCost})" style="flex: 1; background: #10b981; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">
                    ✅ Pay Severance
                </button>
                <button onclick="fireStaff(${index}, false, 0)" style="flex: 1; background: #ef4444; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">
                    ⚠️ Skip (-5 Rep)
                </button>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 15px; background: transparent; color: #ffffff; border: none; cursor: pointer;">
                Cancel
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function fireStaff(index, paySeverance, amount) {
    const s = staff[index];
    
    if (paySeverance) {
        if (gameState.balance >= amount) {
            gameState.balance -= amount;
            analyticsData.totalSeverancePaid += amount;
            playSound('powerup');
        } else {
            alert('Insufficient funds for severance!');
            return;
        }
    } else {
        // Unethical fire - reputation penalty
        gameState.reputation = Math.max(0, gameState.reputation - 5);
        analyticsData.unethicalFires++;
        analyticsData.totalSeveranceSkipped += amount;
        playSound('die');
    }
    
    // Remove staff
    staff.splice(index, 1);
    
    // Close modal
    const modal = document.querySelector('[style*="z-index: 2000"]');
    if (modal) modal.remove();
    
    // Refresh display
    renderStaffManagement();
    updateBusinessStats();
}

function hireStaff(type) {
    const staffType = STAFF_TYPES[type];
    
    if (gameState.balance < staffType.hireCost) {
        alert('Insufficient funds to hire!');
        return;
    }
    
    gameState.balance -= staffType.hireCost;
    staff.push({
        type: type,
        salary: staffType.salarySec,
        hiredAt: Date.now()
    });
    
    playSound('powerup');
    renderStaffManagement();
    updateBusinessStats();
}

// Stub functions for features to be implemented
function upgradeWeapon() {
    const weaponKeys = Object.keys(WEAPONS);
    const currentIndex = weaponKeys.indexOf(currentWeapon);
    const nextIndex = (currentIndex + 1) % weaponKeys.length;
    const nextWeaponKey = weaponKeys[nextIndex];
    if (typeof setCurrentWeapon === 'function') {
        setCurrentWeapon(nextWeaponKey);
    } else {
        currentWeapon = nextWeaponKey;
        weaponTimer = typeof getWeaponDuration === 'function' ? getWeaponDuration() : 300;
    }
    console.log('Weapon upgraded to:', nextWeaponKey);
}

function activateDamageBuff() {
    if (typeof player !== 'undefined') {
        player.damageMultiplier = 2.0;
        setTimeout(() => {
            player.damageMultiplier = 1.0;
        }, 30000);
    }
    console.log('Damage buff activated');
}

function addFloatingText(x, y, text, color, size) {
    if (typeof addText === 'function') {
        addText(x, y, text, color, size);
    } else {
        console.log('Floating text:', text);
    }
}

function renderReviews() {
    // Use reviews.js to render
    renderReviewsList('reviewsDisplay');
}
