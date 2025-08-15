
// src/app/(authenticated)/events/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2, CalendarDays, Loader2, Eye, MapPin } from "lucide-react";
import { format, parseISO, isPast, isFuture, isValid } from 'date-fns';
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
      // Sort by startDate (descending - most recent first)
      setEvents(fetchedEvents.sort((a,b) => {
          const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
          const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
          return dateB - dateA;
      })); 
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
            setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId)); 
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

  if (authLoading || isLoading || !user || !isSuperOrAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Event Management</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) setSelectedEvent(null);
            setIsFormOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew} className="w-full sm:w-auto">
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
          <CardTitle className="flex items-center text-lg sm:text-xl">
            <CalendarDays className="mr-2 h-5 w-5 text-primary" /> All Events
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">View, edit, or delete club events. Events are sorted by most recent start date first.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && events.length === 0 ? (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : events.length > 0 ? (
            <>
              {/* Desktop Table View (hidden on < md) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => {
                      const eventStartDateObj = event.startDate && isValid(parseISO(event.startDate)) ? parseISO(event.startDate) : null;
                      const eventEndDateObj = event.endDate && isValid(parseISO(event.endDate)) ? parseISO(event.endDate) : null;

                      let statusText: 'Upcoming' | 'Ongoing' | 'Past' | 'Invalid Date' = 'Invalid Date';
                      let statusClassName = 'bg-yellow-500 hover:bg-yellow-600 text-white';

                      if (eventStartDateObj) {
                        const effectiveEndDate = eventEndDateObj || new Date(eventStartDateObj.getTime() + 24 * 60 * 60 * 1000); // 24 hours if no end date
                        if (isFuture(eventStartDateObj)) {
                          statusText = 'Upcoming';
                          statusClassName = 'bg-green-600 hover:bg-green-700 text-white'; // Green
                        } else if (isPast(effectiveEndDate)) {
                          statusText = 'Past';
                          statusClassName = 'bg-gray-500 hover:bg-gray-600 text-white'; // Ash
                        } else {
                          statusText = 'Ongoing';
                          statusClassName = 'bg-blue-600 hover:bg-blue-700 text-white'; // Blue
                        }
                      }
                      
                      return (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.name}</TableCell>
                          <TableCell>{eventStartDateObj ? format(eventStartDateObj, "MMM d, yyyy 'at' h:mm a") : "Invalid Date"}</TableCell>
                          <TableCell>{event.location}</TableCell>
                          <TableCell>
                            <Badge variant="default" className={statusClassName}>
                              {statusText}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1 sm:space-x-2">
                            <Button variant="outline" size="icon" onClick={() => handleEditEvent(event)} aria-label="Edit Event" disabled={isSubmitting} className="h-8 w-8 sm:h-9 sm:w-9">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDeleteEvent(event.id)} aria-label="Delete Event" disabled={isSubmitting} className="h-8 w-8 sm:h-9 sm:w-9">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleViewSummary(event.id)} aria-label="View Event Summary" disabled={isSubmitting} className="h-8 w-8 sm:h-9 sm:w-9">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Card View (visible on < md) */}
              <div className="block md:hidden space-y-4">
                {events.map((event) => {
                  const eventStartDateObj = event.startDate && isValid(parseISO(event.startDate)) ? parseISO(event.startDate) : null;
                  const eventEndDateObj = event.endDate && isValid(parseISO(event.endDate)) ? parseISO(event.endDate) : null;

                  let statusText: 'Upcoming' | 'Ongoing' | 'Past' | 'Invalid Date' = 'Invalid Date';
                  let statusClassName = 'bg-yellow-500 hover:bg-yellow-600 text-white';

                  if (eventStartDateObj) {
                    const effectiveEndDate = eventEndDateObj || new Date(eventStartDateObj.getTime() + 24 * 60 * 60 * 1000);
                    if (isFuture(eventStartDateObj)) {
                      statusText = 'Upcoming';
                      statusClassName = 'bg-green-600 hover:bg-green-700 text-white';
                    } else if (isPast(effectiveEndDate)) {
                      statusText = 'Past';
                      statusClassName = 'bg-gray-500 hover:bg-gray-600 text-white';
                    } else {
                      statusText = 'Ongoing';
                      statusClassName = 'bg-blue-600 hover:bg-blue-700 text-white';
                    }
                  }

                  return (
                    <Card key={event.id} className="shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-md font-semibold">{event.name}</CardTitle>
                        <CardDescription className="text-xs">
                            <Badge variant="default" className={`text-xs ${statusClassName}`}>
                              {statusText}
                            </Badge>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm pb-3">
                        <div className="flex items-center">
                            <CalendarDays className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            <span>{eventStartDateObj ? format(eventStartDateObj, "MMM d, yyyy 'at' h:mm a") : "Invalid Date"}</span>
                        </div>
                        <div className="flex items-center">
                            <MapPin className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            <span>{event.location}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-2 pt-3">
                        <Button variant="outline" size="sm" onClick={() => handleEditEvent(event)} disabled={isSubmitting}>
                          <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(event.id)} disabled={isSubmitting}>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleViewSummary(event.id)} disabled={isSubmitting}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Summary
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">No events found. Create one to get started!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
