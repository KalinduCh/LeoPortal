
// src/components/events/event-list.tsx
"use client";

import React from 'react';
import type { Event, UserRole, AttendanceRecord, User } from '@/types';
import { EventCard } from './event-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarOff, Info } from 'lucide-react'; // Added Info
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface EventListProps {
  events: Event[];
  user: User | null; 
  userRole: UserRole;
  userAttendanceRecords: AttendanceRecord[]; 
  onAttendanceMarked: () => void; 
  isLoading?: boolean;
  listTitle?: string; // Optional title for the list
  emptyStateTitle?: string; // Optional title for empty state
  emptyStateMessage?: string; // Optional message for empty state
}

export function EventList({ 
  events, 
  user, 
  userRole, 
  userAttendanceRecords, 
  onAttendanceMarked, 
  isLoading,
  listTitle,
  emptyStateTitle = "No Events",
  emptyStateMessage = "There are no events to display at this time." 
}: EventListProps) {
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {listTitle && <h3 className="text-lg font-medium text-muted-foreground mb-2">{listTitle}</h3>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <EventCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }
  
  if (!events || events.length === 0) {
    return (
      <div className="space-y-4">
        {listTitle && <h3 className="text-lg font-medium text-muted-foreground mb-2">{listTitle}</h3>}
        <Alert className="mt-4">
          <CalendarOff className="h-4 w-4" />
          <AlertTitle>{emptyStateTitle}</AlertTitle>
          <AlertDescription>
            {emptyStateMessage}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {listTitle && <h3 className="text-lg font-medium text-muted-foreground mb-2">{listTitle}</h3>}
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
              {index < events.length - 1 && (
                <Separator className="my-4 md:hidden" />
              )}
            </React.Fragment>
          );
        })}
      </div>
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
