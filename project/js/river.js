class River {
    constructor(world, config, renderer) {
        this.world = world;
        this.config = config;
        this.renderer = renderer;
        this.riverBanks = [];
        this.waterfalls = [];
        this.riverIslands = [];
        this.riverStreaks = null;
        this.bounceLockoutTimeout = null;
        this.cachedBankTextures = {
            left: [],
            right: []
        };
        this.bankTextureVariations = 8;
        this.textureRandomSeeds = [];
        this.init();
    }
    
    init() {
        this.createWaterBackground();
        this.pregenerateBankTextures();
        this.createWaterfalls();
        
        const bankContainer = new PIXI.Container();
        bankContainer.label = 'riverBanks';
        bankContainer.zIndex = 10;
        this.world.addChild(bankContainer);
        
        const debugBorderContainer = new PIXI.Container();
        debugBorderContainer.label = 'debugBorders';
        debugBorderContainer.zIndex = 100;
        debugBorderContainer.visible = false;
        this.world.addChild(debugBorderContainer);
        this.world.sortableChildren = true;
        
        // Add curved debug border lines
        const leftBorderLine = new PIXI.Graphics();
        leftBorderLine.label = 'leftBorderCurve';
        debugBorderContainer.addChild(leftBorderLine);
        
        const rightBorderLine = new PIXI.Graphics();
        rightBorderLine.label = 'rightBorderCurve';
        debugBorderContainer.addChild(rightBorderLine);
        
        for (let i = -200; i < 200; i++) {
            const curve1 = Math.sin(i * this.config.bankCurveSpeed) * 80;
            const curve2 = Math.sin(i * this.config.bankCurveSpeed * 2.3) * 30;
            const curve3 = Math.sin(i * this.config.bankCurveSpeed * 0.5) * 50;
            const bump1 = Math.sin(i * 1.7) * 15;
            const bump2 = Math.cos(i * 3.2) * 10;
            const bump3 = Math.sin(i * 0.87) * 20;
            const curveAmount = curve1 + curve2 + curve3 + bump1 + bump2 + bump3;
            
            const widthVariation = Math.sin(i * 0.1) * 50 + 450;
            
            const segment = {
                y: i * 50,
                leftCurve: curveAmount,
                rightCurve: curveAmount,
                minGap: widthVariation
            };
            this.riverBanks.push(segment);
            
            const leftBank = this.createBankSegment(true);
            leftBank.y = segment.y;
            leftBank.x = this.config.width / 2 - segment.minGap / 2 + segment.leftCurve;
            bankContainer.addChild(leftBank);
            segment.leftBank = leftBank;
            
            const rightBank = this.createBankSegment(false);
            rightBank.y = segment.y;
            rightBank.x = this.config.width / 2 + segment.minGap / 2 + segment.rightCurve;
            bankContainer.addChild(rightBank);
            segment.rightBank = rightBank;
        }
        
        // Track segment indices for dynamic loading
        this.highestSegmentIndex = 199;
        this.lowestSegmentIndex = -200;
        
        // Pre-calculate river path for fast lookups
        this.buildRiverPathCache();
        
        // Add river streaks (after path cache is ready)
        this.riverStreaks = new RiverStreaks(this.world, this.config, this.getRiverPathAtY.bind(this));
        
        // Only clean up occasionally for performance
        this.lastCleanupSegment = 0;
        this.cleanupInterval = 50; // Clean up every 50 segments
        
        // Draw debug border curves (if enabled)
        this.updateDebugBorderCurves();
    }

    // Add new river segments as player moves
    extendSegments(playerY) {
        const bankContainer = this.world.getChildByLabel('riverBanks');
        const debugBorderContainer = this.world.getChildByLabel('debugBorders');
        if (!bankContainer || !debugBorderContainer) return;
        
        const segmentHeight = 50;
        const currentSegment = Math.floor(playerY / segmentHeight);
        const visibleRange = 20;
        
        // Add segments ahead of player
        const targetLow = currentSegment - visibleRange;
        if (targetLow < this.lowestSegmentIndex) {
            for (let i = this.lowestSegmentIndex - 1; i >= targetLow; i--) {
                this.createSegment(i, bankContainer, debugBorderContainer);
            }
            this.lowestSegmentIndex = targetLow;
            this.updateDebugBorderCurves();
        }
        
        // Add segments behind player
        const targetHigh = currentSegment + visibleRange;
        if (targetHigh > this.highestSegmentIndex) {
            for (let i = this.highestSegmentIndex + 1; i <= targetHigh; i++) {
                this.createSegment(i, bankContainer, debugBorderContainer);
            }
            this.highestSegmentIndex = targetHigh;
            this.updateDebugBorderCurves();
        }
        
        // Remove segments that are far away (to save memory)
        // Only do this sometimes to avoid lag
        if (Math.abs(currentSegment - this.lastCleanupSegment) >= this.cleanupInterval) {
            this.lastCleanupSegment = currentSegment;
            this.riverBanks = this.riverBanks.filter(segment => {
                const segmentIndex = segment.y / segmentHeight;
                const tooFar = Math.abs(segmentIndex - currentSegment) > visibleRange * 2.5;
                if (tooFar) {
                    if (segment.leftBank) bankContainer.removeChild(segment.leftBank);
                    if (segment.rightBank) bankContainer.removeChild(segment.rightBank);
                    return false;
                }
                return true;
            });
            
            // Redraw debug curves after cleanup
            this.updateDebugBorderCurves();
        }
    }
    
    createSegment(i, bankContainer, debugBorderContainer) {
        // Use same curve logic as in init
        const curve1 = Math.sin(i * this.config.bankCurveSpeed) * 80;
        const curve2 = Math.sin(i * this.config.bankCurveSpeed * 2.3) * 30;
        const curve3 = Math.sin(i * this.config.bankCurveSpeed * 0.5) * 50;
        const bump1 = Math.sin(i * 1.7) * 15;
        const bump2 = Math.cos(i * 3.2) * 10;
        const bump3 = Math.sin(i * 0.87) * 20;
        const curveAmount = curve1 + curve2 + curve3 + bump1 + bump2 + bump3;
        
        const widthVariation = Math.sin(i * 0.1) * 50 + 450;
        
        const segment = {
            y: i * 50,
            leftCurve: curveAmount,
            rightCurve: curveAmount,
            minGap: widthVariation
        };
        
        // Add left bank
        const leftBank = this.createBankSegment(true);
        leftBank.y = segment.y;
        leftBank.x = this.config.width / 2 - segment.minGap / 2 + segment.leftCurve;
        bankContainer.addChild(leftBank);
        segment.leftBank = leftBank;
        
        // Add right bank
        const rightBank = this.createBankSegment(false);
        rightBank.y = segment.y;
        rightBank.x = this.config.width / 2 + segment.minGap / 2 + segment.rightCurve;
        bankContainer.addChild(rightBank);
        segment.rightBank = rightBank;
        
        // Add debug border lines
        const leftBorderLine = new PIXI.Graphics();
        leftBorderLine.setStrokeStyle({ width: 3, color: 0xff0000, alpha: 1 });
        leftBorderLine.moveTo(0, 0);
        leftBorderLine.lineTo(0, 50);
        leftBorderLine.stroke();
        leftBorderLine.y = segment.y;
        leftBorderLine.x = this.config.width / 2 - segment.minGap / 2 + segment.leftCurve;
        debugBorderContainer.addChild(leftBorderLine);
        segment.leftBorderLine = leftBorderLine;
        
        const rightBorderLine = new PIXI.Graphics();
        rightBorderLine.setStrokeStyle({ width: 3, color: 0xff0000, alpha: 1 });
        rightBorderLine.moveTo(0, 0);
        rightBorderLine.lineTo(0, 50);
        rightBorderLine.stroke();
        rightBorderLine.y = segment.y;
        rightBorderLine.x = this.config.width / 2 + segment.minGap / 2 + segment.rightCurve;
        debugBorderContainer.addChild(rightBorderLine);
        segment.rightBorderLine = rightBorderLine;
        
        this.riverBanks.push(segment);
    }
    
    createWaterBackground() {
        const waterLayer1 = new PIXI.Container();
        const waterLayer2 = new PIXI.Container();
        const waterOverlay = new PIXI.Container();
        
        waterLayer1.label = 'waterLayer1';
        waterLayer2.label = 'waterLayer2';
        waterOverlay.label = 'waterOverlay';
        
        this.world.addChild(waterLayer1);
        this.world.addChild(waterLayer2);
        this.world.addChild(waterOverlay);
        
        // Add riverbed texture background (tiled)
        const riverbedTexture = PIXI.Texture.from('assets/riverbed_B.jpg');
        
        // Big tiling sprite to cover the whole level
        const tilingSprite = new PIXI.TilingSprite({
            texture: riverbedTexture,
            width: this.config.width * 2.5, // Extra wide to cover curved banks
            height: 30000 // Reduced from 100000 for better performance
        });
        
        tilingSprite.tileScale.set(256 / riverbedTexture.source.width, 256 / riverbedTexture.source.height);
        tilingSprite.x = -this.config.width * 0.75;
        tilingSprite.y = -15000;
        
        waterLayer1.addChild(tilingSprite);
        
        // Make a canvas for a vertical wave displacement map
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Draw a pattern for water flow (horizontal distortion)
        for (let x = 0; x < canvas.width; x++) {
            for (let y = 0; y < canvas.height; y++) {
                // Strong horizontal displacement for left-right water flow
                const flowX = Math.sin(y * 0.05) * 20;
                // Subtle vertical movement
                const flowY = Math.cos(x * 0.13 + y * 0.22) * 20;
                // Combine for RGB channels (x/y displacement)
                ctx.fillStyle = `rgb(${flowX + 128}, ${flowY + 128}, 128)`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
        
        const displacementTexture = PIXI.Texture.from(canvas);
        displacementTexture.source.addressMode = 'repeat';
        
        const displacementSprite = new PIXI.Sprite(displacementTexture);
        displacementSprite.scale.set(1);
        waterLayer1.addChild(displacementSprite);
        
        // Lower scale on mobile to improve performance
        const filterScale = (window.game && window.game.mobileMode) ? 10 : 15;
        const displacementFilter = new PIXI.DisplacementFilter({ sprite: displacementSprite, scale: filterScale });
        
        tilingSprite.filters = [displacementFilter];
        tilingSprite.displacementSprite = displacementSprite;
        
        // Add fish wake effect (drawn dynamically)
        const wakeGraphics = new PIXI.Graphics();
        wakeGraphics.label = 'fishWakeGraphics';
        waterLayer1.addChild(wakeGraphics);
        
        // Placeholder for river streaks (set up after path cache)
        
        const blueWaterOverlay = new PIXI.Graphics();
        blueWaterOverlay.rect(-this.config.width * 0.75, -15000, this.config.width * 2.5, 30000);
        blueWaterOverlay.fill({ color: 0x0066cc, alpha: 0.4 });
        
        waterOverlay.addChild(blueWaterOverlay);
    }
    
    pregenerateBankTextures() {
        // Pre-generate 8 texture variations for both banks
        // Ensures createBankSegment() always uses cache
        for (let i = 0; i < this.bankTextureVariations; i++) {
            this.generateBankTexture(true);  // Left bank
            this.generateBankTexture(false); // Right bank
        }
        // console.log(`Bank texture cache ready: ${this.cachedBankTextures.left.length} left, ${this.cachedBankTextures.right.length} right`);
    }
    
    buildRiverPathCache() {
        // Pre-calculate X positions for left/right boundaries at every Y
        // No sorting/searching needed during rendering
        this.riverPathCache = {};
        
        for (const segment of this.riverBanks) {
            const y = segment.y;
            const leftX = this.config.width / 2 - segment.minGap / 2 + segment.leftCurve;
            const rightX = this.config.width / 2 + segment.minGap / 2 + segment.rightCurve;
            
            this.riverPathCache[y] = {
                left: leftX,
                right: rightX,
                curve: segment.leftCurve,
                width: segment.minGap
            };
        }
    }
    
    getRiverPathAtY(y) {
        // Find the two nearest segment Y positions for interpolation
        const segmentY1 = Math.floor(y / 50) * 50;
        const segmentY2 = segmentY1 + 50;
        
        // Get cached path data for both segments
        const pathData1 = this.riverPathCache[segmentY1];
        const pathData2 = this.riverPathCache[segmentY2];
        
        // If both segments exist, interpolate between them
        if (pathData1 && pathData2) {
            const t = (y - segmentY1) / 50;
            return {
                left: pathData1.left + (pathData2.left - pathData1.left) * t,
                right: pathData1.right + (pathData2.right - pathData1.right) * t,
                curve: pathData1.curve + (pathData2.curve - pathData1.curve) * t,
                width: pathData1.width + (pathData2.width - pathData1.width) * t
            };
        }
        
        // If only one exists, use it
        if (pathData1) return pathData1;
        if (pathData2) return pathData2;
        
        // Fallback calculation (shouldn't happen)
        const segmentIndex = Math.floor(y / 50);
        const curve1 = Math.sin(segmentIndex * this.config.bankCurveSpeed) * 80;
        const curve2 = Math.sin(segmentIndex * this.config.bankCurveSpeed * 2.3) * 30;
        const curve3 = Math.sin(segmentIndex * this.config.bankCurveSpeed * 0.5) * 50;
        const bump1 = Math.sin(segmentIndex * 1.7) * 15;
        const bump2 = Math.cos(segmentIndex * 3.2) * 10;
        const bump3 = Math.sin(segmentIndex * 0.87) * 20;
        const curveAmount = curve1 + curve2 + curve3 + bump1 + bump2 + bump3;
        const widthVariation = Math.sin(segmentIndex * 0.1) * 50 + 450;
        
        return {
            left: this.config.width / 2 - widthVariation / 2 + curveAmount,
            right: this.config.width / 2 + widthVariation / 2 + curveAmount,
            curve: curveAmount,
            width: widthVariation
        };
    }
    
    updateDebugBorderCurves() {
        const debugBorderContainer = this.world.getChildByLabel('debugBorders');
        if (!debugBorderContainer || !debugBorderContainer.visible) return; // Only if visible
        
        const leftBorderLine = debugBorderContainer.getChildByLabel('leftBorderCurve');
        const rightBorderLine = debugBorderContainer.getChildByLabel('rightBorderCurve');
        
        if (!leftBorderLine || !rightBorderLine) return;
        
        // Use pre-calculated river path
        const yValues = Object.keys(this.riverPathCache).map(Number).sort((a, b) => a - b);
        
        if (yValues.length === 0) return;
        
        // Redraw left border curve
        leftBorderLine.clear();
        leftBorderLine.setStrokeStyle({ width: 3, color: 0xff0000, alpha: 1 });
        
        // Start at first Y
        const firstY = yValues[0];
        leftBorderLine.moveTo(this.riverPathCache[firstY].left, firstY);
        
        // Draw smooth curve through all Y values
        for (let i = 1; i < yValues.length; i++) {
            const y = yValues[i];
            leftBorderLine.lineTo(this.riverPathCache[y].left, y);
        }
        leftBorderLine.stroke();
        
        // Redraw right border curve
        rightBorderLine.clear();
        rightBorderLine.setStrokeStyle({ width: 3, color: 0xff0000, alpha: 1 });
        
        // Start at first Y
        rightBorderLine.moveTo(this.riverPathCache[firstY].right, firstY);
        
        // Draw smooth curve through all Y values
        for (let i = 1; i < yValues.length; i++) {
            const y = yValues[i];
            rightBorderLine.lineTo(this.riverPathCache[y].right, y);
        }
        rightBorderLine.stroke();
    }
    
    async createRiverIslands() {
        // Add small islands scattered in the river
        
        // Use preloaded stone resources
        for (let i = 0; i < 5; i++) {
            const stone = new Stone();
            const island = stone.getContainer();
            const waveContainer = stone.getWaveContainer();
            // Try positions until one doesn't overlap a waterfall
            let validPosition = false;
            let attempts = 0;
            const maxAttempts = 50;
            while (!validPosition && attempts < maxAttempts) {
                const y = (Math.random() - 0.25) * 10000;
                const x = this.config.width / 2 + (Math.random() - 0.5) * 400;
                stone.setPosition(x, y);
                validPosition = true;
                const minDistance = 400;
                
                for (const waterfallObj of this.waterfalls) {
                    const waterfall = waterfallObj.getContainer();
                    const distance = Math.abs(island.y - waterfall.y);
                    if (distance < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            this.riverIslands.push(stone);
            island.zIndex = 11;
            this.world.addChild(island);
            
            // Add wave container to world with correct zIndex
            waveContainer.zIndex = 3; // Below stones (5) but above water (0)
            waveContainer.x = island.x;
            waveContainer.y = island.y;
            this.world.addChild(waveContainer);
        }
    }
    
    async createIsland() {
        // Deprecated: kept for compatibility
        return null;
    }
    
    createWaterfalls() {
        // Add a few rare waterfalls throughout the river
        const playAreaHeight = 10000;
        
        for (let i = 0; i < 2; i++) {
            const y = -2000 + (i * (playAreaHeight / 5)) + (Math.random() - 0.5) * 400;
            
            // Get river boundaries at this Y
            const boundaries = this.getRiverBoundariesAtY(y);
            
            const waterfallObj = new Waterfall(this.config, boundaries, this.getRiverBoundariesAtY.bind(this));
            waterfallObj.setPosition(this.config.width / 2, y);
            waterfallObj.world = this.world; // Give waterfall access to world for debug box
            
            const container = waterfallObj.getContainer();
            const foam = waterfallObj.getFoam();
            const waveWakes = waterfallObj.getWaveWakes();
            
            // Store the Waterfall instance so we can call its methods
            this.waterfalls.push(waterfallObj);
            this.world.addChild(waveWakes);
            this.world.addChild(container);
            foam.zIndex = 15; // Foam above riverbanks, below debug
            this.world.addChild(foam);
        }
    }
    
    createBankSegment(isLeft) {
        const cacheKey = isLeft ? 'left' : 'right';
        
        // Use cached textures (should be pre-generated)
        if (this.cachedBankTextures[cacheKey].length > 0) {
            const randomIndex = Math.floor(Math.random() * this.cachedBankTextures[cacheKey].length);
            const cachedTexture = this.cachedBankTextures[cacheKey][randomIndex];
            const bankSprite = new PIXI.Sprite(cachedTexture);
            bankSprite.anchor.set(0.5, 0.5);
            bankSprite.x = 0;
            bankSprite.y = 75 - 200; // segmentHeight / 2 - padding
            bankSprite.hitZone = isLeft ? 'left' : 'right';
            return bankSprite;
        }
        
        // Fallback: generate if cache is empty (shouldn't happen)
        console.warn('Bank texture cache empty, generating on demand');
        return this.generateBankTexture(isLeft, true);
    }
    
    generateBankTexture(isLeft, returnSprite = false) {
        const cacheKey = isLeft ? 'left' : 'right';
        
        const segmentHeight = 150;
        const bankWidth = 400;
        
        // Make a temporary container to render sprites
        const tempContainer = new PIXI.Container();
        tempContainer.sortableChildren = true; // Enable z-index sorting
        
        // Generate a unique random seed for this variation
        const variationSeed = Math.random() * 10000;
        
        // Simple seeded random function
        const seededRandom = (seed) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };
        
        let randomCounter = variationSeed;
        
        // Load riverfoliage.png as a spritesheet (9 frames)
        const source = PIXI.Texture.from('assets/riverfoliage.png').source;
        const frameWidth = source.width / 9;
        const frameHeight = source.height;
        
        // Scale to keep visual size with 512px textures
        const textureSizeScale = 256 / frameHeight;
        
        // Make array of textures for 9 frames
        const foliageTextures = [];
        for (let i = 0; i < 9; i++) {
            const rect = new PIXI.Rectangle(i * frameWidth, 0, frameWidth, frameHeight);
            foliageTextures.push(new PIXI.Texture({ source: source, frame: rect }));
        }
        
        // Add small "balls" of plant texture across the bank
        const ballSize = 90;
        const spacing = 28;
        const numClustersX = Math.ceil(bankWidth / spacing) + 3;
        const numClustersY = Math.ceil(segmentHeight / spacing) + 3;
        
        // Add individual sprite clusters (small balls)
        for (let x = 0; x < numClustersX; x++) {
            for (let y = 0; y < numClustersY; y++) {
                randomCounter++;
                // Add position-based variation to break up patterns
                const positionSeed = x * 31 + y * 17 + variationSeed;
                const offsetX = (seededRandom(randomCounter + positionSeed) - 0.5) * spacing * 1.5;
                randomCounter++;
                const offsetY = (seededRandom(randomCounter + positionSeed * 2) - 0.5) * spacing * 1.5;
                
                // Start from different side for left/right
                let baseX = x * spacing;
                if (isLeft) {
                    // For left bank, start from right side (near river)
                    baseX = bankWidth - (x * spacing);
                }
                let posX = baseX + offsetX;
                let posY = y * spacing + offsetY;
                
                posX = Math.max(0, Math.min(bankWidth, posX));
                posY = Math.max(0, Math.min(segmentHeight, posY));
                
                // Distance from river edge
                let distanceFromRiverEdge;
                if (isLeft) {
                    distanceFromRiverEdge = bankWidth - posX;
                } else {
                    distanceFromRiverEdge = posX;
                }
                const distanceRatio = distanceFromRiverEdge / bankWidth;
                
                // Add extra sprites for dark areas near river edge
                const spritesToAdd = distanceRatio < 0.2 ? 2 : 1;
                
                for (let s = 0; s < spritesToAdd; s++) {
                    // For extra sprites, add slight offset
                    let finalPosXAdjusted = posX;
                    let finalPosYAdjusted = posY;
                    if (s > 0) {
                        randomCounter++;
                        finalPosXAdjusted += (seededRandom(randomCounter) - 0.5) * spacing * 0.5;
                        randomCounter++;
                        finalPosYAdjusted += (seededRandom(randomCounter) - 0.5) * spacing * 0.5;
                        finalPosXAdjusted = Math.max(0, Math.min(bankWidth, finalPosXAdjusted));
                        finalPosYAdjusted = Math.max(0, Math.min(segmentHeight, finalPosYAdjusted));
                    }
                    
                    // Recalculate distance for adjusted position
                    let adjustedDistanceRatio = distanceRatio;
                    if (s > 0) {
                        let adjustedDistance;
                        if (isLeft) {
                            adjustedDistance = bankWidth - finalPosXAdjusted;
                        } else {
                            adjustedDistance = finalPosXAdjusted;
                        }
                        adjustedDistanceRatio = adjustedDistance / bankWidth;
                    }
                
                // Transform position for rendering
                let finalPosX = finalPosXAdjusted;
                if (isLeft) {
                    finalPosX = -bankWidth + finalPosXAdjusted;
                }
                
                // Pick frame based on distance
                let frameIndex;
                randomCounter++;
                const frameRandom = seededRandom(randomCounter);
                
                if (adjustedDistanceRatio < 0.2) {
                    // Very close to river - mostly dark frames
                    if (frameRandom < 0.5) frameIndex = 0;
                    else if (frameRandom < 0.8) frameIndex = 1;
                    else frameIndex = 2;
                } else if (adjustedDistanceRatio < 0.4) {
                    // Close to river - mix of dark and mid
                    if (frameRandom < 0.3) frameIndex = 1;
                    else if (frameRandom < 0.5) frameIndex = 2;
                    else if (frameRandom < 0.7) frameIndex = 3;
                    else frameIndex = 4;
                } else if (adjustedDistanceRatio < 0.7) {
                    // Mid range - more variety
                    if (frameRandom < 0.15) frameIndex = 3;
                    else if (frameRandom < 0.3) frameIndex = 4;
                    else if (frameRandom < 0.5) frameIndex = 5;
                    else if (frameRandom < 0.7) frameIndex = 6;
                    else if (frameRandom < 0.85) frameIndex = 7;
                    else frameIndex = 8;
                } else {
                    // Far from river - all frames including lots of lighter ones mixed in
                    if (frameRandom < 0.1) frameIndex = 4;
                    else if (frameRandom < 0.2) frameIndex = 5;
                    else if (frameRandom < 0.4) frameIndex = 6;
                    else if (frameRandom < 0.7) frameIndex = 7;
                    else frameIndex = 8;
                }
                
                const sprite = new PIXI.Sprite(foliageTextures[frameIndex]);
                sprite.anchor.set(0.5, 0.5);
                randomCounter++;
                sprite.rotation = seededRandom(randomCounter) * Math.PI * 2;
                
                // Set zIndex: lighter plants (higher frame) render behind
                sprite.zIndex = frameIndex;
                
                // Scale based on distance, with randomness favoring larger sizes further out
                const minScale = 0.15 + (distanceRatio * 0.33);
                const maxScale = Math.min(1.0, 0.33 + (distanceRatio * 0.66)); // Cap at 1.0
                
                // Use squared random to bias toward larger values
                randomCounter++;
                const randomFactor = Math.pow(seededRandom(randomCounter), 1 - distanceRatio * 0.7);
                const baseScale = minScale + randomFactor * (maxScale - minScale);
                
                // Frame-based scaling: higher frame = more variation
                const frameVariation = (frameIndex / 8); // 0 to 1 based on frame
                randomCounter++;
                const scaleVariation = seededRandom(randomCounter) * 0.66 * frameVariation; // 0 to 0.66 for frame 8
                
                // Lower frames (darker) get a scale boost
                const frameScaleMultiplier = (0.75 + scaleVariation);
                const scale = Math.min(1.0, baseScale * frameScaleMultiplier * (ballSize / 256) * textureSizeScale);
                sprite.scale.set(scale, scale);
                
                const spriteRadius = (256 / 2) * scale;
                if (isLeft) {
                    if (finalPosX + spriteRadius > 20) continue;
                } else {
                    if (finalPosX - spriteRadius < -20) continue;
                }
                
                // Fade out opacity near river edge
                if (adjustedDistanceRatio < 0.25) {
                    // Fade from 0.2 at river edge to 1.0 at distanceRatio 0.25
                    sprite.alpha = 0.2 + (adjustedDistanceRatio / 0.25) * 0.8;
                } else {
                    sprite.alpha = 1.0;
                }
                
                sprite.x = finalPosX;
                sprite.y = finalPosYAdjusted;
                
                tempContainer.addChild(sprite);
                }
            }
        }
        
        // Render all sprites to a single texture
    // Make texture larger to fit sprites extending beyond bounds
        const padding = 200; // Extra padding for large sprites
        const renderTexture = PIXI.RenderTexture.create({
            width: bankWidth * 2 + padding * 2,
            height: segmentHeight + padding * 2
        });
        
        // Offset temp container for correct rendering
        tempContainer.x = bankWidth + padding;
        tempContainer.y = padding;
        
        this.renderer.render({
            container: tempContainer,
            target: renderTexture
        });
        
        // Clean up temp container
        tempContainer.destroy({ children: true, texture: false });
        
        // Cache the texture (always add during pregeneration)
        this.cachedBankTextures[cacheKey].push(renderTexture);
        
        // Return sprite if requested (fallback)
        if (returnSprite) {
            const bankSprite = new PIXI.Sprite(renderTexture);
            bankSprite.anchor.set(0.5, 0.5);
            bankSprite.x = 0;
            bankSprite.y = segmentHeight / 2 - padding;
            bankSprite.hitZone = isLeft ? 'left' : 'right';
            return bankSprite;
        }
    }
    
    updateBanks(playerPos) {
        const bankContainer = this.world.getChildByLabel('riverBanks');
        const debugBorderContainer = this.world.getChildByLabel('debugBorders');
        
        this.updateDebugVisibility();
        
        if (bankContainer) {
            this.riverBanks.forEach((segment, index) => {
                // Banks stay at fixed Y positions (no scrolling)
                // Check if they need recycling based on camera view
                if (segment.y > playerPos.y + this.config.height) {
                    // Move segment far ahead of player
                    const minY = Math.min(...this.riverBanks.map(s => s.y));
                    segment.y = minY - 50;
                    
                    const index = this.riverBanks.indexOf(segment);
                    // Use multiple sine waves for organic curves
                    const curve1 = Math.sin(index * this.config.bankCurveSpeed) * 80;
                    const curve2 = Math.sin(index * this.config.bankCurveSpeed * 2.3) * 30;
                    const curve3 = Math.sin(index * this.config.bankCurveSpeed * 0.5) * 50;
                    // Add high-frequency bumps for natural look
                    const bump1 = Math.sin(index * 1.7) * 15;
                    const bump2 = Math.cos(index * 3.2) * 10;
                    const bump3 = Math.sin(index * 0.87) * 20; // Occasional larger juts
                    const curveAmount = curve1 + curve2 + curve3 + bump1 + bump2 + bump3;
                    
                    const widthVariation = Math.sin(index * 0.15) * 100 + 350;
                    segment.leftCurve = curveAmount;
                    segment.rightCurve = curveAmount;
                    segment.minGap = widthVariation;
                    
                    if (segment.leftBank) {
                        bankContainer.removeChild(segment.leftBank);
                        segment.leftBank = this.createBankSegment(true);
                        segment.leftBank.y = segment.y;
                        segment.leftBank.x = this.config.width / 2 - segment.minGap / 2 + segment.leftCurve;
                        bankContainer.addChild(segment.leftBank);
                    }
                    if (segment.rightBank) {
                        bankContainer.removeChild(segment.rightBank);
                        segment.rightBank = this.createBankSegment(false);
                        segment.rightBank.y = segment.y;
                        segment.rightBank.x = this.config.width / 2 + segment.minGap / 2 + segment.rightCurve;
                        bankContainer.addChild(segment.rightBank);
                    }
                }
            });
            
                    // Only update debug border curves if debug mode is on
            if (debugBorderContainer && debugBorderContainer.visible) {
                this.updateDebugBorderCurves();
            }
        }
    }
    
    updateWaterfalls(playerPos, viewHeight = 600, viewBuffer = 600) {
        const viewTop = playerPos.y - viewHeight / 2 - viewBuffer;
        const viewBottom = playerPos.y + viewHeight / 2 + viewBuffer;
        
        this.waterfalls.forEach((waterfall, index) => {
            const waterfallPos = waterfall.getContainer().y;
            const inView = waterfallPos >= viewTop && waterfallPos <= viewBottom;
            
            // Only update animation if in view
            if (inView) {
                waterfall.update();
            }
            waterfall.recycle(playerPos, index, this.config.height, 800);
        });
    }
    
    updateIslands(playerPos, player, viewHeight = 600, viewBuffer = 600, gameState = null) {
        const viewTop = playerPos.y - viewHeight / 2 - viewBuffer;
        const viewBottom = playerPos.y + viewHeight / 2 + viewBuffer;

        // Access global particles and world from game instance
        const game = window.game || null;
        const particles = game ? game.particles : (this.particles || []);
        const world = game ? game.world : this.world;

        this.riverIslands.forEach(stone => {
            const stonePos = stone.getContainer().y;
            const inView = stonePos >= viewTop && stonePos <= viewBottom;
            // Only update and redraw if in view
            stone.update(inView);
            if (inView) {
               window.particleManager.emitFoamAtStone(stone);
            }
            stone.recycle(playerPos, this.config.height, this.config);
            // Skip stone collision during romantic scene
            if (!gameState || !gameState.romanticSceneActive) {
                stone.checkCollision(player);
            }
        });
    }
    
    checkBankCollision(player, isDashing, gameState = null) {
        const playerPos = player.getPosition();
        const playerY = playerPos.y;
        const playerRadius = 20;
        
        if (this.riverBanks.length === 0) return;
        
        // Use cached river path for fast boundary lookup
        const segmentY1 = Math.floor(playerY / 50) * 50;
        const segmentY2 = segmentY1 + 50;
        
        const pathData1 = this.getRiverPathAtY(segmentY1);
        const pathData2 = this.getRiverPathAtY(segmentY2);
        
        // Linear interpolation between the two segments
        const t = (playerY - segmentY1) / 50;
        
        // Calculate exact boundaries at player Y using cached data
        const leftBoundary = pathData1.left + (pathData2.left - pathData1.left) * t;
        const rightBoundary = pathData1.right + (pathData2.right - pathData1.right) * t;
        
        // Check left boundary collision
        if (playerPos.x - playerRadius < leftBoundary) {
            const overlap = leftBoundary - (playerPos.x - playerRadius);
            playerPos.x += overlap; // Update local position
            player.setPosition(playerPos.x, playerPos.y);
            
            // Dampen horizontal velocity when hitting left wall
            if (gameState && gameState.playerVelocityX < 0) {
                gameState.playerVelocityX *= 0.2;
            }
        }
        
        // Check right boundary collision
        if (playerPos.x + playerRadius > rightBoundary) {
            const overlap = (playerPos.x + playerRadius) - rightBoundary;
            playerPos.x -= overlap; // Update local position
            player.setPosition(playerPos.x, playerPos.y);
            
            // Dampen horizontal velocity when hitting right wall
            if (gameState && gameState.playerVelocityX > 0) {
                gameState.playerVelocityX *= 0.2;
            }
        }
        
        // Check waterfall collision (block unless dashing)
        if (!isDashing) {
            this.waterfalls.forEach(waterfallObj => {
                const waterfall = waterfallObj.getContainer();
                const waterfallBottom = waterfall.y + (waterfall.waterfallHeight || 50);
                const playerTop = playerPos.y - 28;

                // If player is trying to move above the waterfall bottom
                if (playerTop < waterfallBottom && playerPos.y > waterfallBottom - 60) {
                    const targetY = waterfallBottom + 28;
                    // Only push if not already at the correct position (prevent jitter)
                    if (Math.abs(playerPos.y - targetY) > 0.5) {
                        playerPos.y = targetY;
                        player.setPosition(playerPos.x, playerPos.y);
                        // Bounce the fish backwards and lock out movement for a short time
                        if (gameState && !gameState.bounceLockout) {
                            // Easing bounce: start strong, slow down, then pause
                            const bounceStartVel = 9 + Math.random() * 2; // 9-11 px/frame
                            gameState.bounceStartTime = Date.now();
                            gameState.bounceDuration = 600; // ms for ease out
                            gameState.bouncePause = 100; // ms pause after ease (much shorter)
                            gameState.bounceLockout = true;
                            gameState.bounceEasing = true;
                            gameState.bounceVelocityY = bounceStartVel;
                            gameState.bounceVelocityX = 0;
                            gameState.bounceInitialVelocityY = bounceStartVel;
                            if (this.bounceLockoutTimeout) clearTimeout(this.bounceLockoutTimeout);
                            this.bounceLockoutTimeout = setTimeout(() => {
                                // End easing, start pause
                                gameState.bounceEasing = false;
                                gameState.bounceVelocityY = 0;
                                this.bounceLockoutTimeout = setTimeout(() => {
                                    gameState.bounceLockout = false;
                                    gameState.bounceVelocityY = null;
                                    gameState.bounceVelocityX = null;
                                    gameState.bounceStartTime = null;
                                    gameState.bounceDuration = null;
                                    gameState.bouncePause = null;
                                    gameState.bounceInitialVelocityY = null;
                                    this.bounceLockoutTimeout = null;
                                }, gameState.bouncePause);
                            }, gameState.bounceDuration);
                        }
                    }
                }
            });
        }
    }
    
    updateWaterLayers(playerPos, scrollOffset) {
        const waterLayer1 = this.world.getChildByLabel('waterLayer1');
        const waterLayer2 = this.world.getChildByLabel('waterLayer2');
        
        if (waterLayer1) {
            waterLayer1.children.forEach(child => {
                // No tile scrolling needed - camera handles movement
                // Animate displacement sprite for water turbulence (move downstream)
                if (child.displacementSprite) {
                    child.displacementSprite.x += 0;
                    child.displacementSprite.y += 5; // Move downstream faster
                }
            });
        }
        
        if (waterLayer2) {
            // Current lines flow downstream (positive Y)
            waterLayer2.children.forEach(child => {
                child.y += child.speed; // Flow downstream
                // Recycle based on camera view
                if (child.y > playerPos.y + this.config.height) {
                    child.y = playerPos.y - this.config.height - Math.random() * 1000;
                    child.x = Math.random() * this.config.width;
                }
            });
        }
        
        // Update flowing streaks
        if (this.riverStreaks) {
            this.riverStreaks.update(playerPos);
        }
    }
    
    // Enhanced: support options for custom splash (e.g., upward spray)
    createSplash(x, y, options = {}) {
        if (window.particleManager && typeof window.particleManager.emitSplash === 'function') {
            window.particleManager.emitSplash(x, y, options);
        }
    }
    
    reset() {
        // Remove water layers
        const oldWaterLayer1 = this.world.getChildByLabel('waterLayer1');
        const oldWaterLayer2 = this.world.getChildByLabel('waterLayer2');
        const oldWaterOverlay = this.world.getChildByLabel('waterOverlay');
        if (oldWaterLayer1) this.world.removeChild(oldWaterLayer1);
        if (oldWaterLayer2) this.world.removeChild(oldWaterLayer2);
        if (oldWaterOverlay) this.world.removeChild(oldWaterOverlay);
        
        // Remove existing elements
        this.riverBanks = [];
        const oldBankContainer = this.world.getChildByLabel('riverBanks');
        if (oldBankContainer) {
            this.world.removeChild(oldBankContainer);
        }
        
        // Remove debug border container
        const oldDebugBorderContainer = this.world.getChildByLabel('debugBorders');
        if (oldDebugBorderContainer) {
            this.world.removeChild(oldDebugBorderContainer);
        }
        
        this.waterfalls.forEach(wf => {
            this.world.removeChild(wf.getContainer());
            this.world.removeChild(wf.getFoam());
        });
        this.waterfalls = [];
        
        this.riverIslands.forEach(stone => {
            this.world.removeChild(stone.getContainer());
            this.world.removeChild(stone.getWaveContainer());
        });
        this.riverIslands = [];
        
        // Destroy cached bank textures
        this.cachedBankTextures.left.forEach(texture => {
            if (texture && texture.destroy) {
                texture.destroy(false); // Don't destroy base texture, just the render texture
            }
        });
        this.cachedBankTextures.right.forEach(texture => {
            if (texture && texture.destroy) {
                texture.destroy(false); // Don't destroy base texture, just the render texture
            }
        });
        this.cachedBankTextures = {
            left: [],
            right: []
        };
        
        // Clear river path cache
        this.riverPathCache = {};
        
        // Destroy river streaks
        if (this.riverStreaks) {
            this.riverStreaks.destroy();
            this.riverStreaks = null;
        }
        
        // Reset segment tracking
        this.highestSegmentIndex = 199;
        this.lowestSegmentIndex = -200;
        this.lastCleanupSegment = 0;
        
        // Recreate everything
        this.init();
    }
    
    getBanks() {
        return this.riverBanks;
    }
    
    getRiverWidthAtY(y) {
        // Find river segments above/below this Y
        const segmentHeight = 50;
        const segmentIndex = Math.floor(y / segmentHeight);
        
        // Calculate width using sine wave pattern (same as bank generation)
        const widthVariation = Math.sin(segmentIndex * 0.1) * 50 + 450;
        return widthVariation;
    }
    
    getRiverBoundariesAtY(y) {
        // Round to nearest segment boundary for lookup
        const segmentHeight = 50;
        const nearestSegmentY = Math.round(y / segmentHeight) * segmentHeight;
        
        // Find segment at this exact Y (faster than scanning all)
        let segment = null;
        for (let i = 0; i < this.riverBanks.length; i++) {
            if (this.riverBanks[i].y === nearestSegmentY) {
                segment = this.riverBanks[i];
                break;
            }
        }
        
        if (segment) {
            // Use exact values from actual segment
            const leftX = this.config.width / 2 - segment.minGap / 2 + segment.leftCurve;
            const rightX = this.config.width / 2 + segment.minGap / 2 + segment.rightCurve;
            return {
                left: leftX,
                right: rightX,
                width: segment.minGap,
                center: (leftX + rightX) / 2
            };
        }
        
        // Fallback calculation if segment not found
        const segmentIndex = Math.floor(y / segmentHeight);
        const curve1 = Math.sin(segmentIndex * this.config.bankCurveSpeed) * 80;
        const curve2 = Math.sin(segmentIndex * this.config.bankCurveSpeed * 2.3) * 30;
        const curve3 = Math.sin(segmentIndex * this.config.bankCurveSpeed * 0.5) * 50;
        const bump1 = Math.sin(segmentIndex * 1.7) * 15;
        const bump2 = Math.cos(segmentIndex * 3.2) * 10;
        const bump3 = Math.sin(segmentIndex * 0.87) * 20;
        const curveAmount = curve1 + curve2 + curve3 + bump1 + bump2 + bump3;
        const widthVariation = Math.sin(segmentIndex * 0.15) * 100 + 350;
        const leftBoundary = this.config.width / 2 - widthVariation / 2 + curveAmount;
        const rightBoundary = this.config.width / 2 + widthVariation / 2 + curveAmount;
        
        return { left: leftBoundary, right: rightBoundary, width: widthVariation, center: (leftBoundary + rightBoundary) / 2 };
    }
    
    getWakeGraphics() {
        const waterLayer1 = this.world.getChildByLabel('waterLayer1');
        if (waterLayer1) {
            return waterLayer1.getChildByLabel('fishWakeGraphics');
        }
        return null;
    }
    
    updateDebugVisibility() {
        const debugMode = window.game && window.game.gameState && window.game.gameState.debugMode;
        const debugBorderContainer = this.world.getChildByLabel('debugBorders');
        if (debugBorderContainer) {
            debugBorderContainer.visible = debugMode;
        }
    }
}

// Attach static methods after class definition
River.create = function(world, config, renderer) {
    return new River(world, config, renderer);
};
River.updateBanks = function(river, playerPos) {
    river.updateBanks(playerPos);
};
River.updateWaterLayers = function(river, playerPos, scrollOffset) {
    river.updateWaterLayers(playerPos, scrollOffset);
};
River.updateWaterfalls = function(river, playerPos, height, viewBuffer) {
    river.updateWaterfalls(playerPos, height, viewBuffer);
};
River.updateIslands = function(river, playerPos, player, height, viewBuffer, gameState) {
    river.updateIslands(playerPos, player, height, viewBuffer, gameState);
};
River.checkBankCollision = function(river, player, isDashing, gameState) {
    river.checkBankCollision(player, isDashing, gameState);
};
River.createRiverIslands = function(river) {
    return river.createRiverIslands();
};
River.getBanks = function(river) {
    return river.getBanks();
};
River.getWakeGraphics = function(river) {
    return river.getWakeGraphics();
};
River.destroy = function(river) {
    if (river && typeof river.destroy === 'function') river.destroy();
};

// Make River globally available for legacy and current code
if (typeof window !== 'undefined') {
    window.River = River;
}
