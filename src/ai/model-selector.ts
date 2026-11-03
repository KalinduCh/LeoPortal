
'use server';
/**
 * @fileOverview AI Model Selector for Gemini 3.8 Flash using Interactions API.
 * Includes robust retry logic and exponential backoff for high-demand scenarios.
 */

import { z } from 'zod';

const MODEL_NAME = "gemini-3.8-flash";
const API_VERSION = "v1beta";
const INTERACTIONS_URL = `https://generativelanguage.googleapis.com/${API_VERSION}/interactions`;

/**
 * Executes an AI operation using the Interactions API with exponential backoff retry.
 */
export async function runWithAiFallback<T>(
    prompt: string,
    outputSchema: z.ZodSchema<T>,
    systemPrompt?: string
): Promise<T> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        throw new Error("AI Configuration Error: Missing API Key.");
    }

    // Interactions API is a single string input. We inject instructions into the user prompt.
    const enhancedPrompt = `${systemPrompt ? `SYSTEM: ${systemPrompt}\n\n` : ''}USER: ${prompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching this description: ${outputSchema.description || 'data structure'}. Do not include markdown formatting or extra text.`;

    const resultText = await callGeminiWithRetry(enhancedPrompt);
    return parseModelOutput(resultText, outputSchema);
}

/**
 * Reliable wrapper for calling Gemini with retry logic.
 */
export async function callGeminiWithRetry(prompt: string, systemPrompt?: string): Promise<string> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error("AI Configuration Error: Missing API Key.");

    const input = systemPrompt ? `SYSTEM: ${systemPrompt}\n\nUSER: ${prompt}` : prompt;
    
    let lastError = null;
    const delays = [0, 2000, 4000]; // 0ms (immediate), 2s, 4s

    for (let attempt = 0; attempt < delays.length; attempt++) {
        if (delays[attempt] > 0) {
            await new Promise(r => setTimeout(r, delays[attempt]));
        }

        try {
            const response = await fetch(`${INTERACTIONS_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    input: input
                }),
            });

            if (response.status === 429) {
                throw new Error("AI Assistant limit reached. Please try again later.");
            }

            // Retry for 503 or 404 (if model is temporarily down) or specific capacity messages
            if (response.status === 503 || response.status === 500) {
                lastError = new Error("AI Assistant is temporarily busy due to high demand. Please try again shortly.");
                continue;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `AI Service Error: HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Check for high-demand message inside successful response if applicable
            const text = data.output || data.response || data.text || "";
            if (text.toLowerCase().includes("high demand") || text.toLowerCase().includes("try again later")) {
                lastError = new Error("AI Assistant is temporarily busy due to high demand. Please try again shortly.");
                continue;
            }

            return text;

        } catch (error: any) {
            if (error.message.includes("limit reached") || error.message.includes("Missing API Key")) {
                throw error; // Don't retry these
            }
            lastError = error;
            console.warn(`[Gemini Attempt ${attempt + 1}] failed:`, error.message);
        }
    }

    throw lastError || new Error("AI Assistant currently unavailable.");
}

/**
 * Robust JSON extraction and validation.
 */
function parseModelOutput<T>(text: string, schema: z.ZodSchema<T>): T {
    if (!text) throw new Error("AI Service Error: Empty response from model.");

    try {
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return schema.parse(parsed);
    } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return schema.parse(parsed);
            } catch (innerE) {}
        }
        throw new Error("AI Assistant returned an invalid format. Please try re-phrasing your request.");
    }
}
