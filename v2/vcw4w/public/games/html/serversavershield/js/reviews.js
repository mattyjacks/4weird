// Review System - 150 Random Reviews
// Context-aware review generation based on game performance

var reviews = [];
var reviewTimer = 0;

const CUSTOMER_PERSONAS = [
    // Enterprise customers
    'TechCorp Industries', 'Global Systems Ltd', 'DataFlow Inc', 'CloudNine Solutions', 'MegaCorp Enterprise',
    'InnovateTech', 'FutureStack', 'CyberShield Co', 'NetSecure Pro', 'Digital Fortress',
    // SMB customers
    "Dave's Diner", 'Main Street Boutique', 'Corner Cafe', 'Local Bookstore', 'Family Hardware',
    'Coffee Corner', 'Urban Yoga Studio', 'Pet Paradise', 'Flower Power Shop', 'Bike Repair Co',
    // Startups
    'StartUpXYZ', 'NextGen Apps', 'CodeStream', 'AppVenture', 'CloudFirst Startup',
    'DevMasters', 'ByteSized Games', 'PixelPerfect', 'ScriptKitties', 'TechNinjas',
    // Individuals
    'Sarah Freelance', 'Mike Blogger', 'Jenny Streamer', 'Alex Gamer', 'Chris Developer',
    'Taylor Designer', 'Jordan Creator', 'Casey Writer', 'Riley Artist', 'Quinn Coder'
];

const REVIEW_TEMPLATES = {
    5: {
        security: [
            "Best security service ever! Never had a single breach in {time} months!",
            "Incredible protection. Our data has never been safer. Worth every penny!",
            "Top-notch security team. They caught threats before we even knew about them!",
            "Absolutely fantastic service. Our customers trust us because of {company}!",
            "Five stars isn't enough! The security is impenetrable and support is instant."
        ],
        pricing: [
            "Amazing value for money. The best security investment we've ever made!",
            "Reasonable prices for enterprise-grade protection. Highly recommend!",
            "You get what you pay for, and this is premium protection at fair prices!",
            "Worth every dollar. Saved us from breaches that would have cost millions!",
            "Best ROI on any business expense this year. The protection is priceless!"
        ],
        support: [
            "Support team is incredible! Always available and super helpful!",
            "Had questions at 2 AM and got instant help. Best support ever!",
            "Professional, friendly, and knowledgeable support staff. Love them!",
            "Every interaction with support has been amazing. True experts!",
            "They don't just solve problems, they prevent them. Proactive support!"
        ],
        reliability: [
            "100% uptime in {time} months. Flawless reliability!",
            "Never had a single second of downtime. Rock solid service!",
            "Our systems run smoother than ever. Zero issues since signing up!",
            "Reliable as clockwork. We trust {company} with our entire business!",
            "The stability has transformed our operations. Amazing reliability!"
        ]
    },
    4: {
        security: [
            "Great protection overall. Minor issues but nothing serious.",
            "Solid security service. Caught most threats effectively.",
            "Very good protection. Only one small incident in {time} months.",
            "Reliable security with good monitoring. Would recommend!",
            "Strong defense against most attacks. Peace of mind achieved!"
        ],
        pricing: [
            "Good value for the protection you get. Fair pricing structure.",
            "Reasonable costs for solid security. Good investment overall.",
            "Price is fair for the service quality. No complaints here!",
            "Competitive pricing for this level of protection. Worth it!",
            "Good balance of cost and security features. Happy customer!"
        ],
        support: [
            "Support is generally good. Quick responses most of the time.",
            "Helpful support team. Usually resolve issues quickly.",
            "Good customer service. Professional and courteous.",
            "Support has been solid. Had one slow response but overall good.",
            "Responsive support team. Knowledgeable and helpful!"
        ],
        reliability: [
            "Very reliable service. Minimal downtime over {time} months.",
            "Stable and dependable. Occasional hiccups but nothing major.",
            "Good uptime overall. One brief outage but recovered quickly.",
            "Reliable protection. Systems run smoothly 99% of the time.",
            "Solid reliability. Trust them with our critical infrastructure."
        ]
    },
    3: {
        security: [
            "Decent protection but had some downtime last week.",
            "Average security service. Protected us but had some gaps.",
            "Okay protection. One breach got through but was contained.",
            "Mixed results. Good most of the time but some vulnerabilities.",
            "Fair security. Could be better but not the worst we've used."
        ],
        pricing: [
            "Prices are okay. Service matches what you pay for.",
            "Average value. Not great, not terrible.",
            "Pricing is fair but could offer more features.",
            "Middle of the road. Decent for the cost.",
            "Acceptable pricing. Nothing special though."
        ],
        support: [
            "Support is hit or miss. Sometimes fast, sometimes slow.",
            "Average support experience. Gets the job done eventually.",
            "Decent help when needed. Not amazing but adequate.",
            "Support team is okay. Had to wait once for 2 hours.",
            "Middle-of-the-road support. Could be more responsive."
        ],
        reliability: [
            "Service is okay but had some downtime recently.",
            "Average reliability. Few outages in the past month.",
            "Works most of the time. Had one extended outage.",
            "Decent uptime. Not 99.9% but acceptable for our needs.",
            "Stability could be better. Some intermittent issues."
        ]
    },
    2: {
        security: [
            "Below average protection. Had two breaches this month!",
            "Not impressed. Security holes let attackers through.",
            "Disappointing. Failed to stop ransomware last week.",
            "Weak security. We're looking at alternatives now.",
            "Poor protection. Lost customer data in the breach."
        ],
        pricing: [
            "Overpriced for what you get. Not worth the cost.",
            "Too expensive for mediocre protection.",
            "High prices, low value. Looking elsewhere.",
            "Not a good value proposition. Costs keep rising.",
            "Way too pricey for the unreliable service provided."
        ],
        support: [
            "Slow support response. Had to wait days for help.",
            "Unhelpful support team. Didn't solve our issues.",
            "Support is terrible. Rude and unprofessional.",
            "Waited 24 hours for a response. Unacceptable!",
            "Support is clueless. Escalated twice with no resolution."
        ],
        reliability: [
            "Frequent outages. Can't rely on this service.",
            "Terrible uptime. Down several times this month!",
            "Unstable service. Cost us business during peak hours.",
            "Constant disconnections. Unreliable at best.",
            "Service is flaky. Never know when it'll go down."
        ]
    },
    1: {
        security: [
            "COMPLETE DISASTER! Lost ALL customer data to ransomware!",
            "Security is a joke. Hackers walked right through!",
            "Catastrophic failure. Data breach cost us millions!",
            "WORST security ever. Our systems were wide open!",
            "Absolute nightmare. Customer info stolen, lawsuits incoming!"
        ],
        pricing: [
            "Robbery! Paying premium prices for ZERO protection!",
            "Expensive mistake. Should have gone with competitors.",
            "Complete waste of money. Zero value delivered.",
            "Overpriced garbage. Charging us while we get hacked!",
            "Scam prices for non-existent service. Total ripoff!"
        ],
        support: [
            "Support is NON-EXISTENT! No help during the crisis!",
            "Ignored our emergency calls. Left us to die!",
            "Worst support ever. Blamed us for their failures!",
            "Ghosted us during the breach. Criminal negligence!",
            "Support laughed at our data loss. Disgusting!"
        ],
        reliability: [
            "Down more than up! Complete unreliable mess!",
            "System crashed during the attack. Worthless!",
            "Can't rely on this at all. Always failing!",
            "Disaster-level reliability. Destroyed our business!",
            "0% uptime when it mattered most. Useless service!"
        ]
    }
};

const CATEGORIES = ['security', 'pricing', 'support', 'reliability'];
const CATEGORY_WEIGHTS = { security: 0.4, pricing: 0.3, support: 0.2, reliability: 0.1 };

function initReviews() {
    reviews = [];
    reviewTimer = 0;
    
    // Generate initial batch of reviews
    for (let i = 0; i < 10; i++) {
        generateReview(true);
    }
}

function updateReviews() {
    reviewTimer--;
    
    // Generate new review every 30 seconds or on server breach
    if (reviewTimer <= 0) {
        generateReview(false);
        reviewTimer = 1800; // 30 seconds at 60fps
    }
}

function generateReview(isInitial = false) {
    if (reviews.length >= 150) {
        // Remove oldest review (circular buffer)
        reviews.shift();
    }
    
    // Calculate star rating based on reputation
    const starRating = calculateStarRating();
    
    // Select category based on recent events
    const category = selectReviewCategory();
    
    // Select template
    const templates = REVIEW_TEMPLATES[starRating][category];
    let template = templates[Math.floor(Math.random() * templates.length)];
    
    // Replace placeholders
    const persona = CUSTOMER_PERSONAS[Math.floor(Math.random() * CUSTOMER_PERSONAS.length)];
    const months = Math.floor(Math.random() * 12) + 1;
    template = template.replace('{time}', months).replace('{company}', 'Server Saver Shield');
    
    const review = {
        id: Date.now() + Math.random(),
        name: persona,
        stars: starRating,
        text: template,
        category: category,
        timestamp: Date.now(),
        isNew: !isInitial
    };
    
    reviews.push(review);
    
    // Update reputation slightly based on good reviews
    if (starRating >= 4 && !isInitial) {
        gameState.reputation = Math.min(100, gameState.reputation + 0.1);
    }
    
    return review;
}

function generateBadReview(enemyType) {
    // Force a bad review after server breach
    const starRating = Math.random() < 0.7 ? 1 : 2; // 70% chance of 1-star
    const category = 'security'; // Always security-related after breach
    
    const templates = REVIEW_TEMPLATES[starRating][category];
    let template = templates[Math.floor(Math.random() * templates.length)];
    
    const persona = CUSTOMER_PERSONAS[Math.floor(Math.random() * CUSTOMER_PERSONAS.length)];
    template = template.replace('{time}', '3').replace('{company}', 'Server Saver Shield');
    
    const review = {
        id: Date.now() + Math.random(),
        name: persona,
        stars: starRating,
        text: template,
        category: category,
        timestamp: Date.now(),
        isNew: true,
        triggeredBy: enemyType
    };
    
    if (reviews.length >= 150) reviews.shift();
    reviews.push(review);
    
    // Flash review notification
    addFloatingText(CANVAS_WIDTH / 2, 100, `⭐ ${starRating}-STAR REVIEW!`, starRating === 1 ? '#ef4444' : '#f59e0b', 18);
}

function calculateStarRating() {
    const rep = gameState.reputation;
    
    // Weighted random based on reputation
    if (rep < 30) {
        // Mostly 1-2 stars
        const roll = Math.random();
        if (roll < 0.5) return 1;
        if (roll < 0.8) return 2;
        return 3;
    } else if (rep < 50) {
        // Mostly 2-3 stars
        const roll = Math.random();
        if (roll < 0.3) return 1;
        if (roll < 0.6) return 2;
        if (roll < 0.9) return 3;
        return 4;
    } else if (rep < 70) {
        // Mostly 3-4 stars
        const roll = Math.random();
        if (roll < 0.1) return 2;
        if (roll < 0.4) return 3;
        if (roll < 0.8) return 4;
        return 5;
    } else if (rep < 85) {
        // Mostly 4-5 stars
        const roll = Math.random();
        if (roll < 0.1) return 3;
        if (roll < 0.4) return 4;
        return 5;
    } else {
        // Mostly 5 stars
        const roll = Math.random();
        if (roll < 0.05) return 3;
        if (roll < 0.2) return 4;
        return 5;
    }
}

function selectReviewCategory() {
    const roll = Math.random();
    let cumulative = 0;
    
    for (const [cat, weight] of Object.entries(CATEGORY_WEIGHTS)) {
        cumulative += weight;
        if (roll < cumulative) return cat;
    }
    
    return 'security';
}

function getAverageRating() {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.stars, 0);
    return (sum / reviews.length).toFixed(1);
}

function getRecentReviews(count = 5) {
    return reviews.slice(-count).reverse();
}

function getReviewsByStars(stars) {
    return reviews.filter(r => r.stars === stars);
}

// Stub for floating text
function addFloatingText(x, y, text, color, size) {
    // Implementation in ui.js
    if (typeof window.addText === 'function') {
        window.addText(x, y, text, color, size);
    }
}

// Render reviews for management UI
function renderReviewsList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const avgRating = getAverageRating();
    const recent = getRecentReviews(3);
    
    let html = `
        <div style="background: rgba(139, 92, 246, 0.1); padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
            <div style="font-size: 2.5rem; color: #f59e0b; font-weight: 800;">${avgRating} ⭐</div>
            <div style="color: #6b7280;">Average Rating (${reviews.length} reviews)</div>
        </div>
        <h4 style="margin-top: 20px;">Recent Reviews</h4>
    `;
    
    recent.forEach(review => {
        const stars = '⭐'.repeat(review.stars);
        const borderColor = review.stars >= 4 ? '#10b981' : review.stars === 3 ? '#f59e0b' : '#ef4444';
        
        html += `
            <div style="background: rgba(255, 255, 255, 0.05); border-left: 3px solid ${borderColor}; padding: 12px; margin: 8px 0; border-radius: 0 8px 8px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>${review.name}</strong>
                    <span style="color: #f59e0b;">${stars}</span>
                </div>
                <div style="font-size: 0.9rem; color: #f5f5f5;">${review.text}</div>
                <div style="font-size: 0.75rem; color: #6b7280; margin-top: 5px;">${review.category.toUpperCase()}</div>
            </div>
        `;
    });
    
    // Category breakdown
    html += '<h4 style="margin-top: 20px;">Rating Breakdown</h4>';
    html += '<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">';
    
    for (let i = 5; i >= 1; i--) {
        const count = getReviewsByStars(i).length;
        const percent = reviews.length > 0 ? (count / reviews.length * 100).toFixed(0) : 0;
        const color = i >= 4 ? '#10b981' : i === 3 ? '#f59e0b' : '#ef4444';
        
        html += `
            <div style="background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.2rem; color: ${color};">${i}⭐</div>
                <div style="font-size: 0.9rem; font-weight: 700;">${count}</div>
                <div style="font-size: 0.75rem; color: #6b7280;">${percent}%</div>
            </div>
        `;
    }
    html += '</div>';
    
    container.innerHTML = html;
}

// Override the stub in servers.js
window.generateBadReview = generateBadReview;
