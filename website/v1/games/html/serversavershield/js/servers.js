// Server Management
function initServers() {
    servers = [];
    for (let i = 0; i < 5; i++) {
        servers.push({
            id: i,
            status: i === 0 ? 'ONLINE' : 'OFFLINE',
            hp: 100,
            maxHp: 100,
            incomePerSec: 10,
            customers: i === 0 ? 100 : 0,
            backupLinked: false,
            backupTarget: -1,
            ddosCountdown: 0,
            ransomAmount: 0,
            cryptoMinerDamage: 0,
            x: 100 + i * 140,
            y: 100
        });
    }
}

function updateServers() {
    servers.forEach(s => {
        if (s.ddosCountdown > 0) s.ddosCountdown--;
        if (s.ddosCountdown === 0 && s.status === 'DDOS_FROZEN') s.status = 'ONLINE';
        if (s.status === 'ONLINE') {
            const reputationMultiplier = 0.5 + (gameState.reputation / 100) * 0.5;
            gameState.balance += (s.incomePerSec * gameState.customerTrust / 100 * reputationMultiplier) / 60;
        }
    });
}

function getServersArray() {
    return servers;
}

function addServer() {
    if (servers.length < 5) {
        const newServer = {
            id: servers.length,
            status: 'OFFLINE',
            hp: 100,
            maxHp: 100,
            incomePerSec: 10,
            customers: 0,
            backupLinked: false,
            backupTarget: -1,
            ddosCountdown: 0,
            ransomAmount: 0,
            cryptoMinerDamage: 0,
            x: 100 + servers.length * 140,
            y: 100
        };
        servers.push(newServer);
        return true;
    }
    return false;
}
