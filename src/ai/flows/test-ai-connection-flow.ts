'use server';
/**
 * @fileOverview A simple flow to verify the Gemini AI connection status.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { runWithAiFallback } from '@/ai/model-selector';

const TestAiConnectionInputSchema = z.string();
const TestAiConnectionOutputSchema = z.object({
    message: z.string()
});

/**
 * Server action to verify the AI connection.
 * Requirement 15: "Test the integration with a simple request"
 */
export async function testAiConnection(): Promise<string> {
  const result = await testAiConnectionFlow("Verify connection");
  return result.message;
}

const testAiConnectionFlow = ai.defineFlow(
  {
    name: 'testAiConnectionFlow',
    inputSchema: TestAiConnectionInputSchema,
    outputSchema: TestAiConnectionOutputSchema,
  },
  async () => {
    return runWithAiFallback(
        "Reply with: Gemini connection successful.",
        TestAiConnectionOutputSchema,
        "You are a verification assistant. Respond only with the requested confirmation message in JSON."
    );
  }
);
