'use server';
/**
 * @fileOverview A Genkit flow for generating a detailed project proposal from a member's idea.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { runWithAiFallback } from '@/ai/model-selector';

const GenerateProjectProposalInputSchema = z.object({
  projectName: z.string().describe('The name of the project.'),
  goal: z.string().describe('The main goal or impact of the project.'),
  targetAudience: z.string().describe('The target audience for the project.'),
  budget: z.string().describe('The estimated budget range.'),
  timeline: z.string().describe('The preferred timeline.'),
  specialConsiderations: z.string().optional().describe('Any special considerations.'),
});
export type GenerateProjectProposalInput = z.infer<typeof GenerateProjectProposalInputSchema>;

const GenerateProjectProposalOutputSchema = z.object({
    projectIdea: z.string().describe("A brief, compelling description of the project idea."),
    proposedActionPlan: z.object({
        objective: z.string().describe("The main objective of the project."),
        preEventPlan: z.array(z.string()).describe("A list of tasks to be done before the event."),
        executionPlan: z.array(z.string()).describe("A list of tasks/schedule to be done during the event."),
        postEventPlan: z.array(z.string()).describe("A list of tasks to be done after the event.")
    }).describe("The detailed action plan for the project."),
    implementationChallenges: z.array(z.string()).describe("Identified challenges."),
    challengeSolutions: z.array(z.string()).describe("Proposed solutions."),
    communityInvolvement: z.array(z.string()).describe("Ways the community will be involved."),
    prPlan: z.array(z.object({
        activity: z.string().describe("PR activity."),
        date: z.string().describe("Target date."),
        time: z.string().describe("Target time."),
    })).describe("The Public Relations plan."),
    estimatedExpenses: z.array(z.object({
        item: z.string().describe("Budget item."),
        cost: z.string().describe("Estimated cost in LKR (e.g. '15000.00')."),
    })).describe("Estimated expenses breakdown."),
    resourcePersonals: z.array(z.string()).describe("Potential resource personnel."),
});
export type GenerateProjectProposalOutput = z.infer<typeof GenerateProjectProposalOutputSchema>;

export async function generateProjectProposal(
  input: GenerateProjectProposalInput
): Promise<GenerateProjectProposalOutput> {
  return generateProjectProposalFlow(input);
}

const generateProjectProposalFlow = ai.defineFlow(
  {
    name: 'generateProjectProposalFlow',
    inputSchema: GenerateProjectProposalInputSchema,
    outputSchema: GenerateProjectProposalOutputSchema,
  },
  async input => {
    const systemPrompt = `You are an expert project manager for a LEO Club. Your task is to transform a member's raw idea into a professional, structured project proposal. 
    The tone should be formal but youth-friendly. Use LKR for currency.`;

    const userPrompt = `Project Name: ${input.projectName}
        Goal: ${input.goal}
        Target Audience: ${input.targetAudience}
        Budget: ${input.budget}
        Timeline: ${input.timeline}
        ${input.specialConsiderations ? `Special Considerations: ${input.specialConsiderations}` : ''}`;

    return runWithAiFallback(userPrompt, GenerateProjectProposalOutputSchema, systemPrompt);
  }
);
