/**
 * Native Process Scanner and Selector Binding
 */
const { ipcRenderer } = require('electron');

async function scanNativeProcesses(nativeProcessSelect, logCallback) {
  if (logCallback) logCallback('Scanning running native processes...');
  const result = await ipcRenderer.invoke('scan-processes');
  if (result.success) {
    nativeProcessSelect.innerHTML = '<option value="">-- Scan / Select Game Window --</option>';
    if (result.processes && result.processes.length > 0) {
      result.processes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.MainWindowTitle;
        opt.textContent = `${p.ProcessName} (PID: ${p.Id}) - "${p.MainWindowTitle}"`;
        nativeProcessSelect.appendChild(opt);
      });
      if (logCallback) logCallback(`Found ${result.processes.length} windowed processes.`);
    } else {
      if (logCallback) logCallback('No windowed processes found.');
    }
  } else {
    if (logCallback) logCallback(`Scanning failed: ${result.error}`, 'error');
  }
}

module.exports = {
  scanNativeProcesses
};
