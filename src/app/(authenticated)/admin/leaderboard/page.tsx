
// src/app/(authenticated)/admin/leaderboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User, MonthlyPoints } from '@/types';
import { getAllUsers } from '@/services/userService';
import { getMonthlyPointsForPeriod, saveMonthlyPointsBatch } from '@/services/monthlyPointsService';
import { produce } from 'immer';
import { format, getYear, getMonth, eachYearOfInterval, subYears } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Trophy, List, Star, Save, Info, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const pointsSystem = {
    roles: [
        { name: 'Project Chairperson', points: '12,000' },
        { name: 'Project Secretary', points: '10,000' },
        { name: 'Project Treasurer', points: '10,000' },
        { name: 'Project OC Members', points: '8,000' },
    ],
    participation: [
        { name: 'Monthly Meeting (Online/Physical)', points: '5,000 / 9,000' },
        { name: 'Official Visit Participation', points: '10,000' },
        { name: 'Club Project Participation', points: '8,000 / 4,500' },
        { name: 'District Project Participation', points: '9,000 / 5,000' },
        { name: 'Multiple Project Participation', points: '10,000 / 6,000' },
    ]
};

const pointCategories: (keyof Omit<MonthlyPoints, 'id' | 'userId' | 'userName' | 'photoUrl' | 'month' | 'year' | 'totalPoints' | 'updatedAt'>)[] = [
    'chairSecTrePoints',
    'ocPoints',
    'meetingPoints',
    'clubProjectPoints'
];

export default function LeaderboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [monthlyPoints, setMonthlyPoints] = useState<MonthlyPoints[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const approvedMembers = useMemo(() => 
    allUsers.filter(u => u.status === 'approved' && ['member', 'admin', 'super_admin'].includes(u.role))
    .sort((a, b) => a.name.localeCompare(b.name))
  , [allUsers]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [users, points] = await Promise.all([
        getAllUsers(),
        getMonthlyPointsForPeriod(selectedMonth, selectedYear)
      ]);
      setAllUsers(users);
      setMonthlyPoints(points);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load leaderboard data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const leaderboardData = useMemo(() => {
    const data = approvedMembers.map(member => {
        const points = monthlyPoints.find(p => p.userId === member.id);
        return {
            userId: member.id,
            userName: member.name,
            photoUrl: member.photoUrl,
            chairSecTrePoints: points?.chairSecTrePoints || 0,
            ocPoints: points?.ocPoints || 0,
            meetingPoints: points?.meetingPoints || 0,
            clubProjectPoints: points?.clubProjectPoints || 0,
            totalPoints: points?.totalPoints || 0,
        };
    });
    return data.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [approvedMembers, monthlyPoints]);


  const handlePointsChange = (userId: string, category: keyof Omit<MonthlyPoints, 'id' | 'userId' | 'userName' | 'photoUrl' | 'month' | 'year' | 'totalPoints' | 'updatedAt'>, value: string) => {
    const newPoints = parseInt(value, 10);
    if (isNaN(newPoints) && value !== '') return; // Prevent non-numeric input

    setMonthlyPoints(
      produce(draft => {
        let userEntry = draft.find(p => p.userId === userId);
        const userDetails = allUsers.find(u => u.id === userId);
        if (!userEntry) {
            // Create a new entry if it doesn't exist
            userEntry = {
                userId,
                userName: userDetails?.name || 'Unknown',
                photoUrl: userDetails?.photoUrl,
                month: selectedMonth,
                year: selectedYear,
                chairSecTrePoints: 0,
                ocPoints: 0,
                meetingPoints: 0,
                clubProjectPoints: 0,
                totalPoints: 0,
                updatedAt: new Date().toISOString()
            };
            draft.push(userEntry);
        }

        (userEntry as any)[category] = value === '' ? 0 : newPoints;

        // Recalculate total
        userEntry.totalPoints = pointCategories.reduce((total, cat) => {
            return total + ((userEntry as any)[cat] || 0);
        }, 0);
      })
    );
  };
  
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
        // Filter out entries that have all zero points and don't exist in Firestore yet
        const dataToSave = monthlyPoints.filter(mp => mp.totalPoints > 0 || mp.id);
        await saveMonthlyPointsBatch(dataToSave);
        toast({ title: "Success", description: "Leaderboard points have been saved." });
        fetchData(); // Refresh data from server
    } catch(error: any) {
        toast({ title: "Save Error", description: `Could not save points: ${error.message}`, variant: "destructive" });
    }
    setIsSaving(false);
  };

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
        <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
            Save Changes
        </Button>
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
                    <TableCell className="text-right">{role.points}</TableCell>
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
                    <TableCell className="text-right">{activity.points}</TableCell>
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
              <CardTitle className="flex items-center"><Trophy className="mr-2 h-5 w-5 text-primary" />Points Table</CardTitle>
              <CardDescription>Manually enter the points for each member for the selected month.</CardDescription>
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
                <ScrollArea className="max-h-[800px] w-full">
                    <Table className="min-w-full">
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            <TableHead className="w-[250px] min-w-[200px]">Member</TableHead>
                            <TableHead className="w-[150px] min-w-[120px] text-center">Chair/Sec/Tre</TableHead>
                            <TableHead className="w-[150px] min-w-[120px] text-center">OC Member</TableHead>
                            <TableHead className="w-[150px] min-w-[120px] text-center">MM Points</TableHead>
                            <TableHead className="w-[150px] min-w-[120px] text-center">Club PP</TableHead>
                            <TableHead className="w-[150px] min-w-[120px] text-center font-bold text-primary">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboardData.map((member) => (
                          <TableRow key={member.userId}>
                            <TableCell className="font-medium flex items-center gap-3">
                                {member.totalPoints > 0 && leaderboardData[0].totalPoints === member.totalPoints && <Crown className="h-5 w-5 text-yellow-500" />}
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={member.photoUrl} alt={member.userName} data-ai-hint="profile avatar"/>
                                    <AvatarFallback>{getInitials(member.userName)}</AvatarFallback>
                                </Avatar>
                                {member.userName}
                            </TableCell>
                            <TableCell>
                                <Input type="number" className="text-center" placeholder="0" value={member.chairSecTrePoints || ''} onChange={e => handlePointsChange(member.userId, 'chairSecTrePoints', e.target.value)} />
                            </TableCell>
                             <TableCell>
                                <Input type="number" className="text-center" placeholder="0" value={member.ocPoints || ''} onChange={e => handlePointsChange(member.userId, 'ocPoints', e.target.value)} />
                            </TableCell>
                             <TableCell>
                                <Input type="number" className="text-center" placeholder="0" value={member.meetingPoints || ''} onChange={e => handlePointsChange(member.userId, 'meetingPoints', e.target.value)} />
                            </TableCell>
                             <TableCell>
                                <Input type="number" className="text-center" placeholder="0" value={member.clubProjectPoints || ''} onChange={e => handlePointsChange(member.userId, 'clubProjectPoints', e.target.value)} />
                            </TableCell>
                            <TableCell className="text-center font-bold text-lg text-primary">{member.totalPoints.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                </ScrollArea>
            ) : <p className="text-center text-muted-foreground py-8">No members found to display.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
