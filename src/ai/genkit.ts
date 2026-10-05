
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit initialization.
 * Dynamic model selection is now handled via the model-selector service
 * to ensure compatibility with the Google AI Free Tier and avoid 404 errors.
 */
if (!process.env.GOOGLE_GENAI_API_KEY && typeof window === 'undefined') {
  console.warn("⚠️ WARNING: GOOGLE_GENAI_API_KEY is not set. AI features will fail on the server.");
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
  ],
  // Default model removed to favor dynamic discovery in flows.
});
