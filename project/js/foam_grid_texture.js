// Utility to extract a frame from a grid PNG (no JSON needed)
// Usage: getFoamFrame(frameIndex, frameWidth, frameHeight, columns, imagePath)
// Example: getFoamFrame(4, 20, 20, 4, 'assets/generated/foam_splash_particles.png')

function getFoamFrame(frameIndex, frameWidth, frameHeight, columns, imagePath) {
    const x = (frameIndex % columns) * frameWidth;
    const y = Math.floor(frameIndex / columns) * frameHeight;
    const baseTexture = PIXI.BaseTexture.from(imagePath);
    return new PIXI.Texture(baseTexture, new PIXI.Rectangle(x, y, frameWidth, frameHeight));
}

// Example: create all foam frames from a 4x4 grid (16 frames, 20x20 each)
function generateFoamGridTextures(imagePath, frameWidth, frameHeight, columns, totalFrames) {
    const textures = [];
    for (let i = 0; i < totalFrames; i++) {
        textures.push(getFoamFrame(i, frameWidth, frameHeight, columns, imagePath));
    }
    return textures;
}

// Export for use in ParticleManager
window.getFoamFrame = getFoamFrame;
window.generateFoamGridTextures = generateFoamGridTextures;
