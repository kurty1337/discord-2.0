class AudioService {
    private sounds: { [key: string]: HTMLAudioElement };

    constructor() {
        this.sounds = {
            // A simple, highly compatible WAV click sound
            switch: new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAEw='),
        };
        // Preload sounds
        Object.values(this.sounds).forEach(sound => {
            sound.preload = 'auto';
            sound.volume = 0.6; // Increased volume for UI sounds
        });
    }

    playSound(name: string) {
        if (this.sounds[name]) {
            this.sounds[name].currentTime = 0;
            this.sounds[name].play().catch(e => console.error("Audio play failed:", e));
        }
    }
}

export const audioService = new AudioService();