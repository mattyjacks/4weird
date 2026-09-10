/**
 * 4weird Games - Safe game.json population helpers.
 *
 * game.json is contributor-supplied content. Every helper in this file
 * inserts strings via textContent / DOM nodes (never innerHTML) and
 * restricts every URL to http(s), so a crafted game.json cannot inject
 * markup or `javascript:` links into a game page.
 *
 * Usage (after components.js / game.js):
 *   <script src="game-meta.js"></script>
 *   FourWeirdMeta.setBio('TEMPLATE-4weird-maker-bio', data.maker.bio);
 *   FourWeirdMeta.renderCredits('TEMPLATE-4weird-credits-grid', data.credits);
 */
(function () {
    'use strict';

    function safeUrl(raw) {
        try {
            var parsed = new URL(String(raw), window.location.href);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
        } catch (e) { /* not a valid absolute http(s) URL */ }
        return null;
    }

    function setBio(elementId, bio) {
        var bioEl = document.getElementById(elementId);
        if (!bioEl) return;
        bioEl.textContent = '';
        var paragraph = document.createElement('p');
        paragraph.textContent = bio == null ? '' : String(bio);
        bioEl.appendChild(paragraph);
    }

    function setMakerLink(elementId, url, label) {
        var href = url ? safeUrl(url) : null;
        if (!href) return;
        var link = document.getElementById(elementId);
        if (!link) return;
        link.href = href;
        link.textContent = label || 'Portfolio';
    }

    function renderCredits(gridId, credits, prefix) {
        var p = prefix || 'TEMPLATE-4weird';
        var grid = document.getElementById(gridId);
        if (!grid || !credits || !credits.length) return;
        grid.textContent = '';
        credits.forEach(function (c) {
            var card = document.createElement('div');
            card.className = p + '-credit-card' + (c.primary ? ' ' + p + '-primary' : '');

            var avatar = document.createElement('div');
            avatar.className = p + '-credit-avatar';
            avatar.textContent = c.avatar || '👤';

            var name = document.createElement('h3');
            name.className = p + '-credit-name';
            name.textContent = c.name || '';

            var role = document.createElement('p');
            role.className = p + '-credit-role';
            role.textContent = c.role || '';

            card.append(avatar, name, role);

            var href = c.url ? safeUrl(c.url) : null;
            if (href) {
                var links = document.createElement('p');
                links.className = p + '-credit-links';
                var anchor = document.createElement('a');
                anchor.href = href;
                anchor.target = '_blank';
                anchor.rel = 'noopener';
                anchor.textContent = c.urlLabel || 'Link';
                links.appendChild(anchor);
                card.appendChild(links);
            }

            grid.appendChild(card);
        });
    }

    window.FourWeirdMeta = {
        safeUrl: safeUrl,
        setBio: setBio,
        setMakerLink: setMakerLink,
        renderCredits: renderCredits
    };
})();
