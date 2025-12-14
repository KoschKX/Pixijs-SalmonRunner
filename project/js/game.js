// game.js
// Main Game class: handles initialization, game loop, and cleanup
// Input class is loaded globally via <script> in index.html
let romanticSequence = null;
class Game {
    constructor(canvas) {
        this.canvas = canvas;

        // Game configuration settings
        this.config = {
            width: 1000,
            height: 1000,
            backgroundColor: 0x0066cc,
            scrollSpeed: 7.5,
            originalScrollSpeed: 7.5, // For restoring scroll speed
            playerSpeed: 5,
            playerAcceleration: 0.5,
            playerMaxSpeed: 10,
            playerFriction: 0.85,
            currentPullDown: 2,
            dashSpeed: 24, // Forward dash speed
            dashDuration: 300, // Forward dash duration
            dashCooldown: 500, // Forward dash cooldown
            backDashSpeed: 24, // Backward dash speed
            backDashDuration: 150, // Backward dash duration
            backDashCooldown: 500, // Backward dash cooldown
            spawnInterval: 120,
            goalDistance: 1000,
            riverWidth: 300,
            bankCurveSpeed: 0.18,
            bankColor: 0xd4a017
        };

        // PixiJS Application instance
        this.app = null;

        // Main game objects
        window.particleManager = null;
        this.world = null;
        this.camera = null;
        this.river = null;
        this.obstacles = [];
        // Particle manager
        this.particleManager = null;
        this.riverBanks = [];
        this.waterfalls = [];
        this.riverIslands = [];
        this.wakeTrail = [];

        // Fade overlay for transitions
        this.fadeOverlay = null;
        
        // Store original z-indexes for reset
        this.originalPlayerZIndex = 14;
        this.originalGoalZIndex = 13;

        // Game state variables
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

        // RomanticSequence instance
        this.romanticSequence = new window.RomanticSequence(this);

        // Input handler
        this.input = new Input();

        // Hitbox data
        this.bearWalkHitboxData = null;
        this.bearEatHitboxData = null;

        // Audio manager
        this.audioManager = new AudioManager();

        // Frame limiting
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 60 / this.targetFPS; // Milliseconds per frame

        // Intervals and timers
        this.spawnInterval = null;
        this.pendingTimeouts = [];

        // SpawnManager instance
        this.spawnManager = new window.SpawnManager(this);

        // Frame counter for throttling updates
        this.frameCounter = 0;

        // Bind methods to this instance
        this.gameLoop = this.gameLoop.bind(this);
        // Remove old key event bindings
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
    // Preload all resources before starting the game
    async preloadResources() {
        // Use global preloader and preloaded resources
        const resources = window.preloadedResources || await window.preloader.preloadAll();

        // Assign textures
        this.riverbedTex = resources['riverbed_B'];
        this.foliageTex = resources['riverfoliage'];
        this.salmonTex = resources['salmon'];
        this.bearWalkTex = resources['bear_walk'];
        this.bearEatTex = resources['bear_eat'];
        this.stonesTex = resources['stones'];
        this.birdGlideTex = resources['bird_glide'];
        this.birdFlapTex = resources['bird_flap'];

        // HUD images
        this.hudWinTex = resources['hud_win'];
        this.hudLoseTex = resources['hud_lose'];

        // Hitbox data
        this.bearWalkHitboxData = resources['bear_walk_hitbox'];
        this.bearEatHitboxData = resources['bear_eat_hitbox'];
        this.birdGlideHitboxData = resources['bird_glide_hbox'];
        this.birdFlapHitboxData = resources['bird_flap_hbox'];
        this.rockHitboxData = resources['rock_hbox'] || null;

        // Assign preloaded audio to AudioManager
        this.audioManager.splashSounds = [
            preloader.resources['splash_A'],
            preloader.resources['splash_B'],
            preloader.resources['splash_C'],
            preloader.resources['splash_D']
        ].filter(Boolean);
        this.audioManager.lateralSplashSounds = [
            preloader.resources['lateral_splash_A'],
            preloader.resources['lateral_splash_B']
        ].filter(Boolean);
        this.audioManager.kissSound = preloader.resources['kiss_A'];
        this.audioManager.jingleSound = preloader.resources['jingle_A'];

        // Ensure Bird assets are loaded before creating birds
        await Bird.initAssets(resources);
        await Fish.initAssets(resources);
        await Bear.initAssets(resources);
        await Stone.initAssets(resources);
    }
    updateObstacles() {
        // Remove destroyed birds and update birdCount
        this.obstacles = this.obstacles.filter(obs => {
            if (obs.type === 'bird' && obs.destroyed) {
                this.gameState.birdCount = Math.max(0, this.gameState.birdCount - 1);
                return false;
            }
            return true;
        });
    }
    // Debounced window resize handler
    setupDebouncedResize() {
        let resizeTimeout = null;
        window.addEventListener('resize', () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250); // Only run after 250ms of no resize
        });
    }

    // Handle window resizing
    handleResize() {
        if (this.app && this.config) {
            const width = window.innerWidth || this.config.width;
            const height = window.innerHeight || this.config.height;
            this.app.renderer.resize(width, height);
            this.config.width = width;
            this.config.height = height;
            // Optionally update camera or other elements here
        }
    }
    // Prevent crash on restart (no-op)
    stopCameraLoop() {}

    async createGoal() {
        // Use Fish class static method to create animated goal fish
        const goalContainer = await Fish.createGoalFish();

        goalContainer.x = this.config.width / 2;
        goalContainer.y = -(this.config.goalDistance * 10);
        goalContainer.label = 'goal';
        goalContainer.zIndex = this.originalGoalZIndex;

        goalContainer.cacheAsBitmap = true; // Optimize static goal
        this.world.addChild(goalContainer);
        // Only set sortableChildren once, not every time
        if (!this.world.sortableChildren) this.world.sortableChildren = true;
    }

    setupControls() {
        this.input.setup();
    }

    // Input event handlers are now managed by Input class

    playRandomSplash() {
        this.audioManager.playRandomSplash();
    }


    // ...spawning functions moved to SpawnManager.js...

    createBear() {
        const bear = new Bear();
        return bear;
    }

    createBird() {
        const bird = new Bird(this.config.height);
        // Ensure bird container is always added to the world and visible
        const birdContainer = bird.getContainer();
        birdContainer.zIndex = 16;
        birdContainer.visible = true;
        if (this.world && !this.world.children.includes(birdContainer)) {
            this.world.addChild(birdContainer);
        }
        return bird;
    }
    // Set up and start the game
    async init() {
        // Reset all game state values
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

        // Create Pixi Application if needed
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

        // Clear and render initial background
        if (this.app && this.app.renderer) {
            this.app.renderer.backgroundColor = this.config.backgroundColor;
            this.app.renderer.clear();
            this.app.renderer.render(this.app.stage);
        }

        // Create world container
        this.world = new PIXI.Container();
        this.world.sortableChildren = true;
        this.app.stage.addChild(this.world);

        // Add fade overlay (hidden by default)
        this.fadeOverlay = new PIXI.Graphics();
        this.fadeOverlay.rect(0, 0, this.config.width, this.config.height);
        this.fadeOverlay.fill(0x000000);
        this.fadeOverlay.alpha = 0;
        this.fadeOverlay.zIndex = 500; // High z-index, will be below fish when they bump to 1000
        this.world.addChild(this.fadeOverlay);

        // Render once to avoid blank frames
        this.app.renderer.render(this.app.stage);




        // Set up camera
        this.camera = new Camera(this.world, this.config);

        // Set up river, banks, waterfalls, and islands
        this.river = new River(this.world, this.config, this.app.renderer);
        this.riverBanks = this.river.getBanks();
        // (Optional) Optimize river banks for performance

        // Create river islands
        await this.river.createRiverIslands();

        // Set up particle effects
        this.particleManager = new ParticleManager(
            this.world,
            this.config,
            this.river.getPathAtY ? this.river.getPathAtY.bind(this.river) : () => ({curve:0})
        );
        window.particleManager = this.particleManager;

        // Create player fish
        this.createPlayer();

        // Store initial player position for distance tracking
        const initialPlayerPos = this.player.getPosition();
        this.gameState.startY = initialPlayerPos.y;

        const playerPos = this.player.getPosition();
        const cameraX = this.config.width / 2;
        this.camera.setPosition(cameraX, playerPos.y);
        this.camera.setTarget(cameraX, playerPos.y);

        // Attach wake effect to player
        const wakeGraphics = this.river.getWakeGraphics();
        if (wakeGraphics) {
            this.player.setWakeGraphics(wakeGraphics);
        }

        await this.createGoal();

        // Set up controls (after particles)
        this.setupControls();

        // Limit FPS for smoother performance
        this.app.ticker.maxFPS = 60;
        this.app.ticker.minFPS = 30;
        this.app.ticker.add(this.gameLoop);

        this.spawnInterval = setInterval(() => this.spawnManager.spawnObstaclePattern(), 2000);

        // Game is ready
        window.gameReady = true;
    }


    createPlayer() {
        this.player = new Fish(this.config.width / 2, 0, this.config);
        const playerContainer = this.player.getContainer();
        playerContainer.zIndex = this.originalPlayerZIndex;
        this.world.addChild(playerContainer);
    }

    async createGoal() {
        // Use Fish class static method to create animated goal fish
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

    // Input event handlers are now managed by Input class

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
        // --- Tap-to-move: move fish to targetX (one-time) ---
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

                // --- Swipe up/down for dashing ---
                if (this.input.keys['swipeUp']) {
                    // Simulate dash up (with possible horizontal component)
                    if (!this.gameState.isDashing && !this.gameState.romanticSceneActive) {
                        const now = Date.now();
                        if (now - this.gameState.lastDashTime >= this.config.dashCooldown) {
                            // Calculate dash duration based on swipe distance (capped)
                            let dashDuration = this.config.dashDuration;
                            let vx = 0, vy = 0;
                            if (this.input.swipeDistance && this.input.swipeStartX !== undefined && this.input.swipeStartY !== undefined) {
                                const minSwipe = 40; // threshold
                                const maxSwipe = 400; // max effective swipe
                                const minDuration = this.config.dashDuration * 0.5;
                                const maxDuration = this.config.dashDuration * 2.5;
                                const clamped = Math.max(minSwipe, Math.min(maxSwipe, this.input.swipeDistance));
                                dashDuration = minDuration + (maxDuration - minDuration) * ((clamped - minSwipe) / (maxSwipe - minSwipe));
                                // Calculate angle and set both vx and vy
                                const dx = this.input.swipeEndX - this.input.swipeStartX;
                                const dy = this.input.swipeEndY - this.input.swipeStartY;
                                const angle = Math.atan2(dy, dx);
                                // Up is negative Y, so invert for dash
                                const speed = this.config.dashSpeed;
                                vx = Math.cos(angle) * speed;
                                vy = Math.sin(angle) * speed;
                                // Clamp vy to be at least 60% of dashSpeed upward
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
                    // Simulate dash down (with possible horizontal component)
                    if (!this.gameState.isDashing && !this.gameState.romanticSceneActive) {
                        const now = Date.now();
                        if (now - this.gameState.lastDashTime >= this.config.backDashCooldown) {
                            // Calculate dash duration based on swipe distance (capped)
                            let dashDuration = this.config.backDashDuration;
                            let vx = 0, vy = 0;
                            if (this.input.swipeDistance && this.input.swipeStartX !== undefined && this.input.swipeStartY !== undefined) {
                                const minSwipe = 40;
                                const maxSwipe = 400;
                                const minDuration = this.config.backDashDuration * 0.5;
                                const maxDuration = this.config.backDashDuration * 2.5;
                                const clamped = Math.max(minSwipe, Math.min(maxSwipe, this.input.swipeDistance));
                                dashDuration = minDuration + (maxDuration - minDuration) * ((clamped - minSwipe) / (maxSwipe - minSwipe));
                                // Calculate angle and set both vx and vy
                                const dx = this.input.swipeEndX - this.input.swipeStartX;
                                const dy = this.input.swipeEndY - this.input.swipeStartY;
                                const angle = Math.atan2(dy, dx);
                                const speed = this.config.backDashSpeed;
                                vx = Math.cos(angle) * speed;
                                vy = Math.sin(angle) * speed;
                                // Clamp vy to be at least 60% of backDashSpeed downward
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

        // Frame limiting logic
        const now = performance.now();
        if (!this.lastFrameTime) this.lastFrameTime = now;
        const elapsed = now - this.lastFrameTime;
        if (elapsed < this.frameInterval) {
            return; // Skip this frame if not enough time has passed
        }
        this.lastFrameTime = now;

        // Use Pixi's delta time directly
        const actualDelta = delta.deltaTime;

        // Cache player position to avoid repeated getPosition() calls
        let playerPos = (this.player && typeof this.player.getPosition === 'function') ? this.player.getPosition() : {x: this.config.width/2, y: 0};

        // Update camera target and position with correct delta
        if (this.camera && this.player) {
            const cameraX = this.config.width / 2;
            this.camera.setTarget(cameraX, playerPos.y);
            this.camera.update(actualDelta);
        }

        // Increment frame counter
        this.frameCounter++;

        if (!this.gameState.won) {
            const now = Date.now();
            // Set isJumping state for the fish when dashing forward
            if (this.gameState.isDashing && this.gameState.dashDirection === 'forward') {
                this.player.isJumping = true;
            } else {
                this.player.isJumping = false;
            }
            // End dash early if key is released (shorten dash duration by 40%)
            if (this.gameState.isDashing) {
                let dashKeyHeld = false;
                if (this.gameState.dashDirection === 'forward') {
                    dashKeyHeld = this.input.keys['ArrowUp'] || this.input.keys['w'] || this.input.keys['W'];
                } else if (this.gameState.dashDirection === 'backward') {
                    dashKeyHeld = this.input.keys['ArrowDown'] || this.input.keys['s'] || this.input.keys['S'];
                }
                if (!dashKeyHeld && !this.gameState.dashShortened) {
                    // Shorten dash duration by 40% if released early (once per dash)
                    const nowTime = Date.now();
                    const remaining = this.gameState.dashEndTime - nowTime;
                    if (remaining > 30) { // Only shorten if there's time left
                        this.gameState.dashEndTime = nowTime + Math.floor(remaining * 0.4);
                        this.gameState.dashShortened = true;
                    }
                }
                if (now >= this.gameState.dashEndTime) {
                    this.gameState.isDashing = false;
                    this.gameState.dashShortened = false;
                    // Always clear invincibility at end of any dash
                    if (this.player) {
                        this.player.isInvincible = false;
                        this.player.invincibilityEndTime = 0;
                    }
                    // Reset scale to 1x ONLY for forward dash
                    if (this.gameState.dashDirection === 'forward' && this.player && this.player.mesh) {
                        this.player.mesh.scale.set(this.player.meshScale);
                    }
                    // Always restore zIndex after dash ends
                    if (this.player) {
                        const playerContainer = this.player.getContainer();
                        playerContainer.zIndex = this.originalPlayerZIndex;
                    }
                    // Create a splash effect at the player's position
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

            // Movement
            let targetVelocityX = 0;
            let targetVelocityY = -this.config.scrollSpeed;

            // Bounce lockout disables normal movement for a short time after hitting a waterfall
            if (this.gameState.bounceLockout) {
                // Allow dashing (forward or backward) to break the bounce lockout at any point (easing or pause)
                let dashDir = null;
                if ((this.input.keys['ArrowUp'] || this.input.keys['w'] || this.input.keys['W'])) dashDir = 'forward';
                if ((this.input.keys['ArrowDown'] || this.input.keys['s'] || this.input.keys['S'])) dashDir = 'backward';
                const now = Date.now();
                if (dashDir && !this.gameState.isDashing) {
                    // End lockout, easing, and pause immediately if dash is triggered
                    this.gameState.bounceLockout = false;
                    this.gameState.bounceEasing = false;
                    this.gameState.bounceVelocityY = null;
                    this.gameState.bounceVelocityX = null;
                    this.gameState.bounceStartTime = null;
                    this.gameState.bounceDuration = null;
                    this.gameState.bouncePause = null;
                    this.gameState.bounceInitialVelocityY = null;
                    // Immediately trigger dash in the correct direction
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
                    // Easing bounce: ease out, then pause
                    if (this.gameState.bounceEasing && typeof this.gameState.bounceInitialVelocityY === 'number') {
                        const elapsed = Date.now() - (this.gameState.bounceStartTime || 0);
                        const t = Math.min(1, elapsed / (this.gameState.bounceDuration || 1));
                        // Ease out: velocityY = initial * (1-t)^2 (quadratic ease out)
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
            // --- Dash key trigger logic outside of bounce lockout ---
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
                // Dash overrides normal movement
                if (this.gameState.isDashing) {
                    if (this.gameState.dashDirection === 'forward') {
                        // Animate scale for jump effect ONLY for forward dash
                        const dashElapsed = (now - (this.gameState.dashEndTime - this.config.dashDuration)) / this.config.dashDuration;
                        let scale = 1;
                        if (dashElapsed < 0.5) {
                            // Scale up to 2x at midpoint
                            scale = 1 + dashElapsed * 2;
                        } else {
                            // Scale back down to 1x
                            scale = 2 - (dashElapsed - 0.5) * 2;
                        }
                        if (this.player && this.player.mesh) {
                            this.player.mesh.scale.set(this.player.meshScale * scale);
                            // Set zIndex above bears ONLY if isJumping AND scale > 1.25, else always restore
                            const playerContainer = this.player.getContainer();
                            if (this.player.isJumping && (this.player.meshScale * scale) > 1.25) {
                                playerContainer.zIndex = 16; // Bears are 15, birds 16
                            } else {
                                playerContainer.zIndex = this.originalPlayerZIndex;
                            }
                        }
                        targetVelocityY = -this.config.dashSpeed;
                    } else if (this.gameState.dashDirection === 'backward') {
                        // NO scale animation for back dash
                        targetVelocityY = this.config.backDashSpeed;
                        // --- Minimal left/right control for back dash ---
                        if (this.input.keys['ArrowLeft'] || this.input.keys['a'] || this.input.keys['A']) {
                            targetVelocityX = -this.config.playerMaxSpeed * 0.45; // Minimal boost for back dash
                        } else if (this.input.keys['ArrowRight'] || this.input.keys['d'] || this.input.keys['D']) {
                            targetVelocityX = this.config.playerMaxSpeed * 0.45;
                        } else {
                            targetVelocityX = 0;
                        }
                        // Slightly increased acceleration for back dash
                        var backDashAccel = this.config.playerAcceleration * 1.1;
                        this.gameState.playerVelocityX += (targetVelocityX - this.gameState.playerVelocityX) * backDashAccel * actualDelta;
                    }
                } else {
                    if (this.input.keys['ArrowLeft'] || this.input.keys['a'] || this.input.keys['A']) {
                        targetVelocityX = -this.config.playerMaxSpeed;

                        // Play sound only once when key is first pressed
                        if (!this.gameState.leftKeyPlayedSound) {
                            this.audioManager.playRandomLateralSplash();
                            this.gameState.leftKeyPlayedSound = true;
                        }
                    } else {
                        // Reset flag when key is released
                        this.gameState.leftKeyPlayedSound = false;
                    }

                    if (this.input.keys['ArrowRight'] || this.input.keys['d'] || this.input.keys['D']) {
                        targetVelocityX = this.config.playerMaxSpeed;

                        // Play sound only once when key is first pressed
                        if (!this.gameState.rightKeyPlayedSound) {
                            this.audioManager.playRandomLateralSplash();
                            this.gameState.rightKeyPlayedSound = true;
                        }
                    } else {
                        // Reset flag when key is released
                        this.gameState.rightKeyPlayedSound = false;
                    }
                }
            }

            // Acceleration
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
                                        // --- Moderate left/right control during jump ---
                                        if (this.input.keys['ArrowLeft'] || this.input.keys['a'] || this.input.keys['A']) {
                                            targetVelocityX = -this.config.playerMaxSpeed * 1.35; // Moderate boost
                                        } else if (this.input.keys['ArrowRight'] || this.input.keys['d'] || this.input.keys['D']) {
                                            targetVelocityX = this.config.playerMaxSpeed * 1.35;
                                        } else {
                                            targetVelocityX = 0;
                                        }
                                        // Slightly increased acceleration for jump
                                        var jumpAccel = this.config.playerAcceleration * 1.5;
                                        this.gameState.playerVelocityX += (targetVelocityX - this.gameState.playerVelocityX) * jumpAccel * actualDelta;

            const newX = playerPos.x + this.gameState.playerVelocityX * actualDelta;
            const newY = playerPos.y + this.gameState.playerVelocityY * actualDelta;
            this.player.setPosition(newX, newY);

            playerPos = this.player.getPosition();

            this.player.update(this.gameState.playerVelocityX, this.gameState.playerVelocityY);
            this.player.updateWake(this.gameState.scrollOffset);

            // Camera is now updated in its own loop (see startCameraLoop)
        }

        // Keep fade overlay fixed on screen (don't scroll with camera)
        if (this.fadeOverlay) {
            this.fadeOverlay.x = -this.world.x;
            this.fadeOverlay.y = -this.world.y;
        }

        // Always check river bank collision, even during romantic scene
        if (!this.gameState.won) {
            this.river.checkBankCollision(this.player, this.gameState.isDashing, this.gameState);
        }

        if (!this.gameState.won) {
            // Guard against NaN distance
            const startY = (typeof this.gameState.startY === 'number') ? this.gameState.startY : playerPos.y;
            const distanceTraveled = startY - playerPos.y;
            this.gameState.distance = Number.isFinite(distanceTraveled) ? Math.max(0, Math.floor(distanceTraveled / 10)) : 0;
        }

        // Update river banks (throttled to every 3rd frame)
        if (!this.gameState.won && this.frameCounter % 3 === 0) {
            this.river.updateBanks(playerPos);
        }

        // Update background layers
        if (!this.gameState.won) {
            this.river.updateWaterLayers(playerPos, this.gameState.scrollOffset);
        }

        // Update waterfalls (throttled to every 2nd frame)
        if (!this.gameState.won && this.frameCounter % 2 === 0) {
            const viewBuffer = this.config.height;
            this.river.updateWaterfalls(playerPos, this.config.height, viewBuffer);
        }

        // Update river islands (throttled to every 2nd frame)
        if (!this.gameState.won && this.frameCounter % 2 === 0) {
            const viewBuffer = this.config.height;
            this.river.updateIslands(playerPos, this.player, this.config.height, viewBuffer, this.gameState);
        }

        // Update obstacles
        if (!this.gameState.won) {
            const viewTop = playerPos.y - this.config.height / 2 - this.config.height * 2;
            const viewBottom = playerPos.y + this.config.height / 2 + this.config.height;

            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obstacle = this.obstacles[i];
                // Force type for PIXI.Sprite/Graphics stones if missing (redundant, but keep for safety)
                if (!obstacle.type && obstacle.texture && obstacle.texture.baseTexture && obstacle.texture.baseTexture.resource && obstacle.texture.baseTexture.resource.url &&
                    (obstacle.texture.baseTexture.resource.url.includes('stone') || obstacle.texture.baseTexture.resource.url.includes('rock'))
                ) {
                    obstacle.type = 'rock';
                }
                let obstaclePos;
                if (
                    (obstacle instanceof Bear || obstacle instanceof Bird || obstacle instanceof Net) && typeof obstacle.getPosition === 'function'
                ) {
                    obstaclePos = obstacle.getPosition();
                } else if (obstacle instanceof Stone && typeof obstacle.getPosition === 'function') {
                    obstaclePos = obstacle.getPosition();
                } else if (obstacle.getContainer && obstacle.getContainer().x !== undefined && obstacle.getContainer().y !== undefined) {
                    // Fallback for Stone or other objects with getContainer
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

                // Skip collision and update for obstacles far off screen
                const inView = obstaclePos.y >= viewTop && obstaclePos.y <= viewBottom;
                // Hide obstacles that are out of view
                let obstacleContainerForVisibility = (obstacle instanceof Bear || obstacle instanceof Bird || obstacle instanceof Net || obstacle instanceof Stone) ?
                    obstacle.getContainer() :
                    obstacle;
                if (obstacleContainerForVisibility && obstacleContainerForVisibility.visible !== undefined) {
                    obstacleContainerForVisibility.visible = inView;
                }
                if (!inView && !(obstacle instanceof Bear && obstacle.alwaysChase)) {
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

                // Don't take damage during romantic scene
                // Skip all player collisions with obstacles during romantic scene
                // Only skip collision for rocks and waterfalls during romantic scene
                // Also skip all obstacle collision if fish is invincible (prevents jitter)
                if (this.player.isInvincible) {
                    continue;
                }
                // Only skip collision with rocks and bears if dashing (forward or backward)
                if ((this.player.isJumping || this.gameState.isDashing || this.gameState.romanticSceneActive)
                    && (obstacle.type === 'stone' || obstacle.type === 'waterfall' || obstacle instanceof Bear)) {
                    continue;
                }

                // --- Fast collision logic ---
                let collided = false;
                if (obstacle instanceof Stone) {
                    // Only get hitboxes if needed
                    const playerBox = this.player.getHitbox ? this.player.getHitbox() : { x: playerPos.x - 32, y: playerPos.y - 32, width: 64, height: 64 };
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
                        let newX = this.player.container.x;
                        let newY = this.player.container.y;
                        if (minOverlap === overlapLeft) {
                            newX -= overlapLeft;
                            this.player.velocityX = 0;
                        } else if (minOverlap === overlapRight) {
                            newX += overlapRight;
                            this.player.velocityX = 0;
                        } else if (minOverlap === overlapTop) {
                            newY -= overlapTop;
                            this.player.velocityY = 0;
                        } else {
                            newY += overlapBottom;
                            this.player.velocityY = 0;
                        }
                        // Set position exactly flush to the edge
                        this.player.setPosition(newX, newY);
                        // Only apply damage/invincibility on first contact
                        if (!this.player.isInvincible) {
                            this.player.isInvincible = true;
                            this.player.invincibilityEndTime = Date.now() + 350;
                            this.player.flickerTimer = 0;
                            if (this.player.setTint) {
                                this.player.setTint(0xff0000);
                                setTimeout(() => {
                                    if (this.player && this.player.setTint) this.player.setTint(0xffffff);
                                }, 100);
                            }
                            this.gameState.health = Math.max(0, this.gameState.health - (obstacle.damage || 20));
                            this.river.createSplash(this.player.container.x, this.player.container.y, {});
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
                    const playerBoxDbg = this.player.getHitbox ? this.player.getHitbox() : { x: playerPos.x - 32, y: playerPos.y - 32, width: 64, height: 64 };
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
                        this.player.takeDamage(obstacle.damage, this.gameState);
                        this.river.createSplash(playerPos.x, playerPos.y, {});
                        // Always flash the fish when hit by a bird
                        if (obstacle instanceof Bird) {
                            this.player.isInvincible = true;
                            this.player.invincibilityEndTime = Date.now() + 1000;
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

        // Spawn hearts using ParticleManager
        if (this.particleManager) {
            this.particleManager.emitWinHearts(x, y);
        }

        // Fade back in as soon as hearts appear
        if (this.fadeOverlay) {
            const fadeInInterval = setInterval(() => {
                if (this.fadeOverlay && this.fadeOverlay.alpha > 0) {
                    this.fadeOverlay.alpha -= 0.02;
                } else if (this.fadeOverlay) {
                    clearInterval(fadeInInterval);
                    // Remove fade overlay when fully faded in
                    this.world.removeChild(this.fadeOverlay);
                    this.fadeOverlay = null;
                    // Restore fish z-indexes to normal
                    this.player.getContainer().zIndex = this.originalPlayerZIndex;
                    const goal = this.world.getChildByLabel('goal');
                    if (goal) {
                        goal.zIndex = this.originalGoalZIndex;
                    }
                }
            }, 16); // ~60fps
        }

        // Show win screen after a delay
        setTimeout(() => {
            document.getElementById('gameOverTitle').textContent = 'WIN';
            document.getElementById('gameOverMessage').textContent = 'You made it to the spawning grounds!';
            document.getElementById('finalDistance').textContent = this.gameState.distance;
            document.getElementById('gameOverBackdrop').classList.add('win');
            document.getElementById('gameOverBackdrop').style.display = 'block';
            document.getElementById('gameOver').style.display = 'block';
        }, 2000);
    }

    loseGame() {
        this.gameState.gameOver = true;

        // Play jingle B on lose
        this.audioManager.playJingleB();


        document.getElementById('gameOverTitle').textContent = 'LOSE';
        document.getElementById('gameOverMessage').textContent = 'The journey was too dangerous...';
        document.getElementById('finalDistance').textContent = this.gameState.distance;
        document.getElementById('gameOverBackdrop').style.display = 'block';
        document.getElementById('gameOver').style.display = 'block';
        // Clear all particles
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

        // Destroy and null river
        if (this.river && typeof this.river.destroy === 'function') {
            this.river.destroy();
        }
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
        document.getElementById('gameOver').style.display = 'none';

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

        // DEBUG: Print world and stage children after reset
        if (this.world && this.world.children) {
            console.log('[DEBUG] World children after reset:', this.world.children.map(c => c.label || c.constructor.name || c.name));
        }
        if (this.app && this.app.stage && this.app.stage.children) {
            console.log('[DEBUG] Stage children after reset:', this.app.stage.children.map(c => c.label || c.constructor.name || c.name));
        }
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
window.onload = async () => {
    // Set up HUD
    hud = new HUD();

    // Pause button will be connected after game is created

    // Show loading animation
    hud.simulateLoading();

    // Set up preloader and add all resources
    preloader = new Preloader();
    window.preloader = preloader;
    preloader.add('texture', 'assets/riverbed_B.jpg', 'riverbedTex');
    preloader.add('texture', 'assets/riverfoliage.png', 'foliageTex');
    preloader.add('texture', 'assets/bear_walk.png', 'bear_walk');
    preloader.add('texture', 'assets/bear_eat.png', 'bear_eat');
    preloader.add('texture', 'assets/stones.png', 'stones');
    preloader.add('texture', 'assets/bird_glide.png', 'bird_glide');
    preloader.add('texture', 'assets/bird_flap.png', 'bird_flap');
    preloader.add('json', 'assets/bear_walk_hbox.json', 'bear_walk_hitbox');
    preloader.add('json', 'assets/bear_eat_hbox.json', 'bear_eat_hitbox');
    preloader.add('json', 'assets/bird_glide_hbox.json', 'bird_glide_hbox');
    preloader.add('json', 'assets/bird_flap_hbox.json', 'bird_flap_hbox');
    preloader.add('json', 'assets/stones_hbox.json', 'stones_hbox');
    preloader.add('audio', 'assets/audio/splash_A.mp3', 'splash_A');
    preloader.add('audio', 'assets/audio/splash_B.mp3', 'splash_B');
    preloader.add('audio', 'assets/audio/splash_C.mp3', 'splash_C');
    preloader.add('audio', 'assets/audio/splash_D.mp3', 'splash_D');
    preloader.add('audio', 'assets/audio/splash_E.mp3', 'splash_E');
    preloader.add('audio', 'assets/audio/splash_F.mp3', 'splash_F');
    preloader.add('audio', 'assets/audio/jingle_A.mp3', 'jingle_A');
    preloader.add('audio', 'assets/audio/jingle_B.mp3', 'jingle_B');
    preloader.add('audio', 'assets/audio/jingle_C.mp3', 'jingle_C');
    preloader.add('audio', 'assets/audio/jingle_D.mp3', 'jingle_D');
    preloader.add('audio', 'assets/audio/kiss_A.mp3', 'kiss_A');

    // Preload all resources
    preloadedResources = await preloader.preloadAll();
    window.preloadedResources = preloadedResources;

    // Create game instance (but don't start yet)
    const canvas = document.getElementById('gameCanvas');
    game = new Game(canvas);
    window.game = game; // Make game accessible to other classes
    if (hud && typeof hud.setPauseCallback === 'function') {
        hud.setPauseCallback(() => game.togglePause());
    }

    // Preload game assets (including Stone assets)
    await game.preloadResources();

    // Connect preloaded audio to AudioManager
    if (game.audioManager) {
        // Splash sounds (array)
        game.audioManager.sounds.splashSounds = [
            preloadedResources['splash_A'],
            preloadedResources['splash_B'],
            preloadedResources['splash_C']
        ].filter(Boolean);
        // Lateral splash sounds (array)
        game.audioManager.sounds.lateralSplashSounds = [
            preloadedResources['splash_D'],
            preloadedResources['splash_E'],
            preloadedResources['splash_F']
        ].filter(Boolean);
        // Jingles and kiss
        game.audioManager.sounds.jingle = preloadedResources['jingle_A'] || null;
        game.audioManager.sounds.jingleB = preloadedResources['jingle_B'] || null;
        game.audioManager.sounds.jingleC = preloadedResources['jingle_C'] || null;
        game.audioManager.sounds.jingleD = preloadedResources['jingle_D'] || null;
        game.audioManager.sounds.kiss = preloadedResources['kiss_A'] || null;
        // Set volume and preload for each
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

    // Start game initialization
    await game.init();

    // Hide loading bar, show start button
    document.querySelector('.progress-container').style.display = 'none';
    document.getElementById('startButton').style.display = 'block';

    // Pause game until player starts
    if (game.app && game.app.ticker) game.app.ticker.stop();

    // Wait for any key to start
    startOnKeyPress = (e) => {
        startGame();
    };
    window.addEventListener('keydown', startOnKeyPress);
};

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
}

// Restart the game (for restart button)
async function restartGame() {
    if (game && hud) {
        // Stop all sounds
        if (game.audioManager && typeof game.audioManager.stopAll === 'function') {
            game.audioManager.stopAll();
        }

        // Hide game over screen
        document.getElementById('gameOverBackdrop').style.display = 'none';
        document.getElementById('gameOver').style.display = 'none';
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
        }

        // Brief delay for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));

        // Re-create game instance as on first load
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