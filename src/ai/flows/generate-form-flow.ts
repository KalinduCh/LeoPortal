'use server';
/**
 * @fileOverview A flow for generating a structured form schema using Gemini 3.8 Flash via Interactions API.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { callGeminiWithRetry } from '@/ai/model-selector';

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
  title: z.string(),
  description: z.string(),
  components: z.array(FormComponentSchema),
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
  async (input) => {
    const system = `You are an expert form designer for a LEO Club.
    Generate a JSON object for a form with "title", "description", and an array of "components".
    Return ONLY valid raw JSON.`;

    const prompt = `Create a form based on: ${input.prompt}`;

    try {
      const responseText = await callGeminiWithRetry(prompt, system);
      const cleanJson = responseText.replace(/```json|```/gi, '').trim();
      return JSON.parse(cleanJson);
    } catch (error: any) {
      console.error("FORM_GEN_FAILURE:", error);
      throw new Error(error.message || "Failed to generate form schema.");
    }
  }
);
