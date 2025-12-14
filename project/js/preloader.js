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
        for (const res of this.resources) {
            const cacheKey = res.name || res.url;
            if (Preloader.cache[cacheKey]) {
                loaded[cacheKey] = Preloader.cache[cacheKey];
                continue;
            }
            let promise;
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
        await Promise.all(this.promises);
        return loaded;
    }
}