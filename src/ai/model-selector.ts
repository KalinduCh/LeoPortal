
'use server';
/**
 * @fileOverview AI Model Selector and Discovery Service.
 * 
 * This service handles dynamic discovery of available Gemini models to avoid 404 errors
 * and ensures only free-tier (Flash) models are used.
 */

import { z } from 'zod';

const ModelSchema = z.object({
  name: z.string(),
  supportedGenerationMethods: z.array(z.string()),
});

const ModelsResponseSchema = z.object({
  models: z.array(ModelSchema),
});

// Singleton cache for the selected model name to avoid redundant API calls
let cachedModelName: string | null = null;

/**
 * Dynamically retrieves the best available free Gemini model from the Google AI API.
 * This satisfies the requirement to avoid hardcoded model names and 404 errors.
 */
export async function getBestFreeModel(): Promise<string> {
  if (cachedModelName) return cachedModelName;

  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENAI_API_KEY is missing in server environment.");
  }

  try {
    // Requirement 3: Use the Gemini Models API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("AI Configuration Error: Invalid or unauthorized API Key.");
        }
        if (response.status === 429) {
            throw new Error("AI Assistant limit reached. Please try again later.");
        }
        throw new Error(`AI Service Error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const parsed = ModelsResponseSchema.safeParse(data);

    if (!parsed.success) {
        throw new Error("AI Service Error: Invalid response structure from models registry.");
    }

    // Requirement 4: Identify a currently available Gemini Flash model that supports generateContent
    const candidates = parsed.data.models.filter(m => 
        m.supportedGenerationMethods.includes('generateContent') && 
        m.name.toLowerCase().includes('flash')
    );

    if (candidates.length === 0) {
        throw new Error("AI Assistant limit reached. Please try again later. (No suitable free models found)");
    }

    // We pick the first suitable candidate (e.g., gemini-1.5-flash)
    const selected = candidates[0].name.replace('models/', '');
    cachedModelName = selected;
    
    console.log(`[AI Model Selector] Discovered and selected model: ${selected}`);
    return selected;
  } catch (error: any) {
    console.error("AI_MODEL_DISCOVERY_FAILURE:", error);
    throw error;
  }
}

/**
 * Forces a refresh of the model cache and re-queries the API.
 */
export async function refreshModelCache(): Promise<string> {
  cachedModelName = null;
  return getBestFreeModel();
}

/**
 * Higher-order function to execute AI operations with automatic 404 fallback and error translation.
 */
export async function runWithAiFallback<T>(
    operation: (modelName: string) => Promise<T>
): Promise<T> {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        try {
            const modelName = await getBestFreeModel();
            // Genkit expects the provider prefix
            return await operation(`googleai/${modelName}`);
        } catch (error: any) {
            attempts++;
            
            // Extract status code from various error formats (SDK vs REST)
            const status = error.status || error.code || 
                          (error.message?.includes('404') ? 404 : 
                           error.message?.includes('429') ? 429 : 
                           error.message?.includes('401') ? 401 : 500);
            
            if (status === 429) {
                throw new Error("AI Assistant limit reached. Please try again later.");
            }

            if (status === 404) {
                console.warn(`[AI Fallback] Model not found (404). Refreshing list and retrying...`);
                await refreshModelCache();
                if (attempts < maxAttempts) continue;
            }

            if (status === 401 || status === 403) {
                throw new Error("AI Assistant unauthorized. Please check API key configuration.");
            }

            // For other errors, re-throw a clean message
            throw new Error(error.message || "AI Assistant currently unavailable. Please try again later.");
        }
    }
    throw new Error("AI Assistant currently unavailable. Please try again later.");
}
