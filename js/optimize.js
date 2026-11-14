// ==========================================
// BUTTERY SMOOTH STAGGER & IMAGE OPTIMIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Force background image loading
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (!img.getAttribute('loading')) {
            img.setAttribute('loading', 'lazy'); // Only load when on screen
        }
        img.setAttribute('decoding', 'async');
    });

    // 2. Add a cascading "wave" delay to portfolio items
    // This stops 10 images from animating at the exact same frame
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    portfolioItems.forEach((item, index) => {
        // Creates a micro-delay: 0s, 0.1s, 0.2s, 0.3s, then repeats
        const delay = (index % 4) * 0.1; 
        item.style.transitionDelay = `${delay}s`;
    });
});