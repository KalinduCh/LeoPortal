'use server';
/**
 * @fileOverview AI Model Selector and Discovery Service.
 * 
 * Migrated to Google's recommended Interactions API using the gemini-3.8-flash model.
 */

import { z } from 'zod';

const MODEL_NAME = "gemini-3.8-flash";
const API_VERSION = "v1beta";
const INTERACTIONS_URL = `https://generativelanguage.googleapis.com/${API_VERSION}/interactions`;

/**
 * Higher-order function to execute AI operations using the Interactions API.
 * This ensures the application remains on the FREE tier with the latest model.
 */
export async function runWithAiFallback<T>(
    prompt: string,
    outputSchema: z.ZodSchema<T>,
    systemPrompt?: string
): Promise<T> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_GENAI_API_KEY is missing in server environment.");
    }

    // Enhance prompt to request structured JSON output
    const enhancedPrompt = `${systemPrompt ? `SYSTEM: ${systemPrompt}\n\n` : ''}USER: ${prompt}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching this description: ${outputSchema.description || 'data structure'}. Do not include markdown formatting or extra text.`;

    try {
        const response = await fetch(`${INTERACTIONS_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL_NAME,
                input: enhancedPrompt
            }),
        });

        if (response.status === 429) {
            throw new Error("AI Assistant limit reached. Please try again later.");
        }

        if (response.status === 404) {
            console.error(`[AI Selector] Model ${MODEL_NAME} not found. Attempting discovery fallback...`);
            return await handleDiscoveryFallback(enhancedPrompt, outputSchema);
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `AI Service Error: HTTP ${response.status}`);
        }

        const data = await response.json();
        // The Interactions API usually returns the model's text in an 'output' or 'response' field.
        const rawText = data.output || data.response || data.text || "";
        
        return parseModelOutput(rawText, outputSchema);
    } catch (error: any) {
        console.error("AI_INTEGRATION_FAILURE:", error);
        throw new Error(error.message || "AI Assistant currently unavailable. Please try again later.");
    }
}

/**
 * Fallback logic if the primary model is unavailable.
 * Requirement 9: choose another available FREE Flash model.
 */
async function handleDiscoveryFallback<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!modelsResponse.ok) throw new Error("AI Service Error: Failed to retrieve models registry.");
    
    const data = await modelsResponse.json();
    const candidates = data.models?.filter((m: any) => 
        m.supportedGenerationMethods.includes('generateContent') && 
        m.name.toLowerCase().includes('flash')
    ) || [];

    if (candidates.length === 0) throw new Error("AI Assistant limit reached. Please try again later.");

    const fallbackModel = candidates[0].name.replace('models/', '');
    console.log(`[AI Fallback] Using discovered model: ${fallbackModel}`);

    // Fallback uses the older generateContent API as interactions is model-specific
    const genResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        }),
    });

    if (!genResponse.ok) throw new Error("AI Fallback Service Error.");

    const genData = await genResponse.json();
    const fallbackText = genData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    return parseModelOutput(fallbackText, schema);
}

/**
 * Robust JSON extraction and validation.
 */
function parseModelOutput<T>(text: string, schema: z.ZodSchema<T>): T {
    if (!text) throw new Error("AI Service Error: Empty response from model.");

    try {
        // Attempt direct parse
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return schema.parse(parsed);
    } catch (e) {
        // Fallback: extract JSON with regex if model included chatter
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
