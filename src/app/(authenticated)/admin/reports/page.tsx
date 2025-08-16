// src/app/(authenticated)/admin/reports/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, Event, AttendanceRecord, BadgeId, Transaction } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, Users, Calendar, BarChart, ExternalLink, Award, Users2, LineChart as LineChartIcon, HandCoins } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getAllUsers } from '@/services/userService';
import { getEvents } from '@/services/eventService';
import { getAllAttendanceRecords } from '@/services/attendanceService';
import { getTransactions } from '@/services/financeService';
import { format, parseISO, isValid, getYear, getMonth, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import Papa from 'papaparse';
import { calculateBadgeIds, BADGE_DEFINITIONS } from '@/services/badgeService';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

interface MemberStat {
  userId: string;
  name: string;
  email: string;
  attendanceCount: number;
  badges: BadgeId[];
  photoUrl?: string;
}

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  React.useEffect(() => {
    if (!authLoading && !isSuperOrAdmin) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, isSuperOrAdmin]);

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [users, events, attendance, transactions] = await Promise.all([
        getAllUsers(),
        getEvents(),
        getAllAttendanceRecords(),
        getTransactions()
      ]);
      setAllUsers(users);
      setAllEvents(events);
      setAllAttendance(attendance);
      setAllTransactions(transactions);
    } catch (error) {
      console.error("Failed to fetch data for reports page:", error);
      toast({ title: "Error", description: "Could not load data for reports.", variant: "destructive" });
    }
    setIsLoadingData(false);
  }, [toast]);

  useEffect(() => {
    if (user && isSuperOrAdmin) {
      fetchData();
    }
  }, [user, fetchData, isSuperOrAdmin]);

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const memberLeaderboard = useMemo(() => {
    const stats: Record<string, { count: number; user: User | undefined }> = {};
    
    allUsers.forEach(u => {
      // Initialize stats for all members and admins (but not super admins)
      if (u.status === 'approved' && (u.role === 'member' || u.role === 'admin')) {
        stats[u.id] = { count: 0, user: u };
      }
    });

    allAttendance.forEach(record => {
      if (record.userId && stats[record.userId]) {
        stats[record.userId].count++;
      }
    });

    const calculatedStats = Object.values(stats)
      .filter(data => data.count > 0 && data.user)
      .map(data => ({
        userId: data.user!.id,
        name: data.user!.name || 'Unknown User',
        email: data.user!.email || 'N/A',
        attendanceCount: data.count,
        photoUrl: data.user!.photoUrl,
      }))
      .sort((a, b) => b.attendanceCount - a.attendanceCount);

    const topVolunteerCount = calculatedStats.length > 0 ? calculatedStats[0].attendanceCount : 0;
    
    return calculatedStats.map(stat => {
        const user = allUsers.find(u => u.id === stat.userId);
        if (!user) return { ...stat, badges: [] };
        const userAttendance = allAttendance.filter(a => a.userId === stat.userId);
        const isTopVolunteer = topVolunteerCount > 0 && stat.attendanceCount === topVolunteerCount;
        const badges = calculateBadgeIds(user, userAttendance, isTopVolunteer);
        return { ...stat, badges };
    });
  }, [allAttendance, allUsers]);

  const { memberSignupData, memberSignupYear } = useMemo(() => {
    if (!allUsers.length) return { memberSignupData: [], memberSignupYear: new Date().getFullYear() };

    const yearsWithSignups: Set<number> = new Set();
    allUsers.forEach(u => {
      if (u.createdAt && isValid(parseISO(u.createdAt))) {
        yearsWithSignups.add(getYear(parseISO(u.createdAt)));
      }
    });

    const latestYear = yearsWithSignups.size > 0 
      ? Math.max(...Array.from(yearsWithSignups)) 
      : new Date().getFullYear();

    const monthlySignups = Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(latestYear, i), 'MMM'),
      total: 0,
    }));
    
    allUsers.forEach(u => {
      if (u.createdAt && isValid(parseISO(u.createdAt))) {
        const joinDate = parseISO(u.createdAt);
        if (getYear(joinDate) === latestYear) {
          const monthIndex = getMonth(joinDate);
          monthlySignups[monthIndex].total++;
        }
      }
    });
    return { memberSignupData: monthlySignups, memberSignupYear: latestYear };
  }, [allUsers]);

  const { financialChartData, financialChartYear } = useMemo(() => {
    if (!allTransactions.length) return { financialChartData: [], financialChartYear: new Date().getFullYear() };

    const yearsWithTransactions: Set<number> = new Set();
    allTransactions.forEach(t => {
      if (t.date && isValid(parseISO(t.date))) {
        yearsWithTransactions.add(getYear(parseISO(t.date)));
      }
    });
    
    const latestYear = yearsWithTransactions.size > 0 
      ? Math.max(...Array.from(yearsWithTransactions)) 
      : new Date().getFullYear();
    
    const data = eachMonthOfInterval({
        start: startOfYear(new Date(latestYear, 0, 1)),
        end: endOfYear(new Date(latestYear, 11, 31))
    }).map(month => ({
        name: format(month, 'MMM'),
        income: 0,
        expenses: 0
    }));

    allTransactions.forEach(t => {
        const transactionDate = parseISO(t.date);
        if (getYear(transactionDate) === latestYear) {
            const monthIndex = getMonth(transactionDate);
            if(t.type === 'income') {
                data[monthIndex].income += t.amount;
            } else {
                data[monthIndex].expenses += t.amount;
            }
        }
    });
    return { financialChartData: data, financialChartYear: latestYear };
  }, [allTransactions]);

  
  const eventReportsData = useMemo(() => {
    if (!allEvents.length) return [];
    return [...allEvents].sort((a, b) => {
        const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
        const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
        return dateB - dateA;
    });
  }, [allEvents]);

  const memberChartConfig = { total: { label: "New Members", color: "hsl(var(--primary))" } } satisfies ChartConfig;
  const financialChartConfig = { income: { label: "Income", color: "hsl(var(--chart-2))" }, expenses: { label: "Expenses", color: "hsl(var(--chart-1))" } } satisfies ChartConfig;

  const handleExport = async (type: 'members' | 'events' | 'attendance' | 'transactions') => {
    setIsExporting(type);
    toast({ title: "Generating Report...", description: `Fetching all ${type} data.` });
    try {
      let data;
      let fileName;

      if (type === 'members') {
        data = allUsers.map(member => ({
          ID: member.id, Name: member.name, Email: member.email, Role: member.role, Status: member.status,
          Designation: member.designation, NIC: member.nic, DateOfBirth: member.dateOfBirth, Gender: member.gender, MobileNumber: member.mobileNumber
        }));
        fileName = `leo-portal_members_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'events') {
        data = allEvents.map(event => ({
          ID: event.id, Name: event.name,
          StartDate: event.startDate ? format(parseISO(event.startDate), 'yyyy-MM-dd HH:mm:ss') : '',
          EndDate: event.endDate ? format(parseISO(event.endDate), 'yyyy-MM-dd HH:mm:ss') : '',
          Location: event.location, Description: event.description, Latitude: event.latitude, Longitude: event.longitude
        }));
        fileName = `leo-portal_events_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'transactions') {
        data = allTransactions.map(t => ({
          ID: t.id, Type: t.type, Date: t.date, Amount: t.amount, Category: t.category, Source: t.source, Notes: t.notes
        }));
        fileName = `leo-portal_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      } else { // attendance
        data = allAttendance.map(record => ({
          RecordID: record.id, EventID: record.eventId, UserID: record.userId, Timestamp: record.timestamp ? format(parseISO(record.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
          Status: record.status, AttendanceType: record.attendanceType, VisitorName: record.visitorName, VisitorDesignation: record.visitorDesignation,
          VisitorClub: record.visitorClub, VisitorComment: record.visitorComment, MarkedLatitude: record.markedLatitude, MarkedLongitude: record.markedLongitude
        }));
        fileName = `leo-portal_attendance-log_${new Date().toISOString().split('T')[0]}.csv`;
      }

      const csv = Papa.unparse(data);
      downloadCsv(csv, fileName);
      toast({ title: "Success", description: `${type.charAt(0).toUpperCase() + type.slice(1)} data has been exported.` });
    } catch (error) {
      console.error(`Failed to export ${type}:`, error);
      toast({ title: "Error", description: `Could not export ${type} data.`, variant: "destructive" });
    }
    setIsExporting(null);
  };

  const downloadCsv = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (authLoading || isLoadingData || !user || !isSuperOrAdmin) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="container mx-auto py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Reports & Data</h1>
        <p className="text-muted-foreground mt-1">Analyze club data and export records as needed.</p>
      </div>

      <Tabs defaultValue="member-reports" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 h-auto bg-primary/10">
          <TabsTrigger value="member-reports" className="py-2 text-primary/70 hover:bg-primary/20 hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Users2 className="mr-2 h-4 w-4"/>Member Reports</TabsTrigger>
          <TabsTrigger value="event-reports" className="py-2 text-primary/70 hover:bg-primary/20 hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Calendar className="mr-2 h-4 w-4"/>Event Reports</TabsTrigger>
          <TabsTrigger value="financial-reports" className="py-2 text-primary/70 hover:bg-primary/20 hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><HandCoins className="mr-2 h-4 w-4"/>Financial Overview</TabsTrigger>
          <TabsTrigger value="data-exports" className="py-2 text-primary/70 hover:bg-primary/20 hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Download className="mr-2 h-4 w-4"/>Data Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="member-reports" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Award className="mr-2 h-5 w-5 text-primary"/>Member Participation Leaderboard</CardTitle>
              <CardDescription>Top attendees (Members & Admins) across all events.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : memberLeaderboard.length > 0 ? (
                <TooltipProvider>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader><TableRow><TableHead className="w-[60px]">Rank</TableHead><TableHead>Member</TableHead><TableHead className="text-right">Attendance Count</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {memberLeaderboard.slice(0, 20).map((stat, index) => (
                          <TableRow key={stat.userId}>
                            <TableCell><Badge variant={index < 3 ? "default" : "secondary"} className={index < 3 ? "bg-primary/80" : ""}>{index + 1}</Badge></TableCell>
                            <TableCell className="font-semibold flex items-center gap-3">
                                <Avatar className="h-9 w-9"><AvatarImage src={stat.photoUrl} alt={stat.name} data-ai-hint="profile avatar" /><AvatarFallback className="bg-primary/20 text-primary font-semibold">{getInitials(stat.name)}</AvatarFallback></Avatar>
                                {stat.name}
                                <div className="flex items-center gap-1.5">
                                    {stat.badges.map(badgeId => {
                                        const badge = BADGE_DEFINITIONS[badgeId];
                                        if(!badge) return null;
                                        const Icon = badge.icon;
                                        return (
                                            <Tooltip key={badgeId}><TooltipTrigger><Icon className="h-4 w-4 text-yellow-500" /></TooltipTrigger><TooltipContent><p className="font-semibold">{badge.name}</p></TooltipContent></Tooltip>
                                        )
                                    })}
                                </div>
                            </TableCell>
                            <TableCell className="text-right"><Badge variant="outline">{stat.attendanceCount}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="block md:hidden space-y-3">
                    {memberLeaderboard.slice(0, 20).map((stat, index) => (
                      <Card key={stat.userId} className="shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12"><AvatarImage src={stat.photoUrl} alt={stat.name} data-ai-hint="profile avatar" /><AvatarFallback className="bg-primary/20 text-primary font-semibold">{getInitials(stat.name)}</AvatarFallback></Avatar>
                              <div>
                                <p className="font-semibold flex items-center gap-2">{index + 1}. {stat.name}
                                  <span className="flex items-center gap-1.5">
                                    {stat.badges.map(badgeId => {
                                      const badge = BADGE_DEFINITIONS[badgeId];
                                      if(!badge) return null;
                                      const Icon = badge.icon;
                                      return (<Tooltip key={badgeId}><TooltipTrigger asChild><Icon className="h-4 w-4 text-yellow-500" /></TooltipTrigger><TooltipContent><p>{badge.name}</p></TooltipContent></Tooltip>);
                                    })}
                                  </span>
                                </p><p className="text-xs text-muted-foreground">{stat.email}</p>
                              </div>
                          </div>
                          <Badge variant="outline" className="text-lg px-3 py-1">{stat.attendanceCount}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TooltipProvider>
              ) : (
                <p className="text-center text-muted-foreground py-8">No attendance data available to generate a leaderboard.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><LineChartIcon className="mr-2 h-5 w-5 text-primary"/>Member Growth ({memberSignupYear})</CardTitle>
              <CardDescription>Monthly new member signups based on profile creation date.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="flex items-center justify-center h-[250px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : memberSignupData.some(d => d.total > 0) ? (
                <ChartContainer config={memberChartConfig} className="h-[250px] w-full">
                  <RechartsBarChart accessibilityLayer data={memberSignupData}>
                    <CartesianGrid vertical={false} /><XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} /><YAxis allowDecimals={false} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="total" fill="var(--color-primary)" radius={4} />
                  </RechartsBarChart>
                </ChartContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No member signup data found for {memberSignupYear}.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="event-reports" className="mt-6">
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary"/>Event List</CardTitle>
                <CardDescription>A list of all created events, sorted by most recent. Click an event to view its detailed summary.</CardDescription>
                </CardHeader>
                <CardContent>
                {isLoadingData ? (<div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : eventReportsData.length > 0 ? (
                    <div className="max-h-[600px] overflow-y-auto">
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader><TableRow><TableHead>Event Name</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {eventReportsData.map((event) => (<TableRow key={event.id}><TableCell className="font-medium">{event.name}</TableCell><TableCell>{event.startDate && isValid(parseISO(event.startDate)) ? format(parseISO(event.startDate), 'MMM dd, yyyy') : 'N/A'}</TableCell><TableCell>{event.location}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => router.push(`/admin/event-summary/${event.id}`)}>View Summary <ExternalLink className="ml-2 h-3 w-3" /></Button></TableCell></TableRow>))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="block md:hidden space-y-3">
                        {eventReportsData.map((event) => (<Card key={event.id} className="shadow-sm"><CardHeader className="pb-4"><CardTitle className="text-base font-semibold text-primary">{event.name}</CardTitle><CardDescription className="text-xs">{event.startDate && isValid(parseISO(event.startDate)) ? format(parseISO(event.startDate), 'MMM dd, yyyy') : 'N/A'}</CardDescription></CardHeader><CardContent className="pb-4"><p className="text-sm text-muted-foreground">{event.location}</p></CardContent><CardFooter><Button variant="outline" className="w-full" size="sm" onClick={() => router.push(`/admin/event-summary/${event.id}`)}>View Summary <ExternalLink className="ml-2 h-3 w-3" /></Button></CardFooter></Card>))}
                      </div>
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-8">No events have been created yet.</p>
                )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="financial-reports" className="mt-6">
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary"/>Financial Summary ({financialChartYear})</CardTitle>
              <CardDescription>Monthly income vs. expenses for the most recent year with data.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (<div className="flex items-center justify-center h-[250px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : financialChartData.some(d => d.income > 0 || d.expenses > 0) ? (
                <ChartContainer config={financialChartConfig} className="h-[250px] w-full">
                    <RechartsBarChart accessibilityLayer data={financialChartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis tickFormatter={(value) => `LKR ${Number(value) / 1000}k`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                        <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
                    </RechartsBarChart>
                </ChartContainer>
              ) : (
                 <p className="text-center text-muted-foreground py-8">No financial transaction data found for {financialChartYear}.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-exports" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card><CardHeader><CardTitle className="flex items-center text-xl"><Users className="mr-2 h-6 w-6 text-primary" /> All Members</CardTitle><CardDescription>Export a full list of all registered members.</CardDescription></CardHeader><CardFooter><Button onClick={() => handleExport('members')} disabled={!!isExporting} className="w-full">{isExporting === 'members' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{isExporting === 'members' ? 'Exporting...' : 'Export Members (CSV)'}</Button></CardFooter></Card>
            <Card><CardHeader><CardTitle className="flex items-center text-xl"><Calendar className="mr-2 h-6 w-6 text-primary" /> All Events</CardTitle><CardDescription>Export a list of all events, past and upcoming.</CardDescription></CardHeader><CardFooter><Button onClick={() => handleExport('events')} disabled={!!isExporting} className="w-full">{isExporting === 'events' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{isExporting === 'events' ? 'Exporting...' : 'Export Events (CSV)'}</Button></CardFooter></Card>
            <Card><CardHeader><CardTitle className="flex items-center text-xl"><BarChart className="mr-2 h-6 w-6 text-primary" /> Attendance Log</CardTitle><CardDescription>Export a complete log of all attendance records.</CardDescription></CardHeader><CardFooter><Button onClick={() => handleExport('attendance')} disabled={!!isExporting} className="w-full">{isExporting === 'attendance' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{isExporting === 'attendance' ? 'Exporting...' : 'Export Attendance (CSV)'}</Button></CardFooter></Card>
            <Card><CardHeader><CardTitle className="flex items-center text-xl"><HandCoins className="mr-2 h-6 w-6 text-primary" /> Transactions</CardTitle><CardDescription>Export a complete log of all financial transactions.</CardDescription></CardHeader><CardFooter><Button onClick={() => handleExport('transactions')} disabled={!!isExporting} className="w-full">{isExporting === 'transactions' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{isExporting === 'transactions' ? 'Exporting...' : 'Export Transactions (CSV)'}</Button></CardFooter></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    