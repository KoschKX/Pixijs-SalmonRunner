// Sprite.js
// Base class for all game entities with hitbox and debug overlay support
class Sprite extends PIXI.Container {
    static debugEnabled = false;
    constructor() {
        super();
        this.container = this; // For compatibility with code expecting a container
        this.x = 0;
        this.y = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.swimTime = 0;
        this.targetRotation = 0;
        this.hitboxData = { x: 0, y: 0, width: 0, height: 0 };
        this.meshScale = 1;
        this.debugGraphics = null;
        // Animation state variables
        this.animationFrames = [];
        this.currentFrame = 0;
        this.animationSpeed = 1;
        this.animationTimer = 0;
        this.hitboxFrames = [];
        this.animations = {};
        this.animationHitboxes = {};
        this.currentAnimation = null;
        // Enable debug mode globally if Sprite.debugEnabled is set
        if (Sprite.debugEnabled) {
            this.setDebugMode(true);
        }
    }

    setAnimatedSprite(frames, scale = 1, animationSpeed = 0.15) {
        this.sprite = new PIXI.AnimatedSprite(frames);
        this.sprite.anchor.set(0.5, 0.5);
        this.sprite.scale.set(scale);
        this.sprite.animationSpeed = animationSpeed;
        this.sprite.play();
        this.addChild(this.sprite);
        this.sprite.visible = true;
        this.sprite.alpha = 1;
    }
    // Static: load and cache hitbox data from a URL
    // Usage: await Sprite.loadHitboxData('assets/rock_hbox.json')
    static async loadHitboxData(url) {
        if (!window._hitboxCache) window._hitboxCache = {};
        if (window._hitboxCache[url]) return window._hitboxCache[url];
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to load hitbox data: ' + url);
            const data = await res.json();
            window._hitboxCache[url] = data;
            return data;
        } catch (e) {
            console.error('Hitbox load error:', e);
            return null;
        }
    }

    getCurrentHitboxData() {
        // Use per-animation hitbox data if available
        let hitboxData = null;
        if (this.currentAnimation && this.animationHitboxes[this.currentAnimation]) {
            hitboxData = this.animationHitboxes[this.currentAnimation];
        } else if (this.hitboxFrames) {
            hitboxData = this.hitboxFrames;
        }
        if (!hitboxData || !Array.isArray(hitboxData.frames)) return null;
        // Select frame index for mesh or sprite
        let frameIndex = 0;
        if (this.mesh && typeof this.currentFrame === 'number') {
            frameIndex = Math.floor(this.currentFrame) % hitboxData.frames.length;
        } else if (this.sprite && this.sprite.currentFrame !== undefined && !isNaN(this.sprite.currentFrame)) {
            frameIndex = Math.floor(this.sprite.currentFrame) % hitboxData.frames.length;
        }
        let frame = hitboxData.frames[frameIndex];
        if (!frame) frame = hitboxData.frames[0];
        return frame;
    }

    setVelocity(vx, vy) {
        this.velocityX = vx;
        this.velocityY = vy;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    // Get the position of the sprite (for compatibility with game logic)
    getPosition() {
        return { x: this.x, y: this.y };
    }

    // Get the container (for compatibility with game logic)
    getContainer() {
        return this;
    }
    // Get the current frame index of the active animation
    getCurrentFrameIndex() {
        if (this.sprite && typeof this.sprite.currentFrame === 'number') {
            return Math.floor(this.sprite.currentFrame);
        }
        return 0;
    }

    recycle(playerPos, screenHeight, config) {
        // Recycle stone if too far behind player
        if (this.container.y > playerPos.y + screenHeight) {
            this.container.y = playerPos.y - screenHeight - Math.random() * 2000;
            this.container.x = config.width / 2 + (Math.random() - 0.5) * 400;
            
            // Sync wave container position
            if (this.container.waveContainer) {
                this.container.waveContainer.x = this.container.x;
                this.container.waveContainer.y = this.container.y;
            }
        }
    }

    // Set the scale of the sprite (base class)
    // x: scale.x value, y: scale.y value
    setScale(x, y) {
        if (this.sprite) {
            this.sprite.scale.x = x;
            this.sprite.scale.y = y;
        }
        // Optionally update meshScale for hitbox debug
        this.meshScale = Math.abs(x);
        if (this.debugMode) {
            this.updateDebugGraphics();
        }
    }

    // Flip the sprite horizontally
    // direction: -1 for left, 1 for right
    setFlipX(direction) {
        if (this.sprite) {
            const scale = Math.abs(this.sprite.scale.x);
            this.sprite.scale.x = direction < 0 ? -scale : scale;
        }
    }

    checkCollision(player) {
        const playerPos = player.getPosition();
        
        // Check collision with player
        const dx = playerPos.x - this.container.x;
        const dy = playerPos.y - this.container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.container.collisionRadius + 20) {
            // Push player away from stone
            const angle = Math.atan2(dy, dx);
            player.setPosition(
                this.container.x + Math.cos(angle) * (this.container.collisionRadius + 20),
                this.container.y + Math.sin(angle) * (this.container.collisionRadius + 20)
            );
        }
    }

    update(inView) {
        // Track previous inView state
        // Always refresh debug mode and overlays if in view and debug mode is enabled
        if (inView && typeof window !== 'undefined' && window.game && window.game.gameState) {
            if (typeof this.setDebugMode === 'function') {
                this.setDebugMode(window.game.gameState.debugMode);
            }
        }
        // Debug: log hitbox data for current frame
        if (this.debugMode && this.animationHitboxes && this.currentAnimation && this.animationHitboxes[this.currentAnimation]) {
            const hitboxData = this.animationHitboxes[this.currentAnimation];
            let frameIndex = 0;
            if (this.sprite && this.sprite.currentFrame !== undefined) {
                frameIndex = Math.floor(this.sprite.currentFrame) % hitboxData.frames.length;
            } else if (this.currentFrame !== undefined) {
                frameIndex = Math.floor(this.currentFrame) % hitboxData.frames.length;
            }
            const frameHitbox = hitboxData.frames[frameIndex];
            // Always refresh debug graphics when debugMode is enabled
            this.updateDebugGraphics();
        } else if (this.debugMode) {
            this.updateDebugGraphics();
        }
    }

    updateAnimationAndHitbox() {
        // Call this in the update loop of subclasses
        if (this.animationFrames.length > 0) {
            this.animationTimer += this.animationSpeed;
            if (this.animationTimer >= 1) {
                this.animationTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % this.animationFrames.length;
                if (this.mesh) {
                    this.mesh.texture = this.animationFrames[this.currentFrame];
                }
                if (this.hitboxFrames && this.hitboxFrames[this.currentFrame]) {
                    this.setHitbox(this.hitboxFrames[this.currentFrame], this.meshScale);
                }
            }
        }
    }

    setHitbox(hitbox, meshScale = 1) {
        this.hitboxData = hitbox;
        this.meshScale = meshScale;
        if (this.debugMode) {
            this.updateDebugGraphics();
        }
    }

    // Returns the hitbox for the current frame, using the same logic as the debug overlay.
    // Handles per-frame hitboxes, scaling, mirroring, and anchor offset.
    getHitbox() {
        // Use per-frame hitbox data if available
        let hitboxes = this.getCurrentHitboxData ? this.getCurrentHitboxData() : this.hitboxData;
        // Use mesh or sprite for dimensions/anchor
        let anchorX = 0.5, anchorY = 0.5;
        let spriteW, spriteH, scaleX, scaleY;
        if (this.mesh) {
            spriteW = this.mesh.width;
            spriteH = this.mesh.height;
            scaleX = Math.abs(this.mesh.scale.x);
            scaleY = Math.abs(this.mesh.scale.y);
            anchorX = 0.5;
            anchorY = 0.5;
        } else {
            spriteW = this.sprite ? this.sprite.width : this.width;
            spriteH = this.sprite ? this.sprite.height : this.height;
            scaleX = this.sprite ? Math.abs(this.sprite.scale.x) : this.meshScale;
            scaleY = this.sprite ? Math.abs(this.sprite.scale.y) : this.meshScale;
            if (this.sprite && this.sprite.anchor) {
                anchorX = this.sprite.anchor.x;
                anchorY = this.sprite.anchor.y;
            }
        }
        let offsetX = -anchorX * spriteW;
        let offsetY = -anchorY * spriteH;
        const mirror = (this.sprite && this.sprite.scale.x < 0) ? -1 : 1;
        // Only support single hitbox for collision (not array)
        let box = Array.isArray(hitboxes) ? hitboxes[0] : hitboxes;
        if (!box) return { x: this.x, y: this.y, width: 0, height: 0 };
        let x = box.x * scaleX;
        let w = box.width * scaleX;
        let y = box.y * scaleY;
        let h = box.height * scaleY;
        if (mirror === -1) {
            x = (2 * anchorX * spriteW) - (box.x * scaleX + w);
        }
        return {
            x: this.x + offsetX + x,
            y: this.y + offsetY + y,
            width: w,
            height: h
        };
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
        if (enabled) {
            if (!this.debugGraphics) {
                this.debugGraphics = new PIXI.Graphics();
                this.container.addChild(this.debugGraphics);
            }
            this.updateDebugGraphics();
        } else {
            if (this.debugGraphics) {
                this.container.removeChild(this.debugGraphics);
                this.debugGraphics = null;
            }
        }
    }

    updateDebugGraphics() {
                // Ensure debugGraphics is never scaled
                if (this.debugGraphics) {
                    this.debugGraphics.scale.set(1, 1);
                }
        if (!this.debugGraphics) {
            this.debugGraphics = new PIXI.Graphics();
            this.addChild(this.debugGraphics);
        }
            this.debugGraphics.clear();
            const color = this.debugColor || 0x00ff00;
            // Use getCurrentHitboxData for overlays
            const hitboxes = this.getCurrentHitboxData();
            // Calculate anchor offset (default to center if anchor is not set)
            let anchorX = 0.5, anchorY = 0.5;
            if (this.sprite && this.sprite.anchor) {
                anchorX = this.sprite.anchor.x;
                anchorY = this.sprite.anchor.y;
            }
            // Use mesh dimensions if mesh is present
            let spriteW, spriteH, scaleX;
            let offsetX, offsetY;
            if (this.mesh) {
                spriteW = this.mesh.width;
                spriteH = this.mesh.height;
                scaleX = this.mesh.scale.x;
                // For mesh, draw hitbox at mesh center (no offset)
                anchorX = 0.5;
                anchorY = 0.5;
                offsetX = 0;
                offsetY = 0;
            } else {
                spriteW = this.sprite ? this.sprite.width : this.width;
                spriteH = this.sprite ? this.sprite.height : this.height;
                scaleX = this.sprite ? this.sprite.scale.x : 1;
                offsetX = -anchorX * spriteW;
                offsetY = -anchorY * spriteH;
            }
            const mirror = scaleX < 0 ? -1 : 1;
            // If mirrored, adjust offsetX so hitbox stays centered
            if (mirror === -1) {
                offsetX = -anchorX * spriteW;
            }
            if (hitboxes && Array.isArray(hitboxes)) {
                hitboxes.forEach(box => {
                    let scaleX = this.mesh ? Math.abs(this.mesh.scale.x) : this.meshScale;
                    let scaleY = this.mesh ? Math.abs(this.mesh.scale.y) : this.meshScale;
                    let x = box.x * scaleX;
                    let w = box.width * scaleX;
                    let y = box.y * scaleY;
                    let h = box.height * scaleY;
                    if (mirror === -1) {
                        x = (2 * anchorX * spriteW) - (box.x * scaleX + w);
                    }
                    this.debugGraphics.rect(
                        offsetX + x,
                        offsetY + y,
                        w,
                        h
                    );
                });
            } else if (hitboxes) {
                // Fallback: single hitbox
                let scaleX = this.mesh ? Math.abs(this.mesh.scale.x) : this.meshScale;
                let scaleY = this.mesh ? Math.abs(this.mesh.scale.y) : this.meshScale;
                let x = hitboxes.x * scaleX;
                let w = hitboxes.width * scaleX;
                let y = hitboxes.y * scaleY;
                let h = hitboxes.height * scaleY;
                if (mirror === -1) {
                    x = (2 * anchorX * spriteW) - (hitboxes.x * scaleX + w);
                }
                this.debugGraphics.rect(
                    offsetX + x,
                    offsetY + y,
                    w,
                    h
                );
            }
            this.debugGraphics.stroke({ width: 2, color });
    }

    // Load a spritesheet and create animation frames for a given animation name
    // Usage: await this.createAnimation('walk', 'assets/bear_walk.png', 512, 512)
    async createAnimation(name, fileOrTexture, frameWidth, frameHeight) {
        let texture;
        if (typeof fileOrTexture === 'string') {
            texture = await PIXI.Assets.load(fileOrTexture);
        } else {
            texture = fileOrTexture;
        }
        const numFrames = Math.floor(texture.width / frameWidth);
        const frames = [];
        for (let i = 0; i < numFrames; i++) {
            const frame = new PIXI.Texture({
                source: texture.source,
                frame: new PIXI.Rectangle(i * frameWidth, 0, frameWidth, frameHeight)
            });
            frames.push(frame);
        }
        if (!this.animations) this.animations = {};
        this.animations[name] = frames;
        // If no sprite exists, create one
        if (!this.sprite) {
            this.sprite = new PIXI.AnimatedSprite(frames);
            this.sprite.anchor.set(0.5, 0.5);
            this.sprite.animationSpeed = 0.1;
            this.sprite.play();
            this.addChild(this.sprite);
        }
        // Optionally set default animation
        if (!this.currentAnimation) {
            this.currentAnimation = name;
            this.sprite.textures = frames;
        }
    }

    // Switch to a different loaded animation by name
    switchAnimation(name, speed = null) {
        if (!this.animations || !this.animations[name]) return;
        if (this.currentAnimation === name) return;
        this.currentAnimation = name;
        this.sprite.textures = this.animations[name];
        if (speed !== null) this.sprite.animationSpeed = speed;
        this.sprite.gotoAndPlay(0);
        // Update debug graphics immediately after switching animation
        if (this.debugMode) {
            this.updateDebugGraphics();
        }
    }

    setTint(color) {
        this.tint = color;
    }

    setRotation(rotation) {
        this.rotation = rotation;
    }

}

window.Sprite = Sprite;
