// SceneManager.js
// Handles adding/removing main scene objects and layers

window.SceneManager = function(app) {
    this.app = app;
    this.world = null;
};

window.SceneManager.prototype.createWorld = function() {
    this.world = new PIXI.Container();
    this.world.sortableChildren = true;
    this.app.stage.addChild(this.world);
    return this.world;
};

window.SceneManager.prototype.addToWorld = function(obj) {
    if (this.world && obj) this.world.addChild(obj);
};

window.SceneManager.prototype.removeFromWorld = function(obj) {
    if (this.world && obj && obj.parent === this.world) this.world.removeChild(obj);
};

window.SceneManager.prototype.clearWorld = function() {
    if (this.world) {
        while (this.world.children.length > 0) {
            const child = this.world.children[0];
            if (child && typeof child.destroy === 'function') child.destroy({children: true});
            this.world.removeChild(child);
        }
    }
};
