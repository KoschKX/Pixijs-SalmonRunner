// LoaderBar: handles progress bar and blue-to-white text animation
class LoaderBar {
    constructor(container) {
        this.container = container;
        this.bar = container.querySelector('.progress-bar');
        this.textBlue = container.querySelector('.progress-text-blue');
        this.textWhite = container.querySelector('.progress-text-white');
    }

    setProgress(progress) {
        // Ensure progress stays between 0 and 100
        progress = Math.max(0, Math.min(100, progress));
        this.bar.style.width = progress + '%';
        this.textBlue.textContent = progress + '%';
        this.textWhite.textContent = progress + '%';

        // White text is always fully shown
        this.textWhite.style.clipPath = 'none';

        // Blue text is only visible over the filled part of the bar
        const barWidth = this.container.offsetWidth;
        const revealWidth = barWidth * (progress / 100);
        this.textBlue.style.clipPath = `inset(0 ${barWidth - revealWidth}px 0 0)`;
    }
}