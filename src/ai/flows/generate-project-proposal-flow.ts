
'use server';
/**
 * @fileOverview A Genkit flow for generating a detailed project proposal from a member's idea, based on a specific club template.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input from the member's form remains the same
const GenerateProjectProposalInputSchema = z.object({
  projectName: z.string().describe('The name of the project.'),
  goal: z.string().describe('The main goal or impact of the project. What problem is it solving?'),
  targetAudience: z.string().describe('The target audience for the project (e.g., community, school, youth).'),
  budget: z.string().describe('The estimated budget range for the project.'),
  timeline: z.string().describe('The preferred timeline for the project (e.g., days, weeks, months).'),
  specialConsiderations: z.string().optional().describe('Any special considerations like partnerships, locations, etc.'),
});
export type GenerateProjectProposalInput = z.infer<typeof GenerateProjectProposalInputSchema>;

// The structured output we want from the AI, based on the new template
const GenerateProjectProposalOutputSchema = z.object({
    projectIdea: z.string().describe("A brief, compelling description of the project idea."),
    
    proposedActionPlan: z.object({
        objective: z.string().describe("The main objective of the project."),
        preEventPlan: z.array(z.string()).describe("A list of tasks to be done before the event."),
        executionPlan: z.array(z.string()).describe("A list of tasks/schedule to be done during the event."),
        postEventPlan: z.array(z.string()).describe("A list of tasks to be done after the event (e.g., cleanup, thank you notes).")
    }).describe("The detailed action plan for the project."),

    implementationChallenges: z.array(z.string()).describe("A list of identified challenges to implementing this project (e.g., monetary, resource personnel)."),
    
    challengeSolutions: z.array(z.string()).describe("A list of proposed solutions for how the project plan addresses the identified challenges."),

    communityInvolvement: z.array(z.string()).describe("A list of ways the benefiting community will be involved in the project."),

    prPlan: z.array(z.object({
        activity: z.string().describe("The PR activity (e.g., Flyer Design, Social Media Teasers)."),
        date: z.string().describe("The target date or timeframe for the activity."),
        time: z.string().describe("The target time for the activity (e.g., Ongoing, 10 AM / 7 PM)."),
    })).describe("The Public Relations plan for the project."),

    estimatedExpenses: z.array(z.object({
        item: z.string().describe("The budget item (e.g., Refreshments, Gift Packs)."),
        cost: z.string().describe("The estimated cost for the item as a string (e.g., '15000.00')."),
    })).describe("A breakdown of the estimated net expenses for the project."),

    resourcePersonals: z.array(z.string()).describe("A list of any potential resource personnel who could be involved."),
});
export type GenerateProjectProposalOutput = z.infer<typeof GenerateProjectProposalOutputSchema>;


export async function generateProjectProposal(
  input: GenerateProjectProposalInput
): Promise<GenerateProjectProposalOutput> {
  return generateProjectProposalFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateProjectProposalPrompt',
  input: {schema: GenerateProjectProposalInputSchema},
  output: {schema: GenerateProjectProposalOutputSchema},
  prompt: `You are an expert project manager for a LEO Club, a youth community service organization. Your task is to take a member's raw idea and transform it into a professional, structured, and actionable project proposal based on the club's standard template.
The tone should be formal but youth-friendly, encouraging, and clear.

Use the following details provided by the member:
- Project Name: {{{projectName}}}
- Goal/Impact: {{{goal}}}
- Target Audience: {{{targetAudience}}}
- Budget: {{{budget}}}
- Timeline: {{{timeline}}}
{{#if specialConsiderations}}
- Special Considerations: {{{specialConsiderations}}}
{{/if}}

Based on this, generate a comprehensive project proposal that fits the output schema precisely. Use the provided example structure for guidance.
Create realistic and detailed examples for each section.
For the "PR Plan", create a sample table of activities.
For the "Estimated Net Expenses", create a sample budget breakdown that fits within the user's estimated budget range.
If the member mentions potential partners in special considerations, list them in the "Resource Personals" section.
The "Implementation Challenges" and "Challenge Solutions" should be thoughtful and relevant to a youth organization.

Generate the full proposal and ensure the output matches the required JSON schema. Do not add any fields or sections that are meant for admin approval (e.g., "Approval granted", "President's Signature").
`,
});

const generateProjectProposalFlow = ai.defineFlow(
  {
    name: 'generateProjectProposalFlow',
    inputSchema: GenerateProjectProposalInputSchema,
    outputSchema: GenerateProjectProposalOutputSchema,
  },
  async input => {
    // Ensure optional fields are handled correctly if they are empty strings
    const sanitizedInput = { ...input };
    if (!sanitizedInput.specialConsiderations) {
      delete sanitizedInput.specialConsiderations;
    }

    const {output} = await prompt(sanitizedInput);
    return output!;
  }
);
