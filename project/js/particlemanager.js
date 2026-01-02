class ParticleManager {
    static getMaxParticles() {
        if (window.game && window.game.mobileMode) return 25; // Reduced from 40
        return 100;
    }

    static getMaxFoam() {
        if (window.game && window.game.mobileMode) return 10; // Reduced from 16
        return 32;
    }
    
    // Reuse foam particles instead of creating new ones
    static _foamPool = [];
    static _poolSize = 50;
    
    static getPooledFoam(texture) {
        if (this._foamPool.length > 0) {
            const foam = this._foamPool.pop();
            if (texture) foam.texture = texture;
            foam.alpha = 1;
            foam.visible = true;
            return foam;
        }
        const foam = new PIXI.Sprite(texture);
        foam.anchor.set(0.5);
        return foam;
    }
    
    static returnFoamToPool(foam) {
        if (this._foamPool.length < this._poolSize) {
            foam.visible = false;
            this._foamPool.push(foam);
        }
    }

    static createWaterfallWaves(waveWakes, rippleTextures, riverWidth) {
        const circularWaves = [];
        for (let i = 0; i < 15; i++) {
            let sprite = null;
            if (rippleTextures && rippleTextures.length > 0) {
                const tex = rippleTextures[Math.floor(Math.random() * rippleTextures.length)];
                sprite = new PIXI.Sprite(tex);
                if (sprite.anchor && typeof sprite.anchor.set === 'function') sprite.anchor.set(0.5);
            } else {
                sprite = new PIXI.Graphics();
                sprite.circle(0, 0, 6);
                sprite.fill({ color: 0xffffff, alpha: 0.3 });
            }
            sprite.normalizedX = Math.random();
            sprite.x = (sprite.normalizedX - 0.5) * riverWidth;
            sprite.y = Math.random() * 20 - 25;
            sprite.radius = 0;
            sprite.maxRadius = 25 + Math.random() * 20;
            sprite.speed = 1.2 + Math.random() * 0.8;
            sprite.delay = i * 4;
            sprite.timer = 0;
            sprite.baseScale = 0.08;
            sprite.maxScale = sprite.maxRadius / 32;
            sprite.scale.set(sprite.baseScale, sprite.baseScale * 0.6);
            sprite.alpha = 0.6;
            waveWakes.addChild(sprite);
            circularWaves.push(sprite);
        }
        const concentricWaves = [];
        for (let i = 0; i < 8; i++) {
            let sprite = null;
            if (rippleTextures && rippleTextures.length > 0) {
                const tex = rippleTextures[Math.floor(Math.random() * rippleTextures.length)];
                sprite = new PIXI.Sprite(tex);
                if (sprite.anchor && typeof sprite.anchor.set === 'function') sprite.anchor.set(0.5);
            } else {
                sprite = new PIXI.Graphics();
                sprite.circle(0, 0, 6);
                sprite.fill({ color: 0xffffff, alpha: 0.3 });
            }
            sprite.normalizedX = Math.random();
            sprite.x = (sprite.normalizedX - 0.5) * riverWidth;
            sprite.y = Math.random() * 10 - 20;
            sprite.radius = i * 10;
            sprite.maxRadius = 70;
            sprite.speed = 0.8;
            sprite.delay = i * 6;
            sprite.timer = 0;
            sprite.baseScale = 0.08;
            sprite.maxScale = sprite.maxRadius / 32;
            sprite.scale.set(sprite.baseScale, sprite.baseScale * 0.6);
            sprite.alpha = 0.7;
            waveWakes.addChild(sprite);
            concentricWaves.push(sprite);
        }
        return { circularWaves, concentricWaves };
    }

    static textures = {};
    static lastSummaryLog = 0;
    static FPS = 30;
    static DT = 45 / ParticleManager.FPS;

    /**
     * Create expanding circle wave sprites for stone effects.
     * Returns an array of wave sprites (PIXI.Sprite or PIXI.Graphics).
     * @param {PIXI.Container} waveContainer - Container to add waves to
     * @param {number} count - Number of waves (default 3)
     * @param {Array} rippleTextures - Array of PIXI textures for ripples
     */
    static createStoneCircleWaves(waveContainer, count = 3, rippleTextures = null, stoneScale = 1) {
        const waves = [];
        const minRadius = 18;
        const baseRadius = Math.max(32 * stoneScale * 1.2, minRadius);
        const minScale = 0.7;
        const maxScale = 2.2;
        for (let i = 0; i < count; i++) {
            let wave;
            if (rippleTextures && rippleTextures.length > 0) {
                const tex = rippleTextures[Math.floor(Math.random() * rippleTextures.length)];
                wave = new PIXI.Sprite(tex);
                if (wave.anchor && typeof wave.anchor.set === 'function') wave.anchor.set(0.5);
                wave.scale.set(minScale);
            } else {
                wave = new PIXI.Graphics();
                wave.circle(0, 0, baseRadius);
                wave.fill({ color: 0xffffff, alpha: 0.3 });
            }
            wave.label = `wave${i}`;
            wave.alpha = 0;
            wave.startDelay = i * 24;
            wave.lifetime = 0;
            wave.baseScale = minScale;
            wave.maxScale = maxScale;
            wave.baseRadius = baseRadius;
            waveContainer.addChild(wave);
            waves.push(wave);
        }
        return waves;
    }

    /**
     * Animate stone circle waves (call per frame).
     * @param {Array} waves - Array of wave sprites
     */
    static animateStoneCircleWaves(waves) {
        waves.forEach(wave => {
            wave.lifetime++;
            if (wave.lifetime < wave.startDelay) return;
            const age = wave.lifetime - wave.startDelay;
            const maxAge = 120;
            if (age > maxAge) {
                wave.lifetime = 0;
                wave.alpha = 0;
                if (wave.scale && typeof wave.scale.set === 'function') wave.scale.set(wave.baseScale);
                return;
            }
            const progress = age / maxAge;
            const scale = wave.baseScale + (wave.maxScale - wave.baseScale) * progress;
            if (wave.scale && typeof wave.scale.set === 'function') wave.scale.set(scale);
            wave.alpha = Math.max(0, 0.5 * (1 - progress) * (1 - progress));
            if (wave instanceof PIXI.Graphics) {
                wave.clear();
                wave.circle(0, 0, wave.baseRadius * scale);
                wave.stroke({ width: 2, color: 0xffffff, alpha: wave.alpha });
            }
        });
    }

        emitFoamAtStone(stone, rippleTextures = null) {
            if (!stone.foamFrame) stone.foamFrame = 0;
            stone.foamFrame++;
            if (stone.foamFrame % 2 !== 0) return;

            const container = stone.container || stone.getContainer && stone.getContainer();
            const sprite = stone.sprite;
            if (!container || !sprite) return;
            const hitbox = container.hitboxData;
            const scale = sprite.scale?.x;
            if (!hitbox || !scale || !hitbox.width) return;

            const hb = hitbox;
            const centerX = container.x + (hb.x + hb.width / 2 - (stone.frameWidth || 64) / 2) * scale;
            const centerY = container.y + (hb.y + hb.height / 2 - (stone.frameHeight || 64) / 2) * scale;
            const radiusX = (hb.width * scale) / 2;
            const radiusY = (hb.height * scale) / 2;

            const arcParticles = 12;
            const arcStart = -Math.PI * 0.95;
            const arcEnd = -Math.PI * 0.05;
            for (let i = 0; i < arcParticles; i++) {
                const t = (i + Math.random() * 0.7) / (arcParticles - 1);
                const angle = arcStart + (arcEnd - arcStart) * t + (Math.random() - 0.5) * 0.08;
                const spawnX = centerX + Math.cos(angle) * radiusX + (Math.random() - 0.5) * 2.5;
                const spawnY = centerY + Math.sin(angle) * radiusY + (Math.random() - 0.5) * 2.5;
                const speed = 0.32 + Math.random() * 0.22;
                const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.22;
                const vy = Math.sin(angle) * speed + (Math.random() - 0.5) * 0.18;
                const foamIndices = [0, 1, 2, 3, 4, 6, 8];
                let foam;
                let tex = null;
                if (rippleTextures && rippleTextures.length > 0) {
                    tex = rippleTextures[Math.floor(Math.random() * rippleTextures.length)];
                } else {
                    const foamIdx = foamIndices[Math.floor(Math.random() * foamIndices.length)];
                    tex = ParticleManager.textures['foam_' + foamIdx];
                }
                if (tex) {
                    foam = ParticleManager.getPooledFoam(tex);
                } else {
                    foam = new PIXI.Graphics();
                    foam.ellipse(0, 0, 5, 8);
                    foam.fill(0x3399ff); // Blue fallback for foam
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
            let camera = null, viewWidth = 0, viewHeight = 0, viewX = 0, viewY = 0;
            if (window.game && window.game.camera && typeof window.game.camera.getPosition === 'function') {
                camera = window.game.camera.getPosition();
                viewWidth = window.game.config.width;
                viewHeight = window.game.config.height;
                viewX = camera.x - viewWidth / 2;
                viewY = camera.y - viewHeight / 2;
            }
            for (let i = this.foam.length - 1; i >= 0; i--) {
                const f = this.foam[i];
                f.x += f.vx * dt;
                f.y += f.vy * dt;
                f.life -= dt;
                f.alpha *= Math.pow(0.96, ParticleManager.DT);
                if (camera) {
                    if (f.x < viewX - 64 || f.x > viewX + viewWidth + 64 || f.y < viewY - 64 || f.y > viewY + viewHeight + 64) {
                        f.visible = false;
                    } else {
                        f.visible = true;
                    }
                }
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
        this.pixiParticleContainer = new PIXI.Container();
        this.pixiParticleContainer.zIndex = 8;
        this.world.addChild(this.pixiParticleContainer);
        this.pixiParticleContainer.x = 0;
        this.pixiParticleContainer.y = 0;
    }
    addFoam(foam) {
        if (this.foam.length >= ParticleManager.getMaxFoam()) {
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
            if (!foam.texture ||
                !(foam.texture.source && foam.texture.source.width > 0 && foam.texture.source.height > 0)) {
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
            ParticleManager.returnFoamToPool(foam);
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
                angle = (-Math.PI / 2) + ((Math.random() - 0.5) * Math.PI / 4);
                speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            } else {
                angle = (Math.PI * 2) * (i / count) + (Math.random() - 0.5) * 0.18;
                speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            }
            const size = minSize + Math.random() * (maxSize - minSize);
            let texSize = Math.round(size / 2) * 2;
            texSize = Math.max(2, Math.min(8, texSize));
            let tex = ParticleManager.textures['splash_' + texSize];
            let particle;
            let useFallback = false;
            const isValid = tex && tex.source && tex.source.width > 0 && tex.source.height > 0;
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
                particle.fill(0xffffff);
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
                if (!particle.texture ||
                    !(particle.texture.source && particle.texture.source.width > 0 && particle.texture.source.height > 0)) {
                }
                this.pixiParticleContainer.addChild(particle);
            } else {
                this.world.addChild(particle);
            }
        }
    }

    emitDashSplash(x, y) {
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

    emitDashUpwardSplash(x, y) {
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
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.life -= deltaTime;
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

    emitWaterCircle(x, y, options = {}) {
        const size = options.size || 16;
        const alpha = options.alpha !== undefined ? options.alpha : 0.5;
        const color = options.color !== undefined ? options.color : 0x3399ff;
        const lifetime = options.lifetime || 36;
        const useTexture = options.useTexture !== undefined ? options.useTexture : false;
        let particle;
        if (useTexture) {
            const availableSizes = [8, 16, 24, 32, 40, 48, 56];
            let closest = availableSizes.reduce((prev, curr) => Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev, availableSizes[0]);
            let tex = ParticleManager.textures['water_circle_' + closest];
            const isValid = tex && tex.source && tex.source.width > 0 && tex.source.height > 0;
            if (isValid) {
                particle = new PIXI.Sprite(tex);
                particle.anchor.set(0.5);
            } else {
                particle = new PIXI.Graphics();
                particle.circle(0, 0, size);
                particle.fill(color);
            }
        } else {
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

    emitWaterfall(x, y, options = {}) {
        const count = options.count || (window.game && window.game.mobileMode ? 12 : 24);
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
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.25;
            const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            const size = minSize + Math.random() * (maxSize - minSize);
            let texSize = Math.round(size / 2) * 2;
            texSize = Math.max(2, Math.min(8, texSize));
            let tex = ParticleManager.textures['splash_' + texSize] || ParticleManager.textures['foam_' + texSize];
            let particle;
            let useFallback = false;
            const isValid = tex && tex.source && tex.source.width > 0 && tex.source.height > 0;
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
                particle.fill(0x00aaff);
                particle.x = x + (Math.random() - 0.5) * spread;
                particle.y = y + (Math.random() - 0.5) * 6;
            }
            particle.vx = (Math.random() - 0.5) * 1.2;
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

    emitStoneWaterCircle(stone, options = {}) {
        const container = stone.container || (stone.getContainer && stone.getContainer());
        const sprite = stone.sprite;
        if (!container || !sprite) return;
        const hitbox = container.hitboxData;
        const scale = sprite.scale?.x;
        if (!hitbox || !scale || !hitbox.width) return;
        const hb = hitbox;
        const centerX = container.x + (hb.x + hb.width / 2 - (stone.frameWidth || 64) / 2) * scale;
        const centerY = container.y + (hb.y + hb.height / 2 - (stone.frameHeight || 64) / 2) * scale;
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
        const now = performance.now();
        if (now - ParticleManager.lastSummaryLog > 1000) {
            ParticleManager.lastSummaryLog = now;
        }
        if (this._debugFollowCircle && window.game && window.game.player && typeof window.game.player.getPosition === 'function') {
            const pos = window.game.player.getPosition();
            this._debugFollowCircle.x = pos.x;
            this._debugFollowCircle.y = pos.y;
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
        let camera = null, viewWidth = 0, viewHeight = 0, viewX = 0, viewY = 0;
        if (window.game && window.game.camera && typeof window.game.camera.getPosition === 'function') {
            camera = window.game.camera.getPosition();
            viewWidth = window.game.config.width;
            viewHeight = window.game.config.height;
            viewX = camera.x - viewWidth / 2;
            viewY = camera.y - viewHeight / 2;
        }
        
        // Update particles in batches to reduce load
        const batchSize = this.mobileMode ? 10 : 20;
        const startIdx = (Date.now() % this.particles.length);
        const endIdx = Math.min(startIdx + batchSize, this.particles.length);
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Only update visible particles or do quick culling
            let inView = true;
            if (camera) {
                inView = !(p.x < viewX - 64 || p.x > viewX + viewWidth + 64 || p.y < viewY - 64 || p.y > viewY + viewHeight + 64);
                p.visible = inView;
            }
            if (!inView) {
                // Age off-screen particles faster
                p.life -= dt * 2;
                if (p.life <= 0) {
                    if (p instanceof PIXI.Sprite) {
                        this.pixiParticleContainer.removeChild(p);
                    } else {
                        this.world.removeChild(p);
                    }
                    this.particles.splice(i, 1);
                }
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= Math.pow(0.92, ParticleManager.DT);
            p.vy *= Math.pow(0.92, ParticleManager.DT);
            if (p.vy < 0) p.vy += 0.22 * dt;
            p.life -= dt;
            const fade = Math.max(0, p.life / (p.maxLife || 38));
            p.alpha = fade * fade;
            if (p.scale) {
                const s = 0.7 + 0.3 * fade;
                p.scale.x = s;
                p.scale.y = s;
            }
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

    static generateParticleTextures() {
        const frames = window.preloadedResources && window.preloadedResources.particleFrames;
        if (frames && typeof frames === 'object') {
            for (const key of Object.keys(frames)) {
                ParticleManager.textures[key] = frames[key];
            }
        } else {
            console.warn('[ParticleManager] No particle frames found in preloadedResources. Foam/splash textures will not be used.');
        }
    }
}

window.ParticleManager = ParticleManager;

