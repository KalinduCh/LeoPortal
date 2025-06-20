'use server';
/**
 * @fileOverview This file defines a Genkit flow for answering questions about how to update a user profile.
 *
 * - answerProfileUpdateQuestions - A function that handles answering questions about updating a user profile.
 * - AnswerProfileUpdateQuestionsInput - The input type for the answerProfileUpdateQuestions function.
 * - AnswerProfileUpdateQuestionsOutput - The return type for the answerProfileUpdateQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerProfileUpdateQuestionsInputSchema = z.object({
  question: z
    .string()
    .describe('The question about how to update the user profile.'),
});
export type AnswerProfileUpdateQuestionsInput = z.infer<
  typeof AnswerProfileUpdateQuestionsInputSchema
>;

const AnswerProfileUpdateQuestionsOutputSchema = z.object({
  answer: z.string().describe('The answer to the question.'),
});
export type AnswerProfileUpdateQuestionsOutput = z.infer<
  typeof AnswerProfileUpdateQuestionsOutputSchema
>;

export async function answerProfileUpdateQuestions(
  input: AnswerProfileUpdateQuestionsInput
): Promise<AnswerProfileUpdateQuestionsOutput> {
  return answerProfileUpdateQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerProfileUpdateQuestionsPrompt',
  input: {schema: AnswerProfileUpdateQuestionsInputSchema},
  output: {schema: AnswerProfileUpdateQuestionsOutputSchema},
  prompt: `You are a helpful AI assistant. A user will ask you a question about how to update their profile.

  Question: {{{question}}}

  Answer in a concise and easy-to-understand manner.
  `,
});

const answerProfileUpdateQuestionsFlow = ai.defineFlow(
  {
    name: 'answerProfileUpdateQuestionsFlow',
    inputSchema: AnswerProfileUpdateQuestionsInputSchema,
    outputSchema: AnswerProfileUpdateQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
