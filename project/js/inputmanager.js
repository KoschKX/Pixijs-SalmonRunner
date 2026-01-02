window.InputManager = function() {
    this.keys = {};
    this.pointerHeld = false;
    this.pointerX = null;
    this.targetX = null;
    this.swipeStartX = null;
    this.swipeStartY = null;
    this.swipeEndX = null;
    this.swipeEndY = null;
    this.swipeDistance = null;
    this.swipeHorizontal = null;
    this.pointerMoved = false;
};

// Global flag to prevent duplicate event listeners
window.InputManager._globalHandlersRegistered = false;
window.InputManager._globalHandlers = null;

window.InputManager.prototype.getPlayerScreenX = function() {
    const game = window.game;
    if (!game || !game.player || !game.camera) return game && game.player ? game.player.x : 0;
    if (typeof game.camera.worldToScreen === 'function') {
        return game.camera.worldToScreen(game.player.x, game.player.y).x;
    }
    const worldX = game.player.x;
    const cameraX = game.camera.x || (game.config.width / 2);
    const screenX = (worldX - cameraX) + (game.config.width / 2);
    return screenX;
};

window.InputManager.prototype.setup = function() {
    const self = this;
    
    // Remove old handlers if they exist
    if (window.InputManager._globalHandlers) {
        window.removeEventListener('keydown', window.InputManager._globalHandlers.keydown);
        window.removeEventListener('keyup', window.InputManager._globalHandlers.keyup);
        window.removeEventListener('pointerdown', window.InputManager._globalHandlers.pointerdown);
        window.removeEventListener('pointermove', window.InputManager._globalHandlers.pointermove);
        window.removeEventListener('pointerup', window.InputManager._globalHandlers.pointerup);
    }
    
    // Create handler functions
    const keydownHandler = function(e) {
        self.keys[e.key] = true;
        
        if (e.key === 'Tab') {
            e.preventDefault();
            if (window.game && window.game.gameState) {
                window.game.gameState.debugMode = !window.game.gameState.debugMode;
                console.log('[DEBUG] Debug mode:', window.game.gameState.debugMode);
            }
        }
    };
    
    const keyupHandler = function(e) {
        self.keys[e.key] = false;
    };
    
    const pointerdownHandler = function(e) {
        self.keys['ArrowLeft'] = false;
        self.keys['ArrowRight'] = false;
        const canvas = e.target.closest('canvas') || document.getElementById('gameCanvas');
        let rect = canvas ? canvas.getBoundingClientRect() : {left:0,top:0,width:1,height:1};
        let pointerX, pointerY;
        if (e.changedTouches && e.changedTouches.length > 0) {
            pointerX = e.changedTouches[0].pageX;
            pointerY = e.changedTouches[0].pageY;
        } else {
            pointerX = (typeof e.pageX === 'number') ? e.pageX : e.clientX;
            pointerY = (typeof e.pageY === 'number') ? e.pageY : e.clientY;
        }
        let x = ((pointerX - rect.left) / rect.width) * canvas.width;
        let y = ((pointerY - rect.top) / rect.height) * canvas.height;
        self.swipeStartY = y;
        self.swipeStartX = x;
        self.pointerMoved = false;
        self.pointerHeld = true;
        self.pointerX = x;
        // Deadzone logic
        const playerScreenX = self.getPlayerScreenX();
        const deadzone = 20;
        if (x < playerScreenX - deadzone) {
            self.keys['ArrowLeft'] = true;
        } else if (x > playerScreenX + deadzone) {
            self.keys['ArrowRight'] = true;
        }
    };
    
    const pointermoveHandler = function(e) {
        if (!self.pointerHeld) return;
        const canvas = e.target.closest('canvas') || document.getElementById('gameCanvas');
        let rect = canvas ? canvas.getBoundingClientRect() : {left:0,top:0,width:1,height:1};
        let pointerX, pointerY;
        if (e.changedTouches && e.changedTouches.length > 0) {
            pointerX = e.changedTouches[0].pageX;
            pointerY = e.changedTouches[0].pageY;
        } else {
            pointerX = (typeof e.pageX === 'number') ? e.pageX : e.clientX;
            pointerY = (typeof e.pageY === 'number') ? e.pageY : e.clientY;
        }
        let x = ((pointerX - rect.left) / rect.width) * canvas.width;
        self.pointerX = x;
        self.keys['ArrowLeft'] = false;
        self.keys['ArrowRight'] = false;
        const playerScreenX = self.getPlayerScreenX();
        const deadzone = 20;
        if (x < playerScreenX - deadzone) {
            self.keys['ArrowLeft'] = true;
        } else if (x > playerScreenX + deadzone) {
            self.keys['ArrowRight'] = true;
        }
        if ((self.keys['ArrowLeft'] && playerScreenX <= x) || (self.keys['ArrowRight'] && playerScreenX >= x)) {
            self.keys['ArrowLeft'] = false;
            self.keys['ArrowRight'] = false;
        }
        let y = ((pointerY - rect.top) / rect.height) * canvas.height;
        if (self.swipeStartY !== null && (Math.abs(y - self.swipeStartY) > 40)) {
            self.pointerMoved = true;
        }
    };
    
    const pointerupHandler = function(e) {
        const canvas = e.target.closest('canvas') || document.getElementById('gameCanvas');
        let rect = canvas ? canvas.getBoundingClientRect() : {left:0,top:0,width:1,height:1};
        let pointerX = (typeof e.pageX === 'number') ? e.pageX : e.clientX;
        let pointerY = (typeof e.pageY === 'number') ? e.pageY : e.clientY;
        let x = ((pointerX - rect.left) / rect.width) * canvas.width;
        let y = ((pointerY - rect.top) / rect.height) * canvas.height;
        if (self.swipeStartY !== null && self.pointerMoved) {
            const dy = y - self.swipeStartY;
            const dx = x - self.swipeStartX;
            if (Math.abs(dy) > 40) {
                let horizontal = null;
                if (Math.abs(dx) > 20) {
                    horizontal = dx > 0 ? 'right' : 'left';
                }
                if (dy < -40) {
                    self.keys['swipeUp'] = horizontal || true;
                    self.swipeDistance = Math.sqrt(dx*dx + dy*dy);
                    self.swipeStartX = self.swipeStartX;
                    self.swipeStartY = self.swipeStartY;
                    self.swipeEndX = x;
                    self.swipeEndY = y;
                } else if (dy > 40) {
                    self.keys['swipeDown'] = horizontal || true;
                    self.swipeDistance = Math.sqrt(dx*dx + dy*dy);
                    self.swipeStartX = self.swipeStartX;
                    self.swipeStartY = self.swipeStartY;
                    self.swipeEndX = x;
                    self.swipeEndY = y;
                }
                self.swipeHorizontal = horizontal;
            }
        }
        self.swipeStartY = null;
        self.swipeStartX = null;
        self.pointerMoved = false;
        self.pointerHeld = false;
        self.pointerX = null;
        self.keys['ArrowLeft'] = false;
        self.keys['ArrowRight'] = false;
    };
    
    // Store handlers globally so they can be removed later
    window.InputManager._globalHandlers = {
        keydown: keydownHandler,
        keyup: keyupHandler,
        pointerdown: pointerdownHandler,
        pointermove: pointermoveHandler,
        pointerup: pointerupHandler
    };
    
    // Add event listeners
    window.addEventListener('keydown', keydownHandler);
    window.addEventListener('keyup', keyupHandler);
    window.addEventListener('pointerdown', pointerdownHandler);
    window.addEventListener('pointermove', pointermoveHandler);
    window.addEventListener('pointerup', pointerupHandler);
};
