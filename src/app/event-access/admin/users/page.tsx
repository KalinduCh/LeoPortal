"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, UserCheck, UserX, Mail, Clock, ArrowLeft } from 'lucide-react';
import { getEntrivoOrganizers, approveUser, rejectUser } from '@/services/userService';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

export default function ManageOrganizersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [organizers, setOrganizers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const isSuperAdmin = user?.email === 'chamikarakc@gmail.com' || user?.email === 'check22@gmail.com';

  const fetchOrganizers = async () => {
    setIsLoading(true);
    try {
      const data = await getEntrivoOrganizers();
      setOrganizers(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load organizers.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isSuperAdmin) {
        router.push('/event-access/admin');
      } else {
        fetchOrganizers();
      }
    }
  }, [user, authLoading, isSuperAdmin, router]);

  const handleAction = async (targetId: string, action: 'approve' | 'reject') => {
    setIsProcessing(targetId);
    try {
      if (action === 'approve') await approveUser(targetId);
      else await rejectUser(targetId);
      
      toast({ title: "Status Updated", description: `Organizer has been ${action}ed.` });
      fetchOrganizers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
    setIsProcessing(null);
  };

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-10">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" onClick={() => router.push('/event-access/admin')} className="pl-0 text-primary font-bold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Modules
        </Button>
        <h1 className="text-4xl font-bold font-headline tracking-tight text-slate-900 uppercase">Organizer Management</h1>
        <p className="text-slate-500 uppercase text-xs tracking-widest font-black">Authorized Access Review</p>
      </div>

      <Card className="shadow-xl border-none ring-1 ring-slate-200 overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 p-8 text-white">
          <CardTitle className="text-xl flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Organizer Applications
          </CardTitle>
          <CardDescription className="text-slate-400">Review and manage access for district event organizers.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">Applicant Details</TableHead>
                <TableHead className="font-bold">Requested On</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizers.map(u => (
                <TableRow key={u.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <p className="font-bold text-slate-900">{u.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-tighter">
                      <Mail className="h-3 w-3" /> {u.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {u.createdAt ? format(parseISO(u.createdAt), 'PPp') : 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={u.status === 'approved' ? 'default' : 'secondary'} 
                      className={cn("uppercase font-black text-[10px]", u.status === 'approved' ? 'bg-emerald-600' : 'bg-amber-100 text-amber-700')}
                    >
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {u.status === 'pending' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-rose-600 font-bold hover:bg-rose-50"
                          disabled={isProcessing === u.id}
                          onClick={() => handleAction(u.id, 'reject')}
                        >
                          <UserX className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                          disabled={isProcessing === u.id}
                          onClick={() => handleAction(u.id, 'approve')}
                        >
                          {isProcessing === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="mr-1 h-3.5 w-3.5" />} Approve
                        </Button>
                      </>
                    )}
                    {u.status === 'approved' && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-slate-400 hover:text-rose-600"
                            onClick={() => handleAction(u.id, 'reject')}
                            disabled={isProcessing === u.id}
                        >
                            Revoke Access
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {organizers.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400 italic">No organizer accounts found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
