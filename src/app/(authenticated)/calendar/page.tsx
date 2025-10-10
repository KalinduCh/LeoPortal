// src/app/(authenticated)/calendar/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getEvents } from '@/services/eventService';
import type { Event as MyEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Info, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isSameMonth, isSameDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: MyEvent;
}

const eventTypeColors: Record<MyEvent['eventType'] & string, string> = {
  club_project: 'bg-green-500 border-green-500',
  district_project: 'bg-blue-500 border-blue-500',
  joint_project: 'bg-purple-500 border-purple-500',
  official_visit: 'bg-orange-500 border-orange-500',
  deadline: 'bg-red-500 border-red-500',
  other: 'bg-gray-500 border-gray-500',
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  const DayWithEvents = ({ date, month }: { date: Date, month: Date | undefined }) => {
    const eventsForDay = events.filter(e => isSameDay(e.start, date));

    return (
      <div className="relative h-full w-full">
        <time dateTime={date.toISOString()}>{date.getDate()}</time>
        {eventsForDay.length > 0 && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex space-x-1">
            {eventsForDay.slice(0, 2).map(event => (
              <div
                key={event.resource.id}
                className={cn("h-1 w-1 rounded-full", eventTypeColors[event.resource.eventType || 'other'])}
              />
            ))}
          </div>
        )}
      </div>
    );
  };
  
  const eventsInCurrentMonth = useMemo(() => {
    return events
      .filter(event => isSameMonth(event.start, currentMonth))
      .sort((a,b) => a.start.getTime() - b.start.getTime());
  }, [events, currentMonth]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Year Plan Calendar</h1>
        <p className="text-muted-foreground">Visualize all club, district, and multiple projects throughout the year.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="shadow-lg lg:col-span-2">
            <CardContent className="p-2 sm:p-4 md:p-6 flex justify-center">
            {isLoading ? (
                <div className="flex justify-center items-center h-96 w-full">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <Calendar
                    mode="single"
                    selected={new Date()} // Doesn't need to be stateful, just for style
                    onMonthChange={setCurrentMonth}
                    month={currentMonth}
                    className="p-0"
                    classNames={{
                        day: "h-16 w-16 text-lg",
                        head_cell: "text-muted-foreground rounded-md w-16 font-normal text-sm",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    }}
                    components={{
                        Day: DayWithEvents
                    }}
                />
            )}
            </CardContent>
        </Card>
        
        <div className="space-y-6">
             <Card>
                <CardHeader>
                  <CardTitle>Legend</CardTitle>
                  <CardDescription>Event types are color-coded for easy identification.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-x-4 gap-y-2">
                  {Object.entries(eventTypeColors).map(([type, colorClass]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", colorClass)} />
                      <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Events in {format(currentMonth, 'MMMM yyyy')}</CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto pr-3">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : eventsInCurrentMonth.length > 0 ? (
                        <div className="space-y-4">
                            {eventsInCurrentMonth.map(event => (
                                 <Popover key={event.resource.id}>
                                    <PopoverTrigger asChild>
                                        <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                                            <div className="text-center w-12 shrink-0">
                                                <p className="text-xs text-muted-foreground">{format(event.start, 'MMM')}</p>
                                                <p className="text-lg font-bold">{format(event.start, 'd')}</p>
                                            </div>
                                            <div className="border-l pl-3 min-w-0">
                                                <p className="font-semibold text-primary truncate">{event.title}</p>
                                                <p className="text-xs text-muted-foreground flex items-center">
                                                    <Clock className="h-3 w-3 mr-1"/>
                                                    {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
                                                </p>
                                            </div>
                                            <div className={cn("ml-auto self-center h-3 w-3 rounded-full shrink-0", eventTypeColors[event.resource.eventType || 'other'])}></div>
                                        </div>
                                    </PopoverTrigger>
                                     <PopoverContent className="w-80">
                                        <div className="space-y-3">
                                          <h3 className="font-semibold leading-none tracking-tight text-lg text-primary">{event.title}</h3>
                                          <Badge className={cn("text-white", eventTypeColors[event.resource.eventType || 'other'])}>{event.resource.eventType?.replace(/_/g, ' ') || 'Other'}</Badge>
                                          <div className="text-sm text-muted-foreground flex items-center">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            <span>
                                              {format(event.start, "MMM d, h:mm a")} - {format(event.end, "h:mm a")}
                                            </span>
                                          </div>
                                          {event.resource.location && 
                                            <div className="text-sm text-muted-foreground flex items-center">
                                                <MapPin className="mr-2 h-4 w-4" />
                                                <span>{event.resource.location}</span>
                                            </div>
                                          }
                                          <p className="text-sm">{event.resource.description}</p>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No events scheduled for this month.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
