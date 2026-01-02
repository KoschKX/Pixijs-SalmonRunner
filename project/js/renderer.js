window.Renderer = function() {
    this.app = null;
};

window.Renderer.prototype.create = async function(options) {
    if (this.app) return this.app;
    this.app = new PIXI.Application();
    await this.app.init({
        canvas: options.canvas,
        width: options.width,
        height: options.height,
        backgroundColor: options.backgroundColor,
        targetFrameRate: options.targetFrameRate || 60,
        clearBeforeRender: true,
        antialias: options.antialias || false,
        resolution: options.resolution || 1,
        autoDensity: true,
        powerPreference: options.powerPreference || 'default',
    });
    this.app.ticker.maxFPS = options.maxFPS || 60;
    return this.app;
};

window.Renderer.prototype.resize = function(width, height) {
    if (this.app && this.app.renderer) {
        this.app.renderer.resize(width, height);
    }
};
