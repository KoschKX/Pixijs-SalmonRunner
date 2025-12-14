// ParticleManager.js
// Manages all particle effects, foam, waves, and streaks in the game
// Requires RiverStreaks to be loaded globally before this script
class ParticleManager {
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

                // Use thicker foam particles for effect
                const foam = new PIXI.Graphics();
                const rX = 2.2 + Math.random() * 1.5;
                const rY = 3.5 + Math.random() * 2.2;
                foam.ellipse(0, 0, rX, rY);
                // Give foam a blueish-white tint
                const color = 0xE0F6FF;
                foam.fill(color);
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
    }
    addFoam(foam) {
        this.foam.push(foam);
        this.world.addChild(foam);
    }

    removeFoam(foam) {
        const idx = this.foam.indexOf(foam);
        if (idx !== -1) this.foam.splice(idx, 1);
        this.world.removeChild(foam);
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
        for (let i = 0; i < count; i++) {
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
            const particle = new PIXI.Graphics();
            particle.circle(0, 0, size);
            particle.fill(color);
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.alpha = minAlpha + Math.random() * (maxAlpha - minAlpha);
            particle.life = lifetime;
            particle.maxLife = lifetime;
            particle.baseSize = size;
            this.particles.push(particle);
            this.world.addChild(particle);
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

    updateParticles(deltaTime = 1) {
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
            // Optionally shrink the radius for Pixi v8+ Graphics
            if (p.clear && p.baseSize) {
                p.clear();
                p.circle(0, 0, p.baseSize * (0.7 + 0.3 * fade));
                p.fill(0xffffff);
            }
            if (p.life <= 0) {
                this.world.removeChild(p);
                this.particles.splice(i, 1);
            }
        }
    }

    clear() {
        this.particles.forEach(p => this.world.removeChild(p));
        this.particles = [];
        this.foam.forEach(f => this.world.removeChild(f));
        this.foam = [];
        this.waveContainers.forEach(w => this.world.removeChild(w));
        this.waveContainers = [];
        this.destroyStreaks();
    }
}

