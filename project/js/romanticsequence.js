// romanticsequence.js
// Manages the romantic sequence: goal fish, fade, win, hearts, and related effects

window.RomanticSequence = class RomanticSequence {
	constructor(game) {
		this.game = game;
		this.active = false;
		this.goalInView = false;
		this.kissPlayed = false;
	}

	start(goal, playerPos) {
		// Triggered when the goal fish comes into view
		this.active = true;
		this.goalInView = true;
		this.game.gameState.romanticSceneActive = true;
		this.createFadeOverlay();
		this.game.audioManager.playJingleC();

		// Remove all birds and bears from the world
		for (let i = this.game.obstacles.length - 1; i >= 0; i--) {
			const obs = this.game.obstacles[i];
			if (obs instanceof Bird || obs instanceof Bear) {
				const obsContainer = obs.getContainer();
				this.game.world.removeChild(obsContainer);
				this.game.obstacles.splice(i, 1);
				if (obs instanceof Bird) this.game.gameState.birdCount--;
				if (obs instanceof Bear) this.game.gameState.bearCount--;
			}
		}

		// Stop spawning new enemies
		if (this.game.spawnInterval) {
			clearInterval(this.game.spawnInterval);
			this.game.spawnInterval = null;
		}

		// Bring player and goal fish above fade overlay
		this.game.player.getContainer().zIndex = 1000;
		goal.zIndex = 1000;
		// Reset player state and scale
		if (this.game.player) {
			this.game.player.isJumping = false;
			this.game.player.isDashing = false;
			if (this.game.player.mesh) {
				this.game.player.mesh.scale.set(this.game.player.meshScale);
			}
		}

		// Dramatic slow-motion: reduce scroll speed
		this.game.config.scrollSpeed = this.game.config.scrollSpeed * 0.25;
	}

	createFadeOverlay() {
		// Add a black fade overlay if it doesn't exist
		if (!this.game.fadeOverlay) {
			this.game.fadeOverlay = new PIXI.Graphics();
			this.game.fadeOverlay.rect(0, 0, this.game.config.width, this.game.config.height);
			this.game.fadeOverlay.fill(0x000000);
			this.game.fadeOverlay.alpha = 0;
			this.game.fadeOverlay.zIndex = 500;
			this.game.world.addChild(this.game.fadeOverlay);
		}
	}

	update(playerPos, goal) {
		// Update fade overlay based on vertical distance between player and goal
		if (this.game.gameState.romanticSceneActive && this.game.fadeOverlay && !this.game.gameState.won) {
			const verticalDistance = Math.abs(playerPos.y - goal.y);
			const headDistance = 120;
			const initialDistance = this.game.config.height * 0.67;
			const fadeEnd = headDistance;
			let targetAlpha;
			if (verticalDistance >= initialDistance) {
				targetAlpha = 0;
			} else if (verticalDistance <= fadeEnd) {
				targetAlpha = 1;
			} else {
				targetAlpha = 1 - ((verticalDistance - fadeEnd) / (initialDistance - fadeEnd));
			}
			this.game.fadeOverlay.alpha = targetAlpha;
		}

		this.game.player.zIndex = 1000;
		
		if(this.kissPlayed){
            this.game.player.updateSpriteSheet();
        }

		// Keep fade overlay fixed on screen
		if (this.game.fadeOverlay) {
			this.game.fadeOverlay.x = -this.game.world.x;
			this.game.fadeOverlay.y = -this.game.world.y;
		}

		// Check if player and goal have met (win)
		this.checkWin(playerPos, goal);
	}

	checkWin(playerPos, goal) {
		// Check if player and goal are close enough to trigger win
		const headDistance = 100;
		if (this.game.checkCollision(this.game.player.getContainer(), goal, headDistance)) {
			if (!this.game.gameState.won) {
				const midX = (playerPos.x + goal.x) / 2;
				const midY = (playerPos.y + goal.y) / 2;
				if (!this.kissPlayed) {
					this.kissPlayed = true;
					this.game.gameState.kissPlayed = true;
					this.game.gameState.gameOver = true;
					this.game.gameState.won = true;
					this.game.audioManager.playKiss();
					// Restore normal scroll speed
					this.game.config.scrollSpeed = this.game.config.originalScrollSpeed;
					// Wait for jingle C to finish, then play jingle D and show hearts
					if (this.game.audioManager.sounds.jingleC && !this.game.audioManager.sounds.jingleC.paused) {
						this.game.audioManager.sounds.jingleC.onended = () => {
							this.game.audioManager.playJingleD();
							this.game.winGame(midX, midY);
						};
					} else {
						this.game.audioManager.playJingleD();
						this.game.winGame(midX, midY);
					}
				}
			}
		}
	}

	cleanup() {
		// Remove fade overlay and reset z-indexes
		if (this.game.fadeOverlay) {
			this.game.world.removeChild(this.game.fadeOverlay);
			this.game.fadeOverlay = null;
		}
		if (this.game.player) {
			this.game.player.getContainer().zIndex = this.game.originalPlayerZIndex;
		}
		const goal = this.game.world.getChildByLabel && this.game.world.getChildByLabel('goal');
		if (goal) {
			goal.zIndex = this.game.originalGoalZIndex;
		}
		// Reset all romantic sequence state
		this.active = false;
		this.goalInView = false;
		this.kissPlayed = false;
		this.game.gameState.romanticSceneActive = false;
		this.game.gameState.goalInView = false;
		this.game.gameState.kissPlayed = false;
	}
};
