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
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format as formatDate, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format: formatDate,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function EventManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [dialogData, setDialogData] = useState<{ event?: Event | { start: Date, end: Date }, isOpen: boolean }>({ isOpen: false });

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
  
  const calendarEvents = useMemo(() => events.map(event => ({
    title: event.name,
    start: parseISO(event.startDate),
    end: event.endDate ? parseISO(event.endDate) : parseISO(event.startDate),
    resource: event,
  })), [events]);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setDialogData({ event: { start, end }, isOpen: true });
  }, []);

  const handleSelectEvent = useCallback((calendarEvent: { resource: Event }) => {
    setDialogData({ event: calendarEvent.resource, isOpen: true });
  }, []);
  
  const handleMoveEvent = async ({ event, start, end }: { event: any, start: Date, end: Date }) => {
      const { resource } = event;
      if (!resource.id) return;
      
      const isConfirmed = window.confirm("Are you sure you want to reschedule this event?");
      if (isConfirmed) {
          setIsSubmitting(true);
          try {
              const updatedData = { 
                  name: resource.name,
                  location: resource.location,
                  description: resource.description,
                  startDate: start, 
                  endDate: end 
              };
              await updateEvent(resource.id, updatedData as EventFormValues);
              toast({ title: "Event Rescheduled", description: `${resource.name} has been moved.` });
              fetchEvents();
          } catch(error: any) {
              toast({ title: "Error", description: `Could not reschedule event: ${error.message}`, variant: "destructive"});
          }
          setIsSubmitting(false);
      }
  };

  const handleDeleteEvent = async (eventId?: string) => {
    if (!eventId) return;
    if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      setIsSubmitting(true);
      try {
        await deleteEventService(eventId);
        toast({ title: "Event Deleted" });
        fetchEvents();
        setDialogData({ isOpen: false });
      } catch (error: any) {
        toast({ title: "Error", description: `Could not delete event: ${error.message}`, variant: "destructive" });
      }
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);
    try {
      const eventToSubmit = dialogData.event as Event;
      if (eventToSubmit && 'id' in eventToSubmit && eventToSubmit.id) {
        await updateEvent(eventToSubmit.id, data);
        toast({ title: "Event Updated" });
      } else {
        await createEvent(data);
        toast({ title: "Event Created" });
      }
      fetchEvents();
      setDialogData({ isOpen: false });
    } catch (error: any) {
      toast({ title: "Error", description: `Could not save event: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  if (authLoading || isLoading || !user || !isSuperOrAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Event Calendar</h1>
        <Button onClick={() => setDialogData({ event: { start: new Date(), end: new Date() }, isOpen: true })} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Event
        </Button>
      </div>

      <div className="flex-grow">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ flexGrow: 1 }}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleMoveEvent}
          resizable
          onEventResize={handleMoveEvent}
          className="bg-card p-4 rounded-lg shadow-lg border"
        />
      </div>

      <Dialog
        open={dialogData.isOpen}
        onOpenChange={(open) => setDialogData({ isOpen: open })}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogData.event && 'id' in dialogData.event ? "Edit Event" : "Create New Event"}</DialogTitle>
          </DialogHeader>
          <EventForm
            event={dialogData.event && 'id' in dialogData.event ? dialogData.event as Event : undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setDialogData({ isOpen: false })}
            isLoading={isSubmitting}
          />
          {dialogData.event && 'id' in dialogData.event && (
             <Button 
                variant="destructive" 
                className="mt-4"
                onClick={() => handleDeleteEvent((dialogData.event as Event).id)} 
                disabled={isSubmitting}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Event
             </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
