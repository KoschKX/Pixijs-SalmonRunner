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
        const loaded = {};
        let spritesheetJson = null;
        let spritesheetPng = null;
        // First pass: load all non-spritesheet resources
        for (const res of this.resources) {
            const cacheKey = res.name || res.url;
            if (Preloader.cache[cacheKey]) {
                loaded[cacheKey] = Preloader.cache[cacheKey];
                continue;
            }
            let promise;
            if (res.type === 'spritesheet') {
                // Defer loading until both PNG and JSON are present
                if (res.url.endsWith('.json')) spritesheetJson = res;
                if (res.url.endsWith('.png')) spritesheetPng = res;
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
        // Now load the spritesheet if both JSON and PNG are present
        if (spritesheetJson && spritesheetPng) {
            try {
                // Load JSON first
                const json = await fetch(spritesheetJson.url).then(r => r.ok ? r.json() : null);
                loaded[spritesheetJson.name || spritesheetJson.url] = json;
                Preloader.cache[spritesheetJson.name || spritesheetJson.url] = json;
                // Load PNG
                const parentTexture = await PIXI.Assets.load(spritesheetPng.url);
                // Create textures for each frame
                if (json && json.frames) {
                    loaded.particleFrames = {};
                    for (const [key, frame] of Object.entries(json.frames)) {
                        const f = frame.frame;
                        let tex = null;
                        try {
                            // PixiJS v8+ API: use source, not baseTexture, and pass options object
                            tex = new PIXI.Texture({
                                source: parentTexture.source,
                                frame: new PIXI.Rectangle(f.x, f.y, f.w, f.h)
                            });
                            // Sanity check: force width/height to 20 if frame is 20x20
                            if (f.w === 20 && f.h === 20) {
                                tex.defaultWidth = 20;
                                tex.defaultHeight = 20;
                            }
                            loaded.particleFrames[key] = tex;
                        } catch (err) {
                            // console.error(`[Preloader] Exception creating texture '${key}':`, err, tex);
                        }
                    }
                }
            } catch (err) {
                // console.error('[Preloader] Error loading spritesheet:', err);
            }
        }
        await Promise.all(this.promises);
        return loaded;
    }
}