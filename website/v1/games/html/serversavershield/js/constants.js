// Game Constants - Orientation Aware
// Desktop: Horizontal (landscape), Mobile: Vertical (portrait)
const IS_MOBILE = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
const CANVAS_WIDTH = IS_MOBILE ? 400 : 800;
const CANVAS_HEIGHT = IS_MOBILE ? 700 : 600;

const WEAPONS = {
    standard: { name: 'Standard', emoji: '🔵', fireRate: 8, bulletCount: 1, spread: 0, speed: 8, radius: 6, color: '#fbbf24', damage: 1 },
    spreadshot: { name: 'Spreadshot', emoji: '🔶', fireRate: 10, bulletCount: 5, spread: 0.6, speed: 6, radius: 5, color: '#f97316', damage: 0.8 },
    laser: { name: 'Laser', emoji: '🔴', fireRate: 4, bulletCount: 1, spread: 0, speed: 12, radius: 3, color: '#dc2626', damage: 2 },
    flamethrower: { name: 'Flamethrower', emoji: '🔥', fireRate: 2, bulletCount: 8, spread: 1.2, speed: 4, radius: 4, color: '#f59e0b', damage: 0.6 },
    sniper: { name: 'Sniper', emoji: '🎯', fireRate: 20, bulletCount: 1, spread: 0, speed: 15, radius: 2, color: '#10b981', damage: 3 },
    grenadelauncher: { name: 'Grenade Launcher', emoji: '💣', fireRate: 15, bulletCount: 1, spread: 0, speed: 5, radius: 8, color: '#8b5cf6', damage: 2.5 },
    machinegun: { name: 'Machine Gun', emoji: '🔫', fireRate: 2, bulletCount: 2, spread: 0.3, speed: 10, radius: 4, color: '#6b7280', damage: 1.2 },
    icebeam: { name: 'Ice Beam', emoji: '❄️', fireRate: 6, bulletCount: 3, spread: 0.4, speed: 7, radius: 5, color: '#06b6d4', damage: 1.5 },
    plasma: { name: 'Plasma Cannon', emoji: '⚡', fireRate: 5, bulletCount: 2, spread: 0.5, speed: 9, radius: 6, color: '#a78bfa', damage: 1.8 },
    railgun: { name: 'Railgun', emoji: '💫', fireRate: 12, bulletCount: 1, spread: 0, speed: 14, radius: 2, color: '#06b6d4', damage: 2.8 },
    shotgun: { name: 'Shotgun', emoji: '🔱', fireRate: 12, bulletCount: 7, spread: 0.8, speed: 8, radius: 4, color: '#ef4444', damage: 1.3 },
    burstfire: { name: 'Burst Fire', emoji: '💥', fireRate: 3, bulletCount: 3, spread: 0.2, speed: 10, radius: 5, color: '#f59e0b', damage: 1.4 },
    minigun: { name: 'Mini Gun', emoji: '⚙️', fireRate: 1, bulletCount: 4, spread: 0.7, speed: 8, radius: 3, color: '#6b7280', damage: 0.9 },
    photon: { name: 'Photon Blaster', emoji: '✨', fireRate: 7, bulletCount: 2, spread: 0.3, speed: 11, radius: 5, color: '#fbbf24', damage: 1.6 },
    vortex: { name: 'Vortex Cannon', emoji: '🌀', fireRate: 8, bulletCount: 6, spread: 1.0, speed: 6, radius: 4, color: '#8b5cf6', damage: 1.1 },
    inferno: { name: 'Inferno', emoji: '🌋', fireRate: 3, bulletCount: 10, spread: 1.5, speed: 5, radius: 3, color: '#dc2626', damage: 0.7 },
    frostbolt: { name: 'Frostbolt', emoji: '🧊', fireRate: 9, bulletCount: 2, spread: 0.2, speed: 9, radius: 4, color: '#0ea5e9', damage: 1.7 },
    thunderstrike: { name: 'Thunderstrike', emoji: '⚡', fireRate: 11, bulletCount: 3, spread: 0.4, speed: 10, radius: 5, color: '#eab308', damage: 1.5 },
    voidbeam: { name: 'Void Beam', emoji: '🌑', fireRate: 6, bulletCount: 1, spread: 0, speed: 13, radius: 4, color: '#1f2937', damage: 2.2 },
    starlight: { name: 'Starlight', emoji: '⭐', fireRate: 5, bulletCount: 4, spread: 0.5, speed: 8, radius: 5, color: '#fbbf24', damage: 1.3 }
};

const STAFF_TYPES = {
    firewall: { name: 'Firewall Tech', emoji: '🔥', hireCost: 200, salarySec: 5, ability: 'DDOS 15s->8s' },
    responder: { name: 'Incident Responder', emoji: '🚘', hireCost: 300, salarySec: 8, ability: 'Ransom -50%' },
    analyst: { name: 'SOC Analyst', emoji: '🔍', hireCost: 250, salarySec: 6, ability: 'Stealth detect' },
    pentester: { name: 'Pen Tester', emoji: '🤖', hireCost: 280, salarySec: 7, ability: 'Dmg +50%' },
    ciso: { name: 'CISO', emoji: '👨', hireCost: 400, salarySec: 12, ability: 'Trust protect' },
    pr: { name: 'PR Officer', emoji: '📢', hireCost: 350, salarySec: 9, ability: 'Reputation +2/s' },
    writer: { name: 'Article Writer', emoji: '✍️', hireCost: 280, salarySec: 7, ability: 'Social Eng -50%' },
    networkeng: { name: 'Network Engineer', emoji: '🔗', hireCost: 320, salarySec: 8, ability: 'Crypto -30%' },
    devops: { name: 'DevOps Engineer', emoji: '🚀', hireCost: 380, salarySec: 10, ability: 'Server +20HP' },
    architect: { name: 'Solutions Architect', emoji: '🏗️', hireCost: 450, salarySec: 14, ability: 'Income +15%' },
    compliance: { name: 'Compliance Officer', emoji: '⚖️', hireCost: 300, salarySec: 8, ability: 'Fraud -40%' },
    backup: { name: 'Backup Admin', emoji: '💾', hireCost: 220, salarySec: 6, ability: 'Recovery +2x' },
    monitor: { name: 'Monitoring Specialist', emoji: '📊', hireCost: 270, salarySec: 7, ability: 'Threat +5s warn' },
    trainer: { name: 'Security Trainer', emoji: '🎭', hireCost: 260, salarySec: 6, ability: 'Trust +1/s' },
    vendor: { name: 'Vendor Manager', emoji: '💱', hireCost: 290, salarySec: 7, ability: 'Cost -10%' },
    hr: { name: 'HR Manager', emoji: '👥', hireCost: 240, salarySec: 6, ability: 'Morale +5%' },
    legal: { name: 'Legal Counsel', emoji: '📋', hireCost: 500, salarySec: 15, ability: 'Ransom -70%' },
    // PRODUCT TEAM (7 NEW) - Revenue Generation
    programmer: { name: 'Programmer', emoji: '💻', hireCost: 350, salarySec: 9, ability: 'New customers +15%', category: 'product' },
    vibecoder: { name: 'Vibe Coder', emoji: '🌊', hireCost: 320, salarySec: 8, ability: 'Retention +10%, Morale +5%', category: 'product' },
    engineer: { name: 'Engineer', emoji: '⚙️', hireCost: 380, salarySec: 10, ability: 'New customers +15%, Server stability +10%', category: 'product' },
    qalead: { name: 'QA Lead', emoji: '🐞', hireCost: 300, salarySec: 8, ability: 'Bug chance -50%, Satisfaction +10%', category: 'product' },
    uxd: { name: 'UX Designer', emoji: '🎨', hireCost: 340, salarySec: 9, ability: 'New customers +20%', category: 'product' },
    pm: { name: 'Product Manager', emoji: '📊', hireCost: 400, salarySec: 11, ability: 'Revenue +15%, Customer focus', category: 'product' },
    techlead: { name: 'Tech Lead', emoji: '👑', hireCost: 450, salarySec: 12, ability: 'All product team effects +25%', category: 'product' }
};

const ENEMIES = {
    blackhat: { name: 'Black Hat', emoji: '🎩', hp: 1, speed: 2.5, score: 10, color: '#a855f7', radius: 18, behavior: 'direct', reputationDmg: 2, computeUsage: 50 },
    trojan: { name: 'Trojan Horse', emoji: '🐴', hp: 3, speed: 1.5, score: 50, color: '#f59e0b', radius: 24, behavior: 'stealth', reputationDmg: 3, computeUsage: 80 },
    pentester: { name: 'AI Pen Tester', emoji: '🤖', hp: 2, speed: 3.5, score: 30, color: '#06b6d4', radius: 16, behavior: 'evasive', reputationDmg: 1, computeUsage: 40 },
    agency: { name: 'Intelligence Agency', emoji: '🧠', hp: 4, speed: 2, score: 60, color: '#8b5cf6', radius: 22, behavior: 'strategic', reputationDmg: 4, computeUsage: 120 },
    ddos: { name: 'DDOS Attack', emoji: '🔥', hp: 5, speed: 1, score: 100, color: '#dc2626', radius: 30, behavior: 'direct', reputationDmg: 5, computeUsage: 200 },
    ransomware: { name: 'Ransomware', emoji: '🔒', hp: 4, speed: 1.2, score: 80, color: '#ec4899', radius: 26, behavior: 'stealth', reputationDmg: 6, computeUsage: 150 },
    fraudster: { name: 'Fraudster', emoji: '💰', hp: 2, speed: 2, score: 40, color: '#f97316', radius: 16, behavior: 'economic', reputationDmg: 7, computeUsage: 100 },
    socialeng: { name: 'Social Engineer', emoji: '🎭', hp: 1, speed: 2.8, score: 25, color: '#06b6d4', radius: 14, behavior: 'direct', reputationDmg: 8, computeUsage: 60 },
    cryptominer: { name: 'Cryptominer', emoji: '⛏️', hp: 3, speed: 1.8, score: 55, color: '#f59e0b', radius: 20, behavior: 'stealth', reputationDmg: 4, computeUsage: 180 }
};

const DIFFICULTY_MULTIPLIERS = {
    easy: { spawnRate: 0.7, playerDamage: 1.3 },
    hard: { spawnRate: 1.5, playerDamage: 0.8 }
};
