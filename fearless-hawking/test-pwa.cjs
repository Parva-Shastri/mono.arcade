const fs = require('fs');
const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!viteConfig.includes('VitePWA')) {
  console.error('VitePWA not found in vite.config.ts');
  process.exit(1);
}

if (!packageJson.devDependencies['vite-plugin-pwa'] && !packageJson.dependencies['vite-plugin-pwa']) {
  console.error('vite-plugin-pwa not found in package.json');
  process.exit(1);
}

const indexHtml = fs.readFileSync('index.html', 'utf8');

if (!indexHtml.includes('rel="apple-touch-icon"')) {
  console.error('apple-touch-icon not found in index.html');
  process.exit(1);
}

console.log('PWA configured correctly');
