// Fridge Simulator - Full Game Engine
// Manage fridges across countries, feed families, balance nutrition

// ===== STARFIELD BACKGROUND =====
(function initStarfield() {
    const canvas = document.getElementById('TEMPLATE-4weird-starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        stars = [];
        const count = Math.floor((canvas.width * canvas.height) / 4000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.8 + 0.2,
                twinkleSpeed: Math.random() * 0.02 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
            s.twinklePhase += s.twinkleSpeed;
            const alpha = s.opacity * (Math.sin(s.twinklePhase) * 0.3 + 0.7);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fill();
        });
        const g = ctx.createRadialGradient(canvas.width*0.3, canvas.height*0.3, 0, canvas.width*0.3, canvas.height*0.3, canvas.width*0.6);
        g.addColorStop(0, 'rgba(139,92,246,0.08)');
        g.addColorStop(0.5, 'rgba(16,185,129,0.05)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
    }
    window.addEventListener('resize', resize, { passive: true });
    resize();
    draw();
})();

// Food categorizations are defined directly in FOOD_STATS

const HUMAN_EMOJIS = [
    '👶', '🧒', '👦', '👧', '🧑', '👨', '👩', '🧓', '👴', '👵',
    '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '👨‍🦲', '👩‍🦲', '👨‍🦳', '👩‍🦳',
    '👨🏻', '👩🏻', '👨🏼', '👩🏼', '👨🏽', '👩🏽', '👨🏾', '👩🏾', '👨🏿', '👩🏿',
    '👮', '👨‍🌾', '👩‍🍳', '👨‍⚕️', '👩‍⚕️', '🧑‍🏫', '👷', '👨‍💻', '👩‍💻', '🕵️',
    '🧕', '👳', '🧔', '👲', '🙍', '🙎', '🤰', '🤱', '🧑‍🤝‍🧑', '👨‍👩‍👧‍👦'
];

const COUNTRIES = {
    usa: {
        name: 'USA 🇺🇸',
        familySize: 4,
        budget: 300,
        preferences: ['🍔', '🍕', '🌭', '🍟', '🍩'],
        unlockDay: 1
    },
    japan: {
        name: 'Japan 🇯🇵',
        familySize: 3,
        budget: 250,
        preferences: ['🍣', '🍜', '🍚', '🍡', '🍱'],
        unlockDay: 3
    },
    india: {
        name: 'India 🇮🇳',
        familySize: 5,
        budget: 200,
        preferences: ['🍛', '🫓', '🥟', '🫘', '🍵'],
        unlockDay: 5
    },
    mexico: {
        name: 'Mexico 🇲🇽',
        familySize: 4,
        budget: 280,
        preferences: ['🌮', '🌯', '🫔', '🌶️', '🥑'],
        unlockDay: 7
    },
    italy: {
        name: 'Italy 🇮🇹',
        familySize: 3,
        budget: 320,
        preferences: ['🍝', '🍕', '🧀', '🍷', '🫒'],
        unlockDay: 9
    }
};

const SHOPS = {
    grocery: { name: '🏪 Grocery Store', multiplier: 1.0, stock: 'all', reliability: 1.0 },
    pantry: { name: '🥫 Food Pantry', multiplier: 0.5, stock: 'random', reliability: 0.7 },
    charity: { name: '🎗️ Charity', multiplier: 0.0, stock: 'random', reliability: 0.4 },
    dumpster: { name: '🗑️ Dumpster', multiplier: 0.0, stock: 'random', reliability: 0.3, spoilage: 0.5 },
    wholesale: { name: '📦 Wholesaler', multiplier: 0.7, stock: 'all', reliability: 0.8, bulk: true }
};

const FOOD_PRICES = {
    '🍗': 3, '🥩': 4, '🍖': 3.5, '🐟': 5, '🥚': 2, '🫘': 1.5, '🧀': 3, '🥜': 2,
    '🍞': 2, '🍚': 1.5, '🍝': 2, '🥔': 1, '🌽': 1.5, '🥖': 2.5, '🥯': 2,
    '🍎': 1, '🍌': 0.8, '🍇': 2, '🍓': 2.5, '🍊': 1.2, '🍉': 3, '🍑': 1.5,
    '🥦': 1.5, '🥕': 1, '🥬': 1.5, '🍅': 1.2, '🥒': 1, '🧅': 0.8, '🧄': 0.5,
    '🥛': 2, '🧈': 3, '🥥': 2, '🫒': 4, '🥑': 1.5
};

const CATEGORY_COLORS = ['#ef4444', '#f59e0b', '#10b981'];
const CATEGORY_LABELS = ['Pro', 'Carb', 'Vit'];

const FOOD_STATS = {
    // Proteins
    '🍗': { name: 'Chicken', hunger: 50, nutrition: [50, 0, 0] },
    '🥩': { name: 'Steak', hunger: 70, nutrition: [60, 0, 0] },
    '🍖': { name: 'Ribs', hunger: 60, nutrition: [50, 0, 0] },
    '🐟': { name: 'Fish', hunger: 45, nutrition: [50, 0, 0] },
    '🥚': { name: 'Egg', hunger: 30, nutrition: [30, 0, 0] },
    '🫘': { name: 'Beans', hunger: 40, nutrition: [30, 20, 0] },
    '🧀': { name: 'Cheese', hunger: 35, nutrition: [40, 0, 0] },
    '🥜': { name: 'Peanuts', hunger: 25, nutrition: [25, 10, 0] },

    // Carbs
    '🍞': { name: 'Bread', hunger: 40, nutrition: [10, 50, 0] },
    '🍚': { name: 'Rice', hunger: 35, nutrition: [0, 50, 0] },
    '🍝': { name: 'Pasta', hunger: 55, nutrition: [10, 60, 0] },
    '🥔': { name: 'Potato', hunger: 40, nutrition: [0, 30, 15] },
    '🌽': { name: 'Corn', hunger: 30, nutrition: [0, 30, 15] },
    '🥖': { name: 'Baguette', hunger: 45, nutrition: [10, 50, 0] },
    '🥯': { name: 'Bagel', hunger: 40, nutrition: [10, 50, 0] },

    // Fruits
    '🍎': { name: 'Apple', hunger: 20, nutrition: [0, 10, 40] },
    '🍌': { name: 'Banana', hunger: 30, nutrition: [0, 20, 40] },
    '🍇': { name: 'Grapes', hunger: 20, nutrition: [0, 10, 40] },
    '🍓': { name: 'Strawberry', hunger: 15, nutrition: [0, 5, 40] },
    '🍊': { name: 'Orange', hunger: 20, nutrition: [0, 5, 45] },
    '🍉': { name: 'Watermelon', hunger: 25, nutrition: [0, 5, 30] },
    '🍑': { name: 'Peach', hunger: 20, nutrition: [0, 10, 40] },

    // Vegetables
    '🥦': { name: 'Broccoli', hunger: 20, nutrition: [10, 0, 45] },
    '🥕': { name: 'Carrot', hunger: 15, nutrition: [0, 10, 40] },
    '🥬': { name: 'Lettuce', hunger: 10, nutrition: [0, 0, 30] },
    '🍅': { name: 'Tomato', hunger: 15, nutrition: [0, 5, 35] },
    '🥒': { name: 'Cucumber', hunger: 10, nutrition: [0, 0, 30] },
    '🧅': { name: 'Onion', hunger: 10, nutrition: [0, 5, 25] },
    '🧄': { name: 'Garlic', hunger: 5, nutrition: [0, 0, 20] },

    // Dairy / Fats
    '🥛': { name: 'Milk', hunger: 25, nutrition: [20, 0, 30] },
    '🧈': { name: 'Butter', hunger: 20, nutrition: [15, 0, 15] },
    '🥥': { name: 'Coconut', hunger: 30, nutrition: [10, 10, 30] },
    '🫒': { name: 'Olive', hunger: 15, nutrition: [0, 0, 30] },
    '🥑': { name: 'Avocado', hunger: 25, nutrition: [10, 0, 40] }
};

let gameRunning = false;
let gamePaused = false;
let day = 1;
let money = 1000;
let deaths = 0;
let maxCombo = 0;
let lastTime = 0;

let inventory = {};
let countries = {};
let currentShop = 'grocery';

let selectedFood = null;
let shopStocks = {};

function generateShopStocks() {
    shopStocks = {};
    Object.entries(SHOPS).forEach(([key, shop]) => {
        const items = {};
        if (shop.stock === 'all') {
            Object.entries(FOOD_PRICES).forEach(([emoji, price]) => {
                items[emoji] = Math.ceil(price * shop.multiplier);
            });
        } else {
            const allFoods = Object.keys(FOOD_STATS);
            // Select 12 unique random foods for the shop stock
            const shuffled = [...allFoods].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 12);
            selected.forEach(emoji => {
                const basePrice = FOOD_PRICES[emoji] || 2;
                items[emoji] = Math.ceil(basePrice * (shop.multiplier || 0.5));
            });
        }
        shopStocks[key] = items;
    });
}

function initAudio() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playSound(type) {
    try {
        const audioCtx = initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        
        switch(type) {
            case 'buy':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'death':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
                osc.start(now);
                osc.stop(now + 0.6);
                break;
        }
    } catch(e) {}
}

function startGame() {
    gameRunning = true;
    gamePaused = false;
    day = 1;
    money = 1000;
    deaths = 0;
    inventory = {};
    selectedFood = null;
    generateShopStocks();
    
    // Initialize countries
    countries = {};
    Object.entries(COUNTRIES).forEach(([key, data]) => {
        if (data.unlockDay <= 1) {
            countries[key] = {
                name: data.name,
                familySize: data.familySize,
                budget: data.budget,
                preferences: data.preferences,
                fridge: {},
                family: generateFamily(data.familySize),
                hunger: Array(data.familySize).fill(100),
                nutrition: Array(data.familySize).fill(null).map(() => [20, 20, 20])
            };
        }
    });
    
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');
    
    render();
}

function generateFamily(size) {
    const family = [];
    for (let i = 0; i < size; i++) {
        family.push(HUMAN_EMOJIS[Math.floor(Math.random() * HUMAN_EMOJIS.length)]);
    }
    return family;
}

function getShopItems() {
    return shopStocks[currentShop] || {};
}

function buyFood(emoji) {
    const shop = SHOPS[currentShop];
    const price = FOOD_PRICES[emoji] || 2;
    const finalPrice = Math.ceil(price * (shop.multiplier || 0.5));
    
    if (money >= finalPrice) {
        money -= finalPrice;
        inventory[emoji] = (inventory[emoji] || 0) + 1;
        playSound('buy');
        render();
    }
}

function nextDay() {
    if (!gameRunning || gamePaused) return;
    
    // Visual feedback - button animation
    const nextDayBtn = document.getElementById('btnNextDay');
    if (nextDayBtn) {
        nextDayBtn.classList.add('animating');
        nextDayBtn.textContent = '🌅 Advancing...';
        setTimeout(() => {
            nextDayBtn.classList.remove('animating');
            nextDayBtn.textContent = '➡️ Next Day';
        }, 600);
    }
    
    // Create flash effect
    const flash = document.createElement('div');
    flash.className = 'day-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 800);
    
    // Process hunger and nutrition
    let totalDeaths = 0;
    Object.entries(countries).forEach(([key, country]) => {
        const fridgeFoods = [];
        Object.entries(country.fridge).forEach(([slot, food]) => {
            if (food) {
                fridgeFoods.push({ slot: parseInt(slot), food });
            }
        });
        
        country.nutrition = country.nutrition.map(nutList => {
            return nutList.map(n => Math.max(0, n - 15));
        });
        
        country.family.forEach((member, i) => {
            if (member === '💀') return;
            if (window.gameDebug?.godMode) {
                country.hunger[i] = 100;
                country.nutrition[i] = [100, 100, 100];
                return;
            }
            
            if (fridgeFoods.length > 0) {
                let foodIndex = fridgeFoods.findIndex(f => country.preferences.includes(f.food));
                if (foodIndex === -1) foodIndex = 0;
                
                const consumed = fridgeFoods.splice(foodIndex, 1)[0];
                delete country.fridge[consumed.slot];
                
                const fStats = FOOD_STATS[consumed.food] || { name: 'Food', hunger: 40, nutrition: [10, 10, 10] };
                country.hunger[i] = Math.min(100, country.hunger[i] + fStats.hunger);
                for (let idx = 0; idx < 3; idx++) {
                    if (fStats.nutrition[idx] > 0) {
                        country.nutrition[i][idx] = Math.min(100, country.nutrition[i][idx] + fStats.nutrition[idx]);
                    }
                }
            } else {
                const malnutCount = country.nutrition[i].filter(n => n <= 0).length;
                const hungerLoss = 20 + malnutCount * 5;
                country.hunger[i] = Math.max(0, country.hunger[i] - hungerLoss);
            }
            
            if (country.hunger[i] <= 0) {
                totalDeaths++;
                country.family[i] = '💀';
            }
        });
        
        const aliveInCountry = country.family.filter(m => m !== '💀').length;
        if (aliveInCountry > 0) {
            money += Math.round(country.budget * (aliveInCountry / country.familySize) * 0.4);
        }
    });
    
    deaths += totalDeaths;
    if (totalDeaths > 0) {
        playSound('death');
    }
    day++;
    
    // Animate day counter
    const dayCounter = document.getElementById('hudDay');
    if (dayCounter) {
        dayCounter.classList.add('day-updated');
        setTimeout(() => dayCounter.classList.remove('day-updated'), 500);
    }
    
    generateShopStocks();
    
    // Unlock new countries
    Object.entries(COUNTRIES).forEach(([key, data]) => {
        if (data.unlockDay <= day && !countries[key]) {
            countries[key] = {
                name: data.name,
                familySize: data.familySize,
                budget: data.budget,
                preferences: data.preferences,
                fridge: {},
                family: generateFamily(data.familySize),
                hunger: Array(data.familySize).fill(100),
                nutrition: Array(data.familySize).fill(null).map(() => [20, 20, 20])
            };
        }
    });
    
    // Check game over
    const aliveCount = Object.values(countries).reduce((sum, c) => sum + c.family.filter(m => m !== '💀').length, 0);
    
    if (aliveCount === 0) {
        gameRunning = false;
        document.getElementById('finalDays').textContent = day;
        document.getElementById('finalDeaths').textContent = deaths;
        document.getElementById('finalMoney').textContent = '$' + money;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    } else if (day >= 30) {
        gameRunning = false;
        document.getElementById('victoryDays').textContent = day;
        document.getElementById('victoryPopulation').textContent = aliveCount;
        document.getElementById('victoryMoney').textContent = '$' + money;
        document.getElementById('victoryScreen').classList.remove('hidden');
    }
    
    render();
}

function render() {
    // Update HUD
    document.getElementById('hudMoney').textContent = '$' + money;
    document.getElementById('hudDay').textContent = day;
    const totalPop = Object.values(countries).reduce((sum, c) => sum + c.family.length, 0);
    document.getElementById('hudPopulation').textContent = totalPop;
    document.getElementById('hudDeaths').textContent = deaths;
    
    // Render shop
    const shopItems = getShopItems();
    const shopItemsDiv = document.getElementById('shopItems');
    shopItemsDiv.innerHTML = '';
    Object.entries(shopItems).forEach(([emoji, price]) => {
        const fStats = FOOD_STATS[emoji] || { name: 'Food', hunger: 40, nutrition: [0, 0, 0, 0, 0] };
        
        let nutHtml = '';
        fStats.nutrition.forEach((val, idx) => {
            if (val > 0) {
                const label = CATEGORY_LABELS[idx];
                const color = CATEGORY_COLORS[idx];
                nutHtml += `<div style="font-size: 0.65rem; color: ${color}; font-weight: bold; margin-top: 1px;">${label} +${val}</div>`;
            }
        });

        const div = document.createElement('div');
        div.className = 'shop-item';
        div.onclick = () => buyFood(emoji);
        div.innerHTML = `
            <span class="shop-item-emoji">${emoji}</span>
            <div class="shop-item-name" style="font-weight: 700; margin-top: 2px;">${fStats.name}</div>
            <div class="shop-item-price" style="color: var(--neon-green); font-size: 0.75rem; font-weight: 600; margin-top: 2px;">$${price}</div>
            <div class="shop-item-hunger" style="color: #ff4a4a; font-size: 0.65rem; font-weight: bold; margin-top: 3px;">❤️ Hunger +${fStats.hunger}</div>
            <div class="shop-item-nutrition-list" style="margin-top: 2px;">
                ${nutHtml}
            </div>
        `;
        shopItemsDiv.appendChild(div);
    });
    
    // Render inventory
    const inventoryListDiv = document.getElementById('inventoryList');
    if (inventoryListDiv) {
        inventoryListDiv.innerHTML = '';
        Object.entries(inventory).forEach(([emoji, count]) => {
            if (count <= 0) return;
            const fStats = FOOD_STATS[emoji] || { name: 'Food', hunger: 40, nutrition: [0, 0, 0, 0, 0] };
            
            let nutHtml = '';
            fStats.nutrition.forEach((val, idx) => {
                if (val > 0) {
                    const label = CATEGORY_LABELS[idx];
                    const color = CATEGORY_COLORS[idx];
                    nutHtml += `<div style="font-size: 0.6rem; color: ${color}; font-weight: bold; margin-top: 1px;">${label} +${val}</div>`;
                }
            });

            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item' + (selectedFood === emoji ? ' selected' : '');
            itemDiv.onclick = () => {
                selectedFood = selectedFood === emoji ? null : emoji;
                render();
            };
            itemDiv.title = `${fStats.name} (Hunger +${fStats.hunger})`;
            itemDiv.innerHTML = `
                <span class="inventory-item-emoji">${emoji}</span>
                <span class="inventory-item-count">${count}</span>
                <div class="inventory-item-name" style="font-size: 0.65rem; font-weight: 700; margin-top: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${fStats.name}</div>
                <div class="inventory-item-nutrition" style="margin-top: 1px;">
                    ${nutHtml}
                </div>
            `;
            inventoryListDiv.appendChild(itemDiv);
        });
        if (Object.values(inventory).reduce((sum, c) => sum + c, 0) === 0) {
            inventoryListDiv.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 10px;">Empty. Buy food from the shops!</div>`;
        }
    }
    
    // Render countries
    const countriesDiv = document.getElementById('countriesContainer');
    countriesDiv.innerHTML = '';
    Object.entries(countries).forEach(([key, country]) => {
        const div = document.createElement('div');
        div.className = 'country-fridge';
        
        let gridHtml = '';
        for (let i = 0; i < 12; i++) {
            const food = country.fridge[i];
            if (food) {
                gridHtml += `<div class="fridge-slot filled" onclick="removeFromFridge('${key}', ${i})">${food}</div>`;
            } else {
                gridHtml += `<div class="fridge-slot empty" onclick="addToFridge('${key}', ${i})">+</div>`;
            }
        }
        
        div.innerHTML = `
            <div class="country-header">${country.name} (Budget: $${country.budget})</div>
            <div class="fridge-grid">
                ${gridHtml}
            </div>
        `;
        countriesDiv.appendChild(div);
    });
    
    // Render families
    const familiesDiv = document.getElementById('familiesList');
    familiesDiv.innerHTML = '';
    Object.entries(countries).forEach(([key, country]) => {
        const div = document.createElement('div');
        div.className = 'family-card';
        const avgHunger = country.hunger.reduce((a, b) => a + b, 0) / country.hunger.length;
        const hungerColor = avgHunger > 70 ? '#10b981' : avgHunger > 40 ? '#f59e0b' : '#ef4444';
        
        const avgNut = [0, 0, 0];
        country.nutrition.forEach(nut => {
            for (let idx = 0; idx < 3; idx++) {
                avgNut[idx] += nut[idx];
            }
        });
        const avgNutPct = avgNut.map(n => Math.round(n / country.nutrition.length));
        
        const memberHtml = country.family.map((member, i) => {
            const isDead = member === '💀';
            const h = country.hunger[i];
            const hColor = h > 70 ? '#10b981' : h > 40 ? '#f59e0b' : '#ef4444';
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span>${member}</span>
                    <span style="font-size: 0.7rem; color: ${isDead ? '#ef4444' : hColor}; font-weight: bold;">
                        ${isDead ? 'DEAD' : h + '%'}
                    </span>
                </div>
            `;
        }).join('');
        
        div.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 0.85rem; color: var(--neon-cyan);">${country.name.split(' ')[0]} Family</div>
            <div class="family-members-details" style="margin-bottom: 8px;">
                ${memberHtml}
            </div>
            <div class="nutrition-bars">
                ${avgNutPct.map((val, idx) => {
                    const color = CATEGORY_COLORS[idx];
                    const label = CATEGORY_LABELS[idx];
                    return `
                        <div class="nutrition-bar" title="${label}: ${val}%">
                            <div class="nutrition-fill" style="width: ${val}%; background: ${color};"></div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="font-size: 0.6rem; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 4px;">
                <span>Pro</span><span>Carb</span><span>Vit</span>
            </div>
        `;
        familiesDiv.appendChild(div);
    });
}

function addToFridge(countryKey, slot) {
    if (!selectedFood) return;
    const country = countries[countryKey];
    if (!country.fridge[slot]) {
        country.fridge[slot] = selectedFood;
        inventory[selectedFood]--;
        if (inventory[selectedFood] <= 0) {
            delete inventory[selectedFood];
            selectedFood = null;
        }
        playSound('buy');
        render();
    }
}

function removeFromFridge(countryKey, slot) {
    const country = countries[countryKey];
    const food = country.fridge[slot];
    if (food) {
        delete country.fridge[slot];
        inventory[food] = (inventory[food] || 0) + 1;
        playSound('buy');
        render();
    }
}

function togglePause() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    const pauseBtn = document.getElementById('btnPause');
    if (pauseBtn) {
        pauseBtn.textContent = gamePaused ? '▶️ Resume' : '⏸️ Pause';
    }
}

function resumeGame() {
    gamePaused = false;
    const pauseBtn = document.getElementById('btnPause');
    if (pauseBtn) {
        pauseBtn.textContent = '⏸️ Pause';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnNextDay').addEventListener('click', nextDay);
    document.getElementById('btnRestart').addEventListener('click', startGame);
    document.getElementById('btnPlayAgain').addEventListener('click', startGame);

    const pauseBtn = document.getElementById('btnPause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', togglePause);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (gameRunning) togglePause();
        }
        // Next Day keyboard shortcuts
        if ((e.key === ' ' || e.key === 'n' || e.key === 'N') && gameRunning && !gamePaused) {
            // Prevent scrolling with space
            if (e.key === ' ') e.preventDefault();
            nextDay();
        }
    });

    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentShop = e.target.dataset.source;
            if (gameRunning) render();
        });
    });
});

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = {
    name: "Fridge Simulator",
    getScore: () => money,
    setScore: (m) => { money = m; render(); },
    getHealth: () => deaths,
    setHealth: (d) => { deaths = d; render(); },
    win: () => {
        day = 30;
        Object.values(countries).forEach(c => {
            c.family = c.family.map(() => HUMAN_EMOJIS[0]);
            c.hunger = c.hunger.map(() => 100);
            c.nutrition = c.nutrition.map(() => [100, 100, 100]);
        });
        nextDay();
    },
    lose: () => {
        Object.values(countries).forEach(c => {
            c.family = c.family.map(() => '💀');
            c.hunger = c.hunger.map(() => 0);
        });
        nextDay();
    },
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};
