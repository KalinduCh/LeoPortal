
// src/app/(authenticated)/dashboard/member-dashboard.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { User, Event, AttendanceRecord } from '@/types';
import { EventList } from '@/components/events/event-list';
import { getEvents } from '@/services/eventService';
import { getAttendanceRecordsForUser } from '@/services/attendanceService';
import { AiChatWidget } from '@/components/ai/ai-chat-widget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, CheckSquare, MessageCircle, Loader2, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseISO, isFuture } from 'date-fns';

interface MemberDashboardProps {
  user: User;
}

export function MemberDashboard({ user }: MemberDashboardProps) {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [userAttendanceRecords, setUserAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setIsLoadingEvents(false);
      setIsLoadingAttendance(false);
      return;
    }

    setIsLoadingEvents(true);
    setIsLoadingAttendance(true);

    try {
      const fetchedEvents = await getEvents(); // Fetches all events, sorted by date already
      setAllEvents(fetchedEvents);
    } catch (error) {
        console.error("Failed to fetch events for member dashboard:", error);
        toast({ title: "Error Loading Events", description: "Could not load events.", variant: "destructive"});
    }
    setIsLoadingEvents(false);

    try {
      const attendance = await getAttendanceRecordsForUser(user.id);
      setUserAttendanceRecords(attendance);
    } catch (error) {
      console.error("Failed to fetch attendance records:", error);
      toast({ title: "Error Loading Attendance", description: "Could not load your attendance records.", variant: "destructive"});
    }
    setIsLoadingAttendance(false);
  }, [user?.id, toast]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);
  
  const handleAttendanceMarked = () => {
    if (user) {
      fetchDashboardData();
    }
  };

  const upcomingEvents = allEvents.filter(event => isFuture(parseISO(event.date)));
  
  const attendedPastEvents = allEvents.filter(event => {
    const eventIsPast = !isFuture(parseISO(event.date));
    const hasAttended = userAttendanceRecords.some(ar => ar.eventId === event.id && ar.status === 'present');
    return eventIsPast && hasAttended;
  }).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()); // Show most recent attended first


  const isLoading = isLoadingEvents || isLoadingAttendance;

  if (!user) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-2">Loading user data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-1 font-headline">
          Welcome, {user.name}!
        </h2>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening in your Leo Club.</p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center font-headline">
            <CheckSquare className="mr-2 h-6 w-6 text-primary" />
            Events & Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upcoming">
                <CalendarDays className="mr-2 h-4 w-4" /> Upcoming Events
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" /> My Event History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              {isLoading && upcomingEvents.length === 0 ? (
                 <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Loading upcoming events...</p>
                 </div>
              ) : (
                <EventList 
                    events={upcomingEvents} 
                    user={user}
                    userRole="member"
                    userAttendanceRecords={userAttendanceRecords}
                    onAttendanceMarked={handleAttendanceMarked}
                    isLoading={isLoading}
                    listTitle="Upcoming Club Activities"
                    emptyStateTitle="No Upcoming Events"
                    emptyStateMessage="There are currently no upcoming events scheduled. Please check back later!"
                />
              )}
            </TabsContent>
            <TabsContent value="history">
               {isLoading && attendedPastEvents.length === 0 ? (
                 <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Loading your event history...</p>
                 </div>
              ) : (
                <EventList 
                    events={attendedPastEvents} 
                    user={user}
                    userRole="member"
                    userAttendanceRecords={userAttendanceRecords}
                    onAttendanceMarked={handleAttendanceMarked} // Not strictly needed for past events but consistent
                    isLoading={isLoading}
                    listTitle="Your Attended Events"
                    emptyStateTitle="No Attended Events Yet"
                    emptyStateMessage="You haven't marked attendance for any past events, or no past events found."
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
         <CardHeader>
          <CardTitle className="flex items-center font-headline">
            <MessageCircle className="mr-2 h-6 w-6 text-primary" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AiChatWidget />
        </CardContent>
      </Card>
    </div>
  );
}
