import * as DOM from './dom.js';
import { scrollToBottom } from './utils.js';

// --- System Messages ---
export function addSystemMessage(text, className = null, duration = null) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'system-message');
    if (className) {
        messageElement.classList.add(className); // Add specific class if provided
    }
    messageElement.textContent = text;
    DOM.chatLog.appendChild(messageElement);
    scrollToBottom(DOM.chatLog);

    // Optional auto-removal after duration
    if (duration && typeof duration === 'number' && duration > 0) {
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, duration);
    }
    return messageElement; // Return the element in case it needs to be referenced
}

export function removeSystemMessages(selector = '.system-message') {
    // Allow removing specific system messages using a selector
    const systemMessages = DOM.chatLog.querySelectorAll(selector);
    systemMessages.forEach(msg => msg.remove());
}

// Example of clearing specific temporary messages like "Miko is thinking..."
export function clearThinkingMessage() {
    removeSystemMessages('.system-message:not(.system-notification)'); // Keep notifications
}