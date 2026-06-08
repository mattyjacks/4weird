// Game State Management
let gameRunning = false;
let gamePaused = false;
let score = 0;
let wave = 1;
let kills = 0;
let maxCombo = 1;
let difficulty = 'easy';
let killHistory = [];

let gameState = {
    balance: 1000,
    incomePerSec: 10,
    customerTrust: 100,
    reputation: 50,
    serverCount: 1,
    bankruptcyTimer: 0,
    selectedServer: 0,
    fraudsterCount: 0,
    cryptominerCount: 0,
    totalComputeUsed: 0,
    maxComputeUsed: 0
};

let servers = [];
let staff = [];
let upgrades = { serverHPBoost: 0, rapidFire: 0, multiShot: 0, cdn: 0, firewall: 0, prCampaign: 0 };

function resetGameState() {
    gameRunning = false;
    gamePaused = false;
    score = 0;
    wave = 1;
    kills = 0;
    maxCombo = 1;
    killHistory = [];
    gameState = {
        balance: 1000,
        incomePerSec: 10,
        customerTrust: 100,
        reputation: 50,
        serverCount: 1,
        bankruptcyTimer: 0,
        selectedServer: 0,
        fraudsterCount: 0,
        cryptominerCount: 0,
        totalComputeUsed: 0,
        maxComputeUsed: 0
    };
    servers = [];
    staff = [];
    upgrades = { serverHPBoost: 0, rapidFire: 0, multiShot: 0, cdn: 0, firewall: 0, prCampaign: 0 };
}

function getGameState() {
    return gameState;
}

function getServers() {
    return servers;
}

function getStaff() {
    return staff;
}
