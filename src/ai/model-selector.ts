/**
 * @fileOverview Centralized Gemini AI Model Selector and Executor.
 * Handles the migration to the Interactions API and implements robust retry logic.
 */

const MODEL_NAME = "gemini-3.8-flash";

/**
 * Helper to wait for a specific duration.
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes a call to the Gemini Interactions API with a 3-attempt retry strategy.
 * Specifically handles 503 Service Unavailable and "high demand" errors.
 */
export async function callGeminiWithRetry(prompt: string, systemInstruction?: string): Promise<string> {
  const API_KEY = process.env.GOOGLE_GENAI_API_KEY;

  if (!API_KEY) {
    throw new Error("AI Assistant Configuration Error: Missing API Key.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${API_KEY}`;
  
  // Combine system instruction and prompt for the Interactions API simple structure
  const combinedInput = systemInstruction 
    ? `INSTRUCTIONS: ${systemInstruction}\n\nUSER REQUEST: ${prompt}`
    : prompt;

  const payload = {
    model: MODEL_NAME,
    input: combinedInput,
  };

  let lastError: any = null;
  const backoffs = [0, 2000, 4000]; // 0ms (first try), 2s, 4s

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (backoffs[attempt] > 0) {
        await wait(backoffs[attempt]);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check for rate limits (429)
        if (response.status === 429) {
          throw new Error("AI Assistant limit reached. Please try again later.");
        }

        // Check for temporary capacity/demand issues (503 or specific message)
        const errorMsg = data.error?.message || "";
        const isTemporary = response.status === 503 || errorMsg.includes("high demand") || errorMsg.includes("busy");

        if (isTemporary && attempt < 2) {
          console.warn(`Gemini busy (Attempt ${attempt + 1}). Retrying...`);
          continue; // Retry logic
        }

        // Permanent errors (400, 401, 403, 404 or exhausted retries)
        if (isTemporary) {
          throw new Error("AI Assistant is temporarily busy due to high demand. Please try again shortly.");
        }
        
        throw new Error(data.error?.message || `Gemini API Error: ${response.status}`);
      }

      // Successful response extraction
      // The interactions API usually returns the text in a 'text' or 'output' field
      return data.text || data.output || "";

    } catch (error: any) {
      lastError = error;
      
      // If it's a permanent error we defined above, don't retry
      if (error.message.includes("limit reached") || error.message.includes("busy") || error.message.includes("Configuration Error")) {
        throw error;
      }
      
      if (attempt === 2) break;
    }
  }

  throw lastError || new Error("AI Assistant failed to respond. Please try again.");
}
