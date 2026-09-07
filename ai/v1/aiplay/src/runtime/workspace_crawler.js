/**
 * Workspace Directory Crawler and Code View Renderer
 */
const { ipcRenderer } = require('electron');

async function crawlWorkspaceDirectory(folderPath, tabs, codeFileList, codeContentView, audio) {
  const scanResult = await ipcRenderer.invoke('scan-directory', folderPath);
  if (scanResult.success) {
    const sourceFiles = scanResult.files;
    tabs.renderFileList(codeFileList, codeContentView, sourceFiles, () => {
      if (audio && audio.playClickSound) audio.playClickSound();
    });
    return sourceFiles;
  }
  return [];
}

module.exports = {
  crawlWorkspaceDirectory
};
