#!/usr/bin/env node
'use strict';
const { installLatestStableGodot } = require('../lib/godot_runtime');
installLatestStableGodot({ installRoot: process.env.GODOT_INSTALL_ROOT || '/opt/godot' })
  .then((result) => process.stdout.write(JSON.stringify(result) + '\n'))
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
