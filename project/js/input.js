// 
// InputManager class (migrated from InputManager.js)
window.InputManager = class InputManager {
    constructor() {
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
    }

    getPlayerScreenX() {
        const game = window.game;
        if (!game || !game.player || !game.camera) return game && game.player ? game.player.x : 0;
        if (typeof game.camera.worldToScreen === 'function') {
            return game.camera.worldToScreen(game.player.x, game.player.y).x;
        }
        const worldX = game.player.x;
        const cameraX = game.camera.x || (game.config.width / 2);
        const screenX = (worldX - cameraX) + (game.config.width / 2);
        return screenX;
    }

    setup() {
        const self = this;
        // Prevent Tab from changing browser focus at capture phase only
        window.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true); // capture phase

        // Toggle debug mode on Tab keydown in bubbling phase (ensures it runs after all other handlers)
        window.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                if (window.game && window.game.gameState) {
                    window.game.gameState.debugMode = !window.game.gameState.debugMode;
                }
                return false;
            }
            self.keys[e.key] = true;
        });

        window.addEventListener('keyup', function(e) {
            self.keys[e.key] = false;
        });
        window.addEventListener('keyup', function(e) {
            self.keys[e.key] = false;
        });
        window.addEventListener('pointerdown', function(e) {
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
            const playerScreenX = self.getPlayerScreenX();
            const deadzone = 20;
            if (x < playerScreenX - deadzone) {
                self.keys['ArrowLeft'] = true;
            } else if (x > playerScreenX + deadzone) {
                self.keys['ArrowRight'] = true;
            }
        });
        window.addEventListener('pointermove', function(e) {
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
        });
        window.addEventListener('pointerup', function(e) {
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
        });
    }
};