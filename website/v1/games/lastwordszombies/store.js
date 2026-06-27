export const StoreItems = {
  blood: [
    { name: "Neon Green", id: "default", price: 0, color: "#00ff66" },
    { name: "Plasma Blue", id: "plasma", price: 50, color: "#00ccff" },
    { name: "Inferno Red", id: "inferno", price: 100, color: "#ff0055" },
    { name: "Void Purple", id: "void", price: 180, color: "#bb00ff" }
  ],
  fonts: [
    { name: "Default Outfit", id: "default", cssClass: "font-outfit" },
    { name: "Retro Console", id: "pixel", price: 30, cssClass: "font-pixel" },
    { name: "Vapor Cyber", id: "cyber", price: 80, cssClass: "font-cyber" }
  ],
  music: [
    { name: "Dark Synth", id: "default", price: 0 },
    { name: "Industrial Bass", id: "industrial", price: 120 }
  ]
};

export function setupStore(stateManager, audioManager) {
  const container = document.getElementById('store-items-container');
  const storeCoins = document.getElementById('store-coins');
  
  function render() {
    container.innerHTML = '';
    storeCoins.innerText = stateManager.coins;
    
    // Get currently active tab category
    const activeTabButton = document.querySelector('.tab-btn.active');
    if (!activeTabButton) return;
    
    const category = activeTabButton.dataset.tab;
    const items = StoreItems[category];
    
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'store-card';
      
      const isOwned = stateManager.ownedItems.includes(item.id);
      
      // Determine what item is currently equipped
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
        priceLabel = `${item.price} Coins`;
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
      } else if (stateManager.coins < item.price) {
        btnDisabled = true;
      }
      
      // Card color indicators (e.g. for blood)
      let indicator = '';
      if (category === 'blood') {
        indicator = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${item.color}; margin-right:8px; box-shadow: 0 0 6px ${item.color}"></span>`;
      }
      
      card.innerHTML = `
        <div class="store-card-info">
          <h3>${indicator}${item.name}</h3>
          <p>${priceLabel}</p>
        </div>
        <button class="${btnClass}" ${btnDisabled ? 'disabled' : ''}>
          ${btnText}
        </button>
      `;
      
      const actionButton = card.querySelector('button');
      actionButton.addEventListener('click', () => {
        if (!isOwned) {
          // Attempt purchase
          if (stateManager.buyItem(item.id, item.price)) {
            audioManager.playSFX('type'); // sound confirm
            stateManager.equipItem(category, item.id);
            render();
          } else {
            audioManager.playSFX('error');
          }
        } else {
          // Equip owned item
          stateManager.equipItem(category, item.id);
          audioManager.playSFX('type');
          
          // Re-trigger sequencer setup if music selection changed
          if (category === 'music') {
            audioManager.startSynthMusic();
          }
          
          render();
        }
      });
      
      container.appendChild(card);
    });
  }
  
  // Wire up tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      audioManager.playSFX('type');
      render();
    });
  });
  
  // Expose manual render capability
  return {
    render
  };
}
