// src/components/events/event-card.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Event, UserRole, AttendanceRecord } from '@/types';
import { CalendarDays, MapPin, Info, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format, parseISO, isFuture, isPast } from 'date-fns';

interface EventCardProps {
  event: Event;
  userRole: UserRole;
  onMarkAttendance?: (eventId: string, status: 'present') => void;
  attendanceRecord?: AttendanceRecord | null;
  isAttendanceActionLoading?: boolean;
}

export function EventCard({ event, userRole, onMarkAttendance, attendanceRecord, isAttendanceActionLoading }: EventCardProps) {
  const eventDate = parseISO(event.date);
  const formattedDate = format(eventDate, "MMMM d, yyyy 'at' h:mm a");
  const isEventUpcoming = isFuture(eventDate);
  const isEventPast = isPast(eventDate);

  const canMarkAttendance = userRole === 'member' && !isEventPast && onMarkAttendance && !attendanceRecord;
  // Simplified: can mark attendance if event is not past, and not already marked.
  // Real app might have specific time windows for marking attendance (e.g., only on event day).

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-xl">{event.name}</CardTitle>
        <div className="flex items-center text-sm text-muted-foreground pt-1">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>{formattedDate}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-3">
          <div className="flex items-start text-sm">
            <MapPin className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span className="text-muted-foreground">{event.location}</span>
          </div>
          <div className="flex items-start text-sm">
            <Info className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p className="text-muted-foreground leading-relaxed">{event.description}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        {userRole === 'member' && (
          <div className="w-full">
            {attendanceRecord && (
              <div className={`flex items-center p-2 rounded-md ${attendanceRecord.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {attendanceRecord.status === 'present' ? <CheckCircle className="mr-2 h-5 w-5" /> : <XCircle className="mr-2 h-5 w-5" />}
                Attended on {format(parseISO(attendanceRecord.timestamp), "MMM d, h:mm a")}
              </div>
            )}
            {canMarkAttendance && onMarkAttendance && (
              <Button 
                className="w-full" 
                onClick={() => onMarkAttendance(event.id, 'present')}
                disabled={isAttendanceActionLoading}
              >
                {isAttendanceActionLoading && <Clock className="mr-2 h-4 w-4 animate-spin" />}
                Mark My Attendance
              </Button>
            )}
            {!canMarkAttendance && !attendanceRecord && isEventUpcoming && (
               <p className="text-sm text-center text-muted-foreground">Attendance marking will be available soon.</p>
            )}
             {!canMarkAttendance && !attendanceRecord && isEventPast && (
               <p className="text-sm text-center text-muted-foreground">Attendance for this event is closed.</p>
            )}
          </div>
        )}
        {userRole === 'admin' && (
          <div className="flex w-full justify-end space-x-2">
            <Button variant="outline" size="sm">Edit Event</Button>
            <Button variant="destructive" size="sm">Delete Event</Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
