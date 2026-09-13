// WIRING: require from app/main.js did-finish-load CLI-forward block — e.g. const { forwardGameArgs } = require('./vcwcode-cli-forward-note');
'use strict';

// forwardGameArgs(argv, cliOpts) -> string[]
// Pure mirror of the did-finish-load forward in main.js:
//   const forwarded = [...process.argv];
//   if (cliOpts.game && !forwarded.includes('--game')) forwarded.push('--game', cliOpts.game);
//   if (cliOpts.autoplay && !forwarded.includes('--start-agent')) forwarded.push('--start-agent');
// Adds --game <id> / --start-agent only when missing. Never mutates inputs.
function forwardGameArgs(argv, cliOpts) {
  const forwarded = Array.isArray(argv) ? [...argv] : [];
  const opts = cliOpts && typeof cliOpts === 'object' ? cliOpts : {};
  if (opts.game && !forwarded.includes('--game')) forwarded.push('--game', opts.game);
  if (opts.autoplay && !forwarded.includes('--start-agent')) forwarded.push('--start-agent');
  return forwarded;
}

module.exports = { forwardGameArgs };
