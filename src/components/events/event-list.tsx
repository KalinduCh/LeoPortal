
// src/components/events/event-list.tsx
"use client";

import React from 'react';
import type { Event, UserRole, AttendanceRecord, User } from '@/types';
import { EventCard } from './event-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator'; // Import Separator

interface EventListProps {
  events: Event[];
  user: User | null; 
  userRole: UserRole;
  userAttendanceRecords: AttendanceRecord[]; 
  onAttendanceMarked: () => void; 
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
      {events.map((event, index) => {
        const relevantAttendanceRecord = userAttendanceRecords?.find(ar => ar.eventId === event.id && ar.userId === user?.id);
        return (
          <React.Fragment key={event.id}>
            <EventCard 
              event={event} 
              user={user}
              userRole={userRole}
              attendanceRecord={relevantAttendanceRecord}
              onAttendanceMarked={onAttendanceMarked}
            />
            {/* Add Separator between cards, visible only on mobile (screens smaller than md) */}
            {index < events.length - 1 && (
              <Separator className="my-4 md:hidden" />
            )}
          </React.Fragment>
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
