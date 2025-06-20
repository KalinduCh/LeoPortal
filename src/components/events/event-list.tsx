// src/components/events/event-list.tsx
"use client";

import React from 'react';
import type { Event, UserRole, AttendanceRecord } from '@/types';
import { EventCard } from './event-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface EventListProps {
  events: Event[];
  userRole: UserRole;
  onMarkAttendance?: (eventId: string, status: 'present') => void;
  attendanceRecords?: AttendanceRecord[]; // Optional: Pass all records for matching
  isAttendanceActionLoading?: boolean;
  isLoading?: boolean;
}

export function EventList({ events, userRole, onMarkAttendance, attendanceRecords, isAttendanceActionLoading, isLoading }: EventListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <EventCardSkeleton key={i} />)}
      </div>
    );
  }
  
  if (!events || events.length === 0) {
    return (
      <Alert className="mt-4">
        <CalendarOff className="h-4 w-4" />
        <AlertTitle>No Upcoming Events</AlertTitle>
        <AlertDescription>
          There are currently no upcoming events scheduled. Please check back later!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map(event => {
        const relevantAttendanceRecord = attendanceRecords?.find(ar => ar.eventId === event.id);
        return (
          <EventCard 
            key={event.id} 
            event={event} 
            userRole={userRole}
            onMarkAttendance={onMarkAttendance}
            attendanceRecord={relevantAttendanceRecord}
            isAttendanceActionLoading={isAttendanceActionLoading}
          />
        );
      })}
    </div>
  );
}

const EventCardSkeleton = () => (
  <Card className="w-full shadow-lg flex flex-col">
    <CardHeader>
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="flex-grow space-y-3">
      <div className="flex items-start">
        <Skeleton className="h-4 w-4 mr-2 rounded-full" />
        <Skeleton className="h-4 w-full" />
      </div>
       <div className="flex items-start">
        <Skeleton className="h-4 w-4 mr-2 rounded-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </CardContent>
    <CardFooter className="border-t pt-4">
      <Skeleton className="h-10 w-full" />
    </CardFooter>
  </Card>
);
