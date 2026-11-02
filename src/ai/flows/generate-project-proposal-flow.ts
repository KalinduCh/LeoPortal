'use server';
/**
 * @fileOverview A flow for generating a detailed project proposal using Gemini 3.8 Flash via Interactions API.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { callGeminiWithRetry } from '@/ai/model-selector';

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
    projectIdea: z.string(),
    proposedActionPlan: z.object({
        objective: z.string(),
        preEventPlan: z.array(z.string()),
        executionPlan: z.array(z.string()),
        postEventPlan: z.array(z.string())
    }),
    implementationChallenges: z.array(z.string()),
    challengeSolutions: z.array(z.string()),
    communityInvolvement: z.array(z.string()),
    prPlan: z.array(z.object({
        activity: z.string(),
        date: z.string(),
        time: z.string(),
    })),
    estimatedExpenses: z.array(z.object({
        item: z.string(),
        cost: z.string(),
    })),
    resourcePersonals: z.array(z.string()),
});
export type GenerateProjectProposalOutput = z.infer<typeof GenerateProjectProposalOutputSchema>;

export async function generateProjectProposal(input: GenerateProjectProposalInput): Promise<GenerateProjectProposalOutput> {
  return generateProjectProposalFlow(input);
}

const generateProjectProposalFlow = ai.defineFlow(
  {
    name: 'generateProjectProposalFlow',
    inputSchema: GenerateProjectProposalInputSchema,
    outputSchema: GenerateProjectProposalOutputSchema,
  },
  async (input) => {
    const system = `You are an expert project manager for a LEO Club.
    Transform the user's idea into a professional project proposal.
    Return ONLY a valid JSON object matching this schema structure:
    {
      "projectIdea": "string",
      "proposedActionPlan": { "objective": "string", "preEventPlan": [], "executionPlan": [], "postEventPlan": [] },
      "implementationChallenges": [],
      "challengeSolutions": [],
      "communityInvolvement": [],
      "prPlan": [{ "activity": "string", "date": "string", "time": "string" }],
      "estimatedExpenses": [{ "item": "string", "cost": "string" }],
      "resourcePersonals": []
    }
    Use LKR for currency.`;

    const prompt = `Project Name: ${input.projectName}
    Goal: ${input.goal}
    Audience: ${input.targetAudience}
    Budget: ${input.budget}
    Timeline: ${input.timeline}
    Considerations: ${input.specialConsiderations || 'None'}`;

    try {
      const responseText = await callGeminiWithRetry(prompt, system);
      const cleanJson = responseText.replace(/```json|```/gi, '').trim();
      return JSON.parse(cleanJson);
    } catch (error: any) {
      console.error("PROPOSAL_GEN_FAILURE:", error);
      throw new Error(error.message || "Failed to generate proposal.");
    }
  }
);
