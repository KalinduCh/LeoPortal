'use server';

/**
 * @fileOverview A flow that answers questions about the event schedule using natural language.
 *
 * - answerScheduleQuestions - A function that answers questions about the event schedule.
 * - AnswerScheduleQuestionsInput - The input type for the answerScheduleQuestions function.
 * - AnswerScheduleQuestionsOutput - The return type for the answerScheduleQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerScheduleQuestionsInputSchema = z.object({
  question: z.string().describe('The question about the event schedule.'),
  events: z.string().describe('The list of upcoming events.'),
});
export type AnswerScheduleQuestionsInput = z.infer<typeof AnswerScheduleQuestionsInputSchema>;

const AnswerScheduleQuestionsOutputSchema = z.object({
  answer: z.string().describe('The answer to the question about the event schedule.'),
});
export type AnswerScheduleQuestionsOutput = z.infer<typeof AnswerScheduleQuestionsOutputSchema>;

export async function answerScheduleQuestions(input: AnswerScheduleQuestionsInput): Promise<AnswerScheduleQuestionsOutput> {
  return answerScheduleQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerScheduleQuestionsPrompt',
  input: {schema: AnswerScheduleQuestionsInputSchema},
  output: {schema: AnswerScheduleQuestionsOutputSchema},
  prompt: `You are an AI assistant that answers questions about the event schedule.

  Use the following information about upcoming events to answer the question.
  Events: {{{events}}}

  Question: {{{question}}}
  Answer: `,
});

const answerScheduleQuestionsFlow = ai.defineFlow(
  {
    name: 'answerScheduleQuestionsFlow',
    inputSchema: AnswerScheduleQuestionsInputSchema,
    outputSchema: AnswerScheduleQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
