import 'emoji-picker-element'; // Import the emoji picker custom element
import { scrollToBottom as utilScrollToBottom, linkifyText } from './utils.js'; // Alias to avoid conflict, import linkifyText
import { previewCode } from './codePreview.js'; // Import the new preview function

// DOM Element Selectors
export const chatLog = document.getElementById('chat-log');
export const messageInput = document.getElementById('message-input');
export const sendButton = document.getElementById('send-button');
export const chatList = document.getElementById('chat-list');
export const newChatButton = document.getElementById('new-chat-button');
export const sidebar = document.getElementById('sidebar');
export const micButton = document.getElementById('mic-button');
export const thinkingModeButton = document.getElementById('thinking-mode-button');
export const menuToggleButton = document.getElementById('menu-toggle-button');
export const sidebarCloseButton = document.getElementById('sidebar-close-button');
export const imageLightbox = document.getElementById('image-lightbox');
export const lightboxContent = document.getElementById('lightbox-content');
export const lightboxClose = document.getElementById('lightbox-close');
export const emojiPicker = document.getElementById('emoji-picker'); // Select emoji picker
export const imageButton = document.getElementById('image-button'); // Keep image button selector
export const uploadImageButton = document.getElementById('upload-image-button'); // Add upload image button
export const typingIndicator = document.getElementById('typing-indicator'); // Get typing indicator

let currentReplyInputArea = null; // Track the current reply input
let currentEmojiPickerTargetButton = null; // Track which *button* the picker is for

// --- DOM Manipulation Helpers ---
export function addUserMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', 'user-message');
  // Check if message is just a single emoji for special styling
  // Regex includes variations and ZWJ sequences
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\u{200D})+$/u;
  if (emojiRegex.test(message)) {
    messageElement.classList.add('emoji-only');
  }
  messageElement.textContent = message;
  chatLog.appendChild(messageElement);
  scrollToBottom();
  return messageElement;
}

export function addUserImageMessage(imageDataUrl, question) {
    // Create message container
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user-message', 'user-image-message');
    
    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('user-uploaded-image-container');
    
    // Create and add the image
    const imageElement = document.createElement('img');
    imageElement.src = imageDataUrl;
    imageElement.alt = "Uploaded image";
    imageElement.classList.add('user-uploaded-image');
    imageContainer.appendChild(imageElement);
    
    // Add the question text
    const questionElement = document.createElement('p');
    questionElement.textContent = question;
    
    // Add elements to the message
    messageElement.appendChild(imageContainer);
    messageElement.appendChild(questionElement);
    
    // Add to chat log
    chatLog.appendChild(messageElement);
    scrollToBottom();
    return messageElement;
}

export function addUserReplyMessage(replyText, originalMessageId, originalMessageText) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user-message', 'user-reply-message'); // Add reply class
    messageElement.dataset.replyToId = originalMessageId; // Store reference

    // Add quoted text
    const quoteElement = document.createElement('blockquote');
    quoteElement.classList.add('reply-quote');
    const maxQuoteLength = 50; // Adjust as needed
    // Handle case where originalMessageText might be an image description or gallery
    let displayQuote = typeof originalMessageText === 'string' ? originalMessageText : '[Replied to an image or gallery]';
    // Shorten if necessary
    quoteElement.textContent = displayQuote.length > maxQuoteLength
        ? displayQuote.substring(0, maxQuoteLength) + '...'
        : displayQuote;
    quoteElement.title = displayQuote; // Show full quote on hover
    messageElement.appendChild(quoteElement);

    // Add reply content
    const replyContentElement = document.createElement('span');
    replyContentElement.textContent = replyText;
    messageElement.appendChild(replyContentElement);

    chatLog.appendChild(messageElement);
    scrollToBottom();
    return messageElement;
}

// Add function to display the thinking process box
export function addThinkingBox(reasoningContent) {
    const thinkingElement = document.createElement('div');
    thinkingElement.classList.add('thinking-mode-box');

    // Basic markdown-like handling (can be expanded)
    const lines = reasoningContent.split('\n');
    let currentList = null; // Track current list type (ul or ol)

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('* ') || line.startsWith('- ')) {
            if (!currentList || currentList.tagName !== 'UL') {
                currentList = document.createElement('ul');
                thinkingElement.appendChild(currentList);
            }
            const li = document.createElement('li');
            li.textContent = line.substring(2);
            currentList.appendChild(li);
        } else if (line.match(/^\d+\.\s/)) {
             if (!currentList || currentList.tagName !== 'OL') {
                currentList = document.createElement('ol');
                thinkingElement.appendChild(currentList);
            }
            const li = document.createElement('li');
            li.textContent = line.replace(/^\d+\.\s/, '');
            currentList.appendChild(li);
        } else if (line) { // Treat non-empty lines as paragraphs
             currentList = null; // Reset list tracking
             const p = document.createElement('p');
             // Basic inline code handling
             p.innerHTML = line.replace(/`([^`]+)`/g, '<code>$1</code>');
             thinkingElement.appendChild(p);
        } else {
            // Handle empty lines - could potentially reset list or add space
             currentList = null;
        }
    });

     // If nothing was added (empty reasoning), add a placeholder
    if (thinkingElement.children.length === 0 && reasoningContent.trim()) {
        const p = document.createElement('p');
        p.textContent = reasoningContent; // Add raw content if parsing failed
        thinkingElement.appendChild(p);
    } else if (thinkingElement.children.length === 0) {
        const p = document.createElement('p');
        p.textContent = "(No specific reasoning steps provided)";
        thinkingElement.appendChild(p);
    }

    chatLog.appendChild(thinkingElement);
    scrollToBottom();
    return thinkingElement;
}

// Show typing indicator
export function showTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.style.display = 'block';
        scrollToBottom();
    }
}

// Hide typing indicator
export function hideTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
    }
}

export function addAiMessage(messageContent, playTTSEnabled = false, handleTTSClick, messageId, handleReplyClickCallback, handleEmojiClickCallback) {
    // First hide typing indicator if it's visible
    hideTypingIndicator();
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'ai-message');
    messageElement.id = messageId || `msg-${Date.now()}`; // Assign ID
    
    // Add the AI logo
    const logoImg = document.createElement('img');
    logoImg.src = '/wach_tahan.png';
    logoImg.alt = 'Miko';
    logoImg.classList.add('ai-logo');
    messageElement.appendChild(logoImg);
    
    // Create a container for the message content
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('ai-message-content');
    messageElement.appendChild(contentContainer);
    
    let textToSpeak = null;
    let isMediaContent = false; // Flag for images or galleries

    // Handle string content (text, code blocks, links)
    if (typeof messageContent === 'string') {
        const codeBlockRegex = /```([\s\S]*?)```/g;
        let lastIndex = 0;
        let messageParts = [];

        textToSpeak = messageContent.replace(codeBlockRegex, "\n(Code example follows)\n"); // Prepare text for TTS

        messageContent.replace(codeBlockRegex, (match, code, offset) => {
            // Add text part before the code block
            if (offset > lastIndex) {
                messageParts.push({ type: 'text', content: messageContent.substring(lastIndex, offset) });
            }

            // Create Code Block Element
            const codeWrapper = document.createElement('div');
            codeWrapper.classList.add('code-block-wrapper');

            const controlsContainer = document.createElement('div');
            controlsContainer.classList.add('code-controls');

            const preElement = document.createElement('pre');
            const codeElement = document.createElement('code');
            let language = 'plaintext'; // Default language

            // Simple language detection (can be improved)
            const langMatch = code.match(/^(html|css|javascript|js|python|java|c|cpp|php|ruby|go|rust|bash|sh|json|xml|)(\b|\n)/i);
            let codeContent = code.trim();
            if (langMatch && langMatch[1]) {
                language = langMatch[1].toLowerCase();
                if (language === 'js') language = 'javascript';
                codeElement.className = `language-${language}`;
                // Remove the language identifier line if present
                codeContent = code.substring(langMatch[0].length).trimStart();
            }
             codeElement.textContent = codeContent; // Use potentially modified code content
             preElement.appendChild(codeElement);

            // Add Preview Button (if applicable)
            const previewableLanguages = ['html', 'javascript', 'css'];
            if (previewableLanguages.includes(language)) {
                const previewButton = document.createElement('button');
                previewButton.classList.add('preview-code-button');
                previewButton.innerHTML = '<i class="fas fa-play"></i> Preview';
                previewButton.setAttribute('aria-label', 'Preview code');
                previewButton.onclick = (event) => {
                    event.stopPropagation(); // Prevent triggering other listeners
                    previewCode(codeElement.textContent, language);
                };
                controlsContainer.appendChild(previewButton);
            }

            // Add Copy Button
            const copyButton = document.createElement('button');
            copyButton.classList.add('copy-code-button');
            copyButton.innerHTML = '<i class="far fa-copy"></i> Copy';
            copyButton.setAttribute('aria-label', 'Copy code to clipboard');
            copyButton.onclick = async (event) => {
                event.stopPropagation(); // Prevent triggering other listeners
                try {
                    await navigator.clipboard.writeText(codeElement.textContent);
                    copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    copyButton.disabled = true;
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="far fa-copy"></i> Copy';
                        copyButton.disabled = false;
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy code: ', err);
                    copyButton.textContent = 'Error';
                     setTimeout(() => {
                        copyButton.innerHTML = '<i class="far fa-copy"></i> Copy';
                        copyButton.disabled = false;
                    }, 2000);
                }
            };
            controlsContainer.appendChild(copyButton);

            // Add controls and pre element to the wrapper
            codeWrapper.appendChild(controlsContainer);
            codeWrapper.appendChild(preElement);
            messageParts.push({ type: 'code', element: codeWrapper });

            lastIndex = offset + match.length;
            return match; // Necessary for replace function
        });

        // Add any remaining text after the last code block
        if (lastIndex < messageContent.length) {
            messageParts.push({ type: 'text', content: messageContent.substring(lastIndex) });
        }

        // Append processed parts to the content container
        messageParts.forEach(part => {
            if (part.type === 'text') {
                const linkedNodes = linkifyText(part.content);
                linkedNodes.forEach(node => contentContainer.appendChild(node));
            } else if (part.type === 'code') {
                contentContainer.appendChild(part.element);
            }
        });

    // Handle HTML Elements (Images, Galleries, etc.)
    } else if (messageContent instanceof HTMLElement) {
        // Check for single image or multi-image container
        if (messageContent.tagName === 'IMG' || messageContent.classList.contains('multi-image-container')) {
            isMediaContent = true; // It's an image or gallery
            textToSpeak = messageContent.alt || (messageContent.classList.contains('multi-image-container') ? 'Generated images' : 'Generated image'); // Use alt text or generic description for potential TTS (though usually disabled)
        } else {
             // Handle other potential HTML elements if necessary
             textToSpeak = messageContent.textContent || 'Received complex content.';
        }
        contentContainer.appendChild(messageContent); // Append the element directly

    // Handle other types (fallback)
    } else {
        const textPart = document.createElement('span');
        const fallbackText = String(messageContent) || 'Unsupported message format.';
        textPart.textContent = fallbackText;
        contentContainer.appendChild(textPart);
        textToSpeak = fallbackText;
    }

    // --- Add Buttons (TTS, Reply, Emoji) ---
    // Add TTS button only if enabled, not media, text exists, and callback provided
    if (playTTSEnabled && !isMediaContent && textToSpeak && textToSpeak.trim().length > 0 && handleTTSClick) {
        const ttsButton = document.createElement('button');
        ttsButton.classList.add('tts-button');
        ttsButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        ttsButton.setAttribute('aria-label', 'Play message audio');
        ttsButton.onclick = (event) => {
            event.stopPropagation(); // Prevent other clicks
            handleTTSClick(textToSpeak, ttsButton, false); // Pass text, button, disableInputs=false
        };
        messageElement.appendChild(ttsButton);
    }

    // Add Reply and Emoji buttons only if it's not media content and callbacks are provided
    if (!isMediaContent) {
        if (handleReplyClickCallback) {
            const replyButton = document.createElement('button');
            replyButton.classList.add('reply-button');
            replyButton.innerHTML = '<i class="fas fa-reply"></i> Reply';
            replyButton.dataset.messageId = messageElement.id;
            replyButton.setAttribute('aria-label', 'Reply to this message');
            replyButton.onclick = (event) => {
                 event.stopPropagation();
                 closeEmojiPicker(); // Close picker if open
                 handleReplyClickCallback(event); // Call the provided handler
            };
            messageElement.appendChild(replyButton);
        }
        if (handleEmojiClickCallback) {
            const emojiButton = document.createElement('button');
            emojiButton.classList.add('emoji-button');
            emojiButton.innerHTML = '<i class="far fa-smile"></i>'; // Default icon
            emojiButton.dataset.messageId = messageElement.id;
            emojiButton.setAttribute('aria-label', 'React with emoji');
            emojiButton.dataset.originalContent = emojiButton.innerHTML; // Store original for reset
            emojiButton.onclick = (event) => {
                 event.stopPropagation();
                 removeReplyInputArea(); // Close reply if open
                 handleEmojiClickCallback(event.currentTarget); // Call the provided handler
            };
            messageElement.appendChild(emojiButton);
        }
    }

    chatLog.appendChild(messageElement);
    scrollToBottom();
    return messageElement; // Return the created message element
}

// --- Emoji Picker Logic ---
export function setupEmojiPicker() {
    if (!emojiPicker) return;
    // Listener for when an emoji is selected in the picker
    emojiPicker.addEventListener('emoji-click', event => {
        // Check if the picker was opened by clicking an emoji button
        if (currentEmojiPickerTargetButton) {
            const emoji = event.detail.unicode;
            // Update the button's content to show the selected emoji
            currentEmojiPickerTargetButton.innerHTML = emoji;
            // Optionally, add a class to indicate it has a reaction
            currentEmojiPickerTargetButton.classList.add('has-reaction');
            closeEmojiPicker(); // Close picker after selection
            // Optional: Here you could trigger sending the emoji or storing the reaction state
            // console.log(`Reacted to message ${currentEmojiPickerTargetButton.dataset.messageId} with ${emoji}`);
        }
    });
}

// Modified toggleEmojiPicker to accept the button element
export function toggleEmojiPicker(targetButton) {
    if (!emojiPicker || !targetButton) return;

    // Close any open reply input first
    removeReplyInputArea();

    // Check if the picker is currently open *for this specific button*
    if (emojiPicker.style.display === 'block' && currentEmojiPickerTargetButton === targetButton) {
        // Clicking the same button again closes the picker
        closeEmojiPicker();
    } else {
        // Open the picker, targeting this button
        currentEmojiPickerTargetButton = targetButton; // Store the button
        emojiPicker.style.display = 'block';

        // Positioning logic (relative to the button)
        const buttonRect = targetButton.getBoundingClientRect();
        const containerRect = chatLog.getBoundingClientRect(); // Use chatLog as reference container

        // Calculate desired position (e.g., above the button)
        // EnsureoffsetHeight is calculated *after* display is set to block
        const pickerHeight = emojiPicker.offsetHeight;
        let top = buttonRect.top - containerRect.top - pickerHeight - 10 + chatLog.scrollTop;
        let left = buttonRect.left - containerRect.left + 5; // Align left edge slightly offset

        // Adjust if it goes off-screen vertically (place below if needed)
        if (top < chatLog.scrollTop + 5) { // Too close to top edge of scrollable area
            top = buttonRect.bottom - containerRect.top + 10 + chatLog.scrollTop; // Position below button
        }

         // Adjust if it goes off-screen horizontally
         const pickerWidth = emojiPicker.offsetWidth;
         if (left < 5) { // Too close to left edge
             left = 5;
         } else if (left + pickerWidth > chatLog.clientWidth - 5) { // Too close to right edge
             left = chatLog.clientWidth - pickerWidth - 5;
         }

        emojiPicker.style.top = `${top}px`;
        emojiPicker.style.left = `${left}px`;
        // No need to focus the picker itself typically
    }
}

export function closeEmojiPicker() {
    if (emojiPicker) {
        emojiPicker.style.display = 'none';
    }
    currentEmojiPickerTargetButton = null; // Clear the target button reference
}

// --- Reply Input Area ---
export function addReplyInputArea(targetMessageElement, handleSendReplyCallback) {
    removeReplyInputArea(); // Remove any existing reply area first
    closeEmojiPicker(); // Close emoji picker if open

    const container = document.createElement('div');
    container.classList.add('reply-input-container');
    container.dataset.replyTargetId = targetMessageElement.id; // Store target ID

    const input = document.createElement('input');
    input.type = 'text';
    input.classList.add('reply-input');
    input.placeholder = `Reply to Miko...`;
    input.setAttribute('aria-label', 'Reply input');

    const sendButton = document.createElement('button');
    sendButton.classList.add('send-reply-button');
    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
    sendButton.setAttribute('aria-label', 'Send reply');

    sendButton.onclick = () => {
        const replyText = input.value.trim();
        if (replyText) {
            handleSendReplyCallback(targetMessageElement.id, replyText);
            removeReplyInputArea(); // Remove after sending
        }
    };

    input.onkeydown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendButton.click(); // Trigger send on Enter
        } else if (event.key === 'Escape') {
            removeReplyInputArea(); // Close on Escape
        }
    };

    container.appendChild(input);
    container.appendChild(sendButton);

    // Insert below the target AI message element
    targetMessageElement.parentNode.insertBefore(container, targetMessageElement.nextSibling);
    input.focus(); // Focus the input field
    currentReplyInputArea = container; // Track the new input area
}

export function removeReplyInputArea() {
    if (currentReplyInputArea && currentReplyInputArea.parentNode) {
        currentReplyInputArea.parentNode.removeChild(currentReplyInputArea);
        currentReplyInputArea = null;
    }
}

// --- Input Area State ---
export function setInputAreaDisabled(disabled, isRecording = false) {
    messageInput.disabled = disabled;
    sendButton.disabled = disabled;
    if (micButton) {
        micButton.disabled = disabled || isRecording;
    }
    if (thinkingModeButton) {
        thinkingModeButton.disabled = disabled;
    }
    imageButton.disabled = disabled;
    uploadImageButton.disabled = disabled;

    const inputArea = document.getElementById('input-area');

    const setOpacityAndPointerEvents = (element, isDisabled) => {
        if (element) {
            element.style.opacity = isDisabled ? '0.6' : '1';
            element.style.pointerEvents = isDisabled ? 'none' : 'auto';
        }
    };

     setOpacityAndPointerEvents(inputArea, disabled);

     if (!disabled) {
         if (micButton) {
             micButton.disabled = isRecording;
         }
         if (thinkingModeButton) {
             thinkingModeButton.disabled = false;
         }
         imageButton.disabled = false;
         uploadImageButton.disabled = false;
     }
}

// --- Thinking Mode Button State ---
export function setThinkingModeButtonActive(isActive) {
    if (thinkingModeButton) {
        if (isActive) {
            thinkingModeButton.classList.add('active');
            thinkingModeButton.title = 'Thinking Mode (Active)';
        } else {
            thinkingModeButton.classList.remove('active');
            thinkingModeButton.title = 'Toggle Thinking Mode';
        }
    } else {
        console.warn("Thinking mode button not found in DOM.");
    }
}

// --- Scroll Utility ---
export function scrollToBottom() {
    utilScrollToBottom(chatLog);
}