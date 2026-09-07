/**
 * Game Status Banner Controller
 */

function updateStatusBanner(bannerElement, text, type = 'ready') {
  if (!bannerElement) return;
  bannerElement.textContent = text;
  bannerElement.className = 'game-status-banner';
  if (type === 'ready') {
    bannerElement.classList.add('banner-ready');
  } else if (type === 'active') {
    bannerElement.classList.add('banner-active');
  }
}

module.exports = {
  updateStatusBanner
};
