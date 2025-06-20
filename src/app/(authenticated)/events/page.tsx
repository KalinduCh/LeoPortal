
// src/app/(authenticated)/events/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2, CalendarDays, Loader2, Eye } from "lucide-react";
import { format, parseISO, isPast } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { EventForm, type EventFormValues } from "@/components/events/event-form";
import { getEvents, createEvent, updateEvent, deleteEvent as deleteEventService } from '@/services/eventService';

export default function EventManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedEvents = await getEvents();
      setEvents(fetchedEvents.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())); 
    } catch (error: any) {
      console.error("Failed to fetch events:", error);
      toast({ title: "Error", description: `Could not load events: ${error.message}`, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  const handleCreateNew = () => {
    setSelectedEvent(null);
    setIsFormOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsFormOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!eventId) {
        toast({ title: "Error", description: "Cannot delete event: Event ID is missing.", variant: "destructive"});
        console.error("handleDeleteEvent: eventId is undefined or empty.");
        return;
    }
    if(confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
        setIsSubmitting(true);
        try {
            await deleteEventService(eventId);
            toast({title: "Event Deleted", description: "The event has been successfully deleted."});
            setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId)); // Optimistic update
        } catch (error: any) {
            console.error(`Failed to delete event with ID ${eventId}:`, error);
            let description = `Could not delete the event. Error: ${error.message || 'Unknown Firestore error.'}`;
            if (error.code) {
                description += ` (Code: ${error.code})`;
            }
            toast({ title: "Error Deleting Event", description, variant: "destructive", duration: 7000 });
        }
        setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);
    try {
      if (selectedEvent) { 
        await updateEvent(selectedEvent.id, data);
        toast({title: "Event Updated", description: "The event details have been successfully updated."});
      } else { 
        await createEvent(data);
        toast({title: "Event Created", description: "The new event has been successfully created."});
      }
      fetchEvents(); 
      setIsFormOpen(false);
      setSelectedEvent(null);
    } catch (error: any) {
      console.error("Failed to save event:", error);
      const action = selectedEvent ? "update" : "create";
      toast({ title: "Error", description: `Could not ${action} the event: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleViewSummary = (eventId: string) => {
    router.push(`/admin/event-summary/${eventId}`);
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">Event Management</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) setSelectedEvent(null);
            setIsFormOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
            </DialogHeader>
            <EventForm
                event={selectedEvent}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                    setIsFormOpen(false);
                    setSelectedEvent(null);
                }}
                isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarDays className="mr-2 h-5 w-5 text-primary" /> All Events
          </CardTitle>
          <CardDescription>View, edit, or delete club events. Events are sorted by most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const eventDate = parseISO(event.date);
                  const isEventPast = isPast(eventDate);
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>{format(eventDate, "MMM d, yyyy 'at' h:mm a")}</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell>
                        <Badge variant={isEventPast ? "secondary" : "default"} className={!isEventPast ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                          {isEventPast ? "Past" : "Upcoming"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditEvent(event)} aria-label="Edit Event" disabled={isSubmitting}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteEvent(event.id)} aria-label="Delete Event" disabled={isSubmitting}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {isEventPast && (
                           <Button variant="ghost" size="icon" onClick={() => handleViewSummary(event.id)} aria-label="View Event Summary" disabled={isSubmitting}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No events found. Create one to get started!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
