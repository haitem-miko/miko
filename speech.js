import * as DOM from './dom.js';
import { sendMessage } from './chat.js'; 

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;
let autoSendAfterSpeech = false;

export function getIsRecording() {
    return isRecording;
}

export function setupSpeechRecognition(options) {
    const { onStartRecording, onStopRecording, onResult, onError } = options;
    if (!SpeechRecognition) {
        console.warn("Speech Recognition API not supported in this browser.");
        if (DOM.micButton) {
            DOM.micButton.disabled = true;
            DOM.micButton.title = "Speech recognition not supported";
        }
        return null; 
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US'; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        DOM.messageInput.value = speechResult;
        onResult(speechResult); 
        if (autoSendAfterSpeech) {
            sendMessage(); 
        }
        stopRecording(); 
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = `An error occurred during speech recognition: ${event.error}`;
         if (event.error === 'no-speech') {
             errorMessage = 'No speech detected. Please try again.';
         } else if (event.error === 'audio-capture') {
             errorMessage = 'Microphone error. Please ensure it is connected and permissions are granted.';
         } else if (event.error === 'not-allowed') {
             errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
         }
        alert(errorMessage);
        onError(event.error); 
        stopRecording();
    };

    recognition.onstart = () => {
        console.log("Speech recognition started");
        isRecording = true;
        DOM.micButton.classList.add('recording');
        DOM.micButton.innerHTML = '<i class="fas fa-stop"></i>';
        DOM.micButton.disabled = false; 
        DOM.messageInput.placeholder = "Listening...";
        DOM.sendButton.disabled = true;
        onStartRecording(); 
    };


    recognition.onend = () => {
        console.log("Speech recognition ended");
        if (isRecording) {
           stopRecording();
        }
    };

    return recognition; 
}

export function startRecording(setAutoSend = true, setAutoPlay = true) {
    if (!recognition || isRecording) return;
    try {
        autoSendAfterSpeech = setAutoSend;
        recognition.start();
    } catch (error) {
        console.error("Error starting speech recognition:", error);
        alert("Could not start voice recording. Please ensure microphone permissions are granted.");
        stopRecording();
    }
}

export function stopRecording() {
    if (!recognition) return;
    if (isRecording) {
        recognition.stop(); 
    }
    isRecording = false;
    autoSendAfterSpeech = false;
    DOM.micButton.classList.remove('recording');
    DOM.micButton.innerHTML = '<i class="fas fa-microphone"></i>';
    DOM.messageInput.placeholder = "Type your message or use the microphone...";
     if (!DOM.messageInput.disabled) { 
         DOM.sendButton.disabled = false;
     }
    DOM.micButton.disabled = DOM.messageInput.disabled;
}

export function toggleRecording(getCurrentAudioState, onToggleStart) {
    if (!recognition) return;
    if (getCurrentAudioState && getCurrentAudioState()) { 
        alert("Please wait for the current response to finish speaking.");
        return;
    }
    if (isRecording) {
        autoSendAfterSpeech = false; 
        stopRecording();
    } else {
        onToggleStart(); 
        startRecording(true); 
    }
}