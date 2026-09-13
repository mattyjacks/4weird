// WIRING: require from app/main.js single-instance block (top of file) + app.on('second-instance') — e.g. const { shouldQuit } = require('./vcwcode-single-instance-note');
'use strict';

// main.js pattern (do NOT duplicate in main.js; integrator wires it):
//   const hasSingleInstanceLock = app.requestSingleInstanceLock();
//   if (!hasSingleInstanceLock) app.quit();
//   app.on('second-instance', () => {
//     if (!mainWindow || mainWindow.isDestroyed()) return;
//     if (mainWindow.isMinimized()) mainWindow.restore();
//     mainWindow.show();
//     mainWindow.focus();
//   });
// Rationale: both batch entry points converge on this app; a second click,
// stale shortcut, or concurrent batch run must focus the existing dashboard
// instead of opening a duplicate.

// shouldQuit(hasSingleInstanceLock) -> boolean — pure: quit when lock lost.
function shouldQuit(hasSingleInstanceLock) {
  return !hasSingleInstanceLock;
}

// planSecondInstanceFocus(win) -> string[] — pure planner for the
// 'second-instance' handler. `win` is { exists, destroyed, minimized }.
// Returns the ordered action names: ['restore']? + ['show', 'focus'].
function planSecondInstanceFocus(win) {
  if (!win || !win.exists || win.destroyed) return [];
  const actions = [];
  if (win.minimized) actions.push('restore');
  actions.push('show', 'focus');
  return actions;
}

module.exports = { shouldQuit, planSecondInstanceFocus };
