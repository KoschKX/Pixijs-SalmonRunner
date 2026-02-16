class RiverStreaks {
    constructor(world, config, getRiverPathCallback) {
        this.world = world;
        this.config = config;
        this.getRiverPath = getRiverPathCallback;
        this.streaksContainer = null;
        // Use full visual fidelity by default; adaptive mode may still reduce work elsewhere
        this.isAdaptive = (window.game && window.game._adaptiveMode) || false;
        this.fps = 15;
        this.DT = 60 / this.fps;
        this.streakCount = 8;
        this.init();
    }
    
    init() {
        // Create a container for river streaks
        const waterLayer1 = this.world.getChildByLabel('waterLayer1');
        if (!waterLayer1) return;
        
        this.streaksContainer = new PIXI.Container();
        this.streaksContainer.label = 'riverStreaks';
        waterLayer1.addChild(this.streaksContainer);
        
        // Add streaks that follow the river's path
        for (let i = 0; i < this.streakCount; i++) {
            const streak = new PIXI.Graphics();
            streak.label = `streak${i}`;
            
            // Stagger starting positions with random vertical offset
            // This spreads them out so they don't all start at the same Y
            streak.startY = -this.config.height - (i * 100) - Math.random() * 2000;
            streak.xOffset = (Math.random() - 0.5) * 300; // Offset from river center
            streak.speed = this.isAdaptive ? (6 + Math.random() * 6) : (8 + Math.random() * 8);
            streak.opacity = this.isAdaptive ? (0.15 + Math.random() * 0.25) : (0.2 + Math.random() * 0.4);
            
            this.streaksContainer.addChild(streak);
        }
    }
    
    update(playerPos) {
        if (!this.streaksContainer) return;
        // Limit update rate to configured FPS
        const now = performance.now();
        if (!this.lastUpdateTime) this.lastUpdateTime = 0;
        if (now - this.lastUpdateTime < 1000 / this.fps) return;
        const dt = this.DT;
        this.lastUpdateTime = now;
        const viewTop = playerPos.y - this.config.height / 2 - 200;
        const viewBottom = playerPos.y + this.config.height / 2 + 200;
        this.streaksContainer.children.forEach(streak => {
            // Move streaks downstream (positive Y)
            streak.startY += streak.speed * dt;
            
            // Recycle streak if it leaves the bottom of the screen
            if (streak.startY > viewBottom) {
                // Respawn at the top of the visible area with a random offset
                streak.startY = viewTop - 300 - Math.random() * 1000;
                streak.xOffset = (Math.random() - 0.5) * 300;
                streak.speed = 8 + Math.random() * 8; // Randomize speed when recycled
            }
            
            // Only draw streak if it's visible
            const streakBottom = streak.startY + 300;
            if (streakBottom < viewTop || streak.startY > viewBottom) {
                streak.clear(); // Skip drawing if off-screen
                return;
            }
            
            // Draw streak polyline at full fidelity
            streak.clear();
            const points = 6;
            const streakLength = 120;
            const curvePoints = [];
            for (let i = 0; i <= points; i++) {
                const t = i / points;
                const y = streak.startY + t * streakLength;
                const pathData = this.getRiverPath(y);
                const x = this.config.width / 2 + pathData.curve + streak.xOffset;
                curvePoints.push({ x, y });
            }
            if (curvePoints.length > 0) {
                streak.moveTo(curvePoints[0].x, curvePoints[0].y);
                for (let i = 1; i < curvePoints.length; i++) {
                    streak.lineTo(curvePoints[i].x, curvePoints[i].y);
                }
            }
            
            // Draw the streak with a fading effect
            const fadeAlpha = streak.opacity * 0.75;
            if (fadeAlpha > 0.01) {
                streak.stroke({ 
                    width: this.isAdaptive ? 2 : 3, 
                    color: 0xffffff, 
                    alpha: fadeAlpha,
                    cap: 'round',
                    join: 'round'
                });
            }
        });
    }
    
    destroy() {
        if (this.streaksContainer) {
            const waterLayer1 = this.world.getChildByLabel('waterLayer1');
            if (waterLayer1) {
                waterLayer1.removeChild(this.streaksContainer);
            }
            this.streaksContainer.destroy({ children: true });
            this.streaksContainer = null;
        }
    }
}
