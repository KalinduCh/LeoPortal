
// src/app/(authenticated)/events/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Event } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Eye, CalendarDays, Loader2, MapPin } from "lucide-react";
import { format, parseISO, isFuture, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getEvents, deleteEvent as deleteEventService } from '@/services/eventService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function EventManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      setIsDeleting(eventId);
      try {
        await deleteEventService(eventId);
        toast({ title: "Event Deleted" });
        fetchEvents();
      } catch (error: any) {
        toast({ title: "Error", description: `Could not delete event: ${error.message}`, variant: "destructive" });
      }
      setIsDeleting(null);
    }
  };

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      if (!event.startDate || !isValid(parseISO(event.startDate))) {
        return;
      }
      if (isFuture(parseISO(event.startDate)) || !isFuture(parseISO(event.endDate || event.startDate))) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });

    return {
      upcomingEvents: upcoming.sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()),
      pastEvents: past.sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())
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
        <Button onClick={() => router.push('/events/new')} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Create Event
        </Button>
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
                  <EventListItem 
                    key={event.id} 
                    event={event} 
                    isDeleting={isDeleting === event.id}
                    onEdit={() => router.push(`/events/${event.id}`)}
                    onDelete={() => handleDeleteEvent(event.id)} 
                    onViewSummary={() => router.push(`/admin/event-summary/${event.id}`)} 
                  />
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
                  <EventListItem 
                    key={event.id} 
                    event={event} 
                    isDeleting={isDeleting === event.id}
                    onEdit={() => router.push(`/events/${event.id}`)} 
                    onDelete={() => handleDeleteEvent(event.id)} 
                    onViewSummary={() => router.push(`/admin/event-summary/${event.id}`)} 
                  />
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
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewSummary: () => void;
}

const EventListItem = ({ event, onEdit, onDelete, onViewSummary, isDeleting }: EventListItemProps) => {
  return (
    <div className="p-3 border rounded-lg shadow-sm hover:bg-muted/50 transition-colors">
        <div className="flex justify-between items-start">
            <h3 className="font-semibold text-primary">{event.name}</h3>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={onViewSummary}>
                  <Eye className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
              </Button>
            </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{format(parseISO(event.startDate), 'PPP, p')}</p>
        <p className="text-sm text-muted-foreground flex items-center mt-1">
            <MapPin className="mr-1.5 h-4 w-4"/>
            {event.location}
        </p>
    </div>
  );
};
