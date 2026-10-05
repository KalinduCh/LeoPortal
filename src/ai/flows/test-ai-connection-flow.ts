
'use server';
/**
 * @fileOverview A simple flow to verify the Gemini AI connection status.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { runWithAiFallback } from '@/ai/model-selector';

const TestAiConnectionInputSchema = z.string();
const TestAiConnectionOutputSchema = z.string();

/**
 * Server action to verify the AI connection.
 * Requirement 15: "Test the integration with a simple request"
 */
export async function testAiConnection(): Promise<string> {
  return testAiConnectionFlow("Verify connection");
}

const testAiConnectionFlow = ai.defineFlow(
  {
    name: 'testAiConnectionFlow',
    inputSchema: TestAiConnectionInputSchema,
    outputSchema: TestAiConnectionOutputSchema,
  },
  async () => {
    return runWithAiFallback(async (model) => {
      const response = await ai.generate({
        model,
        prompt: "Reply with: Gemini connection successful.",
      });
      return response.text;
    });
  }
);
