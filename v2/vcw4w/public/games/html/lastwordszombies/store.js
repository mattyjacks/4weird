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
  
  function render() {
    if (!container || !storeCoins) return;
    container.innerHTML = '';
    storeCoins.innerText = stateManager.coins;
    
    const activeTabButton = document.querySelector('.store-tabs .tab-btn.active');
    if (!activeTabButton) return;
    
    const category = activeTabButton.dataset.tab;
    const items = StoreItems[category];
    
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'store-card';
      const price = Number(item.price) || 0;

      const isOwned = stateManager.ownedItems.includes(item.id);
      let isEquipped = false;
      if (category === 'blood') isEquipped = stateManager.equippedBlood === item.id;
      if (category === 'fonts') isEquipped = stateManager.equippedFont === item.id;
      if (category === 'music') isEquipped = stateManager.equippedMusic === item.id;

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
      actionButton.addEventListener('click', () => {
        if (!isOwned) {
          if (stateManager.buyItem(item.id, price)) {
            audioManager.playSFX('type');
            stateManager.equipItem(category, item.id);
            render();
          } else {
            audioManager.playSFX('error');
          }
        } else {
          stateManager.equipItem(category, item.id);
          audioManager.playSFX('type');

          if (category === 'music') {
            audioManager.startSynthMusic();
          }
          render();
        }
        // Keep Space for gameplay: never leave focus on a store button
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      });
      
      container.appendChild(card);
    });
  }
  
  document.querySelectorAll('.store-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.store-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      audioManager.playSFX('type');
      render();
    });
  });
  
  return {
    render
  };
}
