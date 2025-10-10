// src/app/(authenticated)/calendar/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getEvents } from '@/services/eventService';
import type { Event as MyEvent } from '@/types';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Info, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: MyEvent;
}

const eventTypeColors: Record<MyEvent['eventType'] & string, string> = {
  club_project: 'bg-green-500',
  district_project: 'bg-blue-500',
  joint_project: 'bg-purple-500',
  official_visit: 'bg-orange-500',
  deadline: 'bg-red-500',
  other: 'bg-gray-500',
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCalendarEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const allEvents = await getEvents();
      const calendarEvents = allEvents.map((event: MyEvent) => {
        const start = parseISO(event.startDate);
        const end = event.endDate ? parseISO(event.endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000); // Default to 2 hours if no end date
        return {
          title: event.name,
          start,
          end,
          resource: event,
        };
      });
      setEvents(calendarEvents);
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
      toast({ title: "Error", description: "Could not load calendar data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = eventTypeColors[event.resource.eventType || 'other'] || 'bg-gray-500';
    const style = {
      backgroundColor: '', // Will be overridden by className
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
      className: `${backgroundColor} text-white p-1`,
    };
    return {
      style: style,
      className: style.className,
    };
  };

  const EventComponent = ({ event }: { event: CalendarEvent }) => (
    <Popover>
      <PopoverTrigger asChild>
        <div className="p-1 cursor-pointer w-full h-full">
          <p className="text-xs font-semibold truncate">{event.title}</p>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <h3 className="font-semibold leading-none tracking-tight text-lg text-primary">{event.title}</h3>
          <Badge className={eventTypeColors[event.resource.eventType || 'other']}>{event.resource.eventType?.replace(/_/g, ' ') || 'Other'}</Badge>
          <div className="text-sm text-muted-foreground flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>
              {format(event.start, "MMM d, h:mm a")} - {format(event.end, "h:mm a")}
            </span>
          </div>
          <div className="text-sm text-muted-foreground flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            <span>{event.resource.location}</span>
          </div>
          <p className="text-sm">{event.resource.description}</p>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Year Plan Calendar</h1>
        <p className="text-muted-foreground">Visualize all club, district, and multiple projects throughout the year.</p>
      </div>
      <Card className="shadow-lg">
        <CardContent className="p-2 sm:p-4 md:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-[70vh] text-sm">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                eventPropGetter={eventStyleGetter}
                components={{
                  event: EventComponent,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Legend</CardTitle>
          <CardDescription>Event types are color-coded for easy identification.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {Object.entries(eventTypeColors).map(([type, colorClass]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-sm ${colorClass}`} />
              <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
