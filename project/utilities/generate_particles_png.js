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

const atlas = {
  frames: {},
  meta: {
    app: "generate_particles_png.js",
    version: "1.0",
    image: "foam_splash_particles.png",
    format: "RGBA8888",
    size: { w: sheetWidth, h: sheetHeight },
    scale: "1"
  }
};

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

// Save foam/splash particles PNG and JSON
const foamPngName = 'foam_splash_particles.png';
const foamJsonName = 'foam_splash_particles.json';
const outFoamPng = fs.createWriteStream(path.join(outputDir, foamPngName));
const foamStream = sheetCanvas.createPNGStream();
foamStream.pipe(outFoamPng);
outFoamPng.on('finish', () => console.log('Created ' + foamPngName));
atlas.meta.image = foamPngName;
fs.writeFileSync(path.join(outputDir, foamJsonName), JSON.stringify(atlas, null, 2));
console.log('Created ' + foamJsonName);

// Optionally generate water circles spritesheet and JSON
function generateWaterCircles() {
  // Water circle sizes
  const sizes = [8, 16, 24, 32, 40, 48, 56];
  const padding = 2;
  const cols = 4;
  const cellSize = 60;
  const rows = Math.ceil(sizes.length / cols);
  const sheetWidth = cols * cellSize;
  const sheetHeight = rows * cellSize;
  const canvas = createCanvas(sheetWidth, sheetHeight);
  const ctx = canvas.getContext('2d');
  const atlas = {
    frames: {},
    meta: {
      app: "generate_particles_png.js",
      version: "1.0",
      image: "water_circles.png",
      format: "RGBA8888",
      size: { w: sheetWidth, h: sheetHeight },
      scale: "1"
    }
  };
  sizes.forEach((radius, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellSize;
    const y = row * cellSize;
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    atlas.frames[`water_circle_${radius}`] = {
      frame: { x: x, y: y, w: cellSize, h: cellSize },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: cellSize, h: cellSize },
      sourceSize: { w: cellSize, h: cellSize }
    };
  });
  // Save PNG and JSON
  const pngName = 'water_circles.png';
  const jsonName = 'water_circles.json';
  const outPng = fs.createWriteStream(path.join(outputDir, pngName));
  const stream = canvas.createPNGStream();
  stream.pipe(outPng);
  outPng.on('finish', () => console.log('Created ' + pngName));
  atlas.meta.image = pngName;
  fs.writeFileSync(path.join(outputDir, jsonName), JSON.stringify(atlas, null, 2));
  console.log('Created ' + jsonName);
}

generateWaterCircles();

console.log('Done!');
