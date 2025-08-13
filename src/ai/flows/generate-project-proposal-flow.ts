'use server';
/**
 * @fileOverview A Genkit flow for generating a detailed project proposal from a member's idea.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input from the member's form
const GenerateProjectProposalInputSchema = z.object({
  projectName: z.string().describe('The name of the project.'),
  goal: z.string().describe('The main goal or impact of the project. What problem is it solving?'),
  targetAudience: z.string().describe('The target audience for the project (e.g., community, school, youth).'),
  budget: z.string().describe('The estimated budget range for the project.'),
  timeline: z.string().describe('The preferred timeline for the project (e.g., days, weeks, months).'),
  specialConsiderations: z.string().optional().describe('Any special considerations like partnerships, locations, etc.'),
});
export type GenerateProjectProposalInput = z.infer<typeof GenerateProjectProposalInputSchema>;

// The structured output we want from the AI
const GenerateProjectProposalOutputSchema = z.object({
  overview: z.string().describe('A concise, compelling description of the project.'),
  objectives: z.array(z.object({
    title: z.string().describe("A short title for the objective."),
    description: z.string().describe("A detailed description of the objective and its benefits."),
  })).describe('A list of 2-3 key objectives and their benefits, explaining why the project matters.'),
  tasks: z.array(z.object({
    task: z.string().describe("A specific task to be completed."),
    responsibility: z.string().describe("The role or group responsible for this task (e.g., Marketing Team, Project Lead)."),
  })).describe('A detailed to-do list with assigned responsibilities.'),
  resources: z.array(z.string()).describe('A list of necessary materials, manpower, or potential partners.'),
  budgetBreakdown: z.array(z.object({
    item: z.string().describe("The budget item."),
    cost: z.string().describe("The estimated cost for the item."),
  })).describe('An estimated cost breakdown per item or category.'),
  timelineMilestones: z.array(z.object({
    milestone: z.string().describe("A key milestone in the project timeline."),
    date: z.string().describe("The target date or timeframe for this milestone."),
  })).describe('A clear timeline with stages and progress milestones.'),
  risks: z.array(z.object({
    risk: z.string().describe("A potential risk or challenge."),
    solution: z.string().describe("A proposed solution or mitigation for the risk."),
  })).describe('A list of potential risks and proactive solutions.'),
  successMetrics: z.array(z.string()).describe('A list of metrics to measure the project’s impact and success (e.g., number of beneficiaries, funds raised).'),
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
  prompt: `You are an expert project manager for a LEO Club, a youth community service organization. Your task is to take a member's raw idea and transform it into a professional, structured, and actionable project proposal. The tone should be formal but youth-friendly, encouraging, and clear.

Use the following details provided by the member:
- Project Name: {{{projectName}}}
- Goal/Impact: {{{goal}}}
- Target Audience: {{{targetAudience}}}
- Budget: {{{budget}}}
- Timeline: {{{timeline}}}
{{#if specialConsiderations}}
- Special Considerations: {{{specialConsiderations}}}
{{/if}}

Based on this, generate a comprehensive project proposal with the following sections. Be specific and create realistic, detailed examples for each section. If the budget is a range, create a sample breakdown that fits within that range. If the timeline is general, create specific milestones. Include potential partners in the resources list if applicable. The success metrics should clearly define how to measure the project's expected impact.

Generate the full proposal and ensure the output matches the required JSON schema.
`,
});

const generateProjectProposalFlow = ai.defineFlow(
  {
    name: 'generateProjectProposalFlow',
    inputSchema: GenerateProjectProposalInputSchema,
    outputSchema: GenerateProjectProposalOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
