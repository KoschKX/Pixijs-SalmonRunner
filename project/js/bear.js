class Bear extends Sprite {
    static walkTexture = null;
    static eatTexture = null;
    static walkHitboxData = null;
    static eatHitboxData = null;

    static async initAssets(resources) {
        Bear.walkTexture = resources['bear_walk'];
        Bear.eatTexture = resources['bear_eat'];
        Bear.walkHitboxData = resources['bear_walk_hitbox'];
        Bear.eatHitboxData = resources['bear_eat_hitbox'];
    }

    constructor() {
        super();
        this.debugColor = 0xff0000;
        // If true, bear will keep chasing after the player passes
        this.alwaysChase = false;
        // Randomly choose left or right bank
        this.isLeftBank = Math.random() > 0.5;
        this.bankX = 0; // Set later to the bank's X position
        this.velocityY = 0; // Moves with the screen vertically
        this.velocityX = 0; // Bear doesn't move horizontally by default
        // Increase bear speeds so they feel responsive
        this.walkSpeed = 1.845703125; // Bear's normal walking speed (increased 25%)
        this.targetX = 0; // Where the bear wants to walk
        this.isWalking = false; // True if bear is moving
        this.isEating = false; // True if bear is eating
        this.eatTimer = 0; // Tracks how long bear has been eating
        this.eatDuration = 0; // How long bear will eat (random each time)
        this.idleTimer = 0; // Wait time before next action
        this.type = 'bear';
        this.damage = 30;
        this.hitRadius = 150;
        this.swipeAngle = 0;
        this.animationFrame = 0;
        this.animationSpeed = 0.1;
        // Bear stays hidden until its position is set
        this.visible = false;
        this.createGraphics();
        // Position is set by game.js when spawning
        // Y position is set with setPosition()
    }
    
    async createGraphics() {
        // Load bear's walk and eat animations
        const frameWidth = 512;
        const frameHeight = 512;
        const walkHitboxData = Bear.walkHitboxData;
        const eatHitboxData = Bear.eatHitboxData;
        if (!Bear.walkTexture || !Bear.eatTexture || !walkHitboxData || !eatHitboxData) {
            throw new Error("Bear textures not initialized. Make sure Bear.initAssets() is called after preloading and before creating Bear instances.");
        }
        if (walkHitboxData && walkHitboxData.frames) {
            this.animationHitboxes['walk'] = walkHitboxData;
        }
        if (eatHitboxData && eatHitboxData.frames) {
            this.animationHitboxes['eat'] = eatHitboxData;
        }
        await this.createAnimation('walk', Bear.walkTexture, frameWidth, frameHeight);
        await this.createAnimation('eat', Bear.eatTexture, frameWidth, frameHeight);
        this.frameSize = frameWidth;
        this.meshScale = 0.7; // Used for hitbox size
        this.baseScale = 0.7;
        this.sprite.scale.set(this.baseScale, this.baseScale);
        this.sprite.anchor.set(0.5, 0.5);
        this.sprite.scale.x = Math.abs(this.sprite.scale.x);
        // Bear starts in eating (idle) animation
        this.switchAnimation('eat', 0.1);
    }
    
    update(riverBanks, config, inView = true, playerPos = null, delta = 1) { 
        // Skip expensive updates for off-screen bears
        if (!inView && !this.alwaysChase) {
            return;
        }
        
        super.update(inView);
        
        const romanticActive = (riverBanks && riverBanks.romanticSceneActive) ||
                               (config && config.romanticSceneActive) ||
                               (arguments.length > 1 && arguments[1] && arguments[1].romanticSceneActive);
        
        if (romanticActive) {
            if (this.isWalking || !this._romanticModeSet) {
                this.isWalking = false;
                this.switchAnimation('eat');
                this._romanticModeSet = true;
            }
            return;
        }
        this._romanticModeSet = false;

        // Figure out which side of the river the bear should be on
        if (this.bankX === 0 && window.game && window.game.river) {
            const riverPath = window.game.river.getRiverPathAtY(this.y);
            if (riverPath) {
                if (this.isLeftBank) {
                    this.bankX = riverPath.left - 80;
                } else {
                    this.bankX = riverPath.right + 80;
                }
                this.x = this.bankX;
                // Bear appears once its position is set
                this.visible = true;
            }
        }
        
        // If the player swims past the bear, start chasing and don't stop
        if (playerPos && !this.alwaysChase) {
            if (playerPos.y < this.y) {
                this.alwaysChase = true;
                this.isWalking = true;
                this.isEating = false;
                this.eatTimer = 0;
                this.idleTimer = 0;
                this.switchAnimation('walk');
            }
        }

        // If bear isn't set to always chase, only move when on screen
        if (!this.alwaysChase && !inView) return;
        if (this.isEating) {
            // If alwaysChase is set, stop eating and start chasing
            if (!this.alwaysChase) {
                this.eatTimer += delta;
                if (this.eatTimer >= this.eatDuration) {
                    // Finished eating, now wait before next move
                    this.isEating = false;
                    this.eatTimer = 0;
                    this.idleTimer = Math.random() * 60 + 30; // Wait a bit before next action (in frame-units)
                } else {
                    this.switchAnimation('eat');
                        return; // Don't do anything else while eating
                }
            }
        }
        
        // Count down idle timer if waiting
        if (this.idleTimer > 0) {
            // If alwaysChase is set, stop waiting and chase
            if (!this.alwaysChase) {
                this.idleTimer -= delta;
                this.switchAnimation('eat');
                return;
            }
        }
        
        // Chase the player if they're nearby, or if alwaysChase is set
        if (playerPos && (Math.abs(playerPos.y - this.y) < 800 || this.alwaysChase)) {
            // Move faster and animate quicker when chasing for real
            if (this.alwaysChase) {
                this.walkSpeed = 7.5; // Much faster speed when chasing (increased 25%)
                if (this.sprite && this.currentAnimation === 'walk') {
                    this.sprite.animationSpeed = 0.6;
                }
            } else {
                this.walkSpeed = 1.845703125; // Normal speed (increased 25%)
                if (this.sprite && this.currentAnimation === 'walk') {
                    this.sprite.animationSpeed = 0.25;
                }
            }
            // Head straight for the player (ignoring banks)
            const targetX = playerPos.x;
            const targetY = playerPos.y;
                const distanceX = targetX - this.x;
                const distanceY = targetY - this.y;
                // Flip bear to face the player
                if (this.sprite) {
                    const direction = playerPos.x > this.container.x ? -1 : 1;
                    this.setScale(direction * Math.abs(this.baseScale), this.baseScale);
                }
            const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

            // Sometimes stop to eat while chasing (unless alwaysChase)
            if (!this.alwaysChase && this.isWalking && Math.random() < 0.015) {
                this.isEating = true;
                this.eatTimer = 0;
                this.eatDuration = Math.random() * 120 + 120; // Eat for 2-4 seconds
                this.isWalking = false;
                this.switchAnimation('eat');
                return;
            }

            if (totalDistance > 50) {
                this.isWalking = true;
                this.switchAnimation('walk');

                const moveX = (distanceX / totalDistance) * this.walkSpeed * delta;
                const moveY = (distanceY / totalDistance) * this.walkSpeed * delta;

                this.x += moveX;
                this.y += moveY;
            } else {
                // Close enough to start eating
                // Flip bear to face the player
                if (this.sprite) {
                    const direction = playerPos.x > this.x ? -1 : 1;
                    this.setScale(direction * Math.abs(this.baseScale), this.baseScale);
                }
                this.isWalking = false;
                this.switchAnimation('eat');
            }
        } else {
            // Player is too far away, bear just idles
            this.isWalking = false;
            this.switchAnimation('eat');
        }
        
        if (this.sprite) {
            if (inView) {
                if (!this.sprite.playing) {
                    this.sprite.play();
                }
            } else if (this.sprite.playing) {
                this.sprite.stop();
            }
            // Debug drawing is handled by the Sprite base class
        }
        
        // Make sure bear is drawn above most things (zIndex 15)
        if (!this.zIndex || this.zIndex < 15) {
            this.zIndex = 15;
        }
    }
    
}
