import * as DOM from './dom.js';
import { hideImagePromptArea } from './imagePromptUI.js'; // Import hide function

// --- Mobile Sidebar Logic ---
export function setupMobileUIListeners() {
    DOM.menuToggleButton.addEventListener('click', toggleMobileSidebar);
    DOM.sidebarCloseButton.addEventListener('click', hideMobileSidebar);

    // Optional: Close sidebar when clicking outside of it on mobile
    document.addEventListener('click', (event) => {
        if (window.innerWidth <= 768 && DOM.sidebar.classList.contains('visible')) {
            const isClickInsideSidebar = DOM.sidebar.contains(event.target);
            const isClickOnToggleButton = DOM.menuToggleButton.contains(event.target);
            if (!isClickInsideSidebar && !isClickOnToggleButton) {
                hideMobileSidebar();
            }
        }
    });
}

export function toggleMobileSidebar() {
    DOM.sidebar.classList.toggle('visible');
    if (DOM.sidebar.classList.contains('visible')) {
        // When opening sidebar, close any open prompt areas/pickers
        hideImagePromptArea(); // Use new function
        DOM.removeReplyInputArea();
        DOM.closeEmojiPicker();
    }
    // Optional: Add/remove a class on body for more complex styling adjustments
    // document.body.classList.toggle('sidebar-open');
}

export function showMobileSidebar() {
    if (!DOM.sidebar.classList.contains('visible')) {
        DOM.sidebar.classList.add('visible');
        // document.body.classList.add('sidebar-open');
        // Also hide prompts when explicitly showing
        hideImagePromptArea(); // Use new function
        DOM.removeReplyInputArea();
        DOM.closeEmojiPicker();
    }
}

export function hideMobileSidebar() {
    if (DOM.sidebar.classList.contains('visible')) {
        DOM.sidebar.classList.remove('visible');
        // document.body.classList.remove('sidebar-open');
    }
}