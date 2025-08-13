
// src/app/(authenticated)/project-ideas/view/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, FileText, Target, Users, DollarSign, Calendar, AlertTriangle, Shield, Handshake, Megaphone, Send, Edit, Save, XCircle, Trash2, PlusCircle } from 'lucide-react';
import type { GenerateProjectProposalOutput, GenerateProjectProposalInput } from '@/ai/flows/generate-project-proposal-flow';
import type { ProjectIdea } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/hooks/use-auth';
import { createProjectIdea } from '@/services/projectIdeaService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ViewProjectProposalPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const [proposal, setProposal] = useState<GenerateProjectProposalOutput | null>(null);
    const [originalIdea, setOriginalIdea] = useState<GenerateProjectProposalInput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

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
    
    const handleFieldChange = (section: keyof GenerateProjectProposalOutput, value: any, index?: number, field?: string) => {
        setProposal(prev => {
            if (!prev) return null;
            const newProposal = { ...prev };

            if (index !== undefined && field) { // For tables with objects
                if (Array.isArray((newProposal as any)[section])) {
                    const newArray = [...(newProposal as any)[section]];
                    newArray[index] = { ...newArray[index], [field]: value };
                    (newProposal as any)[section] = newArray;
                }
            } else if (index !== undefined) { // For simple arrays
                 if (Array.isArray((newProposal as any)[section])) {
                    const newArray = [...(newProposal as any)[section]];
                    newArray[index] = value;
                    (newProposal as any)[section] = newArray;
                }
            } else { // For top-level fields
                (newProposal as any)[section] = value;
            }
            return newProposal;
        });
    };
    
    const handleActionPlanListChange = (field: keyof GenerateProjectProposalOutput['proposedActionPlan'], value: any, index: number) => {
        setProposal(prev => {
            if (!prev) return null;
            const newActionPlan = { ...prev.proposedActionPlan };
            const newArray = [...(newActionPlan as any)[field]];
            newArray[index] = value;
            (newActionPlan as any)[field] = newArray;
            return { ...prev, proposedActionPlan: newActionPlan };
        });
    };

    const handleActionPlanObjectiveChange = (value: string) => {
        setProposal(prev => {
            if (!prev) return null;
            return { ...prev, proposedActionPlan: { ...prev.proposedActionPlan, objective: value }};
        });
    };

    const handleAddItem = (section: keyof GenerateProjectProposalOutput | `proposedActionPlan.${keyof GenerateProjectProposalOutput['proposedActionPlan']}`) => {
        setProposal(prev => {
            if (!prev) return null;
            const newProposal = { ...prev };

            if (typeof section === 'string' && section.startsWith('proposedActionPlan.')) {
                const subField = section.split('.')[1] as keyof GenerateProjectProposalOutput['proposedActionPlan'];
                const newActionPlan = { ...newProposal.proposedActionPlan };
                (newActionPlan as any)[subField] = [...(newActionPlan as any)[subField], ''];
                return { ...prev, proposedActionPlan: newActionPlan };
            }
            
            const targetArray = (newProposal as any)[section];
            if (Array.isArray(targetArray)) {
                const isObjectArray = targetArray.length > 0 && typeof targetArray[0] === 'object' && targetArray[0] !== null;
                const newItem = isObjectArray ? { ...Object.keys(targetArray[0]).reduce((acc, key) => ({ ...acc, [key]: '' }), {}) } : '';
                (newProposal as any)[section] = [...targetArray, newItem];
            }
            return newProposal;
        });
    };

    const handleRemoveItem = (section: keyof GenerateProjectProposalOutput | `proposedActionPlan.${keyof GenerateProjectProposalOutput['proposedActionPlan']}`, index: number) => {
         setProposal(prev => {
            if (!prev) return null;
            const newProposal = { ...prev };

            if (typeof section === 'string' && section.startsWith('proposedActionPlan.')) {
                const subField = section.split('.')[1] as keyof GenerateProjectProposalOutput['proposedActionPlan'];
                const newActionPlan = { ...newProposal.proposedActionPlan };
                const newArray = [...(newActionPlan as any)[subField]];
                newArray.splice(index, 1);
                (newActionPlan as any)[subField] = newArray;
                return { ...prev, proposedActionPlan: newActionPlan };
            }

            const targetArray = (newProposal as any)[section];
            if (Array.isArray(targetArray)) {
                const newArray = [...targetArray];
                newArray.splice(index, 1);
                (newProposal as any)[section] = newArray;
            }
            return newProposal;
        });
    };


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
    
    const EditableList = ({ section, items, planSection }: { section: any, items: string[], planSection?: boolean }) => (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <Input 
                        value={item} 
                        onChange={(e) => planSection ? handleActionPlanListChange(section, e.target.value, index) : handleFieldChange(section, e.target.value, index)} 
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(planSection ? `proposedActionPlan.${section}` : section, index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => handleAddItem(planSection ? `proposedActionPlan.${section}` : section)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </div>
    );

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
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <Button onClick={() => setIsEditing(false)} variant="outline" size="lg"><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
                    ) : (
                        <Button onClick={() => setIsEditing(true)} variant="outline" size="lg"><Edit className="mr-2 h-4 w-4" />Edit Proposal</Button>
                    )}
                    <Button onClick={handleSubmitForReview} size="lg" disabled={isSubmitting || isEditing}>
                        {isSubmitting ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Send className="mr-2 h-4 w-4" /> )}
                        {isSubmitting ? "Submitting..." : "Submit for Review"}
                    </Button>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Project Idea</CardTitle>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                       <Textarea value={proposal.projectIdea} onChange={(e) => handleFieldChange('projectIdea', e.target.value)} className="min-h-[100px]" />
                    ) : (
                       <p className="text-muted-foreground whitespace-pre-wrap">{proposal.projectIdea}</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5 text-primary"/>Proposed Action Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <h4 className="font-semibold text-md mb-2">Objective</h4>
                        {isEditing ? (
                            <Textarea value={proposal.proposedActionPlan.objective} onChange={(e) => handleActionPlanObjectiveChange(e.target.value)} />
                        ) : (
                            <p className="text-sm text-muted-foreground pl-4 border-l-2 border-primary whitespace-pre-wrap">{proposal.proposedActionPlan.objective}</p>
                        )}
                    </div>
                    {(['preEventPlan', 'executionPlan', 'postEventPlan'] as const).map(planType => (
                         <div key={planType}>
                            <h4 className="font-semibold text-md mb-2 capitalize">{planType.replace('Plan', ' Plan')}</h4>
                             {isEditing ? (
                                <EditableList section={planType} items={proposal.proposedActionPlan[planType]} planSection />
                             ) : (
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {(proposal.proposedActionPlan as any)[planType].map((item: string, index: number) => <li key={index}>{item}</li>)}
                                </ul>
                             )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive/80"/>Identified Challenges</CardTitle></CardHeader>
                    <CardContent>
                       {isEditing ? (
                           <EditableList section="implementationChallenges" items={proposal.implementationChallenges} />
                       ) : (
                           <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                                {proposal.implementationChallenges.map((item, index) => <li key={index}>{item}</li>)}
                           </ul>
                       )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-green-600"/>Challenge Solutions</CardTitle></CardHeader>
                    <CardContent>
                        {isEditing ? (
                           <EditableList section="challengeSolutions" items={proposal.challengeSolutions} />
                       ) : (
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                                {proposal.challengeSolutions.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                       )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle className="flex items-center"><Handshake className="mr-2 h-5 w-5 text-primary"/>Community Involvement</CardTitle></CardHeader>
                <CardContent>
                    {isEditing ? (
                           <EditableList section="communityInvolvement" items={proposal.communityInvolvement} />
                       ) : (
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                            {proposal.communityInvolvement.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle className="flex items-center"><Megaphone className="mr-2 h-5 w-5 text-primary"/>PR Plan</CardTitle></CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow><TableHead>Activity</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead>{isEditing && <TableHead className="w-12"></TableHead>}</TableRow>
                        </TableHeader>
                        <TableBody>
                            {proposal.prPlan.map((item, index) => (<TableRow key={index}>
                                <TableCell>{isEditing ? <Input value={item.activity} onChange={e => handleFieldChange('prPlan', e.target.value, index, 'activity')} /> : item.activity}</TableCell>
                                <TableCell>{isEditing ? <Input value={item.date} onChange={e => handleFieldChange('prPlan', e.target.value, index, 'date')} /> : item.date}</TableCell>
                                <TableCell>{isEditing ? <Input value={item.time} onChange={e => handleFieldChange('prPlan', e.target.value, index, 'time')} /> : item.time}</TableCell>
                                {isEditing && <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem('prPlan', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>}
                            </TableRow>))}
                        </TableBody>
                   </Table>
                   {isEditing && (
                       <Button variant="outline" size="sm" className="mt-4" onClick={() => handleAddItem('prPlan')}><PlusCircle className="mr-2 h-4 w-4"/>Add PR Activity</Button>
                   )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary"/>Estimated Net Expenses (LKR)</CardTitle>
                    <CardDescription>Based on your estimate of: {originalIdea.budget}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Estimated Cost</TableHead>{isEditing && <TableHead className="w-12"></TableHead>}</TableRow></TableHeader>
                        <TableBody>
                            {proposal.estimatedExpenses.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{isEditing ? <Input value={item.item} onChange={e => handleFieldChange('estimatedExpenses', e.target.value, index, 'item')} /> : item.item}</TableCell>
                                    <TableCell className="text-right font-mono">{isEditing ? <Input className="text-right" value={item.cost} onChange={e => handleFieldChange('estimatedExpenses', e.target.value, index, 'cost')} /> : item.cost}</TableCell>
                                    {isEditing && <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem('estimatedExpenses', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>}
                                </TableRow>
                            ))}
                            <TableRow className="font-bold border-t-2"><TableCell>Total Estimated Cost</TableCell><TableCell className="text-right font-mono">{totalBudget.toFixed(2)}</TableCell>{isEditing && <TableCell></TableCell>}</TableRow>
                        </TableBody>
                   </Table>
                    {isEditing && (
                       <Button variant="outline" size="sm" className="mt-4" onClick={() => handleAddItem('estimatedExpenses')}><PlusCircle className="mr-2 h-4 w-4"/>Add Budget Item</Button>
                   )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Resource Personals</CardTitle></CardHeader>
                <CardContent>
                    {isEditing ? (
                        <EditableList section="resourcePersonals" items={proposal.resourcePersonals} />
                    ) : proposal.resourcePersonals.length > 0 ? (
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
