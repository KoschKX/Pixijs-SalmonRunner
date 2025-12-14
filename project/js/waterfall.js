class Waterfall {
    static FPS = 30; // Change this to your desired FPS
    static DT = 90 / Waterfall.FPS;
    
    constructor(config, boundaries = { left: 150, right: 650, width: 450 }, getBoundariesAtY = null) {
        this.config = config;
        this.getBoundariesAtY = getBoundariesAtY;
        this.boundaries = boundaries;
        this.riverWidth = boundaries.width;
        this.riverLeft = boundaries.left - config.width / 2; // Relative to center
        this.riverRight = boundaries.right - config.width / 2; // Relative to center
        this.container = new PIXI.Container();
        this.container.label = 'waterfall';
        this.type = 'waterfall';
        this.container.type = 'waterfall';
        
        // Cache for boundary lookups
        this.cachedBoundaries = null;
        this.cachedY = null;
        
        // Debug mode - store reference to world for adding debug box
        this.debugBox = null;
        this.world = null; // Will be set when added to world
        
        const width = 800;
        const height = 80 + Math.random() * 30; // Shorter waterfalls
        
        this.createWaterfallGraphics(width, height);
        this.createFoam(width, height);
        
        this.container.waterfallHeight = height;
    }
    
    createWaterfallGraphics(width, height) {
        // Use the same river texture as the background
        const waterfallTexture = PIXI.Texture.from('assets/riverbed_B.jpg');
        const textureSprite = new PIXI.TilingSprite({
            texture: waterfallTexture,
            width: width,
            height: height
        });
        textureSprite.x = -width / 2;
        textureSprite.tileScale.set(256 / waterfallTexture.source.width, 256 / waterfallTexture.source.height);
        
        // Add blue water overlay (same as river)
        const waterOverlay = new PIXI.Graphics();
        waterOverlay.rect(-width / 2, 0, width, height);
        waterOverlay.fill({ color: 0x0066cc, alpha: 0.4 });
        
        // Create displacement for turbulent water effect
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
        
        // Create gradient alpha mask
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
        
        // Store references for animation
        this.container.textureSprite = textureSprite;
        this.container.displacementSprite = displacementSprite;
        this.container.animationOffset = Math.random() * 100;
        
        // 30fps timer
        this.lastUpdateTime = 0;
        
        this.createRipples(width, height);
        this.createImpactRipples(width, height);
        this.createSplashes(width, height);
        this.createFoamMist(width, height);
        this.createFoamStreaks(width, height, displacementFilter);
        this.createTopEdge(width, height);
    }
    
    createRipples(width, height) {
        const rippleContainer = new PIXI.Container();
        const ripples = [];
        const rippleCount = 8; // Reduced from 25 for performance
        
        for (let i = 0; i < rippleCount; i++) {
            const ripple = new PIXI.Graphics();
            ripple.circle(0, 0, 2 + Math.random() * 3);
            ripple.fill({ color: 0xffffff, alpha: 0.3 });
            
            ripple.x = (Math.random() - 0.5) * width;
            ripple.y = Math.random() * height;
            ripple.speedY = 2 + Math.random() * 3;
            ripple.fadeSpeed = 0.005 + Math.random() * 0.01;
            ripple.alpha = Math.random() * 0.3;
            
            rippleContainer.addChild(ripple);
            ripples.push(ripple);
        }
        
        this.container.addChild(rippleContainer);
        this.container.ripples = ripples;
    }
    
    createImpactRipples(width, height) {
        const impactRippleContainer = new PIXI.Container();
        impactRippleContainer.y = height * 0.85;
        const impactRipples = [];
        const impactRippleCount = 5; // Reduced from 15 for performance
        
        for (let i = 0; i < impactRippleCount; i++) {
            const ripple = new PIXI.Graphics();
            
            const x = (Math.random() - 0.5) * width;
            const maxRadius = 15 + Math.random() * 25;
            
            ripple.x = x;
            ripple.y = Math.random() * (height * 0.15);
            ripple.maxRadius = maxRadius;
            ripple.radius = 0;
            ripple.expandSpeed = 1.2 + Math.random() * 1.5;
            ripple.initialAlpha = 0.4 + Math.random() * 0.3;
            ripple.delay = Math.random() * 60;
            
            impactRippleContainer.addChild(ripple);
            impactRipples.push(ripple);
        }
        
        this.container.addChild(impactRippleContainer);
        this.container.impactRipples = impactRipples;
    }
    
    createSplashes(width, height) {
        const splashContainer = new PIXI.Container();
        splashContainer.y = height * 0.88;
        
        const splashes = [];
        const splashCount = 10; // Reduced from 30 for performance
        
        for (let i = 0; i < splashCount; i++) {
            const splash = {
                x: (Math.random() - 0.5) * width,
                y: 0,
                particles: [],
                active: false,
                timer: Math.random() * 60,
                burstSize: 3 + Math.random() * 3 // Reduced from 5-13 to 3-6
            };
            
            for (let j = 0; j < splash.burstSize; j++) {
                const particle = new PIXI.Graphics();
                particle.circle(0, 0, 1 + Math.random() * 2);
                particle.fill({ color: 0xffffff, alpha: 0.7 });
                particle.velocityX = (Math.random() - 0.5) * 6;
                particle.velocityY = -3 - Math.random() * 5;
                particle.gravity = 0.2;
                particle.life = 1;
                particle.fadeSpeed = 0.02 + Math.random() * 0.02;
                particle.visible = false;
                
                splashContainer.addChild(particle);
                splash.particles.push(particle);
            }
            
            splashes.push(splash);
        }
        
        this.container.addChild(splashContainer);
        this.container.splashes = splashes;
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
        
        const streakCount = 80 + Math.random() * 40;
        
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
        // Create separate containers for waves (lower z-index) and particles (higher z-index)
        this.waveWakes = new PIXI.Container();
        this.foam = new PIXI.Container();
        
        // Create splash particles at the bottom where wake waves happen
        const splashParticles = [];
        for (let i = 0; i < 100; i++) {
            const particle = new PIXI.Graphics();
            const radius = 1 + Math.random() * 3;
            particle.circle(0, 0, radius);
            particle.fill({ color: 0xffffff, alpha: 0.8 });
            
            // Store normalized position (0-1 across river width)
            // Don't calculate baseX yet - riverWidth is not set until first update()
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
        
        // Create circular waves - span across actual river width at this Y coordinate
        const circularWaves = [];
        for (let i = 0; i < 15; i++) {
            const ring = new PIXI.Graphics();
            // Store normalized position - don't calculate X yet (riverWidth not set)
            ring.normalizedX = Math.random();
            ring.x = 0; // Will be set in first update
            ring.y = Math.random() * 20 - 25;
            ring.radius = 0;
            ring.maxRadius = 25 + Math.random() * 20;
            ring.speed = 1.2 + Math.random() * 0.8;
            ring.delay = i * 4;
            ring.timer = 0;
            
            this.waveWakes.addChild(ring);
            circularWaves.push(ring);
        }
        
        // Create concentric waves - span across actual river width at this Y coordinate
        const concentricWaves = [];
        for (let i = 0; i < 8; i++) {
            const ring = new PIXI.Graphics();
            // Store normalized position - don't calculate X yet (riverWidth not set)
            ring.normalizedX = Math.random();
            ring.x = 0; // Will be set in first update
            ring.y = Math.random() * 10 - 20;
            ring.radius = i * 10;
            ring.maxRadius = 70;
            ring.speed = 0.8;
            ring.delay = i * 6;
            ring.timer = 0;
            
            this.waveWakes.addChild(ring);
            concentricWaves.push(ring);
        }
        
        this.waveWakes.y = height;
        this.foam.y = height;
        this.waveWakes.circularWaves = circularWaves;
        this.waveWakes.concentricWaves = concentricWaves;
        this.waveWakes.animTime = 0;
        this.foam.splashParticles = splashParticles;
        this.foam.animTime = 0;
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
        
        // Update debug box position if it exists
        if (this.debugBox) {
            this.debugBox.x = x;
            this.debugBox.y = y;
        }
        
        // Calculate boundaries ONCE based on the foam position if we have the function
        if (this.getBoundariesAtY) {
            const foamY = y + this.container.waterfallHeight;
            const boundaries = this.getBoundariesAtY(foamY);
            const oldRiverLeft = this.riverLeft;
            const oldRiverWidth = this.riverWidth;
            this.riverWidth = boundaries.width;
            this.riverLeft = boundaries.left - this.config.width / 2;
            this.riverRight = boundaries.right - this.config.width / 2;
            
            // Store the river center X for this waterfall
            this.riverCenterX = (boundaries.left + boundaries.right) / 2;
            
            // Position foam and waves at the river center
            this.foam.x = this.riverCenterX;
            this.foam.y = y + this.container.waterfallHeight;
            this.waveWakes.x = this.riverCenterX;
            this.waveWakes.y = y + this.container.waterfallHeight;
            
            // Reposition all particles to match new boundaries
            if (this.foam.splashParticles) {
                this.foam.splashParticles.forEach(particle => {
                    // Convert from old position to normalized position (0-1)
                    const normalized = (particle.baseX + oldRiverWidth / 2) / oldRiverWidth;
                    // Apply to new boundaries (relative to center)
                    particle.baseX = (normalized - 0.5) * this.riverWidth;
                });
            }
            
            // Reposition circular waves
            if (this.waveWakes.circularWaves) {
                this.waveWakes.circularWaves.forEach(ring => {
                    const normalized = (ring.x + oldRiverWidth / 2) / oldRiverWidth;
                    ring.x = (normalized - 0.5) * this.riverWidth;
                });
            }
            
            // Reposition concentric waves
            if (this.waveWakes.concentricWaves) {
                this.waveWakes.concentricWaves.forEach(ring => {
                    const normalized = (ring.x + oldRiverWidth / 2) / oldRiverWidth;
                    ring.x = (normalized - 0.5) * this.riverWidth;
                });
            }
        } else {
            // Fallback if no boundary function provided
            this.foam.x = x;
            this.foam.y = y + this.container.waterfallHeight;
            this.waveWakes.x = x;
            this.waveWakes.y = y + this.container.waterfallHeight;
        }
    }
    
    update() {
        // Throttle to Waterfall.FPS
        const now = performance.now();
        if (!this.lastUpdateTime) this.lastUpdateTime = 0;
        if (now - this.lastUpdateTime < 1000 / Waterfall.FPS) return;
        const dt = Waterfall.DT;
        this.lastUpdateTime = now;
        
        // Update foam Y position first
        const foamY = this.container.y + this.container.waterfallHeight;
        this.foam.y = foamY;
        this.waveWakes.y = foamY;
        
        // Cache boundary lookup - only recalculate if Y changed
        if (this.cachedY !== foamY) {
            this.cachedY = foamY;
            if (this.getBoundariesAtY) {
                this.cachedBoundaries = this.getBoundariesAtY(foamY);
            }
        }
        
        // Use cached boundaries
        if (this.cachedBoundaries) {
            this.riverWidth = this.cachedBoundaries.right - this.cachedBoundaries.left;
            this.foam.x = this.cachedBoundaries.center;
            this.waveWakes.x = this.cachedBoundaries.center;
        }
        
        // Animate splash particles with spray
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
        // Animate circular expanding waves
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
                    ring.clear();
                    const alpha = 1 - (ring.radius / ring.maxRadius);
                    if (alpha > 0.1) {
                        ring.ellipse(0, 0, ring.radius, ring.radius * 0.6);
                        ring.stroke({ width: 2, color: 0xffffff, alpha: alpha * 0.6 });
                    }
                }
            });
        }
        // Animate concentric waves
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
                    ring.clear();
                    const alpha = 1 - (ring.radius / ring.maxRadius);
                    if (alpha > 0.15) {
                        ring.ellipse(0, 0, ring.radius, ring.radius * 0.6);
                        ring.stroke({ width: 2.5, color: 0xffffff, alpha: alpha * 0.7 });
                    }
                }
            });
        }
        // Animate texture and displacement for flowing water effect
        if (this.container.textureSprite) {
            this.container.animationOffset += 4 * dt / 2;
            this.container.textureSprite.tilePosition.y = this.container.animationOffset;
        }
        if (this.container.displacementSprite) {
            this.container.displacementSprite.y += 2 * dt / 2;
        }
        // Animate waterfall ripples
        if (this.container.ripples) {
            this.container.ripples.forEach(ripple => {
                ripple.y += ripple.speedY * dt;
                ripple.alpha -= ripple.fadeSpeed * dt;
                if (ripple.y > this.container.waterfallHeight || ripple.alpha <= 0) {
                    ripple.y = 0;
                    ripple.x = (Math.random() - 0.5) * this.container.waterfallHeight * 0.4;
                    ripple.alpha = Math.random() * 0.3;
                }
            });
        }
        // Animate impact ripples at bottom
        if (this.container.impactRipples) {
            this.container.impactRipples.forEach(ripple => {
                if (ripple.delay > 0) {
                    ripple.delay -= dt;
                    return;
                }
                ripple.radius += ripple.expandSpeed * dt;
                const progress = ripple.radius / ripple.maxRadius;
                const alpha = ripple.initialAlpha * (1 - progress);
                ripple.clear();
                if (ripple.radius < ripple.maxRadius && ripple.radius > 0) {
                    ripple.circle(0, 0, ripple.radius);
                    ripple.stroke({ width: 2, color: 0xffffff, alpha: alpha });
                }
                if (ripple.radius >= ripple.maxRadius) {
                    ripple.radius = 0;
                    ripple.delay = Math.random() * 30;
                    ripple.x = (Math.random() - 0.5) * (this.container.waterfallHeight * 0.4);
                    ripple.y = Math.random() * (this.container.waterfallHeight * 0.15);
                }
            });
        }
        // Animate water splashes at bottom
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
        // Animate white foam mist at bottom
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
        // Animate foam sprite position
        if (this.container.foamSprite) {
            this.container.foamAnimationTime += 0.1 * dt;
            this.container.foamSprite.y = Math.sin(this.container.foamAnimationTime) * 5;
        }
    }
    
    recycle(playerPos, index, screenHeight, minSpacing) {
        // Recycle waterfall if too far behind player
        if (this.container.y > playerPos.y + screenHeight) {
            this.setPosition(
                this.config.width / 2,
                playerPos.y - screenHeight - minSpacing * (5 - index) - Math.random() * 500
            );
        }
    }
    
    setDebugMode(enabled) {
        if (enabled && !this.debugBox && this.world) {
            // Create debug box and add to world (not container) so it's always visible
            const width = 800;
            const height = this.container.waterfallHeight || 80;
            
            this.debugBox = new PIXI.Graphics();
            this.debugBox.setStrokeStyle({ width: 3, color: 0xffffff, alpha: 1 });
            this.debugBox.rect(-width / 2, 0, width, height);
            this.debugBox.stroke();
            this.debugBox.label = 'waterfallDebugBox';
            this.debugBox.zIndex = 150; // Above foam (15) and banks (10), below debug borders (100)
            
            // Position at same location as waterfall container
            this.debugBox.x = this.container.x;
            this.debugBox.y = this.container.y;
            
            // Add to world, not container
            this.world.addChild(this.debugBox);
        } else if (!enabled && this.debugBox && this.world) {
            // Remove debug box from world
            this.world.removeChild(this.debugBox);
            this.debugBox = null;
        }
    }
}
