import * as DOM from './dom.js';
import { hideImagePromptArea } from './imagePromptUI.js'; // Import hide function

let chatSessions = [];
let currentSessionIndex = null;

export function getChatSessions() {
    return chatSessions;
}

export function getCurrentSessionIndex() {
    return currentSessionIndex;
}

export function setCurrentSessionIndex(index) {
    currentSessionIndex = index;
}

// Helper to generate unique IDs
function generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function saveCurrentChat(conversationHistory) {
    // Ensure history exists and has content other than maybe an initial greeting or just an image request
    const meaningfulHistory = conversationHistory.filter(msg =>
        !(msg.role === 'assistant' && msg.content?.startsWith("Hi, I'm Miko!")) &&
        !(msg.role === 'user' && msg.content?.toLowerCase().startsWith("generate")) // Exclude simple generation requests
    );
    if (!meaningfulHistory || meaningfulHistory.length === 0) {
        // If it's an existing session with history, save the (now potentially empty) history
        if (currentSessionIndex !== null && chatSessions[currentSessionIndex]) {
            // Ensure all remaining messages (like greeting) have IDs
            const historyWithIds = conversationHistory.map(msg => ({ ...msg, id: msg.id || generateMessageId() }));
            chatSessions[currentSessionIndex].history = historyWithIds;
            persistChatSessions(); // Save the potentially emptied history
        }
        // Don't save truly empty new chats or chats only containing a generation request
        return;
    }

    let title = chatSessions[currentSessionIndex]?.title || "New Chat";
    // Determine if title needs generating/updating
    let needsTitleUpdate = (currentSessionIndex === null || !chatSessions[currentSessionIndex]?.title || chatSessions[currentSessionIndex]?.title === "New Chat");

    // Ensure all messages have IDs before saving
    const historyWithIds = conversationHistory.map(msg => ({ ...msg, id: msg.id || generateMessageId() }));

    if (needsTitleUpdate) {
        // Try to find the first *meaningful* message for the title
        const firstMeaningfulMessage = historyWithIds.find(m =>
            (m.role === 'user' && !m.content.toLowerCase().startsWith("generate")) || // User text (not gen command)
            (m.role === 'assistant' && m.type === 'image') || // Single generated image
            (m.role === 'assistant' && m.type === 'image-gallery') // Generated image gallery
        );

        if (firstMeaningfulMessage) {
            if (firstMeaningfulMessage.role === 'user') {
                // Use user's first text message
                title = firstMeaningfulMessage.content.substring(0, 30) + (firstMeaningfulMessage.content.length > 30 ? '...' : '');
            } else { // It's an image or gallery from assistant
                // Use prompt, style, and indicate gallery if applicable
                const typeIndicator = firstMeaningfulMessage.type === 'image-gallery' ? 'Gallery' : 'Image';
                title = `${typeIndicator} (${firstMeaningfulMessage.style || 'Std'}): ${firstMeaningfulMessage.prompt?.substring(0, 15) ?? ''}...`;
            }
        } else {
            // Fallback to first assistant text message if no user input/images yet (excluding greeting)
            // Also exclude the newly added textual content for image galleries from being the title
            const firstAssistantTextMessage = historyWithIds.find(m => m.role === 'assistant' && !m.type && !m.content?.startsWith("Hi, I'm Miko!") && !m.content?.startsWith("[Generated"));
            if (firstAssistantTextMessage) {
                title = firstAssistantTextMessage.content.substring(0, 30) + (firstAssistantTextMessage.content.length > 30 ? '...' : '');
            } else {
                // Very fallback case (e.g., only greeting or generation commands followed by errors)
                const firstUserCommand = historyWithIds.find(m => m.role === 'user');
                title = firstUserCommand ? firstUserCommand.content.substring(0, 30) + '...' : "Chat"; // Use command text if available
            }
        }
    }

    if (currentSessionIndex === null) {
        // Create a new session
        const newSession = {
            id: Date.now().toString(), // Unique ID for the session itself
            title: title,
            history: historyWithIds, // Use history with guaranteed IDs
        };
        chatSessions.push(newSession);
        currentSessionIndex = chatSessions.length - 1;
    } else {
        // Update existing session
        if (currentSessionIndex >= 0 && currentSessionIndex < chatSessions.length) {
            chatSessions[currentSessionIndex].history = historyWithIds; // Update history
            // Update title only if it was newly generated or was "New Chat"
            if (needsTitleUpdate || chatSessions[currentSessionIndex].title === "New Chat") {
                chatSessions[currentSessionIndex].title = title;
            }
        } else {
            console.error("Invalid currentSessionIndex on save:", currentSessionIndex);
            // Attempt to recover by creating a new session instead of updating invalid index
            currentSessionIndex = null;
            saveCurrentChat(conversationHistory); // Recursive call to create new session
            return; // Exit to avoid double saving/persisting
        }
    }
    persistChatSessions(); // Save to localStorage
}

export function loadChat(index, conversationHistoryRef, callbacks) { 
    if (index < 0 || index >= chatSessions.length) {
        console.error("Attempted to load invalid chat index:", index);
        return null; // Indicate failure
    }

    const {
        stopTTS, stopSpeech, updateChatListCallback, setInputDisabledCallback,
        hideMobileSidebarCallback, addAiMsgCallback, addUserMsgCallback,
        scrollToBottomCallback 
    } = callbacks;

    // Stop ongoing activities before loading
    stopTTS();
    stopSpeech();

    currentSessionIndex = index;
    const loadedSession = chatSessions[index];
    // Ensure history exists and make a copy to avoid modifying the stored version directly during render
    const loadedHistory = loadedSession.history ? [...loadedSession.history] : [];
    DOM.chatLog.innerHTML = ''; // Clear the display

    // Ensure all loaded messages have IDs (migration for older saves)
    const historyWithIds = loadedHistory.map(msg => ({ ...msg, id: msg.id || generateMessageId() }));
    chatSessions[index].history = historyWithIds; // Update the stored session too, ensuring IDs are persistent

    // --- Render messages from loaded history ---
    historyWithIds.forEach(message => {
        const messageId = message.id; // Use the guaranteed ID

        if (message.role === 'user') {
            let originalTextForReply = 'Original message context missing'; // Default quote text
            if (message.replyToId) {
                // Find the original message *within the loaded history* to quote
                const originalMsg = historyWithIds.find(m => m.id === message.replyToId);
                if (originalMsg) {
                    // Generate appropriate quote text based on the original message type
                    if (originalMsg.type === 'image') {
                        originalTextForReply = `[Image: ${originalMsg.prompt || 'generated image'}] (Style: ${originalMsg.style || 'default'}, Ratio: ${originalMsg.aspectRatio || '1:1'})`;
                    } else if (originalMsg.type === 'image-gallery') {
                        // Use the prompt and metadata, not the textual 'content' field meant for API
                        originalTextForReply = `[Image Gallery: ${originalMsg.prompt || 'generated images'}] (Style: ${originalMsg.style || 'default'})`;
                    } else {
                        originalTextForReply = originalMsg.content; // Use text content for standard messages
                    }
                }
                // Call the specific add user message callback provided by chat.js, including reply info
                addUserMsgCallback(message.content, message.replyToId, originalTextForReply);
            } else {
                // Use the standard user message callback (no reply info)
                addUserMsgCallback(message.content);
            }
        } else if (message.role === 'assistant') {
            let contentToAdd = message.content; // Default to text content

            if (message.type === 'image') {
                // Create single image element for display
                const imageElement = document.createElement('img');
                // The URL is now stored in message.urls[0] or similar if single images follow gallery pattern,
                // but assuming it might still be in 'content' for older/simpler single image logic. Adjust if needed.
                imageElement.src = message.content || (message.urls && message.urls[0]);
                // Use more descriptive alt text
                imageElement.alt = `Generated Image (Style: ${message.style || 'default'}, Ratio: ${message.aspectRatio || '1:1'}): ${message.prompt || 'Unknown Prompt'}`;
                // Class is added by addAiMessageWrapper now
                contentToAdd = imageElement;
            } else if (message.type === 'image-gallery') {
                // Create the gallery container and images using the 'urls' array
                const galleryContainer = document.createElement('div');
                galleryContainer.classList.add('multi-image-container');
                if (Array.isArray(message.urls)) {
                    message.urls.forEach(url => {
                        const imageElement = document.createElement('img');
                        imageElement.src = url;
                        // Use more descriptive alt text
                        imageElement.alt = `Generated Image (Gallery - Style: ${message.style || 'default'}, Ratio: ${message.aspectRatio || '1:1'}): ${message.prompt || 'Unknown Prompt'}`;
                        imageElement.classList.add('generated-chat-image'); // Add class for styling/lightbox
                        galleryContainer.appendChild(imageElement);
                    });
                } else {
                    // Handle cases where urls might be missing or invalid
                    galleryContainer.textContent = "[Image gallery data missing]";
                }
                // Set the container as the content to add, ignoring the textual 'content' field for display
                contentToAdd = galleryContainer;
            }
            // Use the AI message callback passed from chat.js
            // addAiMessageWrapper handles adding the correct classes/buttons/content now
            // For text messages, contentToAdd will be the string; for images/galleries, it's the generated HTMLElement
            addAiMsgCallback(contentToAdd, messageId);
        }
        // Ignore other roles like 'system' for display during load
    });

    scrollToBottomCallback(); // Scroll to the end after loading
    setInputDisabledCallback(false); // Re-enable input area
    hideImagePromptArea(); // Hide image prompt area on load
    updateChatListCallback(); // Update sidebar selection highlighting
    hideMobileSidebarCallback(); // Close mobile sidebar if open

    return historyWithIds; // Return the processed history (with guaranteed IDs)
}

// --- Update Chat List Display ---
export function updateChatList(loadChatCallback) {
    DOM.chatList.innerHTML = ''; // Clear existing list

    // Sort sessions by ID (timestamp) descending for newest first
    const sortedSessions = [...chatSessions].sort((a, b) => {
        // Ensure IDs are treated as numbers for sorting
        const idA = parseInt(a?.id || '0');
        const idB = parseInt(b?.id || '0');
        return idB - idA;
    });

    sortedSessions.forEach((session) => {
        // Skip rendering if session is somehow invalid
        if (!session || !session.id) return;

        // Find the original index in the unsorted array for loading
        const originalIndex = chatSessions.findIndex(s => s.id === session.id);
        if (originalIndex === -1) return; // Skip if somehow not found (shouldn't happen)

        const listItem = document.createElement('li');
        const displayTitle = session.title || `Chat ${session.id}`; // Fallback title using ID
        // Truncate long titles for display
        listItem.textContent = displayTitle.length > 25 ? displayTitle.substring(0, 22) + '...' : displayTitle;
        listItem.title = displayTitle; // Show full title on hover
        listItem.dataset.index = originalIndex; // Store original index for loading

        // Highlight the currently selected chat
        if (originalIndex === currentSessionIndex) {
            listItem.classList.add('selected-chat');
        }

        // Click listener to load the chat
        listItem.addEventListener('click', () => {
            if (originalIndex !== currentSessionIndex) {
                loadChatCallback(originalIndex); // Call the load function passed from chat.js
            } else {
                // If clicking the already selected chat on mobile, just close the sidebar
                if (window.innerWidth <= 768) {
                    hideMobileSidebarCallback(); // Use the passed callback if available
                }
            }
        });
        DOM.chatList.appendChild(listItem);
    });

    // Show/hide the "Previous Chats" heading based on list content
    const heading = DOM.sidebar.querySelector('h3');
    if (heading) {
        heading.style.display = chatSessions.length > 0 ? 'block' : 'none';
    }
}

// --- Persistence ---
function persistChatSessions() {
    try {
        // Prune potentially invalid sessions before saving
        const validSessions = chatSessions.filter(session => session && session.id && Array.isArray(session.history));
        if (validSessions.length !== chatSessions.length) {
            console.warn("Attempted to save invalid chat session data. Pruning invalid entries.");
            chatSessions = validSessions; // Update the main array
            // Adjust currentSessionIndex if it pointed to a removed session
            if (currentSessionIndex !== null && currentSessionIndex >= chatSessions.length) {
                currentSessionIndex = chatSessions.length > 0 ? 0 : null; // Default to first or null
                console.warn("Current session index adjusted after pruning.");
            }
        }

        localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
        // Save index only if it's a valid number within bounds
        const indexToSave = (currentSessionIndex !== null && currentSessionIndex >= 0 && currentSessionIndex < chatSessions.length)
            ? currentSessionIndex.toString()
            : '';
        localStorage.setItem('currentSessionIndex', indexToSave);

    } catch (e) {
        console.error("Failed to save chat sessions to localStorage:", e);
        // Provide more specific feedback for quota errors
        if (e.name === 'QuotaExceededError' || (e.message && e.message.toLowerCase().includes('quota'))) {
            alert("Could not save chat history. Browser storage limit reached. Older chats might be lost if you continue or refresh.");
            // Potential future enhancement: implement logic here to prune oldest chats automatically.
            // For now, we just warn the user.
        } else {
            alert("An error occurred while trying to save chat history.");
        }
    }
}

export function loadChatSessionsFromStorage() {
    try {
        const savedSessions = localStorage.getItem('chatSessions');
        const savedIndex = localStorage.getItem('currentSessionIndex');

        let loadedSessions = [];
        if (savedSessions) {
            loadedSessions = JSON.parse(savedSessions);
            // Validate loaded sessions and ensure messages have IDs
            loadedSessions = loadedSessions.filter(session => session && session.id && Array.isArray(session.history)); // Basic validation
            loadedSessions.forEach(session => {
                session.history = session.history.map(msg => {
                    const newMsg = { ...msg, id: msg.id || generateMessageId() };
                    // Ensure 'urls' exists as an array for galleries if missing (backward compatibility)
                    if (newMsg.type === 'image-gallery' && !Array.isArray(newMsg.urls)) {
                        newMsg.urls = []; // Initialize as empty array
                        console.warn(`Corrected missing/invalid 'urls' field for image gallery message ID: ${newMsg.id} in session ${session.id}`);
                    }
                    return newMsg;
                });
            });
        }
        chatSessions = loadedSessions; // Assign validated and processed sessions

        let indexToLoad = null;
        if (savedIndex && savedIndex !== '' && chatSessions.length > 0) {
            const index = parseInt(savedIndex, 10);
            // Validate the loaded index against the *actually loaded* sessions
            if (!isNaN(index) && index >= 0 && index < chatSessions.length) {
                indexToLoad = index;
            } else {
                console.warn("Loaded session index was invalid or out of bounds, defaulting to newest valid chat or null.");
                indexToLoad = chatSessions.length > 0 ? 0 : null; // Index 0 corresponds to the latest after sorting in updateChatList
            }
        } else if (chatSessions.length > 0) {
            // If no index saved, but sessions exist, default to newest (index 0 after sort)
            indexToLoad = 0;
        }

        currentSessionIndex = indexToLoad; // Set the current index based on load outcome/validation
        return { sessions: chatSessions, indexToLoad: currentSessionIndex };

    } catch (e) {
        console.error("Failed to load chat sessions from localStorage:", e);
        // Clear potentially corrupted data and start fresh
        chatSessions = [];
        currentSessionIndex = null;
        try { // Wrap localStorage access in try...catch during error handling too
            localStorage.removeItem('chatSessions');
            localStorage.removeItem('currentSessionIndex');
        } catch (removeError) {
            console.error("Failed to clear corrupted localStorage items:", removeError);
        }
        alert("Failed to load previous chat sessions. Starting with a fresh session.");
        return { sessions: [], indexToLoad: null }; // Return empty state
    }
}