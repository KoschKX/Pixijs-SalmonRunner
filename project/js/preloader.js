class Preloader {
    static cache = {};

    constructor() {
        this.resources = [];
        this.promises = [];
    }

    // Add a resource to the preload list
    // type: 'texture', 'audio', 'json', etc.
    // url: resource location
    // name: optional reference name
    add(type, url, name = null) {
        this.resources.push({ type, url, name });
    }

    // Preload all resources (with caching)
    // Returns a map of loaded resources by name or url
    async preloadAll() {
            // Guarantee foam/splash atlas files are present in resource list
            const foamJsonPath = 'assets/generated/foam_splash_particles.json';
            const foamPngPath = 'assets/generated/foam_splash_particles.png';
            this.resources = this.resources.filter(r => r.url !== foamJsonPath && r.url !== foamPngPath);
            this.resources.unshift({ type: 'spritesheet', url: foamJsonPath, name: 'foam_splash_particles_json' });
            this.resources.unshift({ type: 'spritesheet', url: foamPngPath, name: 'foam_splash_particles_png' });
        const loaded = {};
        let foamSplashJson = null;
        let foamSplashPng = null;
        let waterCirclesJson = null;
        let waterCirclesPng = null;
        // First pass: load all non-spritesheet resources
        for (const res of this.resources) {
            const cacheKey = res.name || res.url;
            if (Preloader.cache[cacheKey]) {
                loaded[cacheKey] = Preloader.cache[cacheKey];
                continue;
            }
            let promise;
            if (res.type === 'spritesheet') {
                // Robust matching for foam/splash atlas files
                if (
                    (res.name && res.name.toLowerCase().includes('foam')) &&
                    (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.json'))
                ) foamSplashJson = res;
                if (
                    (res.name && res.name.toLowerCase().includes('foam')) &&
                    (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.png'))
                ) foamSplashPng = res;
                // Also match by exact file name if name is missing
                if (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.json')) foamSplashJson = res;
                if (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.png')) foamSplashPng = res;
                // Water circles
                if (
                    (res.name && res.name.toLowerCase().includes('water_circles')) &&
                    (res.url && res.url.toLowerCase().endsWith('water_circles.json'))
                ) waterCirclesJson = res;
                if (
                    (res.name && res.name.toLowerCase().includes('water_circles')) &&
                    (res.url && res.url.toLowerCase().endsWith('water_circles.png'))
                ) waterCirclesPng = res;
                if (res.url && res.url.toLowerCase().endsWith('water_circles.json')) waterCirclesJson = res;
                if (res.url && res.url.toLowerCase().endsWith('water_circles.png')) waterCirclesPng = res;
                continue;
            }
            switch (res.type) {
                case 'texture':
                    promise = PIXI.Assets.load(res.url).then(tex => {
                        loaded[cacheKey] = tex;
                        Preloader.cache[cacheKey] = tex;
                    });
                    break;
                case 'audio':
                    promise = new Promise(resolve => {
                        const audio = new Audio(res.url);
                        audio.preload = 'auto';
                        audio.addEventListener('canplaythrough', () => {
                            loaded[cacheKey] = audio;
                            Preloader.cache[cacheKey] = audio;
                            resolve(audio);
                        }, { once: true });
                        audio.addEventListener('error', () => {
                            loaded[cacheKey] = null;
                            Preloader.cache[cacheKey] = null;
                            resolve(null);
                        }, { once: true });
                        // Begin loading audio
                        audio.load();
                    });
                    break;
                case 'json':
                    promise = fetch(res.url)
                        .then(r => r.ok ? r.json() : null)
                        .then(json => {
                            loaded[cacheKey] = json;
                            Preloader.cache[cacheKey] = json;
                        })
                        .catch(() => {
                            loaded[cacheKey] = null;
                            Preloader.cache[cacheKey] = null;
                        });
                    break;
                default:
                    promise = Promise.resolve();
            }
            this.promises.push(promise);
        }
        // Now load the foam/splash spritesheet if both JSON and PNG are present
        if (foamSplashJson && foamSplashPng) {
            try {
                // Load JSON first
                const json = await fetch(foamSplashJson.url).then(r => r.ok ? r.json() : null);
                loaded[foamSplashJson.name || foamSplashJson.url] = json;
                Preloader.cache[foamSplashJson.name || foamSplashJson.url] = json;
                // Load PNG
                const parentTexture = await PIXI.Assets.load(foamSplashPng.url);
                // Create textures for each frame
                if (json && json.frames) {
                    loaded.particleFrames = {};
                    for (const [key, frame] of Object.entries(json.frames)) {
                        const f = frame.frame;
                        let tex = null;
                        try {
                            tex = new PIXI.Texture({
                                source: parentTexture.source,
                                frame: new PIXI.Rectangle(f.x, f.y, f.w, f.h)
                            });
                            if (f.w === 20 && f.h === 20) {
                                tex.defaultWidth = 20;
                                tex.defaultHeight = 20;
                            }
                            loaded.particleFrames[key] = tex;
                            // Debug: log texture dimensions
                            let w = tex.source?.width || tex.baseTexture?.width;
                            let h = tex.source?.height || tex.baseTexture?.height;
                        } catch (err) {
                            console.error(`[Preloader] Exception creating texture '${key}':`, err, tex);
                        }
                    }
                    // Check for missing expected particle keys
                    const expectedKeys = [
                        ...[0, 1, 2, 3, 4, 6, 8].map(size => `foam_${size}`),
                        ...[2, 4, 6, 8].map(size => `splash_${size}`)
                    ];
                    const missingKeys = expectedKeys.filter(k => !(k in loaded.particleFrames));
                    // Diagnostic: log all keys and sample texture
                    const keys = Object.keys(loaded.particleFrames);
                    if (keys.length > 0) {
                        const sample = loaded.particleFrames[keys[0]];
                    } else {
                        console.error('[Preloader DIAG] particleFrames is EMPTY after parsing atlas!');
                    }
                }
            } catch (err) {
                // console.error('[Preloader] Error loading foam/splash spritesheet:', err);
            }
        }
        // Now load the water circles spritesheet if JSON and PNG are present
        if (waterCirclesJson && waterCirclesPng) {
            try {
                const json = await fetch(waterCirclesJson.url).then(r => r.ok ? r.json() : null);
                loaded[waterCirclesJson.name || waterCirclesJson.url] = json;
                Preloader.cache[waterCirclesJson.name || waterCirclesJson.url] = json;
                const parentTexture = await PIXI.Assets.load(waterCirclesPng.url);
                if (json && json.frames) {
                    loaded.waterCircleFrames = {};
                    for (const [key, frame] of Object.entries(json.frames)) {
                        const f = frame.frame;
                        let tex = null;
                        try {
                            tex = new PIXI.Texture({
                                source: parentTexture.source,
                                frame: new PIXI.Rectangle(f.x, f.y, f.w, f.h)
                            });
                            loaded.waterCircleFrames[key] = tex;
                            let w = tex.source?.width || tex.baseTexture?.width;
                            let h = tex.source?.height || tex.baseTexture?.height;
                        } catch (err) {
                            console.error(`[Preloader] Exception creating water circle texture '${key}':`, err, tex);
                        }
                    }
                    const missingKeys = Object.keys(json.frames).filter(k => !(k in loaded.waterCircleFrames));
                }
            } catch (err) {
                // console.error('[Preloader] Error loading water circles spritesheet:', err);
            }
        }
        await Promise.all(this.promises);
        // Debug: log foam/splash atlas and particleFrames
        if (foamSplashJson && foamSplashPng) {
            const sheetKey = foamSplashJson.name || foamSplashJson.url;
            if (loaded.particleFrames) {
                const firstKey = Object.keys(loaded.particleFrames)[0];
            }
        }
        // Debug: log water circles atlas and waterCircleFrames
        if (waterCirclesJson && waterCirclesPng) {
            const sheetKey = waterCirclesJson.name || waterCirclesJson.url;
            if (loaded.waterCircleFrames) {
                const firstKey = Object.keys(loaded.waterCircleFrames)[0];
            }
        }
        return loaded;
    }
}

window.Preloader = Preloader;