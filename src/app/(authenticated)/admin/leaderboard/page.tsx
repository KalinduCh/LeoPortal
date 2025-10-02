
// src/app/(authenticated)/admin/leaderboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User, PointsEntry } from '@/types';
import { getAllUsers } from '@/services/userService';
import { getPointsForPeriod, addPointsEntry, deletePointsEntry } from '@/services/pointsService';
import { format, getYear, eachYearOfInterval, subYears } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Trophy, List, Star, PlusCircle, Info, Trash2 } from 'lucide-react';
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

const pointsFormSchema = z.object({
  userId: z.string().min(1, "Please select a member."),
  description: z.string().min(3, "Description must be at least 3 characters."),
  points: z.coerce.number().positive("Points must be a positive number."),
  category: z.enum(['role', 'participation', 'other'], { required_error: "Category is required." }),
});
type PointsFormValues = z.infer<typeof pointsFormSchema>;

export default function LeaderboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pointsLog, setPointsLog] = useState<PointsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<PointsEntry | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  const approvedMembers = useMemo(() => 
    allUsers.filter(u => u.status === 'approved' && ['member', 'admin', 'super_admin'].includes(u.role))
    .sort((a, b) => a.name.localeCompare(b.name))
  , [allUsers]);

  const form = useForm<PointsFormValues>({
    resolver: zodResolver(pointsFormSchema),
    defaultValues: { userId: '', description: '', points: undefined, category: 'participation' },
  });

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

  const handleFormSubmit = async (values: PointsFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const selectedUser = approvedMembers.find(m => m.id === values.userId);
      if (!selectedUser) throw new Error("Selected user not found.");

      const newEntry: Omit<PointsEntry, 'id' | 'createdAt'> = {
        ...values,
        userName: selectedUser.name,
        date: new Date(selectedYear, selectedMonth, 1).toISOString(), // Use start of selected month
        addedBy: user.id,
      };
      await addPointsEntry(newEntry);
      toast({ title: "Success", description: "Points entry added." });
      setIsFormOpen(false);
      form.reset();
      fetchData();
    } catch (error: any) {
       toast({ title: "Error", description: `Could not add points: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    setIsSubmitting(true);
    try {
        await deletePointsEntry(entryToDelete.id);
        toast({ title: "Entry Deleted" });
        fetchData();
    } catch (error: any) {
        toast({ title: "Error", description: `Could not delete entry: ${error.message}`, variant: "destructive" });
    }
    setEntryToDelete(null);
    setIsDeleteAlertOpen(false);
    setIsSubmitting(false);
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
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4"/> Add Points Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Manual Points</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField control={form.control} name="userId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a member..."/></SelectTrigger></FormControl>
                      <SelectContent>
                        {approvedMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Chairperson for Beach Cleanup" {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="points" render={({ field }) => (
                  <FormItem><FormLabel>Points</FormLabel><FormControl><Input type="number" placeholder="e.g., 12000" {...field} /></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="role">Role-based</SelectItem>
                            <SelectItem value="participation">Participation</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage/></FormItem>
                )}/>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Add Entry"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
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
                            {leaderboardData.slice(0, 10).map((item, index) => (
                                <TableRow key={item.user.id}>
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
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5 text-primary"/>Points Log</CardTitle>
                <CardDescription>Recent manual points entries for this month.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : pointsLog.length > 0 ? (
                        <div className="space-y-3">
                            {pointsLog.map(entry => (
                                <div key={entry.id} className="flex items-start justify-between text-sm p-2 rounded-md hover:bg-muted/50">
                                    <div>
                                        <p className="font-semibold">{entry.userName}</p>
                                        <p className="text-xs text-muted-foreground">{entry.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-primary">{entry.points.toLocaleString()}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {setEntryToDelete(entry); setIsDeleteAlertOpen(true);}}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-center text-muted-foreground pt-10">No entries for this period.</p>}
                </ScrollArea>
            </CardContent>
        </Card>
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the points entry: "{entryToDelete?.description}" for {entryToDelete?.userName}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
