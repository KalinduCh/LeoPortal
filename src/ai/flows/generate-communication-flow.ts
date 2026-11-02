'use server';
/**
 * @fileOverview A flow for generating email communications using Gemini 3.8 Flash via Interactions API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { callGeminiWithRetry } from '@/ai/model-selector';

const GenerateCommunicationInputSchema = z.object({
  topic: z.string().describe('The topic or purpose of the email communication.'),
});
export type GenerateCommunicationInput = z.infer<typeof GenerateCommunicationInputSchema>;

const GenerateCommunicationOutputSchema = z.object({
  subject: z.string().describe('The generated subject line for the email.'),
  body: z.string().describe('The generated body content for the email.'),
});
export type GenerateCommunicationOutput = z.infer<typeof GenerateCommunicationOutputSchema>;

export async function generateCommunication(input: GenerateCommunicationInput): Promise<GenerateCommunicationOutput> {
  return generateCommunicationFlow(input);
}

const generateCommunicationFlow = ai.defineFlow(
  {
    name: 'generateCommunicationFlow',
    inputSchema: GenerateCommunicationInputSchema,
    outputSchema: GenerateCommunicationOutputSchema,
  },
  async (input) => {
    const system = `You are a helpful communication assistant for a LEO Club.
    Your tone is professional, friendly, and encouraging.
    Generate a JSON object with "subject" and "body" keys based on the topic: ${input.topic}.
    Leave placeholders like "[Event Date]" for missing details.
    Return ONLY valid raw JSON.`;

    const prompt = `Generate an email communication about: ${input.topic}`;

    try {
      const responseText = await callGeminiWithRetry(prompt, system);
      
      // Extract JSON from potential markdown wrapping
      const cleanJson = responseText.replace(/```json|```/gi, '').trim();
      return JSON.parse(cleanJson);
    } catch (error: any) {
      console.error("GENKIT_GENERATION_FAILURE:", error);
      throw new Error(error.message || "Failed to generate draft.");
    }
  }
);
