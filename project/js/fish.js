// fish.js
// Requires Sprite.js to be loaded first
class Fish extends Sprite {
    static salmonTexture = null;
    static salmonHitboxData = null;

    static async initAssets(resources) {
        // Assign textures and hitbox data from preloaded resources
        Fish.salmonTexture = resources['salmon_idle'];
        Fish.salmonHitboxData = resources['salmon_idle_hbox'];
    }
    constructor(x, y, config) {
        super();
        this.config = config;

        this.debugColor = 0x00ff00;

        this.x = x;
        this.y = y;
        // Let game.js control zIndex
        this.velocityX = 0;
        this.velocityY = 0;
        this.swimTime = 0;
        this.targetRotation = 0; // For smooth turning
        // Invincibility state
        this.isInvincible = false;
        this.invincibilityEndTime = 0;
        this.flickerTimer = 0;
        // Wake trail behind the fish
        this.wakeHistory = [];
        this.wakeFrameCounter = 0;
        this.wakeGraphics = null;
        // Animation state
        this.animationFrames = [];
        this.currentFrame = 0;
        this.animationSpeed = 1; // Animation speed (frames per game frame)
        this.animationTimer = 0;
        this.createFishGraphics();
    }
    
    async createFishGraphics() {

        const fishSize = 80;
        const fishSizeW = 45;

        const source = await PIXI.Assets.load('assets/salmon_idle.png');
        const hitboxResponse = await fetch('assets/salmon_idle_hbox.json');
        const hitboxData = await hitboxResponse.json();
        
        // Source texture is 512x512
        const textureSize = 512;
        const meshToTextureScale = fishSize / textureSize;
        
        // Store hitbox data for each animation frame
        this.hitboxFrames = hitboxData.frames.map(frameData => {
            const hbox = frameData[0];
            return {
                x: (hbox.x - textureSize / 2) * meshToTextureScale,
                y: (hbox.y - textureSize / 2) * meshToTextureScale,
                width: hbox.width * meshToTextureScale,
                height: hbox.height * meshToTextureScale
            };
        });
        
        // Set initial hitbox using base class
        this.setHitbox(this.hitboxFrames[0], this.meshScale);
        
        // Create texture for each frame (horizontal spritesheet)
        const frameCount = hitboxData.frames.length;
        const frameWidth = source.width / frameCount;
        
        for (let i = 0; i < frameCount; i++) {
            const rect = new PIXI.Rectangle(i * frameWidth, 0, frameWidth, source.height);
            this.animationFrames.push(new PIXI.Texture({ source: source, frame: rect }));
        }
        
        // Mesh with segments for body bending
        const segments = 20;
        const vertices = [];
        const uvs = [];
        const indices = [];
        
        // Build mesh from front to back
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const y = -(fishSizeW) + t * fishSize; // Fish length
            
            vertices.push(-(fishSizeW), y);
            uvs.push(0, t);
            
            // Right side vertex
            vertices.push((fishSizeW), y);
            uvs.push(1, t);
        }
        
        // Two triangles per mesh segment
        for (let i = 0; i < segments; i++) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2);
            indices.push(base + 1, base + 3, base + 2);
        }
        
        const geometry = new PIXI.MeshGeometry({
            positions: vertices,
            uvs: uvs,
            indices: indices
        });
        
        // Use first frame as initial mesh texture
        this.mesh = new PIXI.Mesh({ geometry, texture: this.animationFrames[0] });
        
        const desiredHeight = fishSize;
        const meshScaleValue = desiredHeight / this.animationFrames[0].height;
        this.mesh.scale.set(meshScaleValue * 10);
        
        this.meshScale = meshScaleValue * 10;
        this.textureSize = this.animationFrames[0].height;
        this.originalVertices = [...vertices];
        this.segments = segments;
        this.addChild(this.mesh);
    }
    
    update(velocityX, velocityY, inView = true) {
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        
        // Update animation frame
        if (this.animationFrames.length > 0) {
            this.animationTimer += this.animationSpeed;
            if (this.animationTimer >= 1) {
                this.animationTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % this.animationFrames.length;
                // Update mesh texture for current frame
                if (this.mesh) {
                    this.mesh.texture = this.animationFrames[this.currentFrame];
                }
                // Update hitbox for current frame
                if (this.hitboxFrames && this.hitboxFrames[this.currentFrame]) {
                    this.setHitbox(this.hitboxFrames[this.currentFrame], this.meshScale);
                }
            }
        }

        // Flicker and auto-clear invincibility if set by damage (not dash)
        // Never clear invincibility if dash is active (invincibilityEndTime should be 0 during dash)
        if (this.isInvincible && this.invincibilityEndTime > 0 && !(window.game && window.game.gameState && window.game.gameState.isDashing)) {
            const now = Date.now();
            if (now >= this.invincibilityEndTime) {
                this.isInvincible = false;
                this.alpha = 1; // Ensure fully visible
            } else {
                this.flickerTimer += 1;
                if (this.flickerTimer % 3 === 0) { // Flicker at 20 toggles per second
                    this.alpha = this.alpha === 1 ? 0.3 : 1;
                }
            }
        } else if (!this.isInvincible) {
            this.alpha = 1; // Ensure fully visible if not invincible
        }
        
        // Swimming motion and mesh bending
        this.swimTime += 0.15;
        const speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);
        const swimSpeed = Math.max(0.5, speed / 3);
        
        if (this.mesh && this.originalVertices) {
            const vertices = this.mesh.geometry.getBuffer('aPosition').data;
            
            // Wave motion down the body
            for (let i = 0; i <= this.segments; i++) {
                const t = i / this.segments;
                
                // More bend at the tail
                const bendWeight = t ** 2;
                
                const wave = Math.sin(this.swimTime * swimSpeed - t * 3) * bendWeight * 25;
                
                const baseIndex = i * 4;
                vertices[baseIndex] = this.originalVertices[baseIndex] + wave;     // Left X
                vertices[baseIndex + 2] = this.originalVertices[baseIndex + 2] + wave; // Right X
            }
            
            this.mesh.geometry.getBuffer('aPosition').update();
            
            // Tilt fish when turning
            if (window.game && window.game.gameState && window.game.gameState.romanticSceneActive) {
                // No rotation during romantic sequence
                this.rotation = 0;
            } else if (Math.abs(velocityX) > 0.1) {
                const maxTurnAngle = Math.PI / 3; // Max turn angle (60 degrees)
                const targetAngle = Math.max(-maxTurnAngle, Math.min(maxTurnAngle, velocityX * 0.05));
                const currentAngle = this.rotation;
                let angleDiff = targetAngle - currentAngle;
                // Use shortest path for rotation
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                this.rotation += angleDiff * 0.2;
            } else {
                // Gradually straighten out
                this.rotation *= 0.85;
            }
        }

        super.update(inView);

    }
 
    updateSpriteSheet(){
        // Update animation frame
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
    
    takeDamage(amount, gameState) {
        // Ignore damage if invincible or during romantic scene
        if (
            this.isInvincible ||
            (gameState && gameState.romanticSceneActive)
        ) {
            return;
        }

        gameState.health = Math.max(0, gameState.health - amount);

        // Only activate invincibility and flicker if not already invincible (not dashing)
        if (!this.isInvincible) {
            this.isInvincible = true;
            this.invincibilityEndTime = Date.now() + 1000;
            this.flickerTimer = 0;
            // Flash player red for damage
            this.setTint(0xff0000);
            setTimeout(() => {
                this.setTint(0xffffff);
            }, 100);
        }
    }
    
    updateWake(scrollOffset) {
        // Only add to wake every 3 frames
        this.wakeFrameCounter++;
        
        if (this.wakeFrameCounter % 3 === 0) {
            this.wakeHistory.push({
                x: this.x, 
                y: this.y,
                scrollOffset: scrollOffset
            });
            
            // Keep only last 20 wake positions
            if (this.wakeHistory.length > 20) {
                this.wakeHistory.shift();
            }
        }
        
        // Draw wake trail
        if (this.wakeGraphics) {
            this.wakeGraphics.clear();
            
            // Draw visible wake circles (simple and fast)
            for (let i = 0; i < this.wakeHistory.length; i++) {
                const pos = this.wakeHistory[i];
                const age = this.wakeHistory.length - i;
                
                const scrollDelta = scrollOffset - pos.scrollOffset;
                const adjustedY = pos.y + scrollDelta;
                
                // Expanding ripple circles
                const alpha = Math.max(0, 0.4 - (age / this.wakeHistory.length) * 0.4);
                const radius = 15 + (age / this.wakeHistory.length) * 20;
                
                // Draw expanding ring
                this.wakeGraphics.circle(pos.x, adjustedY, radius);
                this.wakeGraphics.stroke({ width: 2, color: 0xffffff, alpha: alpha });
            }
        }
    }
    
    setWakeGraphics(wakeGraphics) {
        this.wakeGraphics = wakeGraphics;
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.rotation = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.swimTime = 0;
        
        // Clear wake history
        this.wakeHistory = [];
        this.wakeFrameCounter = 0;
    }
    
    /**
     * Create an animated goal fish (female salmon)
     * Returns a container with animation properties
     */
    static async createGoalFish() {
        const goalContainer = new PIXI.Container();
        
        // Load salmon idle spritesheet and hitbox data
        const source = await PIXI.Assets.load('assets/salmon_idle.png');
        const hitboxResponse = await fetch('assets/salmon_idle_hbox.json');
        const hitboxData = await hitboxResponse.json();
        
        // Create texture for each frame
        const frameCount = hitboxData.frames.length;
        const frameWidth = source.width / frameCount;
        const animationFrames = [];
        
        for (let i = 0; i < frameCount; i++) {
            const rect = new PIXI.Rectangle(i * frameWidth, 0, frameWidth, source.height);
            animationFrames.push(new PIXI.Texture({ source: source, frame: rect }));
        }
        
        const fishSize = 80;
        const fishSizeW = 45;
        
        // Use same mesh structure as player
        const segments = 20;
        const vertices = [];
        const uvs = [];
        const indices = [];
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const y = -(fishSizeW) + t * fishSize;
            
            vertices.push(-(fishSizeW), y);
            uvs.push(0, t);
            
            vertices.push((fishSizeW), y);
            uvs.push(1, t);
        }
        
        for (let i = 0; i < segments; i++) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2);
            indices.push(base + 1, base + 3, base + 2);
        }
        
        const geometry = new PIXI.MeshGeometry({
            positions: vertices,
            uvs: uvs,
            indices: indices
        });
        
        const mesh = new PIXI.Mesh({ geometry, texture: animationFrames[0] });
        
        const desiredHeight = fishSize;
        const scale = desiredHeight / animationFrames[0].height;
        mesh.scale.set(scale * 10);
        
        // Face downward
        mesh.scale.y *= -1;
        
        // Apply hue shift filter (-40 degrees)
        const hueShiftFilter = new PIXI.ColorMatrixFilter();
        hueShiftFilter.hue(-25, false);
        mesh.filters = [hueShiftFilter];
        
        goalContainer.addChild(mesh);
        
        // Store animation data on container for updating
        goalContainer.animationFrames = animationFrames;
        goalContainer.currentFrame = 0;
        goalContainer.animationTimer = 0;
        goalContainer.animationSpeed = 1;
        goalContainer.mesh = mesh;
        // Store mesh wiggle data (after vertices are filled)
        goalContainer.originalVertices = [...vertices];
        goalContainer.segments = segments;
        goalContainer.swimTime = 0;
        
        return goalContainer;
    }
    
    /**
     * Update goal fish animation (call from game loop)
     */
    static updateGoalFish(goalContainer) {
        if (!goalContainer || !goalContainer.animationFrames) return;

        // Stop wiggle if romantic sequence is active and kiss has played
        let stopWiggle = false;
        if (window.game && window.game.romanticSequence && window.game.romanticSequence.active) {
            if (window.game.romanticSequence.kissPlayed || (window.game.gameState && window.game.gameState.kissPlayed)) {
                stopWiggle = true;
            }
        }

        goalContainer.animationTimer += goalContainer.animationSpeed;
        if (goalContainer.animationTimer >= 1) {
            goalContainer.animationTimer = 0;
            goalContainer.currentFrame = (goalContainer.currentFrame + 1) % goalContainer.animationFrames.length;
            if (goalContainer.mesh) {
                goalContainer.mesh.texture = goalContainer.animationFrames[goalContainer.currentFrame];
            }
        }

        // Wiggle mesh exactly like player fish
        if (goalContainer.mesh && goalContainer.originalVertices && !stopWiggle) {
            // Use player velocity for swimSpeed
            let swimSpeed = 1.0;
            if (window.game && window.game.player) {
                const vx = window.game.player.velocityX || 0;
                const vy = window.game.player.velocityY || 0;
                const speed = Math.sqrt(vx * vx + vy * vy);
                swimSpeed = Math.max(0.5, speed / 3);
            }
            goalContainer.swimTime += 0.15;
            const vertices = goalContainer.mesh.geometry.getBuffer('aPosition').data;
            for (let i = 0; i <= goalContainer.segments; i++) {
                const t = i / goalContainer.segments;
                const bendWeight = t ** 2;
                const wave = Math.sin(goalContainer.swimTime * swimSpeed - t * 3) * bendWeight * 25;
                const baseIndex = i * 4;
                vertices[baseIndex] = goalContainer.originalVertices[baseIndex] + wave;     // Left X
                vertices[baseIndex + 2] = goalContainer.originalVertices[baseIndex + 2] + wave; // Right X
            }
            goalContainer.mesh.geometry.getBuffer('aPosition').update();
        }
    }
}
