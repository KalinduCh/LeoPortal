
// src/app/(authenticated)/calendar/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { getEvents } from '@/services/eventService';
import type { Event as MyEvent } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, MapPin, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

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

  const fetchCalendarEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const allEvents = await getEvents();
      const calendarEvents = allEvents.map((event: MyEvent) => {
        const color = event.eventType ? eventTypeColors[event.eventType] : eventTypeColors.other;
        return {
          title: event.name,
          start: parseISO(event.startDate),
          end: event.endDate ? parseISO(event.endDate) : undefined,
          extendedProps: { ...event },
          backgroundColor: color.backgroundColor,
          borderColor: color.borderColor,
          textColor: '#FFFFFF'
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

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event.extendedProps as MyEvent);
    setIsModalOpen(true);
  };
  
  let formattedModalDate = "Date unavailable";
  if (selectedEvent?.startDate && isValid(parseISO(selectedEvent.startDate))) {
      const startDate = parseISO(selectedEvent.startDate);
      formattedModalDate = format(startDate, "MMM d, yyyy 'at' h:mm a");
      if (selectedEvent.endDate && isValid(parseISO(selectedEvent.endDate))) {
          const endDate = parseISO(selectedEvent.endDate);
          if (endDate.toDateString() !== startDate.toDateString()) {
              formattedModalDate += ` - ${format(endDate, "MMM d, yyyy 'at' h:mm a")}`;
          } else {
              formattedModalDate += ` - ${format(endDate, "h:mm a")}`;
          }
      }
  }


  return (
    <div className="container mx-auto py-8">
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
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                }}
                events={events}
                eventClick={handleEventClick}
                height="auto"
                dayMaxEvents={true} // For better month view on small screens
                navLinks={true}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedEvent && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-headline text-primary">{selectedEvent.name}</DialogTitle>
                    <DialogDescription className="pt-2">
                        <Badge className={cn("text-white", `bg-[${eventTypeColors[selectedEvent.eventType || 'other'].backgroundColor}]`)} style={{ backgroundColor: eventTypeColors[selectedEvent.eventType || 'other'].backgroundColor}}>
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
                    <div className="flex items-start text-sm">
                        <Info className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <p className="text-muted-foreground leading-relaxed">{selectedEvent.description}</p>
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
        .fc-theme .fc-button-primary:hover {
          background-color: hsl(var(--primary) / 0.9);
        }
        .fc-theme .fc-button-primary:disabled {
          background-color: hsl(var(--primary));
          opacity: 0.5;
        }
        .fc-theme .fc-button-primary:active, .fc-theme .fc-button-primary.fc-button-active {
            background-color: hsl(var(--primary) / 0.8);
            border-color: hsl(var(--primary) / 0.8);
        }
        .fc-theme .fc-daygrid-day.fc-day-today {
          background-color: hsl(var(--accent) / 0.1);
        }
        .fc-theme .fc-list-event-dot {
            border-color: var(--fc-event-border-color) !important;
        }
        .fc-theme .fc-h-event {
            border: 1px solid var(--fc-event-border-color) !important;
            background-color: var(--fc-event-bg-color) !important;
        }
      `}</style>
    </div>
  );
}
