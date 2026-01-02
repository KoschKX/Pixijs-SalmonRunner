
let romanticSequence = null;
const overlayManager = new OverlayManager();
window.renderer = new Renderer();

if (!window.preloader || typeof window.preloader.add !== 'function' || !(window.preloader instanceof Preloader)) window.preloader = new Preloader();
Preloader.setupDefaultResources(window.preloader);

class Game {
    constructor(canvas) {
        this.canvas = canvas;

        this.config = {
            width: 1000,
            height: 1000,
            backgroundColor: 0x0066cc,
            scrollSpeed: 7.5,
            originalScrollSpeed: 7.5,
            playerSpeed: 5,
            playerAcceleration: 0.5,
            playerMaxSpeed: 10,
            playerFriction: 0.85,
            currentPullDown: 2,
            dashSpeed: 24,
            dashDuration: 300,
            dashCooldown: 500,
            backDashSpeed: 24,
            backDashDuration: 150,
            backDashCooldown: 500,
            spawnInterval: 120,
            goalDistance: 1000,
            riverWidth: 300,
            bankCurveSpeed: 0.18,
            bankColor: 0xd4a017
        };

        this.app = null;
        window.particleManager = null;
        this.world = null;
        this.camera = null;
        this.river = null;
        this.obstacles = [];
        this.particleManager = null;
        this.riverBanks = [];
        this.waterfalls = [];
        this.riverIslands = [];
        this.wakeTrail = [];
        this.fadeOverlay = null;
        this.originalPlayerZIndex = 14;
        this.originalGoalZIndex = 13;
        this.gameState = {
            health: 100,
            distance: 0,
            score: 0,
            gameOver: false,
            won: false,
            scrollOffset: 0,
            playerVelocityX: 0,
            playerVelocityY: 0,
            waveCounter: 0,
            obstaclePattern: 0,
            isDashing: false,
            dashDirection: 'forward',
            dashEndTime: 0,
            lastDashTime: 0,
            debugMode: false,
            jinglePlayed: false,
            lastLateralSplashTime: 0,
            leftKeyPlayedSound: false,
            rightKeyPlayedSound: false,
            birdCount: 0,
            bearCount: 0,
        };
        this.romanticSequence = new window.RomanticSequence(this);
        this.input = new InputManager();
        this.bearWalkHitboxData = null;
        this.bearEatHitboxData = null;
        this.audioManager = new AudioManager();
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 60 / this.targetFPS;
        this.spawnInterval = null;
        this.pendingTimeouts = [];

        this.spawnManager = new window.SpawnManager(this);
        this.frameCounter = 0;
        this.gameLoop = this.gameLoop.bind(this);
    }

    
    setMobileMode() {
        this.mobileMode = isMobileDevice();
    }

    togglePause() {
        if (this.gameState.paused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    pauseGame() {
        this.gameState.paused = true;
        if (this.app && this.app.ticker && this.app.ticker.started) {
            this.app.ticker.stop();
        }
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        if (this.audioManager && typeof this.audioManager.pauseAll === 'function') {
            try { this.audioManager.pauseAll(); } catch(e) {}
        }
        if (typeof hud !== 'undefined' && hud && typeof hud.setPauseState === 'function') hud.setPauseState(true);
    }

    resumeGame() {
        this.gameState.paused = false;
        if (this.app && this.app.ticker && !this.app.ticker.started) {
            this.app.ticker.start();
        }
        if (!this.spawnInterval) {
            this.spawnInterval = setInterval(() => this.spawnManager.spawnObstaclePattern(), 2000);
        }
        if (this.audioManager && typeof this.audioManager.resumeAll === 'function') {
            try { this.audioManager.resumeAll(); } catch(e) {}
        }
        if (typeof hud !== 'undefined' && hud && typeof hud.setPauseState === 'function') hud.setPauseState(false);
    }
    isInitialized = false;
    
    async preloadResources() {
        
        const resources = window.preloadedResources || await window.preloader.preloadAll();

        
        this.riverbedTex = resources['riverbed_B'];
        this.foliageTex = resources['riverfoliage'];
        this.salmonTex = resources['salmon'];
        this.bearWalkTex = resources['bear_walk'];
        this.bearEatTex = resources['bear_eat'];
        this.stonesTex = resources['stones'];
        this.birdGlideTex = resources['bird_glide'];
        this.birdFlapTex = resources['bird_flap'];

        
        this.hudWinTex = resources['hud_win'];
        this.hudLoseTex = resources['hud_lose'];

        
        this.bearWalkHitboxData = resources['bear_walk_hitbox'];
        this.bearEatHitboxData = resources['bear_eat_hitbox'];
        this.birdGlideHitboxData = resources['bird_glide_hbox'];
        this.birdFlapHitboxData = resources['bird_flap_hbox'];
        this.rockHitboxData = resources['rock_hbox'] || null;

        
        this.audioManager.splashSounds = [
            resources['splash_A'],
            resources['splash_B'],
            resources['splash_C'],
            resources['splash_D']
        ].filter(Boolean);
        this.audioManager.lateralSplashSounds = [
            resources['lateral_splash_A'],
            resources['lateral_splash_B']
        ].filter(Boolean);
        this.audioManager.kissSound = resources['kiss_A'];
        this.audioManager.jingleSound = resources['jingle_A'];

        
        await Bird.initAssets(resources);
        await Fish.initAssets(resources);
        await Bear.initAssets(resources);
        await Stone.initAssets(resources);
    }
    updateObstacles() {
        
        this.obstacles = this.obstacles.filter(obs => {
            if (obs.type === 'bird' && obs.destroyed) {
                this.gameState.birdCount = Math.max(0, this.gameState.birdCount - 1);
                return false;
            }
            return true;
        });
    }
    
    setupDebouncedResize() {
        setupDebouncedResize(() => this.handleResize());
    }

    
    handleResize() {
        handleResize(this.config, renderer);
    }
    
    stopCameraLoop() {}

    async createGoal() {
        
        const goalContainer = await Fish.createGoalFish();

        goalContainer.x = this.config.width / 2;
        goalContainer.y = -(this.config.goalDistance * 10);
        goalContainer.label = 'goal';
        goalContainer.zIndex = this.originalGoalZIndex;

        goalContainer.cacheAsBitmap = true;
        this.world.addChild(goalContainer);
        
        if (!this.world.sortableChildren) this.world.sortableChildren = true;
    }

    setupControls() {
        this.input.setup();
    }

    playRandomSplash() {
        this.audioManager.playRandomSplash();
    }

    createBear() {
        const bear = new Bear();
        return bear;
    }

    createBird() {
        const bird = new Bird(this.config.height);
        
        const birdContainer = bird.getContainer();
        birdContainer.zIndex = 16;
        birdContainer.visible = true;
        if (this.world && !this.world.children.includes(birdContainer)) {
            this.world.addChild(birdContainer);
        }
        return bird;
    }
    
    async init() {
        
        this.isMobile = isMobileDevice();
        
        if (this.isMobile && window.ParticleManager) {
            window.ParticleManager.getMaxParticles = () => 60;
            window.ParticleManager.getMaxFoam = () => 24;
        }
        
        const resolution = this.isMobile ? 1 : window.devicePixelRatio || 1;
        
        if (!this.app) {
            this.app = await window.renderer.create({
                canvas: this.canvas,
                width: this.config.width,
                height: this.config.height,
                backgroundColor: this.config.backgroundColor,
                targetFrameRate: this.isMobile ? 45 : 60,
                antialias: false,
                resolution: resolution,
                powerPreference: 'low-power',
                maxFPS: this.isMobile ? 45 : 60
            });
            
            this.frameTimeLog = false;
            if (this.frameTimeLog) {
                let last = performance.now();
                this.app.ticker.add(() => {
                    const now = performance.now();
                    const dt = now - last;
                    last = now;
                    if (dt > 20) {}
                });
            }
            
            if (window.hudManager && typeof window.hudManager.addFadeOverlay === 'function') {
                window.hudManager.addFadeOverlay(this.world, this.config.width, this.config.height);
            }
        }
        this.setMobileMode();

        
        await this.preloadResources();

        
        if (this.app && typeof ParticleManager.generateParticleTextures === 'function') {
            ParticleManager.generateParticleTextures();
            
            if (window.ParticleManager && window.ParticleManager.textures) {
                const keys = Object.keys(window.ParticleManager.textures);
                const summary = keys.map(k => {
                    const t = window.ParticleManager.textures[k];
                    let valid = false;
                    if (t && (t.valid || (t.source && t.source.width > 0 && t.source.height > 0))) valid = true;
                    return `${k}: ${valid ? 'OK' : 'INVALID'}`;
                });
            }
        }
        
        if (this.app && typeof Waterfall.generateSplashTextures === 'function') {
            Waterfall.generateSplashTextures(this.app.renderer);
        }
        
        this.gameState = new GameState({
            health: 100,
            distance: 0,
            score: 0,
            gameOver: false,
            won: false,
            scrollOffset: 0,
            playerVelocityX: 0,
            playerVelocityY: 0,
            waveCounter: 0,
            obstaclePattern: 0,
            isDashing: false,
            dashDirection: 'forward',
            dashEndTime: 0,
            lastDashTime: 0,
            debugMode: false,
            jinglePlayed: false,
            lastLateralSplashTime: 0,
            leftKeyPlayedSound: false,
            rightKeyPlayedSound: false,
            goalInView: false,
            kissPlayed: false,
            birdCount: 0,
            bearCount: 0,
            romanticSceneActive: false
        });

        
        if (!this.app) {
            this.app = new PIXI.Application();
            await this.app.init({
                canvas: this.canvas,
                width: this.config.width,
                height: this.config.height,
                backgroundColor: this.config.backgroundColor,
                targetFrameRate: 60,
                clearBeforeRender: true,
                antialias: false
            });
        }

        
        if (this.app && this.app.renderer) {
            this.app.renderer.backgroundColor = this.config.backgroundColor;
            this.app.renderer.clear();
            this.app.renderer.render(this.app.stage);
        }

        
        if (!this.app.stage) {
            
            this.app = await renderer.create({
                canvas: this.canvas,
                width: this.config.width,
                height: this.config.height,
                backgroundColor: this.config.backgroundColor,
                targetFrameRate: this.isMobile ? 45 : 60,
                antialias: false,
                resolution: this.isMobile ? 1 : window.devicePixelRatio || 1,
                powerPreference: 'low-power',
                maxFPS: this.isMobile ? 45 : 60
            });
        }
        this.sceneManager = new SceneManager(this.app);
        this.world = this.sceneManager.createWorld();

        this.fadeOverlay = new PIXI.Graphics();
        this.fadeOverlay.rect(0, 0, this.config.width, this.config.height);
        this.fadeOverlay.fill(0x000000);
        this.fadeOverlay.alpha = 0;
        this.fadeOverlay.zIndex = 500;
        this.world.addChild(this.fadeOverlay);

        this.app.renderer.render(this.app.stage);
        
        this.camera = new Camera(this.world, this.config);

        this.river = River.create(this.world, this.config, this.app.renderer);
        this.riverBanks = River.getBanks(this.river);
        await River.createRiverIslands(this.river);
        
        this.particleManager = new ParticleManager(
            this.world,
            this.config,
            this.river.getPathAtY ? this.river.getPathAtY.bind(this.river) : () => ({curve:0})
        );
        window.particleManager = this.particleManager;
        
        this.createPlayer();
        
        const initialPlayerPos = this.player.getPosition();
        this.gameState.startY = initialPlayerPos.y;

        const playerPos = this.player.getPosition();
        const cameraX = this.config.width / 2;
        this.camera.setPosition(cameraX, playerPos.y);
        this.camera.setTarget(cameraX, playerPos.y);

        const wakeGraphics = River.getWakeGraphics(this.river);
        if (wakeGraphics) {
            this.player.setWakeGraphics(wakeGraphics);
        }

        await this.createGoal();

        this.setupControls();
        
        this.app.ticker.maxFPS = 60;
        this.app.ticker.minFPS = 30;
        this.app.ticker.add(this.gameLoop);

        this.spawnInterval = setInterval(() => this.spawnManager.spawnObstaclePattern(), 2000);
        
        window.gameReady = true;
    }


    createPlayer() {
        this.player = window.Player.create(this.config.width / 2, 0, this.config);
        const playerContainer = window.Player.getContainer(this.player);
        playerContainer.zIndex = this.originalPlayerZIndex;
        this.world.addChild(playerContainer);
    }

    async createGoal() {
        
        const goalContainer = await Fish.createGoalFish();

        goalContainer.x = this.config.width / 2;
        goalContainer.y = -(this.config.goalDistance * 10);
        goalContainer.label = 'goal';
        goalContainer.zIndex = this.originalGoalZIndex;

        this.world.addChild(goalContainer);
        this.world.sortableChildren = true;
    }

    setupControls() {
        this.input.setup();
    }

    

    playRandomSplash() {
        this.audioManager.playRandomSplash();
    }


    spawnObstacle() {
        return this.spawnManager.spawnObstacle();
    }

    spawnObstaclePattern() {
        return this.spawnManager.spawnObstaclePattern();
    }

    spawnBirdWave() {
        return this.spawnManager.spawnBirdWave();
    }

    spawnBearFormation() {
        return this.spawnManager.spawnBearFormation();
    }

    spawnNetGauntlet() {
        return this.spawnManager.spawnNetGauntlet();
    }

    spawnDiagonalPattern() {
        return this.spawnManager.spawnDiagonalPattern();
    }

    createBear() {
        const bear = new Bear(this.bearWalkHitboxData, this.bearEatHitboxData);
        return bear;
    }

    createBird() {
        const bird = new Bird(this.config.height);
        return bird;
    }

    createNet() {
        const net = new Net();
        return net;
    }

    checkCollision(obj1, obj2, radius) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < radius;
    }

    gameLoop(delta) {
        
        if (this.input.targetX !== null && this.player) {
            const playerX = this.player.x;
            const dx = this.input.targetX - playerX;
            if (Math.abs(dx) > 5) {
                const direction = dx < 0 ? -1 : 1;
                this.gameState.playerVelocityX = direction * this.config.playerMaxSpeed;
            } else {
                this.gameState.playerVelocityX = 0;
                this.input.targetX = null;
            }
        }

        
        if (this.input.keys['swipeUp']) {
            
            if (!this.gameState.isDashing && !this.gameState.romanticSceneActive) {
                const now = Date.now();
                if (now - this.gameState.lastDashTime >= this.config.dashCooldown) {
                    
                    let dashDuration = this.config.dashDuration;
                    let vx = 0, vy = 0;
                    if (this.input.swipeDistance && this.input.swipeStartX !== undefined && this.input.swipeStartY !== undefined) {
                        const minSwipe = 40;
                        const maxSwipe = 400;
                        const minDuration = this.config.dashDuration * 0.5;
                        const maxDuration = this.config.dashDuration * 2.5;
                        const clamped = Math.max(minSwipe, Math.min(maxSwipe, this.input.swipeDistance));
                        dashDuration = minDuration + (maxDuration - minDuration) * ((clamped - minSwipe) / (maxSwipe - minSwipe));
                        
                        const dx = this.input.swipeEndX - this.input.swipeStartX;
                        const dy = this.input.swipeEndY - this.input.swipeStartY;
                        const angle = Math.atan2(dy, dx);
                        
                        const speed = this.config.dashSpeed;
                        vx = Math.cos(angle) * speed;
                        vy = Math.sin(angle) * speed;
                        
                        if (vy > -speed * 0.6) vy = -speed * 0.6;
                    } else {
                        vy = -this.config.dashSpeed;
                    }
                    this.gameState.isDashing = true;
                    this.gameState.dashDirection = 'forward';
                    this.gameState.dashEndTime = now + dashDuration;
                    this.gameState.lastDashTime = now;
                    if (this.player) {
                        this.player.isInvincible = true;
                        this.player.invincibilityEndTime = 0;
                        this.gameState.playerVelocityX = vx;
                        this.gameState.playerVelocityY = vy;
                    }
                    this.playRandomSplash();
                }
            }
            this.input.keys['swipeUp'] = false;
            this.input.swipeHorizontal = null;
            this.input.swipeDistance = null;
            this.input.swipeStartX = undefined;
            this.input.swipeStartY = undefined;
            this.input.swipeEndX = undefined;
            this.input.swipeEndY = undefined;
        }
        if (this.input.keys['swipeDown']) {
            
            if (!this.gameState.isDashing && !this.gameState.romanticSceneActive) {
                const now = Date.now();
                if (now - this.gameState.lastDashTime >= this.config.backDashCooldown) {
                    
                    let dashDuration = this.config.backDashDuration;
                    let vx = 0, vy = 0;
                    if (this.input.swipeDistance && this.input.swipeStartX !== undefined && this.input.swipeStartY !== undefined) {
                        const minSwipe = 40;
                        const maxSwipe = 400;
                        const minDuration = this.config.backDashDuration * 0.5;
                        const maxDuration = this.config.backDashDuration * 2.5;
                        const clamped = Math.max(minSwipe, Math.min(maxSwipe, this.input.swipeDistance));
                        dashDuration = minDuration + (maxDuration - minDuration) * ((clamped - minSwipe) / (maxSwipe - minSwipe));
                        
                        const dx = this.input.swipeEndX - this.input.swipeStartX;
                        const dy = this.input.swipeEndY - this.input.swipeStartY;
                        const angle = Math.atan2(dy, dx);
                        const speed = this.config.backDashSpeed;
                        vx = Math.cos(angle) * speed;
                        vy = Math.sin(angle) * speed;
                        
                        if (vy < speed * 0.6) vy = speed * 0.6;
                    } else {
                        vy = this.config.backDashSpeed;
                    }
                    this.gameState.isDashing = true;
                    this.gameState.dashDirection = 'backward';
                    this.gameState.dashEndTime = now + dashDuration;
                    this.gameState.lastDashTime = now;
                    if (this.player) {
                        this.player.isInvincible = true;
                        this.player.invincibilityEndTime = 0;
                        this.gameState.playerVelocityX = vx;
                        this.gameState.playerVelocityY = vy;
                    }
                    this.playRandomSplash();
                }
            }
            this.input.keys['swipeDown'] = false;
            this.input.swipeHorizontal = null;
            this.input.swipeDistance = null;
            this.input.swipeStartX = undefined;
            this.input.swipeStartY = undefined;
            this.input.swipeEndX = undefined;
            this.input.swipeEndY = undefined;
        }
        
        if (this.gameState.gameOver && !this.gameState.won) return;

        
        const now = performance.now();
        if (!this.lastFrameTime) this.lastFrameTime = now;
        const elapsed = now - this.lastFrameTime;
        if (elapsed < this.frameInterval) {
            return;
        }
        this.lastFrameTime = now;

        
        const actualDelta = delta.deltaTime;

        
        let playerPos = (this.player && typeof this.player.getPosition === 'function') ? this.player.getPosition() : {x: this.config.width/2, y: 0};

        
        if (this.camera && this.player) {
            const cameraX = this.config.width / 2;
            this.camera.setTarget(cameraX, playerPos.y);
            this.camera.update(actualDelta);
        }

        
        this.frameCounter++;

        if (!this.gameState.won) {
            const now = Date.now();
            
            if (this.gameState.isDashing && this.gameState.dashDirection === 'forward') {
                this.player.isJumping = true;
            } else {
                this.player.isJumping = false;
            }
            
            if (this.gameState.isDashing) {
                let dashKeyHeld = false;
                if (this.gameState.dashDirection === 'forward') {
                    dashKeyHeld = this.input.keys['ArrowUp'] || this.input.keys['w'] || this.input.keys['W'];
                } else if (this.gameState.dashDirection === 'backward') {
                    dashKeyHeld = this.input.keys['ArrowDown'] || this.input.keys['s'] || this.input.keys['S'];
                }
                if (!dashKeyHeld && !this.gameState.dashShortened) {
                    
                    const nowTime = Date.now();
                    const remaining = this.gameState.dashEndTime - nowTime;
                    if (remaining > 30) {
                        this.gameState.dashEndTime = nowTime + Math.floor(remaining * 0.4);
                        this.gameState.dashShortened = true;
                    }
                }
                if (now >= this.gameState.dashEndTime) {
                    this.gameState.isDashing = false;
                    this.gameState.dashShortened = false;
                    
                    if (this.player) {
                        this.player.isInvincible = false;
                        this.player.invincibilityEndTime = 0;
                    }
                    
                    if (this.gameState.dashDirection === 'forward' && this.player && this.player.mesh) {
                        this.player.mesh.scale.set(this.player.meshScale);
                    }
                    
                    if (this.player) {
                        const playerContainer = this.player.getContainer();
                        playerContainer.zIndex = this.originalPlayerZIndex;
                    }
                    
                    const pos = this.player.getPosition();
                    if (this.gameState.dashDirection === 'backward') {
                        if (window.particleManager) {
                            window.particleManager.emitDashUpwardSplash(pos.x, pos.y);
                        }
                    } else {
                        if (window.particleManager) {
                            window.particleManager.emitDashSplash(pos.x, pos.y);
                        }
                    }
                }
            }

            
            let targetVelocityX = 0;
            let targetVelocityY = -this.config.scrollSpeed;

            
            if (this.gameState.bounceLockout) {
                
                let dashDir = null;
                if ((this.input.keys['ArrowUp'] || this.input.keys['w'] || this.input.keys['W'])) dashDir = 'forward';
                if ((this.input.keys['ArrowDown'] || this.input.keys['s'] || this.input.keys['S'])) dashDir = 'backward';
                const now = Date.now();
                if (dashDir && !this.gameState.isDashing) {
                    
                    this.gameState.bounceLockout = false;
                    this.gameState.bounceEasing = false;
                    this.gameState.bounceVelocityY = null;
                    this.gameState.bounceVelocityX = null;
                    this.gameState.bounceStartTime = null;
                    this.gameState.bounceDuration = null;
                    this.gameState.bouncePause = null;
                    this.gameState.bounceInitialVelocityY = null;
                    
                    if (dashDir === 'forward' && now - this.gameState.lastDashTime >= this.config.dashCooldown) {
                        this.gameState.isDashing = true;
                        this.gameState.dashDirection = 'forward';
                        this.gameState.dashEndTime = now + this.config.dashDuration;
                        this.gameState.lastDashTime = now;
                        if (this.player) {
                            this.player.isInvincible = true;
                            this.player.invincibilityEndTime = 0;
                        }
                        this.playRandomSplash();
                    } else if (dashDir === 'backward' && now - this.gameState.lastDashTime >= this.config.backDashCooldown) {
                        this.gameState.isDashing = true;
                        this.gameState.dashDirection = 'backward';
                        this.gameState.dashEndTime = now + this.config.backDashDuration;
                        this.gameState.lastDashTime = now;
                        if (this.player) {
                            this.player.isInvincible = true;
                            this.player.invincibilityEndTime = 0;
                        }
                        this.playRandomSplash();
                    }
                } else {
                    
                    if (this.gameState.bounceEasing && typeof this.gameState.bounceInitialVelocityY === 'number') {
                        const elapsed = Date.now() - (this.gameState.bounceStartTime || 0);
                        const t = Math.min(1, elapsed / (this.gameState.bounceDuration || 1));
                        
                        this.gameState.bounceVelocityY = this.gameState.bounceInitialVelocityY * Math.pow(1 - t, 2);
                    }
                    if (typeof this.gameState.bounceVelocityY === 'number') {
                        this.gameState.playerVelocityY = this.gameState.bounceVelocityY;
                    }
                    if (typeof this.gameState.bounceVelocityX === 'number') {
                        this.gameState.playerVelocityX = this.gameState.bounceVelocityX;
                    }
                    targetVelocityX = this.gameState.playerVelocityX;
                    targetVelocityY = this.gameState.playerVelocityY;
                }
            } 
            
            else if (!this.gameState.isDashing && !this.gameState.romanticSceneActive) {
                const now = Date.now();
                if ((this.input.keys['ArrowUp'] || this.input.keys['w'] || this.input.keys['W']) && now - this.gameState.lastDashTime >= this.config.dashCooldown) {
                    this.gameState.isDashing = true;
                    this.gameState.dashDirection = 'forward';
                    this.gameState.dashEndTime = now + this.config.dashDuration;
                    this.gameState.lastDashTime = now;
                    if (this.player) {
                        this.player.isInvincible = true;
                        this.player.invincibilityEndTime = 0;
                    }
                    this.playRandomSplash();
                } else if ((this.input.keys['ArrowDown'] || this.input.keys['s'] || this.input.keys['S']) && now - this.gameState.lastDashTime >= this.config.backDashCooldown) {
                    this.gameState.isDashing = true;
                    this.gameState.dashDirection = 'backward';
                    this.gameState.dashEndTime = now + this.config.backDashDuration;
                    this.gameState.lastDashTime = now;
                    if (this.player) {
                        this.player.isInvincible = true;
                        this.player.invincibilityEndTime = 0;
                    }
                    this.playRandomSplash();
                }
            } else {
                
                if (this.gameState.isDashing) {
                    if (this.gameState.dashDirection === 'forward') {
                        
                        const dashElapsed = (now - (this.gameState.dashEndTime - this.config.dashDuration)) / this.config.dashDuration;
                        let scale = 1;
                        if (dashElapsed < 0.5) {
                            
                            scale = 1 + dashElapsed * 2;
                        } else {
                            
                            scale = 2 - (dashElapsed - 0.5) * 2;
                        }
                        if (this.player && this.player.mesh) {
                            this.player.mesh.scale.set(this.player.meshScale * scale);
                            
                            const playerContainer = this.player.getContainer();
                            if (this.player.isJumping && (this.player.meshScale * scale) > 1.25) {
                                playerContainer.zIndex = 16;
                            } else {
                                playerContainer.zIndex = this.originalPlayerZIndex;
                            }
                        }
                        targetVelocityY = -this.config.dashSpeed;
                    } else if (this.gameState.dashDirection === 'backward') {
                        
                        targetVelocityY = this.config.backDashSpeed;
                        
                        if (this.input.keys['ArrowLeft'] || this.input.keys['a'] || this.input.keys['A']) {
                            targetVelocityX = -this.config.playerMaxSpeed * 0.45;
                        } else if (this.input.keys['ArrowRight'] || this.input.keys['d'] || this.input.keys['D']) {
                            targetVelocityX = this.config.playerMaxSpeed * 0.45;
                        } else {
                            targetVelocityX = 0;
                        }
                        
                        var backDashAccel = this.config.playerAcceleration * 1.1;
                        this.gameState.playerVelocityX += (targetVelocityX - this.gameState.playerVelocityX) * backDashAccel * actualDelta;
                    }
                } else {
                    
                    if (this.gameState.isDashing) {
                        
                        if (this.gameState.dashDirection !== 'backward') {
                            targetVelocityX = 0;
                        } else {
                        }
                    } else {
                        if (this.input.keys['ArrowLeft'] || this.input.keys['a'] || this.input.keys['A']) {
                            targetVelocityX = -this.config.playerMaxSpeed;
                            if (!this.gameState.leftKeyPlayedSound) {
                                this.audioManager.playRandomLateralSplash();
                                this.gameState.leftKeyPlayedSound = true;
                            }
                        } else {
                            this.gameState.leftKeyPlayedSound = false;
                        }
                        if (this.input.keys['ArrowRight'] || this.input.keys['d'] || this.input.keys['D']) {
                            targetVelocityX = this.config.playerMaxSpeed;
                            if (!this.gameState.rightKeyPlayedSound) {
                                this.audioManager.playRandomLateralSplash();
                                this.gameState.rightKeyPlayedSound = true;
                            }
                        } else {
                            this.gameState.rightKeyPlayedSound = false;
                        }
                    }
                }
            }

            if (targetVelocityX !== 0) {
                this.gameState.playerVelocityX += (targetVelocityX - this.gameState.playerVelocityX) * this.config.playerAcceleration * actualDelta;
            } else {
                this.gameState.playerVelocityX *= Math.pow(this.config.playerFriction, actualDelta);
            }

            if (targetVelocityY !== 0) {
                this.gameState.playerVelocityY += (targetVelocityY - this.gameState.playerVelocityY) * this.config.playerAcceleration * actualDelta;
            } else {
                this.gameState.playerVelocityY *= Math.pow(this.config.playerFriction, actualDelta);
            }
            
            if (this.input.keys['ArrowLeft'] || this.input.keys['a'] || this.input.keys['A']) {
                targetVelocityX = -this.config.playerMaxSpeed * 1.35;
            } else if (this.input.keys['ArrowRight'] || this.input.keys['d'] || this.input.keys['D']) {
                targetVelocityX = this.config.playerMaxSpeed * 1.35;
            } else {
                targetVelocityX = 0;
            }
            var jumpAccel = this.config.playerAcceleration * 1.5;
            this.gameState.playerVelocityX += (targetVelocityX - this.gameState.playerVelocityX) * jumpAccel * actualDelta;

            let newX = playerPos.x + this.gameState.playerVelocityX * actualDelta;
            let newY = playerPos.y + this.gameState.playerVelocityY * actualDelta;
            if (this.input.pointerHeld && typeof this.input.pointerX === 'number') {
                if ((this.gameState.playerVelocityX > 0 && newX > this.input.pointerX && playerPos.x <= this.input.pointerX) ||
                    (this.gameState.playerVelocityX < 0 && newX < this.input.pointerX && playerPos.x >= this.input.pointerX)) {
                    newX = this.input.pointerX;
                    this.gameState.playerVelocityX = 0;
                }
            }
                window.Player.setPosition(this.player, newX, newY);
                if (!(this.input.keys['ArrowLeft'] || this.input.keys['a'] || this.input.keys['A'] || this.input.keys['ArrowRight'] || this.input.keys['d'] || this.input.keys['D']) && Math.abs(this.gameState.playerVelocityX) < 0.2) {
                    this.gameState.playerVelocityX = 0;
                }
                playerPos = window.Player.getPosition(this.player);
                window.Player.update(this.player, this.gameState.playerVelocityX, this.gameState.playerVelocityY);
                if (this.player && typeof this.player.updateWake === 'function') this.player.updateWake(this.gameState.scrollOffset);
        }

        if (this.fadeOverlay) {
            this.fadeOverlay.x = -this.world.x;
            this.fadeOverlay.y = -this.world.y;
        }

        if (!this.gameState.won) {
            River.checkBankCollision(this.river, this.player, this.gameState.isDashing, this.gameState);
        }

        if (!this.gameState.won) {
            const startY = (typeof this.gameState.startY === 'number') ? this.gameState.startY : playerPos.y;
            const distanceTraveled = startY - playerPos.y;
            this.gameState.distance = Number.isFinite(distanceTraveled) ? Math.max(0, Math.round(distanceTraveled / 10)) : 0;

            const goalY = -(this.config.goalDistance * 10);
            const yMargin = 20;
            if (
                (this.gameState.distance >= this.config.goalDistance - 2 || Math.abs(playerPos.y - goalY) < yMargin) &&
                !this.gameState.romanticSceneActive &&
                this.romanticSequence && typeof this.romanticSequence.start === 'function'
            ) {
                const goal = this.world.getChildByLabel && this.world.getChildByLabel('goal');
                this.gameState.romanticSceneActive = true;
                this.romanticSequence.start(goal, playerPos);
            }
        }

        const bankSkip = this.mobileMode ? 6 : 3;
        const waterfallSkip = this.mobileMode ? 4 : 2;
        const islandSkip = this.mobileMode ? 4 : 2;

        if (!this.gameState.won && this.frameCounter % bankSkip === 0) {
            River.updateBanks(this.river, playerPos);
        }
        if (!this.gameState.won) {
            River.updateWaterLayers(this.river, playerPos, this.gameState.scrollOffset);
        }
        if (!this.gameState.won && this.frameCounter % waterfallSkip === 0) {
            const viewBuffer = this.config.height;
            River.updateWaterfalls(this.river, playerPos, this.config.height, viewBuffer);
        }
        if (!this.gameState.won && this.frameCounter % islandSkip === 0) {
            const viewBuffer = this.config.height;
            River.updateIslands(this.river, playerPos, this.player, this.config.height, viewBuffer, this.gameState);
        }

        if (!this.gameState.won) {
            const cullMultiplier = this.mobileMode ? 0.5 : 1;
            const viewTop = playerPos.y - this.config.height / 2 - this.config.height * 2 * cullMultiplier;
            const viewBottom = playerPos.y + this.config.height / 2 + this.config.height * cullMultiplier;

            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obstacle = this.obstacles[i];
                let obstaclePos;
                if (
                    (obstacle instanceof Bear || obstacle instanceof Bird || obstacle instanceof Net) && typeof obstacle.getPosition === 'function'
                ) {
                    obstaclePos = obstacle.getPosition();
                } else if (obstacle instanceof Stone && typeof obstacle.getPosition === 'function') {
                    obstaclePos = obstacle.getPosition();
                } else if (obstacle.getContainer && obstacle.getContainer().x !== undefined && obstacle.getContainer().y !== undefined) {
                    obstaclePos = {
                        x: obstacle.getContainer().x,
                        y: obstacle.getContainer().y
                    };
                } else {
                    obstaclePos = {
                        x: obstacle.x,
                        y: obstacle.y
                    };
                }

                // Aggressive culling: skip update for obstacles far off screen
                const inView = obstaclePos.y >= viewTop && obstaclePos.y <= viewBottom;
                let obstacleContainerForVisibility = (obstacle instanceof Bear || obstacle instanceof Bird || obstacle instanceof Net || obstacle instanceof Stone) ?
                    obstacle.getContainer() :
                    obstacle;
                if (obstacleContainerForVisibility && obstacleContainerForVisibility.visible !== undefined) {
                    obstacleContainerForVisibility.visible = inView;
                }
                // On mobile, cull even more aggressively
                if (!inView && (!this.mobileMode || !(obstacle instanceof Bear && obstacle.alwaysChase))) {
                    continue;
                }

                // Update only if in view or alwaysChase
                if (obstacle instanceof Bear) {
                    const needsUpdate = !obstacle.container.visible || inView || obstacle.alwaysChase;
                    if (needsUpdate) {
                        obstacle.update(this.riverBanks, this.gameState, inView || obstacle.alwaysChase, playerPos);
                    }
                } else if (obstacle instanceof Bird) {
                    obstacle.update(this.config.width, inView);
                } else if (obstacle instanceof Net) {
                    obstacle.update(this.config.width, inView);
                } else if (obstacle instanceof Stone) {
                    if (typeof obstacle.update === 'function') obstacle.update();
                    // Emit foam for stones in view
                    if (this.particleManager) {
                        this.particleManager.emitFoamAtStone(obstacle);
                    }
                } else {
                    obstacle.y += obstacle.velocityY;
                    obstacle.x += obstacle.velocityX;
                }

                if (!(obstacle instanceof Bear) && !(obstacle instanceof Bird) && !(obstacle instanceof Net) &&
                    (obstacle.x < 0 || obstacle.x > this.config.width)) {
                    obstacle.velocityX *= -1;
                }

                const obstacleContainer = (obstacle instanceof Bear || obstacle instanceof Bird || obstacle instanceof Net || obstacle instanceof Stone) ?
                    obstacle.getContainer() :
                    obstacle;

                // Don't take damage during romantic scene)
                if (window.Player && window.Player.getPosition && window.Player.setInvincible && this.player.isInvincible) {
                    continue;
                }
                // Only skip collision with waterfalls and bears during romantic scene or dashing
                if ((this.gameState.romanticSceneActive)
                    && (obstacle.type === 'waterfall' || obstacle instanceof Bear)) {
                    continue;
                }

                // --- Fast collision logic ---
                let collided = false;
                // Skip ALL stone collision and knockback/damage if jumping or dashing forward
                if ((obstacle instanceof Stone || obstacle.type === 'stone' || obstacle.type === 'rock') && (this.player.isJumping || (this.gameState.isDashing && this.gameState.dashDirection === 'forward'))) {
                    continue;
                }
                if (obstacle instanceof Stone) {
                    // Extra guard: skip all stone collision/knockback if jumping or dashing forward
                    if (this.player.isJumping || (this.gameState.isDashing && this.gameState.dashDirection === 'forward')) {
                        continue;
                    }
                    // Only get hitboxes if needed
                    const playerBox = window.Player.getHitbox(this.player) || { x: playerPos.x - 32, y: playerPos.y - 32, width: 64, height: 64 };
                    const stoneBox = obstacle.getHitbox ? obstacle.getHitbox() : (obstacleContainer && obstacleContainer.x !== undefined && obstacleContainer.y !== undefined ? { x: obstacleContainer.x - 32, y: obstacleContainer.y - 32, width: 64, height: 64 } : null);
                    // STRICT AABB-vs-AABB collision and resolution
                    if (
                        playerBox.x < stoneBox.x + stoneBox.width &&
                        playerBox.x + playerBox.width > stoneBox.x &&
                        playerBox.y < stoneBox.y + stoneBox.height &&
                        playerBox.y + playerBox.height > stoneBox.y
                    ) {
                        // Find the minimum translation vector to push the fish out
                        const overlapLeft = (playerBox.x + playerBox.width) - stoneBox.x;
                        const overlapRight = (stoneBox.x + stoneBox.width) - playerBox.x;
                        const overlapTop = (playerBox.y + playerBox.height) - stoneBox.y;
                        const overlapBottom = (stoneBox.y + stoneBox.height) - playerBox.y;
                        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                        let newX = window.Player.getContainer(this.player).x;
                        let newY = window.Player.getContainer(this.player).y;
                        if (minOverlap === overlapLeft) {
                            newX -= overlapLeft;
                            // handled by PlayerManager if needed
                        } else if (minOverlap === overlapRight) {
                            newX += overlapRight;
                            // handled by PlayerManager if needed
                        } else if (minOverlap === overlapTop) {
                            newY -= overlapTop;
                            // handled by PlayerManager if needed
                        } else {
                            newY += overlapBottom;
                            // handled by PlayerManager if needed
                        }
                        // Set position exactly flush to the edge
                        window.Player.setPosition(this.player, newX, newY);
                        // Only apply damage/invincibility on first contact
                        if (!this.player.isInvincible) {
                            window.Player.setInvincible(this.player, true);
                            window.Player.setInvincibilityEndTime(this.player, Date.now() + 350);
                            this.player.flickerTimer = 0;
                            if (this.player.setTint) {
                                this.player.setTint(0xff0000);
                                setTimeout(() => {
                                    if (this.player && this.player.setTint) this.player.setTint(0xffffff);
                                }, 100);
                            }
                            this.gameState.health = Math.max(0, this.gameState.health - (obstacle.damage || 20));
                            this.river.createSplash(window.Player.getContainer(this.player).x, window.Player.getContainer(this.player).y, {});
                        }
                        // Skip further processing for this obstacle in the loop
                        continue;
                    }
                } else if (obstacle.hitRadius && !(obstacle instanceof Bird)) {
                    // Only run checkCollision for obstacles with hitRadius, but NOT for Bird
                    if (this.checkCollision && this.checkCollision(this.player.getContainer(), obstacleContainer, obstacle.hitRadius)) {
                        collided = true;
                    }
                } else if (obstacle instanceof Bear || obstacle instanceof Bird) {
                    // DEBUG: Log hitboxes for fish and bird/bear
                    const playerBoxDbg = window.Player.getHitbox(this.player) || { x: playerPos.x - 32, y: playerPos.y - 32, width: 64, height: 64 };
                    const obsBoxDbg = obstacle.getHitbox ? obstacle.getHitbox() : (obstacleContainer && obstacleContainer.x !== undefined && obstacleContainer.y !== undefined ? { x: obstacleContainer.x - 32, y: obstacleContainer.y - 32, width: 64, height: 64 } : null);
                    // Use the same collision logic for bears and birds
                    const playerBox = playerBoxDbg;
                    const obsBox = obsBoxDbg;
                    let boundingOverlap = true;
                    if (playerBox && obsBox) {
                        boundingOverlap = (
                            playerBox.x < obsBox.x + obsBox.width &&
                            playerBox.x + playerBox.width > obsBox.x &&
                            playerBox.y < obsBox.y + obsBox.height &&
                            playerBox.y + playerBox.height > obsBox.y
                        );
                    }
                    if (!boundingOverlap) {
                        continue;
                    } else {
                        collided = true;
                    }
                } else {
                    // Only get hitboxes if needed
                    const playerBox = this.player.getHitbox ? this.player.getHitbox() : { x: playerPos.x - 32, y: playerPos.y - 32, width: 64, height: 64 };
                    const obsBox = obstacle.getHitbox ? obstacle.getHitbox() : (obstacleContainer && obstacleContainer.x !== undefined && obstacleContainer.y !== undefined ? { x: obstacleContainer.x - 32, y: obstacleContainer.y - 32, width: 64, height: 64 } : null);
                    let boundingOverlap = true;
                    if (playerBox && obsBox) {
                        boundingOverlap = (
                            playerBox.x < obsBox.x + obsBox.width &&
                            playerBox.x + playerBox.width > obsBox.x &&
                            playerBox.y < obsBox.y + obsBox.height &&
                            playerBox.y + playerBox.height > obsBox.y
                        );
                    }
                    if (!boundingOverlap) {
                        continue;
                    } else {
                        collided = true;
                    }
                }

                if (collided) {
                    // Skip stone knockback/damage if jumping or dashing forward
                    if ((obstacle instanceof Stone || obstacle.type === 'stone' || obstacle.type === 'rock') && (this.player.isJumping || (this.gameState.isDashing && this.gameState.dashDirection === 'forward'))) {
                        continue;
                    }
                    // Smooth collision response for stones
                    if (obstacle instanceof Stone) {
                        // Only get hitboxes if needed
                        const playerBox = this.player.getHitbox ? this.player.getHitbox() : { x: playerPos.x - 32, y: playerPos.y - 32, width: 64, height: 64 };
                        const obsBox = obstacle.getHitbox ? obstacle.getHitbox() : (obstacleContainer && obstacleContainer.x !== undefined && obstacleContainer.y !== undefined ? { x: obstacleContainer.x - 32, y: obstacleContainer.y - 32, width: 64, height: 64 } : null);
                        // Calculate knockback direction (from stone to player)
                        const px = playerBox.x + playerBox.width / 2;
                        const py = playerBox.y + playerBox.height / 2;
                        const sx = obsBox.x + obsBox.width / 2;
                        const sy = obsBox.y + obsBox.height / 2;
                        let dx = px - sx;
                        let dy = py - sy;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        dx /= dist;
                        dy /= dist;
                        // Apply knockback (tweak strength as needed)
                        const knockback = 40;
                        const newX = playerPos.x + dx * knockback;
                        const newY = playerPos.y + dy * knockback;
                        // Interpolate for smoothness
                        this.player.setPosition(
                            playerPos.x * 0.7 + newX * 0.3,
                            playerPos.y * 0.7 + newY * 0.3
                        );
                        // Short invincibility to prevent repeated hits
                        this.player.isInvincible = true;
                        this.player.invincibilityEndTime = Date.now() + 350;
                        this.player.flickerTimer = 0;
                        // Flash player red
                        if (this.player.setTint) {
                            this.player.setTint(0xff0000);
                            setTimeout(() => {
                                if (this.player && this.player.setTint) this.player.setTint(0xffffff);
                            }, 100);
                        }
                        // Take damage
                        this.gameState.health = Math.max(0, this.gameState.health - (obstacle.damage || 20));
                        this.river.createSplash(playerPos.x, playerPos.y, {});
                        // Remove the stone after collision
                        this.world.removeChild(obstacleContainer);
                        this.obstacles.splice(i, 1);
                        continue;
                    } else {
                        // Prevent birds from damaging the player during romantic sequence
                        if (obstacle instanceof Bird && this.gameState.romanticSceneActive) {
                            // Do not apply damage or invincibility, just skip
                            continue;
                        }
                        window.Player.takeDamage(this.player, obstacle.damage, this.gameState);
                        this.river.createSplash(playerPos.x, playerPos.y, {});
                        // Always flash the fish when hit by a bird
                        if (obstacle instanceof Bird) {
                            window.Player.setInvincible(this.player, true);
                            window.Player.setInvincibilityEndTime(this.player, Date.now() + 1000);
                            this.player.flickerTimer = 0;
                            if (this.player.setTint) {
                                this.player.setTint(0xff0000);
                                setTimeout(() => {
                                    if (this.player && this.player.setTint) this.player.setTint(0xffffff);
                                }, 100);
                            }
                        }
                        // Do not remove birds on collision
                        continue;
                    }
                }

                // Clean up birds above the top of the visible screen
                if (obstacle instanceof Bird && obstaclePos.y < playerPos.y - (this.config.height / 2) - 40) {
                    this.world.removeChild(obstacleContainer);
                    this.obstacles.splice(i, 1);
                    this.gameState.birdCount--;
                    this.gameState.score += 10;
                } else if (obstacle instanceof Bear && obstaclePos.y > playerPos.y + (this.config.height / 2) + 40) {
                    // Destroy bears when they're below the bottom of the visible screen plus offset
                    this.world.removeChild(obstacleContainer);
                    this.obstacles.splice(i, 1);
                    this.gameState.bearCount--;
                    this.gameState.score += 10;
                }
            }
        }

        // Check goal
        const goal = this.world.getChildByLabel('goal');
        if (goal) {
            goal.x = playerPos.x;
            // Update goal fish animation using Fish static method
            Fish.updateGoalFish(goal);

            // Check if goal is in view
            const viewTop = playerPos.y - this.config.height / 2;
            const viewBottom = playerPos.y + this.config.height / 2;
            const goalInView = goal.y >= viewTop && goal.y <= viewBottom;

            // Use RomanticSequence for romantic logic
            if (goalInView && !this.romanticSequence.goalInView) {
                this.romanticSequence.goalInView = false;
                this.romanticSequence.start(goal, playerPos);
            }
            if (this.romanticSequence.active) {
                this.romanticSequence.update(playerPos, goal);
            }
        }

        this.updateUI();

        // DEBUG: Check if particle update block is running

        // Update particles every frame for smooth 60fps effects
        if (this.particleManager) {
            if (this.gameState.won) {
                this.particleManager.updateWinHearts(actualDelta);
            } else {
                this.particleManager.updateParticles(actualDelta);
            }
            this.particleManager.updateFoam(actualDelta);
        }

        // Check if health depleted
        if (this.gameState.health <= 0) {
            this.loseGame();
        }
    }


    updateUI() {
        if (hud) {
            hud.update(this.gameState.health, this.gameState.distance);
        }
    }

    winGame(x, y) {
        this.gameState.gameOver = true;
        this.gameState.won = true;
        this.gameState.score += 1000;

        if (this.particleManager) {
            this.particleManager.emitWinHearts(x, y);
        }

        if (this.fadeOverlay) {
            const fadeInInterval = setInterval(() => {
                if (this.fadeOverlay && this.fadeOverlay.alpha > 0) {
                    this.fadeOverlay.alpha -= 0.02;
                } else if (this.fadeOverlay) {
                    clearInterval(fadeInInterval);
                    this.world.removeChild(this.fadeOverlay);
                    this.fadeOverlay = null;
                    this.player.getContainer().zIndex = this.originalPlayerZIndex;
                    const goal = this.world.getChildByLabel('goal');
                    if (goal) {
                        goal.zIndex = this.originalGoalZIndex;
                    }
                }
            }, 16);
        }

        setTimeout(() => {
            if (hud) hud.showGameOver(this.gameState.distance, true);
            overlayManager.showOverlay('win');
        }, 2000);
    }

    loseGame() {
        this.gameState.gameOver = true;
        this.audioManager.playJingleB();
        if (hud) hud.showGameOver(this.gameState.distance, false);
        overlayManager.showOverlay('lose');
        if (this.particleManager) this.particleManager.clear();
    }

    async restart() {
                // Remove the game loop from the ticker before resetting to prevent flickering
                if (this.app && this.app.ticker) {
                    this.app.ticker.remove(this.gameLoop);
                }
        // Stop ticker and clear intervals before resetting to prevent flickering
        if (this.app && this.app.ticker && this.app.ticker.started) {
            this.app.ticker.stop();
        }
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        if (this.pendingTimeouts && Array.isArray(this.pendingTimeouts)) {
            this.pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.pendingTimeouts = [];
        }

        // Reset game state, including all romantic sequence and goal flags
        this.gameState = {
            health: 100,
            distance: 0,
            score: 0,
            gameOver: false,
            won: false,
            scrollOffset: 0,
            playerVelocityX: 0,
            playerVelocityY: 0,
            waveCounter: 0,
            obstaclePattern: 0,
            isDashing: false,
            dashDirection: 'forward',
            dashEndTime: 0,
            lastDashTime: 0,
            debugMode: false,
            jinglePlayed: false,
            lastLateralSplashTime: 0,
            leftKeyPlayedSound: false,
            rightKeyPlayedSound: false,
            goalInView: false,
            kissPlayed: false,
            birdCount: 0,
            bearCount: 0,
            romanticSceneActive: false
        };

        // Cleanup and re-instantiate romantic sequence
        if (this.romanticSequence && typeof this.romanticSequence.cleanup === 'function') {
            this.romanticSequence.cleanup();
        }
        this.romanticSequence = new window.RomanticSequence(this);

        // Reset scroll speed
        this.config.scrollSpeed = this.config.originalScrollSpeed;

        // Reset fish z-indexes
        if (this.player) {
            this.player.getContainer().zIndex = this.originalPlayerZIndex;
        }

        // --- FULL DESTRUCTION OF ALL OBJECTS ---
        // Remove and destroy all obstacles
        if (this.obstacles && Array.isArray(this.obstacles)) {
            this.obstacles.forEach(obs => {
                if (obs && typeof obs.destroy === 'function') {
                    obs.destroy();
                }
                if (obs instanceof Bear || obs instanceof Bird || obs instanceof Net) {
                    if (obs.getContainer && obs.getContainer()) {
                        if (obs.getContainer().parent) {
                            obs.getContainer().parent.removeChild(obs.getContainer());
                        }
                    }
                } else if (obs && obs.parent) {
                    obs.parent.removeChild(obs);
                }
            });
        }
        this.obstacles = [];

        // Destroy and null player
        if (this.player && typeof this.player.destroy === 'function') {
            this.player.destroy();
        }
        this.player = null;

        // Destroy and null river (via River API)
        River.destroy(this.river);
        this.river = null;

        // Remove all children from world (if not already destroyed)
        if (this.world && this.world.children && this.world.children.length > 0) {
            while (this.world.children.length > 0) {
                const child = this.world.children[0];
                if (child && typeof child.destroy === 'function') {
                    child.destroy({children: true});
                }
                this.world.removeChild(child);
            }
        }

        // Destroy and null camera
        if (this.camera && typeof this.camera.destroy === 'function') {
            this.camera.destroy();
        }
        this.camera = null;

        // Destroy and null particle manager
        if (this.particleManager && typeof this.particleManager.clear === 'function') {
            this.particleManager.clear();
        }
        this.particleManager = null;
        window.particleManager = null;

        // Remove and destroy world
        if (this.world) {
            if (this.world.parent) {
                this.world.parent.removeChild(this.world);
            }
            if (typeof this.world.destroy === 'function') {
                this.world.destroy({children: true});
            }
        }
        this.world = null;

        // Null all arrays
        this.riverBanks = [];
        this.waterfalls = [];
        this.riverIslands = [];
        this.wakeTrail = [];

        // --- RECREATE ALL OBJECTS FRESH ---
        // World container
        this.world = new PIXI.Container();
        this.world.sortableChildren = true;
        this.app.stage.addChild(this.world);

        // Fade overlay
        this.fadeOverlay = new PIXI.Graphics();
        this.fadeOverlay.rect(0, 0, this.config.width, this.config.height);
        this.fadeOverlay.fill(0x000000);
        this.fadeOverlay.alpha = 0;
        this.fadeOverlay.zIndex = 500;
        this.world.addChild(this.fadeOverlay);

        // Camera
        this.camera = new Camera(this.world, this.config);

        // River
        this.river = new River(this.world, this.config, this.app.renderer);
        // River constructor calls init()

        // Player
        this.player = new Fish(this.config.width / 2, this.config.height / 2, this);
        this.world.addChild(this.player.getContainer());

        // Recreate river islands
        await this.river.createRiverIslands();
        this.riverBanks = this.river.getBanks();

        // Reconnect wake graphics to player
        const wakeGraphics = this.river.getWakeGraphics();
        if (wakeGraphics) {
            this.player.setWakeGraphics(wakeGraphics);
        }

        // Reset world position
        this.world.y = 0;

        // Reset camera
        const playerPos = this.player.getPosition();
        const cameraX = this.config.width / 2;
        this.camera.setPosition(cameraX, playerPos.y);
        this.camera.setTarget(cameraX, playerPos.y);

        // Recreate goal
        await this.createGoal();

        // Hide game over screen
        overlayManager.hideOverlay('win');
        overlayManager.hideOverlay('lose');

        // Start ticker and interval only once after reset
        if (this.app && this.app.ticker) {
            this.app.ticker.add(this.gameLoop);
            if (!this.app.ticker.started) {
                this.app.ticker.start();
            }
        }
        if (!this.spawnInterval) {
            this.spawnInterval = setInterval(() => this.spawnManager.spawnObstaclePattern(), 2000);
        }
        // Update UI
        this.updateUI();
    }

    // Clean up all resources and stop the game
    destroy() {
        // Stop obstacle spawn timer
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }

        // Clear any pending timeouts
        this.pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.pendingTimeouts = [];

        // Remove keyboard event listeners
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);

        // Remove game loop from ticker
        if (this.app && this.app.ticker) {
            this.app.ticker.remove(this.gameLoop);
        }

        // Stop camera updates
        this.stopCameraLoop();

        // Remove all obstacles
        this.obstacles.forEach(obs => {
            if (obs instanceof Bear || obs instanceof Bird || obs instanceof Net) {
                const container = obs.getContainer();
                if (container && container.parent) {
                    container.parent.removeChild(container);
                }
                if (obs.destroy) obs.destroy();
            }
        });
        this.obstacles = [];

        // Remove all particles
        if (this.particleManager) this.particleManager.clear();

        // Destroy player object
        if (this.player && this.player.destroy) {
            this.player.destroy();
        }

        // Destroy river object
        if (this.river && this.river.destroy) {
            this.river.destroy();
        }

        // Destroy camera object
        if (this.camera && this.camera.destroy) {
            this.camera.destroy();
        }

        // Remove and destroy world container
        if (this.world) {
            if (this.world.parent) {
                this.world.parent.removeChild(this.world);
            }
            this.world.destroy({
                children: true
            });
        }

        // Reset references and arrays
        this.player = null;
        this.world = null;
        this.camera = null;
        this.river = null;
        this.riverBanks = [];
        this.waterfalls = [];
        this.riverIslands = [];
        this.wakeTrail = [];
        this.keys = {};
    }

    // Completely destroy game and Pixi app (use when fully exiting)
    destroyComplete() {
        this.destroy();

        // Destroy the Pixi app (full cleanup)
        if (this.app) {
            this.app.destroy(true, {
                children: true,
                texture: true,
                baseTexture: true
            });
            this.app = null;
        }
    }
}


// Global game, HUD, and preloader instances
let game = null;
let hud = null;
let startOnKeyPress = null;
let preloader = null;
let preloadedResources = null;

// Initialize everything when the page loads
window.addEventListener('DOMContentLoaded', async () => {
    // Set up HUD
    hud = new HUD();
    hud.simulateLoading();

    // Set up ResourceLoader and preload all resources
    const resourceLoader = new window.ResourceLoader();
    resourceLoader.init();
    resourceLoader.addCoreResources();
    preloadedResources = await resourceLoader.preloadAll();
    // Validate particleFrames
    if (!preloadedResources.particleFrames || Object.keys(preloadedResources.particleFrames).length === 0) {
        console.error('[Game ERROR] particleFrames missing or empty after preload!');
    } else {
        const keys = Object.keys(preloadedResources.particleFrames);
        const invalid = keys.filter(k => {
            const t = preloadedResources.particleFrames[k];
            return !t || !(t.source && t.source.width > 0 && t.source.height > 0);
        });
        if (invalid.length > 0) {
            console.error('[Game ERROR] Some particleFrames are invalid:', invalid);
        }
    }

    // Create game instance (but don't start yet)
    const canvas = document.getElementById('gameCanvas');
    game = new Game(canvas);
    window.game = game;
    if (hud && typeof hud.setPauseCallback === 'function') {
        hud.setPauseCallback(() => game.togglePause());
    }

    await game.preloadResources();

    if (game.audioManager) {
        game.audioManager.sounds.splashSounds = [
            preloadedResources['splash_A'],
            preloadedResources['splash_B'],
            preloadedResources['splash_C']
        ].filter(Boolean);
        game.audioManager.sounds.lateralSplashSounds = [
            preloadedResources['splash_D'],
            preloadedResources['splash_E'],
            preloadedResources['splash_F']
        ].filter(Boolean);
        game.audioManager.sounds.jingle = preloadedResources['jingle_A'] || null;
        game.audioManager.sounds.jingleB = preloadedResources['jingle_B'] || null;
        game.audioManager.sounds.jingleC = preloadedResources['jingle_C'] || null;
        game.audioManager.sounds.jingleD = preloadedResources['jingle_D'] || null;
        game.audioManager.sounds.kiss = preloadedResources['kiss_A'] || null;
        Object.values(game.audioManager.sounds).forEach(audio => {
            if (Array.isArray(audio)) {
                audio.forEach(a => { if (a) { a.volume = game.audioManager.volume; a.preload = 'auto'; } });
            } else if (audio) {
                audio.volume = game.audioManager.volume;
                audio.preload = 'auto';
            }
        });
        game.audioManager.initialized = true;
    }

    await game.init();

    document.querySelector('.progress-container').style.display = 'none';
    const startBtn = document.getElementById('startButton');
    startBtn.style.display = 'block';
    overlayManager.showOverlay('start');
    startBtn.addEventListener('pointerdown', function(e) {
        e.stopPropagation();
        e.preventDefault();
    });

    if (game.app && game.app.ticker) game.app.ticker.stop();

    startOnKeyPress = (e) => {
        startGame();
    };
    window.addEventListener('keydown', startOnKeyPress);
});

// Start the game (called by start button)
function startGame() {
    // Remove keypress listener
    if (startOnKeyPress) {
        window.removeEventListener('keydown', startOnKeyPress);
        startOnKeyPress = null;
    }

    // Start game loop and controls
    if (window.game && window.game.app && window.game.app.ticker) {
        window.game.app.ticker.start();
    }
    if (window.game && typeof window.game.setupControls === 'function') {
        window.game.setupControls();
    }
    // Hide preloader and begin level
    hud.hidePreloader();
    overlayManager.hideOverlay('start');
}

// Restart the game (for restart button)
async function restartGame() {
    if (game && hud) {
        // Stop all sounds
        if (game.audioManager && typeof game.audioManager.stopAll === 'function') {
            game.audioManager.stopAll();
        }

        // Hide game over screen
        overlayManager.hideOverlay('win');
        overlayManager.hideOverlay('lose');
        document.getElementById('gameOverBackdrop').classList.remove('win');

        // Show restart spinner
        hud.showRestartSpinner();

        // Clear global references
        window.particleManager = null;
        window.game = null;
        window.hud = null;

        // Remove all event listeners
        window.removeEventListener('keydown', startOnKeyPress);
        window.removeEventListener('keydown', game && game.handleKeyDown);
        window.removeEventListener('keyup', game && game.handleKeyUp);
        window.removeEventListener('resize', game && game.handleResize);

        // Brief delay for spinner
        await new Promise(resolve => setTimeout(resolve, 100));

        // Replace old canvas before destroying Pixi app
        const oldCanvas = document.getElementById('gameCanvas');
        if (oldCanvas && oldCanvas.parentNode) {
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'gameCanvas';
            oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
        }

        // Destroy game instance and Pixi app
        let oldApp = game && game.app ? game.app : null;
        if (typeof game.destroyComplete === 'function') {
            game.destroyComplete();
        } else if (typeof game.destroy === 'function') {
            game.destroy();
        }
        game = null;

        // Extra cleanup for Pixi Application (just in case)
        if (oldApp) {
            if (oldApp.ticker) {
                oldApp.ticker.stop();
                oldApp.ticker.destroy();
            }
            if (oldApp.renderer) {
                oldApp.renderer.destroy(true);
            }
            oldApp = null;
            // Reset renderer singleton so a new app is created
            if (window.renderer) {
                window.renderer.app = null;
            }
        }

        // Brief delay for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));

        // Re-create game instance as on first load
        if (window.renderer) {
            window.renderer.app = null;
        }
        const canvas = document.getElementById('gameCanvas');
        game = new Game(canvas);
        window.game = game;
        // Set new RomanticSequence globally
        if (game.romanticSequence) {
            window.romanticSequence = game.romanticSequence;
        }
        hud = window.hud = hud; // Re-assign HUD
        if (hud && typeof hud.setPauseCallback === 'function') {
            hud.setPauseCallback(() => game.togglePause());
        }

        // Preload game assets again
        await game.preloadResources();

        // Connect preloaded audio to AudioManager again
        if (game.audioManager) {
            game.audioManager.sounds.splashSounds = [
                preloadedResources['splash_A'],
                preloadedResources['splash_B'],
                preloadedResources['splash_C']
            ].filter(Boolean);
            game.audioManager.sounds.lateralSplashSounds = [
                preloadedResources['splash_D'],
                preloadedResources['splash_E'],
                preloadedResources['splash_F']
            ].filter(Boolean);
            game.audioManager.sounds.jingle = preloadedResources['jingle_A'] || null;
            game.audioManager.sounds.jingleB = preloadedResources['jingle_B'] || null;
            game.audioManager.sounds.jingleC = preloadedResources['jingle_C'] || null;
            game.audioManager.sounds.jingleD = preloadedResources['jingle_D'] || null;
            game.audioManager.sounds.kiss = preloadedResources['kiss_A'] || null;
            Object.values(game.audioManager.sounds).forEach(audio => {
                if (Array.isArray(audio)) {
                    audio.forEach(a => { if (a) { a.volume = game.audioManager.volume; a.preload = 'auto'; } });
                } else if (audio) {
                    audio.volume = game.audioManager.volume;
                    audio.preload = 'auto';
                }
            });
            game.audioManager.initialized = true;
        }

        // Start game initialization again
        await game.init();

        // Play restart jingle
        if (game.audioManager && typeof game.audioManager.playJingle === 'function') {
            game.audioManager.playJingle();
        }

        // Hide restart spinner
        hud.hideRestartSpinner();
    }
}