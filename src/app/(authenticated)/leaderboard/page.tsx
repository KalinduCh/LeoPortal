// src/app/(authenticated)/leaderboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { User, PointsEntry } from '@/types';
import { getAllUsers } from '@/services/userService';
import { getPointsForPeriod } from '@/services/pointsService';
import { format, getYear, eachYearOfInterval, subYears } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Trophy, List, Star, Info } from 'lucide-react';

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

export default function MemberLeaderboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pointsLog, setPointsLog] = useState<PointsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const approvedMembers = useMemo(() => {
    if (!allUsers.length) return [];
    return allUsers
      .filter(u => u.status === 'approved' && ['member', 'admin', 'super_admin'].includes(u.role))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [allUsers]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [users, points] = await Promise.all([
        getAllUsers(),
        getPointsForPeriod(selectedMonth, selectedYear)
      ]);
      setAllUsers(users);
      setPointsLog(points);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load leaderboard data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const leaderboardData = useMemo(() => {
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
  }, [approvedMembers, pointsLog]);

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const availableYears = useMemo(() => {
    const end = new Date();
    const start = subYears(end, 5);
    return eachYearOfInterval({ start, end }).map(d => getYear(d)).sort((a,b) => b-a);
  }, []);
  
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), 'MMMM') }));

  if (authLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold font-headline">Impact Leaderboard</h1>
      </div>
      
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl"><Info className="mr-2 h-5 w-5 text-primary" />Points System Overview</CardTitle>
          <CardDescription>Points are awarded based on roles and participation in club activities.</CardDescription>
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
                      <CardDescription>Top members based on total points for the selected month.</CardDescription>
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
                          {leaderboardData.map((item, index) => (
                              <TableRow key={item.user.id} className={item.user.id === user?.id ? 'bg-primary/10' : ''}>
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
  );
}
