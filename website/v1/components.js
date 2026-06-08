/**
 * 4weird Games - Shared Components
 * Injects navbar, footer, and analytics across all pages
 * No build step required - pure vanilla JS
 */

(function() {
    'use strict';

    const SITE_CONFIG = {
        name: '4weird Games',
        tagline: 'Website Under Construction - Current Games in Development',
        company: 'MattyJacks.com',
        email: 'Matt@MattyJacks.com',
        started: '6/6/26',
        location: 'New Hampshire, USA',
        navItems: [
            { href: '#games', label: 'Games', activeOn: ['index.html', 'games.html'] },
            { href: '#contribute', label: 'Contribute', activeOn: ['contribute.html'] },
            { href: '#contact', label: 'Contact MattyJacks', activeOn: ['contact.html'], cta: true }
        ]
    };

    let basePath = '';
    const scriptTag = document.querySelector('script[src*="components.js"]');
    if (scriptTag) {
        const src = scriptTag.getAttribute('src');
        const index = src.indexOf('components.js');
        if (index !== -1) {
            basePath = src.substring(0, index);
        }
    }
    const isRoot = basePath === '' || basePath === './';

    function injectNavbar() {
        // Support both legacy and namespaced placeholders
        const placeholder = document.getElementById('TEMPLATE-4weird-nav-placeholder') 
            || document.getElementById('nav-placeholder');
        if (!placeholder) return;

        const navHTML = `
        <nav class="navbar" id="navbar">
            <div class="nav-container">
                <a href="${basePath}index.html" class="logo">
                    <span class="logo-emoji">🎮</span>
                    <span class="logo-text">4weird<span class="logo-accent">Games</span></span>
                </a>
                <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <ul class="nav-menu" id="navMenu">
                    <li><a href="https://4weird.com/games" class="nav-link">Games</a></li>
                    <li><a href="${isRoot ? '#contribute' : basePath + 'index.html#contribute'}" class="nav-link">Contribute</a></li>
                    <li><a href="${isRoot ? '#contact' : basePath + 'index.html#contact'}" class="nav-link nav-cta">Contact MattyJacks</a></li>
                </ul>
            </div>
        </nav>
        `;

        placeholder.outerHTML = navHTML;

        // Initialize mobile toggle
        setTimeout(() => {
            const toggle = document.getElementById('navToggle');
            const menu = document.getElementById('navMenu');
            if (toggle && menu) {
                toggle.addEventListener('click', () => {
                    menu.classList.toggle('active');
                    toggle.classList.toggle('active');
                });
            }
        }, 0);
    }

    function injectFooter() {
        // Support both legacy and namespaced placeholders
        const placeholder = document.getElementById('TEMPLATE-4weird-footer-placeholder')
            || document.getElementById('footer-placeholder');
        if (!placeholder) return;

        const footerHTML = `
        <footer class="footer">
            <div class="container">
                <div class="footer-content">
                    <div class="footer-brand">
                        <span class="footer-logo">🎮 4weird<span class="footer-accent">Games</span></span>
                        <p class="footer-tagline">${SITE_CONFIG.tagline}</p>
                    </div>
                    <div class="footer-links">
                        <a href="https://4weird.com/games" class="footer-link">Games</a>
                        <a href="${isRoot ? '#contribute' : basePath + 'index.html#contribute'}" class="footer-link">Contribute</a>
                        <a href="${isRoot ? '#contact' : basePath + 'index.html#contact'}" class="footer-link">Contact MattyJacks</a>
                        <a href="${basePath}privacy-policy.html" class="footer-link">Privacy Policy</a>
                        <a href="https://github.com/mattyjacks/4weird" target="_blank" rel="noopener" class="footer-link">GitHub</a>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p class="footer-copyright">
                        &copy; 2025 ${SITE_CONFIG.name}. A <a href="https://mattyjacks.com" target="_blank" rel="noopener">${SITE_CONFIG.company}</a> Company.
                    </p>
                    <p class="footer-location">${SITE_CONFIG.location} &bull; Global Freelancers &bull; Started ${SITE_CONFIG.started}</p>
                    <p class="footer-slogan">Do and/or DIE TRYING!!!</p>
                </div>
            </div>
        </footer>
        `;

        placeholder.outerHTML = footerHTML;
    }

    function injectAnalytics() {
        // Google Analytics
        if (!document.getElementById('ga-script')) {
            const gaScript = document.createElement('script');
            gaScript.id = 'ga-script';
            gaScript.async = true;
            gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
            document.head.appendChild(gaScript);

            const gaConfig = document.createElement('script');
            gaConfig.textContent = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'GA_MEASUREMENT_ID');
            `;
            document.head.appendChild(gaConfig);
        }

        // Proprietary tracking placeholder
        console.log('[4weird] Proprietary tracking initialized');
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        injectNavbar();
        injectFooter();
        injectAnalytics();
    }

    // Expose for manual use
    window.FourWeirdComponents = {
        injectNavbar,
        injectFooter,
        injectAnalytics,
        config: SITE_CONFIG
    };
})();
