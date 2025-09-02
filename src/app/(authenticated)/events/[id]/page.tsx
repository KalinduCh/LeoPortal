
// src/app/(authenticated)/events/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/types';
import { getEvent, createEvent, updateEvent } from '@/services/eventService';
import { EventForm, type EventFormValues } from '@/components/events/event-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function EventFormPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    const eventId = typeof params.id === 'string' ? params.id : null;
    const isNewEvent = eventId === 'new';

    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(!isNewEvent);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

    useEffect(() => {
        if (!authLoading && !isSuperOrAdmin) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, router, isSuperOrAdmin]);

    const fetchEventData = useCallback(async () => {
        if (isNewEvent || !eventId) {
            setIsLoading(false);
            return;
        }

        try {
            const fetchedEvent = await getEvent(eventId);
            if (fetchedEvent) {
                setEvent(fetchedEvent);
            } else {
                toast({ title: "Error", description: "Event not found.", variant: "destructive" });
                router.replace('/events');
            }
        } catch (error: any) {
            toast({ title: "Error", description: `Failed to load event data: ${error.message}`, variant: "destructive" });
        }
        setIsLoading(false);
    }, [eventId, isNewEvent, router, toast]);

    useEffect(() => {
        if (isSuperOrAdmin) {
            fetchEventData();
        }
    }, [isSuperOrAdmin, fetchEventData]);

    const handleFormSubmit = async (data: EventFormValues) => {
        setIsSubmitting(true);
        try {
            if (isNewEvent) {
                await createEvent(data);
                toast({ title: "Event Created", description: "The new event has been successfully created." });
            } else if (eventId) {
                await updateEvent(eventId, data);
                toast({ title: "Event Updated", description: "The event details have been successfully updated." });
            }
            router.push('/events');
        } catch (error: any) {
            toast({ title: "Error", description: `Could not save event: ${error.message}`, variant: "destructive" });
            setIsSubmitting(false);
        }
    };
    
    if (isLoading || authLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-4 sm:py-8 max-w-2xl">
            <div className="mb-4">
                <Button variant="outline" size="sm" onClick={() => router.push('/events')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Events
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{isNewEvent ? 'Create New Event' : 'Edit Event'}</CardTitle>
                    <CardDescription>
                        {isNewEvent ? 'Fill out the details below to schedule a new event.' : 'Update the details for the existing event.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EventForm
                        event={event}
                        onSubmit={handleFormSubmit}
                        onCancel={() => router.push('/events')}
                        isLoading={isSubmitting}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
