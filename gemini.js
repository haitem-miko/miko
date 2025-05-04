import { geminiApiKey } from 'config.js';

// Keywords to trigger Gemini search
const REALTIME_KEYWORDS = [
    'latest news', 'current events', 'stock price', 'weather in', 'forecast for',
    'sports score', 'live score', 'current time', 'what is happening', 'right now',
    'today\'s date', 'current temperature', 'exchange rate', 'latest update', 'breaking news'
];

// Function to check if a message likely requires real-time data
export function shouldUseGemini(message) {
    if (!geminiApiKey) return false; // Don't use if key is missing

    const lowerCaseMessage = message.toLowerCase();
    return REALTIME_KEYWORDS.some(keyword => lowerCaseMessage.includes(keyword));
}

// Function to fetch data from Gemini API
// NOTE: This assumes a websim capability similar to OpenAI's chat completion.
// The actual Gemini API might have a different structure or require a different websim function.
// Replace 'gemini-pro' with the appropriate model identifier if needed.
export async function fetchRealtimeData(query) {
    if (!geminiApiKey || !websim?.chat?.completions?.create) {
        console.error("Gemini API key missing or websim chat completion function not available.");
        throw new Error("Real-time search functionality is not configured or available.");
    }

    const systemPrompt = `You are a helpful assistant specialized in providing real-time information. Answer the user's query accurately and concisely based on the latest available data. If you cannot find the information, state that clearly. Query: ${query}`;

    try {
        // IMPORTANT: This assumes websim.chat.completions.create can handle Gemini models.
        // You might need to adjust the model name or use a different websim function
        // if websim provides a dedicated Gemini interface (e.g., websim.gemini.generateContent).
        const completion = await websim.chat.completions.create({
            // model: 'gemini-pro', // Hypothetical model name - adjust if needed
             messages: [
                // { role: "system", content: systemPrompt }, // System prompts might work differently with Gemini
                { role: "user", content: query } // Send the user query directly
            ],
            // Add any Gemini-specific parameters here if necessary
            // Example (hypothetical): safetySettings, generationConfig etc.
             // --- Using a placeholder system prompt approach if direct model isn't available ---
             // If websim doesn't have a direct Gemini model switch, we might use the default
             // model but guide it with a stronger system prompt for real-time tasks.
             messages: [
                 { role: "system", content: `You are an AI assistant connected to real-time data sources. Prioritize providing the most current and accurate information available for the following user query. If you cannot access live data for this specific query, clearly state that.` },
                 { role: "user", content: query }
             ]
        });

        if (!completion || !completion.content) {
            throw new Error("Received an empty or invalid response from the real-time search API.");
        }

        return completion.content;

    } catch (error) {
        console.error("Error fetching real-time data from Gemini API:", error);
        // Rethrow or return a specific error message
        throw new Error(`Failed to fetch real-time data: ${error.message}`);
    }
}