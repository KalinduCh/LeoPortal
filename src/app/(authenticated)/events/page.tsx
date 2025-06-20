
// src/app/(authenticated)/events/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2, CalendarDays, Loader2 } from "lucide-react";
import { mockEvents as initialMockEvents } from '@/lib/data'; 
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { EventForm, type EventFormValues } from "@/components/events/event-form"; 

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
    // Simulate API call by using a copy of initial mock data
    await new Promise(resolve => setTimeout(resolve, 300));
    setEvents([...initialMockEvents].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setIsLoading(false);
  }, []);

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
    if(confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
        setIsSubmitting(true);
        // Simulate API call for deletion
        await new Promise(resolve => setTimeout(resolve, 700));
        setEvents(prev => {
          const updatedEvents = prev.filter(e => e.id !== eventId);
          // In a real app, you'd also update lib/data.ts or backend
          // For mock, we are only updating the state here
          return updatedEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        });
        toast({title: "Event Deleted", description: "The event has been successfully deleted."});
        setIsSubmitting(false);
    }
  };
  
  const handleFormSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (selectedEvent) { // Editing existing event
      setEvents(prev => 
        prev.map(e => 
          e.id === selectedEvent.id ? { ...selectedEvent, ...data, date: data.date.toISOString() } : e
        ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      );
      toast({title: "Event Updated", description: "The event details have been successfully updated."});
    } else { // Creating new event
      const newEvent: Event = {
        id: `event-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, // More unique ID
        ...data,
        date: data.date.toISOString(),
      };
      setEvents(prev => [...prev, newEvent].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      toast({title: "Event Created", description: "The new event has been successfully created."});
    }
    
    setIsSubmitting(false);
    setIsFormOpen(false);
    setSelectedEvent(null);
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
            if (!open) setSelectedEvent(null); // Reset selected event when dialog closes
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
          <CardDescription>View, edit, or delete club events.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>{format(parseISO(event.date), "MMM d, yyyy 'at' h:mm a")}</TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleEditEvent(event)} aria-label="Edit Event" disabled={isSubmitting}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteEvent(event.id)} aria-label="Delete Event" disabled={isSubmitting}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
