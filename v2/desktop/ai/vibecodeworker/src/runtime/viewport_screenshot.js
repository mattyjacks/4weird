/**
 * Viewport Screenshot Utility for Internal & External Windows
 */
const { ipcRenderer } = require('electron');

async function captureViewportScreenshot(nativeProcessSelect, webviewElement) {
  const nativeProcess = nativeProcessSelect ? nativeProcessSelect.value : null;
  if (nativeProcess) {
    const nativeShot = await ipcRenderer.invoke('capture-native-screenshot', nativeProcess);
    if (nativeShot.success) {
      return nativeShot.base64;
    }
    return null;
  }
  
  const isGameWindowActive = await ipcRenderer.invoke('is-game-window-active');
  if (isGameWindowActive) {
    try {
      return await ipcRenderer.invoke('capture-game-screenshot');
    } catch (e) {
      console.warn("Failed to capture separate game window", e);
    }
  }
  
  if (webviewElement) {
    try {
      const img = await webviewElement.capturePage();
      const resized = img.resize({ width: 512 });
      return resized.toJPEG(50).toString('base64');
    } catch (e) {
      console.warn("Failed to capture webview page", e);
    }
  }
  return null;
}

module.exports = {
  captureViewportScreenshot
};
