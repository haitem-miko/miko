import * as DOM from './dom.js';
import { addSystemMessage, removeSystemMessages } from './systemMessages.js';
import { scrollToBottom } from './utils.js';
import { hideMobileSidebar } from './mobileUI.js';

// Store the current uploaded image data URL
let currentUploadedImageDataUrl = null;

// Setup the image upload feature
export function setupImageUpload(handleImageAnalysisCallback) {
    // Get references to the DOM elements
    const uploadImageButton = document.getElementById('upload-image-button');
    const imageUploadContainer = document.getElementById('image-upload-container');
    const removeUploadButton = document.getElementById('remove-image-upload-button');
    const uploadDropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('image-file-input');
    const previewContainer = document.getElementById('upload-preview-container');
    const previewImage = document.getElementById('upload-preview');
    const removeImageButton = document.getElementById('remove-upload-button');
    const questionInput = document.getElementById('image-question-input');
    const analyzeButton = document.getElementById('analyze-image-button');

    if (!uploadImageButton || !imageUploadContainer) return;

    // Show the image upload interface when the button is clicked
    uploadImageButton.addEventListener('click', () => {
        showImageUploadArea();
        hideMobileSidebar();
        DOM.removeReplyInputArea();
        DOM.closeEmojiPicker();
    });

    // Hide the image upload interface when the close button is clicked
    if (removeUploadButton) {
        removeUploadButton.addEventListener('click', hideImageUploadArea);
    }

    // Setup the file input and drag & drop functionality
    if (uploadDropzone && fileInput) {
        // Click on dropzone opens file browser
        uploadDropzone.addEventListener('click', () => {
            fileInput.click();
        });

        // Handle file selection
        fileInput.addEventListener('change', (event) => {
            handleFileSelection(event.target.files[0]);
        });

        // Drag & drop functionality
        uploadDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadDropzone.classList.add('dragover');
        });

        uploadDropzone.addEventListener('dragleave', () => {
            uploadDropzone.classList.remove('dragover');
        });

        uploadDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadDropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handleFileSelection(e.dataTransfer.files[0]);
            }
        });
    }

    // Handle removing the uploaded image
    if (removeImageButton) {
        removeImageButton.addEventListener('click', () => {
            resetUploadArea();
        });
    }

    // Handle analyzing the image
    if (analyzeButton) {
        analyzeButton.addEventListener('click', () => {
            // Get the question from the input
            const question = questionInput.value.trim();
            
            // Validate inputs
            if (!currentUploadedImageDataUrl) {
                addSystemMessage("Please upload an image first.", "system-notification", 3000);
                return;
            }
            
            if (!question) {
                addSystemMessage("Please enter a question about the image.", "system-notification", 3000);
                questionInput.focus();
                return;
            }
            
            // Call the callback function with the image and question
            handleImageAnalysisCallback(currentUploadedImageDataUrl, question);
            
            // Hide the upload area after submitting
            hideImageUploadArea();
        });
    }

    // Initial state setup
    resetUploadArea();
    updateAnalyzeButtonState();
}

// Show the image upload area
export function showImageUploadArea() {
    const imageUploadContainer = document.getElementById('image-upload-container');
    if (imageUploadContainer) {
        imageUploadContainer.style.display = 'flex';
    }
}

// Hide the image upload area
export function hideImageUploadArea() {
    const imageUploadContainer = document.getElementById('image-upload-container');
    if (imageUploadContainer) {
        imageUploadContainer.style.display = 'none';
    }
}

// Reset the upload area to its initial state
function resetUploadArea() {
    const uploadDropzone = document.getElementById('upload-dropzone');
    const previewContainer = document.getElementById('upload-preview-container');
    const fileInput = document.getElementById('image-file-input');
    const questionInput = document.getElementById('image-question-input');
    
    if (uploadDropzone) uploadDropzone.style.display = 'flex';
    if (previewContainer) previewContainer.style.display = 'none';
    if (fileInput) fileInput.value = '';
    if (questionInput) questionInput.value = '';
    
    currentUploadedImageDataUrl = null;
    updateAnalyzeButtonState();
}

// Handle file selection from input or drag & drop
function handleFileSelection(file) {
    // Validate that it's an image file
    if (!file || !file.type.startsWith('image/')) {
        addSystemMessage("Please select a valid image file.", "system-notification", 3000);
        return;
    }

    const uploadDropzone = document.getElementById('upload-dropzone');
    const previewContainer = document.getElementById('upload-preview-container');
    const previewImage = document.getElementById('upload-preview');
    
    // Convert the file to a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
        currentUploadedImageDataUrl = e.target.result;
        if (previewImage) previewImage.src = currentUploadedImageDataUrl;
        if (uploadDropzone) uploadDropzone.style.display = 'none';
        if (previewContainer) previewContainer.style.display = 'block';
        updateAnalyzeButtonState();
    };
    reader.onerror = () => {
        addSystemMessage("Error reading the image file.", "system-notification", 3000);
    };
    reader.readAsDataURL(file);
}

// Update the state of the analyze button based on current inputs
function updateAnalyzeButtonState() {
    const analyzeButton = document.getElementById('analyze-image-button');
    if (analyzeButton) {
        analyzeButton.disabled = !currentUploadedImageDataUrl;
    }
}