
// src/components/dashboard/admin-dashboard.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { User, Event, AttendanceRecord } from '@/types';
import { getEvents } from '@/services/eventService';
import { getAllAttendanceRecords } from '@/services/attendanceService';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CalendarDays, BarChart3, PlusCircle, Settings, Eye, Activity, History, Award, Filter, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, getYear, getMonth, isPast } from 'date-fns';

interface AdminDashboardProps {
  user: User;
}

interface MemberStat {
  userId: string;
  name: string;
  email: string;
  attendanceCount: number;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [totalMembers, setTotalMembers] = useState(0);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 0-11 for months

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch users
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const fetchedUsers: User[] = [];
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        fetchedUsers.push({
          id: doc.id,
          name: data.name,
          email: data.email,
          role: data.role,
          photoUrl: data.photoUrl
        } as User);
      });
      setAllUsers(fetchedUsers);
      setTotalMembers(fetchedUsers.filter(u => u.role === 'member').length);

      // Fetch events
      const fetchedEvents = await getEvents();
      setAllEvents(fetchedEvents);
      
      // Fetch all attendance records
      const fetchedAttendance = await getAllAttendanceRecords();
      setAllAttendance(fetchedAttendance);

    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const upcomingEvents = useMemo(() => {
    return allEvents.filter(event => !isPast(parseISO(event.date)));
  }, [allEvents]);

  const pastEvents = useMemo(() => {
    return allEvents
      .filter(event => isPast(parseISO(event.date)))
      .sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [allEvents]);

  const memberStats = useMemo(() => {
    const stats: Record<string, { count: number; user: User | undefined }> = {};

    allAttendance.forEach(record => {
      const recordDate = parseISO(record.timestamp);
      const recordYear = getYear(recordDate);
      const recordMonth = getMonth(recordDate); // 0-11

      const yearMatch = selectedYear === 'all' || recordYear === parseInt(selectedYear);
      const monthMatch = selectedMonth === 'all' || recordMonth === parseInt(selectedMonth);

      if (yearMatch && monthMatch) {
        if (!stats[record.userId]) {
          stats[record.userId] = { count: 0, user: allUsers.find(u => u.id === record.userId) };
        }
        if (stats[record.userId].user) { // Only count if user profile found
            stats[record.userId].count += 1;
        }
      }
    });
    
    return Object.entries(stats)
      .map(([userId, data]) => ({
        userId,
        name: data.user?.name || 'Unknown User',
        email: data.user?.email || 'N/A',
        attendanceCount: data.count,
      }))
      .filter(stat => stat.name !== 'Unknown User') // Filter out those whose profiles weren't found
      .sort((a, b) => b.attendanceCount - a.attendanceCount);
  }, [allAttendance, allUsers, selectedYear, selectedMonth]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allAttendance.forEach(record => {
      years.add(getYear(parseISO(record.timestamp)).toString());
    });
    allEvents.forEach(event => { // Also consider event years for filtering
        years.add(getYear(parseISO(event.date)).toString());
    });
    if (!years.has(new Date().getFullYear().toString())) {
        years.add(new Date().getFullYear().toString());
    }
    return Array.from(years).sort((a,b) => parseInt(b) - parseInt(a));
  }, [allAttendance, allEvents]);

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' }, { value: '1', label: 'February' },
    { value: '2', label: 'March' }, { value: '3', label: 'April' },
    { value: '4', label: 'May' }, { value: '5', label: 'June' },
    { value: '6', label: 'July' }, { value: '7', label: 'August' },
    { value: '8', label: 'September' }, { value: '9', label: 'October' },
    { value: '10', label: 'November' }, { value: '11', label: 'December' },
  ];

  if (isLoading && !allUsers.length) { // Show loader if initial data isn't there
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-1 font-headline text-primary">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage events, members, and view club statistics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Total Members</CardTitle>
            <Users className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMembers}</div>
            <Link href="/members" className="text-xs text-primary hover:underline">
              Manage members
            </Link>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Upcoming Events</CardTitle>
            <CalendarDays className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{upcomingEvents.length}</div>
            <Link href="/events" className="text-xs text-primary hover:underline">
              Manage events
            </Link>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Overall Attendance</CardTitle>
            <Activity className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{allAttendance.length}</div>
            <p className="text-xs text-muted-foreground">Total records logged</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="font-headline text-xl flex items-center">
                <Award className="mr-2 h-6 w-6 text-accent" /> Member Participation Statistics
              </CardTitle>
              <CardDescription>View member attendance records, filtered by period.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : memberStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Attendance Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberStats.slice(0, 10).map((stat, index) => ( // Display top 10
                  <TableRow key={stat.userId}>
                    <TableCell className="font-medium">
                        <Badge variant={index < 3 ? "default" : "secondary"} className={index < 3 ? "bg-primary/80 hover:bg-primary/90" : ""}>
                            {index + 1}
                        </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{stat.name}</TableCell>
                    <TableCell className="text-muted-foreground">{stat.email}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-lg px-3 py-1 border-accent text-accent">
                        {stat.attendanceCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No attendance data for the selected period, or no members found.</p>
          )}
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline flex items-center">
                <History className="mr-2 h-5 w-5 text-accent" /> Event History
              </CardTitle>
              <Link href="/events">
                <Button variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Manage Events
                </Button>
              </Link>
            </div>
            <CardDescription>A look at recently concluded club activities.</CardDescription>
          </CardHeader>
          <CardContent>
            {pastEvents.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pastEvents.slice(0, 5).map(event => ( // Show recent 5 past events
                  <div key={event.id} className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <p className="font-semibold text-primary">{event.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(event.date), "MMMM d, yyyy 'at' h:mm a")} - {event.location}
                    </p>
                    <p className="text-sm mt-1">{event.description.substring(0,100)}{event.description.length > 100 ? "..." : ""}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No past events to display.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline flex items-center">
                <Users className="mr-2 h-5 w-5 text-accent" /> Quick Member Access
              </CardTitle>
               <Link href="/members">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" /> View All Members
                </Button>
              </Link>
            </div>
             <CardDescription>View and manage member profiles.</CardDescription>
          </CardHeader>
          <CardContent>
             {allUsers.filter(u => u.role === 'member').slice(0,5).length > 0 ? ( // Show first 5 members
                allUsers.filter(u => u.role === 'member').slice(0,5).map(member => (
                    <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                ))
             ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No members to display.</p>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
