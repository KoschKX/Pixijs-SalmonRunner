// AudioManager.js
// Handles loading, playing, and managing all game audio
class AudioManager {
    constructor() {
        this.sounds = {};
        this.volume = 0.5;
        this.enabled = true;
        this.initialized = false;
    }

    // Load all game audio files
    async loadSounds() {
        // Create audio elements for each sound
        this.sounds.splashSounds = [
            new Audio('assets/audio/splash_A.mp3'),
            new Audio('assets/audio/splash_B.mp3'),
            new Audio('assets/audio/splash_C.mp3')
        ];

        // Lateral movement splash sounds
        this.sounds.lateralSplashSounds = [
            new Audio('assets/audio/splash_D.mp3'),
            new Audio('assets/audio/splash_E.mp3'),
            new Audio('assets/audio/splash_F.mp3')
        ];

        // Main jingle sound
        this.sounds.jingle = new Audio('assets/audio/jingle_A.mp3');
        this.sounds.jingle.volume = this.volume;
        this.sounds.jingle.preload = 'auto';
        
        // Goal jingles and kiss sound
        this.sounds.jingleC = new Audio('assets/audio/jingle_C.mp3');
        this.sounds.jingleC.volume = this.volume;
        this.sounds.jingleC.preload = 'auto';
        
        this.sounds.jingleD = new Audio('assets/audio/jingle_D.mp3');
        this.sounds.jingleD.volume = this.volume;
        this.sounds.jingleD.preload = 'auto';
        
        this.sounds.jingleB = new Audio('assets/audio/jingle_B.mp3');
        this.sounds.jingleB.volume = this.volume;
        this.sounds.jingleB.preload = 'auto';
        
        this.sounds.kiss = new Audio('assets/audio/kiss_A.mp3');
        this.sounds.kiss.volume = this.volume;
        this.sounds.kiss.preload = 'auto';

        // Set volume and preload for dash splashes
        this.sounds.splashSounds.forEach((audio) => {
            audio.volume = this.volume;
            audio.preload = 'auto';
        });

        // Set volume and preload for lateral splashes
        this.sounds.lateralSplashSounds.forEach((audio) => {
            audio.volume = this.volume;
            audio.preload = 'auto';
        });

        this.initialized = true;
    }

    // Set sounds from preloaded resources
    setPreloadedSounds(resources) {
        // Map preloaded resources to sound slots
        this.sounds.splashAudio = resources.splashAudio || null;
        this.sounds.jingleA = resources.jingleA || null;
        this.sounds.jingleB = resources.jingleB || null;
        this.sounds.jingleC = resources.jingleC || null;
        this.sounds.jingleD = resources.jingleD || null;
        this.sounds.kiss = resources.kiss || null;
        // Set volume and preload for each preloaded sound
        Object.values(this.sounds).forEach(audio => {
            if (audio) {
                audio.volume = this.volume;
                audio.preload = 'auto';
            }
        });
    }

    // Create an Audio object with default settings
    createAudio(src) {
        const audio = new Audio(src);
        audio.volume = this.volume;
        audio.preload = 'auto';
        return audio;
    }

    // Play a random splash sound
    playRandomSplash() {
        if (!this.initialized || !this.sounds.splashSounds || this.sounds.splashSounds.length === 0) {
            return;
        }

        const randomIndex = Math.floor(Math.random() * this.sounds.splashSounds.length);
        const sound = this.sounds.splashSounds[randomIndex].cloneNode();
        sound.volume = this.volume;
        
        sound.play().catch(err => {
            // Ignore browser autoplay policy errors
            if (err.name !== 'NotAllowedError') {
                console.error('Audio play failed:', err);
            }
        });
    }

    // Play a random lateral movement splash sound (D, E, or F)
    playRandomLateralSplash() {
        // Check all possible locations where sounds might be stored
        const lateralSounds = this.lateralSplashSounds || this.sounds.lateralSplashSounds;
        
        if (!lateralSounds || lateralSounds.length === 0) {
            return;
        }

        const randomIndex = Math.floor(Math.random() * lateralSounds.length);
        const sound = lateralSounds[randomIndex];
        
        if (!sound) {
            return;
        }
        
        // Clone if it's an HTML Audio element, otherwise play directly
        const audioToPlay = sound.cloneNode ? sound.cloneNode() : sound;
        audioToPlay.volume = 0.3; // Lower volume for lateral movement
        
        audioToPlay.play();
    }

    // Play the game start jingle
    playJingle() {
        if (!this.initialized || !this.sounds.jingle) {
            return;
        }

        this.sounds.jingle.currentTime = 0;
        this.sounds.jingle.play().catch(err => {
            console.error('Jingle play failed:', err);
        });
    }
    
    // Play jingle C when goal comes into view
    playJingleC() {
        if (!this.initialized || !this.sounds.jingleC) {
            return;
        }

        this.sounds.jingleC.currentTime = 0;
        
        // Return a promise that resolves when the sound finishes
        return new Promise((resolve) => {
            this.sounds.jingleC.onended = () => resolve();
            this.sounds.jingleC.play().catch(err => {
                console.error('Jingle C play failed:', err);
                resolve(); // Always resolve, even if playback fails
            });
        });
    }
    
    // Play kiss sound when fish touch
    playKiss() {
        if (!this.initialized || !this.sounds.kiss) {
            return;
        }

        this.sounds.kiss.currentTime = 0;
        this.sounds.kiss.play().catch(err => {
            console.error('Kiss play failed:', err);
        });
    }
    
    // Play jingle D after kiss
    playJingleD() {
        if (!this.initialized || !this.sounds.jingleD) {
            return;
        }

        this.sounds.jingleD.currentTime = 0;
        this.sounds.jingleD.play().catch(err => {
            console.error('Jingle D play failed:', err);
        });
    }
    
    // Play jingle B on restart
    playJingleB() {
        if (!this.initialized || !this.sounds.jingleB) {
            return;
        }

        this.sounds.jingleB.currentTime = 0;
        this.sounds.jingleB.play().catch(err => {
            console.error('Jingle B play failed:', err);
        });
    }
    
    // Stop all currently playing sounds
    stopAll() {
        // Stop all splash and lateral splash sounds
        if (this.sounds.splashSounds) {
            this.sounds.splashSounds.forEach(audio => {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                } catch (e) {
                    // Ignore errors if stopping fails
                }
            });
        }
        
        if (this.sounds.lateralSplashSounds) {
            this.sounds.lateralSplashSounds.forEach(audio => {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                } catch (e) {
                    // Ignore errors
                }
            });
        }
        
        // Stop individual jingle and kiss sounds
        const individualSounds = ['jingle', 'jingleB', 'jingleC', 'jingleD', 'kiss'];
        individualSounds.forEach(soundName => {
            if (this.sounds[soundName]) {
                try {
                    this.sounds[soundName].pause();
                    this.sounds[soundName].currentTime = 0;
                    this.sounds[soundName].onended = null; // Remove event listeners
                } catch (e) {
                    // Ignore errors if stopping fails
                }
            }
        });
    }

    // Set master volume (0.0 to 1.0)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    // Enable or disable all sounds
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    // Play a specific sound by name (for future expansion)
    playSound(soundName, volume = null) {
        if (!this.enabled || !this.sounds[soundName]) {
            return;
        }

        try {
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = volume !== null ? volume : this.volume;
            sound.play().catch(err => {
                if (err.name !== 'NotAllowedError') {
                    console.error(`Error playing ${soundName}:`, err);
                }
            });
        } catch (err) {
            console.error(`Error playing ${soundName}:`, err);
        }
    }
}
