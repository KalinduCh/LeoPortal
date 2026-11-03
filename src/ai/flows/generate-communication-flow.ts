'use server';
/**
 * @fileOverview A flow for generating email communications using Gemini 3.8 Flash via Interactions API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
    if (!process.env.GOOGLE_GENAI_API_KEY) {
      throw new Error("AI Configuration Error: GOOGLE_GENAI_API_KEY is not set in the server environment.");
    }

    try {
      const response = await ai.generate({
        system: `You are a helpful communication assistant for a LEO Club, a youth community service organization.
        Your tone should be professional, friendly, and encouraging.
        Based on the provided topic, generate a concise and engaging email subject line and a full email body.
        The body should be ready to send, but MUST leave placeholders like "[Event Date]" or "[Location]" if specific details are not provided in the topic.
        Do not include a salutation like "Dear members," as that is already part of the template. Just provide the core message.`,
        prompt: `Generate an email communication about: ${input.topic}`,
        output: {
          schema: GenerateCommunicationOutputSchema,
        },
      });

      if (!response.output) {
        throw new Error("The AI model was unable to generate a structured response for this topic.");
      }

      return response.output;
    } catch (error: any) {
      console.error("GENKIT_GENERATION_FAILURE:", error);
      // Propagate a clean error message to the client
      throw new Error(error.message || "Failed to generate a draft. Please try again with a more specific topic.");
    }
  }
);
