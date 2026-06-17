/**
 * Financial Freedom - Core Game Logic
 * Simulates a USA Family's path to Financial Independence.
 */

// Initial state and profiles definition
const PROFILES = {
    graduate: {
        id: "graduate",
        name: "Alex, The Debt-Stricken Graduate",
        description: "Single public school teacher. Stressed out by student loans but has a passion for education and a stable pension trajectory.",
        avatar: "🎓",
        filingStatus: "Single",
        cash: 1200,
        creditScore: 610,
        happiness: 55,
        career: "Teacher",
        monthlySalary: 3800, // Gross monthly
        studentLoan: 42000,
        creditCardDebt: 2500,
        autoLoan: 8000,
        rent: 1100,
        hasKids: false,
        careerLevel: 1,
        debtInterest: { student: 0.065, cc: 0.22, auto: 0.07 }
    },
    couple: {
        id: "couple",
        name: "The Martinez Family",
        description: "Married young couple with a newborn baby. Struggling to balance high living costs, credit card debts, and a high-yield career path in marketing and sales.",
        avatar: "👶",
        filingStatus: "Married",
        cash: 4800,
        creditScore: 660,
        happiness: 60,
        career: "Marketing & Sales Manager",
        monthlySalary: 8500, // Combined gross
        studentLoan: 15000,
        creditCardDebt: 11000,
        autoLoan: 22000,
        rent: 2100,
        hasKids: true,
        careerLevel: 2,
        debtInterest: { student: 0.05, cc: 0.24, auto: 0.06 }
    },
    solopreneur: {
        id: "solopreneur",
        name: "Jordan, The Tech Freelancer",
        description: "Single consultant aiming to launch a digital software startup. High earning potential but highly volatile client income and no corporate benefits.",
        avatar: "💻",
        filingStatus: "Single",
        cash: 12000,
        creditScore: 720,
        happiness: 70,
        career: "IT Consultant",
        monthlySalary: 7200,
        studentLoan: 0,
        creditCardDebt: 0,
        autoLoan: 0,
        rent: 1600,
        hasKids: false,
        careerLevel: 2,
        debtInterest: { student: 0, cc: 0.18, auto: 0 }
    }
};

const TERMS = [
    { term: "401(k) Plan", definition: "A tax-advantaged, employer-sponsored retirement account. Contributions are made pre-tax (reducing your taxable income), and employers often match a portion of your contributions—which is essentially free money." },
    { term: "Roth IRA", definition: "An individual retirement account where you contribute post-tax dollars. The growth and withdrawals in retirement are 100% tax-free, making it extremely powerful for long-term compound growth." },
    { term: "HSA (Health Savings Account)", definition: "A triple-tax-advantaged account available to those with High Deductible Health Plans (HDHP). Contributions are tax-deductible, growth is tax-free, and withdrawals for medical expenses are tax-free." },
    { term: "FI-Number (Financial Independence)", definition: "Based on the 4% Rule of Thumb. If you accumulate 25 times your annual expenses in investments, you can safely withdraw 4% annually to cover your living costs forever without running out of money." },
    { term: "Debt Avalanche vs Snowball", definition: "Avalanche pays off the highest-interest debt first to save the most money. Snowball pays the smallest balances first to gain quick psychological wins. Avalanche is mathematically optimal." },
    { term: "Credit Utilization Ratio", definition: "The amount of revolving credit you are using divided by your total credit limit. Keeping this under 30% is critical for achieving and maintaining a high Credit Score." },
    { term: "HYSA (High-Yield Savings)", definition: "A savings account that pays a much higher interest rate (e.g., 4%+) than standard bank accounts (0.01%). Perfect for emergency funds so your liquid cash isn't eaten by inflation." }
];

let gameState = {
    // Current profile and state
    profile: null,
    month: 1,
    cash: 0,
    creditScore: 600,
    happiness: 100,
    energy: 100,
    netWorth: 0,
    
    // Careers & Hustles
    careerLevel: 1,
    monthlySalary: 0,
    hustleActive: null, // "rideshare", "consulting", "ecom"
    trainingMonthsRemaining: 0,
    
    // Assets
    stocks: 0,
    crypto: 0,
    hysa: 0,
    retirement401k: 0,
    retirementRothIRA: 0,
    hsa: 0,
    primaryHome: null, // { value, mortgage, interestRate }
    investmentsProperties: [], // array of { value, mortgage, income, expenses }
    
    // Debts
    studentLoan: 0,
    creditCardDebt: 0,
    autoLoan: 0,
    
    // Budgets (allocated dollars)
    budget401kPercent: 4, // default 4% for match
    budgetRothIRA: 0,
    budgetHSA: 0,
    budgetFun: 300,
    budgetGroceries: 500,
    budgetUtilities: 300,
    
    // Insurance
    insurance: {
        health: "PPO", // HDHP or PPO
        life: "None"  // None, Term, Whole
    },
    
    // Kids
    kids529: 0,
    
    // Game logs / charts
    netWorthHistory: [],
    monthlyLogs: [],
    unlockedAchievements: [],
    economicCycle: "Normal", // "Normal", "Bull Market", "Bear Market", "High Inflation"
    
    // Strategy selection
    debtStrategy: "avalanche" // avalanche vs snowball
};

const ACHIEVEMENTS = [
    { id: "debt_free", name: "Debt Free!", desc: "Pay off all student, credit card, and auto loans.", emoji: "🕊️" },
    { id: "six_month_reserve", name: "Emergency Ready", desc: "Accumulate at least 6 months of living expenses in cash.", emoji: "🛡️" },
    { id: "free_match", name: "Match Master", desc: "Contribute enough to your 401(k) to grab the full employer match.", emoji: "🎁" },
    { id: "homeowner", name: "Land Lord", desc: "Purchase your first primary residence or investment property.", emoji: "🏡" },
    { id: "six_figure_club", name: "100k Club", desc: "Cross a total Net Worth of $100,000.", emoji: "📈" },
    { id: "freedom", name: "Financial Freedom!", desc: "Reach your Financial Independence target.", emoji: "🏝️" }
];

// Document loaded event
document.addEventListener("DOMContentLoaded", () => {
    // Populate profile selector and glossary
    renderProfiles();
    renderGlossary();
    setupTabControls();
    
    // Setup event listeners for budget inputs
    document.getElementById("slider-fun").addEventListener("input", updateBudgetSliders);
    document.getElementById("slider-groceries").addEventListener("input", updateBudgetSliders);
    document.getElementById("slider-utilities").addEventListener("input", updateBudgetSliders);
    document.getElementById("401k-pct").addEventListener("change", (e) => {
        gameState.budget401kPercent = parseFloat(e.target.value) || 0;
        updateBudgetSummary();
    });
    document.getElementById("roth-amount").addEventListener("input", (e) => {
        gameState.budgetRothIRA = Math.max(0, parseInt(e.target.value) || 0);
        updateBudgetSummary();
    });
    document.getElementById("hsa-amount").addEventListener("input", (e) => {
        gameState.budgetHSA = Math.max(0, parseInt(e.target.value) || 0);
        updateBudgetSummary();
    });
    
    // Next month action
    document.getElementById("next-month-btn").addEventListener("click", advanceMonth);
    
    // Custom logic button clicks
    setupCustomButtons();
});

// Render Profiles on Start
function renderProfiles() {
    const container = document.getElementById("profile-cards");
    container.innerHTML = "";
    Object.keys(PROFILES).forEach(key => {
        const p = PROFILES[key];
        const card = document.createElement("div");
        card.className = "profile-card";
        card.innerHTML = `
            <div class="profile-emoji">${p.avatar}</div>
            <div class="profile-name">${p.name}</div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 4px 0;">${p.description}</p>
            <div class="profile-details">
                <span>Filing Status: <strong>${p.filingStatus}</strong></span>
                <span class="profile-income">Salary: <strong>$${p.monthlySalary.toLocaleString()}/mo</strong></span>
                <span>Starting Cash: <strong>$${p.cash.toLocaleString()}</strong></span>
                <span>Credit Score: <strong>${p.creditScore}</strong></span>
                <span>Student Loans: <strong>$${p.studentLoan.toLocaleString()}</strong></span>
                <span>Credit Card Debt: <strong style="color: var(--accent-rose)">$${p.creditCardDebt.toLocaleString()}</strong></span>
            </div>
            <button class="btn btn-cyan" style="margin-top: 10px; width: 100%;">Choose Profile</button>
        `;
        card.querySelector("button").addEventListener("click", () => {
            selectProfile(p);
        });
        container.appendChild(card);
    });
}

// Select a profile and initialize game
function selectProfile(profile) {
    gameState.profile = profile;
    gameState.cash = profile.cash;
    gameState.creditScore = profile.creditScore;
    gameState.happiness = profile.happiness;
    gameState.monthlySalary = profile.monthlySalary;
    gameState.careerLevel = profile.careerLevel;
    
    gameState.studentLoan = profile.studentLoan;
    gameState.creditCardDebt = profile.creditCardDebt;
    gameState.autoLoan = profile.autoLoan;
    
    gameState.month = 1;
    gameState.netWorth = calculateNetWorth();
    gameState.netWorthHistory = [gameState.netWorth];
    
    gameState.retirement401k = 0;
    gameState.retirementRothIRA = 0;
    gameState.stocks = 1000; // Small initial investments
    gameState.crypto = 0;
    gameState.hsa = 0;
    gameState.primaryHome = null;
    gameState.investmentsProperties = [];
    
    gameState.unlockedAchievements = [];
    gameState.monthlyLogs = [`Started your financial freedom journey as: ${profile.name}. Goal: Reach Net Worth of 25x annual expenses.`];
    
    // Hide overlay
    document.getElementById("profile-overlay").style.display = "none";
    
    // Reset inputs
    document.getElementById("slider-fun").value = gameState.budgetFun;
    document.getElementById("slider-groceries").value = gameState.budgetGroceries;
    document.getElementById("slider-utilities").value = gameState.budgetUtilities;
    document.getElementById("401k-pct").value = gameState.budget401kPercent;
    document.getElementById("roth-amount").value = gameState.budgetRothIRA;
    document.getElementById("hsa-amount").value = gameState.budgetHSA;
    
    // Update view
    updateUI();
    logEvent("System", `Game started! Welcome to Financial Freedom. Make decisions and click Next Month!`, "info");
}

// Render glossary cards
function renderGlossary() {
    const container = document.getElementById("glossary-container");
    container.innerHTML = "";
    TERMS.forEach(t => {
        const card = document.createElement("div");
        card.className = "glossary-card";
        card.innerHTML = `
            <div class="glossary-term">📖 ${t.term}</div>
            <div class="glossary-definition">${t.definition}</div>
        `;
        container.appendChild(card);
    });
}

// Tab Switching Mechanism
function setupTabControls() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");
    
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove("active"));
            tabPanels.forEach(p => p.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(`panel-${target}`).classList.add("active");
        });
    });
}

function updateBudgetSliders() {
    gameState.budgetFun = parseInt(document.getElementById("slider-fun").value);
    gameState.budgetGroceries = parseInt(document.getElementById("slider-groceries").value);
    gameState.budgetUtilities = parseInt(document.getElementById("slider-utilities").value);
    
    document.getElementById("val-fun").textContent = `$${gameState.budgetFun}`;
    document.getElementById("val-groceries").textContent = `$${gameState.budgetGroceries}`;
    document.getElementById("val-utilities").textContent = `$${gameState.budgetUtilities}`;
    
    updateBudgetSummary();
}

// Calculate Net Worth: Assets - Liabilities
function calculateNetWorth() {
    let assets = gameState.cash + gameState.stocks + gameState.crypto + gameState.retirement401k + gameState.retirementRothIRA + gameState.hsa;
    if (gameState.primaryHome) {
        assets += gameState.primaryHome.value;
    }
    gameState.investmentsProperties.forEach(prop => {
        assets += prop.value;
    });
    
    let liabilities = gameState.studentLoan + gameState.creditCardDebt + gameState.autoLoan;
    if (gameState.primaryHome) {
        liabilities += gameState.primaryHome.mortgage;
    }
    gameState.investmentsProperties.forEach(prop => {
        liabilities += prop.mortgage;
    });
    
    return assets - liabilities;
}

// Get Annualized Expenses (used for FI calculation)
function getAnnualExpenses() {
    // Estimate fixed and baseline discretionary expenses
    let monthlyFixed = 0;
    
    // Rent or Mortgage
    if (gameState.primaryHome) {
        // Estimate mortgage monthly + taxes + maint
        const mortgagePayment = (gameState.primaryHome.mortgage * 0.005); // rough estimate
        monthlyFixed += mortgagePayment + 200 + 150; 
    } else {
        monthlyFixed += gameState.profile ? gameState.profile.rent : 1200;
    }
    
    // Debts minimum payments
    if (gameState.studentLoan > 0) monthlyFixed += 250;
    if (gameState.autoLoan > 0) monthlyFixed += 350;
    if (gameState.creditCardDebt > 0) monthlyFixed += (gameState.creditCardDebt * 0.03);
    
    // Add insurance
    if (gameState.insurance.health === "PPO") monthlyFixed += 150;
    else monthlyFixed += 80;
    if (gameState.insurance.life === "Term") monthlyFixed += 40;
    else if (gameState.insurance.life === "Whole") monthlyFixed += 250;
    
    // Kids child care
    if (gameState.profile && gameState.profile.hasKids) monthlyFixed += 800;
    
    // Discretionary
    const monthlyDiscretionary = gameState.budgetFun + gameState.budgetGroceries + gameState.budgetUtilities;
    
    return (monthlyFixed + monthlyDiscretionary) * 12;
}

// Update Budget summary labels
function updateBudgetSummary() {
    if (!gameState.profile) return;
    
    // Calculate Monthly Gross Income
    const gross = gameState.monthlySalary;
    
    // Pre-tax deductions: 401(k)
    const deduction401k = gross * (gameState.budget401kPercent / 100);
    
    // Taxable gross estimation for monthly taxes (simulated tax formula)
    const taxableGross = Math.max(0, gross - deduction401k - (gameState.insurance.health === "HDHP" ? gameState.budgetHSA : 0));
    
    // Income tax withholding calculation
    const taxResults = calculateTaxes(taxableGross * 12, gameState.profile.filingStatus);
    const monthlyTax = taxResults.federalTax / 12;
    
    // Net Income (Take Home)
    const takeHome = gross - deduction401k - monthlyTax - (gameState.insurance.health === "HDHP" ? gameState.budgetHSA : 0);
    
    // Fixed expenses
    let fixedExpenses = 0;
    if (gameState.primaryHome) {
        // Mortgage payment rough estimate 6% annual rate
        const pAndI = (gameState.primaryHome.mortgage * 0.006);
        fixedExpenses += pAndI + 200 + 150; // Principal + Interest + Tax + Ins
    } else {
        fixedExpenses += gameState.profile.rent;
    }
    
    // Kid cost
    if (gameState.profile.hasKids) {
        fixedExpenses += 800; // child care
    }
    
    // Insurance
    if (gameState.insurance.health === "PPO") fixedExpenses += 150;
    else fixedExpenses += 80;
    
    if (gameState.insurance.life === "Term") fixedExpenses += 40;
    else if (gameState.insurance.life === "Whole") fixedExpenses += 250;
    
    // Debts minimums
    let minDebt = 0;
    if (gameState.studentLoan > 0) minDebt += 250;
    if (gameState.autoLoan > 0) minDebt += 350;
    if (gameState.creditCardDebt > 0) minDebt += Math.max(25, Math.round(gameState.creditCardDebt * 0.025));
    
    // Discretionary spending
    const discSpending = gameState.budgetFun + gameState.budgetGroceries + gameState.budgetUtilities;
    
    // Post-tax savings (Roth IRA)
    const rothSaving = gameState.budgetRothIRA;
    
    // Net Monthly Cashflow
    const surplus = takeHome - fixedExpenses - minDebt - discSpending - rothSaving;
    
    // Render onto elements
    document.getElementById("gross-income-lbl").textContent = `$${Math.round(gross).toLocaleString()}`;
    document.getElementById("tax-withheld-lbl").textContent = `$${Math.round(monthlyTax).toLocaleString()}`;
    document.getElementById("fixed-bills-lbl").textContent = `$${Math.round(fixedExpenses).toLocaleString()}`;
    document.getElementById("min-debt-lbl").textContent = `$${Math.round(minDebt).toLocaleString()}`;
    document.getElementById("discretionary-lbl").textContent = `$${Math.round(discSpending).toLocaleString()}`;
    
    const surplusEl = document.getElementById("net-surplus-lbl");
    surplusEl.textContent = `$${Math.round(surplus).toLocaleString()}`;
    if (surplus >= 0) {
        surplusEl.style.color = "var(--accent-emerald)";
    } else {
        surplusEl.style.color = "var(--accent-rose)";
    }
    
    // Pre-populate budget allocations display
    document.getElementById("match-status").textContent = 
        gameState.budget401kPercent >= 4 ? "✅ Full Match Captured (4%)" : "⚠️ Missing employer free match (Contribute >= 4%)";
}

// Realistic IRS federal tax calculations
function calculateTaxes(annualIncome, status) {
    // Deductions
    const stdDeduction = status === "Married" ? 29200 : 14600;
    const taxable = Math.max(0, annualIncome - stdDeduction);
    
    // Simplified 2026 tax brackets
    let brackets = [];
    if (status === "Single") {
        brackets = [
            { limit: 11600, rate: 0.10 },
            { limit: 47150, rate: 0.12 },
            { limit: 100525, rate: 0.22 },
            { limit: 191950, rate: 0.24 },
            { limit: 243725, rate: 0.32 },
            { limit: 609350, rate: 0.35 },
            { limit: Infinity, rate: 0.37 }
        ];
    } else { // Married Filing Jointly
        brackets = [
            { limit: 23200, rate: 0.10 },
            { limit: 94300, rate: 0.12 },
            { limit: 201050, rate: 0.22 },
            { limit: 383900, rate: 0.24 },
            { limit: 487450, rate: 0.32 },
            { limit: 731200, rate: 0.35 },
            { limit: Infinity, rate: 0.37 }
        ];
    }
    
    let tax = 0;
    let prevLimit = 0;
    for (let b of brackets) {
        if (taxable > b.limit) {
            tax += (b.limit - prevLimit) * b.rate;
            prevLimit = b.limit;
        } else {
            tax += (taxable - prevLimit) * b.rate;
            break;
        }
    }
    
    return {
        federalTax: tax,
        taxableIncome: taxable,
        stdDeduction
    };
}

// General function to append events in a visual log
function logEvent(sender, message, type = "info") {
    const list = document.getElementById("events-log-list");
    if (!list) return;
    
    const item = document.createElement("div");
    item.className = `game-alert ${type}`;
    item.innerHTML = `<strong>[${sender}]</strong> ${message}`;
    
    list.prepend(item);
    
    // Limit to 6 items
    while (list.children.length > 6) {
        list.removeChild(list.lastChild);
    }
}

// Redraw / Update all screen values
function updateUI() {
    if (!gameState.profile) return;
    
    gameState.netWorth = calculateNetWorth();
    
    // Core Overview Meters
    document.getElementById("val-cash").textContent = `$${Math.round(gameState.cash).toLocaleString()}`;
    document.getElementById("val-networth").textContent = `$${Math.round(gameState.netWorth).toLocaleString()}`;
    document.getElementById("val-credit").textContent = gameState.creditScore;
    document.getElementById("val-happiness").textContent = `${gameState.happiness}%`;
    
    // Happiness meter color
    const happyCard = document.querySelector(".metric-card.happiness");
    if (gameState.happiness < 40) {
        happyCard.style.borderColor = "var(--accent-rose)";
    } else {
        happyCard.style.borderColor = "var(--card-border)";
    }
    
    // Monthly turn counter
    const years = Math.floor((gameState.month - 1) / 12);
    const months = (gameState.month - 1) % 12;
    document.getElementById("game-timeline").textContent = `Timeline: Year ${years}, Month ${months + 1}`;
    document.getElementById("energy-val").textContent = `${gameState.energy}/100`;
    
    // Goal & FI Progression calculation
    const annualExpenses = getAnnualExpenses();
    const fiNumber = annualExpenses * 25;
    document.getElementById("fi-goal-amt").textContent = `$${Math.round(fiNumber).toLocaleString()}`;
    
    const pctFI = Math.min(100, Math.max(0, Math.round((gameState.netWorth / fiNumber) * 100)));
    document.getElementById("fi-pct-lbl").textContent = `${pctFI}%`;
    document.getElementById("fi-progress-bar").style.width = `${pctFI}%`;
    
    // Investments Assets display
    document.getElementById("val-stocks").textContent = `$${Math.round(gameState.stocks).toLocaleString()}`;
    document.getElementById("val-crypto").textContent = `$${Math.round(gameState.crypto).toLocaleString()}`;
    document.getElementById("val-401k").textContent = `$${Math.round(gameState.retirement401k).toLocaleString()}`;
    document.getElementById("val-roth").textContent = `$${Math.round(gameState.retirementRothIRA).toLocaleString()}`;
    document.getElementById("val-hsa").textContent = `$${Math.round(gameState.hsa).toLocaleString()}`;
    
    // Debts display
    document.getElementById("val-debt-student").textContent = `$${Math.round(gameState.studentLoan).toLocaleString()}`;
    document.getElementById("val-debt-cc").textContent = `$${Math.round(gameState.creditCardDebt).toLocaleString()}`;
    document.getElementById("val-debt-auto").textContent = `$${Math.round(gameState.autoLoan).toLocaleString()}`;
    
    // Career display info
    document.getElementById("career-title-lbl").textContent = `${gameState.profile.career} (Level ${gameState.careerLevel})`;
    document.getElementById("career-salary-lbl").textContent = `$${gameState.monthlySalary.toLocaleString()}/mo`;
    
    if (gameState.trainingMonthsRemaining > 0) {
        document.getElementById("training-status").textContent = `Professional course in progress: ${gameState.trainingMonthsRemaining} months remaining.`;
        document.getElementById("training-btn").disabled = true;
    } else {
        document.getElementById("training-status").textContent = "Available Course: Advanced Professional Certification ($1,200).";
        document.getElementById("training-btn").disabled = false;
    }
    
    // Real estate values
    if (gameState.primaryHome) {
        document.getElementById("house-status-lbl").textContent = `Own Primary Home ($${gameState.primaryHome.value.toLocaleString()})`;
        document.getElementById("house-mortgage-lbl").textContent = `Mortgage Remaining: $${gameState.primaryHome.mortgage.toLocaleString()}`;
        document.getElementById("buy-home-btn").style.display = "none";
    } else {
        document.getElementById("house-status-lbl").textContent = "Renting";
        document.getElementById("house-mortgage-lbl").textContent = "No mortgage liabilities";
        document.getElementById("buy-home-btn").style.display = "inline-block";
    }
    
    // Side Hustle values
    if (gameState.hustleActive) {
        document.getElementById("hustle-status-lbl").textContent = `Active Gig: ${gameState.hustleActive.toUpperCase()}`;
        document.getElementById("start-hustle-btn").textContent = "Cancel Side Hustle";
    } else {
        document.getElementById("hustle-status-lbl").textContent = "None";
        document.getElementById("start-hustle-btn").textContent = "Start Rideshare Hustle";
    }
    
    // Health Insurance Selection
    document.getElementById("health-ins-type").value = gameState.insurance.health;
    document.getElementById("life-ins-type").value = gameState.insurance.life;
    
    // Achievements render
    renderAchievements();
    
    // Budget summary labels update
    updateBudgetSummary();
    
    // Redraw SVG Chart
    drawNetWorthChart();
    
    // Check win/lose
    checkGameConditions(fiNumber);
}

// Render achievement pills
function renderAchievements() {
    const grid = document.getElementById("achievements-grid");
    grid.innerHTML = "";
    ACHIEVEMENTS.forEach(ach => {
        const hasIt = gameState.unlockedAchievements.includes(ach.id);
        const pill = document.createElement("div");
        pill.className = `achievement-pill ${hasIt ? 'unlocked' : ''}`;
        pill.innerHTML = `
            <div class="achievement-emoji">${ach.emoji}</div>
            <div><strong>${ach.name}</strong></div>
        `;
        pill.title = ach.desc;
        grid.appendChild(pill);
    });
}

// Check achievements requirements
function checkAchievements() {
    if (gameState.studentLoan <= 0 && gameState.creditCardDebt <= 0 && gameState.autoLoan <= 0 && !gameState.unlockedAchievements.includes("debt_free")) {
        unlockAchievement("debt_free");
    }
    
    const expenses = getAnnualExpenses() / 12;
    if (gameState.cash >= expenses * 6 && !gameState.unlockedAchievements.includes("six_month_reserve")) {
        unlockAchievement("six_month_reserve");
    }
    
    if (gameState.budget401kPercent >= 4 && !gameState.unlockedAchievements.includes("free_match")) {
        unlockAchievement("free_match");
    }
    
    if ((gameState.primaryHome || gameState.investmentsProperties.length > 0) && !gameState.unlockedAchievements.includes("homeowner")) {
        unlockAchievement("homeowner");
    }
    
    if (gameState.netWorth >= 100000 && !gameState.unlockedAchievements.includes("six_figure_club")) {
        unlockAchievement("six_figure_club");
    }
}

function unlockAchievement(id) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;
    
    gameState.unlockedAchievements.push(id);
    logEvent("Achievement Unlocked", `${ach.emoji} ${ach.name}: ${ach.desc}`, "warning");
}

// Setup custom interaction buttons
function setupCustomButtons() {
    // Strategy snowball / avalanche toggle
    document.getElementById("btn-strat-avalanche").addEventListener("click", () => {
        gameState.debtStrategy = "avalanche";
        document.getElementById("btn-strat-avalanche").className = "btn-sm btn-cyan";
        document.getElementById("btn-strat-snowball").className = "btn-sm btn-outline";
    });
    
    document.getElementById("btn-strat-snowball").addEventListener("click", () => {
        gameState.debtStrategy = "snowball";
        document.getElementById("btn-strat-avalanche").className = "btn-sm btn-outline";
        document.getElementById("btn-strat-snowball").className = "btn-sm btn-cyan";
    });
    
    // Career Training
    document.getElementById("training-btn").addEventListener("click", () => {
        if (gameState.cash >= 1200) {
            gameState.cash -= 1200;
            gameState.trainingMonthsRemaining = 6;
            logEvent("Career", "Enrolled in Advanced Professional Certification for $1,200. Progress increases each month.", "info");
            updateUI();
        } else {
            logEvent("Career", "Insufficient cash to buy course! Need $1,200.", "warning");
        }
    });
    
    // Auto Loan Refinancing / Overpayment
    document.getElementById("pay-extra-debt-btn").addEventListener("click", () => {
        const amt = parseInt(document.getElementById("extra-debt-amount").value) || 0;
        if (amt <= 0) return;
        
        if (gameState.cash < amt) {
            logEvent("Debt", "Insufficient cash for extra payments!", "warning");
            return;
        }
        
        gameState.cash -= amt;
        applyExtraPayment(amt);
        updateUI();
    });
    
    // Buy Stock
    document.getElementById("buy-stock-btn").addEventListener("click", () => {
        const amt = parseInt(document.getElementById("trade-amount").value) || 0;
        if (amt > 0 && gameState.cash >= amt) {
            gameState.cash -= amt;
            gameState.stocks += amt;
            logEvent("Investing", `Purchased $${amt.toLocaleString()} worth of S&P 500 stocks.`, "info");
            updateUI();
        } else {
            logEvent("Investing", "Insufficient cash to buy stocks!", "warning");
        }
    });
    
    // Buy Crypto
    document.getElementById("buy-crypto-btn").addEventListener("click", () => {
        const amt = parseInt(document.getElementById("trade-amount").value) || 0;
        if (amt > 0 && gameState.cash >= amt) {
            gameState.cash -= amt;
            gameState.crypto += amt;
            logEvent("Speculative", `Purchased $${amt.toLocaleString()} worth of highly volatile Crypto tokens.`, "warning");
            updateUI();
        } else {
            logEvent("Speculative", "Insufficient cash to buy crypto!", "warning");
        }
    });
    
    // Start side hustle
    document.getElementById("start-hustle-btn").addEventListener("click", () => {
        if (gameState.hustleActive) {
            logEvent("Gig Work", `Canceled side hustle to save mental energy.`, "info");
            gameState.hustleActive = null;
        } else {
            gameState.hustleActive = "rideshare";
            logEvent("Gig Work", "Started rideshare side hustle. Earns $400/mo but costs 20 energy/mo.", "info");
        }
        updateUI();
    });
    
    // Buy Primary Home
    document.getElementById("buy-home-btn").addEventListener("click", () => {
        const price = 250000;
        const downPayment = 15000; // 6% down
        if (gameState.cash >= downPayment) {
            gameState.cash -= downPayment;
            gameState.primaryHome = {
                value: price,
                mortgage: price - downPayment,
                interestRate: gameState.creditScore > 720 ? 0.055 : 0.07 // Credit score determines rate
            };
            logEvent("Real Estate", `Purchased a primary family home for $${price.toLocaleString()} using 6% down payment! Mortgage rate: ${(gameState.primaryHome.interestRate * 100).toFixed(1)}%.`, "info");
            updateUI();
        } else {
            logEvent("Real Estate", `Need at least $${downPayment.toLocaleString()} cash down payment to purchase a home.`, "warning");
        }
    });
    
    // Health Insurance changes
    document.getElementById("health-ins-type").addEventListener("change", (e) => {
        gameState.insurance.health = e.target.value;
        if (gameState.insurance.health === "PPO") {
            gameState.budgetHSA = 0;
            document.getElementById("hsa-amount").disabled = true;
            document.getElementById("hsa-amount").value = 0;
        } else {
            document.getElementById("hsa-amount").disabled = false;
        }
        updateUI();
    });
    
    document.getElementById("life-ins-type").addEventListener("change", (e) => {
        gameState.insurance.life = e.target.value;
        updateUI();
    });
    
    // Charitable gift
    document.getElementById("donate-btn").addEventListener("click", () => {
        if (gameState.cash >= 500) {
            gameState.cash -= 500;
            gameState.happiness = Math.min(100, gameState.happiness + 12);
            logEvent("Charity", "Donated $500 to community charity. Happiness boosted and income deductions applied next filing!", "info");
            updateUI();
        } else {
            logEvent("Charity", "Insufficient cash to donate $500.", "warning");
        }
    });
    
    // Reset Game button
    document.getElementById("restart-game-btn").addEventListener("click", () => {
        document.getElementById("profile-overlay").style.display = "flex";
        document.getElementById("win-screen").style.display = "none";
        document.getElementById("lose-screen").style.display = "none";
    });
    document.getElementById("restart-game-btn2").addEventListener("click", () => {
        document.getElementById("profile-overlay").style.display = "flex";
        document.getElementById("win-screen").style.display = "none";
        document.getElementById("lose-screen").style.display = "none";
    });
}

// Apply extra debt payment according to Snowball / Avalanche
function applyExtraPayment(amount) {
    let debtOrder = [];
    if (gameState.debtStrategy === "avalanche") {
        // Higher interest rates first
        debtOrder = [
            { key: "creditCardDebt", rate: gameState.profile.debtInterest.cc },
            { key: "studentLoan", rate: gameState.profile.debtInterest.student },
            { key: "autoLoan", rate: gameState.profile.debtInterest.auto }
        ].sort((a, b) => b.rate - a.rate);
    } else {
        // Smallest balances first
        debtOrder = [
            { key: "creditCardDebt", val: gameState.creditCardDebt },
            { key: "studentLoan", val: gameState.studentLoan },
            { key: "autoLoan", val: gameState.autoLoan }
        ].filter(d => d.val > 0).sort((a, b) => a.val - b.val);
    }
    
    let remaining = amount;
    for (let d of debtOrder) {
        if (remaining <= 0) break;
        const currentBal = gameState[d.key];
        if (currentBal > 0) {
            const pay = Math.min(remaining, currentBal);
            gameState[d.key] -= pay;
            remaining -= pay;
            logEvent("Debt Payoff", `Made an extra payment of $${Math.round(pay).toLocaleString()} to ${d.key.replace("Debt", "")}`, "info");
        }
    }
    
    if (remaining > 0) {
        gameState.cash += remaining; // refund
    }
}

// Advance Month - Heart of the simulation
function advanceMonth() {
    if (!gameState.profile) return;
    
    gameState.month += 1;
    gameState.energy = 100; // Reset monthly energy
    
    // 1. Economic cycles (random chance of shifting cycles every 12 months)
    if (gameState.month % 12 === 0) {
        const rand = Math.random();
        if (rand < 0.15) {
            gameState.economicCycle = "Bear Market";
            logEvent("Economy", "A sudden recession hits! Stock values are falling. Goods costs stay high.", "warning");
        } else if (rand < 0.3) {
            gameState.economicCycle = "Bull Market";
            logEvent("Economy", "Economic expansion! Stock markets are thriving.", "info");
        } else if (rand < 0.4) {
            gameState.economicCycle = "High Inflation";
            logEvent("Economy", "High inflation spikes! Cost of living and rent increase slightly.", "warning");
        } else {
            gameState.economicCycle = "Normal";
            logEvent("Economy", "Economy remains stable and balanced.", "info");
        }
    }
    
    // 2. Careers & Job training progress
    if (gameState.trainingMonthsRemaining > 0) {
        gameState.trainingMonthsRemaining--;
        if (gameState.trainingMonthsRemaining === 0) {
            gameState.careerLevel++;
            gameState.monthlySalary = Math.round(gameState.monthlySalary * 1.25);
            logEvent("Career", `Certification Completed! Promoted to Level ${gameState.careerLevel} and got a 25% salary bump!`, "info");
        }
    }
    
    // 3. Side hustle income
    let hustleCash = 0;
    if (gameState.hustleActive === "rideshare") {
        hustleCash = 400;
        gameState.energy -= 20;
    }
    
    // 4. Inflow / Outflow calculation (re-evaluating current parameters)
    const gross = gameState.monthlySalary;
    const deduction401k = gross * (gameState.budget401kPercent / 100);
    const taxableGross = Math.max(0, gross - deduction401k - (gameState.insurance.health === "HDHP" ? gameState.budgetHSA : 0));
    const taxResults = calculateTaxes(taxableGross * 12, gameState.profile.filingStatus);
    const monthlyTax = taxResults.federalTax / 12;
    const takeHome = gross - deduction401k - monthlyTax - (gameState.insurance.health === "HDHP" ? gameState.budgetHSA : 0);
    
    // Fixed living costs
    let fixedLiving = 0;
    if (gameState.primaryHome) {
        // Mortgage payment
        const pAndI = (gameState.primaryHome.mortgage * 0.006);
        fixedLiving += pAndI + 200 + 150;
        // Mortgage amortization: deduct principal paid from mortgage
        const principalPaid = pAndI * 0.35; // Rough principal portion
        gameState.primaryHome.mortgage = Math.max(0, gameState.primaryHome.mortgage - principalPaid);
    } else {
        fixedLiving += gameState.profile.rent;
        // Inflation effect on rent
        if (gameState.economicCycle === "High Inflation") {
            fixedLiving *= 1.002; // monthly increase
        }
    }
    
    if (gameState.profile.hasKids) {
        fixedLiving += 800; // childcare
    }
    
    // Auto Insurance & health insurance
    if (gameState.insurance.health === "PPO") fixedLiving += 150;
    else fixedLiving += 80;
    if (gameState.insurance.life === "Term") fixedLiving += 40;
    else if (gameState.insurance.life === "Whole") fixedLiving += 250;
    
    // Debts minimums
    let minDebtTotal = 0;
    
    // CC Debt
    if (gameState.creditCardDebt > 0) {
        const ccMin = Math.max(25, Math.round(gameState.creditCardDebt * 0.025));
        minDebtTotal += ccMin;
        gameState.creditCardDebt = Math.max(0, gameState.creditCardDebt - ccMin);
        // CC Interest accruing
        gameState.creditCardDebt += (gameState.creditCardDebt * (gameState.profile.debtInterest.cc / 12));
    }
    // Student loan
    if (gameState.studentLoan > 0) {
        const studMin = Math.min(gameState.studentLoan, 250);
        minDebtTotal += studMin;
        gameState.studentLoan = Math.max(0, gameState.studentLoan - studMin);
        gameState.studentLoan += (gameState.studentLoan * (gameState.profile.debtInterest.student / 12));
    }
    // Auto Loan
    if (gameState.autoLoan > 0) {
        const autoMin = Math.min(gameState.autoLoan, 350);
        minDebtTotal += autoMin;
        gameState.autoLoan = Math.max(0, gameState.autoLoan - autoMin);
        gameState.autoLoan += (gameState.autoLoan * (gameState.profile.debtInterest.auto / 12));
    }
    
    // Discretionary
    const discSpending = gameState.budgetFun + gameState.budgetGroceries + gameState.budgetUtilities;
    
    // Save to accounts
    gameState.retirement401k += deduction401k;
    // Employer Match: match dollar-for-dollar up to 4%
    if (gameState.budget401kPercent >= 4) {
        gameState.retirement401k += (gross * 0.04);
    } else {
        gameState.retirement401k += (gross * (gameState.budget401kPercent / 100));
    }
    
    if (gameState.insurance.health === "HDHP") {
        gameState.hsa += gameState.budgetHSA;
    }
    
    gameState.retirementRothIRA += gameState.budgetRothIRA;
    
    // Compute Monthly Cashflow Surplus
    const surplus = takeHome + hustleCash - fixedLiving - minDebtTotal - discSpending - gameState.budgetRothIRA;
    gameState.cash += surplus;
    
    // 5. Account Interests updates
    // HYSA cash interest
    gameState.cash += (gameState.cash * (0.042 / 12));
    
    // Stock growth simulation
    let stockReturnRate = 0.0067; // approx 8% annual
    if (gameState.economicCycle === "Bull Market") {
        stockReturnRate = 0.015;
    } else if (gameState.economicCycle === "Bear Market") {
        stockReturnRate = -0.02;
    }
    // Random fluctuation
    stockReturnRate += (Math.random() - 0.5) * 0.04;
    gameState.stocks += (gameState.stocks * stockReturnRate);
    
    // Crypto growth simulation (Extreme volatility)
    let cryptoReturnRate = (Math.random() - 0.5) * 0.25; // -12% to +12% monthly swing
    gameState.crypto += (gameState.crypto * cryptoReturnRate);
    if (gameState.crypto < 0) gameState.crypto = 0;
    
    // Home values appreciation
    if (gameState.primaryHome) {
        gameState.primaryHome.value += (gameState.primaryHome.value * (0.035 / 12));
    }
    
    // 6. Happiness calculation: affected by fun budget, debts, and life stress
    let happyChange = 0;
    if (gameState.budgetFun < 150) happyChange -= 5;
    else if (gameState.budgetFun > 500) happyChange += 3;
    
    if (gameState.creditCardDebt > 5000) happyChange -= 3;
    if (gameState.cash < 1000) happyChange -= 4; // stress
    
    gameState.happiness = Math.max(0, Math.min(100, gameState.happiness + happyChange));
    
    // 7. Credit Score updates: positive on no CC debt, negative on high CC debt
    let creditChange = 0;
    if (gameState.creditCardDebt === 0) creditChange += 5;
    else if (gameState.creditCardDebt > 8000) creditChange -= 8;
    
    if (gameState.month % 6 === 0) {
        // Normal positive history over time
        creditChange += 3;
    }
    gameState.creditScore = Math.max(300, Math.min(850, gameState.creditScore + creditChange));
    
    // 8. Life Random Events
    triggerRandomEvent();
    
    // Check achievements
    checkAchievements();
    
    // Save Net Worth History
    gameState.netWorth = calculateNetWorth();
    gameState.netWorthHistory.push(gameState.netWorth);
    if (gameState.netWorthHistory.length > 24) {
        // limit history elements visual index
    }
    
    updateUI();
}

// Random life events generator
function triggerRandomEvent() {
    // 15% chance of trigger
    if (Math.random() > 0.15) return;
    
    const events = [
        {
            title: "Emergency Medical Bill",
            emoji: "🏥",
            description: "An unexpected medical emergency occurred. You need to pay the medical bill.",
            hdhpAction: (val) => {
                const cost = Math.min(val.hsa, 1500); // HSA shields it
                val.hsa -= cost;
                const rem = 3000 - cost;
                val.cash -= rem;
                return `Deducted $${cost} from HSA and $${rem} from cash.`;
            },
            ppoAction: (val) => {
                val.cash -= 500; // Copay only
                return `PPO insurance covers most of it. You pay $500 copay.`;
            },
            trigger: () => {
                if (gameState.insurance.health === "HDHP") {
                    const desc = events[0].hdhpAction(gameState);
                    showEventModal("Emergency Medical Bill 🏥", `You had a hospital visit. ${desc}`, "Understood");
                } else {
                    const desc = events[0].ppoAction(gameState);
                    showEventModal("Emergency Medical Bill 🏥", `You had a hospital visit. ${desc}`, "Understood");
                }
            }
        },
        {
            title: "Car Engine Breakdown",
            emoji: "🚗",
            description: "Your car broke down and requires major repair to get to work.",
            trigger: () => {
                gameState.cash -= 1200;
                showEventModal("Car Repairs 🚗", "The alternator failed! You paid $1,200 to get it running.", "Darn!");
            }
        },
        {
            title: "Annual Bonus!",
            emoji: "💵",
            description: "You performed excellently at work this year and got an unexpected performance bonus.",
            trigger: () => {
                const bonus = Math.round(gameState.monthlySalary * 0.8);
                gameState.cash += bonus;
                gameState.happiness = Math.min(100, gameState.happiness + 10);
                showEventModal("Performance Bonus 💵", `Congrats! Your work performance rewarded you with a cash bonus of $${bonus.toLocaleString()}!`, "Fantastic!");
            }
        },
        {
            title: "Appliance Leak",
            emoji: "🚰",
            description: "The dishwasher leaked and damaged the kitchen floors.",
            trigger: () => {
                if (gameState.primaryHome) {
                    gameState.cash -= 2000;
                    showEventModal("Kitchen Leak 🚰", "Water damaged the hardwood floor. Cost to repair: $2,000.", "Repair it");
                } else {
                    showEventModal("Kitchen Leak 🚰", "Your rental dishwasher leaked. Landlord repaired it at no cost to you!", "Phew!");
                }
            }
        },
        {
            title: "Tax Refund Time",
            emoji: "📝",
            description: "You filed your annual taxes and received a refund.",
            trigger: () => {
                const refund = 1500 + Math.round(Math.random() * 800);
                gameState.cash += refund;
                showEventModal("IRS Tax Refund 📝", `Your filed return gave you a tax refund of $${refund.toLocaleString()}!`, "Save it");
            }
        }
    ];
    
    // Run a random event
    const pick = events[Math.floor(Math.random() * events.length)];
    pick.trigger();
}

function showEventModal(title, text, btnLabel) {
    const overlay = document.getElementById("event-modal-overlay");
    overlay.className = "event-modal";
    overlay.innerHTML = `
        <div class="event-modal-content">
            <div class="event-emoji">⚡</div>
            <div class="event-title">${title}</div>
            <div class="event-description">${text}</div>
            <button class="btn btn-cyan">${btnLabel}</button>
        </div>
    `;
    overlay.querySelector("button").addEventListener("click", () => {
        overlay.className = "event-modal hidden";
        overlay.style.display = "none";
    });
    overlay.style.display = "flex";
}

// Check win/lose criteria
function checkGameConditions(fiNumber) {
    // Win Condition
    if (gameState.netWorth >= fiNumber) {
        document.getElementById("win-screen").style.display = "flex";
        document.getElementById("win-nw").textContent = `$${Math.round(gameState.netWorth).toLocaleString()}`;
        document.getElementById("win-timeline").textContent = `Achieved in ${Math.floor(gameState.month / 12)} years, ${gameState.month % 12} months.`;
    }
    
    // Bankruptcy Lose Condition
    if (gameState.cash < 0) {
        document.getElementById("lose-screen").style.display = "flex";
        gameState.cash = 1000;
        gameState.creditScore = 350;
        gameState.creditCardDebt = 0;
        gameState.studentLoan = Math.round(gameState.studentLoan * 1.5); // penalty structure
        gameState.autoLoan = 0;
        gameState.primaryHome = null;
    }
}

// Drawing custom Net Worth chart using SVG paths
function drawNetWorthChart() {
    const svg = document.getElementById("nw-chart-svg");
    if (!svg) return;
    
    const history = gameState.netWorthHistory;
    const padding = 15;
    const w = svg.clientWidth || 350;
    const h = svg.clientHeight || 180;
    
    // Find min and max values
    let minVal = Math.min(...history);
    let maxVal = Math.max(...history);
    
    // Avoid flat chart line
    if (minVal === maxVal) {
        minVal -= 1000;
        maxVal += 1000;
    }
    
    const count = history.length;
    
    // Draw grid lines
    let gridHtml = "";
    for (let i = 1; i <= 3; i++) {
        const y = padding + ((h - padding * 2) * i) / 4;
        gridHtml += `<line class="chart-grid" x1="0" y1="${y}" x2="${w}" y2="${y}" />`;
    }
    
    // Map points to SVG coordinates
    const points = history.map((val, index) => {
        const x = padding + ((w - padding * 2) * index) / Math.max(1, count - 1);
        const y = h - padding - ((val - minVal) / (maxVal - minVal)) * (h - padding * 2);
        return { x, y };
    });
    
    let pathD = `M ${points[0].x} ${points[0].y}`;
    let areaD = `M ${points[0].x} ${h - padding} L ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
        areaD += ` L ${points[i].x} ${points[i].y}`;
    }
    
    areaD += ` L ${points[points.length - 1].x} ${h - padding} Z`;
    
    const lineElement = `<path class="chart-line" d="${pathD}" />`;
    const areaElement = `<path class="chart-area" d="${areaD}" />`;
    
    svg.innerHTML = `
        <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent-cyan)" stop-opacity="0.4" />
                <stop offset="100%" stop-color="var(--accent-cyan)" stop-opacity="0.0" />
            </linearGradient>
        </defs>
        ${gridHtml}
        ${areaElement}
        ${lineElement}
    `;
}
