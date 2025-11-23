// src/app/check-in/[eventId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getEvent } from '@/services/eventService';
import type { Event } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, UserCheck, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function CheckInPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = typeof params.eventId === 'string' ? params.eventId : '';
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const logoUrl = "https://i.imgur.com/aRktweQ.png";

    useEffect(() => {
        if (!eventId) {
            setError("No event ID provided. Please scan a valid QR code.");
            setIsLoading(false);
            return;
        }
        
        const fetchEvent = async () => {
            try {
                const fetchedEvent = await getEvent(eventId);
                if (fetchedEvent) {
                    setEvent(fetchedEvent);
                } else {
                    setError("The event associated with this QR code could not be found.");
                }
            } catch (err) {
                setError("An error occurred while fetching the event details.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [eventId]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading event details...</p>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
            <div className="absolute top-8 left-8 flex items-center space-x-2 text-primary">
                <Image 
                    src={logoUrl} 
                    alt="LEO Portal Logo" 
                    width={32} 
                    height={32} 
                    className="h-8 w-8 rounded-sm"
                    data-ai-hint="club logo"
                />
                <h1 className="text-2xl font-bold font-headline">LEO Portal</h1>
            </div>
            
            <Card className="w-full max-w-md shadow-xl text-center">
                <CardHeader>
                    {event ? (
                        <>
                            <CardTitle className="text-2xl font-bold font-headline">{event.name}</CardTitle>
                            <CardDescription>
                                {event.startDate ? format(parseISO(event.startDate), 'MMMM d, yyyy') : 'Date not set'}
                            </CardDescription>
                        </>
                    ) : (
                        <CardTitle className="text-2xl font-bold font-headline text-destructive">Event Not Found</CardTitle>
                    )}
                </CardHeader>
                <CardContent>
                    {error ? (
                        <p className="text-destructive">{error}</p>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-muted-foreground">Please select your status to mark your attendance.</p>
                            <div className="grid grid-cols-1 gap-4">
                                <Link href={`/login?eventId=${eventId}`} passHref>
                                    <Button className="w-full h-16 text-lg" size="lg">
                                        <User className="mr-2 h-5 w-5" />
                                        Registered Member
                                    </Button>
                                </Link>
                                <Link href={`/visiting-leo?eventId=${eventId}`} passHref>
                                    <Button className="w-full h-16 text-lg" variant="outline" size="lg">
                                        <UserCheck className="mr-2 h-5 w-5" />
                                        Visiting LEO
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    {error && (
                         <Button onClick={() => router.push('/')} className="w-full">
                            Return to Home
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
