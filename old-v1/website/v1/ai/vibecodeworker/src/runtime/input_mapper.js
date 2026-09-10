/**
 * Key Code and Input Event Mapping Utility
 */

function getKeyCode(key) {
  const map = {
    'ArrowLeft': 'ArrowLeft',
    'ArrowRight': 'ArrowRight',
    'ArrowUp': 'ArrowUp',
    'ArrowDown': 'ArrowDown',
    'Space': 'Space',
    ' ': 'Space',
    'Enter': 'Enter',
    'Escape': 'Escape',
    'w': 'KeyW',
    'a': 'KeyA',
    's': 'KeyS',
    'd': 'KeyD',
    'Shift': 'ShiftLeft',
    'Control': 'ControlLeft',
    'Alt': 'AltLeft',
    'F5': 'F5',
    'F12': 'F12'
  };
  return map[key] || (key.length === 1 ? 'Key' + key.toUpperCase() : key);
}

module.exports = {
  getKeyCode
};
