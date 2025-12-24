window.GameState = function(initialState) {
    // Assign all properties directly to this
    if (initialState && typeof initialState === 'object') {
        Object.assign(this, initialState);
    }
    this.listeners = [];
};

window.GameState.prototype.setState = function(newState) {
    const prev = Object.assign({}, this);
    Object.assign(this, newState);
    this.listeners.forEach(cb => cb(this, prev));
};

window.GameState.prototype.getState = function() {
    // Return a shallow copy of all properties except listeners
    const copy = {};
    for (const key in this) {
        if (key !== 'listeners' && this.hasOwnProperty(key)) {
            copy[key] = this[key];
        }
    }
    return copy;
};

window.GameState.prototype.onStateChange = function(cb) {
    if (typeof cb === 'function') this.listeners.push(cb);
};
