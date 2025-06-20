
// src/components/dashboard/member-dashboard.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { User, Event, AttendanceRecord } from '@/types';
import { EventList } from '@/components/events/event-list';
import { getEvents } from '@/services/eventService';
import { getAttendanceRecordsForUser } from '@/services/attendanceService';
import { AiChatWidget } from '@/components/ai/ai-chat-widget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare, MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MemberDashboardProps {
  user: User;
}

export function MemberDashboard({ user }: MemberDashboardProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [userAttendanceRecords, setUserAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingEvents(true);
    setIsLoadingAttendance(true);

    try {
      const allEvents = await getEvents();
      const upcomingEvents = allEvents.filter(event => new Date(event.date) >= new Date()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(upcomingEvents);
    } catch (error) {
        console.error("Failed to fetch events for member dashboard:", error);
        toast({ title: "Error Loading Events", description: "Could not load upcoming events.", variant: "destructive"});
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
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  const handleAttendanceMarked = () => {
    // Re-fetch attendance records after one is marked
    if (user?.id) {
        setIsLoadingAttendance(true);
        getAttendanceRecordsForUser(user.id)
            .then(setUserAttendanceRecords)
            .catch(error => {
                console.error("Failed to refresh attendance records:", error);
                toast({ title: "Error Refreshing Attendance", description: "Could not refresh attendance data.", variant: "destructive"});
            })
            .finally(() => setIsLoadingAttendance(false));
    }
  };


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
            Upcoming Events & Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(isLoadingEvents || isLoadingAttendance) && !events.length ? (
             <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading events and attendance...</p>
             </div>
          ) : (
            <EventList 
                events={events} 
                user={user}
                userRole="member"
                userAttendanceRecords={userAttendanceRecords}
                onAttendanceMarked={handleAttendanceMarked}
                isLoading={isLoadingEvents || isLoadingAttendance}
            />
          )}
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
