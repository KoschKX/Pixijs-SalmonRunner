// ResourceLoader.js
// Handles resource preloading and asset management for the game

window.ResourceLoader = function() {
    this.preloader = null;
    this.preloadedResources = null;
};

window.ResourceLoader.prototype.init = function() {
    if (!window.Preloader) throw new Error('Preloader class is required!');
    this.preloader = new Preloader();
    window.preloader = this.preloader;
};

window.ResourceLoader.prototype.addCoreResources = function() {
    // Add all core resources needed for the game
    this.preloader.add('texture', 'assets/riverbed_B.jpg', 'riverbed_B');
    this.preloader.add('texture', 'assets/riverfoliage.png', 'riverfoliage');
    this.preloader.add('texture', 'assets/bear_walk.png', 'bear_walk');
    this.preloader.add('texture', 'assets/bear_eat.png', 'bear_eat');
    this.preloader.add('texture', 'assets/stones.png', 'stones');
    this.preloader.add('texture', 'assets/bird_glide.png', 'bird_glide');
    this.preloader.add('texture', 'assets/bird_flap.png', 'bird_flap');
    this.preloader.add('spritesheet', 'assets/generated/particlesheet.png', 'particlesheet_png');
    this.preloader.add('spritesheet', 'assets/generated/particlesheet.json', 'particlesheet_json');
    this.preloader.add('spritesheet', 'assets/generated/water_circles.json', 'water_circles');
    this.preloader.add('spritesheet', 'assets/generated/water_circles.png', 'water_circles_png');
    this.preloader.add('json', 'assets/bear_walk_hbox.json', 'bear_walk_hitbox');
    this.preloader.add('json', 'assets/bear_eat_hbox.json', 'bear_eat_hitbox');
    this.preloader.add('json', 'assets/bird_glide_hbox.json', 'bird_glide_hbox');
    this.preloader.add('json', 'assets/bird_flap_hbox.json', 'bird_flap_hbox');
    this.preloader.add('json', 'assets/stones_hbox.json', 'stones_hbox');
    this.preloader.add('audio', 'assets/audio/splash_A.mp3', 'splash_A');
    this.preloader.add('audio', 'assets/audio/splash_B.mp3', 'splash_B');
    this.preloader.add('audio', 'assets/audio/splash_C.mp3', 'splash_C');
    this.preloader.add('audio', 'assets/audio/splash_D.mp3', 'splash_D');
    this.preloader.add('audio', 'assets/audio/splash_E.mp3', 'splash_E');
    this.preloader.add('audio', 'assets/audio/splash_F.mp3', 'splash_F');
    this.preloader.add('audio', 'assets/audio/jingle_A.mp3', 'jingle_A');
    this.preloader.add('audio', 'assets/audio/jingle_B.mp3', 'jingle_B');
    this.preloader.add('audio', 'assets/audio/jingle_C.mp3', 'jingle_C');
    this.preloader.add('audio', 'assets/audio/jingle_D.mp3', 'jingle_D');
    this.preloader.add('audio', 'assets/audio/kiss_A.mp3', 'kiss_A');
};

window.ResourceLoader.prototype.preloadAll = async function() {
    this.preloadedResources = await this.preloader.preloadAll();
    // Ensure particleFrames and waterCircleFrames keys always exist
    if (!this.preloadedResources.particleFrames) this.preloadedResources.particleFrames = {};
    if (!this.preloadedResources.waterCircleFrames) this.preloadedResources.waterCircleFrames = {};
    window.preloadedResources = this.preloadedResources;
    return this.preloadedResources;
};

window.ResourceLoader.prototype.get = function(key) {
    if (!this.preloadedResources) return null;
    return this.preloadedResources[key] || null;
};
