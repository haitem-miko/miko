import * as DOM from './dom.js';
import { addSystemMessage, removeSystemMessages } from './systemMessages.js';
import { scrollToBottom } from './utils.js';
import { subscriptionManager } from './subscription.js';

const STYLE_PREFIXES = {
    default: "",
    real: "Photorealistic style: highly detailed, accurate lighting and textures, mimicking a real photograph. Prompt: ",
    cartoon: "Classic 2D cartoon style: bold outlines, flat colors, exaggerated features, simple backgrounds. Prompt: ",
    '3d-cartoon': "Modern 3D cartoon style: Smooth shapes, vibrant colors, Pixar-like aesthetic. Prompt: ",
    disney: "Classic Disney animation style: Expressive characters, fairytale aesthetic, often with musical elements, distinct character designs. Prompt: ",
    ghibli: "Studio Ghibli style: warm color palettes, soft lighting, detailed backgrounds, painterly aesthetic, expressive characters, often with themes of nature and fantasy. Prompt: ",
    gombad: "GOMBAD Style: A unique visual art style inspired by Studio Ghibli's warm color palettes and soft lighting, combined with cartoon-like clothes, oversized heads, and highly detailed features. The faces and hair resemble Studio Ghibli characters, while the background is always mysterious and dark. The characters have an expressive, emotional presence, often captured with large, rounded eyes. The clothing is simplistic and flat-colored, reminiscent of traditional 2D cartoons. --style raw --v 6.0 Prompt: ",
    simpsons: "The Simpsons animation style: yellow skin, distinctive character designs, bright colors, suburban setting. Prompt: ",
    muppet: "Muppet style: characters made of felt, foam, and fabric, distinct textures, googly eyes, exaggerated features, often in a playful or chaotic setting. Prompt: ",
    minecraft: "Minecraft video game style: blocky, pixelated aesthetic, voxel art, vibrant colors, featuring game elements like blocks, mobs, and environments. Prompt: ",
    'zombie': "Zombie apocalypse style: decaying flesh, tattered clothing, vacant or menacing expressions, often in desolate or ruined environments, horror aesthetic. Prompt: ",
    'concept-art': "Concept art style: painterly, focus on mood and atmosphere, often depicting fantastical or sci-fi scenes, character designs, or environments. Prompt: ",
    epic: "Epic fantasy style: Dramatic lighting, detailed armor/costumes, fantastical creatures or landscapes, high level of detail. Prompt: ",
    gta: "Grand Theft Auto video game style: Realistic yet slightly stylized, modern urban environments, action-oriented poses. Prompt: "
};

export async function generateImage(
    prompt,
    style = 'default',
    aspectRatio = '1:1',
    conversationHistoryRef,
    getCurrentSessionIndex, 
    setInputAreaDisabledCallback,
    addAiMessageCallback,
    saveCurrentChatCallback,
    updateChatListCallback
) {
    // Check subscription limits first
    const canGenerate = subscriptionManager.canGenerateImages();
    if (!canGenerate.allowed) {
        addAiMessageCallback(canGenerate.reason, `error-${Date.now()}`);
        return;
    }

    // Number of images to generate based on subscription
    const IMAGE_GENERATION_COUNT = canGenerate.imagesPerBatch;

    if (!prompt) {
        console.error("Image generation requires a prompt.");
        addAiMessageCallback("Please provide a description for the image.", `error-${Date.now()}`);
        return;
    }

    // Prepare the full prompt with style prefix
    const stylePrefix = STYLE_PREFIXES[style] || "";
    const fullPrompt = stylePrefix + prompt;

    // Create user message for display and history
    const userMessageDisplay = `Generate ${IMAGE_GENERATION_COUNT} images (Style: ${style}, Aspect Ratio: ${aspectRatio}): ${prompt}`;
    const userMessageId = `user-img-req-${Date.now()}`;
    const userMessageHistory = {
        id: userMessageId,
        role: "user",
        content: userMessageDisplay // Store the user-facing request text
    };

    DOM.addUserMessage(userMessageDisplay); // Display user request
    conversationHistoryRef.push(userMessageHistory); // Add request to history

    // Show "Generating..." message and disable inputs
    addSystemMessage(`Generating ${IMAGE_GENERATION_COUNT} ${style !== 'default' ? style + ' style ' : ''}images...`);
    setInputAreaDisabledCallback(true);

    try {
        if (typeof websim === 'undefined' || typeof websim.imageGen !== 'function') {
            throw new Error("Image generation service (websim.imageGen) is not available.");
        }

        // Create an array of promises for generating images in parallel
        const generationPromises = [];
        for (let i = 0; i < IMAGE_GENERATION_COUNT; i++) {
            generationPromises.push(
                websim.imageGen({
                    prompt: fullPrompt,
                    aspect_ratio: aspectRatio,
                    // Add a seed or variation parameter if the API supports it to get different images
                    // e.g., seed: Date.now() + i
                }).catch(err => {
                    // Catch individual errors to allow others to succeed
                    console.error(`Error generating image ${i + 1}:`, err);
                    return { error: `Failed to generate image ${i + 1}.`, url: null }; // Return an error object
                })
            );
        }

        // Wait for all promises to settle
        const results = await Promise.all(generationPromises);

        const successfulUrls = results.filter(r => r && r.url).map(r => r.url);
        const failedCount = results.length - successfulUrls.length;

        if (successfulUrls.length === 0) {
            throw new Error("All image generation attempts failed.");
        }

        // Create a container for the images
        const imageGalleryContainer = document.createElement('div');
        imageGalleryContainer.classList.add('multi-image-container');

        // Add successful images to the container
        successfulUrls.forEach(url => {
            const imageElement = document.createElement('img');
            imageElement.src = url;
            imageElement.alt = `Generated Image (Style: ${style}): ${prompt}`;
            imageElement.classList.add('generated-chat-image'); // Keep class for potential styling/lightbox
            imageGalleryContainer.appendChild(imageElement);
        });

        // Use the passed callback to add the image gallery container
        const galleryMessageId = `img-gallery-${Date.now()}`;
        addAiMessageCallback(imageGalleryContainer, galleryMessageId);

        // Add the successful generation details to conversation history
        conversationHistoryRef.push({
            role: "assistant",
            type: "image-gallery", // Use a distinct type
            style: style,
            prompt: prompt, // Original user prompt without prefix
            aspectRatio: aspectRatio,
            urls: successfulUrls, // Store array of URLs
            content: `[Generated ${successfulUrls.length} image${successfulUrls.length === 1 ? '' : 's'} (Style: ${style}, Ratio: ${aspectRatio}) for prompt: "${prompt}"]`,
            id: galleryMessageId
        });

        // Record the successful generation
        subscriptionManager.recordGeneration(successfulUrls.length);

        // Notify user if some images failed
        if (failedCount > 0) {
            addSystemMessage(`Note: ${failedCount} out of ${IMAGE_GENERATION_COUNT} image generations failed.`, 'system-notification', 5000);
        }

        // Call the passed save/update callbacks
        saveCurrentChatCallback(conversationHistoryRef);
        updateChatListCallback();

    } catch (error) {
        console.error(`Error during multi-image generation:`, error);
        // Use the passed callback for error message
        addAiMessageCallback(`Sorry, I encountered an error generating the images: ${error.message}`, `error-${Date.now()}`);
        // Save history even on error, so user request isn't lost
        saveCurrentChatCallback(conversationHistoryRef);
        updateChatListCallback();
    } finally {
        removeSystemMessages('.system-message:not(.system-notification)'); // Remove "Generating..." message
        setInputAreaDisabledCallback(false);
        scrollToBottom(DOM.chatLog);
    }
}