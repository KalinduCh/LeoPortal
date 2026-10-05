'use server';
/**
 * @fileOverview A Genkit flow for generating a structured form schema.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { runWithAiFallback } from '@/ai/model-selector';

const FormComponentSchema = z.object({
    type: z.enum(['text', 'paragraph', 'number', 'date', 'time', 'select', 'radio', 'checkbox', 'file', 'header', 'divider']),
    label: z.string(),
    required: z.boolean(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
    description: z.string().optional(),
});

const GenerateFormInputSchema = z.object({
  prompt: z.string().describe('The description or list of questions for the form.'),
});
export type GenerateFormInput = z.infer<typeof GenerateFormInputSchema>;

const GenerateFormOutputSchema = z.object({
  title: z.string().describe('A suitable title for the form.'),
  description: z.string().describe('A brief description for the form.'),
  components: z.array(FormComponentSchema).describe('The list of form fields.'),
});
export type GenerateFormOutput = z.infer<typeof GenerateFormOutputSchema>;

export async function generateFormFromAi(input: GenerateFormInput): Promise<GenerateFormOutput> {
  return generateFormFlow(input);
}

const generateFormFlow = ai.defineFlow(
  {
    name: 'generateFormFlow',
    inputSchema: GenerateFormInputSchema,
    outputSchema: GenerateFormOutputSchema,
  },
  async input => {
    const systemPrompt = `You are an expert form designer for a LEO Club. Create a professional, structured form schema based on the input.`;
    return runWithAiFallback(`Build a form structure for: ${input.prompt}`, GenerateFormOutputSchema, systemPrompt);
  }
);
