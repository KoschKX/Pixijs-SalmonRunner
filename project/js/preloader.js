class Preloader {
    static cache = {};

    constructor() {
        this.resources = [];
        this.promises = [];
    }

    // Add a resource to the list for preloading
    // type: 'texture', 'audio', 'json', etc.
    // url: where the resource is located
    // name: optional, lets you refer to it by a custom name
    add(type, url, name = null) {
        this.resources.push({ type, url, name });
    }

    // Loads all resources in the list, using cache if available
    // Returns an object with loaded resources, keyed by name or url
    async preloadAll() {
            // Make sure foam/splash atlas files are always loaded first
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
        // First, load everything except spritesheets
        for (const res of this.resources) {
            const cacheKey = res.name || res.url;
            if (Preloader.cache[cacheKey]) {
                loaded[cacheKey] = Preloader.cache[cacheKey];
                continue;
            }
            let promise;
            if (res.type === 'spritesheet') {
                // Try to match foam/splash atlas files by name or path
                if (
                    (res.name && res.name.toLowerCase().includes('foam')) &&
                    (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.json'))
                ) foamSplashJson = res;
                if (
                    (res.name && res.name.toLowerCase().includes('foam')) &&
                    (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.png'))
                ) foamSplashPng = res;
                // If no name, check the file name directly
                if (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.json')) foamSplashJson = res;
                if (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.png')) foamSplashPng = res;
                // Look for water circles atlas files
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
            // Load based on resource type
            switch (res.type) {
                case 'texture':
                    // Load an image/texture
                    promise = PIXI.Assets.load(res.url).then(tex => {
                        loaded[cacheKey] = tex;
                        Preloader.cache[cacheKey] = tex;
                    });
                    break;
                case 'audio':
                    // Load an audio file
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
                        // Start loading the audio
                        audio.load();
                    });
                    break;
                case 'json':
                    // Load a JSON file
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
        // If both foam/splash JSON and PNG are found, load the spritesheet
        if (foamSplashJson && foamSplashPng) {
            try {
                // Load the JSON data first
                const json = await fetch(foamSplashJson.url).then(r => r.ok ? r.json() : null);
                loaded[foamSplashJson.name || foamSplashJson.url] = json;
                Preloader.cache[foamSplashJson.name || foamSplashJson.url] = json;
                // Then load the PNG image
                const parentTexture = await PIXI.Assets.load(foamSplashPng.url);
                // Build textures for each frame in the atlas
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
                            // (Optional) You can log texture sizes here for debugging
                            let w = tex.source?.width || tex.baseTexture?.width;
                            let h = tex.source?.height || tex.baseTexture?.height;
                        } catch (err) {
                            console.error(`[Preloader] Exception creating texture '${key}':`, err, tex);
                        }
                    }
                    // See if any expected particle keys are missing
                    const expectedKeys = [
                        ...[0, 1, 2, 3, 4, 6, 8].map(size => `foam_${size}`),
                        ...[2, 4, 6, 8].map(size => `splash_${size}`)
                    ];
                    const missingKeys = expectedKeys.filter(k => !(k in loaded.particleFrames));
                    // (Optional) Log all keys and a sample texture for troubleshooting
                    const keys = Object.keys(loaded.particleFrames);
                    if (keys.length > 0) {
                        const sample = loaded.particleFrames[keys[0]];
                    } else {
                        console.error('[Preloader] No particle frames found after parsing the atlas!');
                    }
                }
            } catch (err) {
                // console.error('[Preloader] Error loading foam/splash spritesheet:', err);
            }
        }
        // If both water circles JSON and PNG are found, load that spritesheet too
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
                            // (Optional) Log texture size if needed
                            let w = tex.source?.width || tex.baseTexture?.width;
                            let h = tex.source?.height || tex.baseTexture?.height;
                        } catch (err) {
                            console.error(`[Preloader] Error creating water circle texture '${key}':`, err, tex);
                        }
                    }
                    // Find any missing water circle keys
                    const missingKeys = Object.keys(json.frames).filter(k => !(k in loaded.waterCircleFrames));
                }
            } catch (err) {
                // console.error('[Preloader] Error loading water circles spritesheet:', err);
            }
        }
        await Promise.all(this.promises);
        // (Optional) You can log loaded atlases and frames here for debugging
        return loaded;
    }
}

window.Preloader = Preloader;