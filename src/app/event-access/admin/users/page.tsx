
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, UserCheck, UserX, Mail, ArrowLeft, Globe, Layout, ShieldAlert } from 'lucide-react';
import { getEntrivoOrganizers, approveUser, rejectUser, updateUserProfile } from '@/services/userService';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ManageOrganizersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [organizers, setOrganizers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';

  const fetchOrganizers = async () => {
    setIsLoading(true);
    try {
      const data = await getEntrivoOrganizers();
      setOrganizers(data);
    } catch (error: any) {
      console.error("ENTRIVO_ADMIN_ERROR:", error);
      toast({ title: "Error", description: "Could not load organizers list.", variant: "destructive" });
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

  const handleAction = async (target: User, action: 'approve' | 'reject' | 'revoke') => {
    setIsProcessing(target.id);
    try {
      if (action === 'approve') {
          await approveUser(target.id);
          toast({ title: "Access Granted", description: `${target.name} is now an authorized organizer.` });
      } else if (action === 'reject') {
          await rejectUser(target.id); // Deletes record
          toast({ title: "Application Rejected", description: "Application removed from the database." });
      } else if (action === 'revoke') {
          if (target.source === 'portal') {
              // Just remove the specific permission for portal users
              const newPermissions = { ...target.permissions };
              delete newPermissions.district_access;
              await updateUserProfile(target.id, { permissions: newPermissions });
              toast({ title: "Access Revoked", description: "District access removed from portal account." });
          } else {
              // Delete entrivo-only users
              await rejectUser(target.id);
              toast({ title: "Account Removed", description: "District organizer account has been deleted." });
          }
      }
      
      fetchOrganizers();
    } catch (error) {
      toast({ title: "Error", description: "Action failed. Please try again.", variant: "destructive" });
    }
    setIsProcessing(null);
  };

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-10">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" onClick={() => router.push('/event-access/admin')} className="pl-0 text-primary font-bold hover:bg-primary/5">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Modules
        </Button>
        <h1 className="text-4xl font-bold font-headline tracking-tight text-slate-900 uppercase">Organizer Registry</h1>
        <p className="text-slate-500 uppercase text-xs tracking-widest font-black">Management of Authorized Personnel</p>
      </div>

      <Card className="shadow-xl border-none ring-1 ring-slate-200 overflow-hidden bg-white rounded-2xl">
        <CardHeader className="bg-slate-900 p-8 text-white">
          <CardTitle className="text-xl flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" /> Authorized Personnel
          </CardTitle>
          <CardDescription className="text-slate-400">Registry of users with administrative access to Entrivo modules.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead className="font-bold py-4">Organizer Details</TableHead>
                    <TableHead className="font-bold py-4">Account Origin</TableHead>
                    <TableHead className="font-bold py-4">Current Status</TableHead>
                    <TableHead className="text-right font-bold py-4 pr-8">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {organizers.map(u => (
                    <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4">
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-tighter">
                        <Mail className="h-3 w-3" /> {u.email}
                        </div>
                    </TableCell>
                    <TableCell className="py-4">
                        {u.source === 'entrivo' ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1.5 py-1 px-3">
                                <Globe className="h-3 w-3" /> District Native
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 flex items-center gap-1.5 py-1 px-3">
                                <Layout className="h-3 w-3" /> Portal Administrator
                            </Badge>
                        )}
                    </TableCell>
                    <TableCell className="py-4">
                        <Badge 
                        variant={u.status === 'approved' ? 'default' : 'secondary'} 
                        className={cn("uppercase font-black text-[10px] tracking-widest", u.status === 'approved' ? 'bg-emerald-600' : 'bg-amber-100 text-amber-700')}
                        >
                        {u.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2 py-4 pr-8">
                        {u.status === 'pending' && (
                        <>
                            <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-rose-600 font-bold hover:bg-rose-50"
                            disabled={isProcessing === u.id}
                            onClick={() => handleAction(u, 'reject')}
                            >
                            <UserX className="mr-1 h-3.5 w-3.5" /> Reject & Delete
                            </Button>
                            <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md"
                            disabled={isProcessing === u.id}
                            onClick={() => handleAction(u, 'approve')}
                            >
                            {isProcessing === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="mr-1 h-3.5 w-3.5" />} Approve Access
                            </Button>
                        </>
                        )}
                        {u.status === 'approved' && u.id !== user?.id && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-slate-400 hover:text-rose-600 font-bold"
                                onClick={() => handleAction(u, 'revoke')}
                                disabled={isProcessing === u.id}
                            >
                                <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Revoke Permissions
                            </Button>
                        )}
                        {u.id === user?.id && (
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest italic">Current Session</p>
                        )}
                    </TableCell>
                    </TableRow>
                ))}
                {organizers.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-24 text-slate-400 italic">No authorized personnel found in the registry.</TableCell></TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
