
// src/app/(authenticated)/gallery/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getEvents } from '@/services/eventService';
import type { Event } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ImageIcon, MapPin, Calendar, Camera, ChevronRight, Image as ImageIconLucide, ExternalLink, FolderOpen } from 'lucide-react';
import { format, parseISO, isValid, isPast } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// The user-provided master link
const MASTER_GALLERY_URL = "https://drive.google.com/drive/folders/1JPCb0U66_OznR4UIVvBIG8xkbPIfTQkY?usp=share_link";

export default function ProjectGalleryHub() {
    const [projects, setProjects] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoading(true);
            try {
                const allEvents = await getEvents();
                // Filter for events that are likely to have photos (exclude deadlines)
                // and sort by date descending
                const filtered = allEvents
                    .filter(e => e.eventType !== 'deadline')
                    .sort((a, b) => {
                        const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
                        const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
                        return dateB - dateA;
                    });
                setProjects(filtered);
            } catch (error) {
                console.error("Failed to fetch gallery projects:", error);
            }
            setIsLoading(false);
        };
        fetchProjects();
    }, []);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [projects, searchTerm]);

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4 space-y-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black font-headline text-slate-900 tracking-tight uppercase">Project Gallery</h1>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em] flex items-center">
                        <Camera className="h-4 w-4 mr-2 text-primary" /> Help us preserve every project, every moment.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative flex-grow sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search projects..." 
                            className="pl-10 h-12 rounded-2xl bg-white border-none ring-1 ring-slate-200 shadow-sm" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button 
                        variant="outline" 
                        className="h-12 rounded-2xl font-bold border-primary text-primary hover:bg-primary/5 shadow-sm"
                        onClick={() => window.open(MASTER_GALLERY_URL, '_blank')}
                    >
                        <FolderOpen className="mr-2 h-4 w-4" /> Open Master Drive
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProjects.map((project) => {
                    const projectDate = project.startDate ? parseISO(project.startDate) : null;
                    const hasGallery = !!project.galleryUrl;
                    
                    return (
                        <Card 
                            key={project.id} 
                            className="group hover:shadow-2xl transition-all duration-500 border-none ring-1 ring-slate-200 bg-white overflow-hidden rounded-[2rem] flex flex-col cursor-pointer"
                            onClick={() => router.push(`/gallery/${project.id}`)}
                        >
                            <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />
                                <div className="p-10 text-slate-300 group-hover:scale-110 transition-transform duration-700">
                                    <ImageIconLucide className="h-20 w-20 opacity-20" />
                                </div>
                                <div className="absolute top-4 right-4 z-20">
                                    {hasGallery ? (
                                        <Badge className="bg-emerald-500 text-white font-black text-[10px] uppercase px-3 py-1 shadow-lg border-none">
                                            Gallery Ready
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-slate-900 text-white font-black text-[10px] uppercase px-3 py-1 shadow-lg border-none">
                                            Awaiting Photos
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-2xl font-black font-headline text-slate-900 tracking-tight leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                    {project.name}
                                </CardTitle>
                                <div className="flex flex-col gap-2 mt-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <Calendar className="h-3.5 w-3.5 text-primary" />
                                        {projectDate && isValid(projectDate) ? format(projectDate, "MMMM dd, yyyy") : "Date TBD"}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <MapPin className="h-3.5 w-3.5 text-primary" />
                                        <span className="truncate">{project.location || "Location not set"}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardFooter className="p-8 pt-0 mt-auto">
                                <Button className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg group-hover:bg-primary transition-all">
                                    View Project <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}

                {filteredProjects.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-4 opacity-40 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <ImageIcon className="h-20 w-20" />
                        <div className="space-y-1">
                            <p className="font-black text-xl uppercase tracking-tighter">No Projects Found</p>
                            <p className="text-sm font-medium">Try searching for a different project name or location.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
