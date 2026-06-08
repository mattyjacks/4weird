// Tutorial Tooltip System - Fix #10: Add tutorial tooltips

var tutorialStep = 0;
var tutorialActive = false;
var tutorialTooltips = [];

const TUTORIAL_STEPS = [
    {
        element: '#gameCanvas',
        title: '🎮 Welcome!',
        text: 'Move your mouse to control the shield. Click to toggle firing.',
        position: 'bottom'
    },
    {
        element: '.hud',
        title: '💰 Your Stats',
        text: 'Watch your money, reputation, and customer trust. Earn money by defending servers!',
        position: 'right'
    },
    {
        element: '#btnEasy',
        title: '🎚️ Difficulty',
        text: 'Choose EASY for relaxed play or HARD for intense action!',
        position: 'top'
    },
    {
        element: '.controls-hint',
        title: '⌨️ Controls',
        text: 'Use WASD or Arrow keys to move. Press SPACE to toggle firing. P to pause.',
        position: 'top'
    }
];

function initTutorial() {
    // Check if user has seen tutorial before
    const hasSeenTutorial = localStorage.getItem('serversavershield_tutorial_seen');
    
    if (!hasSeenTutorial && !gameRunning) {
        setTimeout(() => {
            startTutorial();
        }, 1000);
    }
}

function startTutorial() {
    tutorialActive = true;
    tutorialStep = 0;
    showTooltip(tutorialStep);
}

function showTooltip(stepIndex) {
    // Remove existing tooltips
    document.querySelectorAll('.tutorial-tooltip').forEach(t => t.remove());
    
    if (stepIndex >= TUTORIAL_STEPS.length) {
        endTutorial();
        return;
    }
    
    const step = TUTORIAL_STEPS[stepIndex];
    const target = document.querySelector(step.element);
    
    if (!target) {
        // Skip to next if element not found
        showTooltip(stepIndex + 1);
        return;
    }
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tutorial-tooltip';
    tooltip.innerHTML = `
        <div class="tutorial-header">
            <span class="tutorial-title">${step.title}</span>
            <button class="tutorial-close" onclick="skipTutorial()">×</button>
        </div>
        <div class="tutorial-content">${step.text}</div>
        <div class="tutorial-footer">
            <span class="tutorial-progress">${stepIndex + 1}/${TUTORIAL_STEPS.length}</span>
            <button class="tutorial-next" onclick="nextTutorialStep()">
                ${stepIndex === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next →'}
            </button>
        </div>
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    positionTooltip(tooltip, target, step.position);
    
    // Highlight target element
    target.style.position = 'relative';
    target.style.zIndex = '10000';
    target.classList.add('tutorial-highlight');
}

function positionTooltip(tooltip, target, position) {
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top, left;
    
    switch (position) {
        case 'top':
            top = rect.top - tooltipRect.height - 10;
            left = rect.left + (rect.width - tooltipRect.width) / 2;
            break;
        case 'bottom':
            top = rect.bottom + 10;
            left = rect.left + (rect.width - tooltipRect.width) / 2;
            break;
        case 'left':
            top = rect.top + (rect.height - tooltipRect.height) / 2;
            left = rect.left - tooltipRect.width - 10;
            break;
        case 'right':
            top = rect.top + (rect.height - tooltipRect.height) / 2;
            left = rect.right + 10;
            break;
        default:
            top = rect.bottom + 10;
            left = rect.left;
    }
    
    // Ensure tooltip stays on screen
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
    
    tooltip.style.position = 'fixed';
    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
    tooltip.style.zIndex = '10001';
}

function nextTutorialStep() {
    // Remove highlight from current element
    const currentStep = TUTORIAL_STEPS[tutorialStep];
    const target = document.querySelector(currentStep.element);
    if (target) {
        target.classList.remove('tutorial-highlight');
        target.style.zIndex = '';
    }
    
    tutorialStep++;
    showTooltip(tutorialStep);
}

function skipTutorial() {
    document.querySelectorAll('.tutorial-tooltip').forEach(t => t.remove());
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
        el.style.zIndex = '';
    });
    endTutorial();
}

function endTutorial() {
    tutorialActive = false;
    localStorage.setItem('serversavershield_tutorial_seen', 'true');
    console.log('[TUTORIAL] Tutorial completed');
}

// Reset tutorial (for testing)
function resetTutorial() {
    localStorage.removeItem('serversavershield_tutorial_seen');
    console.log('[TUTORIAL] Tutorial reset');
}
