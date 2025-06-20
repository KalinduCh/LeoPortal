// src/components/dashboard/admin-dashboard.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { User, Event } from '@/types';
// import { mockUsers, mockEvents } from '@/lib/data'; // Replaced by Firestore
import { getEvents } from '@/services/eventService';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CalendarDays, BarChart3, PlusCircle, Settings, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [totalMembers, setTotalMembers] = useState(0);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [recentMembers, setRecentMembers] = useState<User[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch total members
      const usersRef = collection(db, "users");
      const membersQuery = query(usersRef, where("role", "==", "member"));
      const membersSnapshot = await getDocs(membersQuery);
      setTotalMembers(membersSnapshot.size);

      // Fetch recent members (e.g., last 3, sorted by a hypothetical joinDate or just grab any 3 for now)
      // For a real "recent" sort, you'd need a 'createdAt' field in your user documents.
      // Here, we'll just take the first 3 members found.
      const fetchedMembers: User[] = [];
       membersSnapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        fetchedMembers.push({
          id: doc.id,
          name: data.name,
          email: data.email,
          role: data.role,
          photoUrl: data.photoUrl
        } as User);
      });
      setRecentMembers(fetchedMembers);


      // Fetch events
      const allEvents = await getEvents();
      const upcoming = allEvents.filter(event => new Date(event.date) >= new Date());
      setUpcomingEventsCount(upcoming.length);
      
      // Sort all events by date descending to get the most recent (past or upcoming)
      const sortedEvents = [...allEvents].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentEvents(sortedEvents.slice(0,3));

    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      // Optionally show a toast message
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-1 font-headline">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage events, members, and view club statistics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Total Members</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">Currently active members</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Upcoming Events</CardTitle>
            <CalendarDays className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingEventsCount}</div>
            <Link href="/events" className="text-xs text-primary hover:underline">
              View and manage events
            </Link>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-headline">Attendance Overview</CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {/* Placeholder for attendance stats - will require attendance data in Firestore */}
            <div className="text-2xl font-bold">N/A</div>
            <p className="text-xs text-muted-foreground">Average attendance rate (pending data)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline">Recent/Upcoming Events</CardTitle>
              <Link href="/events">
                <Button variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New
                </Button>
              </Link>
            </div>
            <CardDescription>A quick look at the latest club activities.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEvents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEvents.map(event => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>{format(parseISO(event.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={new Date(event.date) >= new Date() ? "default" : "secondary"} className={new Date(event.date) >= new Date() ? "bg-green-500/20 text-green-700 hover:bg-green-500/30" : ""}>
                            {new Date(event.date) >= new Date() ? "Upcoming" : "Past"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No events to display.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline">Quick Member Access</CardTitle>
               <Link href="/members">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" /> View All
                </Button>
              </Link>
            </div>
             <CardDescription>Recently joined or active members.</CardDescription>
          </CardHeader>
          <CardContent>
             {recentMembers.length > 0 ? (
                recentMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                ))
             ) : (
                <p className="text-sm text-muted-foreground">No members to display.</p>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
