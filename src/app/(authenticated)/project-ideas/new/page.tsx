// src/app/(authenticated)/project-ideas/new/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, ArrowLeft, Wand2, Loader2 } from 'lucide-react';
import { generateProjectProposal, type GenerateProjectProposalInput } from '@/ai/flows/generate-project-proposal-flow';


const ideaFormSchema = z.object({
  projectName: z.string().min(3, { message: "Project name must be at least 3 characters." }),
  goal: z.string().min(10, { message: "Please describe the goal in at least 10 characters." }),
  targetAudience: z.string().min(3, { message: "Target audience is required." }),
  budget: z.string({ required_error: "Please select a budget range." }),
  timeline: z.string({ required_error: "Please select a timeline." }),
  specialConsiderations: z.string().optional(),
});

type IdeaFormValues = z.infer<typeof ideaFormSchema>;

export default function NewProjectIdeaPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);

    const form = useForm<IdeaFormValues>({
        resolver: zodResolver(ideaFormSchema),
        defaultValues: {
            projectName: "",
            goal: "",
            targetAudience: "",
            specialConsiderations: "",
        },
    });

    const onSubmit = async (values: IdeaFormValues) => {
        setIsGenerating(true);
        toast({
            title: "Generating Proposal...",
            description: "The AI is working its magic. This may take a moment.",
        });

        try {
            const input: GenerateProjectProposalInput = {
                ...values,
            };
            const result = await generateProjectProposal(input);

            // Store the result in sessionStorage to pass to the next page
            sessionStorage.setItem('generatedProposal', JSON.stringify(result));
            sessionStorage.setItem('originalIdea', JSON.stringify(values));

            toast({
                title: "Proposal Generated!",
                description: "Redirecting you to the proposal view.",
            });
            
            router.push('/project-ideas/view');


        } catch (error) {
            console.error("Failed to generate project proposal:", error);
            toast({
                title: "Generation Failed",
                description: "The AI could not generate a proposal. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-3xl">
            <Button variant="outline" size="sm" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Idea Hub
            </Button>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl font-headline">
                        <Lightbulb className="mr-2 h-6 w-6 text-primary" />
                        Submit a New Project Idea
                    </CardTitle>
                    <CardDescription>
                        Fill out the details below. The AI will help you expand this into a full proposal.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="projectName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Project Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Community Garden Initiative" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="goal"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>What is the main goal or impact?</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Describe the problem you want to solve or the positive change you want to make." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="targetAudience"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Who is the target audience?</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Local youth, elderly residents, the environment" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="budget"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estimated Budget Range</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a budget range" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="< $100">Under $100</SelectItem>
                                                    <SelectItem value="$100 - $500">$100 - $500</SelectItem>
                                                    <SelectItem value="$500 - $1000">$500 - $1000</SelectItem>
                                                    <SelectItem value="$1000+">$1000+</SelectItem>
                                                    <SelectItem value="Zero Budget">Zero Budget / In-kind</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                 <FormField
                                    control={form.control}
                                    name="timeline"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Preferred Timeline</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a timeline" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="A few days">A few days</SelectItem>
                                                    <SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
                                                    <SelectItem value="1 month">1 month</SelectItem>
                                                    <SelectItem value="2-3 months">2-3 months</SelectItem>
                                                    <SelectItem value="Long-term (3+ months)">Long-term (3+ months)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                             <FormField
                                control={form.control}
                                name="specialConsiderations"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Special Considerations (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Are there any partnerships, specific locations, or other important details to consider?" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={isGenerating} size="lg">
                                    {isGenerating ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Wand2 className="mr-2 h-4 w-4" />
                                    )}
                                    {isGenerating ? "Generating..." : "Generate Full Proposal"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
