'use server';
/**
 * @fileOverview A Genkit flow for generating email communications for a LEO club.
 *
 * - generateCommunication - A function that handles generating an email subject and body from a topic.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { runWithAiFallback } from '@/ai/model-selector';

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
    const systemPrompt = `You are a helpful communication assistant for a LEO Club, a youth community service organization.
        Your tone should be professional, friendly, and encouraging.
        Based on the provided topic, generate a concise and engaging email subject line and a full email body.
        The body should be ready to send, but MUST leave placeholders like "[Event Date]" or "[Location]" if specific details are not provided in the topic.
        Do not include a salutation like "Dear members," as that is already part of the template. Just provide the core message.`;
    
    return runWithAiFallback(
        `Generate an email communication about: ${input.topic}`,
        GenerateCommunicationOutputSchema,
        systemPrompt
    );
  }
);
