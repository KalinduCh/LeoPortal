
// src/app/(authenticated)/admin/leaderboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User, PointsEntry } from '@/types';
import { getAllUsers } from '@/services/userService';
import { addPointsEntry, getPointsEntries, deletePointsEntry } from '@/services/pointsService';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, getMonth, getYear, startOfMonth, endOfMonth, eachYearOfInterval, subMonths } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Trophy, List, CalendarIcon, Trash2, Filter, Info, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';

const pointsFormSchema = z.object({
  userId: z.string().min(1, "Please select a member."),
  date: z.date({ required_error: "A date is required." }),
  description: z.string().min(3, "Description is required."),
  points: z.coerce.number().positive("Points must be a positive number."),
  category: z.enum(['role', 'participation'], { required_error: "Category is required." }),
});

type PointsFormValues = z.infer<typeof pointsFormSchema>;

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

export default function LeaderboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pointsEntries, setPointsEntries] = useState<PointsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [entryToDelete, setEntryToDelete] = useState<PointsEntry | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const pointsForm = useForm<PointsFormValues>({
    resolver: zodResolver(pointsFormSchema),
    defaultValues: {
        userId: '',
        date: new Date(),
        description: '',
        points: undefined,
        category: 'participation',
    }
  });
  
  const approvedMembers = useMemo(() => 
    allUsers.filter(u => u.status === 'approved' && ['member', 'admin', 'super_admin'].includes(u.role))
  , [allUsers]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [users, entries] = await Promise.all([getAllUsers(), getPointsEntries()]);
      setAllUsers(users);
      setPointsEntries(entries);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPoints = async (values: PointsFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    const targetUser = allUsers.find(u => u.id === values.userId);
    if (!targetUser) {
        toast({ title: "Error", description: "Selected user not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    try {
      await addPointsEntry({
        ...values,
        date: values.date.toISOString(),
        userName: targetUser.name,
        addedBy: user.id,
      });
      toast({ title: "Success", description: "Points added successfully." });
      fetchData();
      setIsFormOpen(false);
      pointsForm.reset({ userId: '', date: new Date(), description: '', points: undefined, category: 'participation' });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add points.", variant: "destructive" });
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
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete entry.", variant: "destructive" });
    }
    setIsSubmitting(false);
    setIsDeleteAlertOpen(false);
    setEntryToDelete(null);
  };
  
  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };
  
  const availableYears = useMemo(() => {
    const years = new Set(pointsEntries.map(e => getYear(new Date(e.date))));
    const currentYear = new Date().getFullYear();
    if (!years.has(currentYear)) years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [pointsEntries]);

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), 'MMMM') }));

  const { leaderboardData, filteredEntries } = useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end = endOfMonth(new Date(selectedYear, selectedMonth));
    
    const currentMonthEntries = pointsEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
    });

    const pointsByUser: Record<string, { total: number; name: string; photoUrl?: string }> = {};

    currentMonthEntries.forEach(entry => {
      if (!pointsByUser[entry.userId]) {
        const userDetails = allUsers.find(u => u.id === entry.userId);
        pointsByUser[entry.userId] = { total: 0, name: entry.userName, photoUrl: userDetails?.photoUrl };
      }
      pointsByUser[entry.userId].total += entry.points;
    });

    const sortedLeaderboard = Object.entries(pointsByUser)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.total - a.total);

    return { leaderboardData: sortedLeaderboard, filteredEntries: currentMonthEntries };
  }, [pointsEntries, allUsers, selectedMonth, selectedYear]);

  if (authLoading || isLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold font-headline">Impact Leaderboard</h1>
         <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add Points Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Manual Points</DialogTitle></DialogHeader>
            <Form {...pointsForm}>
                <form onSubmit={pointsForm.handleSubmit(handleAddPoints)} className="space-y-4">
                    <FormField control={pointsForm.control} name="userId" render={({ field }) => (
                        <FormItem><FormLabel>Member</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a member" /></SelectTrigger></FormControl><SelectContent><ScrollArea className="h-60">{approvedMembers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</ScrollArea></SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                     <FormField control={pointsForm.control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                     )}/>
                     <FormField control={pointsForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Project Chairperson for Beach Cleanup" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={pointsForm.control} name="points" render={({ field }) => (<FormItem><FormLabel>Points</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={pointsForm.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="role">Role</SelectItem><SelectItem value="participation">Participation</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Add Points</Button></DialogFooter>
                </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Info className="mr-2 h-5 w-5 text-primary" />
            Points System Overview
          </CardTitle>
          <CardDescription>
            Points are awarded based on roles and participation in club activities.
          </CardDescription>
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
            <p className="text-xs text-muted-foreground mt-2">Note: For some projects, the higher point value is for leadership roles and the lower for general participation.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center"><Trophy className="mr-2 h-5 w-5 text-primary" /> Monthly Leaderboard</CardTitle>
              <CardDescription>Top contributors for the selected period.</CardDescription>
            </div>
            <div className="flex items-end gap-2 w-full sm:w-auto">
               <div className="flex-1 sm:flex-none"><Label htmlFor="filter-month">Month</Label><Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}><SelectTrigger id="filter-month"><SelectValue/></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent></Select></div>
               <div className="flex-1 sm:flex-none"><Label htmlFor="filter-year">Year</Label><Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}><SelectTrigger id="filter-year"><SelectValue/></SelectTrigger><SelectContent>{availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {leaderboardData.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[50px]">Rank</TableHead><TableHead>Member</TableHead><TableHead className="text-right">Total Points</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {leaderboardData.map((member, index) => (
                      <TableRow key={member.userId}>
                        <TableCell><Badge variant={index < 3 ? "default" : "secondary"} className={cn("text-lg", index < 3 && "bg-primary/80")}>{index + 1}</Badge></TableCell>
                        <TableCell className="font-medium flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarImage src={member.photoUrl} alt={member.name} data-ai-hint="profile avatar"/><AvatarFallback>{getInitials(member.name)}</AvatarFallback></Avatar>{member.name}</TableCell>
                        <TableCell className="text-right font-bold text-lg text-primary">{member.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            ) : <p className="text-center text-muted-foreground py-8">No points recorded for {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5 text-primary" />Points Log</CardTitle>
          <CardDescription>A detailed log of all manually added points for {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}.</CardDescription>
        </CardHeader>
        <CardContent>
             {filteredEntries.length > 0 ? (
                <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Member</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Points</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredEntries.map(entry => (
                            <TableRow key={entry.id}>
                                <TableCell>{format(new Date(entry.date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>{entry.userName}</TableCell>
                                <TableCell>{entry.description}</TableCell>
                                <TableCell><Badge variant="outline" className="capitalize">{entry.category}</Badge></TableCell>
                                <TableCell className="font-medium">{entry.points}</TableCell>
                                <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive" onClick={() => { setEntryToDelete(entry); setIsDeleteAlertOpen(true);}}><Trash2 className="h-4 w-4"/></Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             ) : <p className="text-center text-muted-foreground py-8">No point entries for this period.</p>}
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the points entry: "{entryToDelete?.description}" for {entryToDelete?.userName}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
