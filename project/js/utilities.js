// Returns true if running on a mobile device
function isMobileDevice() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Debounced window resize setup
function setupDebouncedResize(callback) {
	let resizeTimeout = null;
	window.addEventListener('resize', function() {
		if (resizeTimeout) clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(callback, 250);
	});
}

// Handle window resize
function handleResize(config, renderer) {
	var width = window.innerWidth || config.width;
	var height = window.innerHeight || config.height;
	renderer.resize(width, height);
	config.width = width;
	config.height = height;
}
// Utility functions for Pixijs-SalmonRunner
// Add general-purpose functions here.
