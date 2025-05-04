import { elevenLabsApiKey } from 'config.js';
import * as DOM from './dom.js';

let currentAudio = null;
let currentTTSButton = null;

export function getCurrentAudioState() {
    return currentAudio && !currentAudio.paused;
}

export function getCurrentTTSButton() {
    return currentTTSButton;
}

export async function playTextToSpeech(text, buttonElement, disableInputs = true, setInputDisabledCallback, isRecordingCheck, micButtonRef) {
    if (!elevenLabsApiKey) {
        console.error("ElevenLabs API key is not set.");
        alert("Text-to-speech is not configured.");
        resetTTSButton(buttonElement);
        return;
    }
    if (isRecordingCheck && isRecordingCheck()) {
        alert("Please stop recording before playing audio.");
        return;
    }

    if (currentAudio) {
        currentAudio.pause(); // Stop existing audio
        if (currentTTSButton === buttonElement) {
             // If clicking the same button that's playing, just stop it
             resetTTSButton(currentTTSButton);
             URL.revokeObjectURL(currentAudio.src); // Clean up blob URL
             currentAudio = null;
             currentTTSButton = null;
             if(disableInputs) setInputDisabledCallback(false); // Re-enable inputs
             return; // Don't proceed to play new audio
        }
        // If a different audio was playing, reset its button
        if (currentTTSButton) {
           resetTTSButton(currentTTSButton);
        }
        URL.revokeObjectURL(currentAudio.src); // Clean up old blob URL
        currentAudio = null; // Ensure currentAudio is null before proceeding
    }


    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Example voice ID
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const headers = {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
    };
    const body = JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    });

    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    buttonElement.disabled = true;
    if (disableInputs) setInputDisabledCallback(true); // Disable inputs

    try {
        const response = await fetch(url, { method: 'POST', headers: headers, body: body });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`ElevenLabs API Error: ${response.status} - ${errorData.detail?.message || response.statusText}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        currentAudio = new Audio(audioUrl);
        currentTTSButton = buttonElement;

        currentAudio.onplay = () => {
            buttonElement.classList.add('playing');
            buttonElement.innerHTML = '<i class="fas fa-stop"></i>';
            buttonElement.disabled = false; // Enable the stop button
             if (micButtonRef) micButtonRef.disabled = true; // Disable mic while playing
        };

        currentAudio.onended = currentAudio.onerror = (e) => {
            if (e.type === 'error') {
               console.error("Error playing audio:", e);
               alert("Error playing audio.");
            }
            resetTTSButton(buttonElement);
            URL.revokeObjectURL(audioUrl); // Clean up blob URL
            currentAudio = null;
            currentTTSButton = null;
            if (disableInputs) setInputDisabledCallback(false); // Re-enable inputs
             // Re-enable mic button only if inputs are generally enabled and not recording
             if (micButtonRef && !DOM.messageInput.disabled) {
                 micButtonRef.disabled = isRecordingCheck ? isRecordingCheck() : false;
             }
        };

        currentAudio.play();

    } catch (error) {
        console.error("Error calling ElevenLabs API:", error);
        alert(`Failed to generate speech: ${error.message}`);
        resetTTSButton(buttonElement);
        currentAudio = null;
        currentTTSButton = null;
        if (disableInputs) setInputDisabledCallback(false); // Re-enable inputs
         if (micButtonRef && !DOM.messageInput.disabled) {
             micButtonRef.disabled = isRecordingCheck ? isRecordingCheck() : false;
         }
    }
}

export function stopTTSPlayback() {
    if (currentAudio) {
        currentAudio.pause();
        if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
            URL.revokeObjectURL(currentAudio.src);
        }
        currentAudio = null;
    }
    if (currentTTSButton) {
        resetTTSButton(currentTTSButton);
        currentTTSButton = null;
    }
     // Ensure mic button state is correct after stopping TTS
    if (DOM.micButton && !DOM.messageInput.disabled) {
         DOM.micButton.disabled = false; // Assuming not recording, speech module handles recording state
     }
}

export function resetTTSButton(buttonElement) {
    if (buttonElement) {
        buttonElement.classList.remove('playing');
        buttonElement.innerHTML = '<i class="fas fa-volume-up"></i>';
        buttonElement.disabled = false;
    }
}