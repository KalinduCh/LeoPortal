// src/app/(authenticated)/events/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Event } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2, CalendarDays, Loader2, Eye, MapPin } from "lucide-react";
import { format, parseISO, isPast, isFuture, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { EventForm, type EventFormValues } from "@/components/events/event-form";
import { getEvents, createEvent, updateEvent, deleteEvent as deleteEventService } from '@/services/eventService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function EventManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isSuperOrAdmin) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, isSuperOrAdmin]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedEvents = await getEvents();
      setEvents(fetchedEvents);
    } catch (error: any) {
      console.error("Failed to fetch events:", error);
      toast({ title: "Error", description: `Could not load events: ${error.message}`, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (user && isSuperOrAdmin) {
      fetchEvents();
    }
  }, [user, fetchEvents, isSuperOrAdmin]);

  const handleOpenForm = (event?: Event) => {
    setSelectedEvent(event || null);
    setIsFormOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      setIsSubmitting(true);
      try {
        await deleteEventService(eventId);
        toast({ title: "Event Deleted" });
        fetchEvents();
      } catch (error: any) {
        toast({ title: "Error", description: `Could not delete event: ${error.message}`, variant: "destructive" });
      }
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, data);
        toast({ title: "Event Updated" });
      } else {
        await createEvent(data);
        toast({ title: "Event Created" });
      }
      fetchEvents();
      setIsFormOpen(false);
      setSelectedEvent(null);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not save event: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      if (!event.startDate || !isValid(parseISO(event.startDate))) {
        return;
      }
      if (isFuture(parseISO(event.startDate)) || isPast(parseISO(event.startDate)) === false) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });

    return { 
      upcomingEvents: upcoming.sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()),
      pastEvents: past.sort((a,b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())
    };
  }, [events]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isSuperOrAdmin) return null;

  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Event Management</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
            </DialogHeader>
            <EventForm
              event={selectedEvent}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary"/>Upcoming Events</CardTitle>
            <CardDescription>Events that are scheduled for the future.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map(event => (
                  <EventListItem key={event.id} event={event} onEdit={handleOpenForm} onDelete={handleDeleteEvent} onViewSummary={() => router.push(`/admin/event-summary/${event.id}`)} />
                ))}
              </div>
            ) : <p className="text-muted-foreground text-center py-4">No upcoming events.</p>}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-muted-foreground"/>Past Events</CardTitle>
            <CardDescription>Events that have already concluded.</CardDescription>
          </CardHeader>
          <CardContent>
            {pastEvents.length > 0 ? (
              <div className="space-y-4">
                {pastEvents.map(event => (
                  <EventListItem key={event.id} event={event} onEdit={handleOpenForm} onDelete={handleDeleteEvent} onViewSummary={() => router.push(`/admin/event-summary/${event.id}`)} />
                ))}
              </div>
            ) : <p className="text-muted-foreground text-center py-4">No past events found.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface EventListItemProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onViewSummary: (eventId: string) => void;
}

const EventListItem = ({ event, onEdit, onDelete, onViewSummary }: EventListItemProps) => {
  return (
    <div className="p-3 border rounded-lg shadow-sm hover:bg-muted/50 transition-colors">
        <div className="flex justify-between items-start">
            <h3 className="font-semibold text-primary">{event.name}</h3>
             <Button variant="outline" size="sm" onClick={() => onViewSummary(event.id)} className="ml-auto mr-2">
                <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(event)}>
                <Edit className="h-4 w-4" />
            </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{format(parseISO(event.startDate), 'PPP, p')}</p>
        <p className="text-sm text-muted-foreground flex items-center mt-1">
            <MapPin className="mr-1.5 h-4 w-4"/>
            {event.location}
        </p>
    </div>
  );
};
