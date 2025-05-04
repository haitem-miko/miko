import * as DOM from './dom.js'; 
import { hideMobileSidebar } from './mobileUI.js';

// --- Selectors for the Enhanced Image Prompt Area ---
const imagePromptContainer = document.getElementById('image-prompt-container');
const imagePromptInput = document.getElementById('image-prompt-input');
const generateImageButton = document.getElementById('generate-image-button');
const removeImageButton = document.getElementById('remove-image-button');
// --- Add selectors for the dropdowns ---
const imageStyleSelect = document.getElementById('image-style-select');
const imageAspectRatioSelect = document.getElementById('image-aspect-ratio-select');

let triggerGenerateCallback = null; 

export function setupImagePromptUI(generateCallback) {
    triggerGenerateCallback = generateCallback; 

    if (DOM.imageButton) {
        DOM.imageButton.addEventListener('click', () => {
            showImagePromptArea();
            hideMobileSidebar(); 
            DOM.removeReplyInputArea();
            DOM.closeEmojiPicker();
        });
    }

    if (generateImageButton) {
        generateImageButton.addEventListener('click', () => {
            if (triggerGenerateCallback) {
                triggerGenerateCallback(); 
            } else {
                console.error("Generate image callback not set up.");
            }
        });
    }

    if (removeImageButton) {
        removeImageButton.addEventListener('click', hideImagePromptArea);
    }

    // No need for global click handler here anymore, handled in chat.js
    // document.addEventListener('click', handleGlobalClickForImagePrompt);
}

export function showImagePromptArea() {
    if (imagePromptContainer) {
        imagePromptContainer.style.display = 'flex'; 
        imagePromptInput.focus(); 
    }
}

export function hideImagePromptArea() {
    if (imagePromptContainer) {
        imagePromptContainer.style.display = 'none';
    }
}

export function getImagePromptData() {
    return {
        prompt: imagePromptInput.value.trim(),
        // --- Get values from the select elements ---
        style: imageStyleSelect.value,
        aspectRatio: imageAspectRatioSelect.value,
    };
}

// Removed handleGlobalClickForImagePrompt as it's better handled centrally
// function handleGlobalClickForImagePrompt(event) { ... }