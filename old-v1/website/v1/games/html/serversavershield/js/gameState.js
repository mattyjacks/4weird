// Game State Management
var gameRunning = false;
var gamePaused = false;
var score = 0;
var wave = 1;
var kills = 0;
var maxCombo = 1;
var difficulty = 'easy';
var killHistory = [];

var gameState = {
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

var servers = [];
var staff = [];
var upgrades = { serverHPBoost: 0, rapidFire: 0, multiShot: 0, cdn: 0, firewall: 0, prCampaign: 0 };

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
