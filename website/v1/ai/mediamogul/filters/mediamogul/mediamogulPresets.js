// mediamogulPresets.js - Preset Styles, Layout Positioning, and Video Filter Modifiers for Shotcut

.pragma library

function applyVideoModifications(filter, textFilterUi, textArea, setControlsCallback, actionObj) {
    if (!actionObj) return;

    filter.blockSignals = true;

    // 1. Text Content
    if (actionObj.text !== undefined && actionObj.text !== null && textArea) {
        var str = String(actionObj.text).trim();
        textArea.text = str;
        filter.set('argument', str);
    }

    // 2. Preset styles
    if (actionObj.preset) {
        var p = String(actionObj.preset).toLowerCase();
        if (p === "viral_youtube" || p === "youtube" || p === "viral") {
            filter.set('family', 'Impact');
            filter.set('weight', 900);
            filter.set('style', 'normal');
            filter.set('fgcolour', '#ffffeb3b');
            filter.set('bgcolour', '#00000000');
            filter.set('olcolour', '#ff000000');
            filter.set('outline', 8);
            filter.set('pad', 10);
            if (typeof textFilterUi !== 'undefined' && textFilterUi) {
                filter.set(textFilterUi.halignProperty, 'center');
                filter.set(textFilterUi.valignProperty, 'bottom');
                filter.set(textFilterUi.rectProperty, '10%/70%:80%x22%');
            }
        } else if (p === "breaking_news" || p === "news") {
            filter.set('family', 'Segoe UI');
            filter.set('weight', 700);
            filter.set('style', 'normal');
            filter.set('fgcolour', '#ffffffff');
            filter.set('bgcolour', '#e6b91c1c');
            filter.set('olcolour', '#ff000000');
            filter.set('outline', 2);
            filter.set('pad', 14);
            if (typeof textFilterUi !== 'undefined' && textFilterUi) {
                filter.set(textFilterUi.halignProperty, 'left');
                filter.set(textFilterUi.valignProperty, 'middle');
                filter.set(textFilterUi.rectProperty, '0%/82%:100%x14%');
            }
        } else if (p === "cinematic_gold" || p === "cinematic") {
            filter.set('family', 'Georgia');
            filter.set('weight', 700);
            filter.set('style', 'italic');
            filter.set('fgcolour', '#fffbbf24');
            filter.set('bgcolour', '#aa000000');
            filter.set('olcolour', '#44000000');
            filter.set('outline', 1);
            filter.set('pad', 16);
            if (typeof textFilterUi !== 'undefined' && textFilterUi) {
                filter.set(textFilterUi.halignProperty, 'center');
                filter.set(textFilterUi.valignProperty, 'middle');
                filter.set(textFilterUi.rectProperty, '15%/40%:70%x20%');
            }
        } else if (p === "cyberpunk_neon" || p === "neon" || p === "cyberpunk") {
            filter.set('family', 'Consolas');
            filter.set('weight', 700);
            filter.set('style', 'normal');
            filter.set('fgcolour', '#ff00ffff');
            filter.set('bgcolour', '#d9111827');
            filter.set('olcolour', '#ffec4899');
            filter.set('outline', 4);
            filter.set('pad', 12);
            if (typeof textFilterUi !== 'undefined' && textFilterUi) {
                filter.set(textFilterUi.halignProperty, 'center');
                filter.set(textFilterUi.valignProperty, 'middle');
                filter.set(textFilterUi.rectProperty, '10%/72%:80%x18%');
            }
        } else if (p === "clean_lower_third" || p === "lower_third") {
            filter.set('family', 'Segoe UI');
            filter.set('weight', 600);
            filter.set('style', 'normal');
            filter.set('fgcolour', '#ffffffff');
            filter.set('bgcolour', '#cc1e293b');
            filter.set('olcolour', '#00000000');
            filter.set('outline', 0);
            filter.set('pad', 14);
            if (typeof textFilterUi !== 'undefined' && textFilterUi) {
                filter.set(textFilterUi.halignProperty, 'left');
                filter.set(textFilterUi.valignProperty, 'middle');
                filter.set(textFilterUi.rectProperty, '6%/74%:58%x18%');
            }
        } else if (p === "subtitles_caption" || p === "subtitles" || p === "caption") {
            filter.set('family', 'Segoe UI');
            filter.set('weight', 700);
            filter.set('style', 'normal');
            filter.set('fgcolour', '#ffffffff');
            filter.set('bgcolour', '#b3000000');
            filter.set('olcolour', '#ff000000');
            filter.set('outline', 2);
            filter.set('pad', 8);
            if (typeof textFilterUi !== 'undefined' && textFilterUi) {
                filter.set(textFilterUi.halignProperty, 'center');
                filter.set(textFilterUi.valignProperty, 'bottom');
                filter.set(textFilterUi.rectProperty, '10%/80%:80%x14%');
            }
        } else if (p === "minimalist_white" || p === "minimal") {
            filter.set('family', 'Segoe UI');
            filter.set('weight', 400);
            filter.set('style', 'normal');
            filter.set('fgcolour', '#ffffffff');
            filter.set('bgcolour', '#00000000');
            filter.set('olcolour', '#99000000');
            filter.set('outline', 2);
            filter.set('pad', 10);
            if (typeof textFilterUi !== 'undefined' && textFilterUi) {
                filter.set(textFilterUi.halignProperty, 'center');
                filter.set(textFilterUi.valignProperty, 'middle');
                filter.set(textFilterUi.rectProperty, '10%/45%:80%x15%');
            }
        } else if (p === "retro_synthwave" || p === "synthwave") {
            filter.set('family', 'Impact');
            filter.set('weight', 700);
            filter.set('style', 'normal');
            filter.set('fgcolour', '#fff43f5e');
            filter.set('bgcolour', '#e61e1b4b');
            filter.set('olcolour', '#ff38bdf8');
            filter.set('outline', 5);
            filter.set('pad', 12);
            if (typeof textFilterUi !== 'undefined' && textFilterUi) {
                filter.set(textFilterUi.halignProperty, 'center');
                filter.set(textFilterUi.valignProperty, 'middle');
                filter.set(textFilterUi.rectProperty, '10%/35%:80%x25%');
            }
        }
    }

    // 3. Position / Geometry
    if (actionObj.position && typeof textFilterUi !== 'undefined' && textFilterUi) {
        var pos = String(actionObj.position).toLowerCase();
        if (pos === "top_banner" || pos === "top") {
            filter.set(textFilterUi.rectProperty, '0%/0%:100%x16%');
            filter.set(textFilterUi.valignProperty, 'top');
        } else if (pos === "center_title" || pos === "center" || pos === "middle") {
            filter.set(textFilterUi.rectProperty, '10%/38%:80%x24%');
            filter.set(textFilterUi.valignProperty, 'middle');
            filter.set(textFilterUi.halignProperty, 'center');
        } else if (pos === "lower_third" || pos === "bottom_left") {
            filter.set(textFilterUi.rectProperty, '6%/72%:60%x18%');
            filter.set(textFilterUi.valignProperty, 'middle');
            filter.set(textFilterUi.halignProperty, 'left');
        } else if (pos === "bottom_ticker" || pos === "bottom") {
            filter.set(textFilterUi.rectProperty, '0%/84%:100%x14%');
            filter.set(textFilterUi.valignProperty, 'middle');
        } else if (pos === "full_screen") {
            filter.set(textFilterUi.rectProperty, '0%/0%:100%x100%');
            filter.set(textFilterUi.valignProperty, 'middle');
            filter.set(textFilterUi.halignProperty, 'center');
        }
    }

    if (actionObj.geometry && typeof textFilterUi !== 'undefined' && textFilterUi) {
        filter.set(textFilterUi.rectProperty, String(actionObj.geometry));
    }

    // 4. Colors
    if (actionObj.fgcolour) filter.set('fgcolour', actionObj.fgcolour);
    if (actionObj.bgcolour) filter.set('bgcolour', actionObj.bgcolour);
    if (actionObj.olcolour) filter.set('olcolour', actionObj.olcolour);
    if (typeof actionObj.outline === 'number') filter.set('outline', Math.max(0, Math.min(30, actionObj.outline)));
    if (typeof actionObj.opacity === 'number') filter.set('opacity', Math.max(0, Math.min(1.0, actionObj.opacity)));

    // 5. Typography
    if (actionObj.family) filter.set('family', actionObj.family);
    if (actionObj.weight) {
        var w = String(actionObj.weight).toLowerCase();
        if (w === "bold" || w === "700") filter.set('weight', 700);
        else if (w === "black" || w === "900") filter.set('weight', 900);
        else if (w === "demibold" || w === "600") filter.set('weight', 600);
        else filter.set('weight', 400);
    }
    if (actionObj.style) filter.set('style', String(actionObj.style).toLowerCase() === 'italic' ? 'italic' : 'normal');
    if (typeof actionObj.pad === 'number') filter.set('pad', Math.max(0, actionObj.pad));

    // 6. Alignment
    if (typeof textFilterUi !== 'undefined' && textFilterUi) {
        if (actionObj.halign) filter.set(textFilterUi.halignProperty, String(actionObj.halign).toLowerCase());
        if (actionObj.valign) filter.set(textFilterUi.valignProperty, String(actionObj.valign).toLowerCase());
    }

    // 7. Animations
    if (typeof actionObj.animateIn === 'number') filter.animateIn = actionObj.animateIn;
    if (typeof actionObj.animateOut === 'number') filter.animateOut = actionObj.animateOut;

    filter.blockSignals = false;
    if (typeof setControlsCallback === 'function') {
        setControlsCallback();
    }
    if (typeof textFilterUi !== 'undefined' && textFilterUi && typeof textFilterUi.setControls === 'function') {
        textFilterUi.setControls();
    }
}
