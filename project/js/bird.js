
class Bird extends Sprite {
    static flapTexture = null;
    static glideTexture = null;
    static flapHitboxData = null;
    static glideHitboxData = null;

    static async initAssets(resources) {
        Bird.flapTexture = resources['bird_flap'];
        Bird.glideTexture = resources['bird_glide'];
        Bird.flapHitboxData = resources['bird_flap_hbox'];
        Bird.glideHitboxData = resources['bird_glide_hbox'];
    }

    constructor(screenHeight = 600) {
        super();
        const sizeRoll = Math.random();
        if (sizeRoll < 0.33) {
            this.size = 'small';
            this.baseScale = 0.35;
            this.damage = 15;
            this.hitRadius = 28;
            this.speedMultiplier = 1.3;
        } else if (sizeRoll < 0.66) {
            this.size = 'medium';
            this.baseScale = 0.5;
            this.damage = 25;
            this.hitRadius = 40;
            this.speedMultiplier = 1.0;
        } else {
            this.size = 'large';
            this.baseScale = 0.65;
            this.damage = 35;
            this.hitRadius = 52;
            this.speedMultiplier = 0.8;
        }
        this.type = 'bird';
        this.velocityY = 0;
        this.velocityX = (Math.random() - 0.5) * 3 * this.speedMultiplier * (0.7 + Math.random() * 0.6);
        this.currentAnimation = 'flap';
        this.animationTimer = 0;
        this.flapDuration = 60;
        this.glideDuration = 90;
        this.meshScale = this.baseScale;
        this.createGraphics();
        this.x = Math.random() * 800;
        this.y = -Math.random() * screenHeight;
        this.visible = true;
    }

    async createGraphics() {
        const frameWidth = 512;
        const frameHeight = 512;
        if (!Bird.flapTexture || !Bird.glideTexture || !Bird.flapHitboxData || !Bird.glideHitboxData) {
            throw new Error("Bird textures not initialized. Make sure Bird.initAssets() is called after preloading and before creating Bird instances.");
        }
        if (Bird.flapHitboxData && Bird.flapHitboxData.frames) {
            this.animationHitboxes['flap'] = Bird.flapHitboxData;
        }
        if (Bird.glideHitboxData && Bird.glideHitboxData.frames) {
            this.animationHitboxes['glide'] = Bird.glideHitboxData;
        }
        await this.createAnimation('flap', Bird.flapTexture, frameWidth, frameHeight);
        await this.createAnimation('glide', Bird.glideTexture, frameWidth, frameHeight);
        this.sprite.scale.set(this.baseScale, this.baseScale);
        this.sprite.anchor.set(0.5, 0.5);
        this.sprite.scale.x = Math.abs(this.sprite.scale.x);
        this.switchAnimation('flap', 0.15);
    }

    switchAnimation(name, speed = null) {
        if (!this.animations || !this.animations[name]) return;
        if (this.currentAnimation === name) return;
        this.currentAnimation = name;
        this.sprite.textures = this.animations[name];
        if (speed !== null) this.sprite.animationSpeed = speed;
        this.sprite.gotoAndPlay(0);
        if (this.debugMode) {
            this.updateDebugGraphics();
        }
    }

    update(screenWidth, inView = true) {
        // Skip updates for off-screen birds
        if (!inView) {
            return;
        }
        
        super.update(inView);
        // Move bird and handle screen edge collisions
        this.y += this.velocityY;
        this.x += this.velocityX;
        if (this.x < 0) {
            this.x = 0;
            this.velocityX *= -1;
        } else if (this.x > screenWidth) {
            this.x = screenWidth;
            this.velocityX *= -1;
        }
        if (typeof window !== 'undefined' && window.game && window.game.camera) {
            const cameraBounds = window.game.camera.getBounds();
            if (this.y < cameraBounds.top - 100) {
                // Bird is above camera view; optionally wrap or bounce here
                return;
            }
        } else {
            if (this.y < -100) {
                // Bird is above screen; optionally wrap or bounce here
                return;
            }
        }
        // Switch between flap and glide animations
        this.animationTimer++;
        if (this.currentAnimation === 'flap' && this.animationTimer >= this.flapDuration) {
            this.switchAnimation('glide', 0.1);
            this.animationTimer = 0;
        } else if (this.currentAnimation === 'glide' && this.animationTimer >= this.glideDuration) {
            this.switchAnimation('flap', 0.15);
            this.animationTimer = 0;
        }
    }
}
