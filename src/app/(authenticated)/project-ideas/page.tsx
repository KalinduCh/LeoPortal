// src/app/(authenticated)/project-ideas/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, PlusCircle, History, Loader2, FileEdit, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getProjectIdeasForUser } from '@/services/projectIdeaService';
import type { ProjectIdea } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function ProjectIdeasPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [myIdeas, setMyIdeas] = useState<ProjectIdea[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMyIdeas = async () => {
            if (user?.id) {
                setIsLoading(true);
                try {
                    const ideas = await getProjectIdeasForUser(user.id);
                    setMyIdeas(ideas);
                } catch (error) {
                    console.error("Failed to fetch user's project ideas:", error);
                    toast({ title: "Error", description: "Could not load your submitted ideas.", variant: "destructive" });
                }
                setIsLoading(false);
            }
        };
        
        if (!authLoading && user) {
            fetchMyIdeas();
        } else if (!authLoading && !user) {
            setIsLoading(false);
        }
    }, [user, authLoading, toast]);
    
    const handleViewIdea = (idea: ProjectIdea) => {
        router.push(`/project-ideas/view?id=${idea.id}`);
    };
    
    const getStatusVariant = (status: ProjectIdea['status']) => {
        switch (status) {
            case 'draft': return 'bg-gray-500 hover:bg-gray-600';
            case 'pending_review': return 'bg-yellow-500 hover:bg-yellow-600';
            case 'approved': return 'bg-green-600 hover:bg-green-700';
            case 'declined': return 'bg-red-600 hover:bg-red-700';
            case 'needs_revision': return 'bg-blue-500 hover:bg-blue-600';
            default: return 'secondary';
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center">
                        <Lightbulb className="mr-3 h-8 w-8 text-primary" />
                        Project Idea Hub
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Turn your innovative ideas into actionable projects.
                    </p>
                </div>
                <Link href="/project-ideas/new">
                    <Button className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Submit a New Idea
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <History className="mr-2 h-5 w-5 text-primary" />
                        My Submitted Ideas
                    </CardTitle>
                    <CardDescription>
                        Track the status of your project proposals or continue editing your drafts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="text-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                         </div>
                    ) : myIdeas.length > 0 ? (
                        <div className="space-y-3">
                            {myIdeas.map(idea => (
                                <div key={idea.id} onClick={() => handleViewIdea(idea)} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                                    <div>
                                        <h3 className="font-semibold text-primary">{idea.projectName}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Last updated: {format(parseISO(idea.updatedAt), 'MMM dd, yyyy')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                         <Badge className={getStatusVariant(idea.status)}>
                                            {idea.status.replace(/_/g, ' ')}
                                        </Badge>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>You haven't submitted any ideas yet.</p>
                            <p className="mt-1">Click the "Submit a New Idea" button to get started!</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {user?.role === 'admin' && (
                 <div className="mt-8 text-center">
                    <Link href="/admin/project-ideas">
                       <Button variant="outline">
                           Go to Admin Review Dashboard
                       </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
