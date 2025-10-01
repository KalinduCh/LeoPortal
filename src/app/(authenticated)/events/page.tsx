
// src/app/(authenticated)/events/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Event, User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Eye, CalendarDays, Loader2, MapPin, Trash2 } from "lucide-react";
import { format, parseISO, isFuture, isPast, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getEvents, deleteEvent as deleteEventService } from '@/services/eventService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EventManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


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
  
  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setIsDeleteAlertOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!eventToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteEventService(eventToDelete.id);
      toast({ title: "Event Deleted", description: `"${eventToDelete.name}" has been removed.` });
      fetchEvents();
    } catch (error: any) {
      toast({ title: "Error", description: `Could not delete event: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
    setIsDeleteAlertOpen(false);
    setEventToDelete(null);
  };

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      if (!event.startDate || !isValid(parseISO(event.startDate))) {
        return;
      }
      
      const startDate = parseISO(event.startDate);
      const endDate = event.endDate && isValid(parseISO(event.endDate))
          ? parseISO(event.endDate)
          : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

      if (isPast(endDate)) {
        past.push(event);
      } else {
        upcoming.push(event);
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
    <>
      <div className="container mx-auto py-4 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline">Event Management</h1>
          <Button onClick={() => router.push('/events/new')} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Event
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
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
                      onEdit={() => router.push(`/events/${event.id}`)}
                      onDelete={() => handleDeleteClick(event)} 
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
                      onEdit={() => router.push(`/events/${event.id}`)} 
                      onDelete={() => handleDeleteClick(event)} 
                      onViewSummary={() => router.push(`/admin/event-summary/${event.id}`)} 
                    />
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-4">No past events found.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event "{eventToDelete?.name}" and all its associated attendance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface EventListItemProps {
  event: Event;
  onEdit: () => void;
  onDelete: () => void;
  onViewSummary: () => void;
}

const EventListItem = ({ event, onEdit, onDelete, onViewSummary }: EventListItemProps) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <h3 className="font-semibold text-primary">{event.name}</h3>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <p className="text-sm text-muted-foreground flex items-center">
            <CalendarDays className="mr-1.5 h-4 w-4"/>
            {format(parseISO(event.startDate), 'PPP, p')}
        </p>
        <p className="text-sm text-muted-foreground flex items-center">
            <MapPin className="mr-1.5 h-4 w-4"/>
            {event.location}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={onViewSummary}>
              <Eye className="mr-1.5 h-3.5 w-3.5" /> Summary
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
      </CardFooter>
    </Card>
  );
};
