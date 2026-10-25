const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

// Ensure dist directory exists and is fresh
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Static assets to copy for production web / Android distribution
const filesToCopy = [
  'index.html',
  'firebase-config.js',
  'firebase-app-compat.js',
  'firebase-auth-compat.js',
  'firebase-firestore-compat.js',
  'exceljs.min.js',
  'xlsx.full.min.js',
  'manifest.json',
  'sw.js',
  'version.json'
];

filesToCopy.forEach(file => {
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
});

// Copy icons folder recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirectory(path.join(rootDir, 'icons'), path.join(distDir, 'icons'));

console.log('Successfully prepared web assets in dist/ directory.');
