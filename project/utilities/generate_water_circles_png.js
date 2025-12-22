// Node.js script to generate a spritesheet PNG and JSON atlas for water circles only
// Usage: node generate_water_circles_png.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../assets/generated');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Water circle definitions: [name, radius, color, alpha]
const strokeWidth = 3;
const padding = 8;
const waterCircles = [
  ...[8, 16, 24, 32, 40, 48, 56].map(size => ({
    name: `water_circle_${size}`,
    radius: size,
    frame: (size * 2) + (strokeWidth * 2) + padding
  }))
];

// Layout: simple grid
const cols = 4;
const rows = Math.ceil(waterCircles.length / cols);
const cellSizes = waterCircles.map(c => c.frame);
const maxCellSize = Math.max(...cellSizes);
const sheetWidth = cols * maxCellSize;
const sheetHeight = rows * maxCellSize;

const sheetCanvas = createCanvas(sheetWidth, sheetHeight);
const ctx = sheetCanvas.getContext('2d');

const atlas = { frames: {} };

waterCircles.forEach((circle, i) => {
  const { name, radius, frame } = circle;
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x = col * maxCellSize;
  const y = row * maxCellSize;
  // Center the circle in the cell
  const cx = x + frame / 2;
  const cy = y + frame / 2;
  ctx.save();
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = 'white';
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Record frame in atlas
  atlas.frames[name] = {
    frame: { x: x, y: y, w: frame, h: frame },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: frame, h: frame },
    sourceSize: { w: frame, h: frame }
  };
});

// Save spritesheet PNG
const outPng = fs.createWriteStream(path.join(outputDir, 'water_circles.png'));
const stream = sheetCanvas.createPNGStream();
stream.pipe(outPng);
outPng.on('finish', () => console.log('Created water_circles.png'));

// Save atlas JSON
fs.writeFileSync(path.join(outputDir, 'water_circles.json'), JSON.stringify(atlas, null, 2));
console.log('Created water_circles.json');

console.log('Done!');
