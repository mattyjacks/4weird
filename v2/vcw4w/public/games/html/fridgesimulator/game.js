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
    '🥛': 2, '🧈': 3, '🥥': 2, '🫒': 4, '🥑': 1.5,
    // DS-FRIDGE-01: full emoji pantry, appended inline (existing lines untouched).
    '🍈': 3, '🍋': 1, '🍍': 2.5, '🥭': 2, '🍏': 1, '🍐': 1.2,
    '🍒': 2.5, '🫐': 3, '🥝': 1.5, '🍄': 1.5, '🍆': 1.5, '🌶': 1,
    '🌶️': 1, '🫑': 1.2, '🌰': 2, '🫚': 1.5, '🫛': 1.2, '🫜': 1,
    '🥐': 2.5, '🫓': 2, '🥨': 2, '🥞': 3, '🧇': 3, '🥓': 3.5,
    '🍔': 5, '🍟': 2.5, '🍕': 4, '🌭': 3.5, '🥪': 3.5, '🌮': 3.5,
    '🌯': 4.5, '🫔': 3, '🥙': 4, '🧆': 3, '🍳': 2.5, '🥘': 6,
    '🍲': 5, '🫕': 5, '🥣': 3, '🥗': 3.5, '🍿': 2, '🧂': 0.5,
    '🥫': 2, '🍱': 6, '🍘': 1.5, '🍙': 2, '🍛': 4, '🍜': 4.5,
    '🍠': 2, '🍢': 3.5, '🍣': 5, '🍤': 4, '🍥': 3, '🥮': 3.5,
    '🍡': 2.5, '🥟': 3, '🥠': 1.5, '🥡': 4.5, '🦀': 6, '🦞': 8,
    '🦐': 5, '🦑': 5, '🦪': 4, '🍦': 2.5, '🍧': 2, '🍨': 3,
    '🍩': 2.5, '🍪': 2, '🎂': 8, '🍰': 4, '🧁': 3, '🥧': 3.5,
    '🍫': 2.5, '🍬': 1.5, '🍭': 1.5, '🍮': 3, '🍯': 3, '🍼': 2,
    '☕': 2, '🫖': 3, '🍵': 1.5, '🍶': 4, '🍾': 10, '🍷': 5,
    '🍸': 5, '🍹': 4.5, '🍺': 3.5, '🍻': 6, '🥂': 7, '🥃': 5,
    '🥤': 2, '🧋': 3.5, '🧃': 1.5, '🧉': 2.5,
    '🐙': 5, '🫙': 2.5, '🐡': 7, '🧊': 0.5
};
// ASCII-safe aliases: bare vs VS16 pepper and bare vs ZWJ mushroom are one food.
FOOD_PRICES['\u{1F336}'] = FOOD_PRICES['\u{1F336}\uFE0F'] || FOOD_PRICES['\u{1F336}'] || 1;
FOOD_PRICES['\u{1F336}\uFE0F'] = FOOD_PRICES['\u{1F336}'];
FOOD_PRICES['\u{1F344}\u200D'] = FOOD_PRICES['\u{1F344}'];

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
    '🥑': { name: 'Avocado', hunger: 25, nutrition: [10, 0, 40] },

    // DS-FRIDGE-01: full emoji pantry, appended inline (existing lines untouched).
    // Fruits
    '🍈': { name: 'Melon', hunger: 30, nutrition: [0, 10, 40] },
    '🍋': { name: 'Lemon', hunger: 10, nutrition: [0, 0, 35] },
    '🍍': { name: 'Pineapple', hunger: 25, nutrition: [0, 10, 40] },
    '🥭': { name: 'Mango', hunger: 25, nutrition: [0, 10, 40] },
    '🍏': { name: 'Green Apple', hunger: 20, nutrition: [0, 10, 40] },
    '🍐': { name: 'Pear', hunger: 20, nutrition: [0, 10, 40] },
    '🍒': { name: 'Cherries', hunger: 15, nutrition: [0, 5, 40] },
    '🫐': { name: 'Blueberries', hunger: 15, nutrition: [0, 5, 45] },
    '🥝': { name: 'Kiwi', hunger: 15, nutrition: [0, 5, 40] },
    // Vegetables / fungi / legumes
    '🍄': { name: 'Mushroom', hunger: 15, nutrition: [5, 0, 30] },
    '🍆': { name: 'Eggplant', hunger: 15, nutrition: [0, 5, 30] },
    '🌶': { name: 'Hot Pepper', hunger: 10, nutrition: [0, 0, 35] },
    '🌶️': { name: 'Hot Pepper', hunger: 10, nutrition: [0, 0, 35] },
    '🫑': { name: 'Bell Pepper', hunger: 15, nutrition: [0, 5, 35] },
    '🌰': { name: 'Chestnut', hunger: 20, nutrition: [5, 20, 10] },
    '🫚': { name: 'Ginger', hunger: 5, nutrition: [0, 0, 25] },
    '🫛': { name: 'Pea Pod', hunger: 15, nutrition: [5, 10, 25] },
    '🫜': { name: 'Root Vegetable', hunger: 25, nutrition: [0, 20, 20] },
    // Bakery
    '🥐': { name: 'Croissant', hunger: 40, nutrition: [10, 45, 0] },
    '🫓': { name: 'Flatbread', hunger: 40, nutrition: [10, 50, 0] },
    '🥨': { name: 'Pretzel', hunger: 30, nutrition: [5, 40, 0] },
    '🥞': { name: 'Pancakes', hunger: 50, nutrition: [10, 55, 0] },
    '🧇': { name: 'Waffle', hunger: 50, nutrition: [10, 55, 0] },
    // Meats / fast food
    '🥓': { name: 'Bacon', hunger: 45, nutrition: [45, 0, 0] },
    '🍔': { name: 'Hamburger', hunger: 70, nutrition: [30, 40, 0] },
    '🍟': { name: 'Fries', hunger: 45, nutrition: [5, 50, 0] },
    '🍕': { name: 'Pizza', hunger: 65, nutrition: [20, 45, 0] },
    '🌭': { name: 'Hot Dog', hunger: 55, nutrition: [25, 40, 0] },
    '🥪': { name: 'Sandwich', hunger: 55, nutrition: [25, 40, 5] },
    '🌮': { name: 'Taco', hunger: 55, nutrition: [25, 35, 10] },
    '🌯': { name: 'Burrito', hunger: 65, nutrition: [25, 45, 5] },
    '🫔': { name: 'Tamale', hunger: 50, nutrition: [15, 45, 5] },
    '🥙': { name: 'Stuffed Flatbread', hunger: 55, nutrition: [20, 40, 10] },
    '🧆': { name: 'Falafel', hunger: 40, nutrition: [20, 30, 10] },
    // Cooked dishes / pantry
    '🍳': { name: 'Fried Egg', hunger: 35, nutrition: [30, 0, 5] },
    '🥘': { name: 'Paella', hunger: 70, nutrition: [30, 40, 10] },
    '🍲': { name: 'Stew Pot', hunger: 65, nutrition: [30, 30, 15] },
    '🫕': { name: 'Fondue', hunger: 50, nutrition: [35, 20, 5] },
    '🥣': { name: 'Soup Bowl', hunger: 40, nutrition: [15, 25, 15] },
    '🥗': { name: 'Green Salad', hunger: 25, nutrition: [5, 5, 50] },
    '🍿': { name: 'Popcorn', hunger: 25, nutrition: [5, 35, 0] },
    '🧂': { name: 'Salt', hunger: 5, nutrition: [0, 0, 5] },
    '🥫': { name: 'Canned Food', hunger: 40, nutrition: [20, 25, 10] },
    '🍱': { name: 'Bento Box', hunger: 70, nutrition: [30, 35, 20] },
    '🍘': { name: 'Rice Cracker', hunger: 20, nutrition: [0, 30, 5] },
    '🍙': { name: 'Rice Ball', hunger: 35, nutrition: [5, 45, 0] },
    '🍛': { name: 'Curry Rice', hunger: 60, nutrition: [15, 50, 10] },
    '🍜': { name: 'Ramen', hunger: 60, nutrition: [20, 45, 10] },
    '🍠': { name: 'Sweet Potato', hunger: 40, nutrition: [0, 30, 25] },
    '🍢': { name: 'Oden Skewers', hunger: 45, nutrition: [30, 15, 10] },
    '🍣': { name: 'Sushi', hunger: 50, nutrition: [35, 25, 10] },
    '🍤': { name: 'Fried Shrimp', hunger: 45, nutrition: [35, 20, 5] },
    '🍥': { name: 'Fish Cake', hunger: 35, nutrition: [30, 20, 5] },
    '🥮': { name: 'Moon Cake', hunger: 40, nutrition: [10, 45, 5] },
    '🍡': { name: 'Dango', hunger: 30, nutrition: [5, 40, 5] },
    '🥟': { name: 'Dumpling', hunger: 45, nutrition: [20, 35, 5] },
    '🥠': { name: 'Fortune Cookie', hunger: 20, nutrition: [5, 30, 0] },
    '🥡': { name: 'Takeout Box', hunger: 60, nutrition: [25, 40, 10] },
    // Seafood
    '🦀': { name: 'Crab', hunger: 55, nutrition: [50, 0, 10] },
    '🦞': { name: 'Lobster', hunger: 60, nutrition: [55, 0, 10] },
    '🦐': { name: 'Shrimp', hunger: 45, nutrition: [45, 5, 5] },
    '🦑': { name: 'Squid', hunger: 45, nutrition: [45, 5, 5] },
    '🦪': { name: 'Oyster', hunger: 30, nutrition: [35, 5, 15] },
    // Sweets
    '🍦': { name: 'Soft Ice Cream', hunger: 30, nutrition: [5, 35, 5] },
    '🍧': { name: 'Shaved Ice', hunger: 20, nutrition: [0, 25, 10] },
    '🍨': { name: 'Ice Cream', hunger: 35, nutrition: [5, 40, 5] },
    '🍩': { name: 'Doughnut', hunger: 40, nutrition: [5, 50, 0] },
    '🍪': { name: 'Cookie', hunger: 30, nutrition: [5, 40, 0] },
    '🎂': { name: 'Birthday Cake', hunger: 70, nutrition: [10, 60, 5] },
    '🍰': { name: 'Shortcake', hunger: 45, nutrition: [5, 50, 5] },
    '🧁': { name: 'Cupcake', hunger: 40, nutrition: [5, 50, 0] },
    '🥧': { name: 'Pie', hunger: 50, nutrition: [5, 50, 5] },
    '🍫': { name: 'Chocolate', hunger: 35, nutrition: [5, 40, 10] },
    '🍬': { name: 'Candy', hunger: 20, nutrition: [0, 35, 0] },
    '🍭': { name: 'Lollipop', hunger: 20, nutrition: [0, 35, 0] },
    '🍮': { name: 'Custard', hunger: 35, nutrition: [10, 35, 10] },
    '🍯': { name: 'Honey', hunger: 30, nutrition: [0, 40, 5] },
    // Drinks
    '🍼': { name: 'Baby Bottle', hunger: 25, nutrition: [15, 15, 15] },
    '☕': { name: 'Coffee', hunger: 10, nutrition: [0, 5, 5] },
    '🫖': { name: 'Teapot', hunger: 10, nutrition: [0, 0, 20] },
    '🍵': { name: 'Tea', hunger: 10, nutrition: [0, 0, 25] },
    '🍶': { name: 'Sake', hunger: 10, nutrition: [0, 10, 0] },
    '🍾': { name: 'Champagne', hunger: 10, nutrition: [0, 10, 5] },
    '🍷': { name: 'Wine', hunger: 10, nutrition: [0, 5, 10] },
    '🍸': { name: 'Cocktail', hunger: 15, nutrition: [0, 15, 5] },
    '🍹': { name: 'Tropical Drink', hunger: 20, nutrition: [0, 20, 15] },
    '🍺': { name: 'Beer', hunger: 15, nutrition: [0, 15, 0] },
    '🍻': { name: 'Beers', hunger: 25, nutrition: [0, 25, 0] },
    '🥂': { name: 'Champagne Toast', hunger: 15, nutrition: [0, 15, 5] },
    '🥃': { name: 'Whisky', hunger: 10, nutrition: [0, 5, 0] },
    '🥤': { name: 'Soda Cup', hunger: 15, nutrition: [0, 30, 0] },
    '🧋': { name: 'Bubble Tea', hunger: 25, nutrition: [5, 35, 5] },
    '🧃': { name: 'Juice Box', hunger: 15, nutrition: [0, 20, 20] },
    '🧉': { name: 'Mate', hunger: 10, nutrition: [0, 0, 20] },
    // DS-FRIDGE-01: verifier-catalog extras (verify-fridge.mjs inline list).
    '🐙': { name: 'Octopus', hunger: 50, nutrition: [50, 0, 10] },
    '🫙': { name: 'Preserves Jar', hunger: 30, nutrition: [5, 20, 20] },
    '🐡': { name: 'Blowfish', hunger: 55, nutrition: [50, 0, 15] },
    '🧊': { name: 'Ice', hunger: 5, nutrition: [0, 0, 5] }
};
// ASCII-safe aliases: bare vs VS16 pepper and bare vs ZWJ mushroom are one food.
FOOD_STATS['\u{1F336}'] = FOOD_STATS['\u{1F336}\uFE0F'] || FOOD_STATS['\u{1F336}'];
FOOD_STATS['\u{1F336}\uFE0F'] = FOOD_STATS['\u{1F336}'];
FOOD_STATS['\u{1F344}\u200D'] = FOOD_STATS['\u{1F344}'];

let gameRunning = false;
let gamePaused = false;
let day = 1;
let money = 1000;
let deaths = 0;
let maxCombo = 0;
let feedStreak = 0;
let lastTime = 0;

// DS-FRIDGE-01: localStorage autosave slot (server/cloud panel reads via FridgeCloudSave).
const FRIDGE_SAVE_KEY = 'fridge-sim-save';

let inventory = {};
let countries = {};
let currentShop = 'grocery';

let selectedFood = null;
let shopStocks = {};

// ===== DS-FRIDGE-01: SAVE SYSTEM (local autosave + v2 panel hooks, zero network) =====
function collectSaveData() {
    return {
        day,
        money,
        deaths,
        inventory: Object.assign({}, inventory),
        countries: JSON.parse(JSON.stringify(countries))
    };
}

function persistSave() {
    try {
        localStorage.setItem(FRIDGE_SAVE_KEY, JSON.stringify(collectSaveData()));
    } catch (e) { /* storage unavailable (private mode/sandbox) — session continues */ }
}

function clearSave() {
    try {
        localStorage.removeItem(FRIDGE_SAVE_KEY);
    } catch (e) { /* ignore */ }
}

function restoreSaveData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Number.isFinite(data.day) || !Number.isFinite(data.money) || !Number.isFinite(data.deaths)) return false;
    if (!data.inventory || typeof data.inventory !== 'object') return false;
    if (!data.countries || typeof data.countries !== 'object') return false;
    const nextInventory = {};
    Object.entries(data.inventory).forEach(([emoji, count]) => {
        if (FOOD_STATS[emoji] && Number.isFinite(count) && count > 0) {
            nextInventory[emoji] = Math.floor(count);
        }
    });
    const nextCountries = {};
    Object.entries(data.countries).forEach(([key, c]) => {
        if (!c || typeof c !== 'object' || !Array.isArray(c.family) || c.family.length === 0) return;
        nextCountries[key] = {
            name: typeof c.name === 'string' ? c.name : key,
            familySize: c.family.length,
            budget: Number.isFinite(c.budget) ? c.budget : 0,
            preferences: Array.isArray(c.preferences) ? c.preferences.filter(f => FOOD_STATS[f]) : [],
            fridge: (c.fridge && typeof c.fridge === 'object') ? c.fridge : {},
            family: c.family,
            hunger: Array.isArray(c.hunger) ? c.hunger : c.family.map(() => 100),
            nutrition: Array.isArray(c.nutrition) ? c.nutrition : c.family.map(() => [20, 20, 20])
        };
    });
    if (Object.keys(nextCountries).length === 0) return false;
    day = Math.max(1, Math.floor(data.day));
    money = data.money;
    deaths = Math.max(0, Math.floor(data.deaths));
    inventory = nextInventory;
    countries = nextCountries;
    return true;
}

// Cloud-save hooks for the v2 panel (DS-FRIDGE-02 mounts): serialize() hands the
// panel plain JSON, load(data) resumes it. No network calls from this bundle.
window.FridgeCloudSave = {
    serialize() { return collectSaveData(); },
    load(data) {
        const ok = restoreSaveData(data);
        if (!ok) return false;
        gameRunning = true;
        gamePaused = false;
        selectedFood = null;
        generateShopStocks();
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('victoryScreen').classList.add('hidden');
        render();
        persistSave();
        return true;
    }
};

// Day-survived score: days bank 100/day, mouths fed bank 10 each,
// deaths cost 25 each, streaks/combos add flavor points.
function getScore() {
    const alive = Object.values(countries).reduce((sum, c) => sum + c.family.filter(m => m !== '💀').length, 0);
    return Math.max(0, (day - 1) * 100 + alive * 10 - deaths * 25 + feedStreak * 15 + maxCombo * 10);
}

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

let audioCtx = null;
let soundMuted = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

window.addEventListener('pointerdown', () => { if (!soundMuted) initAudio(); }, { once: true });
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SET_GAME_SPEED') {
        const spd = parseFloat(e.data.speed);
        if (!isNaN(spd) && spd > 0) window.gameSpeedMultiplier = spd;
    }
});

function toggleSound() {
    soundMuted = !soundMuted;
    const btn = document.getElementById('btnSoundToggle');
    if (btn) {
        btn.textContent = soundMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
        btn.style.color = soundMuted ? '#ef4444' : '#10b981';
    }
}

function playSound(type) {
    if (soundMuted) return;
    try {
        const ctx = initAudio();
        if (!ctx) return;
        const now = ctx.currentTime;
        
        switch(type) {
            case 'buy': {
                const o1 = ctx.createOscillator();
                const g1 = ctx.createGain();
                o1.connect(g1); g1.connect(ctx.destination);
                o1.type = 'sine';
                o1.frequency.setValueAtTime(880, now);
                o1.frequency.setValueAtTime(1320, now + 0.08);
                g1.gain.setValueAtTime(0.18, now);
                g1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                o1.start(now); o1.stop(now + 0.25);
                break;
            }
            case 'stock': {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'triangle';
                o.frequency.setValueAtTime(220, now);
                o.frequency.exponentialRampToValueAtTime(60, now + 0.12);
                g.gain.setValueAtTime(0.2, now);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
                o.start(now); o.stop(now + 0.14);
                break;
            }
            case 'feed': {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'triangle';
                o.frequency.setValueAtTime(300, now);
                o.frequency.linearRampToValueAtTime(450, now + 0.06);
                o.frequency.linearRampToValueAtTime(320, now + 0.12);
                g.gain.setValueAtTime(0.15, now);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                o.start(now); o.stop(now + 0.15);
                break;
            }
            case 'autofeed': {
                [440, 554.37, 659.25, 880].forEach((freq, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'sine';
                    o.frequency.setValueAtTime(freq, now + i * 0.05);
                    g.gain.setValueAtTime(0.12, now + i * 0.05);
                    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.18);
                    o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.18);
                });
                break;
            }
            case 'nextday': {
                [261.63, 329.63, 392.00, 523.25].forEach((f, idx) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'sine';
                    o.frequency.setValueAtTime(f, now + idx * 0.04);
                    g.gain.setValueAtTime(0.12, now + idx * 0.04);
                    g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.4);
                    o.start(now + idx * 0.04); o.stop(now + idx * 0.04 + 0.4);
                });
                break;
            }
            case 'unlock': {
                [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'triangle';
                    o.frequency.setValueAtTime(f, now + idx * 0.08);
                    g.gain.setValueAtTime(0.18, now + idx * 0.08);
                    g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
                    o.start(now + idx * 0.08); o.stop(now + idx * 0.08 + 0.35);
                });
                break;
            }
            case 'death': {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(160, now);
                o.frequency.exponentialRampToValueAtTime(45, now + 0.6);
                g.gain.setValueAtTime(0.25, now);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
                o.start(now); o.stop(now + 0.7);
                break;
            }
        }
    } catch(e) {}
}

function showToast(message, color = '#00f2fe') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'game-toast';
    toast.style.borderColor = color;
    toast.style.boxShadow = `0 0 15px ${color}40`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 2400);
}

function startGame() {
    gameRunning = true;
    gamePaused = false;
    day = 1;
    money = 1000;
    deaths = 0;
    feedStreak = 0;
    maxCombo = 0;
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
    persistSave();
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
        const fStats = FOOD_STATS[emoji];
        showToast(`🛒 Bought ${emoji} ${fStats ? fStats.name : ''} (-$${finalPrice})`, '#39ff14');
        render();
        persistSave();
    } else {
        playSound('death');
        showToast(`❌ Not enough funds for ${emoji} ($${finalPrice})!`, '#ef4444');
    }
}

function nextDay() {
    if (!gameRunning || gamePaused) return;
    
    playSound('nextday');
    
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
    let preferredFeeds = 0;
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
                const wasPreferred = foodIndex !== -1;
                if (foodIndex === -1) foodIndex = 0;
                if (wasPreferred) preferredFeeds++;
                
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
            playSound('unlock');
            showToast(`🌍 ${data.name} unlocked! Budget +$${data.budget}`, '#f59e0b');
        }
    });
    
    // DS-FRIDGE-01 fun: combo/streak toast when families get their favorite foods.
    if (preferredFeeds >= 2) {
        feedStreak++;
        maxCombo = Math.max(maxCombo, preferredFeeds);
        const bonus = preferredFeeds * 2;
        money += bonus;
        playSound('autofeed');
        showToast(`🔥 Tasty combo x${preferredFeeds}! Day streak ${feedStreak} (+$${bonus})`, '#f59e0b');
    } else if (preferredFeeds > 0) {
        feedStreak++;
        maxCombo = Math.max(maxCombo, preferredFeeds);
    } else {
        feedStreak = 0;
    }

    // Check game over
    const aliveCount = Object.values(countries).reduce((sum, c) => sum + c.family.filter(m => m !== '💀').length, 0);
    
    if (aliveCount === 0) {
        gameRunning = false;
        playSound('death');
        showToast('💀 All families have perished!', '#ef4444');
        document.getElementById('finalDays').textContent = day;
        document.getElementById('finalDeaths').textContent = deaths;
        document.getElementById('finalMoney').textContent = '$' + money;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    } else if (day >= 30) {
        gameRunning = false;
        playSound('victory');
        showToast('🏆 Global Food Hero Victory Achieved!', '#39ff14');
        document.getElementById('victoryDays').textContent = day;
        document.getElementById('victoryPopulation').textContent = aliveCount;
        document.getElementById('victoryMoney').textContent = '$' + money;
        document.getElementById('victoryScreen').classList.remove('hidden');
    }

    if (gameRunning) persistSave(); else clearSave();

    render();
}

function render() {
    // Update HUD
    document.getElementById('hudMoney').textContent = '$' + money;
    document.getElementById('hudDay').textContent = day;
    const totalPop = Object.values(countries).reduce((sum, c) => sum + c.family.length, 0);
    document.getElementById('hudPopulation').textContent = totalPop;
    document.getElementById('hudDeaths').textContent = deaths;
    // DS-FRIDGE-01: day-survived score in the HUD (badge created live — index.html untouched).
    let scoreEl = document.getElementById('hudScore');
    if (!scoreEl) {
        const hud = document.querySelector('.hud');
        if (hud) {
            const stat = document.createElement('div');
            stat.className = 'hud-stat';
            stat.innerHTML = '<span class="hud-label">⭐ Score</span> <span class="hud-value" id="hudScore">0</span>';
            hud.appendChild(stat);
            scoreEl = stat.querySelector('#hudScore');
        }
    }
    if (scoreEl) scoreEl.textContent = getScore();
    
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
        playSound('stock');
        render();
        persistSave();
    }
}

function removeFromFridge(countryKey, slot) {
    const country = countries[countryKey];
    const food = country.fridge[slot];
    if (food) {
        delete country.fridge[slot];
        inventory[food] = (inventory[food] || 0) + 1;
        playSound('stock');
        render();
        persistSave();
    }
}

function autoStockFridges() {
    if (!gameRunning || gamePaused) return;
    let stockedCount = 0;
    const invKeys = Object.keys(inventory).filter(k => inventory[k] > 0);
    if (invKeys.length === 0) {
        showToast('🎒 Inventory empty! Buy food from shops first.', '#f59e0b');
        return;
    }

    Object.entries(countries).forEach(([key, country]) => {
        for (let slot = 0; slot < 12; slot++) {
            if (!country.fridge[slot]) {
                // Prioritize preference
                let chosenFood = invKeys.find(f => inventory[f] > 0 && country.preferences.includes(f));
                if (!chosenFood) {
                    chosenFood = invKeys.find(f => inventory[f] > 0);
                }
                if (chosenFood) {
                    country.fridge[slot] = chosenFood;
                    inventory[chosenFood]--;
                    if (inventory[chosenFood] <= 0) {
                        delete inventory[chosenFood];
                    }
                    stockedCount++;
                }
            }
        }
    });

    if (stockedCount > 0) {
        playSound('autofeed');
        showToast(`⚡ Auto-stocked ${stockedCount} items into fridges!`, '#10b981');
        render();
        persistSave();
    } else {
        showToast('Fridges are already full!', '#f59e0b');
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

    const soundBtn = document.getElementById('btnSoundToggle');
    if (soundBtn) {
        soundBtn.addEventListener('click', toggleSound);
    }

    const quickStockBtn = document.getElementById('btnQuickStock');
    if (quickStockBtn) {
        quickStockBtn.addEventListener('click', autoStockFridges);
    }

    const pauseBtn = document.getElementById('btnPause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', togglePause);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (gameRunning) togglePause();
        }
        if (e.key === 'm' || e.key === 'M') {
            toggleSound();
        }
        // Next Day keyboard shortcuts
        if ((e.key === ' ' || e.key === 'n' || e.key === 'N') && gameRunning && !gamePaused) {
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

    // DS-FRIDGE-01: autoload — resume the autosave on start (fresh start screen if none).
    try {
        const raw = localStorage.getItem(FRIDGE_SAVE_KEY);
        if (raw && window.FridgeCloudSave.load(JSON.parse(raw))) {
            showToast('💾 Save resumed — welcome back, chef!', '#00f2fe');
        }
    } catch (e) { /* no usable save — stay on the start screen */ }
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
