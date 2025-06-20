// src/components/dashboard/member-dashboard.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { User, Event, AttendanceRecord } from '@/types';
import { EventList } from '@/components/events/event-list';
// import { mockEvents, mockAttendanceRecords as initialMockAttendance } from '@/lib/data'; // Using Firestore now
import { getEvents } from '@/services/eventService'; // Import service to fetch live events
import { mockAttendanceRecords as initialMockAttendance } from '@/lib/data'; // Keep mock attendance for now
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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialMockAttendance); // Keep mock for now
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isAttendanceActionLoading, setIsAttendanceActionLoading] = useState(false);
  const { toast } = useToast();

  const fetchLiveEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const allEvents = await getEvents();
      const upcomingEvents = allEvents.filter(event => new Date(event.date) >= new Date());
      setEvents(upcomingEvents); // Already sorted by service if needed, or sort here
    } catch (error) {
        console.error("Failed to fetch events for member dashboard:", error);
        toast({ title: "Error", description: "Could not load upcoming events.", variant: "destructive"});
    }
    setIsLoadingEvents(false);
  }, [toast]);

  useEffect(() => {
    fetchLiveEvents();
  }, [fetchLiveEvents]);

  // Filter attendance records for the current user
  const userAttendanceRecords = attendanceRecords.filter(ar => ar.userId === user.id);

  const handleMarkAttendance = async (eventId: string, status: 'present') => {
    setIsAttendanceActionLoading(true);
    // TODO: Implement storing attendance in Firestore
    // For now, this remains a mock local update.
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newRecord: AttendanceRecord = {
      id: `att${Date.now()}`,
      eventId,
      userId: user.id,
      timestamp: new Date().toISOString(),
      status,
    };
    setAttendanceRecords(prev => [...prev, newRecord]);
    toast({ title: "Attendance Marked (Mock)", description: `Your attendance for the event has been recorded as ${status}. This is a mock action.`});
    setIsAttendanceActionLoading(false);
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
          <EventList 
            events={events} 
            userRole="member"
            onMarkAttendance={handleMarkAttendance}
            attendanceRecords={userAttendanceRecords}
            isAttendanceActionLoading={isAttendanceActionLoading}
            isLoading={isLoadingEvents}
          />
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
