// Stone.js
// Represents a stone (island/rock) in the river
// Requires Sprite.js to be loaded first
class Stone extends Sprite {
    static stonesTexture = null;
    static stonesHitboxData = null;
    
    // Load textures and hitbox data for all Stone instances
    static async initAssets(resources) {
        Stone.stonesTexture = resources['stones'];
        Stone.stonesHitboxData = resources['stones_hbox'];
    }
    
    constructor() {
        super();
        this.label = 'island';
        this.type = 'rock';
        this.debugColor = 0xffff00;
        // Spritesheet: 6 stones in a row, each 256x256
        const frameWidth = 256;
        const frameHeight = 256;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        // Pick a random stone frame (0-5)
        const stoneIndex = Math.floor(Math.random() * 6);
        const col = stoneIndex;
        const row = 0;
        const stonesTexture = Stone.stonesTexture;
        if (!stonesTexture) {
            throw new Error("Stone textures not initialized. Call Stone.initAssets() after preloading and before creating Stone instances, and ensure the 'stones' resource is present.");
        }
        // Create a sub-texture for this stone
        const stoneTexture = new PIXI.Texture({
            source: stonesTexture.source,
            frame: new PIXI.Rectangle(
                col * frameWidth,
                row * frameHeight,
                frameWidth,
                frameHeight
            )
        });
        const sprite = new PIXI.Sprite(stoneTexture);
        sprite.anchor.set(0.5);
        // Randomize scale for visual variety
        const scale = 0.3 + Math.random() * 0.4;
        sprite.scale.set(scale);
        this.sprite = sprite; // Used by base class for debug overlay
        this.addChild(sprite);
        // Create wave animation (3 expanding circles per stone)
        const waveContainer = new PIXI.Container();
        waveContainer.zIndex = 3; // Waves below banks (10), above water (0)
        waveContainer.x = 0;
        waveContainer.y = 0;
        for (let i = 0; i < 3; i++) {
            const wave = new PIXI.Graphics();
            wave.label = `wave${i}`;
            wave.alpha = 0;
            wave.startDelay = i * 20; // Stagger wave animation start
            wave.lifetime = 0;
            waveContainer.addChild(wave);
        }
        this.waveContainer = waveContainer;
        this.sortableChildren = true;
        // Set a fallback hitbox immediately
        const fallbackHitbox = {
            x: 0,
            y: 0,
            width: frameWidth,
            height: frameHeight
        };
        this.hitboxFrames = { frames: [fallbackHitbox] };
        this.setHitbox(fallbackHitbox, scale);
        this.collisionRadius = frameWidth * scale / 2;
        this.container.hitboxData = fallbackHitbox;
        // Use preloaded hitbox data if available
        const hitboxData = Stone.stonesHitboxData;
        let hitboxObj;
        let hitbox;
        if (!hitboxData || !hitboxData.frames || !Array.isArray(hitboxData.frames)) {
            throw new Error("Stone.stonesHitboxData is undefined or invalid. Call Stone.initAssets() after preloading and before creating Stone instances, and ensure the 'stones_hbox' or 'rock_hbox' resource is present and valid.");
        }
        if (hitboxData.frames[stoneIndex] && hitboxData.frames[stoneIndex][0]) {
            hitboxObj = hitboxData.frames[stoneIndex][0];
            hitbox = {
                x: hitboxObj.x,
                y: hitboxObj.y,
                width: hitboxObj.width,
                height: hitboxObj.height
            };
            this.hitboxFrames = { frames: [hitbox] };
            this.setHitbox(hitbox, scale);
            this.collisionRadius = Math.max(hitboxObj.width, hitboxObj.height) * scale / 2;
        } else {
            hitbox = {
                x: 0,
                y: 0,
                width: frameWidth,
                height: frameHeight
            };
            this.hitboxFrames = { frames: [hitbox] };
            this.setHitbox(hitbox, scale);
            this.collisionRadius = frameWidth * scale / 2;
        }
        this.container.hitboxData = hitbox;
    }

    // Get the container holding the stone's wave effect
    getWaveContainer() {
        return this.waveContainer;
    }

    update(inView = true) {
        super.update(inView);

        // Stone stays at a fixed position in world space (no scrolling)
        // Sync wave container position with the stone
        if (this.container.waveContainer) {
            this.container.waveContainer.x = this.container.x;
            this.container.waveContainer.y = this.container.y;
            // Update wave animations (3 per stone, no frame skipping needed)
            this.container.waveContainer.children.forEach(wave => {
                wave.lifetime++;
                // Wait for the wave's start delay
                if (wave.lifetime < wave.startDelay) return;
                const age = wave.lifetime - wave.startDelay;
                const maxAge = 120; // Wave lasts 2 seconds at 60fps
                if (age > maxAge) {
                    // Reset wave animation
                    wave.lifetime = 0;
                    wave.alpha = 0;
                    return;
                }
                // Expand and fade out the wave
                const progress = age / maxAge;
                const radius = 20 + progress * 120; // Expand from 20 to 140 pixels
                wave.alpha = (1 - progress) * 0.5; // Fade out
                // Redraw the circle every frame
                wave.clear();
                wave.circle(0, 0, radius);
                wave.stroke({ width: 2, color: 0xffffff, alpha: wave.alpha });
            });
        }
    }

    
}