
// src/app/visiting-leo/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';
import { getEvents } from '@/services/eventService';
import { VisitorAttendanceForm, type VisitorAttendanceFormValues } from '@/components/events/visitor-attendance-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CalendarDays, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, parseISO, isFuture, isValid, isWithinInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { markVisitorAttendance } from '@/services/attendanceService';
import Link from 'next/link';
import Image from 'next/image';

export default function VisitingLeoPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const logoUrl = "https://i.imgur.com/aRktweQ.png";

  const fetchActiveEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const allEvents = await getEvents();
      const activeEvents = allEvents.filter(event => {
        if (!event.startDate || !isValid(parseISO(event.startDate))) {
            return false;
        }
        const startDate = parseISO(event.startDate);
        const now = new Date();

        if (isFuture(startDate)) {
            return true;
        }
        
        if (event.endDate && isValid(parseISO(event.endDate))) {
            const endDate = parseISO(event.endDate);
            return isWithinInterval(now, { start: startDate, end: endDate });
        }
        
        const oneDayAfterStart = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        return isWithinInterval(now, { start: startDate, end: oneDayAfterStart });

      }).sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
      
      setEvents(activeEvents);
    } catch (error) {
      console.error("Failed to fetch events for visiting Leos:", error);
      toast({ title: "Error", description: "Could not load upcoming events.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchActiveEvents();
  }, [fetchActiveEvents]);

  const handleOpenForm = (event: Event) => {
    setSelectedEvent(event);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: VisitorAttendanceFormValues) => {
    if (!selectedEvent || !selectedEvent.id) {
      toast({ title: "Error", description: "No event selected or event ID is missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await markVisitorAttendance(selectedEvent.id, data);
      if (result.status === 'success') {
        toast({ title: "Attendance Marked!", description: `Thank you, ${data.name}, for marking your attendance for ${selectedEvent.name}.` });
        setIsFormOpen(false);
        setSelectedEvent(null);
      } else {
        toast({ title: "Submission Error", description: result.message || "Could not mark attendance.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Failed to mark visitor attendance:", error);
      toast({ title: "Submission Error", description: `Could not mark attendance: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4 text-primary">
            <Image 
                src={logoUrl} 
                alt="LEO Portal Logo" 
                width={40} 
                height={40} 
                className="h-10 w-10 rounded-md"
                data-ai-hint="club logo"
            />
            <h1 className="text-3xl font-bold font-headline">LEO Portal</h1>
          </Link>
          <h2 className="text-2xl font-semibold text-foreground">Visiting Leo Attendance</h2>
          <p className="text-muted-foreground">Welcome! Please select an event to mark your attendance.</p>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : events.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-4">
              {events.map(event => {
                let formattedEventDate = "Date unavailable";
                if (event.startDate && isValid(parseISO(event.startDate))) {
                    const eventStartDateObj = parseISO(event.startDate);
                    formattedEventDate = format(eventStartDateObj, "MMM d, yyyy, h:mm a");
                    if (event.endDate && isValid(parseISO(event.endDate))) {
                        const eventEndDateObj = parseISO(event.endDate);
                        if (eventEndDateObj.toDateString() !== eventStartDateObj.toDateString()) {
                          formattedEventDate = `${format(eventStartDateObj, "MMM d, h:mm a")} - ${format(eventEndDateObj, "MMM d, h:mm a")}`;
                        } else {
                          formattedEventDate = `${format(eventStartDateObj, "MMM d, yyyy, h:mm a")} - ${format(eventEndDateObj, "h:mm a")}`;
                        }
                    }
                }
                return (
                <Card key={event.id} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <CardTitle className="font-headline text-xl text-primary">{event.name}</CardTitle>
                    <CardDescription className="flex items-center text-sm">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {formattedEventDate}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start text-sm">
                      <MapPin className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{event.location}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{event.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={() => handleOpenForm(event)}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Mark My Attendance
                    </Button>
                  </CardFooter>
                </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle className="flex items-center justify-center">
                <AlertTriangle className="mr-2 h-6 w-6 text-destructive" /> No Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">There are no upcoming or ongoing events scheduled at this moment. Please check back later.</p>
              <Button asChild variant="link" className="mt-4">
                <Link href="/login">Return to Login</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedEvent && (
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) setSelectedEvent(null);
            setIsFormOpen(open);
          }}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-headline text-xl">Mark Attendance for: {selectedEvent.name}</DialogTitle>
                <DialogDescription>
                  Please provide your details. Fields marked with * are required.
                </DialogDescription>
              </DialogHeader>
              <VisitorAttendanceForm
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsFormOpen(false);
                  setSelectedEvent(null);
                }}
                isLoading={isSubmitting}
                eventDate={selectedEvent.startDate && isValid(parseISO(selectedEvent.startDate)) ? format(parseISO(selectedEvent.startDate), "MMMM d, yyyy, h:mm a") : "Date not available"}
              />
            </DialogContent>
          </Dialog>
        )}
        <footer className="mt-8 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} LEO Portal. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
