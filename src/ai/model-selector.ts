'use server';
/**
 * @fileOverview AI Model Selector with Dynamic Discovery and Automatic Fallback.
 * Ensures 100% Free Tier compatibility by querying available models at runtime.
 */

import { z } from 'zod';

const API_VERSION = "v1beta";
let cachedModel: string | null = null;
let lastDiscoveryTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Fetches the best available Flash model for the provided API key.
 */
async function discoverBestModel(apiKey: string): Promise<string> {
    const now = Date.now();
    if (cachedModel && (now - lastDiscoveryTime < CACHE_DURATION)) {
        return cachedModel;
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`Model Discovery Failed: HTTP ${response.status}`);
        }

        const data = await response.json();
        const availableModels = data.models || [];

        // Priority: 1. gemini-1.5-flash, 2. gemini-1.5-flash-latest, 3. Any other Flash model
        const candidates = availableModels.filter((m: any) => 
            m.supportedGenerationMethods.includes('generateContent') && 
            m.name.toLowerCase().includes('flash')
        );

        if (candidates.length === 0) {
            throw new Error("No compatible Free Tier models found for this API key.");
        }

        // Prefer 1.5 Flash as it's the most stable for JSON
        const best = candidates.find((c: any) => c.name.includes('gemini-1.5-flash')) || candidates[0];
        
        cachedModel = best.name; // This is usually in the format "models/gemini-1.5-flash"
        lastDiscoveryTime = now;
        
        console.log(`[LEO AI] Discovered best model: ${cachedModel}`);
        return cachedModel;
    } catch (error: any) {
        console.error("MODEL_DISCOVERY_ERROR:", error.message);
        return "models/gemini-1.5-flash"; // Fallback to common alias
    }
}

/**
 * Executes an AI operation using dynamic model selection and retry logic.
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

    const modelName = await discoverBestModel(apiKey);
    
    // Ensure we don't have double "models/" in the URL
    const cleanModelPath = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
    const baseUrl = `https://generativelanguage.googleapis.com/${API_VERSION}/${cleanModelPath}:generateContent?key=${apiKey}`;

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

    const resultText = await callGeminiWithRetry(baseUrl, requestBody);
    return parseModelOutput(resultText, outputSchema);
}

/**
 * Reliable wrapper for calling Gemini with retry logic for capacity spikes.
 */
export async function callGeminiWithRetry(url: string, requestBody: any): Promise<string> {
    let lastError = null;
    const delays = [0, 2000, 4000];

    for (let attempt = 0; attempt < delays.length; attempt++) {
        if (delays[attempt] > 0) {
            await new Promise(r => setTimeout(r, delays[attempt]));
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (response.status === 404) {
                // Model alias might have changed, clear cache and fail this attempt to retry discovery
                cachedModel = null;
                throw new Error("Model alias not found. Retrying discovery...");
            }

            if (response.status === 429) {
                throw new Error("AI Assistant limit reached. Please try again later.");
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const message = errData.error?.message || `AI Service Error: HTTP ${response.status}`;
                
                // If it's a "High Demand" error, we retry
                if (message.includes("high demand") || response.status === 503) {
                    throw new Error(message);
                }
                
                // Otherwise, it's a fatal error (400, 401, 403)
                throw new Error(`FATAL: ${message}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            
            if (!text && data.promptFeedback?.blockReason) {
                throw new Error(`AI blocked the response: ${data.promptFeedback.blockReason}`);
            }

            return text;

        } catch (error: any) {
            if (error.message.includes("limit reached") || error.message.includes("FATAL")) {
                throw error; 
            }
            lastError = error;
            console.warn(`[Gemini Attempt ${attempt + 1}] failed:`, error.message);
        }
    }

    throw lastError || new Error("AI Assistant is temporarily busy due to high demand. Please try again shortly.");
}

/**
 * Stable bridge for LEO AI text chat
 */
export async function callGeminiSimple(prompt: string, systemPrompt?: string): Promise<string> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error("AI Configuration Error: Missing API Key.");

    const modelName = await discoverBestModel(apiKey);
    const cleanModelPath = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
    const url = `https://generativelanguage.googleapis.com/${API_VERSION}/${cleanModelPath}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [{ text: `${systemPrompt ? `SYSTEM: ${systemPrompt}\n\n` : ''}${prompt}` }]
            }
        ]
    };
    return callGeminiWithRetry(url, requestBody);
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
