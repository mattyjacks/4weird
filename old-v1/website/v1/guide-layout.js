(function() {
    'use strict';

    // 1. Locate base path
    let basePath = '';
    const scriptTag = document.querySelector('script[src*="guide-layout.js"]');
    if (scriptTag) {
        const src = scriptTag.getAttribute('src');
        const index = src.indexOf('guide-layout.js');
        if (index !== -1) {
            basePath = src.substring(0, index);
        }
    }
    
    // 2. Inject standard CSS
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = basePath + 'guide-style.css';
    document.head.appendChild(styleLink);

    // 3. Inject Google Tag Manager (gtag.js)
    if (!document.getElementById('ga-script')) {
        const gaScript = document.createElement('script');
        gaScript.id = 'ga-script';
        gaScript.async = true;
        gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-KZ03RW8P96';
        document.head.appendChild(gaScript);

        const gaConfig = document.createElement('script');
        gaConfig.textContent = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-KZ03RW8P96');
        `;
        document.head.appendChild(gaConfig);
    }

    // Helper function to build elements on DOM Ready
    function initLayout() {
        const container = document.querySelector('.container') || document.body;

        // Gather variables from body
        const title = document.body.getAttribute('data-game-title') || document.title.replace(' - Game Guide', '');
        const emoji = document.body.getAttribute('data-game-emoji') || '🎮';
        const tagline = document.body.getAttribute('data-game-tagline') || 'Official Game Guide & Reference';
        const playUrl = document.body.getAttribute('data-play-url') || 'index.html';
        const backUrl = document.body.getAttribute('data-back-url') || basePath + 'index.html';
        const footerText = document.body.getAttribute('data-footer-text') || `${title} — A 4weird Games Publication`;

        // Prepend Header if none exists
        if (!document.querySelector('header')) {
            const header = document.createElement('header');
            header.innerHTML = `
                <h1>${emoji} ${title}</h1>
                <p class="tagline">${tagline}</p>
                <div class="nav-buttons">
                    <a href="${playUrl}" class="nav-btn">🎮 Play This Game</a>
                    <a href="${backUrl}" class="nav-btn">🏠 Back to 4weird</a>
                </div>
            `;
            container.insertBefore(header, container.firstChild);
        } else {
            // If header exists but buttons need updates/replacements
            const navButtons = document.querySelector('.nav-buttons');
            if (navButtons) {
                navButtons.innerHTML = `
                    <a href="${playUrl}" class="nav-btn">🎮 Play This Game</a>
                    <a href="${backUrl}" class="nav-btn">🏠 Back to 4weird</a>
                `;
            }
        }

        // Append Footer if none exists
        if (!document.querySelector('footer')) {
            const footer = document.createElement('footer');
            footer.innerHTML = `<p>${footerText}</p>`;
            container.appendChild(footer);
        }

        // Inject Scroll to Top Button if none exists
        if (!document.getElementById('scrollToTop')) {
            const btn = document.createElement('button');
            btn.id = 'scrollToTop';
            btn.className = 'scroll-to-top';
            btn.title = 'Scroll to top';
            btn.innerHTML = '↑';
            document.body.appendChild(btn);

            btn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    btn.classList.add('visible');
                } else {
                    btn.classList.remove('visible');
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLayout);
    } else {
        initLayout();
    }

    // Wire up toggleDetails globally (since cards use onclick="toggleDetails(this)")
    window.toggleDetails = function(btn) {
        const card = btn.closest('.entity-card');
        const details = card ? card.querySelector('.entity-details') : btn.previousElementSibling.previousElementSibling;
        if (details) {
            details.classList.toggle('active');
            btn.classList.toggle('active');
            btn.textContent = details.classList.contains('active') ? 'Read Less' : 'Read More';
        }
    };
})();
