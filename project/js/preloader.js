class Preloader {
    static cache = {};

    static setupDefaultResources(preloaderInstance) {
        if (!preloaderInstance) return;
        const foamJsonPath = 'assets/generated/foam_splash_particles.json';
        const foamPngPath = 'assets/generated/foam_splash_particles.png';
        preloaderInstance.resources = preloaderInstance.resources.filter(r => r.url !== foamJsonPath && r.url !== foamPngPath);
        preloaderInstance.add('spritesheet', foamJsonPath, 'foam_splash_particles_json');
        preloaderInstance.add('spritesheet', foamPngPath, 'foam_splash_particles_png');
        const waterCirclesJsonPath = 'assets/generated/water_circles.json';
        if (!preloaderInstance.resources.some(r => r.url === waterCirclesJsonPath)) preloaderInstance.add('spritesheet', waterCirclesJsonPath, 'water_circles');
    }
    // NOTE: single `cache` defined below; removed duplicate declaration

    constructor() {
        this.resources = [];
        this.promises = [];
    }

    add(type, url, name = null) {
        this.resources.push({ type, url, name });
    }

    async preloadAll() {
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
        for (const res of this.resources) {
            const cacheKey = res.name || res.url;
            if (Preloader.cache[cacheKey]) {
                loaded[cacheKey] = Preloader.cache[cacheKey];
                continue;
            }
            let promise;
            if (res.type === 'spritesheet') {
                const u = (res.url || '').toLowerCase();
                if (u.endsWith('foam_splash_particles.json') || (res.name && res.name.toLowerCase().includes('foam') && u.endsWith('.json'))) foamSplashJson = res;
                if (u.endsWith('foam_splash_particles.png') || (res.name && res.name.toLowerCase().includes('foam') && u.endsWith('.png'))) foamSplashPng = res;
                if (u.endsWith('water_circles.json') || (res.name && res.name.toLowerCase().includes('water_circles') && u.endsWith('.json'))) waterCirclesJson = res;
                if (u.endsWith('water_circles.png') || (res.name && res.name.toLowerCase().includes('water_circles') && u.endsWith('.png'))) waterCirclesPng = res;

                // For non-special spritesheets, queue loading of json + image so missing files are reported
                if (!foamSplashJson && !foamSplashPng && !waterCirclesJson && !waterCirclesPng) {
                    const isJson = u.endsWith('.json');
                    const jsonUrl = isJson ? res.url : (res.url ? res.url.replace(/\.png$/i, '.json') : null);
                    const pngUrl = isJson ? (res.url ? res.url.replace(/\.json$/i, '.png') : null) : res.url;
                    const key = res.name || res.url;
                    const sprPromise = (async () => {
                        try {
                            if (jsonUrl) {
                                const r = await fetch(jsonUrl);
                                if (!r.ok) {
                                    console.error('[Preloader] Failed to fetch spritesheet JSON', jsonUrl, r.status);
                                    loaded[key + ':json'] = null;
                                    Preloader.cache[key + ':json'] = null;
                                } else {
                                    const j = await r.json();
                                    loaded[key + ':json'] = j;
                                    Preloader.cache[key + ':json'] = j;
                                }
                            }
                        } catch (err) {
                            console.error('[Preloader] Exception fetching spritesheet JSON', jsonUrl, err);
                            loaded[key + ':json'] = null;
                            Preloader.cache[key + ':json'] = null;
                        }
                        try {
                            if (pngUrl) {
                                const t = await PIXI.Assets.load(pngUrl).catch(e => { throw e; });
                                loaded[key + ':png'] = t;
                                Preloader.cache[key + ':png'] = t;
                            }
                        } catch (err) {
                            console.error('[Preloader] Exception loading spritesheet image', pngUrl, err);
                            loaded[key + ':png'] = null;
                            Preloader.cache[key + ':png'] = null;
                        }
                    })();
                    this.promises.push(sprPromise);
                }
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
        if (foamSplashJson && foamSplashPng) {
            try {
                const json = await fetch(foamSplashJson.url).then(r => r.ok ? r.json() : null);
                loaded[foamSplashJson.name || foamSplashJson.url] = json;
                Preloader.cache[foamSplashJson.name || foamSplashJson.url] = json;
                const parentTexture = await PIXI.Assets.load(foamSplashPng.url);
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
                            let w = tex.source?.width;
                            let h = tex.source?.height;
                        } catch (err) {
                            console.error(`[Preloader] Exception creating texture '${key}':`, err, tex);
                        }
                    }
                    const expectedKeys = [
                        ...[0, 1, 2, 3, 4, 6, 8].map(size => `foam_${size}`),
                        ...[2, 4, 6, 8].map(size => `splash_${size}`)
                    ];
                    const missingKeys = expectedKeys.filter(k => !(k in loaded.particleFrames));
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
                            let w = tex.source?.width;
                            let h = tex.source?.height;
                        } catch (err) {
                            console.error(`[Preloader] Error creating water circle texture '${key}':`, err, tex);
                        }
                    }
                    const missingKeys = Object.keys(json.frames).filter(k => !(k in loaded.waterCircleFrames));
                }
            } catch (err) {
                // console.error('[Preloader] Error loading water circles spritesheet:', err);
            }
        }
        await Promise.all(this.promises);
        return loaded;
    }
}

window.Preloader = Preloader;