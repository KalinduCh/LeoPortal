
// src/components/events/event-list.tsx
"use client";

import React from 'react';
import type { Event, UserRole, AttendanceRecord, User } from '@/types';
import { EventCard } from './event-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

interface EventListProps {
  events: Event[];
  user: User | null; // Pass current user
  userRole: UserRole;
  // Pass all attendance records for the current user
  userAttendanceRecords: AttendanceRecord[]; 
  onAttendanceMarked: () => void; // Callback to refresh attendance data
  isLoading?: boolean;
}

export function EventList({ events, user, userRole, userAttendanceRecords, onAttendanceMarked, isLoading }: EventListProps) {
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
        // Find the attendance record for this specific event and user
        const relevantAttendanceRecord = userAttendanceRecords?.find(ar => ar.eventId === event.id && ar.userId === user?.id);
        return (
          <EventCard 
            key={event.id} 
            event={event} 
            user={user}
            userRole={userRole}
            attendanceRecord={relevantAttendanceRecord}
            onAttendanceMarked={onAttendanceMarked}
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
