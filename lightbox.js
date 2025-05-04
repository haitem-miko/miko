import * as DOM from './dom.js';

// --- Image Lightbox Logic ---
export function setupLightboxListeners() {
    DOM.lightboxClose.addEventListener('click', closeLightbox);

    // Close lightbox when clicking on the background overlay
    DOM.imageLightbox.addEventListener('click', (e) => {
        if (e.target === DOM.imageLightbox) { // Check if the click is directly on the overlay
            closeLightbox();
        }
    });

    // Add event listener to chatLog, using event delegation for images
    DOM.chatLog.addEventListener('click', (e) => {
        // Check if the clicked element is an IMG tag inside an AI message
        if (e.target.tagName === 'IMG' && e.target.closest('.ai-message')) {
            openLightbox(e.target.src);
        }
    });
}


export function openLightbox(src) {
    if (!src) return;
    DOM.lightboxContent.src = src;
    DOM.imageLightbox.style.display = 'flex'; // Use flex to center content easily
}

export function closeLightbox() {
    DOM.imageLightbox.style.display = 'none';
    DOM.lightboxContent.src = ''; // Clear the src to prevent loading issues
}