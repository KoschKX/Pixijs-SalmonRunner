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
    static cache = {};

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
                if (
                    (res.name && res.name.toLowerCase().includes('foam')) &&
                    (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.json'))
                ) foamSplashJson = res;
                if (
                    (res.name && res.name.toLowerCase().includes('foam')) &&
                    (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.png'))
                ) foamSplashPng = res;
                if (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.json')) foamSplashJson = res;
                if (res.url && res.url.toLowerCase().endsWith('foam_splash_particles.png')) foamSplashPng = res;
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