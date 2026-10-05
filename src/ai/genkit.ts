import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit initialization using Gemini 1.5 Flash-8B.
 * This is the lightest free model available, optimized for speed and efficiency.
 */
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
  ],
  model: 'googleai/gemini-1.5-flash-8b',
});
