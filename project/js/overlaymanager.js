if (typeof window.OverlayManager === 'undefined') {
    window.OverlayManager = function() {
        this.activeOverlay = null;
        this.overlayElements = {
            start: document.getElementById('startButton'),
            win: [document.getElementById('gameOverBackdrop'), document.getElementById('gameOver')],
            lose: [document.getElementById('gameOverBackdrop'), document.getElementById('gameOver')],
        };
    };
}

window.OverlayManager.showGameWin = function(game, hud) {
    setTimeout(() => {
        if (hud) hud.showGameOver(game.gameState.distance, true);
        window.overlayManager.showOverlay('win');
        
        // Add keyboard listener for restart
        if (!window.restartOnKeyPress) {
            window.restartOnKeyPress = (e) => {
                if (e.key !== 'Tab') {
                    console.log('[OverlayManager] Key pressed on win screen:', e.key);
                    window.restartGame();
                }
            };
            window.addEventListener('keydown', window.restartOnKeyPress);
            console.log('[OverlayManager] Added keydown listener for win screen');
        }
    }, 2000);
};

window.OverlayManager.showGameLose = function(game, hud) {
    game.gameState.gameOver = true;
    if (game.audioManager) game.audioManager.playJingleB();
    if (hud) hud.showGameOver(game.gameState.distance, false);
    window.overlayManager.showOverlay('lose');
    if (game.particleManager) game.particleManager.clear();
    
    // Add keyboard listener for restart
    if (!window.restartOnKeyPress) {
        window.restartOnKeyPress = (e) => {
            if (e.key !== 'Tab') {
                console.log('[OverlayManager] Key pressed on lose screen:', e.key);
                window.restartGame();
            }
        };
        window.addEventListener('keydown', window.restartOnKeyPress);
        console.log('[OverlayManager] Added keydown listener for lose screen');
    }
};

window.OverlayManager.hideGameOver = function() {
    // Remove keyboard listener
    if (window.restartOnKeyPress) {
        window.removeEventListener('keydown', window.restartOnKeyPress);
        window.restartOnKeyPress = null;
        console.log('[OverlayManager] Removed keydown listener');
    }
    
    window.overlayManager.hideOverlay('win');
    window.overlayManager.hideOverlay('lose');
    const backdrop = document.getElementById('gameOverBackdrop');
    if (backdrop) backdrop.classList.remove('win');
};

window.OverlayManager.showStartOverlay = function() {
    window.overlayManager.showOverlay('start');
    const startBtn = document.getElementById('startButton');
    if (startBtn) {
        startBtn.style.display = 'block';
        startBtn.addEventListener('pointerdown', function(e) {
            e.stopPropagation();
            e.preventDefault();
        });
    }
};

window.OverlayManager.hideStartOverlay = function() {
    window.overlayManager.hideOverlay('start');
};

window.OverlayManager = function() {
    this.activeOverlay = null;
    this.overlayElements = {
        start: document.getElementById('startButton'),
        win: [document.getElementById('gameOverBackdrop'), document.getElementById('gameOver')],
        lose: [document.getElementById('gameOverBackdrop'), document.getElementById('gameOver')],
    };
};

window.OverlayManager.prototype.showOverlay = function(type) {
    this.hideAll();
    const el = this.overlayElements[type];
    if (el) {
        if (Array.isArray(el)) {
            el.forEach(e => { if (e) e.style.display = 'block'; });
        } else {
            el.style.display = 'block';
        }
        this.activeOverlay = type;
        this.blockScroll();
    }
};

window.OverlayManager.prototype.hideOverlay = function(type) {
    const el = this.overlayElements[type];
    if (el) {
        if (Array.isArray(el)) {
            el.forEach(e => { if (e) e.style.display = 'none'; });
        } else {
            el.style.display = 'none';
        }
        if (this.activeOverlay === type) {
            this.activeOverlay = null;
            this.unblockScroll();
        }
    }
};

window.OverlayManager.prototype.hideAll = function() {
    Object.values(this.overlayElements).forEach(el => {
        if (Array.isArray(el)) {
            el.forEach(e => { if (e) e.style.display = 'none'; });
        } else if (el) {
            el.style.display = 'none';
        }
    });
    this.activeOverlay = null;
    this.unblockScroll();
};

window.OverlayManager.prototype.isOverlayVisible = function() {
    return !!this.activeOverlay;
};

window.OverlayManager.prototype.blockScroll = function() {
    document.body.classList.add('noscroll');
    document.documentElement.classList.add('noscroll');
};

window.OverlayManager.prototype.unblockScroll = function() {
    document.body.classList.remove('noscroll');
    document.documentElement.classList.remove('noscroll');
};
