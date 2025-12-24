// Handles the main player update and state logic from game.js
window.Player = window.Player || {};
window.Player.updatePlayerState = function(game, delta) {
    // Extracted from game.js: player update, dash, and state logic
    let playerPos = (game.player && typeof game.player.getPosition === 'function') ? game.player.getPosition() : {x: game.config.width/2, y: 0};
    if (game.camera && game.player) {
        const cameraX = game.config.width / 2;
        game.camera.setTarget(cameraX, playerPos.y);
        game.camera.update(delta.deltaTime);
    }
    game.frameCounter++;
    if (!game.gameState.won) {
        const now = Date.now();
        if (game.gameState.isDashing && game.gameState.dashDirection === 'forward') {
            game.player.isJumping = true;
        } else {
            game.player.isJumping = false;
        }
        if (game.gameState.isDashing) {
            let dashKeyHeld = false;
            if (game.gameState.dashDirection === 'forward') {
                dashKeyHeld = game.input.keys['ArrowUp'] || game.input.keys['w'] || game.input.keys['W'];
            } else if (game.gameState.dashDirection === 'backward') {
                dashKeyHeld = game.input.keys['ArrowDown'] || game.input.keys['s'] || game.input.keys['S'];
            }
            if (!dashKeyHeld && !game.gameState.dashShortened) {
                const nowTime = Date.now();
                const remaining = game.gameState.dashEndTime - nowTime;
                if (remaining > 30) {
                    game.gameState.dashEndTime = nowTime + Math.floor(remaining * 0.4);
                    game.gameState.dashShortened = true;
                }
            }
            if (now >= game.gameState.dashEndTime) {
                game.gameState.isDashing = false;
                game.gameState.dashShortened = false;
                if (game.player) {
                    game.player.isInvincible = false;
                    game.player.invincibilityEndTime = 0;
                }
                if (game.gameState.dashDirection === 'forward' && game.player && game.player.mesh) {
                    game.player.mesh.scale.set(game.player.meshScale);
                }
                if (game.player) {
                    const playerContainer = game.player.getContainer();
                    playerContainer.zIndex = game.originalPlayerZIndex;
                }
                const pos = game.player.getPosition();
                if (game.gameState.dashDirection === 'backward') {
                    if (window.particleManager) {
                        window.particleManager.emitDashUpwardSplash(pos.x, pos.y);
                    }
                } else {
                    if (window.particleManager) {
                        window.particleManager.emitDashSplash(pos.x, pos.y);
                    }
                }
            }
        }
        let targetVelocityX = 0;
        let targetVelocityY = -game.config.scrollSpeed;
        if (game.gameState.bounceLockout) {
            let dashDir = null;
            if ((game.input.keys['ArrowUp'] || game.input.keys['w'] || game.input.keys['W'])) dashDir = 'forward';
            if ((game.input.keys['ArrowDown'] || game.input.keys['s'] || game.input.keys['S'])) dashDir = 'backward';
            const now = Date.now();
            if (dashDir && !game.gameState.isDashing) {
                game.gameState.bounceLockout = false;
                game.gameState.bounceEasing = false;
                game.gameState.bounceVelocityY = null;
                game.gameState.bounceVelocityX = null;
                game.gameState.bounceStartTime = null;
                game.gameState.bounceDuration = null;
                game.gameState.bouncePause = null;
                game.gameState.bounceInitialVelocityY = null;
                if (dashDir === 'forward' && now - game.gameState.lastDashTime >= game.config.dashCooldown) {
                    game.gameState.isDashing = true;
                    game.gameState.dashDirection = 'forward';
                    game.gameState.dashEndTime = now + game.config.dashDuration;
                    game.gameState.lastDashTime = now;
                    if (game.player) {
                        game.player.isInvincible = true;
                        game.player.invincibilityEndTime = 0;
                    }
                    game.playRandomSplash();
                } else if (dashDir === 'backward' && now - game.gameState.lastDashTime >= game.config.backDashCooldown) {
                    game.gameState.isDashing = true;
                    game.gameState.dashDirection = 'backward';
                    game.gameState.dashEndTime = now + game.config.backDashDuration;
                    game.gameState.lastDashTime = now;
                    if (game.player) {
                        game.player.isInvincible = true;
                        game.player.invincibilityEndTime = 0;
                    }
                    game.playRandomSplash();
                }
            } else {
                if (game.gameState.bounceEasing && typeof game.gameState.bounceInitialVelocityY === 'number') {
                    const elapsed = Date.now() - (game.gameState.bounceStartTime || 0);
                    const t = Math.min(1, elapsed / (game.gameState.bounceDuration || 1));
                    game.gameState.bounceVelocityY = game.gameState.bounceInitialVelocityY * Math.pow(1 - t, 2);
                }
                if (typeof game.gameState.bounceVelocityY === 'number') {
                    game.gameState.playerVelocityY = game.gameState.bounceVelocityY;
                }
                if (typeof game.gameState.bounceVelocityX === 'number') {
                    game.gameState.playerVelocityX = game.gameState.bounceVelocityX;
                }
                targetVelocityX = game.gameState.playerVelocityX;
                targetVelocityY = game.gameState.playerVelocityY;
            }
        } else if (!game.gameState.isDashing && !game.gameState.romanticSceneActive) {
            const now = Date.now();
            if ((game.input.keys['ArrowUp'] || game.input.keys['w'] || game.input.keys['W']) && now - game.gameState.lastDashTime >= game.config.dashCooldown) {
                game.gameState.isDashing = true;
                game.gameState.dashDirection = 'forward';
                game.gameState.dashEndTime = now + game.config.dashDuration;
                game.gameState.lastDashTime = now;
                if (game.player) {
                    game.player.isInvincible = true;
                    game.player.invincibilityEndTime = 0;
                }
                game.playRandomSplash();
            } else if ((game.input.keys['ArrowDown'] || game.input.keys['s'] || game.input.keys['S']) && now - game.gameState.lastDashTime >= game.config.backDashCooldown) {
                game.gameState.isDashing = true;
                game.gameState.dashDirection = 'backward';
                game.gameState.dashEndTime = now + game.config.backDashDuration;
                game.gameState.lastDashTime = now;
                if (game.player) {
                    game.player.isInvincible = true;
                    game.player.invincibilityEndTime = 0;
                }
                game.playRandomSplash();
            }
        } else {
            if (game.gameState.isDashing) {
                if (game.gameState.dashDirection === 'forward') {
                    const dashElapsed = (now - (game.gameState.dashEndTime - game.config.dashDuration)) / game.config.dashDuration;
                    let scale = 1;
                    if (dashElapsed < 0.5) {
                        scale = 1 + dashElapsed * 2;
                    } else {
                        scale = 2 - (dashElapsed - 0.5) * 2;
                    }
                    if (game.player && game.player.mesh) {
                        game.player.mesh.scale.set(game.player.meshScale * scale);
                        const playerContainer = game.player.getContainer();
                        if (game.player.isJumping && (game.player.meshScale * scale) > 1.25) {
                            playerContainer.zIndex = 16;
                        } else {
                            playerContainer.zIndex = game.originalPlayerZIndex;
                        }
                    }
                    targetVelocityY = -game.config.dashSpeed;
                } else if (game.gameState.dashDirection === 'backward') {
                    targetVelocityY = game.config.backDashSpeed;
                    if (game.input.keys['ArrowLeft'] || game.input.keys['a'] || game.input.keys['A']) {
                        targetVelocityX = -game.config.playerMaxSpeed * 0.45;
                    } else if (game.input.keys['ArrowRight'] || game.input.keys['d'] || game.input.keys['D']) {
                        targetVelocityX = game.config.playerMaxSpeed * 0.45;
                    } else {
                        targetVelocityX = 0;
                    }
                    var backDashAccel = game.config.playerAcceleration * 1.1;
                    game.gameState.playerVelocityX += (targetVelocityX - game.gameState.playerVelocityX) * backDashAccel * delta.deltaTime;
                }
            } else {
                if (game.gameState.isDashing) {
                    if (game.gameState.dashDirection !== 'backward') {
                        targetVelocityX = 0;
                    }
                } else {
                    if (game.input.keys['ArrowLeft'] || game.input.keys['a'] || game.input.keys['A']) {
                        targetVelocityX = -game.config.playerMaxSpeed;
                        if (!game.gameState.leftKeyPlayedSound) {
                            game.audioManager.playRandomLateralSplash();
                            game.gameState.leftKeyPlayedSound = true;
                        }
                    } else {
                        game.gameState.leftKeyPlayedSound = false;
                    }
                    if (game.input.keys['ArrowRight'] || game.input.keys['d'] || game.input.keys['D']) {
                        targetVelocityX = game.config.playerMaxSpeed;
                        if (!game.gameState.rightKeyPlayedSound) {
                            game.audioManager.playRandomLateralSplash();
                            game.gameState.rightKeyPlayedSound = true;
                        }
                    } else {
                        game.gameState.rightKeyPlayedSound = false;
                    }
                }
            }
        }
        // Acceleration
        if (targetVelocityX !== 0) {
            game.gameState.playerVelocityX += (targetVelocityX - game.gameState.playerVelocityX) * game.config.playerAcceleration * delta.deltaTime;
        } else {
            game.gameState.playerVelocityX *= Math.pow(game.config.playerFriction, delta.deltaTime);
        }
        if (targetVelocityY !== 0) {
            game.gameState.playerVelocityY += (targetVelocityY - game.gameState.playerVelocityY) * game.config.playerAcceleration * delta.deltaTime;
        } else {
            game.gameState.playerVelocityY *= Math.pow(game.config.playerFriction, delta.deltaTime);
        }
        // --- Moderate left/right control during jump ---
        if (game.input.keys['ArrowLeft'] || game.input.keys['a'] || game.input.keys['A']) {
            targetVelocityX = -game.config.playerMaxSpeed * 1.35;
        } else if (game.input.keys['ArrowRight'] || game.input.keys['d'] || game.input.keys['D']) {
            targetVelocityX = game.config.playerMaxSpeed * 1.35;
        } else {
            targetVelocityX = 0;
        }
        var jumpAccel = game.config.playerAcceleration * 1.5;
        game.gameState.playerVelocityX += (targetVelocityX - game.gameState.playerVelocityX) * jumpAccel * delta.deltaTime;
        let newX = playerPos.x + game.gameState.playerVelocityX * delta.deltaTime;
        let newY = playerPos.y + game.gameState.playerVelocityY * delta.deltaTime;
        if (game.input.pointerHeld && typeof game.input.pointerX === 'number') {
            if ((game.gameState.playerVelocityX > 0 && newX > game.input.pointerX && playerPos.x <= game.input.pointerX) ||
                (game.gameState.playerVelocityX < 0 && newX < game.input.pointerX && playerPos.x >= game.input.pointerX)) {
                newX = game.input.pointerX;
                game.gameState.playerVelocityX = 0;
            }
        }
        window.Player.setPosition(game.player, newX, newY);
        if (!(game.input.keys['ArrowLeft'] || game.input.keys['a'] || game.input.keys['A'] || game.input.keys['ArrowRight'] || game.input.keys['d'] || game.input.keys['D']) && Math.abs(game.gameState.playerVelocityX) < 0.2) {
            game.gameState.playerVelocityX = 0;
        }
        playerPos = window.Player.getPosition(game.player);
        window.Player.update(game.player, game.gameState.playerVelocityX, game.gameState.playerVelocityY);
        if (game.player && typeof game.player.updateWake === 'function') game.player.updateWake(game.gameState.scrollOffset);
        return playerPos;
    }
    return playerPos;
};
// PlayerManager.js
// Handles player creation, update, setPosition, getContainer, getHitbox, takeDamage
window.Player.getX = function(player) {
    return player && typeof player.getPosition === 'function' ? player.getPosition().x : (player && player.x !== undefined ? player.x : 0);
};
window.Player.getPosition = function(player) {
    return player && typeof player.getPosition === 'function' ? player.getPosition() : {x:0, y:0};
};
window.Player.setInvincible = function(player, value) {
    if (player) player.isInvincible = value;
};
window.Player.setInvincibilityEndTime = function(player, value) {
    if (player) player.invincibilityEndTime = value;
};
window.Player.create = function(x, y, config) {
    return new Fish(x, y, config);
};
window.Player.update = function(player, velocityX, velocityY) {
    if (player && typeof player.update === 'function') player.update(velocityX, velocityY);
};
window.Player.setPosition = function(player, x, y) {
    if (player && typeof player.setPosition === 'function') player.setPosition(x, y);
};
window.Player.getContainer = function(player) {
    return player && typeof player.getContainer === 'function' ? player.getContainer() : null;
};
window.Player.getHitbox = function(player) {
    return player && typeof player.getHitbox === 'function' ? player.getHitbox() : null;
};
window.Player.takeDamage = function(player, damage, gameState) {
    if (player && typeof player.takeDamage === 'function') player.takeDamage(damage, gameState);
};
window.Player.setWakeGraphics = function(player, wakeGraphics) {
    if (player && typeof player.setWakeGraphics === 'function') player.setWakeGraphics(wakeGraphics);
};
window.Player.destroy = function(player) {
    if (player && typeof player.destroy === 'function') player.destroy();
};
