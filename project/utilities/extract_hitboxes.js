// extract_racoon_hitboxes.js
const fs = require('fs');
const { PNG } = require('pngjs');
const path = require('path');


// Usage: node extract_hitboxes.js <pngPath> <frameWidth> <frameHeight>
if (process.argv.length < 5) {
  console.error('Usage: node extract_hitboxes.js <pngPath> <frameWidth> <frameHeight>');
  process.exit(1);
}

const pngPath = process.argv[2];
const FRAME_WIDTH = parseInt(process.argv[3], 10);
const FRAME_HEIGHT = parseInt(process.argv[4], 10);

const folder = path.dirname(pngPath);
const base = path.basename(pngPath, path.extname(pngPath));
const jsonPath = path.join(folder, base + '.json');

fs.createReadStream(pngPath)
  .pipe(new PNG())
  .on('parsed', function () {
    const FRAME_COUNT = Math.floor(this.width / FRAME_WIDTH);
    if (FRAME_COUNT < 1) {
      console.error('Error: Frame width is larger than image width or no frames detected.');
      process.exit(1);
    }
    const frames = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      const x0 = i * FRAME_WIDTH;
      // Prepare a mask for visited pixels
      const visited = Array.from({ length: FRAME_HEIGHT }, () => Array(FRAME_WIDTH).fill(false));
      const hitboxes = [];
      for (let y = 0; y < FRAME_HEIGHT; y++) {
        for (let x = 0; x < FRAME_WIDTH; x++) {
          const px = (this.width * (y) + (x0 + x)) << 2;
          const r = this.data[px], g = this.data[px + 1], b = this.data[px + 2], a = this.data[px + 3];
          if (!visited[y][x] && r === 255 && g === 0 && b === 0 && a > 0) {
            // Start a flood fill to find the bounding box of this region
            let minX = x, minY = y, maxX = x, maxY = y;
            const stack = [[x, y]];
            visited[y][x] = true;
            while (stack.length > 0) {
              const [cx, cy] = stack.pop();
              // Check neighbors
              for (const [dx, dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < FRAME_WIDTH && ny >= 0 && ny < FRAME_HEIGHT && !visited[ny][nx]) {
                  const npx = (this.width * (ny) + (x0 + nx)) << 2;
                  const nr = this.data[npx], ng = this.data[npx + 1], nb = this.data[npx + 2], na = this.data[npx + 3];
                  if (nr === 255 && ng === 0 && nb === 0 && na > 0) {
                    visited[ny][nx] = true;
                    stack.push([nx, ny]);
                    if (nx < minX) minX = nx;
                    if (ny < minY) minY = ny;
                    if (nx > maxX) maxX = nx;
                    if (ny > maxY) maxY = ny;
                  }
                }
              }
            }
            hitboxes.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
          }
        }
      }
      frames.push(hitboxes.length > 0 ? hitboxes : null);
    }
    fs.writeFileSync(jsonPath, JSON.stringify({ frames }, null, 2));
    console.log('Hitbox extraction complete:', frames);
    console.log('Saved to:', jsonPath);
  });