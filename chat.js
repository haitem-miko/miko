import { apiKey, elevenLabsApiKey, geminiApiKey } from 'config.js';
import * as DOM from './dom.js';
import { setupSpeechRecognition, stopRecording, toggleRecording, getIsRecording } from './speech.js';
import { playTextToSpeech, stopTTSPlayback, getCurrentAudioState } from './tts.js';
import { saveCurrentChat, loadChat, updateChatList, loadChatSessionsFromStorage, getCurrentSessionIndex, setCurrentSessionIndex } from './session.js';
import { generateImage } from './imageGeneration.js'; 
import { setupImagePromptUI, hideImagePromptArea, getImagePromptData } from './imagePromptUI.js';
import { setupImageUpload, hideImageUploadArea } from './imageUpload.js'; 
import { setupMobileUIListeners, hideMobileSidebar } from './mobileUI.js';
import { setupLightboxListeners } from './lightbox.js';
import { scrollToBottom as smoothScrollToBottom } from './utils.js';
import * as ThinkingMode from './thinkingMode.js';
import { shouldUseGemini, fetchRealtimeData } from './gemini.js';
import { addSystemMessage, removeSystemMessages, clearThinkingMessage } from './systemMessages.js';
import { showSubscriptionPlans, setActivationCallback } from './subscriptionUI.js';
import { subscriptionManager } from './subscription.js';

let conversationHistory = [];
let autoPlayTTSAfterResponse = false;

const MAIN_SYSTEM_PROMPT = `You are Miko, a friendly and helpful assistant developed by Haitham Hamzawi's team. You answer all questions concisely and directly. Your name is Miko. If the user sends only an emoji, acknowledge it with a brief, relevant text response (e.g., 'Got it!', 'Okay!', 'Interesting!', 'Oh dear.') without repeating the emoji itself. For other messages, you may optionally start or end your response with a *different* single emoji that reflects the sentiment of the user's last message (e.g., 😊 for positive, 😂 for funny, 🤔 for thoughtful, 😞 for sad). Do not simply echo back the user's emoji if they sent one.`;
const REPLY_SYSTEM_PROMPT = `You are Miko, a friendly and helpful assistant. The user is replying to one of your previous messages. Use the context of your previous message (provided below) and the user's reply to respond relevantly. If the user's reply is only an emoji, acknowledge it with a brief, relevant text response (e.g., 'Got it!', 'Okay!', 'Interesting!', 'Oh dear.') without repeating the emoji itself. For other replies, you may optionally start or end your response with a *different* single emoji that reflects the sentiment of the user's reply (e.g., 😊 for positive, 😂 for funny, 🤔 for thoughtful, 😞 for sad). Do not simply echo back the user's emoji if they sent one.`;
const IMAGE_ANALYSIS_PROMPT = `You are Miko, a vision-enabled assistant who can see and understand images. Analyze the image the user uploaded based on their specific question or request. Be detailed, accurate, and helpful in your response. You can describe objects, people, text, colors, activities, or any visual elements in the image that are relevant to the user's query. For factual or technical questions, be precise. For creative requests like "tell a story about this image," be engaging and imaginative while staying grounded in what you can actually see.`;

function initializeApp() {
    setupSpeechRecognition({
        onStartRecording: () => console.log('Callback: Recording started'),
        onStopRecording: () => {
            console.log('Callback: Recording stopped');
            DOM.setInputAreaDisabled(false, false); 
        },
        onResult: (transcript) => console.log('Callback: Speech result:', transcript),
        onError: (error) => {
            console.log('Callback: Speech error:', error);
            DOM.setInputAreaDisabled(false, false); 
        }
    });
    setupEventListeners();
    DOM.setupEmojiPicker();
    setupImagePromptUI(triggerImageGeneration); 
    setupImageUpload(handleImageAnalysis);
    setupMobileUIListeners();
    setupLightboxListeners();

    const { sessions, indexToLoad } = loadChatSessionsFromStorage();
    updateChatListWrapper(); 

    if (indexToLoad !== null && sessions[indexToLoad]) {
        loadChatWrapper(indexToLoad); 
    } else {
        setCurrentSessionIndex(null); 
        startNewChat(false); 
    }

    hideMobileSidebar(); 
    DOM.setInputAreaDisabled(false, getIsRecording()); 
    DOM.setThinkingModeButtonActive(ThinkingMode.isActive()); 
    document.addEventListener('click', handleGlobalClickForClosables); 
    updateSubscriptionUI();
}

function setupEventListeners() {
    DOM.sendButton.addEventListener('click', () => {
        autoPlayTTSAfterResponse = false; 
        sendMessage();
    });

    DOM.messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); 
            autoPlayTTSAfterResponse = false; 
            sendMessage();
        } else if (event.key === 'Escape') {
            DOM.removeReplyInputArea();
            DOM.closeEmojiPicker();
            hideImagePromptArea();
            hideImageUploadArea();
        }
    });

    DOM.newChatButton.addEventListener('click', () => startNewChat(true)); 

    if (DOM.micButton) {
        DOM.micButton.addEventListener('click', () => {
            toggleRecording(
                getCurrentAudioState, 
                () => { 
                    autoPlayTTSAfterResponse = true; 
                    DOM.removeReplyInputArea();
                    DOM.closeEmojiPicker();
                    hideImagePromptArea();
                    hideImageUploadArea();
                }
            );
        });
    }

    if (DOM.thinkingModeButton) {
        DOM.thinkingModeButton.addEventListener('click', () => {
            ThinkingMode.toggleThinkingMode(); 
            DOM.removeReplyInputArea();
            DOM.closeEmojiPicker();
            hideImagePromptArea();
            hideImageUploadArea();
        });
    }

    const subscriptionButton = document.getElementById('subscription-button');
    if (subscriptionButton) {
        subscriptionButton.addEventListener('click', () => {
            showSubscriptionPlans();
            hideMobileSidebar();
        });
    }
}

async function handleImageAnalysis(imageDataUrl, question) {
    DOM.addUserImageMessage(imageDataUrl, question);
    
    const messageId = generateMessageId();
    conversationHistory.push({
        id: messageId,
        role: "user",
        content: question,
        hasImage: true,
        imageDataUrl: imageDataUrl
    });
    
    saveCurrentChatWrapper();
    updateChatListWrapper();
    
    DOM.setInputAreaDisabled(true, getIsRecording());
    clearThinkingMessage();
    DOM.showTypingIndicator();
    
    addSystemMessage("Miko is analyzing the image...");
    
    try {
        if (typeof websim === 'undefined' || !websim.chat || !websim.chat.completions) {
            throw new Error("Chat service (websim.chat.completions) is not available.");
        }
        
        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: IMAGE_ANALYSIS_PROMPT },
                { 
                    role: "user", 
                    content: [
                        { type: "text", text: question },
                        { type: "image_url", image_url: { url: imageDataUrl } }
                    ]
                }
            ]
        });
        
        const response = completion.content;
        const responseId = generateMessageId();
        
        clearThinkingMessage();
        DOM.hideTypingIndicator();
        
        const aiMessageElement = addAiMessageWrapper(response, responseId);
        
        conversationHistory.push({
            id: responseId,
            role: "assistant",
            content: response,
            source: "openai",
            inResponseToImage: true
        });
        
        saveCurrentChatWrapper();
        updateChatListWrapper();
        
    } catch (error) {
        console.error("Error analyzing image:", error);
        clearThinkingMessage();
        DOM.hideTypingIndicator();
        addAiMessageWrapper(`Sorry, I encountered an error analyzing the image: ${error.message}`, generateMessageId());
    } finally {
        if (!getCurrentAudioState() && !getIsRecording()) {
            DOM.setInputAreaDisabled(false, false);
        }
        smoothScrollToBottom(DOM.chatLog);
    }
}

function loadChatWrapper(index) {
    const loadedHistory = loadChat(index, conversationHistory, { 
        stopTTS: stopTTSPlayback,
        stopSpeech: stopRecording,
        updateChatListCallback: updateChatListWrapper, 
        setInputDisabledCallback: (disabled) => DOM.setInputAreaDisabled(disabled, getIsRecording()), 
        hideMobileSidebarCallback: hideMobileSidebar, 
        addAiMsgCallback: (content, id) => addAiMessageWrapper(content, id), 
        addUserMsgCallback: (message, replyToId, originalText) => { 
            if (replyToId && originalText) {
                DOM.addUserReplyMessage(message, replyToId, originalText);
            } else {
                DOM.addUserMessage(message);
            }
        },
        scrollToBottomCallback: () => smoothScrollToBottom(DOM.chatLog), 
        handleReplyClickCallback: handleReplyClick, 
        handleEmojiClickCallback: handleEmojiClick 
    });
    if (loadedHistory) {
        conversationHistory = loadedHistory; 
    }
    DOM.removeReplyInputArea();
    DOM.closeEmojiPicker();
    hideImagePromptArea();
    hideImageUploadArea();
}

function updateChatListWrapper() {
    updateChatList(loadChatWrapper); 
}

function startNewChat(clearSessions = true) { 
    setCurrentSessionIndex(null); 
    conversationHistory = []; 
    DOM.chatLog.innerHTML = ''; 
    DOM.messageInput.value = ''; 
    hideImagePromptArea(); 
    hideImageUploadArea();
    stopTTSPlayback(); 
    if (getIsRecording()) {
        stopRecording(); 
    }
    DOM.removeReplyInputArea(); 
    DOM.closeEmojiPicker(); 
    sendInitialGreeting(); 
    updateChatListWrapper(); 
    hideMobileSidebar(); 
    DOM.setInputAreaDisabled(false, false); 
}

function generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function triggerImageGeneration() {
    DOM.removeReplyInputArea(); 
    DOM.closeEmojiPicker(); 
    const { prompt, style, aspectRatio } = getImagePromptData(); 
    if (!prompt) {
        addAiMessageWrapper("Please enter a description for the image you want to create.", `error-${Date.now()}`);
        return; 
    }

    hideImagePromptArea(); 

    await generateImage(
        prompt,
        style,
        aspectRatio,
        conversationHistory, 
        getCurrentSessionIndex, 
        (disabled) => DOM.setInputAreaDisabled(disabled, getIsRecording()), 
        addAiMessageWrapper, 
        saveCurrentChatWrapper, 
        updateChatListWrapper 
    );
}

export async function sendMessage() {
    const messageText = DOM.messageInput.value.trim();
    if (!messageText) return; 

    stopTTSPlayback();
    DOM.removeReplyInputArea();
    DOM.closeEmojiPicker();
    hideImagePromptArea();
    hideImageUploadArea();

    const messageId = generateMessageId();
    DOM.addUserMessage(messageText);
    DOM.messageInput.value = ''; 
    const newMessage = { id: messageId, role: "user", content: messageText };
    conversationHistory.push(newMessage);
    saveCurrentChatWrapper(); 
    updateChatListWrapper(); 

    DOM.setInputAreaDisabled(true, getIsRecording());
    clearThinkingMessage(); 
    DOM.showTypingIndicator();

    try {
        if (shouldUseGemini(messageText)) { 
            await handleRealtimeSearch(messageText);
        } else if (ThinkingMode.isActive()) { 
            await handleThinkingModeChat();
        } else { 
            await handleStandardChat();
        }
    } catch (error) {
        console.error("Error during message processing:", error);
        DOM.hideTypingIndicator(); 
        addAiMessageWrapper(`Sorry, an internal error occurred: ${error.message}`, generateMessageId());
    } finally {
        if (!getCurrentAudioState() && !getIsRecording()) {
            DOM.setInputAreaDisabled(false, false);
        }
        smoothScrollToBottom(DOM.chatLog); 
        autoPlayTTSAfterResponse = false; 
    }
}

async function handleRealtimeSearch(query) {
    addSystemMessage("Searching for real-time information..."); 
    try {
        const geminiResponse = await fetchRealtimeData(query); 
        removeSystemMessages('.system-message:not(.system-notification)'); 
        DOM.hideTypingIndicator(); 
        const responseId = generateMessageId();
        addAiMessageWrapper(geminiResponse, responseId); 
        conversationHistory.push({ id: responseId, role: "assistant", content: geminiResponse, source: "gemini" });
        saveCurrentChatWrapper(); 
        updateChatListWrapper(); 

        if (autoPlayTTSAfterResponse && typeof geminiResponse === 'string') {
            await tryAutoPlayTTS(geminiResponse, responseId);
        }
    } catch (error) {
        console.error("Gemini search failed:", error);
        removeSystemMessages('.system-message:not(.system-notification)'); 
        DOM.hideTypingIndicator(); 
        addAiMessageWrapper(`Sorry, I couldn't fetch the real-time information: ${error.message}`, generateMessageId());
    } finally {
    }
}

async function handleStandardChat() {
    addSystemMessage("Miko is thinking..."); 
    const historyToSend = conversationHistory.slice(-20);
    const systemPrompt = MAIN_SYSTEM_PROMPT; 

    try {
        if (typeof websim === 'undefined' || !websim.chat || !websim.chat.completions) {
            throw new Error("Chat service (websim.chat.completions) is not available.");
        }
        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                ...historyToSend.map(({ id, replyToId, source, type, style, prompt, aspectRatio, urls, ...rest }) => rest),
            ],
        });

        const response = completion.content;
        const responseId = generateMessageId();

        clearThinkingMessage();
        DOM.hideTypingIndicator(); 
        const aiMessageElement = addAiMessageWrapper(response, responseId); 

        conversationHistory.push({ id: responseId, role: "assistant", content: response, source: "openai" });
        saveCurrentChatWrapper(); 
        updateChatListWrapper(); 

        if (autoPlayTTSAfterResponse && response && typeof response === 'string') {
            await tryAutoPlayTTS(response, responseId, aiMessageElement);
        }
    } catch (error) {
        console.error("Error calling the language model:", error);
        clearThinkingMessage(); 
        DOM.hideTypingIndicator(); 
        addAiMessageWrapper(`Sorry, I encountered an error: ${error.message}`, generateMessageId());
    } finally {
    }
}

async function handleThinkingModeChat() {
    addSystemMessage("Miko is thinking deeply..."); 
    const historyToSend = conversationHistory.slice(-20); 

    try {
        const thinkingPrompt = ThinkingMode.getThinkingProcessPrompt(MAIN_SYSTEM_PROMPT); 
        if (typeof websim === 'undefined' || !websim.chat || !websim.chat.completions) {
             throw new Error("Chat service (websim.chat.completions) is not available.");
        }
        const thinkingCompletion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: thinkingPrompt },
                ...historyToSend.map(({ id, replyToId, source, type, style, prompt, aspectRatio, urls, ...rest }) => rest),
            ],
        });

        let thinkingResponse = thinkingCompletion.content;
        clearThinkingMessage(); 

        const startIdx = thinkingResponse.indexOf(ThinkingMode.THINKING_START_DELIMITER);
        const endIdx = thinkingResponse.indexOf(ThinkingMode.THINKING_END_DELIMITER);
        let reasoning = "Could not extract reasoning.";
        if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
            reasoning = thinkingResponse.substring(startIdx + ThinkingMode.THINKING_START_DELIMITER.length, endIdx).trim();
        } else {
             reasoning = thinkingResponse; 
        }
        DOM.hideTypingIndicator(); 
        DOM.addThinkingBox(reasoning);

        DOM.showTypingIndicator(); 
        addSystemMessage("Formulating final answer..."); 
        try {
            const finalAnswerPrompt = ThinkingMode.getFinalAnswerPrompt(MAIN_SYSTEM_PROMPT);
            if (typeof websim === 'undefined' || !websim.chat || !websim.chat.completions) {
                 throw new Error("Chat service (websim.chat.completions) is not available.");
            }
            const finalAnswerCompletion = await websim.chat.completions.create({
                 messages: [
                     { role: "system", content: finalAnswerPrompt },
                     ...historyToSend.map(({ id, replyToId, source, type, style, prompt, aspectRatio, urls, ...rest }) => rest),
                 ],
            });

            const finalAnswer = finalAnswerCompletion.content;
            const finalAnswerId = generateMessageId();

            clearThinkingMessage();
            DOM.hideTypingIndicator(); 
            const aiMessageElement = addAiMessageWrapper(finalAnswer, finalAnswerId); 

            conversationHistory.push({ id: finalAnswerId, role: "assistant", content: finalAnswer, source: "openai" });
            saveCurrentChatWrapper(); 
            updateChatListWrapper(); 

            if (autoPlayTTSAfterResponse && finalAnswer && typeof finalAnswer === 'string') {
                 await tryAutoPlayTTS(finalAnswer, finalAnswerId, aiMessageElement);
            }

        } catch (error) {
            console.error("Error getting final answer:", error);
            clearThinkingMessage(); 
            DOM.hideTypingIndicator(); 
            addAiMessageWrapper(`Sorry, I encountered an error formulating the final answer: ${error.message}`, generateMessageId());
        } finally {
        }
    } catch (error) {
        console.error("Error getting thinking process:", error);
        clearThinkingMessage(); 
        DOM.hideTypingIndicator(); 
        addAiMessageWrapper(`Sorry, I encountered an error during the thinking phase: ${error.message}`, generateMessageId());
        return; 
    }

}

async function tryAutoPlayTTS(textToPlay, responseId, aiMessageElement = null) {
    const containsTextRegex = /\p{L}|\p{N}/u;
    if (containsTextRegex.test(textToPlay)) {
        const targetElement = aiMessageElement || document.getElementById(responseId);
        const ttsButton = targetElement?.querySelector('.tts-button'); 
        if (ttsButton) {
            await playTextToSpeechWrapper(textToPlay, ttsButton, true);
        } else {
            console.warn("TTS button not found for auto-play on message:", responseId);
            DOM.setInputAreaDisabled(false, getIsRecording()); 
        }
    } else {
        DOM.setInputAreaDisabled(false, getIsRecording()); 
    }
}

function handleReplyClick(event) {
    const button = event.target.closest('.reply-button');
    if (!button) return; 
    const messageId = button.dataset.messageId; 
    const targetMessageElement = document.getElementById(messageId); 
    if (targetMessageElement) {
        stopTTSPlayback(); 
        if (getIsRecording()) stopRecording(); 
        DOM.closeEmojiPicker(); 
        hideImagePromptArea(); 
        hideImageUploadArea();
        DOM.addReplyInputArea(targetMessageElement, sendReplyMessage);
    } else {
        console.error("Could not find target message element for ID:", messageId);
    }
}

function handleEmojiClick(buttonElement) { 
    DOM.toggleEmojiPicker(buttonElement);
    DOM.removeReplyInputArea();
    hideImagePromptArea();
    hideImageUploadArea();
}

async function sendReplyMessage(originalMessageId, replyText) {
    if (!replyText) return; 

    stopTTSPlayback();
    DOM.closeEmojiPicker();
    clearThinkingMessage(); 

    const originalMessage = conversationHistory.find(m => m.id === originalMessageId);
    if (!originalMessage || originalMessage.role !== 'assistant') {
        console.error("Original AI message not found in history for ID:", originalMessageId);
        addSystemMessage("Error: Could not find the AI message being replied to.");
        return;
    }

    const replyMessageId = generateMessageId();
    let originalContentForDisplay = originalMessage.content;
    if (originalMessage.type === 'image') {
        originalContentForDisplay = `[Image: ${originalMessage.prompt || 'generated image'}] (${originalMessage.style || 'Standard'})`;
    } else if (originalMessage.type === 'image-gallery') {
        originalContentForDisplay = `[Image Gallery: ${originalMessage.prompt || 'generated images'}] (${originalMessage.style || 'Standard'})`;
    }
    DOM.addUserReplyMessage(replyText, originalMessageId, originalContentForDisplay); 

    const newUserReply = {
        id: replyMessageId,
        role: "user",
        content: replyText,
        replyToId: originalMessageId 
    };
    conversationHistory.push(newUserReply); 

    saveCurrentChatWrapper(); 
    updateChatListWrapper(); 

    DOM.setInputAreaDisabled(true, getIsRecording());
    DOM.showTypingIndicator(); 
    addSystemMessage("Miko is thinking...");

    const historyToSend = conversationHistory.slice(-20); 

    let originalMsgContentForContext = "Original message context not found.";
    const originalFoundInContext = historyToSend.find(m => m.id === originalMessageId);
    if (originalFoundInContext) {
         if (originalFoundInContext.type === 'image') {
            originalMsgContentForContext = `[Your previous image: ${originalFoundInContext.prompt || 'generated image'}]`;
        } else if (originalFoundInContext.type === 'image-gallery') {
             originalMsgContentForContext = `[Your previous image gallery: ${originalFoundInContext.prompt || 'generated images'}]`;
        } else {
            originalMsgContentForContext = originalFoundInContext.content;
        }
    }

    const userContextMessage = `(The user is replying to your message: "${originalMsgContentForContext.substring(0, 100)}${originalMsgContentForContext.length > 100 ? '...' : ''}")\n\nUser's reply: ${replyText}`;

    const apiHistory = historyToSend.map(msg => {
        const { id, replyToId, source, type, style, prompt, aspectRatio, urls, ...apiMsg } = msg;
        if (msg.id === replyMessageId) {
            return { role: "user", content: userContextMessage };
        }
        return apiMsg;
    }).filter(msg => msg); 

    const systemPrompt = ThinkingMode.isActive()
        ? ThinkingMode.getThinkingProcessPrompt(REPLY_SYSTEM_PROMPT) 
        : REPLY_SYSTEM_PROMPT; 


    try {
        if (ThinkingMode.isActive()) {
            if (typeof websim === 'undefined' || !websim.chat || !websim.chat.completions) {
                throw new Error("Chat service (websim.chat.completions) is not available.");
            }
            const thinkingCompletion = await websim.chat.completions.create({
                messages: [{ role: "system", content: systemPrompt }, ...apiHistory],
            });
            let thinkingResponse = thinkingCompletion.content;
            clearThinkingMessage(); 
            DOM.hideTypingIndicator(); 

            const startIdx = thinkingResponse.indexOf(ThinkingMode.THINKING_START_DELIMITER);
            const endIdx = thinkingResponse.indexOf(ThinkingMode.THINKING_END_DELIMITER);
            let reasoning = "Could not extract reasoning.";
            if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
                reasoning = thinkingResponse.substring(startIdx + ThinkingMode.THINKING_START_DELIMITER.length, endIdx).trim();
            } else {
                 reasoning = thinkingResponse; 
            }
            DOM.addThinkingBox(reasoning);

            DOM.showTypingIndicator(); 
            addSystemMessage("Formulating final reply...");
            const finalAnswerPrompt = ThinkingMode.getFinalAnswerPrompt(REPLY_SYSTEM_PROMPT);
            const finalAnswerCompletion = await websim.chat.completions.create({
                 messages: [{ role: "system", content: finalAnswerPrompt }, ...apiHistory], 
            });
            const finalAnswer = finalAnswerCompletion.content;
            const finalAnswerId = generateMessageId();
            clearThinkingMessage(); 
            DOM.hideTypingIndicator(); 
            addAiMessageWrapper(finalAnswer, finalAnswerId);
            conversationHistory.push({ id: finalAnswerId, role: "assistant", content: finalAnswer, source: "openai" });
            saveCurrentChatWrapper();
            updateChatListWrapper();

        } else {
            if (typeof websim === 'undefined' || !websim.chat || !websim.chat.completions) {
                 throw new Error("Chat service (websim.chat.completions) is not available.");
             }
            const completion = await websim.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt }, 
                    ...apiHistory
                ],
            });

            const response = completion.content;
            const responseId = generateMessageId();
            clearThinkingMessage();
            DOM.hideTypingIndicator(); 
            addAiMessageWrapper(response, responseId);
            conversationHistory.push({ id: responseId, role: "assistant", content: response, source: "openai" });
            saveCurrentChatWrapper();
            updateChatListWrapper();
        }

    } catch (error) {
        console.error("Error calling the language model for reply:", error);
        clearThinkingMessage(); 
        DOM.hideTypingIndicator(); 
        addAiMessageWrapper(`Sorry, I encountered an error processing the reply: ${error.message}`, generateMessageId());
    } finally {
        if (!getCurrentAudioState() && !getIsRecording()) {
            DOM.setInputAreaDisabled(false, false);
        }
        smoothScrollToBottom(DOM.chatLog); 
    }
}

function handleGlobalClickForClosables(event) {
    const replyContainer = document.querySelector('.reply-input-container');
    if (replyContainer && !replyContainer.contains(event.target) && !event.target.closest('.reply-button')) {
        DOM.removeReplyInputArea();
    }

    if (DOM.emojiPicker && DOM.emojiPicker.style.display === 'block') {
        if (!DOM.emojiPicker.contains(event.target) && !event.target.closest('.emoji-button')) {
            DOM.closeEmojiPicker();
        }
    }

    const imagePromptContainer = document.getElementById('image-prompt-container');
    if (imagePromptContainer && imagePromptContainer.style.display === 'flex') {
         const menuToggle = document.getElementById('menu-toggle-button');
         const imageGenButton = document.getElementById('image-button');
        if (!imagePromptContainer.contains(event.target) &&
            !(imageGenButton && imageGenButton.contains(event.target)) &&
            !(menuToggle && menuToggle.contains(event.target)))
        {
            hideImagePromptArea();
        }
    }
    
    const imageUploadContainer = document.getElementById('image-upload-container');
    if (imageUploadContainer && imageUploadContainer.style.display === 'flex') {
        const menuToggle = document.getElementById('menu-toggle-button');
        const uploadImageButton = document.getElementById('upload-image-button');
        if (!imageUploadContainer.contains(event.target) &&
            !(uploadImageButton && uploadImageButton.contains(event.target)) &&
            !(menuToggle && menuToggle.contains(event.target)))
        {
            hideImageUploadArea();
        }
    }
}

function saveCurrentChatWrapper() {
    if (conversationHistory.length > 0 || getCurrentSessionIndex() !== null) {
        saveCurrentChat(conversationHistory);
    }
}

function addAiMessageWrapper(content, messageId) {
    const playTTSEnabled = !!elevenLabsApiKey; 
    const idToUse = messageId || generateMessageId(); 
    const messageContent = content ?? " "; 

    const isElement = messageContent instanceof HTMLElement;
    let isMediaContent = false;
    if (isElement && (messageContent.tagName === 'IMG' || messageContent.classList.contains('multi-image-container'))) {
        isMediaContent = true;
         if(messageContent.tagName === 'IMG' && !messageContent.classList.contains('generated-chat-image')) {
            messageContent.classList.add('generated-chat-image');
         }
    }

    const msgElement = DOM.addAiMessage(
        messageContent, 
        playTTSEnabled && !isMediaContent, 
        (text, button, disableInputs) => playTextToSpeechWrapper(text, button, disableInputs), 
        idToUse, 
        !isMediaContent ? handleReplyClick : null, 
        !isMediaContent ? handleEmojiClick : null 
    );

    return msgElement; 
}

async function playTextToSpeechWrapper(text, buttonElement, disableInputs) {
    DOM.removeReplyInputArea();
    DOM.closeEmojiPicker();
    hideImagePromptArea();
    hideImageUploadArea();
    await playTextToSpeech(
        text,
        buttonElement,
        disableInputs, 
        (disabled) => DOM.setInputAreaDisabled(disabled, getIsRecording()), 
        getIsRecording, 
        DOM.micButton 
    );
}

function sendInitialGreeting() {
    if (DOM.chatLog.children.length === 0 && getCurrentSessionIndex() === null) {
        const greeting = "Hi, I'm Miko! How can I help you today?";
        const greetingId = generateMessageId();
        const msgElement = addAiMessageWrapper(greeting, greetingId);
        if (!conversationHistory.some(m => m.id === greetingId)) {
            conversationHistory.push({ id: greetingId, role: "assistant", content: greeting });
            // No need to save/update list here, will happen on first user message
        }
    }
}

setActivationCallback(() => {
    // Refresh UI or handle successful activation
    updateSubscriptionUI();
});

function updateSubscriptionUI() {
    const currentPlan = subscriptionManager.getCurrentPlan();
    const subscriptionButton = document.getElementById('subscription-button');
    if (subscriptionButton) {
        subscriptionButton.innerHTML = `<i class="fas fa-crown"></i>${currentPlan.name}`;
    }
}

window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
    clearThinkingMessage(); 
    DOM.hideTypingIndicator(); 
    addSystemMessage(`An unexpected error occurred: ${event.error?.message || 'Unknown error'}. Please try again.`, 'system-notification');
    DOM.setInputAreaDisabled(false, getIsRecording()); 
});
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    clearThinkingMessage(); 
    DOM.hideTypingIndicator(); 
    addSystemMessage(`An unexpected error occurred: ${event.reason?.message || 'Unknown rejection'}. Please try again.`, 'system-notification');
    DOM.setInputAreaDisabled(false, getIsRecording()); 
});

document.addEventListener('DOMContentLoaded', initializeApp);