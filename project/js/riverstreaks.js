class RiverStreaks {
    static FPS = 15; // Animation FPS for river streaks
    static DT = 60 / RiverStreaks.FPS;
    
    constructor(world, config, getRiverPathCallback) {
        this.world = world;
        this.config = config;
        this.getRiverPath = getRiverPathCallback;
        this.streaksContainer = null;
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
        for (let i = 0; i < 8; i++) {
            const streak = new PIXI.Graphics();
            streak.label = `streak${i}`;
            
            // Stagger starting positions with random vertical offset
            // This spreads them out so they don't all start at the same Y
            streak.startY = -this.config.height - (i * 100) - Math.random() * 2000;
            streak.xOffset = (Math.random() - 0.5) * 300; // Offset from river center
            streak.speed = 8 + Math.random() * 8; // Speed: 8-16 pixels per frame
            streak.opacity = 0.2 + Math.random() * 0.4; // Opacity between 0.2 and 0.6
            
            this.streaksContainer.addChild(streak);
        }
    }
    
    update(playerPos) {
        if (!this.streaksContainer) return;
        // Limit update rate to RiverStreaks.FPS
        const now = performance.now();
        if (!this.lastUpdateTime) this.lastUpdateTime = 0;
        if (now - this.lastUpdateTime < 1000 / RiverStreaks.FPS) return;
        const dt = RiverStreaks.DT;
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
            
            // Draw curved streak
            streak.clear();
            const points = 6;
            const streakLength = 150; // Length of each streak segment
            
            // Begin drawing the streak
            const curvePoints = [];
            
            // Collect all points for the curve
            for (let i = 0; i <= points; i++) {
                const t = i / points;
                const y = streak.startY + t * streakLength;
                
                // Get river path from the cache
                const pathData = this.getRiverPath(y);
                const x = this.config.width / 2 + pathData.curve + streak.xOffset;
                
                curvePoints.push({ x, y });
            }
            
            // Use quadratic curves for smooth lines
            if (curvePoints.length > 0) {
                streak.moveTo(curvePoints[0].x, curvePoints[0].y);
                
                for (let i = 1; i < curvePoints.length - 1; i++) {
                    const xc = (curvePoints[i].x + curvePoints[i + 1].x) / 2;
                    const yc = (curvePoints[i].y + curvePoints[i + 1].y) / 2;
                    streak.quadraticCurveTo(curvePoints[i].x, curvePoints[i].y, xc, yc);
                }
                
                // Draw the final segment
                const last = curvePoints[curvePoints.length - 1];
                const secondLast = curvePoints[curvePoints.length - 2];
                streak.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
            }
            
            // Draw the streak with a fading effect
            const fadeAlpha = streak.opacity * 0.75;
            if (fadeAlpha > 0.01) {
                streak.stroke({ 
                    width: 3, 
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
