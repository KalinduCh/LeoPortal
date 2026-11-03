'use server';
/**
 * @fileOverview AI Model Selector for Gemini 1.5 Flash using the stable Free Tier API.
 */

import { z } from 'zod';

const MODEL_NAME = "gemini-1.5-flash";
const API_VERSION = "v1beta";
const BASE_URL = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent`;

/**
 * Executes an AI operation using the standard generateContent API with retry logic.
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

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: `${systemPrompt ? `SYSTEM: ${systemPrompt}\n\n` : ''}USER: ${prompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching this description: ${outputSchema.description || 'data structure'}. Do not include markdown formatting.` }]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
        }
    };

    const resultText = await callGeminiWithRetry(requestBody);
    return parseModelOutput(resultText, outputSchema);
}

/**
 * Reliable wrapper for calling Gemini with retry logic.
 */
export async function callGeminiWithRetry(requestBody: any): Promise<string> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error("AI Configuration Error: Missing API Key.");

    let lastError = null;
    const delays = [0, 2000, 4000];

    for (let attempt = 0; attempt < delays.length; attempt++) {
        if (delays[attempt] > 0) {
            await new Promise(r => setTimeout(r, delays[attempt]));
        }

        try {
            const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (response.status === 429) {
                throw new Error("AI Assistant limit reached. Please try again later.");
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `AI Service Error: HTTP ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            
            if (!text && data.promptFeedback?.blockReason) {
                throw new Error(`AI blocked the response: ${data.promptFeedback.blockReason}`);
            }

            return text;

        } catch (error: any) {
            if (error.message.includes("limit reached") || error.message.includes("Missing API Key")) {
                throw error; 
            }
            lastError = error;
            console.warn(`[Gemini Attempt ${attempt + 1}] failed:`, error.message);
        }
    }

    throw lastError || new Error("AI Assistant currently unavailable.");
}

/**
 * Stable bridge for LEO AI text chat
 */
export async function callGeminiSimple(prompt: string, systemPrompt?: string): Promise<string> {
    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: `${systemPrompt ? `SYSTEM: ${systemPrompt}\n\n` : ''}${prompt}` }]
            }
        ]
    };
    return callGeminiWithRetry(requestBody);
}

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