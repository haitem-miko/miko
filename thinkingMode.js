import * as DOM from './dom.js';
import { addSystemMessage } from './systemMessages.js';

let isThinkingModeActive = false;

export function toggleThinkingMode() {
    isThinkingModeActive = !isThinkingModeActive;
    DOM.setThinkingModeButtonActive(isThinkingModeActive);
    console.log("Thinking Mode:", isThinkingModeActive ? "ON" : "OFF");
    addSystemMessage(`Thinking Mode ${isThinkingModeActive ? 'activated' : 'deactivated'}.`, 'system-notification', 2000);
}

export function isActive() {
    return isThinkingModeActive;
}

export const THINKING_START_DELIMITER = "[THINKING_PROCESS_START]";
export const THINKING_END_DELIMITER = "[THINKING_PROCESS_END]";

export function getThinkingProcessPrompt(originalPrompt) {
    if (!isThinkingModeActive) {
        return originalPrompt;
    }
    // Instruct the model to perform the reasoning and wrap it, but explicitly state NOT to include the final answer here.
    return `${originalPrompt}\n\n[Instruction: Thinking Mode is active. You MUST ONLY output your step-by-step thinking process or reasoning to arrive at the answer. Use headings, bullet points, or numbered lists for clarity. Surround your entire thinking process output with the delimiters ${THINKING_START_DELIMITER} and ${THINKING_END_DELIMITER}. DO NOT include the final answer in this response. The final answer will be requested in a subsequent step.]`;
}

export function getFinalAnswerPrompt(originalPrompt) {
    // Instruct the model to ONLY output the conclusion derived from the previous step. Be very strict.
    return `${originalPrompt}\n\n[Instruction: You have just completed a thinking process for the user's request. Based *strictly* on the conclusion reached during that thinking process (which you should recall but not repeat here), provide ONLY the final, concise answer. Do not add any conversational filler, introductory phrases (like "The final answer is:", "Based on my reasoning:", etc.), explanations, or summaries. Output *only* the answer itself.]`;
}