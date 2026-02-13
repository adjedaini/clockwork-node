#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const uiDist = path.join(rootDir, 'packages', 'ui', 'dist');
const publicDir = path.join(rootDir, 'dist', 'public');

if (!fs.existsSync(uiDist)) {
  console.warn('Clockwork: packages/ui/dist not found — run build:ui first.');
  process.exit(1);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(path.join(rootDir, 'dist'))) {
  console.warn('Clockwork: dist/ not found — run build:root first.');
  process.exit(1);
}

copyRecursive(uiDist, publicDir);
console.log('Clockwork: copied UI to dist/public');
