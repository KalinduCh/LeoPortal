
// src/app/(authenticated)/project-ideas/view/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, FileText, Target, CheckSquare, Users, DollarSign, Calendar, AlertTriangle, Shield, Flag, Send, Handshake, Bullhorn } from 'lucide-react';
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
             const newIdeaData: Omit<ProjectIdea, 'id' | 'createdAt' | 'updatedAt'> = {
                projectName: originalIdea.projectName,
                goal: originalIdea.goal,
                targetAudience: originalIdea.targetAudience,
                budget: originalIdea.budget,
                timeline: originalIdea.timeline,
                ...proposal,
                status: 'pending_review',
                authorId: user.id,
                authorName: user.name,
            };

            await createProjectIdea(newIdeaData);

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

    const totalBudget = proposal.estimatedExpenses.reduce((acc, item) => acc + (parseFloat(item.cost) || 0), 0);

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
                    {isSubmitting ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Send className="mr-2 h-4 w-4" /> )}
                    {isSubmitting ? "Submitting..." : "Submit for Review"}
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Project Idea</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{proposal.projectIdea}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5 text-primary"/>Proposed Action Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <h4 className="font-semibold text-md mb-2">Objective</h4>
                        <p className="text-sm text-muted-foreground pl-4 border-l-2 border-primary">{proposal.proposedActionPlan.objective}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-md mb-2">Pre-Event Plan</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {proposal.proposedActionPlan.preEventPlan.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-md mb-2">Execution Plan</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {proposal.proposedActionPlan.executionPlan.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-md mb-2">Post-Event Plan</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {proposal.proposedActionPlan.postEventPlan.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive/80"/>Identified Challenges</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                            {proposal.implementationChallenges.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-green-600"/>Challenge Solutions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                            {proposal.challengeSolutions.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle className="flex items-center"><Handshake className="mr-2 h-5 w-5 text-primary"/>Community Involvement</CardTitle></CardHeader>
                <CardContent>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                        {proposal.communityInvolvement.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle className="flex items-center"><Bullhorn className="mr-2 h-5 w-5 text-primary"/>PR Plan</CardTitle></CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow><TableHead>Activity</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {proposal.prPlan.map((item, index) => (<TableRow key={index}><TableCell>{item.activity}</TableCell><TableCell>{item.date}</TableCell><TableCell>{item.time}</TableCell></TableRow>))}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary"/>Estimated Net Expenses</CardTitle>
                    <CardDescription>Based on your estimate of: {originalIdea.budget}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Estimated Cost</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {proposal.estimatedExpenses.map((item, index) => (
                                <TableRow key={index}><TableCell>{item.item}</TableCell><TableCell className="text-right font-mono">{item.cost}</TableCell></TableRow>
                            ))}
                            <TableRow className="font-bold border-t-2"><TableCell>Total Estimated Cost</TableCell><TableCell className="text-right font-mono">{totalBudget.toFixed(2)}</TableCell></TableRow>
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Resource Personals</CardTitle></CardHeader>
                <CardContent>
                    {proposal.resourcePersonals.length > 0 ? (
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                            {proposal.resourcePersonals.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No specific resource personnel listed.</p>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
