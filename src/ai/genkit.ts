import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit initialization using Gemini 1.5 Flash.
 * We use the stable 'gemini-1.5-flash' identifier for maximum compatibility.
 */
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
