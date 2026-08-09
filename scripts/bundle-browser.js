const fs = require('fs');
const path = require('path');

const { chromium } = require('playwright');

const BROWER_REVISION_DIR = path.dirname(path.dirname(chromium.executablePath()));
const PROJECT_BROWSERS_DIR = path.join(__dirname, '..', 'browsers');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(p);
    else total += fs.statSync(p).size;
  }
  return total;
}

(async () => {
  try {
    if (!fs.existsSync(BROWER_REVISION_DIR)) {
      console.error(`No se encontró el navegador en: ${BROWER_REVISION_DIR}`);
      console.error('Ejecuta primero: npx playwright install chromium');
      process.exit(1);
    }

    const targetDir = path.join(PROJECT_BROWSERS_DIR, path.basename(BROWER_REVISION_DIR));

    console.log(`Copiando ${BROWER_REVISION_DIR.slice(0, 60)}... -> ${targetDir}`);
    copyDir(BROWER_REVISION_DIR, targetDir);

    const mb = (dirSize(targetDir) / 1024 / 1024).toFixed(1);
    console.log(`Navegador preparado correctamente: ${targetDir} (${mb} MB)`);
  } catch (e) {
    console.error('Error copiando el navegador:', e);
    process.exit(1);
  }
})();