
// src/app/(authenticated)/gallery/[eventId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEvent } from '@/services/eventService';
import type { Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, ArrowLeft, Camera, Image as ImageIcon, ExternalLink, 
    Calendar, MapPin, Info, Users, UploadCloud, FolderOpen, Heart, Share2 
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function ProjectGalleryView() {
    const params = useParams();
    const eventId = params.eventId as string;
    const router = useRouter();
    const { toast } = useToast();
    const [project, setProject] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProject = async () => {
            setIsLoading(true);
            try {
                const data = await getEvent(eventId);
                setProject(data);
            } catch (error) {
                console.error("Failed to fetch gallery project details:", error);
            }
            setIsLoading(false);
        };
        fetchProject();
    }, [eventId]);

    const handleShare = () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({
                title: `${project?.name} - LeoPortal Gallery`,
                text: `Check out the memories from ${project?.name}!`,
                url: window.location.href,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Link Copied", description: "URL copied to clipboard." });
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="container mx-auto py-20 px-4 text-center">
                <h1 className="text-2xl font-bold">Project not found.</h1>
                <Button onClick={() => router.push('/gallery')} className="mt-4">Back to Gallery Hub</Button>
            </div>
        );
    }

    const projectDate = project.startDate ? parseISO(project.startDate) : null;

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl space-y-10">
            <header className="space-y-6">
                <Button variant="ghost" onClick={() => router.push('/gallery')} className="pl-0 text-primary font-bold hover:bg-transparent">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
                </Button>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-3">
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] border-primary text-primary px-3 py-1">
                            Project Archive
                        </Badge>
                        <h1 className="text-4xl sm:text-5xl font-black font-headline text-slate-900 tracking-tighter uppercase leading-tight">
                            {project.name}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 shadow-sm" onClick={handleShare}><Share2 className="h-5 w-5" /></Button>
                        <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 shadow-sm text-rose-500"><Heart className="h-5 w-5" /></Button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="shadow-2xl border-none ring-1 ring-slate-200 overflow-hidden rounded-[2.5rem]">
                        <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                            <ImageIcon className="h-16 w-16 text-slate-300 opacity-30" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent" />
                        </div>
                        <CardContent className="p-10 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Info className="h-3.5 w-3.5" /> Project Synopsis
                                </h3>
                                <p className="text-slate-600 leading-relaxed text-lg italic font-medium">
                                    "{project.description}"
                                </p>
                            </div>
                            
                            <Separator className="bg-slate-100" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <p className="font-bold text-slate-700">{projectDate && isValid(projectDate) ? format(projectDate, "MMMM dd, yyyy") : "TBD"}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Venue</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <p className="font-bold text-slate-700 truncate">{project.location || "Central Venue"}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="shadow-2xl border-none bg-slate-900 text-white rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-headline tracking-tight uppercase">Action Center</CardTitle>
                            <CardDescription className="text-slate-400 font-medium">Manage project memories.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-4">
                            <Button 
                                className={cn(
                                    "w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-lg transition-all",
                                    project.uploadUrl ? "bg-primary hover:scale-[1.02]" : "bg-slate-800 opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => project.uploadUrl && window.open(project.uploadUrl, '_blank')}
                                disabled={!project.uploadUrl}
                            >
                                <UploadCloud className="mr-3 h-5 w-5" /> Upload Project Photos
                            </Button>
                            
                            <Button 
                                variant="outline"
                                className={cn(
                                    "w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-xs border-slate-700 text-white hover:bg-slate-800 hover:text-white transition-all",
                                    project.galleryUrl ? "hover:scale-[1.02]" : "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => project.galleryUrl && window.open(project.galleryUrl, '_blank')}
                                disabled={!project.galleryUrl}
                            >
                                <FolderOpen className="mr-3 h-5 w-5 text-primary" /> View Folder Gallery
                            </Button>

                            {!project.galleryUrl && (
                                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                    <p className="text-[10px] font-bold text-slate-400 text-center leading-relaxed">
                                        The gallery link hasn't been added for this project yet. Please contact an admin.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="p-8 pt-0 text-center">
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mx-auto">
                                LeoPortal Secured Archive System
                            </p>
                        </CardFooter>
                    </Card>

                    <Card className="shadow-lg border-none ring-1 ring-slate-200 rounded-[2rem] bg-white">
                        <CardContent className="p-6 text-center">
                            <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
                                "Every photo shared helps future members remember the impact we made together."
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
