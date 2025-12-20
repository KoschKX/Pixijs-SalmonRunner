// Node.js script to generate a spritesheet PNG and JSON atlas for foam and splash particles using node-canvas
// Usage: node tools/generate_particles_png.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../assets/generated');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Particle definitions: [name, radius, color, alpha]
const particles = [
  ...[0, 1, 2, 3, 4, 6, 8].map(size => [`foam_${size}`, size, 'white', 0.8]),
  ...[2, 4, 6, 8].map(size => [`splash_${size}`, size, 'white', 1.0])
];

// Layout: simple grid
const padding = 2;
const cols = 4;
const cellSize = 20; // Max particle size + padding
const rows = Math.ceil(particles.length / cols);
const sheetWidth = cols * cellSize;
const sheetHeight = rows * cellSize;

const sheetCanvas = createCanvas(sheetWidth, sheetHeight);
const ctx = sheetCanvas.getContext('2d');

const atlas = { frames: {} };

particles.forEach(([name, radius, color, alpha], i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x = col * cellSize;
  const y = row * cellSize;
  const size = radius * 2 + padding;
  // Center the circle in the cell
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Record frame in atlas
  atlas.frames[name] = {
    frame: { x: x, y: y, w: cellSize, h: cellSize },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: cellSize, h: cellSize },
    sourceSize: { w: cellSize, h: cellSize }
  };
});

// Save spritesheet PNG
const outPng = fs.createWriteStream(path.join(outputDir, 'particlesheet.png'));
const stream = sheetCanvas.createPNGStream();
stream.pipe(outPng);
outPng.on('finish', () => console.log('Created particlesheet.png'));

// Save atlas JSON
fs.writeFileSync(path.join(outputDir, 'particlesheet.json'), JSON.stringify(atlas, null, 2));
console.log('Created particlesheet.json');

console.log('Done!');
