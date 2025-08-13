// src/app/(authenticated)/project-ideas/page.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, PlusCircle, History } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

// This will be the landing page for the "Project Ideas" section.
// For now, it will link to the submission form and eventually show a list of submitted ideas.
export default function ProjectIdeasPage() {
    const { user } = useAuth();

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
                        Track the status of your project proposals.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                        <p>You haven't submitted any ideas yet.</p>
                        <p className="mt-1">Click the "Submit a New Idea" button to get started!</p>
                    </div>
                    {/* This area will be populated with a list of the user's submitted ideas in a future update. */}
                </CardContent>
            </Card>

            {/* If the user is an admin, show a link to the review dashboard */}
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
