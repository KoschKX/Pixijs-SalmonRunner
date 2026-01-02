class Net {
    constructor() {
        this.container = new PIXI.Container();
        this.velocityY = 1.5 + Math.random();
        this.velocityX = 0;
        this.damage = 40;
        this.hitRadius = 45;
        
        this.createGraphics();
    }
    
    createGraphics() {
        // Draw the net mesh
        const net = new PIXI.Graphics();
        net.setStrokeStyle({ width: 2, color: 0x228b22 });
        
        const gridSize = 15;
        for (let i = 0; i < 5; i++) {
            net.moveTo(i * gridSize, 0);
            net.lineTo(i * gridSize, 60);
        }
        for (let j = 0; j < 5; j++) {
            net.moveTo(0, j * gridSize);
            net.lineTo(60, j * gridSize);
        }
        
        // Add weights to the bottom of the net
        for (let k = 0; k < 4; k++) {
            const weight = new PIXI.Graphics();
            weight.circle(k * 20 + 10, 70, 5).fill(0x696969);
            this.container.addChild(weight);
        }
        
        this.container.addChild(net);
        this.container.label = 'net';
    }
    
    update(screenWidth) {
        this.container.y += this.velocityY;
        this.container.x += this.velocityX;
        
        // Reverse direction if net hits screen edges
        if (this.container.x < 0 || this.container.x > screenWidth) {
            this.velocityX *= -1;
        }
    }
    
    getContainer() {
        return this.container;
    }
    
    getPosition() {
        return {
            x: this.container.x,
            y: this.container.y
        };
    }
    
    setPosition(x, y) {
        this.container.x = x;
        this.container.y = y;
    }
    
    setDebugMode(enabled) {
        if (enabled) {
            if (!this.debugGraphics) {
                this.debugGraphics = new PIXI.Graphics();
                this.container.addChild(this.debugGraphics);
            }
            // Show net collision area for debugging
            this.debugGraphics.clear();
            this.debugGraphics.rect(-this.width / 2, -this.height / 2, this.width, this.height);
            this.debugGraphics.stroke({ width: 2, color: 0x00ffff });
        } else {
            if (this.debugGraphics) {
                this.container.removeChild(this.debugGraphics);
                this.debugGraphics = null;
            }
        }
    }
}
