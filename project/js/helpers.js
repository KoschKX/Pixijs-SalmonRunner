// helpers.js - Utility and helper functions for game.js

// Example: collision check (move more as needed)
export function checkCollision(obj1, obj2, radius) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius;
}

// Add more helpers as you refactor from game.js
