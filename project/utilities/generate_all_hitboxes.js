// generate_all_hitboxes.js
// Node.js script to auto-generate missing _hbox.json files for all _hbox.png overlays in assets

const fs = require('fs');
const path = require('path');

const { execSync } = require('child_process');
const { PNG } = require('pngjs');

// Set your assets directory and extraction script path
const assetsDir = path.join(__dirname, '../assets');
const extractScript = path.join(__dirname, 'extract_hitboxes.js');

fs.readdirSync(assetsDir).forEach(file => {
  if (file.endsWith('_hbox.png')) {
    const pngPath = path.join(assetsDir, file);
    const jsonPath = pngPath.replace(/\.png$/, '.json');
    // Always overwrite JSON
    try {
      const data = fs.readFileSync(pngPath);
      const png = PNG.sync.read(data);
      const height = png.height;
      console.log(`Extracting hitboxes for ${file} with frameWidth=${height}, frameHeight=${height}...`);
      execSync(`node "${extractScript}" "${pngPath}" ${height} ${height}`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`Failed to process ${file}:`, err);
    }
  }
});
console.log('All hitbox JSONs are up to date.');
