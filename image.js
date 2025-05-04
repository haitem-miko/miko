// This file might become deprecated or repurposed if all image generation logic
// moves to imageGeneration.js. For now, keep it in case standard generation via
// the "image:" command is still intended separately.

import * as DOM from './dom.js';
import { saveCurrentChat, updateChatList } from './session.js';
import { stopTTSPlayback } from './tts.js';
import { scrollToBottom } from './utils.js';

// --- Image Generation (Potentially moved or deprecated) ---
export async function generateImage(promptSource = 'input', conversationHistoryRef, getCurrentSessionIndex) {
  // ... (Implementation was moved to imageGeneration.js as generateStandardImage) ...
  console.warn("generateImage in image.js might be deprecated. Use generateStandardImage from imageGeneration.js instead.");
}