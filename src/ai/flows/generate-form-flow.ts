'use server';
/**
 * @fileOverview A Genkit flow for generating a structured form schema from text, descriptions, or vision analysis.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  photoDataUri: z.string().optional().describe('A photo or PDF of a form to analyze (optional).'),
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

const prompt = ai.definePrompt({
  name: 'generateFormPrompt',
  input: {schema: GenerateFormInputSchema},
  output: {schema: GenerateFormOutputSchema},
  prompt: `You are an expert form designer for a LEO Club. 
Your task is to analyze the user's input and generate a professional, structured form schema.

Use the following guidelines:
1. Identify the most appropriate field type for each question (e.g., "Email" -> text/email, "Select one" -> radio, "Selection list" -> select).
2. Generate helpful placeholders and descriptions where appropriate.
3. Organize the form logically with headers and dividers if necessary.
4. For "Upload" or "CV" fields, use the 'file' type.

User Prompt: {{{prompt}}}
{{#if photoDataUri}}
Analyze the provided image to extract questions, types, and options:
{{media url=photoDataUri}}
{{/if}}`,
});

const generateFormFlow = ai.defineFlow(
  {
    name: 'generateFormFlow',
    inputSchema: GenerateFormInputSchema,
    outputSchema: GenerateFormOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
