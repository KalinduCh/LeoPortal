
'use server';
/**
 * @fileOverview A Genkit flow for generating email communications for a LEO club.
 *
 * - generateCommunication - A function that handles generating an email subject and body from a topic.
 * - GenerateCommunicationInput - The input type for the generateCommunication function.
 * - GenerateCommunicationOutput - The return type for the generateCommunication function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCommunicationInputSchema = z.object({
  topic: z.string().describe('The topic or purpose of the email communication.'),
});
export type GenerateCommunicationInput = z.infer<typeof GenerateCommunicationInputSchema>;

const GenerateCommunicationOutputSchema = z.object({
  subject: z.string().describe('The generated subject line for the email.'),
  body: z
    .string()
    .describe('The generated body content for the email.'),
});
export type GenerateCommunicationOutput = z.infer<typeof GenerateCommunicationOutputSchema>;

export async function generateCommunication(
  input: GenerateCommunicationInput
): Promise<GenerateCommunicationOutput> {
  return generateCommunicationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCommunicationPrompt',
  input: {schema: GenerateCommunicationInputSchema},
  output: {schema: GenerateCommunicationOutputSchema},
  prompt: `You are a helpful communication assistant for a LEO Club, a youth community service organization.
Your tone should be professional, friendly, and encouraging.
Based on the following topic, generate a concise and engaging email subject line and a full email body.
The body should be ready to send, but leave placeholders like "[Event Date]" or "[Location]" if specific details are not provided in the topic.
Do not include a salutation like "Dear members," as that is already part of the template. Just provide the core message.

Topic: {{{topic}}}
`,
});

const generateCommunicationFlow = ai.defineFlow(
  {
    name: 'generateCommunicationFlow',
    inputSchema: GenerateCommunicationInputSchema,
    outputSchema: GenerateCommunicationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
