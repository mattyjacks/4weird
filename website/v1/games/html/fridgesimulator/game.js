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
                nutrition: Array(data.familySize).fill([20, 20, 20, 20, 20])
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
        country.hunger = country.hunger.map(h => Math.max(0, h - 20));
        country.hunger.forEach((h, i) => {
            if (h <= 0) {
                totalDeaths++;
                country.family[i] = '💀';
            }
        });
    });
    
    deaths += totalDeaths;
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
                nutrition: Array(data.familySize).fill([20, 20, 20, 20, 20])
            };
        }
    });
    
    // Check game over
    const totalPopulation = Object.values(countries).reduce((sum, c) => sum + c.family.length, 0);
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
    
    // Render countries
    const countriesDiv = document.getElementById('countriesContainer');
    countriesDiv.innerHTML = '';
    Object.entries(countries).forEach(([key, country]) => {
        const div = document.createElement('div');
        div.className = 'country-fridge';
        div.innerHTML = `
            <div class="country-header">${country.name}</div>
            <div class="fridge-grid">
                ${Array(12).fill(0).map((_, i) => `<div class="fridge-slot" onclick="addToFridge('${key}', ${i})">+</div>`).join('')}
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
        div.innerHTML = `
            <div class="family-members">${country.family.join(' ')}</div>
            <div class="hunger-bar"><div class="hunger-fill" style="width: ${avgHunger}%; background: ${hungerColor};"></div></div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">Hunger: ${Math.round(avgHunger)}%</div>
        `;
        familiesDiv.appendChild(div);
    });
}

function addToFridge(country, slot) {
    // Placeholder for drag-drop functionality
    console.log('Add to fridge:', country, slot);
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
