// Utility: Wait for particleFrames to be valid before generating textures
function waitForParticleFramesValid(maxWaitMs = 3000) {
    function areParticleFramesValid() {
        const frames = window.preloadedResources && window.preloadedResources.particleFrames;
        if (!frames) return false;
        const keys = Object.keys(frames);
        if (!keys.length) return false;
        for (const k of keys) {
            const t = frames[k];
            if (!t || !(t.source && t.source.width > 0 && t.source.height > 0)) return false;
        }
        return true;
    }
    return new Promise(resolve => {
        const start = performance.now();
        function check() {
            if (areParticleFramesValid()) return resolve();
            if (performance.now() - start > maxWaitMs) {
                return resolve();
            }
            setTimeout(check, 50);
        }
        check();
    });
}
//ParticleManager.js
// Manages all particle effects, foam, waves, and streaks in the game
// Requires RiverStreaks to be loaded globally before this script

// Utility: Wait for particleFrames to be valid before generating textures
function waitForParticleFramesValid(maxWaitMs = 3000) {
    function areParticleFramesValid() {
        const frames = window.preloadedResources && window.preloadedResources.particleFrames;
        if (!frames) return false;
        const keys = Object.keys(frames);
        if (!keys.length) return false;
        for (const k of keys) {
            const t = frames[k];
            if (!t || !(t.source && t.source.width > 0 && t.source.height > 0)) return false;
        }
        return true;
    }
    return new Promise(resolve => {
        const start = performance.now();
        function check() {
            if (areParticleFramesValid()) return resolve();
            if (performance.now() - start > maxWaitMs) {
                return resolve();
            }
            setTimeout(check, 50);
        }
        check();
    });
}

class ParticleManager {
            // For rate-limited debug logging
            static lastSummaryLog = 0;
        // Maximum number of particles and foam allowed (lower on mobile)
        static getMaxParticles() {
            if (window.game && window.game.mobileMode) return 80;
            return 180;
        }
        static getMaxFoam() {
            if (window.game && window.game.mobileMode) return 32;
            return 64;
        }
    // Static cache for pre-rendered textures
    static textures = {};
    // Call this ONCE after PIXI.Application is created, before any particles are emitted
    static generateParticleTextures(renderer) {
        // Wait for particleFrames to be valid before generating textures
        return waitForParticleFramesValid(3000).then(function() {
            // Use textures from the loaded spritesheet atlases (preloadedResources.particleFrames and preloadedResources.waterCircleFrames)
            const foamKeys = ['foam_0', 'foam_1', 'foam_2', 'foam_3', 'foam_4', 'foam_6', 'foam_8'];
            const splashKeys = ['splash_2', 'splash_4', 'splash_6', 'splash_8'];
            const waterCircleKeys = [8, 16, 24, 32, 40, 48, 56].map(size => `water_circle_${size}`);
            if (window.preloadedResources) {
                if (window.preloadedResources.particleFrames) {
                    [...foamKeys, ...splashKeys].forEach(key => {
                        const tex = window.preloadedResources.particleFrames[key];
                        if (tex && tex.source && tex.source.width > 0 && tex.source.height > 0) {
                            ParticleManager.textures[key] = tex;
                        }
                    });
                }
                if (window.preloadedResources.waterCircleFrames) {
                    waterCircleKeys.forEach(key => {
                        const tex = window.preloadedResources.waterCircleFrames[key];
                        if (tex && tex.source && tex.source.width > 0 && tex.source.height > 0) {
                            ParticleManager.textures[key] = tex;
                        }
                    });
                }
            }
        });
    }
    static FPS = 30; // Set the target FPS for particle updates
    static DT = 45 / ParticleManager.FPS;

        // Emit foam at a stone's position using its hitbox and scale
        emitFoamAtStone(stone) {
            // Emit foam every other frame for density
            if (!stone.foamFrame) stone.foamFrame = 0;
            stone.foamFrame++;
            if (stone.foamFrame % 2 !== 0) return;

            const container = stone.container || stone.getContainer && stone.getContainer();
            const sprite = stone.sprite;
            if (!container || !sprite) return;
            const hitbox = container.hitboxData;
            const scale = sprite.scale?.x;
            if (!hitbox || !scale || !hitbox.width) return;

            // Calculate the center and radii of the hitbox
            const hb = hitbox;
            const centerX = container.x + (hb.x + hb.width / 2 - (stone.frameWidth || 64) / 2) * scale;
            const centerY = container.y + (hb.y + hb.height / 2 - (stone.frameHeight || 64) / 2) * scale;
            const radiusX = (hb.width * scale) / 2;
            const radiusY = (hb.height * scale) / 2;

            // Place foam particles along the edge of the hitbox (ellipse)
            const arcParticles = 12;
            const arcStart = -Math.PI * 0.95;
            const arcEnd = -Math.PI * 0.05;
            for (let i = 0; i < arcParticles; i++) {
                const t = (i + Math.random() * 0.7) / (arcParticles - 1);
                const angle = arcStart + (arcEnd - arcStart) * t + (Math.random() - 0.5) * 0.08;
                // Position on the ellipse border
                const spawnX = centerX + Math.cos(angle) * radiusX + (Math.random() - 0.5) * 2.5;
                const spawnY = centerY + Math.sin(angle) * radiusY + (Math.random() - 0.5) * 2.5;
                // Add some randomness to the outward velocity
                const speed = 0.32 + Math.random() * 0.22;
                const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.22;
                const vy = Math.sin(angle) * speed + (Math.random() - 0.5) * 0.18;
                    // Pick foam texture index inside the loop
                    const foamIndices = [0, 1, 2, 3, 4, 6, 8];
                    const foamIdx = foamIndices[Math.floor(Math.random() * foamIndices.length)];
                    let tex = ParticleManager.textures['foam_' + foamIdx];
                    let foam;
                    // PixiJS v8+ texture validity: check source width/height
                    const isValid = tex && (
                        (tex.source && tex.source.width > 0 && tex.source.height > 0) ||
                        (tex.baseTexture && tex.baseTexture.width > 0 && tex.baseTexture.height > 0)
                    );
                    if (isValid) {
                        foam = new PIXI.Sprite(tex);
                        foam.anchor.set(0.5);
                    } else {
                        foam = new PIXI.Graphics();
                        foam.ellipse(0, 0, 5, 8);
                        foam.fill(0x3399ff); // Blue fallback for foam
                        // Visual debug: red outline for fallback
                        foam.ellipse(0, 0, 5, 8);
                        foam.stroke({ width: 2, color: 0xff0000, alpha: 1 });
                    }
                foam.x = spawnX;
                foam.y = spawnY;
                foam.vx = vx;
                foam.vy = vy;
                foam.life = 16 + Math.random() * 6;
                foam.alpha = 0.55 + Math.random() * 0.25;
                foam.zIndex = 9;
                this.addFoam(foam);
            }
        }

        // Update foam particles: move, fade, and remove when done
        updateFoam(deltaTime = 1) {
            const dt = deltaTime * ParticleManager.DT;
            for (let i = this.foam.length - 1; i >= 0; i--) {
                const f = this.foam[i];
                f.x += f.vx * dt;
                f.y += f.vy * dt;
                f.life -= dt;
                f.alpha *= Math.pow(0.96, ParticleManager.DT);
                if (f.life <= 0 || f.alpha < 0.05) {
                    this.removeFoam(f);
                }
            }
        }
    constructor(world, config, getRiverPathAtY) {
        this.world = world;
        this.config = config;
        this.getRiverPathAtY = getRiverPathAtY;
        this.particles = [];
        this.foam = [];
        this.waveContainers = [];
        this.riverStreaks = new RiverStreaks(world, config, getRiverPathAtY);
        // ParticleContainer for batching foam and splash particles
        this.pixiParticleContainer = new PIXI.Container();
        this.pixiParticleContainer.zIndex = 8;
        this.world.addChild(this.pixiParticleContainer);
        this.pixiParticleContainer.x = 0;
        this.pixiParticleContainer.y = 0;
        // (Debug visuals removed)
    }
    addFoam(foam) {
        // Limit foam count
        if (this.foam.length >= ParticleManager.getMaxFoam()) {
            // Remove the oldest foam
            const old = this.foam.shift();
            if (old) {
                if (old instanceof PIXI.Sprite) {
                    this.pixiParticleContainer.removeChild(old);
                } else {
                    this.world.removeChild(old);
                }
            }
        }
        this.foam.push(foam);
        if (foam instanceof PIXI.Sprite) {
            // PixiJS v8+ texture validity: check source/baseTexture width/height
            if (!foam.texture ||
                !((foam.texture.source && foam.texture.source.width > 0 && foam.texture.source.height > 0) ||
                  (foam.texture.baseTexture && foam.texture.baseTexture.width > 0 && foam.texture.baseTexture.height > 0))) {
            }
            this.pixiParticleContainer.addChild(foam);
        } else {
            this.world.addChild(foam);
        }
    }

    removeFoam(foam) {
        const idx = this.foam.indexOf(foam);
        if (idx !== -1) this.foam.splice(idx, 1);
        if (foam instanceof PIXI.Sprite) {
            this.pixiParticleContainer.removeChild(foam);
        } else {
            this.world.removeChild(foam);
        }
    }

    addWaveContainer(wave) {
        this.waveContainers.push(wave);
        this.world.addChild(wave);
    }

    removeWaveContainer(wave) {
        const idx = this.waveContainers.indexOf(wave);
        if (idx !== -1) this.waveContainers.splice(idx, 1);
        this.world.removeChild(wave);
    }

    updateStreaks(playerPos) {
        if (this.riverStreaks) this.riverStreaks.update(playerPos);
    }

    destroyStreaks() {
        if (this.riverStreaks) this.riverStreaks.destroy();
        this.riverStreaks = null;
    }

    emitSplash(x, y, options = {}) {
        // Emit a burst or spray of particles with smooth fade and velocity damping
        const count = options.count || 36;
        const minSize = options.minSize || 3;
        const maxSize = options.maxSize || 7;
        const minSpeed = options.minSpeed || 10;
        const maxSpeed = options.maxSpeed || 22;
        const minAlpha = options.minAlpha !== undefined ? options.minAlpha : 0.85;
        const maxAlpha = options.maxAlpha !== undefined ? options.maxAlpha : 1.0;
        const color = options.color !== undefined ? options.color : 0xffffff;
        const upwardSpray = options.upwardSpray || false;
        const lifetime = options.lifetime || 38;
        // Limit total particles
        const maxParticles = ParticleManager.getMaxParticles();
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= maxParticles) {
                // Remove the oldest particle
                const old = this.particles.shift();
                if (old) {
                    if (old instanceof PIXI.Sprite) {
                        this.pixiParticleContainer.removeChild(old);
                    } else {
                        this.world.removeChild(old);
                    }
                }
            }
            let angle, speed;
            if (upwardSpray) {
                // Emit particles in a narrow upward arc
                angle = (-Math.PI / 2) + ((Math.random() - 0.5) * Math.PI / 4); // -90deg ±22.5deg
                speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            } else {
                // Spread particles evenly in a burst, with some randomness
                angle = (Math.PI * 2) * (i / count) + (Math.random() - 0.5) * 0.18;
                speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            }
            const size = minSize + Math.random() * (maxSize - minSize);
            // Use preloaded splash PNG texture closest to size
            let texSize = Math.round(size / 2) * 2;
            texSize = Math.max(2, Math.min(8, texSize));
            let tex = ParticleManager.textures['splash_' + texSize];
            let particle;
            let useFallback = false;
            // PixiJS v8+ texture validity: check source/baseTexture width/height
            const isValid = tex && (
                (tex.source && tex.source.width > 0 && tex.source.height > 0) ||
                (tex.baseTexture && tex.baseTexture.width > 0 && tex.baseTexture.height > 0)
            );
                        if (isValid) {
                                particle = new PIXI.Sprite(tex);
                                particle.anchor.set(0.5);
                                particle.x = x;
                                particle.y = y;
            } else {
                useFallback = true;
            }
            if (useFallback) {
                particle = new PIXI.Graphics();
                particle.circle(0, 0, texSize);
                particle.fill(0xffffff); // Yellow fallback for splash
            }
            if (!(particle instanceof PIXI.Sprite)) {
                particle.x = x;
                particle.y = y;
            }
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.alpha = minAlpha + Math.random() * (maxAlpha - minAlpha);
            particle.life = lifetime;
            particle.maxLife = lifetime;
            particle.baseSize = size;
            this.particles.push(particle);
            if (particle instanceof PIXI.Sprite) {
                // PixiJS v8+ texture validity: check source/baseTexture width/height
                if (!particle.texture ||
                    !((particle.texture.source && particle.texture.source.width > 0 && particle.texture.source.height > 0) ||
                      (particle.texture.baseTexture && particle.texture.baseTexture.width > 0 && particle.texture.baseTexture.height > 0))) {
                }
                this.pixiParticleContainer.addChild(particle);
            } else {
                this.world.addChild(particle);
            }
        }
    }

    // Emit a large circular splash for a forward dash
    emitDashSplash(x, y) {
        // Move splash up for better visual alignment
        this.emitSplash(x, y - 40, {
            count: 64,
            minSize: 3,
            maxSize: 6,
            minSpeed: 16,
            maxSpeed: 32,
            minAlpha: 1.0,
            maxAlpha: 1.0,
            color: 0xffffff,
            upwardSpray: false,
            lifetime: 44
        });
    }

    // Emit an upward spray for a backward dash
    emitDashUpwardSplash(x, y) {
        // Move splash up for better visual alignment
        this.emitSplash(x, y - 24, {
            count: 40,
            minSize: 2,
            maxSize: 5,
            minSpeed: 8,
            maxSpeed: 18,
            minAlpha: 1.0,
            maxAlpha: 1.0,
            color: 0xffffff,
            upwardSpray: true,
            lifetime: 38
        });
    }

    emitWinHearts(x, y) {
        // Emit hearts that start at the center and move outward
        const numHearts = 16;
        const speed = 6;
        const duration = 90;
        for (let i = 0; i < numHearts; i++) {
            const angle = (i / numHearts) * Math.PI * 2;
            const heart = new PIXI.Graphics();
            heart.moveTo(0, 20);
            heart.bezierCurveTo(-10, 10, -20, 5, -10, -5);
            heart.bezierCurveTo(-5, -10, 0, -8, 0, -5);
            heart.bezierCurveTo(0, -8, 5, -10, 10, -5);
            heart.bezierCurveTo(20, 5, 10, 10, 0, 20);
            heart.fill(0xff1493);
            heart.x = x;
            heart.y = y;
            heart.vx = Math.cos(angle) * speed;
            heart.vy = Math.sin(angle) * speed;
            heart.life = duration;
            heart.initialLife = duration;
            heart.scale.set(0.5);
            heart.alpha = 1;
            heart.zIndex = 1000;
            this.world.addChild(heart);
            this.particles.push(heart);
        }
    }

    updateWinHearts(deltaTime = 1) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p.initialLife && p.vx !== undefined) {
                // Move each heart outward every frame
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.life -= deltaTime;
                // Gradually scale hearts as they move
                const progress = 1 - (p.life / p.initialLife);
                p.scale.set(0.5 + progress * 2);
                p.alpha = p.life / p.initialLife;
                if (p.life <= 0) {
                    this.world.removeChild(p);
                    this.particles.splice(i, 1);
                }
            }
        }
    }

    // Emit a single water circle at (x, y)
    emitWaterCircle(x, y, options = {}) {
        const size = options.size || 16;
        const alpha = options.alpha !== undefined ? options.alpha : 0.5;
        const color = options.color !== undefined ? options.color : 0x3399ff;
        const lifetime = options.lifetime || 36;
        const useTexture = options.useTexture !== undefined ? options.useTexture : false;
        let particle;
        if (useTexture) {
            // Use the closest water circle texture
            const availableSizes = [8, 16, 24, 32, 40, 48, 56];
            let closest = availableSizes.reduce((prev, curr) => Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev, availableSizes[0]);
            let tex = ParticleManager.textures['water_circle_' + closest];
            const isValid = tex && (
                (tex.source && tex.source.width > 0 && tex.source.height > 0) ||
                (tex.baseTexture && tex.baseTexture.width > 0 && tex.baseTexture.height > 0)
            );
            if (isValid) {
                particle = new PIXI.Sprite(tex);
                particle.anchor.set(0.5);
            } else {
                particle = new PIXI.Graphics();
                particle.circle(0, 0, size);
                particle.fill(color);
            }
        } else {
            // Use procedural graphics
            particle = new PIXI.Graphics();
            particle.circle(0, 0, size);
            particle.fill(color);
        }
        particle.x = x;
        particle.y = y;
        particle.alpha = alpha;
        particle.life = lifetime;
        particle.maxLife = lifetime;
        particle.baseSize = size;
        this.particles.push(particle);
        if (particle instanceof PIXI.Sprite) {
            this.pixiParticleContainer.addChild(particle);
        } else {
            this.world.addChild(particle);
        }
    }

    // Emit a vertical stream of waterfall particles at (x, y)
    emitWaterfall(x, y, options = {}) {
        const count = options.count || 32;
        const minSize = options.minSize || 4;
        const maxSize = options.maxSize || 8;
        const minSpeed = options.minSpeed || 6;
        const maxSpeed = options.maxSpeed || 14;
        const minAlpha = options.minAlpha !== undefined ? options.minAlpha : 0.7;
        const maxAlpha = options.maxAlpha !== undefined ? options.maxAlpha : 1.0;
        const color = options.color !== undefined ? options.color : 0xffffff;
        const spread = options.spread || 18;
        const lifetime = options.lifetime || 36;
        const maxParticles = ParticleManager.getMaxParticles();
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= maxParticles) {
                // Remove the oldest particle
                const old = this.particles.shift();
                if (old) {
                    if (old instanceof PIXI.Sprite) {
                        this.pixiParticleContainer.removeChild(old);
                    } else {
                        this.world.removeChild(old);
                    }
                }
            }
            // Downward stream, with some horizontal spread
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.25; // ~90deg ±7deg
            const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            const size = minSize + Math.random() * (maxSize - minSize);
            // Use preloaded splash PNG texture closest to size
            let texSize = Math.round(size / 2) * 2;
            texSize = Math.max(2, Math.min(8, texSize));
            let tex = ParticleManager.textures['splash_' + texSize] || ParticleManager.textures['foam_' + texSize];
            let particle;
            let useFallback = false;
            // PixiJS v8+ texture validity: check source/baseTexture width/height
            const isValid = tex && (
                (tex.source && tex.source.width > 0 && tex.source.height > 0) ||
                (tex.baseTexture && tex.baseTexture.width > 0 && tex.baseTexture.height > 0)
            );
            if (isValid) {
                particle = new PIXI.Sprite(tex);
                particle.anchor.set(0.5);
                particle.x = x + (Math.random() - 0.5) * spread;
                particle.y = y + (Math.random() - 0.5) * 6;
            } else {
                useFallback = true;
            }
            if (useFallback) {
                particle = new PIXI.Graphics();
                particle.circle(0, 0, texSize);
                particle.fill(0x00aaff); // Blue fallback for waterfall
                particle.x = x + (Math.random() - 0.5) * spread;
                particle.y = y + (Math.random() - 0.5) * 6;
            }
            particle.vx = (Math.random() - 0.5) * 1.2; // Small horizontal drift
            particle.vy = Math.sin(angle) * speed;
            particle.alpha = minAlpha + Math.random() * (maxAlpha - minAlpha);
            particle.life = lifetime;
            particle.maxLife = lifetime;
            particle.baseSize = size;
            this.particles.push(particle);
            if (particle instanceof PIXI.Sprite) {
                this.pixiParticleContainer.addChild(particle);
            } else {
                this.world.addChild(particle);
            }
        }
    }

    // Emit a water circle at the center of a stone's hitbox
    emitStoneWaterCircle(stone, options = {}) {
        const container = stone.container || (stone.getContainer && stone.getContainer());
        const sprite = stone.sprite;
        if (!container || !sprite) return;
        const hitbox = container.hitboxData;
        const scale = sprite.scale?.x;
        if (!hitbox || !scale || !hitbox.width) return;
        // Calculate the center of the hitbox
        const hb = hitbox;
        const centerX = container.x + (hb.x + hb.width / 2 - (stone.frameWidth || 64) / 2) * scale;
        const centerY = container.y + (hb.y + hb.height / 2 - (stone.frameHeight || 64) / 2) * scale;
        // Use the average of width/height for the circle size
        const avgRadius = ((hb.width + hb.height) * scale) / 4;
        this.emitWaterCircle(centerX, centerY, {
            size: options.size || avgRadius,
            alpha: options.alpha !== undefined ? options.alpha : 0.5,
            color: options.color !== undefined ? options.color : 0x3399ff,
            lifetime: options.lifetime || 36,
            useTexture: options.useTexture !== undefined ? options.useTexture : false
        });
    }

    updateParticles(deltaTime = 1) {
        // Rate-limited summary log (once per second)
        const now = performance.now();
        if (now - ParticleManager.lastSummaryLog > 1000) {
            ParticleManager.lastSummaryLog = now;
        }
        // Move debug follow circle to player/camera center if present
        if (this._debugFollowCircle && window.game && window.game.player && typeof window.game.player.getPosition === 'function') {
            const pos = window.game.player.getPosition();
            this._debugFollowCircle.x = pos.x;
            this._debugFollowCircle.y = pos.y;
            // Emit a visible test particle at the player's position every frame
            if (this.particles.length < ParticleManager.getMaxParticles()) {
                const testParticle = new PIXI.Graphics();
                testParticle.circle(0, 0, 16);
                testParticle.fill({ color: 0xffffff, alpha: 1 });
                testParticle.x = pos.x;
                testParticle.y = pos.y;
                testParticle.vx = 0;
                testParticle.vy = 0;
                testParticle.life = 30;
                testParticle.maxLife = 30;
                testParticle.zIndex = 9999;
                this.particles.push(testParticle);
                this.world.addChild(testParticle);
            }
        } else if (this._debugFollowCircle && window.game && window.game.camera && typeof window.game.camera.getPosition === 'function') {
            const cam = window.game.camera.getPosition();
            this._debugFollowCircle.x = cam.x;
            this._debugFollowCircle.y = cam.y;
        }
        const dt = deltaTime * ParticleManager.DT;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            // Move the particle
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            // Slow down velocity for a natural arc
            p.vx *= Math.pow(0.92, ParticleManager.DT);
            p.vy *= Math.pow(0.92, ParticleManager.DT);
            // Apply gravity to upward-moving particles
            if (p.vy < 0) p.vy += 0.22 * dt;
            // Fade out and shrink the particle over time
            p.life -= dt;
            const fade = Math.max(0, p.life / (p.maxLife || 38));
            p.alpha = fade * fade; // Use quadratic fade for a softer look
            if (p.scale) {
                const s = 0.7 + 0.3 * fade;
                p.scale.x = s;
                p.scale.y = s;
            }
            // Optionally scale the sprite for fade
            if (p.anchor && p.baseSize) {
                const s = 0.7 + 0.3 * fade;
                p.scale.x = s;
                p.scale.y = s;
            }
            if (p.life <= 0) {
                if (p instanceof PIXI.Sprite) {
                    this.pixiParticleContainer.removeChild(p);
                } else {
                    this.world.removeChild(p);
                }
                this.particles.splice(i, 1);
            }
        }
    }

    clear() {
        this.particles.forEach(p => {
            if (p instanceof PIXI.Sprite) {
                this.pixiParticleContainer.removeChild(p);
            } else {
                this.world.removeChild(p);
            }
        });
        this.particles = [];
        this.foam.forEach(f => {
            if (f instanceof PIXI.Sprite) {
                this.pixiParticleContainer.removeChild(f);
            } else {
                this.world.removeChild(f);
            }
        });
        this.foam = [];
        this.waveContainers.forEach(w => this.world.removeChild(w));
        this.waveContainers = [];
        this.destroyStreaks();
    }
}

// Make ParticleManager available globally
window.ParticleManager = ParticleManager;

