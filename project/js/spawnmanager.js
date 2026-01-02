// spawnmanager.js
// Manages all spawn-related logic for the game

window.SpawnManager = class SpawnManager {
    constructor(game) {
        this.game = game;
    }

    spawnObstacle() {
        // Spawn a random bear or bird, if limits allow
        if (this.game.gameState.gameOver) return;

        const types = ['bear', 'bird'];
        const type = types[Math.floor(Math.random() * types.length)];

        let obstacle;
        const currentPlayerPos = this.game.player.getPosition();
        const cameraBounds = this.game.camera.getBounds();
        let debugSpawnY = null;
        switch (type) {
            case 'bear':
                if (this.game.gameState.bearCount >= 2) return;
                obstacle = this.game.createBear();
                // Bears spawn above the visible screen (1.5 screen heights up)
                obstacle.setPosition(0, currentPlayerPos.y - this.game.config.height * 1.5);
                this.game.gameState.bearCount++;
                break;
            case 'bird':
                obstacle = this.game.createBird();
                // Birds spawn just below the visible area
                const spawnOffset = 20;
                debugSpawnY = currentPlayerPos.y + (this.game.config.height / 2) + spawnOffset;
                const spawnX = Math.random() * this.game.config.width;
                const velocityY = -8;
                obstacle.setPosition(spawnX, debugSpawnY);
                obstacle.velocityY = velocityY;
                const birdContainer = obstacle.getContainer();
                birdContainer.zIndex = 16;
                this.game.world.addChild(birdContainer);
                this.game.gameState.birdCount++;
                break;
        }

        if (obstacle) {
            this.game.obstacles.push(obstacle);
            if (obstacle instanceof Bear) {
                const bearContainer = obstacle.getContainer();
                bearContainer.zIndex = 15;
                this.game.world.addChild(bearContainer);
            } else if (obstacle instanceof Bird) {
                const birdContainer = obstacle.getContainer();
                birdContainer.zIndex = 16;
                this.game.world.addChild(birdContainer);
            } else {
                this.game.world.addChild(obstacle);
            }
        }
    }

    spawnObstaclePattern() {
        // Spawn a pattern of obstacles (bird wave, diagonal, or single)
        if (this.game.gameState.gameOver || this.game.gameState.romanticSceneActive) return;

        this.game.gameState.waveCounter++;

        // Bears spawn more frequently if none present
        if (this.game.gameState.bearCount === 0 && Math.random() < 0.3) {
            this.spawnBearFormation();
            return;
        }

        const pattern = this.game.gameState.waveCounter % 3;

        switch (pattern) {
            case 0:
                this.spawnBirdWave();
                break;
            case 1:
                this.spawnDiagonalPattern();
                break;
            case 2:
                this.spawnObstacle();
                break;
        }
    }

    spawnBirdWave() {
        // Spawn a wave of birds, if not in romantic scene and under limit
        if (this.game.gameState.romanticSceneActive) return;
        if (this.game.gameState.birdCount >= 3) return;

        const maxNewBirds = 3 - this.game.gameState.birdCount;
        const birdCount = Math.min(maxNewBirds, 1 + Math.floor(Math.random() * 2));
        const startX = Math.random() > 0.5 ? 100 : this.game.config.width - 100;
        const direction = startX < this.game.config.width / 2 ? 1 : -1;

        for (let i = 0; i < birdCount; i++) {
            const playerPos = this.game.player.getPosition();
            // Birds spawn with a delay for wave effect
            const timeoutId = setTimeout(() => {
                if (!this.game.player) return; // Game was destroyed
                if (this.game.gameState.birdCount >= 3) return;

                const bird = this.game.createBird();
                // Use the cameraBounds from the outer scope if available, or get it here if needed
                const playerPos = this.game.player.getPosition();
                const spawnOffset = 20;
                let debugSpawnY = playerPos.y + (this.game.config.height / 2) + spawnOffset;
                const velocityY = -8;
                bird.setPosition(startX, debugSpawnY);
                bird.setVelocity(0, velocityY);
                this.game.obstacles.push(bird);
                this.game.gameState.birdCount++;
                const birdContainer = bird.getContainer();
                birdContainer.zIndex = 16;
                this.game.world.addChild(birdContainer);
            }, i * 300);
            this.game.pendingTimeouts.push(timeoutId);
        }
    }

    spawnBearFormation() {
        // Spawn a bear if not in romantic scene, under limit, and not too close to player
        if (this.game.gameState.romanticSceneActive) return;
        if (this.game.gameState.bearCount >= 2) return;

        const playerPos = this.game.player.getPosition();

        // Don't spawn if another bear is too close
        const tooClose = this.game.obstacles.some(obs => {
            if (obs instanceof Bear) {
                const bearPos = obs.getPosition();
                return Math.abs(bearPos.y - playerPos.y) < this.game.config.height * 2;
            }
            return false;
        });

        if (tooClose) return;

        // Spawn a single bear ahead of view (1.5 screen heights)
        const bear = this.game.createBear();
        bear.setPosition(0, playerPos.y - this.game.config.height * 1.5);
        this.game.obstacles.push(bear);
        this.game.gameState.bearCount++;
        const bearContainer = bear.getContainer();
        bearContainer.zIndex = 15;
        this.game.world.addChild(bearContainer);
    }

    spawnNetGauntlet() {
        // Spawn two nets with a gap, unless in romantic scene
        if (this.game.gameState.romanticSceneActive) return;
        const gapSize = 200;
        const centerGap = this.game.config.width / 2 + (Math.random() - 0.5) * 100;
        const playerPos = this.game.player.getPosition();

        const net1 = this.game.createNet();
        net1.setPosition(centerGap - gapSize / 2 - 40, playerPos.y - 400);
        this.game.obstacles.push(net1);
        this.game.world.addChild(net1.getContainer());

        const net2 = this.game.createNet();
        net2.setPosition(centerGap + gapSize / 2 + 40, playerPos.y - 400);
        this.game.obstacles.push(net2);
        this.game.world.addChild(net2.getContainer());
    }

    spawnDiagonalPattern() {
        // Spawn a diagonal pattern of bears and birds
        const types = ['bear', 'bird'];
        const startSide = Math.random() > 0.5 ? 0 : 1;

        for (let i = 0; i < 3; i++) {
            const timeoutId = setTimeout(() => {
                if (!this.game.player) return; // Game was destroyed
                const type = types[Math.floor(Math.random() * types.length)];

                // Check limits before creating
                if (type === 'bear' && this.game.gameState.bearCount >= 2) return;
                if (type === 'bird' && this.game.gameState.birdCount >= 3) return;

                let obstacle;

                switch (type) {
                    case 'bear':
                        obstacle = this.game.createBear();
                        this.game.gameState.bearCount++;
                        break;
                    case 'bird':
                        obstacle = this.game.createBird();
                        this.game.gameState.birdCount++;
                        break;
                }

                if (obstacle) {
                    const progress = i / 2;
                    const playerPos = this.game.player.getPosition();
                    const xPos = startSide === 0 ?
                        this.game.config.width * 0.3 + progress * this.game.config.width * 0.4 :
                        this.game.config.width * 0.7 - progress * this.game.config.width * 0.4;

                    if (type === 'bird') {
                        const birdSpawnY = playerPos.y + (this.game.config.height / 2) + 40 + (i * 100);
                        obstacle.setPosition(xPos, birdSpawnY);
                        obstacle.velocityY = -7 - Math.random() * 7; // -7 to -14
                        const birdContainer = obstacle.getContainer();
                        birdContainer.zIndex = 16;
                        this.game.world.addChild(birdContainer);
                    } else {
                        // Bears spawn ahead (1.5 screen heights)
                        obstacle.setPosition(xPos, playerPos.y - this.game.config.height * 1.5 - (i * 100));
                        const bearContainer = obstacle.getContainer();
                        bearContainer.zIndex = 15;
                        this.game.world.addChild(bearContainer);

                    }
                    this.game.obstacles.push(obstacle);
                }
            }, i * 400);
            this.game.pendingTimeouts.push(timeoutId);
        }
    }
}
