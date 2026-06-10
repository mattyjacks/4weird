const fs = require('fs');
const path = require('path');

function switchTab(tab, elements, audioModule, populateAutoCodeSelectCallback) {
  audioModule.playClickSound();
  
  elements.tabLogs.classList.remove('active');
  elements.tabCode.classList.remove('active');
  elements.tabAutoCode.classList.remove('active');
  elements.logStream.classList.add('hidden');
  elements.codeStream.classList.add('hidden');
  elements.autocodeStream.classList.add('hidden');

  if (tab === 'logs') {
    elements.tabLogs.classList.add('active');
    elements.logStream.classList.remove('hidden');
  } else if (tab === 'code') {
    elements.tabCode.classList.add('active');
    elements.codeStream.classList.remove('hidden');
  } else if (tab === 'autocode') {
    elements.tabAutoCode.classList.add('active');
    elements.autocodeStream.classList.remove('hidden');
    if (populateAutoCodeSelectCallback) populateAutoCodeSelectCallback();
  }
}

function renderFileList(codeFileList, codeContentView, sourceFiles, onFileSelectCallback) {
  codeFileList.innerHTML = '';
  if (sourceFiles.length === 0) {
    codeFileList.innerHTML = `<div class="empty-state">No source files crawled yet. Select and run a local game demo.</div>`;
    return;
  }

  sourceFiles.forEach((file) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.textContent = file.path;
    item.addEventListener('click', () => {
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      codeContentView.textContent = file.content;
      if (onFileSelectCallback) onFileSelectCallback(file);
    });
    codeFileList.appendChild(item);
  });
}

module.exports = {
  switchTab,
  renderFileList
};
