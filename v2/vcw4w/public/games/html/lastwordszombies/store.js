const StoreItems = {
  blood: [
    { name: "Acid Glow", id: "default", price: 0, color: "#00ff66" },
    { name: "Plasma Blue", id: "plasma", price: 50, color: "#00ccff" },
    { name: "Inferno Red", id: "inferno", price: 100, color: "#ff0055" },
    { name: "Void Purple", id: "void", price: 180, color: "#bb00ff" },
    { name: "Gold Rush", id: "gold", price: 250, color: "#fcf003" },
    { name: "Toxic Lime", id: "toxic", price: 320, color: "#a3ff00" }
  ],
  fonts: [
    { name: "Cyber Decrypt", id: "default", cssClass: "font-outfit" },
    { name: "Retro Terminal", id: "pixel", price: 30, cssClass: "font-pixel" },
    { name: "Vapor Neon", id: "cyber", price: 80, cssClass: "font-cyber" }
  ],
  music: [
    { name: "Dark Synth", id: "default", price: 0 },
    { name: "Industrial Bass", id: "industrial", price: 120 }
  ]
};

function setupStore(stateManager, audioManager) {
  const container = document.getElementById('store-items-container');
  const storeCoins = document.getElementById('store-coins');

  // Audio is optional: store clicks must never throw when audio is absent.
  function sfx(name) {
    try {
      if (audioManager && typeof audioManager.playSFX === 'function') audioManager.playSFX(name);
    } catch (e) { /* cosmetic only */ }
  }

  function render() {
    // Null-safe: store DOM may be absent (partial page / test harness).
    if (!container || !storeCoins) return;
    container.innerHTML = '';
    storeCoins.innerText = stateManager.coins;

    let activeTabButton = null;
    try {
      activeTabButton = document.querySelector('.store-tabs .tab-btn.active');
    } catch (e) { activeTabButton = null; }
    if (!activeTabButton) return;

    const category = activeTabButton.dataset ? activeTabButton.dataset.tab : null;
    const items = (StoreItems && StoreItems[category]) || null;
    // Unknown tab value -> render nothing rather than throwing on undefined.
    if (!Array.isArray(items)) return;

    const owned = Array.isArray(stateManager.ownedItems) ? stateManager.ownedItems : [];

    items.forEach(item => {
      if (!item || typeof item.id !== 'string' || item.id.length === 0) return;
      const card = document.createElement('div');
      card.className = 'store-card';
      // Numeric price fallback: missing/NaN/negative prices are FREE, never credit.
      const rawPrice = Number(item.price);
      const price = (isFinite(rawPrice) && rawPrice > 0) ? Math.floor(rawPrice) : 0;

      const isOwned = owned.includes(item.id);
      // Equipped implies owned: a corrupt equipped id for an unowned item
      // renders as buyable, never as EQUIPPED.
      let isEquipped = false;
      if (isOwned) {
        if (category === 'blood') isEquipped = stateManager.equippedBlood === item.id;
        if (category === 'fonts') isEquipped = stateManager.equippedFont === item.id;
        if (category === 'music') isEquipped = stateManager.equippedMusic === item.id;
      }

      let priceLabel = '';
      if (isEquipped) {
        priceLabel = 'EQUIPPED';
      } else if (isOwned) {
        priceLabel = 'OWNED';
      } else {
        priceLabel = price === 0 ? 'FREE' : `${price} Credits`;
      }

      let btnText = 'Buy';
      let btnClass = 'btn-buy';
      let btnDisabled = false;

      if (isEquipped) {
        btnText = 'Equipped';
        btnDisabled = true;
      } else if (isOwned) {
        btnText = 'Equip';
        btnClass = 'btn-equip';
      } else if (stateManager.coins < price) {
        btnDisabled = true;
      }
      
      let indicator = '';
      if (category === 'blood') {
        indicator = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${item.color}; margin-right:8px; box-shadow: 0 0 6px ${item.color}"></span>`;
      }
      
      card.innerHTML = `
        <div class="store-card-info">
          <h3 style="color:#fff;">${indicator}${item.name}</h3>
          <p>${priceLabel}</p>
        </div>
        <button class="${btnClass}" ${btnDisabled ? 'disabled' : ''}>
          ${btnText}
        </button>
      `;
      
      const actionButton = card.querySelector('button');
      if (!actionButton) return;
      actionButton.addEventListener('click', () => {
        if (!isOwned) {
          if (stateManager.buyItem(item.id, price)) {
            sfx('type');
            stateManager.equipItem(category, item.id);
            render();
          } else {
            sfx('error');
          }
        } else {
          stateManager.equipItem(category, item.id);
          sfx('type');

          if (category === 'music') {
            try {
              if (audioManager && typeof audioManager.startSynthMusic === 'function') {
                audioManager.startSynthMusic();
              }
            } catch (e) { /* cosmetic only */ }
          }
          render();
        }
        // Keep Space for gameplay: never leave focus on a store button
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      });
      
      container.appendChild(card);
    });
  }
  
  let tabButtons = [];
  try {
    tabButtons = document.querySelectorAll('.store-tabs .tab-btn');
  } catch (e) { tabButtons = []; }
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = (e && e.currentTarget) || btn;
      try {
        document.querySelectorAll('.store-tabs .tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        if (target && target.classList) { target.classList.add('active'); target.setAttribute('aria-selected', 'true'); }
      } catch (err) { /* DOM optional */ }
      sfx('type');
      render();
    });
  });
  
  return {
    render
  };
}
