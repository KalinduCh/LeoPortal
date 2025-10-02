
// src/app/(authenticated)/dashboard/member-dashboard.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, Event, AttendanceRecord, BadgeId, ProjectIdea, PointsEntry } from '@/types';
import { EventList } from '@/components/events/event-list';
import { getEvents } from '@/services/eventService';
import { getAttendanceRecordsForUser } from '@/services/attendanceService';
import { getProjectIdeasForUser } from '@/services/projectIdeaService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarDays, CheckSquare, Loader2, History, MapPin, Award, Clock, Activity, Lightbulb, Trophy, List, Star, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isPast, isValid, isFuture, isWithinInterval, differenceInHours, getYear, getMonth, eachYearOfInterval, subYears } from 'date-fns';
import { calculateBadgeIds, BADGE_DEFINITIONS } from '@/services/badgeService';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPointsForPeriod } from '@/services/pointsService';
import { getAllUsers } from '@/services/userService';

const pointsSystem = {
    roles: [
        { name: 'Project Chairperson', points: 12000 },
        { name: 'Project Secretary', points: 10000 },
        { name: 'Project Treasurer', points: 10000 },
        { name: 'Project OC Members', points: 8000 },
    ],
    participation: [
        { name: 'Monthly Meeting (Physical)', points: 9000 },
        { name: 'Monthly Meeting (Online)', points: 5000 },
        { name: 'Official Visit Participation', points: 10000 },
        { name: 'Club Project Participation (Physical)', points: 8000 },
        { name: 'Club Project Participation (Online)', points: 4500 },
        { name: 'District Project Participation (Physical)', points: 9000 },
        { name: 'District Project Participation (Online)', points: 5000 },
        { name: 'Multiple Project Participation (Physical)', points: 10000 },
        { name: 'Multiple Project Participation (Online)', points: 6000 },
    ]
};


interface MemberDashboardProps {
  user: User;
}

export function MemberDashboard({ user }: MemberDashboardProps) {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [userAttendanceRecords, setUserAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [userBadges, setUserBadges] = useState<BadgeId[]>([]);
  const [projectIdeaCount, setProjectIdeaCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pointsLog, setPointsLog] = useState<PointsEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());


  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [fetchedEvents, attendance, projectIdeas, fetchedUsers, points] = await Promise.all([
        getEvents(),
        getAttendanceRecordsForUser(user.id),
        getProjectIdeasForUser(user.id),
        getAllUsers(),
        getPointsForPeriod(selectedMonth, selectedYear)
      ]);
      
      setAllEvents(fetchedEvents);
      setUserAttendanceRecords(attendance);
      setProjectIdeaCount(projectIdeas.length);
      setAllUsers(fetchedUsers);
      setPointsLog(points);

      const badgeIds = calculateBadgeIds(user, attendance);
      setUserBadges(badgeIds);

    } catch (error) {
        console.error("Failed to fetch member dashboard data:", error);
        toast({ title: "Error Loading Data", description: "Could not load your events and achievements.", variant: "destructive"});
    }
    setIsLoading(false);
  }, [user?.id, user, toast, selectedMonth, selectedYear]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const leaderboardData = useMemo(() => {
    const approvedMembers = allUsers.filter(u => u.status === 'approved' && ['member', 'admin', 'super_admin'].includes(u.role));
    if (!approvedMembers.length) return [];
    
    const memberPoints: Record<string, { totalPoints: number; user: User }> = {};

    approvedMembers.forEach(member => {
        memberPoints[member.id] = { totalPoints: 0, user: member };
    });

    pointsLog.forEach(entry => {
        if(memberPoints[entry.userId]) {
            memberPoints[entry.userId].totalPoints += entry.points;
        }
    });
    
    return Object.values(memberPoints).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [allUsers, pointsLog]);
  
  const handleAttendanceMarked = () => {
    if (user) {
      fetchDashboardData(); 
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const { upcomingAndOngoingEvents, attendedPastEvents, totalHoursVolunteered } = useMemo(() => {
    const upcoming: Event[] = [];
    const pastAttended: Event[] = [];
    let hours = 0;

    allEvents.forEach(event => {
      if (!event.startDate || !isValid(parseISO(event.startDate))) {
        console.warn(`[MemberDashboard/Filter] Skipping event due to invalid startDate: ${event.name} (ID: ${event.id})`);
        return;
      }
      
      const startDate = parseISO(event.startDate);
      const endDate = event.endDate && isValid(parseISO(event.endDate))
          ? parseISO(event.endDate)
          : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default to 2 hours if no end date
      
      if (isPast(endDate)) {
        const hasAttended = userAttendanceRecords.some(ar => ar.eventId === event.id && ar.userId === user?.id && ar.status === 'present');
        if (hasAttended) {
          pastAttended.push(event);
          hours += Math.abs(differenceInHours(endDate, startDate)) || 2; // Add duration or default 2 hours
        }
      } else {
        upcoming.push(event);
      }
    });

    return {
      upcomingAndOngoingEvents: upcoming.sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()),
      attendedPastEvents: pastAttended.sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime()),
      totalHoursVolunteered: hours,
    };

  }, [allEvents, userAttendanceRecords, user?.id]);

  const availableYears = useMemo(() => {
    const end = new Date();
    const start = subYears(end, 5);
    return eachYearOfInterval({ start, end }).map(d => getYear(d)).sort((a,b) => b-a);
  }, []);
  
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), 'MMMM') }));

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
        <p className="text-muted-foreground">Here&apos;s your personal contribution dashboard.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Events Attended</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{attendedPastEvents.length}</div>
                  <p className="text-xs text-muted-foreground">Total events you've participated in.</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hours Volunteered</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">~{totalHoursVolunteered}</div>
                  <p className="text-xs text-muted-foreground">Estimated total hours contributed.</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Project Ideas Submitted</CardTitle>
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{projectIdeaCount}</div>
                  <p className="text-xs text-muted-foreground">Total creative ideas shared.</p>
              </CardContent>
          </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center font-headline"><Award className="mr-2 h-5 w-5 text-primary"/>My Achievements</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>
            ) : userBadges.length > 0 ? (
                <TooltipProvider>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {userBadges.map(badgeId => {
                            const badge = BADGE_DEFINITIONS[badgeId];
                            if (!badge) return null;
                            const Icon = badge.icon;
                            return (
                                <Tooltip key={badgeId}>
                                    <TooltipTrigger asChild>
                                        <div className="flex flex-col items-center text-center gap-2 p-2 border rounded-lg bg-muted/30 hover:bg-muted/70 transition-colors cursor-pointer">
                                            <div className="p-2 bg-primary/10 rounded-full"><Icon className="h-6 w-6 text-primary" /></div>
                                            <p className="text-xs font-semibold">{badge.name}</p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{badge.description}</p></TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                </TooltipProvider>
            ) : (
                <p className="text-sm text-muted-foreground italic text-center py-4">No badges earned yet. Keep up the great work!</p>
            )}
        </CardContent>
      </Card>
      
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><Trophy className="mr-2 h-5 w-5 text-primary" />Points System Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center"><Star className="mr-2 h-4 w-4 text-yellow-500" />Roles</h3>
                <Table>
                  <TableHeader><TableRow><TableHead>Role</TableHead><TableHead className="text-right">Points</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {pointsSystem.roles.map((role) => (
                      <TableRow key={role.name}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="text-right">{role.points.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center"><Star className="mr-2 h-4 w-4 text-yellow-500" />Participation</h3>
                <Table>
                  <TableHeader><TableRow><TableHead>Activity</TableHead><TableHead className="text-right">Points</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {pointsSystem.participation.map((activity) => (
                      <TableRow key={activity.name}>
                        <TableCell className="font-medium">{activity.name}</TableCell>
                        <TableCell className="text-right">{activity.points.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center"><Trophy className="mr-2 h-5 w-5 text-primary" />Monthly Leaderboard</CardTitle>
                        <CardDescription>Top members for the selected month.</CardDescription>
                    </div>
                    <div className="flex items-end gap-2 w-full sm:w-auto">
                       <div className="flex-1 sm:flex-none"><Label htmlFor="filter-month">Month</Label><Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}><SelectTrigger id="filter-month"><SelectValue/></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                       <div className="flex-1 sm:flex-none"><Label htmlFor="filter-year">Year</Label><Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}><SelectTrigger id="filter-year"><SelectValue/></SelectTrigger><SelectContent>{availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="flex items-center justify-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                ) : leaderboardData.length > 0 ? (
                    <Table>
                        <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Member</TableHead><TableHead className="text-right">Total Points</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {leaderboardData.slice(0, 10).map((item, index) => (
                                <TableRow key={item.user.id} className={item.user.id === user.id ? 'bg-primary/10' : ''}>
                                    <TableCell className="font-bold">{index + 1}</TableCell>
                                    <TableCell className="flex items-center gap-2 font-medium">
                                        <Avatar className="h-9 w-9"><AvatarImage src={item.user.photoUrl} alt={item.user.name} data-ai-hint="profile avatar"/><AvatarFallback>{getInitials(item.user.name)}</AvatarFallback></Avatar>
                                        {item.user.name}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg text-primary">{item.totalPoints.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : <p className="text-center text-muted-foreground py-8">No points recorded for this period.</p>}
            </CardContent>
        </Card>
      </div>


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
            <CheckSquare className="mr-2 h-6 w-6 text-primary" />
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
              <div className="space-y-4">
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
                    <Card key={event.id} className="shadow-sm hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <h4 className="font-semibold text-md text-primary">{event.name}</h4>
                        <div className="space-y-1">
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : ( 
            <p className="text-muted-foreground text-center py-6">You have no past attended events recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
