// input.js
// Handles all keyboard and input events for the game
window.Input = class Input {
    constructor() {
        this.keys = {};
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        // Touch/tap and swipe state
        this.targetX = null; // X coordinate to move fish to
        this.pointerHeld = false; // Is pointer pressed/held
        this.pointerX = null; // Current pointer X while held
        this.pointerDirection = null; // 'left' or 'right' while held
        this.virtualKey = null; // 'ArrowLeft' or 'ArrowRight' for mouse/touch
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
        // Always use coordinates relative to the canvas
        const canvas = e.target.closest('canvas') || document.getElementById('gameCanvas');
        let rect = canvas ? canvas.getBoundingClientRect() : {left:0,top:0};
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        this.swipeStartY = y;
        this.swipeStartX = x;
        this.pointerMoved = false;
        this.pointerHeld = true;
        this.pointerX = x;
        // Set direction for hold-to-move and set virtual key
        const playerScreenX = this.getPlayerScreenX();
        if (x < playerScreenX - 5) {
            this.pointerDirection = 'left';
            this.virtualKey = 'ArrowLeft';
            this.keys['ArrowLeft'] = true;
        } else if (x > playerScreenX + 5) {
            this.pointerDirection = 'right';
            this.virtualKey = 'ArrowRight';
            this.keys['ArrowRight'] = true;
        } else {
            this.pointerDirection = null;
            this.virtualKey = null;
        }
    }

    handlePointerMove(e) {
        // Always use coordinates relative to the canvas
        const canvas = e.target.closest('canvas') || document.getElementById('gameCanvas');
        let rect = canvas ? canvas.getBoundingClientRect() : {left:0,top:0};
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        if (this.pointerHeld) {
            this.pointerX = x;
            // Update direction and virtual key if pointer moves past player
            const playerScreenX = this.getPlayerScreenX();
            if (x < playerScreenX - 5) {
                if (this.pointerDirection !== 'left') {
                    this.pointerDirection = 'left';
                    if (this.virtualKey) this.keys[this.virtualKey] = false;
                    this.virtualKey = 'ArrowLeft';
                    this.keys['ArrowLeft'] = true;
                }
            } else if (x > playerScreenX + 5) {
                if (this.pointerDirection !== 'right') {
                    this.pointerDirection = 'right';
                    if (this.virtualKey) this.keys[this.virtualKey] = false;
                    this.virtualKey = 'ArrowRight';
                    this.keys['ArrowRight'] = true;
                }
            } else {
                if (this.virtualKey) this.keys[this.virtualKey] = false;
                this.pointerDirection = null;
                this.virtualKey = null;
            }
        }
        if (this.swipeStartY !== null && (Math.abs(y - this.swipeStartY) > this.swipeThreshold)) {
            this.pointerMoved = true;
        }
    }

    handlePointerUp(e) {
        // Always use coordinates relative to the canvas
        const canvas = e.target.closest('canvas') || document.getElementById('gameCanvas');
        let rect = canvas ? canvas.getBoundingClientRect() : {left:0,top:0};
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        // Tap: minimal movement, treat as tap-to-move
        if (this.swipeStartY !== null && !this.pointerMoved) {
            this.targetX = x;
        }
        // Swipe up/down (may also have horizontal component)
        else if (this.swipeStartY !== null && this.pointerMoved) {
            const dy = y - this.swipeStartY;
            const dx = x - this.swipeStartX;
            // Diagonal swipe: up+left/right
            if (Math.abs(dy) > this.swipeThreshold) {
                let horizontal = null;
                if (Math.abs(dx) > 20) {
                    horizontal = dx > 0 ? 'right' : 'left';
                }
                if (dy < -this.swipeThreshold) {
                    // Swipe up (possibly diagonal)
                    this.keys['swipeUp'] = horizontal || true;
                    this.swipeDistance = Math.sqrt(dx*dx + dy*dy);
                    this.swipeStartX = this.swipeStartX;
                    this.swipeStartY = this.swipeStartY;
                    this.swipeEndX = x;
                    this.swipeEndY = y;
                } else if (dy > this.swipeThreshold) {
                    // Swipe down
                    this.keys['swipeDown'] = horizontal || true;
                    this.swipeDistance = Math.sqrt(dx*dx + dy*dy);
                    this.swipeStartX = this.swipeStartX;
                    this.swipeStartY = this.swipeStartY;
                    this.swipeEndX = x;
                    this.swipeEndY = y;
                }
                this.swipeHorizontal = horizontal; // Store for game.js
            }
        }
        this.swipeStartY = null;
        this.swipeStartX = null;
        this.pointerMoved = false;
        this.pointerHeld = false;
        this.pointerX = null;
        if (this.virtualKey) this.keys[this.virtualKey] = false;
        this.pointerDirection = null;
        this.virtualKey = null;
        // Clear swipeDistance after dash is triggered in game.js
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