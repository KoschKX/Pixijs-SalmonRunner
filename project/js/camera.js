class Camera {
    constructor(worldContainer, config) {
        this.world = worldContainer;
        this.config = config;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.smoothing = 0.15; // Camera follow smoothing (lerp)
    }
    
    // Instantly set camera position
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.updateWorldContainer();
    }
    
    // Set the target position for the camera to follow
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }
    
    // Smoothly update camera position using delta time
    update(delta) {
        // Use delta for frame-rate independent smoothing
        // Pixi delta is 1 at 60fps; scale smoothing accordingly
        const lerp = 1 - Math.pow(1 - this.smoothing, delta || 1);
        this.x += (this.targetX - this.x) * lerp;
        this.y += (this.targetY - this.y) * lerp;
        // Allow sub-pixel movement for smooth scrolling
        this.updateWorldContainer();
    }
    
    // Move the world container to match camera position
    updateWorldContainer() {
        // Camera position is world space
        // Invert world container to create camera effect
        // Center horizontally, place player 2/3 down the screen
        this.world.x = -this.x + this.config.width / 2;
        this.world.y = -this.y + this.config.height * 0.667;
    }
    
    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x + this.config.width / 2,
            y: worldY - this.y + this.config.height * 0.667
        };
    }
    
    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x - this.config.width / 2,
            y: screenY + this.y - this.config.height / 2
        };
    }
    
    // Get current camera position
    getPosition() {
        return { x: this.x, y: this.y };
    }
    
    // Get camera bounds in world space
    getBounds() {
        return {
            left: this.x - this.config.width / 2,
            right: this.x + this.config.width / 2,
            top: this.y - this.config.height / 2,
            bottom: this.y + this.config.height / 2
        };
    }
}
