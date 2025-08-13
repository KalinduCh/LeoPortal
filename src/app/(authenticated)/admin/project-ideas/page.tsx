
// src/app/(authenticated)/admin/project-ideas/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { getProjectIdeasForAdmin, updateProjectIdea } from '@/services/projectIdeaService';
import type { ProjectIdea } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Lightbulb, ExternalLink, MoreHorizontal, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AdminProjectIdeasPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && user?.role !== 'admin') {
            router.replace('/dashboard');
        }
    }, [user, authLoading, router]);

    const fetchIdeas = async () => {
        if (user?.role === 'admin') {
            setIsLoading(true);
            try {
                const projectIdeas = await getProjectIdeasForAdmin();
                setIdeas(projectIdeas);
            } catch (error) {
                console.error("Failed to fetch project ideas:", error);
                toast({
                    title: "Error Loading Ideas",
                    description: "Could not fetch project submissions.",
                    variant: "destructive"
                });
            }
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIdeas();
    }, [user, toast]);

    const handleReviewIdea = (ideaId: string) => {
        const idea = ideas.find(i => i.id === ideaId);
        if (idea) {
             sessionStorage.setItem('selectedProjectIdea', JSON.stringify(idea));
             router.push(`/project-ideas/view?id=${idea.id}&mode=review`);
        } else {
            toast({title: "Error", description: "Could not find idea details.", variant: "destructive"});
        }
    };
    
    const handleUpdateStatus = async (ideaId: string, status: ProjectIdea['status']) => {
        try {
            await updateProjectIdea(ideaId, { status });
            toast({ title: "Status Updated", description: `Project status changed to "${status.replace(/_/g, ' ')}".`});
            fetchIdeas(); // Re-fetch to show updated status
        } catch (error) {
            console.error("Failed to update status:", error);
            toast({ title: "Error", description: "Could not update project status.", variant: "destructive" });
        }
    };

    const getStatusVariant = (status: ProjectIdea['status']) => {
        switch (status) {
            case 'pending_review': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
            case 'approved': return 'bg-green-600 hover:bg-green-700 text-white';
            case 'declined': return 'bg-red-600 hover:bg-red-700 text-white';
            case 'needs_revision': return 'bg-blue-500 hover:bg-blue-600 text-white';
            default: return 'secondary';
        }
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold font-headline mb-2">Project Idea Review</h1>
            <p className="text-muted-foreground mb-8">Review, approve, or request revisions for member-submitted project ideas.</p>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Lightbulb className="mr-2 h-5 w-5 text-primary"/>
                        Submitted Proposals
                    </CardTitle>
                    <CardDescription>
                        Showing all non-draft project ideas submitted by members, sorted by status and creation date.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    ) : ideas.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Name</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Submitted On</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ideas.map((idea) => (
                                        <TableRow key={idea.id}>
                                            <TableCell className="font-medium max-w-xs truncate">{idea.projectName}</TableCell>
                                            <TableCell>{idea.authorName}</TableCell>
                                            <TableCell>{format(parseISO(idea.createdAt), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusVariant(idea.status)}>
                                                    {idea.status.replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleReviewIdea(idea.id)}>
                                                    Review <ExternalLink className="ml-2 h-3 w-3" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(idea.id, 'approved')}>
                                                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Approve
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateStatus(idea.id, 'declined')}>
                                                            <XCircle className="mr-2 h-4 w-4 text-red-500" /> Decline
                                                        </DropdownMenuItem>
                                                         <DropdownMenuItem onClick={() => handleUpdateStatus(idea.id, 'needs_revision')}>
                                                            <Clock className="mr-2 h-4 w-4 text-blue-500" /> Needs Revision
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No project ideas have been submitted for review yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
