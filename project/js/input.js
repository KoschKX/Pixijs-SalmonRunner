// input.js
// Handles all keyboard and input events for the game

document.addEventListener('DOMContentLoaded', function () {
  preventKeyScrolling();
});

window.Input = class Input {
    constructor() {
        this.keys = {};
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        // Touch/tap and swipe state
        this.pointerHeld = false; // Is pointer pressed/held
        this.pointerX = null; // Current pointer X while held
        this.swipeStartY = null;
        this.swipeStartX = null;
        this.swipeThreshold = 40; // Minimum px for swipe
        // Bind touch handlers
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
    }

    setup() {
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('pointerdown', this.handlePointerDown);
        window.addEventListener('pointerup', this.handlePointerUp);
        window.addEventListener('pointermove', this.handlePointerMove);
    }

    teardown() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('pointerdown', this.handlePointerDown);
        window.removeEventListener('pointerup', this.handlePointerUp);
        window.removeEventListener('pointermove', this.handlePointerMove);
    }
    // Utility: get fish's screen X (canvas coordinates)
    getPlayerScreenX() {
        const game = window.game;
        if (!game || !game.player || !game.camera) return game && game.player ? game.player.x : 0;
        // Use camera.worldToScreen for accurate conversion
        if (typeof game.camera.worldToScreen === 'function') {
            return game.camera.worldToScreen(game.player.x, game.player.y).x;
        }
        // Fallback: center camera horizontally
        const worldX = game.player.x;
        const cameraX = game.camera.x || (game.config.width / 2);
        const screenX = (worldX - cameraX) + (game.config.width / 2);
        return screenX;
    }

    handlePointerDown(e) {
        // Always clear both keys before setting a new direction
        this.keys['ArrowLeft'] = false;
        this.keys['ArrowRight'] = false;
        // Always use coordinates relative to the canvas
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
        this.swipeStartY = y;
        this.swipeStartX = x;
        this.pointerMoved = false;
        this.pointerHeld = true;
        this.pointerX = x;
        // Set left/right key only if pointer is far enough from fish (deadzone)
        const playerScreenX = this.getPlayerScreenX();
        const deadzone = 20;
        if (x < playerScreenX - deadzone) {
            this.keys['ArrowLeft'] = true;
        } else if (x > playerScreenX + deadzone) {
            this.keys['ArrowRight'] = true;
        }
    }

    handlePointerMove(e) {
        if (!this.pointerHeld) return;
        const canvas = e.target.closest('canvas') || document.getElementById('gameCanvas');
        let rect = canvas ? canvas.getBoundingClientRect() : {left:0,top:0,width:1,height:1};
        // Use changedTouches[0] for touch, pageX/clientX for mouse
        let pointerX, pointerY;
        if (e.changedTouches && e.changedTouches.length > 0) {
            pointerX = e.changedTouches[0].pageX;
            pointerY = e.changedTouches[0].pageY;
        } else {
            pointerX = (typeof e.pageX === 'number') ? e.pageX : e.clientX;
            pointerY = (typeof e.pageY === 'number') ? e.pageY : e.clientY;
        }
        let x = ((pointerX - rect.left) / rect.width) * canvas.width;
        this.pointerX = x;
        this.keys['ArrowLeft'] = false;
        this.keys['ArrowRight'] = false;
        const playerScreenX = this.getPlayerScreenX();
        const deadzone = 20;
        // Only move toward the pointer, and stop at the pointer position
        if (x < playerScreenX - deadzone) {
            this.keys['ArrowLeft'] = true;
        } else if (x > playerScreenX + deadzone) {
            this.keys['ArrowRight'] = true;
        }
        // Prevent moving past the pointer: if fish is left of pointer and moving right, or right of pointer and moving left, stop
        if ((this.keys['ArrowLeft'] && playerScreenX <= x) || (this.keys['ArrowRight'] && playerScreenX >= x)) {
            this.keys['ArrowLeft'] = false;
            this.keys['ArrowRight'] = false;
        }
        // Swipe detection for dash
        let y = ((e.clientY - rect.top) / rect.height) * canvas.height;
        if (this.swipeStartY !== null && (Math.abs(y - this.swipeStartY) > this.swipeThreshold)) {
            this.pointerMoved = true;
        }
    }

    handlePointerUp(e) {
        // Only handle dash swipe up/down, not tap-to-move
        const canvas = e.target.closest('canvas') || document.getElementById('gameCanvas');
        let rect = canvas ? canvas.getBoundingClientRect() : {left:0,top:0,width:1,height:1};
        let pointerX = (typeof e.pageX === 'number') ? e.pageX : e.clientX;
        let pointerY = (typeof e.pageY === 'number') ? e.pageY : e.clientY;
        let x = ((pointerX - rect.left) / rect.width) * canvas.width;
        let y = ((pointerY - rect.top) / rect.height) * canvas.height;
        if (this.swipeStartY !== null && this.pointerMoved) {
            const dy = y - this.swipeStartY;
            const dx = x - this.swipeStartX;
            if (Math.abs(dy) > this.swipeThreshold) {
                let horizontal = null;
                if (Math.abs(dx) > 20) {
                    horizontal = dx > 0 ? 'right' : 'left';
                }
                if (dy < -this.swipeThreshold) {
                    this.keys['swipeUp'] = horizontal || true;
                    this.swipeDistance = Math.sqrt(dx*dx + dy*dy);
                    this.swipeStartX = this.swipeStartX;
                    this.swipeStartY = this.swipeStartY;
                    this.swipeEndX = x;
                    this.swipeEndY = y;
                } else if (dy > this.swipeThreshold) {
                    this.keys['swipeDown'] = horizontal || true;
                    this.swipeDistance = Math.sqrt(dx*dx + dy*dy);
                    this.swipeStartX = this.swipeStartX;
                    this.swipeStartY = this.swipeStartY;
                    this.swipeEndX = x;
                    this.swipeEndY = y;
                }
                this.swipeHorizontal = horizontal;
            }
        }
        this.swipeStartY = null;
        this.swipeStartX = null;
        this.pointerMoved = false;
        this.pointerHeld = false;
        this.pointerX = null;
        this.keys['ArrowLeft'] = false;
        this.keys['ArrowRight'] = false;
    }

    handleKeyDown(e) {
        this.keys[e.key] = true;
        // Toggle debug mode with Tab key
        if (e.key === 'Tab') {
            e.preventDefault();
            if (window.game && window.game.gameState) {
                window.game.gameState.debugMode = !window.game.gameState.debugMode;
                // console.log('[DEBUG] Debug mode:', window.game.gameState.debugMode);
                if (window.game.river && typeof window.game.river.setDebugMode === 'function') {
                    window.game.river.setDebugMode(window.game.gameState.debugMode);
                }
            }
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;
    }

    isKeyDown(key) {
        return !!this.keys[key];
    }
}



function preventKeyScrolling(){
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
    }
  });
}