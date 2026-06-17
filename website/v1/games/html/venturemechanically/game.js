/* Exit Waterfall Machine - game.js */

(function() {
    'use strict';

    // Global state
    let state = {
        mode: 'sandbox', // 'sandbox' or 'scenario'
        activeScenario: null,
        exitValue: 100, // in Millions
        
        // Sandbox parameters (in millions of dollars)
        debt: 10,
        seriesAPreferred: 20,
        seriesAPreferenceMultiple: 1.0,
        seriesAParticipating: false,
        
        seriesBPreferred: 30,
        seriesBPreferenceMultiple: 1.0,
        seriesBParticipating: false,
        
        commonOwnership: 40, // percentage for founders + employees combined
        founderShareOfCommon: 80, // percentage of the common pool that goes to founders (rest is employees)
        
        secondaryTaken: 0, // secondary cash out amount in scenarios
        
        // Results
        payouts: {
            debt: 0,
            seriesA: 0,
            seriesB: 0,
            common: 0,
            founders: 0,
            employees: 0
        }
    };

    // Scenarios definitions
    const SCENARIOS = {
        fanduel: {
            id: 'fanduel',
            title: 'The FanDuel Wipeout',
            difficulty: 'medium',
            desc: 'A hyper-growth startup raised $559M in preferred capital with heavy preferences. The company exited for a headline price of $500M.',
            objective: 'Use the exit slider to find the minimum sale price where Common Stock receives at least $1M. Take secondary if offered to save the founders.',
            setup: function() {
                state.debt = 0;
                state.seriesAPreferred = 559; // Large aggregated preference
                state.seriesAPreferenceMultiple = 1.0;
                state.seriesAParticipating = false;
                state.seriesBPreferred = 0;
                state.seriesBPreferenceMultiple = 1.0;
                state.seriesBParticipating = false;
                state.commonOwnership = 35;
                state.founderShareOfCommon = 70;
                state.exitValue = 500;
                state.secondaryTaken = 0;
                
                // Set UI inputs to match
                updateUIInputs();
            },
            checkWin: function() {
                if (state.exitValue >= 562) {
                    return {
                        success: true,
                        message: `Correct! Only at exits above $559M (the liquidation preference stack) does a single dollar reach common shareholders. At a $562M exit, common gets $3M (founders get about $2.1M). In the real FanDuel sale, the headline price was $465M, leaving founders with $0.`
                    };
                }
                return null;
            }
        },
        terms_vs_valuation: {
            id: 'terms_vs_valuation',
            title: 'Valuation vs. Clean Terms',
            difficulty: 'hard',
            desc: 'You have two funding offers. Offer A (Clean): $60M valuation, 1x non-participating. Offer B (Structured): $100M valuation, 2x participating, and $10M venture debt.',
            objective: 'Select "Offer B" or "Offer A" in Sandbox to see who wins in a mediocre exit of $70M. Which pays founders (holding 50% common) more?',
            setup: function() {
                // Let's set up Offer B (Structured) first and let them toggle
                state.debt = 10;
                state.seriesAPreferred = 30; // $30M preferred raised
                state.seriesAPreferenceMultiple = 2.0; // 2x pref!
                state.seriesAParticipating = true; // participating!
                state.seriesBPreferred = 0;
                state.commonOwnership = 50;
                state.founderShareOfCommon = 100;
                state.exitValue = 70;
                state.secondaryTaken = 0;
                updateUIInputs();
            },
            checkWin: function(answer) {
                if (answer === 'offer_a') {
                    return {
                        success: true,
                        message: `Correct! Under Offer A (Clean), a $70M exit pays investors $30M (1x preference), leaving $40M for common (founders get 50% = $20M). Under Offer B (Structured), the $10M debt + $60M preferred (2x of $30M) eats the entire $70M exit, leaving founders with $0! Clean terms win.`
                    };
                } else if (answer === 'offer_b') {
                    return {
                        success: false,
                        message: `Wiped out! Offer B looked great at a $100M headline valuation, but the 2x preference ($60M) and $10M debt consumed all $70M of the exit. Common got $0. Try analyzing Offer A.`
                    };
                }
                return null;
            }
        },
        debt_trap: {
            id: 'debt_trap',
            title: 'The Debt Trap',
            difficulty: 'easy',
            desc: 'Your startup raised $15M in Venture Debt and has $15M in 1x Preferred Stock. The business hits a slow patch and receives an acquisition offer for $25M.',
            objective: 'Calculate the exit split. Common stock holds 40% equity. Does the founder get anything in this $25M exit?',
            setup: function() {
                state.debt = 15;
                state.seriesAPreferred = 15;
                state.seriesAPreferenceMultiple = 1.0;
                state.seriesAParticipating = false;
                state.seriesBPreferred = 0;
                state.commonOwnership = 40;
                state.founderShareOfCommon = 100;
                state.exitValue = 25;
                state.secondaryTaken = 0;
                updateUIInputs();
            },
            checkWin: function() {
                if (state.payouts.common === 0 && state.exitValue === 25) {
                    return {
                        success: true,
                        message: `Exactly! Debt ($15M) is paid first. The remaining $10M goes to Preferred Stock (filling only part of their $15M preference). Common stock gets $0, meaning years of founder effort yield nothing. Raising debt for runway extension can be a double-edged sword.`
                    };
                }
                return null;
            }
        },
        secondary_rescue: {
            id: 'secondary_rescue',
            title: 'The Secondary Rescue',
            difficulty: 'medium',
            desc: 'During a frothy Series B round at a $150M valuation, you are offered a secondary sale of $1.5M. The board advises against it to "show alignment". The company later exits for $40M.',
            objective: 'Click "Take Secondary" in the panel, then exit for $40M. Compare your outcome with taking $0 secondary.',
            setup: function() {
                state.debt = 5;
                state.seriesAPreferred = 15;
                state.seriesAPreferenceMultiple = 1.0;
                state.seriesAParticipating = false;
                state.seriesBPreferred = 25;
                state.seriesBPreferenceMultiple = 1.0;
                state.seriesBParticipating = false;
                state.commonOwnership = 30;
                state.founderShareOfCommon = 80;
                state.exitValue = 40;
                state.secondaryTaken = 0; // Starts at 0
                updateUIInputs();
            },
            checkWin: function() {
                if (state.secondaryTaken > 0 && state.exitValue <= 45) {
                    return {
                        success: true,
                        message: `Excellent decision! At a $40M exit, the $5M debt + $40M preferred preferences wipe out common stock. Taking the $1.5M secondary earlier was life-changing and protected you from the capitalization waterfall wipeout. Normalizing modest secondary is healthy!`
                    };
                }
                return null;
            }
        }
    };

    // Sound Synthesis (Web Audio API)
    let audioCtx = null;
    function playSound(type) {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            const now = audioCtx.currentTime;
            
            if (type === 'coin') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.setValueAtTime(880, now + 0.08); // A5
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (type === 'sad') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, now); // A3
                osc.frequency.linearRampToValueAtTime(110, now + 0.5); // A2
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc.start(now);
                osc.stop(now + 0.6);
            } else if (type === 'click') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'applause') {
                // Fast noise burst
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(600, now + 0.05);
                osc.frequency.setValueAtTime(300, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
            }
        } catch (e) {
            console.warn('Audio play failed:', e);
        }
    }

    // Mathematical waterfall computation
    function calculateWaterfall() {
        let remainingProceeds = state.exitValue;
        
        // 1. Debt (Paid Senior in full)
        const debtPaid = Math.min(remainingProceeds, state.debt);
        remainingProceeds -= debtPaid;
        
        // Preferred stocks liquidation preference details
        // In real capitalization tables, rounds have seniority. Usually Series B is senior to Series A, etc.
        // Let's model B senior to A (Series B paid first, then Series A).
        const seriesBPrefRequired = state.seriesBPreferred * state.seriesBPreferenceMultiple;
        const seriesBPaid = Math.min(remainingProceeds, seriesBPrefRequired);
        remainingProceeds -= seriesBPaid;
        
        const seriesAPrefRequired = state.seriesAPreferred * state.seriesAPreferenceMultiple;
        const seriesAPaid = Math.min(remainingProceeds, seriesAPrefRequired);
        remainingProceeds -= seriesAPaid;
        
        // Participating shares conversion check & distribution
        let seriesAParticipatingPaid = 0;
        let seriesBParticipatingPaid = 0;
        let commonPaid = 0;
        
        // Calculate equivalent ownerships
        // Let's assume common stock represents state.commonOwnership % of total equity.
        // Preferred stocks convert to common if it yields more, OR if they have participating features, they get both.
        
        // For simplicity:
        // Participating Preferred gets its liquidation preference + its share of common pool.
        // Let's model:
        // Preferred owns a specific implied equity percentage. Let's calculate:
        // Series A ownership implied: if A raised $20M preferred at $80M post, they own 25% of the company.
        // Let's assume Series A owns 25% if participating. Series B owns 35% if participating.
        // The remaining is Common (40%).
        
        const totalEquityPercentage = state.commonOwnership + (state.seriesAPreferred > 0 ? 25 : 0) + (state.seriesBPreferred > 0 ? 35 : 0);
        const commonFraction = state.commonOwnership / totalEquityPercentage;
        const seriesAFraction = 25 / totalEquityPercentage;
        const seriesBFraction = 35 / totalEquityPercentage;
        
        if (remainingProceeds > 0) {
            // Participating features
            let participatingSharesSum = commonFraction;
            if (state.seriesAParticipating && state.seriesAPreferred > 0) participatingSharesSum += seriesAFraction;
            if (state.seriesBParticipating && state.seriesBPreferred > 0) participatingSharesSum += seriesBFraction;
            
            // Check if preferred wants to convert to common (for non-participating preferred)
            // If they convert, they forfeit liquidation preference, but get their equity fraction.
            // Under standard waterfall models: preferred will convert if (exit * ownership) > liquidation preference.
            // To make this simple and educational for the user:
            // Non-participating investors convert to common if the exit value is high enough.
            
            // Let's model:
            // Total common pool is remaining proceeds * commonFraction / participatingSharesSum
            const totalCommonPool = remainingProceeds;
            commonPaid = totalCommonPool * (state.commonOwnership / 100);
            
            // In case of high exits, investors convert to common and share proportional.
            // If exit is high enough, we simply distribute remainder by ownership.
            // Let's verify if common gets a clean split:
            // If we have no participation, does common get 100% of remaining after preference?
            // Yes, standard non-participating means remaining goes to Common entirely, unless preferred converts.
            // If preferred converts, they join common pool, diluting common.
            // Let's implement this cleanly:
            let commonPoolRatio = 1.0;
            if (state.seriesAPreferred > 0) {
                const valueIfConvertedA = state.exitValue * seriesAFraction;
                if (valueIfConvertedA > seriesAPrefRequired && !state.seriesAParticipating) {
                    // Series A converts to common
                    commonPoolRatio -= seriesAFraction;
                }
            }
            if (state.seriesBPreferred > 0) {
                const valueIfConvertedB = state.exitValue * seriesBFraction;
                if (valueIfConvertedB > seriesBPrefRequired && !state.seriesBParticipating) {
                    // Series B converts to common
                    commonPoolRatio -= seriesBFraction;
                }
            }
            
            // Participating gets a slice of remaining proceeds
            let commonDistribution = remainingProceeds;
            if (state.seriesAParticipating && state.seriesAPreferred > 0) {
                seriesAParticipatingPaid = remainingProceeds * seriesAFraction;
                commonDistribution -= seriesAParticipatingPaid;
            }
            if (state.seriesBParticipating && state.seriesBPreferred > 0) {
                seriesBParticipatingPaid = remainingProceeds * seriesBFraction;
                commonDistribution -= seriesBParticipatingPaid;
            }
            
            commonPaid = commonDistribution;
        }
        
        state.payouts.debt = debtPaid;
        state.payouts.seriesA = seriesAPaid + seriesAParticipatingPaid;
        state.payouts.seriesB = seriesBPaid + seriesBParticipatingPaid;
        state.payouts.common = Math.max(0, commonPaid);
        
        state.payouts.founders = state.payouts.common * (state.founderShareOfCommon / 100);
        state.payouts.employees = state.payouts.common * ((100 - state.founderShareOfCommon) / 100);
    }

    // Money particles animation state
    let particles = [];
    const canvas = document.getElementById('waterfall-gameCanvas');
    let ctx = null;
    let animationFrameId = null;

    if (canvas) {
        ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 420;
    }

    function createParticle(x, y, targetX, targetY, color) {
        particles.push({
            x: x,
            y: y,
            targetX: targetX,
            targetY: targetY,
            speed: 2 + Math.random() * 3,
            color: color || '#00ff87',
            size: 2 + Math.random() * 4,
            progress: 0
        });
    }

    // Draw the exit waterfall machine dynamically on canvas
    function drawMachine() {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background elements
        ctx.fillStyle = '#08080f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render pipes (metallic pipeline look)
        const pipes = [
            // Exit funnel down
            { name: 'main', path: [[400, 30], [400, 90]] },
            // Debt branch
            { name: 'debt', path: [[400, 90], [150, 90], [150, 200]], active: state.payouts.debt > 0, color: '#00d2ff' },
            // Series B Pref branch
            { name: 'seriesB', path: [[400, 90], [280, 90], [280, 200]], active: state.payouts.seriesB > 0, color: '#cf62ff' },
            // Series A Pref branch
            { name: 'seriesA', path: [[400, 90], [410, 90], [410, 200]], active: state.payouts.seriesA > 0, color: '#b92b27' },
            // Common branch
            { name: 'common', path: [[400, 90], [650, 90], [650, 200]], active: state.payouts.common > 0, color: '#00ff87' }
        ];

        // Draw static lines/pipes
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        pipes.forEach(pipe => {
            ctx.strokeStyle = '#22223b';
            ctx.beginPath();
            ctx.moveTo(pipe.path[0][0], pipe.path[0][1]);
            for(let i=1; i<pipe.path.length; i++) {
                ctx.lineTo(pipe.path[i][0], pipe.path[i][1]);
            }
            ctx.stroke();
            
            if (pipe.active) {
                // Active glow
                ctx.strokeStyle = pipe.color;
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(pipe.path[0][0], pipe.path[0][1]);
                for(let i=1; i<pipe.path.length; i++) {
                    ctx.lineTo(pipe.path[i][0], pipe.path[i][1]);
                }
                ctx.stroke();
                
                // Spawning particles along active pipes
                if (Math.random() < 0.25) {
                    // Choose random path segment
                    createParticle(pipe.path[0][0], pipe.path[0][1], pipe.path[pipe.path.length-1][0], pipe.path[pipe.path.length-1][1], pipe.color);
                }
            }
        });
        
        // Draw headline Funnel
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(340, 10);
        ctx.lineTo(460, 10);
        ctx.lineTo(415, 60);
        ctx.lineTo(385, 60);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Funnel label
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 10px Orbitron';
        ctx.fillText("HEADLINE EXIT", 400, 30);
        ctx.textAlign = 'center';
        
        // Draw buckets at the bottom of the branches
        const buckets = [
            { x: 150, y: 250, label: 'DEBT', val: state.payouts.debt, color: '#00d2ff', character: '💼', role: 'Venture Debt' },
            { x: 280, y: 250, label: 'SERIES B PREF', val: state.payouts.seriesB, color: '#cf62ff', character: '🕶️', role: 'Series B Investor' },
            { x: 410, y: 250, label: 'SERIES A PREF', val: state.payouts.seriesA, color: '#b92b27', character: '🎩', role: 'Series A Investor' },
            { x: 650, y: 250, label: 'COMMON STOCK', val: state.payouts.common, color: '#00ff87', character: '😰', role: 'Founders & Staff' }
        ];
        
        buckets.forEach(b => {
            // Adjust common character based on payout
            let char = b.character;
            if (b.label === 'COMMON STOCK') {
                if (b.val === 0) {
                    char = '😭'; // Crying founder
                } else if (b.val > 0 && b.val < 10) {
                    char = '😰'; // Worried founder
                } else {
                    char = '😎'; // Happy founder
                }
            }
            
            // Draw Character label and role
            ctx.fillStyle = '#fff';
            ctx.font = '28px Arial';
            ctx.fillText(char, b.x, b.y - 40);
            
            ctx.font = '10px Inter';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(b.role, b.x, b.y - 25);
            
            // Draw Bucket
            ctx.fillStyle = 'rgba(30, 30, 45, 0.8)';
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(b.x - 35, b.y);
            ctx.lineTo(b.x + 35, b.y);
            ctx.lineTo(b.x + 25, b.y + 50);
            ctx.lineTo(b.x - 25, b.y + 50);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Fill visual level inside bucket based on payout fraction
            const fillFrac = Math.min(1.0, b.val / 100);
            if (fillFrac > 0) {
                ctx.fillStyle = b.color;
                ctx.beginPath();
                ctx.moveTo(b.x - 30 * fillFrac, b.y + 50 - 50 * fillFrac);
                ctx.lineTo(b.x + 30 * fillFrac, b.y + 50 - 50 * fillFrac);
                ctx.lineTo(b.x + 25, b.y + 50);
                ctx.lineTo(b.x - 25, b.y + 50);
                ctx.closePath();
                ctx.fill();
            }
            
            // Text values below bucket
            ctx.fillStyle = b.color;
            ctx.font = 'bold 12px Orbitron';
            ctx.fillText(`$${b.val.toFixed(1)}M`, b.x, b.y + 70);
            
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Inter';
            ctx.fillText(b.label, b.x, b.y + 85);
        });
        
        // Update and draw money particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.progress += p.speed / 100;
            if (p.progress >= 1.0) {
                particles.splice(i, 1);
                continue;
            }
            // Interpolate position along the pipe paths
            const startX = p.x;
            const startY = p.y;
            p.currentX = startX + (p.targetX - startX) * p.progress;
            p.currentY = startY + (p.targetY - startY) * p.progress;
            
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.currentX, p.currentY, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Animation Loop
    function updateFrame() {
        calculateWaterfall();
        drawMachine();
        animationFrameId = requestAnimationFrame(updateFrame);
    }

    // UI Updates
    function updateUIInputs() {
        document.getElementById('input-debt').value = state.debt;
        document.getElementById('input-seriesA-preferred').value = state.seriesAPreferred;
        document.getElementById('input-seriesA-multiple').value = state.seriesAPreferenceMultiple;
        document.getElementById('input-seriesA-participating').checked = state.seriesAParticipating;
        document.getElementById('input-seriesB-preferred').value = state.seriesBPreferred;
        document.getElementById('input-seriesB-multiple').value = state.seriesBPreferenceMultiple;
        document.getElementById('input-seriesB-participating').checked = state.seriesBParticipating;
        document.getElementById('input-common-ownership').value = state.commonOwnership;
        
        document.getElementById('exit-slider').value = state.exitValue;
        updateTextDisplays();
    }

    function updateTextDisplays() {
        document.getElementById('exit-amount-val').textContent = `$${state.exitValue.toFixed(1)}M`;
        document.getElementById('payout-debt').textContent = `$${state.payouts.debt.toFixed(1)}M`;
        document.getElementById('payout-pref').textContent = `$${(state.payouts.seriesA + state.payouts.seriesB).toFixed(1)}M`;
        document.getElementById('payout-common').textContent = `$${state.payouts.common.toFixed(1)}M`;
        
        // Breakdown card detail
        document.getElementById('detail-debt-payout').textContent = `$${state.payouts.debt.toFixed(1)}M`;
        document.getElementById('detail-seriesA-payout').textContent = `$${state.payouts.seriesA.toFixed(1)}M`;
        document.getElementById('detail-seriesB-payout').textContent = `$${state.payouts.seriesB.toFixed(1)}M`;
        document.getElementById('detail-founders-payout').textContent = `$${state.payouts.founders.toFixed(1)}M`;
        
        // Show disclaimer/secondary warning if founders get 0
        const alertBox = document.getElementById('waterfall-warning-box');
        if (state.payouts.founders === 0 && state.exitValue > 0) {
            alertBox.style.display = 'block';
            alertBox.textContent = `⚠️ FOUNDER WIPEOUT: Exit of $${state.exitValue}M yields $0.0M for founders due to liquidation preferences/debt senior stack.`;
        } else {
            alertBox.style.display = 'none';
        }

        // Secondary status check
        const secStatus = document.getElementById('secondary-status-txt');
        if (secStatus) {
            secStatus.textContent = state.secondaryTaken > 0 ? `$${state.secondaryTaken.toFixed(1)}M secured` : 'None';
        }
    }

    // Set active scenario
    function activateScenario(scId) {
        playSound('click');
        state.mode = 'scenario';
        state.activeScenario = SCENARIOS[scId];
        
        // Adjust style selection
        document.querySelectorAll('.scenario-card').forEach(card => {
            card.classList.remove('active');
        });
        document.getElementById(`sc-${scId}`).classList.add('active');
        
        // Setup initial scenario variables
        state.activeScenario.setup();
        
        // Set Sandbox controls disabled during scenarios to keep parameters fixed
        document.querySelectorAll('.sandbox-control').forEach(el => {
            el.disabled = true;
            el.style.opacity = 0.5;
        });
        
        // Show offer comparison buttons for terms_vs_valuation level
        const termsOfferContainer = document.getElementById('sc-terms-offer-btns');
        if (scId === 'terms_vs_valuation') {
            termsOfferContainer.style.display = 'block';
        } else {
            termsOfferContainer.style.display = 'none';
        }
        
        // Show secondary taking button if secondary_rescue level is active
        const secondaryBtnContainer = document.getElementById('sc-secondary-btn-container');
        if (scId === 'secondary_rescue') {
            secondaryBtnContainer.style.display = 'block';
        } else {
            secondaryBtnContainer.style.display = 'none';
        }
    }

    function triggerWin(msg) {
        playSound('applause');
        const popup = document.getElementById('scenario-complete-popup');
        popup.querySelector('.popup-message').textContent = msg;
        popup.classList.add('visible');
    }

    function triggerLoss(msg) {
        playSound('sad');
        alert(msg);
    }

    // Initialization
    function init() {
        // Setup Event Listeners for Sandbox Inputs
        document.getElementById('input-debt').addEventListener('input', (e) => {
            state.debt = parseFloat(e.target.value) || 0;
            playSound('click');
        });
        document.getElementById('input-seriesA-preferred').addEventListener('input', (e) => {
            state.seriesAPreferred = parseFloat(e.target.value) || 0;
            playSound('click');
        });
        document.getElementById('input-seriesA-multiple').addEventListener('input', (e) => {
            state.seriesAPreferenceMultiple = parseFloat(e.target.value) || 1.0;
            playSound('click');
        });
        document.getElementById('input-seriesA-participating').addEventListener('change', (e) => {
            state.seriesAParticipating = e.target.checked;
            playSound('click');
        });
        document.getElementById('input-seriesB-preferred').addEventListener('input', (e) => {
            state.seriesBPreferred = parseFloat(e.target.value) || 0;
            playSound('click');
        });
        document.getElementById('input-seriesB-multiple').addEventListener('input', (e) => {
            state.seriesBPreferenceMultiple = parseFloat(e.target.value) || 1.0;
            playSound('click');
        });
        document.getElementById('input-seriesB-participating').addEventListener('change', (e) => {
            state.seriesBParticipating = e.target.checked;
            playSound('click');
        });
        document.getElementById('input-common-ownership').addEventListener('input', (e) => {
            state.commonOwnership = parseFloat(e.target.value) || 0;
            playSound('click');
        });

        // Exit slider listener
        document.getElementById('exit-slider').addEventListener('input', (e) => {
            state.exitValue = parseFloat(e.target.value) || 0;
            updateTextDisplays();
            
            // Check win scenarios real-time
            if (state.mode === 'scenario' && state.activeScenario) {
                const check = state.activeScenario.checkWin();
                if (check && check.success) {
                    triggerWin(check.message);
                }
            }
        });

        // Tab Switching Logic
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
                
                playSound('click');
                
                // Reset mode to Sandbox if sandbox tab clicked
                if (targetTab === 'tab-sandbox') {
                    state.mode = 'sandbox';
                    state.activeScenario = null;
                    document.querySelectorAll('.sandbox-control').forEach(el => {
                        el.disabled = false;
                        el.style.opacity = 1.0;
                    });
                    document.getElementById('sc-terms-offer-btns').style.display = 'none';
                    document.getElementById('sc-secondary-btn-container').style.display = 'none';
                }
            });
        });

        // Click handlers for scenarios
        document.getElementById('sc-fanduel').addEventListener('click', () => activateScenario('fanduel'));
        document.getElementById('sc-terms_vs_valuation').addEventListener('click', () => activateScenario('terms_vs_valuation'));
        document.getElementById('sc-debt_trap').addEventListener('click', () => activateScenario('debt_trap'));
        document.getElementById('sc-secondary_rescue').addEventListener('click', () => activateScenario('secondary_rescue'));

        // Action handles for specific scenario challenges
        document.getElementById('btn-select-offer-a').addEventListener('click', () => {
            if (state.activeScenario && state.activeScenario.id === 'terms_vs_valuation') {
                const check = state.activeScenario.checkWin('offer_a');
                if (check.success) {
                    triggerWin(check.message);
                }
            }
        });
        document.getElementById('btn-select-offer-b').addEventListener('click', () => {
            if (state.activeScenario && state.activeScenario.id === 'terms_vs_valuation') {
                const check = state.activeScenario.checkWin('offer_b');
                triggerLoss(check.message);
            }
        });

        document.getElementById('btn-take-secondary').addEventListener('click', () => {
            if (state.activeScenario && state.activeScenario.id === 'secondary_rescue') {
                state.secondaryTaken = 1.5;
                playSound('coin');
                updateTextDisplays();
                alert("Smart move! You sold secondary for $1.5M in Series B. Now adjust the exit slider down to $40M to see if you survive the exit.");
            }
        });

        document.getElementById('btn-close-popup').addEventListener('click', () => {
            document.getElementById('scenario-complete-popup').classList.remove('visible');
            // Reset to sandbox
            document.querySelector('[data-tab="tab-sandbox"]').click();
        });

        // Initialize state variables with values from input elements
        state.debt = parseFloat(document.getElementById('input-debt').value) || 0;
        state.seriesAPreferred = parseFloat(document.getElementById('input-seriesA-preferred').value) || 0;
        state.seriesAPreferenceMultiple = parseFloat(document.getElementById('input-seriesA-multiple').value) || 1.0;
        state.seriesAParticipating = document.getElementById('input-seriesA-participating').checked;
        state.seriesBPreferred = parseFloat(document.getElementById('input-seriesB-preferred').value) || 0;
        state.seriesBPreferenceMultiple = parseFloat(document.getElementById('input-seriesB-multiple').value) || 1.0;
        state.seriesBParticipating = document.getElementById('input-seriesB-participating').checked;
        state.commonOwnership = parseFloat(document.getElementById('input-common-ownership').value) || 0;

        // Kickoff animation frame
        updateFrame();
        updateUIInputs();
    }

    // Expose Global API for setup template
    window.Game = { init };

})();
