// src/app/(authenticated)/calendar/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { getEvents } from '@/services/eventService';
import type { Event as MyEvent } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, MapPin, Info, Clock, Navigation } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid, isWithinInterval, isPast, isFuture, getMonth, getYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';


const eventTypeColors: Record<MyEvent['eventType'] & string, { backgroundColor: string; borderColor: string; }> = {
  club_project: { backgroundColor: '#10B981', borderColor: '#059669' },
  district_project: { backgroundColor: '#3B82F6', borderColor: '#2563EB' },
  joint_project: { backgroundColor: '#8B5CF6', borderColor: '#7C3AED' },
  official_visit: { backgroundColor: '#F59E0B', borderColor: '#D97706' },
  deadline: { backgroundColor: '#EF4444', borderColor: '#DC2626' },
  other: { backgroundColor: '#6B7280', borderColor: '#4B5563' },
};

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<MyEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar>(null);
  const isMobile = useIsMobile();
  
  const [monthlyEvents, setMonthlyEvents] = useState<MyEvent[]>([]);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());


  const fetchCalendarEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const allEvents = await getEvents();
      const calendarEvents = allEvents.map((event: MyEvent) => {
        const color = event.eventType ? eventTypeColors[event.eventType] : eventTypeColors.other;
        return {
          title: event.name,
          start: event.startDate ? parseISO(event.startDate) : new Date(),
          end: event.endDate ? parseISO(event.endDate) : undefined,
          extendedProps: { ...event },
          backgroundColor: color.backgroundColor,
          borderColor: color.borderColor,
          textColor: '#FFFFFF'
        };
      });
      setEvents(calendarEvents);
      updateMonthlyEvents(new Date(), allEvents);
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
      toast({ title: "Error", description: "Could not load calendar data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);
  
  const updateMonthlyEvents = (date: Date, allEvents: MyEvent[]) => {
      const month = getMonth(date);
      const year = getYear(date);
      const filtered = allEvents.filter(e => {
        if (!e.startDate) return false;
        const eventDate = parseISO(e.startDate);
        return getMonth(eventDate) === month && getYear(eventDate) === year;
      }).sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
      setMonthlyEvents(filtered);
  };


  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event.extendedProps as MyEvent);
    setIsModalOpen(true);
  };
  
  const handleDatesSet = (dateInfo: any) => {
      const newDate = dateInfo.view.currentStart;
      setCurrentCalendarDate(newDate);
      const allEvents: MyEvent[] = events.map(e => e.extendedProps);
      updateMonthlyEvents(newDate, allEvents);
  };
  
  let formattedModalDate = "Date unavailable";
  if (selectedEvent?.startDate && isValid(parseISO(selectedEvent.startDate))) {
      const startDate = parseISO(selectedEvent.startDate);
      formattedModalDate = format(startDate, "MMM d, yyyy 'at' h:mm a");
      if (selectedEvent.endDate && isValid(parseISO(selectedEvent.endDate))) {
          const endDate = parseISO(selectedEvent.endDate);
          if (endDate.toDateString() !== startDate.toDateString()) {
              formattedModalDate = `${format(startDate, "MMM d, h:mm a")} - ${format(endDate, "MMM d, h:mm a")}`;
          } else {
              formattedModalDate = `${format(startDate, "MMM d, yyyy, h:mm a")} - ${format(endDate, "h:mm a")}`;
          }
      }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Year Plan Calendar</h1>
        <p className="text-muted-foreground">Visualize all club, district, and multiple projects throughout the year.</p>
      </div>
      
       <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
          {Object.entries(eventTypeColors).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.backgroundColor }} />
              <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>

      <Card className="shadow-lg">
        <CardContent className="p-2 sm:p-4 md:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-96 w-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="fc-theme">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,listWeek',
                }}
                events={events}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}
                height="auto"
                dayMaxEvents={true}
                navLinks={true}
                buttonText={{
                    today: 'Today',
                    month: 'Month',
                    week: 'Week',
                    day: 'Day',
                    list: 'List',
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Events for {format(currentCalendarDate, 'MMMM yyyy')}</CardTitle>
          <CardDescription>A list of all events scheduled for this month.</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyEvents.length > 0 ? (
            <div className="space-y-4">
              {monthlyEvents.map(event => {
                const now = new Date();
                const startDate = parseISO(event.startDate);
                const endDate = event.endDate ? parseISO(event.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
                
                let status: 'Ongoing' | 'Upcoming' | 'Past' = 'Upcoming';
                let statusClass = 'bg-green-100 text-green-800 border-green-200';
                
                if (isPast(endDate)) {
                    status = 'Past';
                    statusClass = 'bg-gray-100 text-gray-800 border-gray-200';
                } else if (isWithinInterval(now, { start: startDate, end: endDate })) {
                    status = 'Ongoing';
                    statusClass = 'bg-blue-100 text-blue-800 border-blue-200';
                }

                return (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors">
                    <div className="flex-grow">
                      <p className="font-semibold text-primary">{event.name}</p>
                      <p className="text-sm text-muted-foreground">{format(startDate, 'MMM d, yyyy, p')}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                       <Badge variant="outline" className={cn("capitalize", statusClass)}>{status}</Badge>
                       <Button variant="ghost" size="sm" onClick={() => { setSelectedEvent(event); setIsModalOpen(true);}}>View Details</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No events scheduled for this month.</p>
          )}
        </CardContent>
      </Card>
      
      {selectedEvent && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-headline text-primary">{selectedEvent.name}</DialogTitle>
                    <DialogDescription className="pt-2">
                         <Badge style={{ backgroundColor: eventTypeColors[selectedEvent.eventType || 'other'].backgroundColor, color: '#fff', borderColor: eventTypeColors[selectedEvent.eventType || 'other'].borderColor }} className={cn("text-white")}>
                            {selectedEvent.eventType?.replace(/_/g, ' ') || 'Other'}
                        </Badge>
                    </DialogDescription>
                </DialogHeader>
                 <div className="space-y-3 py-4">
                    <div className="flex items-center text-sm">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{formattedModalDate}</span>
                    </div>
                    {selectedEvent.location && selectedEvent.eventType !== 'deadline' && (
                        <div className="flex items-center text-sm">
                            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{selectedEvent.location}</span>
                        </div>
                    )}
                    {typeof selectedEvent.latitude === 'number' && typeof selectedEvent.longitude === 'number' && (
                        <div className="flex items-start text-xs text-green-600 mt-2">
                            <Navigation className="mr-2 h-3 w-3 mt-0.5 shrink-0" />
                            <span>Geo-restricted attendance enabled.</span>
                        </div>
                    )}
                    <div className="flex items-start text-sm">
                        <Info className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      )}

      <style jsx global>{`
        .fc-theme .fc-button-primary {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .fc-theme .fc-button-primary:not(:disabled):hover, .fc-theme .fc-button-primary:not(:disabled):active {
          background-color: hsl(var(--primary) / 0.9);
          border-color: hsl(var(--primary) / 0.9);
        }
        .fc-theme .fc-button-primary:disabled {
          background-color: hsl(var(--primary));
          opacity: 0.5;
        }
        .fc-theme .fc-button-primary.fc-button-active {
            background-color: hsl(var(--accent));
            border-color: hsl(var(--accent));
        }
        .fc-theme .fc-daygrid-day.fc-day-today {
          background-color: hsl(var(--accent) / 0.1);
        }
        .fc-theme .fc-list-event-dot {
            border-color: var(--fc-event-border-color) !important;
        }
        .fc-theme a.fc-event {
            cursor: pointer;
        }
        .fc-theme .fc-h-event {
            border: 1px solid var(--fc-event-border-color) !important;
            background-color: var(--fc-event-bg-color) !important;
        }
        /* Make header responsive */
        .fc-toolbar.fc-header-toolbar {
            flex-direction: column;
            gap: 1rem;
        }
        @media (min-width: 768px) {
            .fc-toolbar.fc-header-toolbar {
                flex-direction: row;
                gap: 0;
            }
        }
      `}</style>
    </div>
  );
}
