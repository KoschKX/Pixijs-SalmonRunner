class HUD {
    constructor() {
        this.gameInfoElement = document.getElementById('gameInfo');
        this.healthElement = document.getElementById('health');
        this.distanceElement = document.getElementById('distance');
        this.gameOverElement = document.getElementById('gameOver');
        this.gameOverBackdropElement = document.getElementById('gameOverBackdrop');
        this.gameOverTitleElement = document.getElementById('gameOverTitle');
        this.gameOverMessageElement = document.getElementById('gameOverMessage');
        this.finalDistanceElement = document.getElementById('finalDistance');
        
        this.preloaderElement = document.getElementById('preloader');
        this.progressBarElement = document.querySelector('.progress-bar');
        this.progressTextElement = document.querySelector('.progress-text');
        this.progressTextFilledElement = document.querySelector('.progress-text-filled');
        this.loadingInterval = null;
        
        this.spinnerElement = document.createElement('div');
        this.spinnerElement.id = 'restartSpinner';
        this.spinnerElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            font-size: 40px;
            color: white;
            display: none;
            z-index: 10000;
        `;
        this.spinnerElement.textContent = '↻';
        document.body.appendChild(this.spinnerElement);
        
        this.spinnerInterval = null;
        this.spinnerAnimationId = null;
        this.spinnerRotation = 0;
        this.spinnerStartTime = 0;

        // Pause button in the top right corner
        this.pauseButton = document.createElement('span');
        this.pauseButton.id = 'pauseButton';
        this.pauseButton.textContent = '❚❚';
        this.pauseButton.style.position = 'fixed';
        this.pauseButton.style.top = '24px';
        this.pauseButton.style.right = '32px';
        this.pauseButton.style.zIndex = 10001;
        this.pauseButton.style.fontSize = '20px';
        this.pauseButton.style.color = '#fff';
        this.pauseButton.style.cursor = 'pointer';
        this.pauseButton.style.opacity = '0.92';
        this.pauseButton.onmouseenter = () => this.pauseButton.style.opacity = '1';
        this.pauseButton.onmouseleave = () => this.pauseButton.style.opacity = '0.92';
        document.body.appendChild(this.pauseButton);
        this.pauseButton.style.display = 'none';

        this.pauseOverlay = document.createElement('div');
        this.pauseOverlay.id = 'pauseOverlay';
        this.pauseOverlay.style.position = 'fixed';
        this.pauseOverlay.style.top = '0';
        this.pauseOverlay.style.left = '0';
        this.pauseOverlay.style.width = '100vw';
        this.pauseOverlay.style.height = '100vh';
        this.pauseOverlay.style.background = 'rgba(0,0,0,0.45)';
        this.pauseOverlay.style.zIndex = 999;
        this.pauseOverlay.style.display = 'none';
        this.pauseOverlay.style.alignItems = 'center';
        this.pauseOverlay.style.justifyContent = 'center';
        this.pauseOverlay.style.fontSize = '48px';
        this.pauseOverlay.style.color = '#fff';
        this.pauseOverlay.style.fontWeight = 'bold';
        this.pauseOverlay.textContent = 'PAUSED';
        document.body.appendChild(this.pauseOverlay);

        this._pauseCallback = null;
        this.pauseButton.addEventListener('click', () => {
            if (typeof this._pauseCallback === 'function') this._pauseCallback();
        });

        this.hudElement = document.getElementById('hud');
        this.scoreElement = document.getElementById('score');
        this.winOverlay = document.getElementById('win-overlay');
        this.loseOverlay = document.getElementById('lose-overlay');
    }

    setPauseCallback(cb) {
        this._pauseCallback = cb;
    }

    setPauseState(paused) {
        if (this.pauseButton) {
            this.pauseButton.textContent = paused ? '▶' : '❚❚';
            this.pauseButton.style.fontSize = '24px';
            this.pauseButton.style.letterSpacing = '0px';
        }
        if (this.pauseOverlay) this.pauseOverlay.style.display = paused ? 'flex' : 'none';

        if (paused) {
            this.showPause();
        } else {
            this.hidePause();
        }
    }

    destroyPauseButton() {
        if (this.pauseButton && this.pauseButton.parentNode) {
            this.pauseButton.parentNode.removeChild(this.pauseButton);
        }
        if (this.pauseOverlay && this.pauseOverlay.parentNode) {
            this.pauseOverlay.parentNode.removeChild(this.pauseOverlay);
        }
    }
    
    update(health, distance) {
        // 1 heart = 10 health
        const hearts = Math.ceil(health / 10);
        const maxHearts = 10;
        let heartDisplay = '';
        
        for (let i = 0; i < maxHearts; i++) {
            if (i < hearts) {
                heartDisplay += '<span style="color: #ff4466;">♥</span> ';
            } else {
                heartDisplay += '<span style="color: rgba(255, 68, 102, 0.25);">♥</span> ';
            }
        }
        
        this.healthElement.innerHTML = heartDisplay.trim();
        this.healthElement.style.fontSize = '2em';
        
        let displayDistance = distance;
        if (window.game && window.game.config && typeof window.game.config.goalDistance === 'number') {
            if ((window.game.gameState && window.game.gameState.romanticSceneActive) || (window.game.gameState && window.game.gameState.won)) {
                displayDistance = window.game.config.goalDistance;
            } else {
                const player = window.game.player;
                const goalY = -(window.game.config.goalDistance * 10);
                let playerY = null;
                if (player) {
                    if (typeof player.getPosition === 'function') {
                        playerY = player.getPosition().y;
                    } else if (typeof player.y === 'number') {
                        playerY = player.y;
                    }
                }
                if (
                    (playerY !== null && Math.abs(playerY - goalY) < 30) ||
                    (Math.abs(distance - window.game.config.goalDistance) <= 1)
                ) {
                    displayDistance = window.game.config.goalDistance;
                }
            }
        }
        this.distanceElement.textContent = displayDistance;
    }
    
    showPreloader() {
        if (this.preloaderElement) {
            this.preloaderElement.style.display = 'flex';
            this.preloaderElement.classList.remove('hidden');
            this.progressBarElement.style.width = '0%';
            this.progressTextElement.textContent = '0%';
            this.progressTextFilledElement.textContent = '0%';
            this.progressTextFilledElement.style.clipPath = 'inset(0 100% 0 0)';
        }
    }
    
    updatePreloader(progress) {
        if (this.progressBarElement && this.progressTextElement && this.progressTextFilledElement) {
            if (this.progressBarElement.style.width !== progress + '%') {
                this.progressBarElement.style.width = progress + '%';
            }
            if (this.progressTextElement.textContent !== progress + '%') {
                this.progressTextElement.textContent = progress + '%';
                this.progressTextFilledElement.textContent = progress + '%';
            }
            this.progressTextElement.style.display = 'block';
            this.progressTextFilledElement.style.display = 'block';
            
            const barContainer = this.progressBarElement.parentElement;
            if (barContainer) {
                if (progress > 0 && progress < 100) {
                    const barRect = barContainer.getBoundingClientRect();
                    const barWidth = barRect.width;
                    const revealWidth = barWidth * (progress / 100);
                    this.progressTextElement.style.position = 'absolute';
                    this.progressTextElement.style.left = '50%';
                    this.progressTextElement.style.top = '50%';
                    this.progressTextElement.style.transform = 'translate(-50%, -50%)';
                    this.progressTextFilledElement.style.position = 'absolute';
                    this.progressTextFilledElement.style.left = '50%';
                    this.progressTextFilledElement.style.top = '50%';
                    this.progressTextFilledElement.style.transform = 'translate(-50%, -50%)';
                    this.progressTextFilledElement.style.width = '';
                    this.progressTextFilledElement.style.overflow = '';
                    this.progressTextFilledElement.style.zIndex = '2';
                    const textRect = this.progressTextElement.getBoundingClientRect();
                    const textWidth = textRect.width;
                    const barRectLeft = barContainer.getBoundingClientRect().left;
                    const textLeft = textRect.left - barRectLeft;
                    let split = 0;
                    if (revealWidth > textLeft) {
                        split = Math.min(textWidth, revealWidth - textLeft);
                    }
                    this.progressTextFilledElement.style.clipPath = `inset(0 ${textWidth - split}px 0 0)`;
                } else {
                    this.progressTextFilledElement.style.clipPath = '';
                }
            }
        }
    }
    
    simulateLoading() {
        let progress = 0;
        let lastProgress = -1;
        this.loadingInterval = setInterval(() => {
            progress += 5;
            if (progress <= 90 && progress !== lastProgress) {
                this.updatePreloader(progress);
                lastProgress = progress;
            }
        }, 250);
        return this.loadingInterval;
    }
    
    hidePreloader() {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }

        if (this.preloaderElement) {
            this.updatePreloader(100);
            setTimeout(() => {
                this.preloaderElement.classList.add('hidden');
                if (this.pauseButton) this.pauseButton.style.display = 'block';
                if (this.gameInfoElement) this.gameInfoElement.style.display = 'block';
                if (game && game.audioManager) {
                    game.audioManager.playJingle();
                }
            }, 300);
        }
    }
    
    showRestartSpinner() {
        this.spinnerElement.style.display = 'block';
        this.spinnerRotation = 0;
        this.spinnerStartTime = performance.now();
        
        this.spinnerElement.style.marginLeft = '-20px';
        this.spinnerElement.style.marginTop = '-20px';
        
        const animate = () => {
            const elapsed = performance.now() - this.spinnerStartTime;
            this.spinnerRotation = (elapsed * 0.36) % 360;
            this.spinnerElement.style.transform = `rotate(${this.spinnerRotation}deg)`;
            this.spinnerAnimationId = requestAnimationFrame(animate);
        };
        
        this.spinnerAnimationId = requestAnimationFrame(animate);
    }
    
    hideRestartSpinner() {
        if (this.spinnerAnimationId) {
            cancelAnimationFrame(this.spinnerAnimationId);
            this.spinnerAnimationId = null;
        }
        if (this.spinnerInterval) {
            clearInterval(this.spinnerInterval);
            this.spinnerInterval = null;
        }
        this.spinnerElement.style.display = 'none';
        this.spinnerRotation = 0;
    }
    
    showGameOver(score, won = false) {
        if (this.gameInfoElement) this.gameInfoElement.style.display = 'none';
        
        if (won) {
            this.gameOverTitleElement.textContent = 'WIN';
            this.gameOverMessageElement.textContent = 'You made it to the spawning grounds!';
            this.gameOverBackdropElement.classList.add('win');
        } else {
            this.gameOverTitleElement.textContent = 'LOSE';
            this.gameOverMessageElement.textContent = 'The journey was too dangerous...';
            this.gameOverBackdropElement.classList.remove('win');
        }
        this.finalDistanceElement.textContent = score;
        this.gameOverBackdropElement.style.display = 'block';
        this.gameOverElement.style.display = 'block';
    }
    
    hideGameOver() {
        this.gameOverElement.style.display = 'none';
        this.gameOverBackdropElement.style.display = 'none';
        this.gameOverBackdropElement.classList.remove('win');
    }

    setScore(score) {
        if (this.scoreElement) this.scoreElement.textContent = score;
    }

    setHealth(health) {
        if (this.healthElement) this.healthElement.textContent = health;
    }

    showWin() {
        if (this.winOverlay) this.winOverlay.style.display = 'block';
    }

    hideWin() {
        if (this.winOverlay) this.winOverlay.style.display = 'none';
    }

    showLose() {
        if (this.loseOverlay) this.loseOverlay.style.display = 'block';
    }

    hideLose() {
        if (this.loseOverlay) this.loseOverlay.style.display = 'none';
    }

    showPause() {
        if (this.pauseOverlay) this.pauseOverlay.style.display = 'block';
    }

    hidePause() {
        if (this.pauseOverlay) this.pauseOverlay.style.display = 'none';
    }
}
