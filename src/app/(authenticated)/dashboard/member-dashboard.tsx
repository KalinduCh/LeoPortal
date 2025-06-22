
// src/app/(authenticated)/dashboard/member-dashboard.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, Event, AttendanceRecord } from '@/types';
import { EventList } from '@/components/events/event-list';
import { getEvents } from '@/services/eventService';
import { getAttendanceRecordsForUser } from '@/services/attendanceService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarDays, CheckSquare, Loader2, History, MapPin, PartyPopper, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseISO, isPast, isValid, format, isFuture, isWithinInterval } from 'date-fns';

interface MemberDashboardProps {
  user: User;
}

interface TimelineItem {
    date: string; // ISO string
    type: 'join' | 'attend_event';
    title: string;
    description?: string;
    icon: React.ElementType;
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
      const fetchedEvents = await getEvents();
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

  const { upcomingAndOngoingEvents, attendedPastEvents } = useMemo(() => {
    const upcoming: Event[] = [];
    const pastAttended: Event[] = [];

    allEvents.forEach(event => {
      if (!event.startDate || !isValid(parseISO(event.startDate))) {
        console.warn(`[MemberDashboard/Filter] Skipping event due to invalid startDate: ${event.name} (ID: ${event.id})`);
        return;
      }
      
      const startDate = parseISO(event.startDate);
      const now = new Date();
      let isEventOver = false;

      // Determine if the event is over
      if (event.endDate && isValid(parseISO(event.endDate))) {
        if (isPast(parseISO(event.endDate))) {
          isEventOver = true;
        }
      } else {
        // If no end date, consider it over 24 hours after it started
        const twentyFourHoursAfterStart = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        if (isPast(twentyFourHoursAfterStart)) {
          isEventOver = true;
        }
      }
      
      if (isEventOver) {
        const hasAttended = userAttendanceRecords.some(ar => ar.eventId === event.id && ar.userId === user?.id && ar.status === 'present');
        if (hasAttended) {
          pastAttended.push(event);
        }
      } else {
        // If it's not over, it's upcoming or ongoing
        upcoming.push(event);
      }
    });

    return {
      upcomingAndOngoingEvents: upcoming.sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()),
      attendedPastEvents: pastAttended.sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())
    };

  }, [allEvents, userAttendanceRecords, user?.id]);

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add join event
    if (user.createdAt && isValid(parseISO(user.createdAt))) {
        items.push({
            date: user.createdAt,
            type: 'join',
            title: 'Joined the Club!',
            description: `Welcome aboard! Joined on ${format(parseISO(user.createdAt), 'MMMM d, yyyy')}`,
            icon: PartyPopper,
        });
    }

    // Add attended events
    attendedPastEvents.forEach(event => {
        const attendance = userAttendanceRecords.find(ar => ar.eventId === event.id);
        if (attendance && isValid(parseISO(attendance.timestamp))) {
            items.push({
                date: attendance.timestamp,
                type: 'attend_event',
                title: `Attended "${event.name}"`,
                description: `on ${format(parseISO(attendance.timestamp), 'MMM d, yyyy')}`,
                icon: CheckSquare,
            });
        }
    });

    // Sort all items by date, descending (most recent first)
    return items.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [user.createdAt, attendedPastEvents, userAttendanceRecords]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center font-headline">
                <CalendarDays className="mr-2 h-6 w-6 text-primary" />
                Upcoming & Ongoing Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && upcomingAndOngoingEvents.length === 0 ? (
                 <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Loading upcoming events...</p>
                 </div>
              ) : (
                <EventList 
                    events={upcomingAndOngoingEvents} 
                    user={user}
                    userRole="member"
                    userAttendanceRecords={userAttendanceRecords}
                    onAttendanceMarked={handleAttendanceMarked}
                    isLoading={isLoading}
                    listTitle="" 
                    emptyStateTitle="No Upcoming or Ongoing Events"
                    emptyStateMessage="There are currently no upcoming or ongoing events scheduled. Please check back later!"
                />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center font-headline">
                <History className="mr-2 h-6 w-6 text-primary" />
                My Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && attendedPastEvents.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Loading your event history...</p>
                </div>
              ) : !isLoading && attendedPastEvents.length > 0 ? (
                <ScrollArea className="h-[400px] pr-3"> 
                  <ul className="space-y-4">
                    {attendedPastEvents.map(event => {
                      const attendance = userAttendanceRecords.find(ar => ar.eventId === event.id && ar.userId === user.id);
                      
                      let formattedEventDate = "Date unavailable";
                      if (event.startDate && isValid(parseISO(event.startDate))) {
                        const eventStartDateObj = parseISO(event.startDate);
                        formattedEventDate = format(eventStartDateObj, "MMM d, yyyy, h:mm a");
                        if (event.endDate && isValid(parseISO(event.endDate))) {
                            const eventEndDateObj = parseISO(event.endDate);
                            if (eventEndDateObj.toDateString() !== eventStartDateObj.toDateString()) {
                              formattedEventDate = `${format(eventStartDateObj, "MMM d, h:mm a")} - ${format(eventEndDateObj, "MMM d, h:mm a")}`;
                            } else {
                              formattedEventDate = `${format(eventStartDateObj, "MMM d, yyyy, h:mm a")} - ${format(eventEndDateObj, "h:mm a")}`;
                            }
                        }
                      }
                      
                      let formattedAttendanceTime = "Not available";
                      if (attendance?.timestamp && isValid(parseISO(attendance.timestamp))) {
                        formattedAttendanceTime = format(parseISO(attendance.timestamp), "MMM d, yyyy, h:mm a");
                      }

                      return (
                        <li key={event.id} className="p-4 border rounded-lg shadow-sm hover:bg-muted/50 transition-colors">
                          <h4 className="font-semibold text-md text-primary">{event.name}</h4>
                          <div className="mt-1 space-y-0.5">
                            <p className="text-sm text-muted-foreground flex items-center">
                              <CalendarDays className="mr-1.5 h-4 w-4 shrink-0" />
                              {formattedEventDate}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center">
                              <MapPin className="mr-1.5 h-4 w-4 shrink-0" />
                              {event.location || "Location not specified"}
                            </p>
                            {attendance && (
                              <p className="text-xs text-secondary-foreground bg-secondary px-2 py-1 rounded-md inline-flex items-center mt-1.5">
                                <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                                You attended: {formattedAttendanceTime}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              ) : ( 
                <p className="text-muted-foreground text-center py-6">You have no past attended events recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
            <Card className="shadow-md sticky top-6">
                <CardHeader>
                    <CardTitle className="flex items-center font-headline">
                        <Award className="mr-2 h-6 w-6 text-primary" />
                        My Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-60">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : timelineItems.length > 0 ? (
                    <div className="relative pl-6">
                      <div className="absolute left-0 top-0 h-full w-0.5 bg-border -translate-x-1/2 ml-3"></div>
                      <ul className="space-y-8">
                        {timelineItems.map((item, index) => {
                          const Icon = item.icon;
                          return (
                            <li key={index} className="relative flex items-start gap-4">
                              <div className="absolute left-0 top-1.5 h-6 w-6 bg-background flex items-center justify-center rounded-full -translate-x-1/2 border-2 border-primary">
                                <Icon className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="pt-0.5">
                                <p className="font-semibold text-sm">{item.title}</p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-6 text-sm">Your timeline will appear here as you join and attend events.</p>
                  )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
