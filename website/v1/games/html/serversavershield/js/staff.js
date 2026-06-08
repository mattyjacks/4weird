// Staff Management
function hireStaff(type) {
    const staffType = STAFF_TYPES[type];
    if (!staffType) return false;
    if (gameState.balance < staffType.hireCost) return false;
    gameState.balance -= staffType.hireCost;
    staff.push({ type, ...staffType });
    return true;
}

function fireStaff(index) {
    if (index >= 0 && index < staff.length) {
        staff.splice(index, 1);
        return true;
    }
    return false;
}

function updateStaff() {
    if (staff.some(s => s.type === 'pr')) gameState.reputation = Math.min(100, gameState.reputation + 2 / 60);
    if (staff.some(s => s.type === 'trainer')) gameState.customerTrust = Math.min(100, gameState.customerTrust + 1 / 60);
    
    let totalSalary = 0;
    staff.forEach(s => { totalSalary += s.salarySec; });
    gameState.balance -= totalSalary / 60;
}

function getStaffArray() {
    return staff;
}

function hasStaffType(type) {
    return staff.some(s => s.type === type);
}

function clearStaff() {
    staff = [];
}
