class Waterfall {
    static FPS = 30; // Set your preferred frames per second
    static DT = 90 / Waterfall.FPS;
    
    constructor(config, boundaries = { left: 150, right: 650, width: 450 }, getBoundariesAtY = null) {
        this.config = config;
        this.getBoundariesAtY = getBoundariesAtY;
        this.boundaries = boundaries;
        this.riverWidth = boundaries.width;
        this.riverLeft = boundaries.left - config.width / 2; // Position relative to center
        this.riverRight = boundaries.right - config.width / 2; // Position relative to center
        this.container = new PIXI.Container();
        this.container.label = 'waterfall';
        this.type = 'waterfall';
        this.container.type = 'waterfall';
        
        // Store last boundary lookup
        this.cachedBoundaries = null;
        this.cachedY = null;
        
        // For debug mode: keep a reference to the world for drawing a debug box
        this.debugBox = null;
        this.world = null; // Will be set when added to world
        
        const width = 800;
        const height = 80 + Math.random() * 30; // Shorter waterfalls
        
        this.createWaterfallGraphics(width, height);
        this.createFoam(width, height);
        this.createWaveWakes(width, height);

        this.container.waterfallHeight = height;
    }
    
    createWaterfallGraphics(width, height) {
        // Use the same texture as the river background
        const waterfallTexture = PIXI.Texture.from('assets/riverbed_B.jpg');
        const textureSprite = new PIXI.TilingSprite({
            texture: waterfallTexture,
            width: width,
            height: height
        });
        textureSprite.x = -width / 2;
        textureSprite.tileScale.set(256 / waterfallTexture.source.width, 256 / waterfallTexture.source.height);
        
        // Add a blue overlay to match the river color
        const waterOverlay = new PIXI.Graphics();
        waterOverlay.rect(-width / 2, 0, width, height);
        waterOverlay.fill({ color: 0x0066cc, alpha: 0.4 });
        
        // Make a displacement map to create a wavy water effect
        const displacementCanvas = document.createElement('canvas');
        const dispWidth = 512;
        const dispHeight = 512;
        displacementCanvas.width = dispWidth;
        displacementCanvas.height = dispHeight;
        const ctx = displacementCanvas.getContext('2d');
        
        for (let x = 0; x < dispWidth; x++) {
            for (let y = 0; y < dispHeight; y++) {
                const wave1 = Math.sin(x * 0.02 + y * 0.035) * 10;
                const wave2 = Math.cos(x * 0.035 + y * 0.055) * 7;
                const wave3 = Math.sin(x * 0.055 + y * 0.025) * 5;
                const wave4 = Math.cos(x * 0.07 + y * 0.065) * 3;
                
                const displaceX = wave1 + wave2 + wave3 + wave4;
                const displaceY = Math.sin(x * 0.025 + y * 0.04) * 8 + Math.cos(x * 0.045 + y * 0.03) * 5;
                
                ctx.fillStyle = `rgb(${displaceX + 128}, ${displaceY + 128}, 128)`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
        
        const displacementTexture = PIXI.Texture.from(displacementCanvas);
        displacementTexture.source.addressMode = 'repeat';
        const displacementSprite = new PIXI.Sprite(displacementTexture);
        displacementSprite.x = -width / 2;
        displacementSprite.y = 0;
        displacementSprite.scale.set(width / dispWidth, height / dispHeight);
        displacementSprite.visible = false;
        
        const displacementFilter = new PIXI.DisplacementFilter({
            sprite: displacementSprite,
            scale: 25
        });
        
        textureSprite.filters = [displacementFilter];
        
        // Make a gradient mask for soft edges
        const alphaCanvas = document.createElement('canvas');
        alphaCanvas.width = width;
        alphaCanvas.height = height;
        const alphaCtx = alphaCanvas.getContext('2d');
        
        const gradient = alphaCtx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        alphaCtx.fillStyle = gradient;
        alphaCtx.fillRect(0, 0, width, height);
        
        const maskTexture = PIXI.Texture.from(alphaCanvas);
        const maskSprite = new PIXI.Sprite(maskTexture);
        maskSprite.x = -width / 2;
        maskSprite.y = 0;
        
        this.container.addChild(displacementSprite);
        this.container.addChild(textureSprite);
        this.container.addChild(waterOverlay);
        this.container.addChild(maskSprite);
        
        this.container.mask = maskSprite;
        
        // Keep references for animation updates
        this.container.textureSprite = textureSprite;
        this.container.displacementSprite = displacementSprite;
        this.container.animationOffset = Math.random() * 100;
        
        // Timer for 30fps updates
        this.lastUpdateTime = 0;
        
        // Wait for splashes to finish loading (using an async IIFE)
        (async () => {
           // await this.createSplashes(width, height);
            this.createFoamMist(width, height);
            this.createFoamStreaks(width, height, displacementFilter);
            this.createTopEdge(width, height);
        })();
    }
    
    createFoamMist(width, height) {
        const foamMist = new PIXI.Graphics();
        foamMist.y = height * 0.88;
        this.container.addChild(foamMist);
        this.container.foamMist = foamMist;
        this.container.mistTime = 0;
    }
    
    createFoamStreaks(width, height, displacementFilter) {
        const foamCanvas = document.createElement('canvas');
        foamCanvas.width = width;
        foamCanvas.height = 50;
        const foamCtx = foamCanvas.getContext('2d');
        
        const streakCount = 80 + Math.random() * 40; // Randomize number of foam streaks
        
        for (let i = 0; i < streakCount; i++) {
            const x = Math.random() * width;
            const streakWidth = 2 + Math.random() * 6;
            const opacity = 0.2 + Math.random() * 0.6;
            
            const streakGradient = foamCtx.createLinearGradient(0, 0, 0, 50);
            streakGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
            streakGradient.addColorStop(0.4, `rgba(255, 255, 255, ${opacity * 0.6})`);
            streakGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            foamCtx.fillStyle = streakGradient;
            foamCtx.fillRect(x - streakWidth / 2, 0, streakWidth, 50);
        }
        
        const foamTexture = PIXI.Texture.from(foamCanvas);
        foamTexture.source.addressModeV = 'clamp-to-edge';
        foamTexture.source.addressModeU = 'repeat';
        foamTexture.source.update();
        
        const foamSprite = new PIXI.Sprite(foamTexture);
        foamSprite.x = -width / 2;
        foamSprite.y = 0;
        foamSprite.width = width;
        foamSprite.height = height;
        foamSprite.blendMode = 'add';
        foamSprite.filters = [displacementFilter];
        
        this.container.addChild(foamSprite);
        this.container.foamSprite = foamSprite;
        this.container.foamAnimationTime = 0;
    }
    
    createTopEdge(width, height) {
        const foamHighlight = new PIXI.Graphics();
        
        for (let x = 0; x < width; x++) {
            const normalizedX = (x / width) * 2 - 1;
            const curve = 1 - (normalizedX * normalizedX);
            const curveHeight = curve * 15;
            
            for (let y = 0; y < height * 0.12; y++) {
                const normalizedY = y / (height * 0.12);
                
                let alpha;
                if (normalizedY < 0.2) {
                    const reflectionIntensity = (1 - normalizedY / 0.2) * curve;
                    alpha = reflectionIntensity * 0.7;
                } else {
                    const verticalFade = 1 - (normalizedY - 0.2) / 0.8;
                    const horizontalFade = Math.pow(curve, 0.5);
                    alpha = verticalFade * horizontalFade * 0.2;
                }
                
                if (alpha > 0.02) {
                    foamHighlight.rect(x - width / 2, y - curveHeight * (1 - normalizedY), 1, 1);
                    foamHighlight.fill({ color: 0xffffff, alpha });
                }
            }
        }
        this.container.addChild(foamHighlight);
    }
    
    createFoam(width, height) {
                // Debug: print available foam textures and their validity
                if (window.ParticleManager && window.ParticleManager.textures) {
                    const foamIndices = [0, 1, 2, 3, 4, 6, 8];
                    foamIndices.forEach(idx => {
                        const key = 'foam_' + idx;
                        const tex = window.ParticleManager.textures[key];
                        if (tex){
                            const valid = tex.source && tex.source.width > 0 && tex.source.height > 0;
                        }
                    });
                }
        // Make separate containers for waves (drawn below) and foam particles (drawn above)
        this.waveWakes = new PIXI.Container();
        this.foam = new PIXI.Container();
        
        // Add splash particles at the bottom, using foam textures if available
        const foamIndices = [0, 1, 2, 3, 4, 6, 8];
        const splashParticles = [];
        for (let i = 0; i < 100; i++) {
            // Choose a random foam texture
            const foamIdx = foamIndices[Math.floor(Math.random() * foamIndices.length)];
            let tex = (window.ParticleManager && window.ParticleManager.textures)
                ? window.ParticleManager.textures['foam_' + foamIdx]
                : null;
            let particle;
            // For PixiJS v8+: check if the texture is valid
            const isValid = tex && tex.source && tex.source.width > 0 && tex.source.height > 0;
            if (isValid) {
                particle = new PIXI.Sprite(tex);
                if (particle.anchor && typeof particle.anchor.set === 'function') {
                    particle.anchor.set(0.5);
                }
                // Make foam particles a bit bigger for the waterfall
                const scale = 0.4 + Math.random() * 0.4; // 0.6–1.0
                particle.scale.set(scale);
            } else {
                particle = new PIXI.Graphics();
                const radius = 1 + Math.random() * 3;
                particle.circle(0, 0, radius);
                particle.fill({ color: 0xffffff, alpha: 0.8 });
            }
            // Save normalized X position (0-1 across river width)
            particle.normalizedX = Math.random();
            particle.baseY = Math.random() * 15 - 10; // Stay near bottom (-10 to +5)
            particle.x = 0; // Will be set in first update
            particle.y = particle.baseY;
            particle.vx = (Math.random() - 0.5) * 2; // Less horizontal movement
            particle.vy = -Math.random() * 2.5 - 1; // Higher bounce (-1 to -3.5)
            particle.bobSpeed = 0.05 + Math.random() * 0.08;
            particle.phase = Math.random() * Math.PI * 2;
            particle.gravity = 0.12; // Slightly less gravity so they stay up longer
            this.foam.addChild(particle);
            splashParticles.push(particle);
        }
        
        this.foam.y = height;
        this.foam.splashParticles = splashParticles;
        this.foam.animTime = 0;

    }

    createWaveWakes(width, height) {
        // Add circular and concentric waves as textured sprites (water_circles)
        let rippleTextures = null;
        if (window.ParticleManager && window.ParticleManager.textures && window.ParticleManager.textures.waterCircleFrames) {
            rippleTextures = window.ParticleManager.textures.waterCircleFrames;
        } else if (window.preloadedResources && window.preloadedResources.waterCircleFrames) {
            rippleTextures = window.preloadedResources.waterCircleFrames;
        }
        if (rippleTextures && !Array.isArray(rippleTextures)) {
            rippleTextures = Object.values(rippleTextures);
        }
        if (rippleTextures) {
            rippleTextures = rippleTextures.filter(t => t && t.source);
        }
        const waveResults = window.ParticleManager.createWaterfallWaves(this.waveWakes, rippleTextures, this.riverWidth);
        this.waveWakes.y = height;
        this.waveWakes.circularWaves = waveResults.circularWaves;
        this.waveWakes.concentricWaves = waveResults.concentricWaves;
        this.waveWakes.animTime = 0;
    }
    
    getContainer() {
        return this.container;
    }
    
    getFoam() {
        return this.foam;
    }
    
    getWaveWakes() {
        return this.waveWakes;
    }
    
    setPosition(x, y) {
        this.container.x = x;
        this.container.y = y;
        
        // Move debug box if it exists
        if (this.debugBox) {
            this.debugBox.x = x;
            this.debugBox.y = y;
        }
        
        // Only recalculate boundaries if we have a function for it
        if (this.getBoundariesAtY) {
            const foamY = y + this.container.waterfallHeight;
            const boundaries = this.getBoundariesAtY(foamY);
            const oldRiverLeft = this.riverLeft;
            const oldRiverWidth = this.riverWidth;
            this.riverWidth = boundaries.width;
            this.riverLeft = boundaries.left - this.config.width / 2;
            this.riverRight = boundaries.right - this.config.width / 2;
            
            // Remember the river's center X for this waterfall
            this.riverCenterX = (boundaries.left + boundaries.right) / 2;
            
            // Move foam and waves to the river's center
            this.foam.x = this.riverCenterX;
            this.foam.y = y + this.container.waterfallHeight;
            this.waveWakes.x = this.riverCenterX;
            this.waveWakes.y = y + this.container.waterfallHeight;
            
            // Move all particles to fit the new boundaries
            if (this.foam.splashParticles) {
                this.foam.splashParticles.forEach(particle => {
                    // Convert old X to normalized (0-1)
                    const normalized = (particle.baseX + oldRiverWidth / 2) / oldRiverWidth;
                    // Place in new boundaries (relative to center)
                    particle.baseX = (normalized - 0.5) * this.riverWidth;
                });
            }
            
            // Move circular waves to fit new boundaries
            if (this.waveWakes.circularWaves) {
                this.waveWakes.circularWaves.forEach(ring => {
                    const normalized = (ring.x + oldRiverWidth / 2) / oldRiverWidth;
                    ring.x = (normalized - 0.5) * this.riverWidth;
                });
            }
            
            // Move concentric waves to fit new boundaries
            if (this.waveWakes.concentricWaves) {
                this.waveWakes.concentricWaves.forEach(ring => {
                    const normalized = (ring.x + oldRiverWidth / 2) / oldRiverWidth;
                    ring.x = (normalized - 0.5) * this.riverWidth;
                });
            }
        } else {
            // If no boundary function, just use given x/y
            this.foam.x = x;
            this.foam.y = y + this.container.waterfallHeight;
            this.waveWakes.x = x;
            this.waveWakes.y = y + this.container.waterfallHeight;
        }
    }
    
    update() {
        // Only update at the set FPS
        const now = performance.now();
        if (!this.lastUpdateTime) this.lastUpdateTime = 0;
        if (now - this.lastUpdateTime < 1000 / Waterfall.FPS) return;
        const dt = Waterfall.DT;
        this.lastUpdateTime = now;
        
        // Move foam to the right Y position first
        const foamY = this.container.y + this.container.waterfallHeight;
        this.foam.y = foamY;
        this.waveWakes.y = foamY;
        
        // Only recalculate boundaries if Y changed
        if (this.cachedY !== foamY) {
            this.cachedY = foamY;
            if (this.getBoundariesAtY) {
                this.cachedBoundaries = this.getBoundariesAtY(foamY);
            }
        }
        
        // Use the cached boundaries if available
        if (this.cachedBoundaries) {
            this.riverWidth = this.cachedBoundaries.right - this.cachedBoundaries.left;
            this.foam.x = this.cachedBoundaries.center;
            this.waveWakes.x = this.cachedBoundaries.center;
        }
        
        // Animate foam splash particles
        this.foam.animTime += dt;
        this.waveWakes.animTime += dt;
        if (this.foam.splashParticles) {
            this.foam.splashParticles.forEach((particle, idx) => {
                particle.baseX = (particle.normalizedX - 0.5) * this.riverWidth;
                particle.phase += particle.bobSpeed * dt;
                particle.vy += particle.gravity * dt;
                if (particle.y > 30) {
                    particle.y = particle.baseY;
                    particle.vy = -Math.random() * 2.5 - 1;
                }
                particle.x = particle.baseX + Math.sin(particle.phase) * 10 + particle.vx * dt;
                particle.y += particle.vy * dt;
                particle.alpha = 0.6 + Math.sin(particle.phase * 2) * 0.3;
            });
        }
        // Animate circular waves (sprites)
        if (this.waveWakes.circularWaves) {
            this.waveWakes.circularWaves.forEach(ring => {
                ring.x = (ring.normalizedX - 0.5) * this.riverWidth;
                ring.timer += dt;
                if (ring.timer > ring.delay) {
                    ring.radius += ring.speed * dt;
                    if (ring.radius > ring.maxRadius) {
                        ring.radius = 0;
                        ring.timer = 0;
                    }
                    const progress = ring.radius / ring.maxRadius;
                    const scaleX = ring.baseScale + (ring.maxScale - ring.baseScale) * progress;
                    const scaleY = scaleX * 0.6;
                    if (ring.scale && typeof ring.scale.set === 'function') ring.scale.set(scaleX, scaleY);
                    ring.alpha = 0.6 * (1 - progress);
                } else {
                    ring.alpha = 0;
                }
            });
        }
        // Animate concentric waves (sprites)
        if (this.waveWakes.concentricWaves) {
            this.waveWakes.concentricWaves.forEach(ring => {
                ring.x = (ring.normalizedX - 0.5) * this.riverWidth;
                ring.timer += dt;
                if (ring.timer > ring.delay) {
                    ring.radius += ring.speed * dt;
                    if (ring.radius > ring.maxRadius) {
                        ring.radius = 0;
                        ring.timer = 0;
                    }
                    const progress = ring.radius / ring.maxRadius;
                    const scaleX = ring.baseScale + (ring.maxScale - ring.baseScale) * progress;
                    const scaleY = scaleX * 0.6;
                    if (ring.scale && typeof ring.scale.set === 'function') ring.scale.set(scaleX, scaleY);
                    ring.alpha = 0.7 * (1 - progress);
                } else {
                    ring.alpha = 0;
                }
            });
        }
        // Animate the water texture and displacement for a flowing look
        if (this.container.textureSprite) {
            this.container.animationOffset += 4 * dt / 2;
            this.container.textureSprite.tilePosition.y = this.container.animationOffset;
        }
        if (this.container.displacementSprite) {
            this.container.displacementSprite.y += 2 * dt / 2;
        }
        // Animate small ripples on the waterfall (sprites)
        if (this.container.ripples) {
            this.container.ripples.forEach(ripple => {
                ripple.y += ripple.speedY * dt;
                ripple.alpha -= ripple.fadeSpeed * dt;
                // Grow the ripple as it fades
                if (ripple.scale && ripple.baseScale) {
                    ripple.scale.set(ripple.scale.x + ripple.rippleGrowth * dt);
                }
                if (ripple.y > this.container.waterfallHeight || ripple.alpha <= 0) {
                    ripple.y = 0;
                    ripple.x = (Math.random() - 0.5) * this.container.waterfallHeight * 0.4;
                    ripple.alpha = Math.random() * 0.3;
                    if (ripple.baseScale) ripple.scale.set(ripple.baseScale);
                }
            });
        }
        // Animate impact ripples at the bottom (sprites)
        if (this.container.impactRipples) {
            this.container.impactRipples.forEach(ripple => {
                if (ripple.delay > 0) {
                    ripple.delay -= dt;
                    ripple.visible = false;
                    return;
                }
                ripple.visible = true;
                ripple.timer += dt;
                // Expand and fade
                let progress = ripple.timer * ripple.expandSpeed * 0.03;
                if (progress > 1) progress = 1;
                const scale = 0.1 + (ripple.maxScale - 0.1) * progress;
                if (ripple.scale && typeof ripple.scale.set === 'function') ripple.scale.set(scale);
                ripple.alpha = ripple.initialAlpha * (1 - progress);
                if (progress >= 1) {
                    ripple.timer = 0;
                    ripple.delay = Math.random() * 30;
                    ripple.x = (Math.random() - 0.5) * (this.container.waterfallHeight * 0.4);
                    ripple.y = Math.random() * (this.container.waterfallHeight * 0.15);
                }
            });
        }
        // Animate water splashes at the bottom
        if (this.container.splashes) {
            this.container.splashes.forEach(splash => {
                splash.timer -= dt;
                if (splash.timer <= 0 && !splash.active) {
                    splash.active = true;
                    splash.particles.forEach(particle => {
                        particle.x = splash.x;
                        particle.y = splash.y;
                        particle.life = 1;
                        particle.alpha = 0.7;
                        particle.visible = true;
                    });
                }
                if (splash.active) {
                    let allDead = true;
                    splash.particles.forEach(particle => {
                        if (particle.life > 0) {
                            allDead = false;
                            particle.velocityY += particle.gravity * dt;
                            particle.x += particle.velocityX * dt;
                            particle.y += particle.velocityY * dt;
                            particle.life -= particle.fadeSpeed * dt;
                            particle.alpha = Math.max(0, particle.life * 0.7);
                            if (particle.life <= 0) {
                                particle.visible = false;
                            }
                        }
                    });
                    if (allDead) {
                        splash.active = false;
                        splash.timer = (10 + Math.random() * 30) * dt;
                        splash.x = (Math.random() - 0.5) * this.container.waterfallHeight * 0.4;
                    }
                }
            });
        }
        // Animate the white foam mist at the bottom
        if (this.container.foamMist) {
            this.container.mistTime += 0.1 * dt;
            this.container.foamMist.clear();
            for (let i = 0; i < 15; i++) {
                const x = this.riverLeft + Math.random() * this.riverWidth;
                const y = Math.random() * 20 - 10;
                const size = 3 + Math.random() * 8;
                const alpha = 0.1 + Math.random() * 0.2;
                this.container.foamMist.circle(x, y, size);
                this.container.foamMist.fill({ color: 0xffffff, alpha });
            }
        }
        // Animate the foam sprite's vertical position
        if (this.container.foamSprite) {
            this.container.foamAnimationTime += 0.1 * dt;
            this.container.foamSprite.y = Math.sin(this.container.foamAnimationTime) * 5;
        }
    }
    
    recycle(playerPos, index, screenHeight, minSpacing) {
        // Move the waterfall back to the top if it's too far behind the player
        if (this.container.y > playerPos.y + screenHeight) {
            this.setPosition(
                this.config.width / 2,
                playerPos.y - screenHeight - minSpacing * (5 - index) - Math.random() * 500
            );
        }
    }
    
    setDebugMode(enabled) {
        if (enabled && !this.debugBox && this.world) {
            // Draw a debug box and add it to the world (not the container) so it's always visible
            const width = 800;
            const height = this.container.waterfallHeight || 80;
            
            this.debugBox = new PIXI.Graphics();
            this.debugBox.setStrokeStyle({ width: 3, color: 0xffffff, alpha: 1 });
            this.debugBox.rect(-width / 2, 0, width, height);
            this.debugBox.stroke();
            this.debugBox.label = 'waterfallDebugBox';
            this.debugBox.zIndex = 150; // Above foam (15) and banks (10), below debug borders (100)
            
            // Place the debug box at the same spot as the waterfall
            this.debugBox.x = this.container.x;
            this.debugBox.y = this.container.y;
            
            // Add the debug box to the world, not the container
            this.world.addChild(this.debugBox);
        } else if (!enabled && this.debugBox && this.world) {
            // Take the debug box out of the world
            this.world.removeChild(this.debugBox);
            this.debugBox = null;
        }
    }

    // Call this once after creating your PIXI.Application
    static generateSplashTextures(renderer) {
        if (!renderer || typeof renderer.generateTexture !== 'function') {
            console.warn('[Waterfall] Skipping splash texture generation: renderer is null or invalid.');
            return;
        }
        Waterfall.splashTextures = [];
        for (let size = 1; size <= 3; size++) {
            const g = new PIXI.Graphics();
            g.circle(0, 0, size + Math.random());
            g.fill({ color: 0xffffff, alpha: 0.7 });
            // Use 'linear' string for scaleMode to avoid deprecation warning
            Waterfall.splashTextures.push(renderer.generateTexture(g, {resolution: 2, scaleMode: 'linear'}));
        }
    }

}
// Static properties (ES5-compatible)
Waterfall.splashTextures = [];
Waterfall.FPS = 30;
Waterfall.DT = 90 / Waterfall.FPS;
