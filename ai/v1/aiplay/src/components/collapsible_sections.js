/**
 * UI Collapsible Sections Manager
 */

function setupCollapsibleSections(audio) {
  const headers = document.querySelectorAll('.section-header');
  const savedPrefs = JSON.parse(localStorage.getItem('sectionPrefs') || '{}');

  headers.forEach(header => {
    const sectionId = header.dataset.section;
    const content = document.getElementById(sectionId);
    if (!content) return;
    const toggle = header.querySelector('.section-toggle');

    const isOpen = savedPrefs[sectionId] !== undefined ? savedPrefs[sectionId] : (sectionId === 'llm-settings');

    if (!isOpen) {
      content.classList.add('hidden');
      if (toggle) toggle.textContent = '>';
    }

    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('help-icon')) return;
      const isCurrentlyOpen = !content.classList.contains('hidden');

      if (isCurrentlyOpen) {
        content.classList.add('hidden');
        if (toggle) toggle.textContent = '>';
      } else {
        content.classList.remove('hidden');
        if (toggle) toggle.textContent = 'v';
      }

      savedPrefs[sectionId] = !isCurrentlyOpen;
      localStorage.setItem('sectionPrefs', JSON.stringify(savedPrefs));

      if (audio && audio.playClickSound) {
        audio.playClickSound();
      }
    });
  });
}

module.exports = {
  setupCollapsibleSections
};
