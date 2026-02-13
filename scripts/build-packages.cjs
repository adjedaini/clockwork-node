#!/usr/bin/env node
/**
 * Build each internal package from its own directory so tsup uses that
 * package's tsconfig (composite + include), avoiding TS6307.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const packages = ['shared', 'core', 'transport-http'];

for (const name of packages) {
  const dir = path.join(rootDir, 'packages', name);
  if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
  console.log('Building @adjedaini/clockwork-' + name + '...');
  const r = spawnSync('npx', ['tsup'], {
    cwd: dir,
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('Packages built.');
