// src/app/(authenticated)/project-ideas/view/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, FileText, Target, CheckSquare, Users, DollarSign, Calendar, AlertTriangle, Shield, Flag, Send } from 'lucide-react';
import type { GenerateProjectProposalOutput, GenerateProjectProposalInput } from '@/ai/flows/generate-project-proposal-flow';
import type { ProjectIdea } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/hooks/use-auth';
import { createProjectIdea } from '@/services/projectIdeaService';
import { useToast } from '@/hooks/use-toast';


export default function ViewProjectProposalPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const [proposal, setProposal] = useState<GenerateProjectProposalOutput | null>(null);
    const [originalIdea, setOriginalIdea] = useState<GenerateProjectProposalInput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const storedProposal = sessionStorage.getItem('generatedProposal');
        const storedIdea = sessionStorage.getItem('originalIdea');

        if (storedProposal && storedIdea) {
            try {
                setProposal(JSON.parse(storedProposal));
                setOriginalIdea(JSON.parse(storedIdea));
            } catch (e) {
                console.error("Failed to parse proposal from sessionStorage", e);
                router.replace('/project-ideas/new');
            }
        } else {
            // If no data, redirect back to create a new one
            router.replace('/project-ideas/new');
        }
        setIsLoading(false);
    }, [router]);

    const handleSubmitForReview = async () => {
        if (!proposal || !originalIdea || !user) {
            toast({ title: "Error", description: "Missing data required for submission.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        toast({ title: "Submitting Proposal...", description: "Please wait."});
        
        try {
            const newIdea: Omit<ProjectIdea, 'id' | 'createdAt' | 'updatedAt'> = {
                ...originalIdea,
                ...proposal,
                status: 'pending_review',
                authorId: user.id,
                authorName: user.name,
            };

            await createProjectIdea(newIdea);

            toast({ title: "Submission Successful!", description: "Your project idea has been sent for admin review." });
            sessionStorage.removeItem('generatedProposal');
            sessionStorage.removeItem('originalIdea');
            router.push('/project-ideas');

        } catch (error) {
            console.error("Failed to submit project idea:", error);
            toast({ title: "Submission Failed", description: "Could not submit your proposal. Please try again.", variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!proposal || !originalIdea) {
        return (
            <div className="container mx-auto py-8 text-center">
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Proposal</AlertTitle>
                    <AlertDescription>
                        Could not load the generated proposal data. Please try creating it again.
                    </AlertDescription>
                </Alert>
                <Button onClick={() => router.push('/project-ideas/new')} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Create New Idea
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <Button variant="outline" size="sm" onClick={() => router.push('/project-ideas/new')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Generate a Different Idea
                    </Button>
                    <h1 className="text-3xl font-bold font-headline mt-2 text-primary">{originalIdea.projectName}</h1>
                    <p className="text-muted-foreground">AI-Generated Project Proposal</p>
                </div>
                <Button onClick={handleSubmitForReview} size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="mr-2 h-4 w-4" />
                    )}
                    {isSubmitting ? "Submitting..." : "Submit for Review"}
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Project Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{proposal.overview}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5 text-primary"/>Objectives & Benefits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {proposal.objectives.map((obj, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-lg">
                            <h4 className="font-semibold">{obj.title}</h4>
                            <p className="text-sm text-muted-foreground">{obj.description}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Resources</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            {proposal.resources.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><Flag className="mr-2 h-5 w-5 text-primary"/>Success Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            {proposal.successMetrics.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </CardContent>
                </Card>
            </div>


            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><CheckSquare className="mr-2 h-5 w-5 text-primary"/>Task Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task</TableHead>
                                <TableHead>Responsibility</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {proposal.tasks.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.task}</TableCell>
                                    <TableCell><Badge variant="secondary">{item.responsibility}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary"/>Budget Breakdown</CardTitle>
                     <CardDescription>Based on your estimate of: {originalIdea.budget}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Estimated Cost</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {proposal.budgetBreakdown.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.item}</TableCell>
                                    <TableCell className="text-right font-mono">{item.cost}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Calendar className="mr-2 h-5 w-5 text-primary"/>Timeline & Milestones</CardTitle>
                    <CardDescription>Based on your estimate of: {originalIdea.timeline}</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Milestone</TableHead>
                                <TableHead>Target Date / Timeframe</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {proposal.timelineMilestones.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.milestone}</TableCell>
                                    <TableCell>{item.date}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-primary"/>Potential Risks & Solutions</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Risk</TableHead>
                                <TableHead>Proposed Solution</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {proposal.risks.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium text-destructive/80">{item.risk}</TableCell>
                                    <TableCell className="text-muted-foreground">{item.solution}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>

        </div>
    );
}
