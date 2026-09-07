/**
 * Quick Launcher Grid Renderer
 */

function populateQuickLaunchGrid(gridElement, demoGameSelect, onSelectCallback) {
  if (!gridElement || !demoGameSelect) return;
  gridElement.innerHTML = '';
  
  const options = Array.from(demoGameSelect.options).filter(opt => opt.value);
  if (options.length === 0) return;
  
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary btn-small quick-launch-btn';
    const isPage = opt.dataset.type === 'page';
    btn.textContent = isPage ? ('[Doc] View ' + opt.textContent) : ('[Game] Play ' + opt.textContent);
    btn.addEventListener('click', () => {
      demoGameSelect.value = opt.value;
      if (onSelectCallback) onSelectCallback(opt.value);
    });
    gridElement.appendChild(btn);
  });
}

module.exports = {
  populateQuickLaunchGrid
};
