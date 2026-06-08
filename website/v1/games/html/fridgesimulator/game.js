// Fridge Simulator - Full Game Engine
// Manage fridges across countries, feed families, balance nutrition

const FOOD_EMOJIS = {
    proteins: ['🍗', '🥩', '🍖', '🐟', '🥚', '🫘', '🧀', '🥜', '🦐', '🦞', '🦀', '🐙', '🦑', '🍤', '🥓', '🍔', '🌭'],
    carbs: ['🍞', '🍚', '🍝', '🥔', '🌽', '🥖', '🥯', '🥨', '🥐', '🥞', '🧇', '🍳', '🥟', '🍱', '🍛', '🍜', '🍲', '🥘', '🍲', '🥗'],
    fruits: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍑', '🥝', '🍍', '🥭', '🍒', '🫐', '🍈', '🍋', '🍐', '🥑', '🍆', '🫒', '🥥', '🍅'],
    vegetables: ['🥦', '🥕', '🥬', '🍅', '🥒', '🫑', '🧅', '🧄', '🍆', '🥗', '🌶️', '🫑', '🥬', '🥒', '🍄', '🌰', '🫘', '🥔'],
    dairy: ['🥛', '🧈', '🧀', '🥥', '🫒', '🥑', '🍶', '🍷', '🍾', '🥤', '☕', '🍵', '🧃', '🧋']
};

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

function getFoodCategory(emoji) {
    if (FOOD_EMOJIS.proteins.includes(emoji)) return 0;
    if (FOOD_EMOJIS.carbs.includes(emoji)) return 1;
    if (FOOD_EMOJIS.fruits.includes(emoji)) return 2;
    if (FOOD_EMOJIS.vegetables.includes(emoji)) return 3;
    if (FOOD_EMOJIS.dairy.includes(emoji)) return 4;
    return -1;
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
                nutrition: Array(data.familySize).fill(null).map(() => [20, 20, 20, 20, 20])
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
    const shop = SHOPS[currentShop];
    const items = {};
    
    if (shop.stock === 'all') {
        Object.entries(FOOD_PRICES).forEach(([emoji, price]) => {
            items[emoji] = Math.ceil(price * shop.multiplier);
        });
    } else {
        const allFoods = Object.values(FOOD_EMOJIS).flat();
        for (let i = 0; i < 12; i++) {
            const emoji = allFoods[Math.floor(Math.random() * allFoods.length)];
            const basePrice = FOOD_PRICES[emoji] || 2;
            items[emoji] = Math.ceil(basePrice * (shop.multiplier || 0.5));
        }
    }
    
    return items;
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
    if (!gameRunning) return;
    
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
            
            if (fridgeFoods.length > 0) {
                let foodIndex = fridgeFoods.findIndex(f => country.preferences.includes(f.food));
                if (foodIndex === -1) foodIndex = 0;
                
                const consumed = fridgeFoods.splice(foodIndex, 1)[0];
                delete country.fridge[consumed.slot];
                
                country.hunger[i] = Math.min(100, country.hunger[i] + 40);
                const category = getFoodCategory(consumed.food);
                if (category !== -1) {
                    country.nutrition[i][category] = Math.min(100, country.nutrition[i][category] + 50);
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
                nutrition: Array(data.familySize).fill(null).map(() => [20, 20, 20, 20, 20])
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
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.onclick = () => buyFood(emoji);
        div.innerHTML = `
            <span class="shop-item-emoji">${emoji}</span>
            <div class="shop-item-name">Food</div>
            <div class="shop-item-price">$${price}</div>
        `;
        shopItemsDiv.appendChild(div);
    });
    
    // Render inventory
    const inventoryListDiv = document.getElementById('inventoryList');
    if (inventoryListDiv) {
        inventoryListDiv.innerHTML = '';
        Object.entries(inventory).forEach(([emoji, count]) => {
            if (count <= 0) return;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item' + (selectedFood === emoji ? ' selected' : '');
            itemDiv.onclick = () => {
                selectedFood = selectedFood === emoji ? null : emoji;
                render();
            };
            itemDiv.innerHTML = `
                <span class="inventory-item-emoji">${emoji}</span>
                <span class="inventory-item-count">${count}</span>
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
        
        const avgNut = [0, 0, 0, 0, 0];
        country.nutrition.forEach(nut => {
            for (let idx = 0; idx < 5; idx++) {
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
                    return `
                        <div class="nutrition-bar" title="Nutrition Category ${idx}: ${val}%">
                            <div class="nutrition-fill" style="width: ${val}%; background: var(--neon-purple);"></div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="font-size: 0.6rem; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 4px;">
                <span>Pro</span><span>Carb</span><span>Fru</span><span>Veg</span><span>Dai</span>
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
});

document.querySelectorAll('.shop-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentShop = e.target.dataset.source;
        render();
    });
});

render();
