// src/app/(authenticated)/admin/settings/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { getAllUsers } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Shield, Users, Bell } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [admins, setAdmins] = useState<User[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const isSuperAdmin = user?.role === 'super_admin';

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
            router.replace('/dashboard');
        }
    }, [user, authLoading, router, isSuperAdmin, toast]);

    useEffect(() => {
        if (isSuperAdmin) {
            setIsLoadingData(true);
            getAllUsers()
                .then(allUsers => {
                    const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super_admin');
                    setAdmins(adminUsers);
                })
                .catch(err => {
                    console.error("Failed to fetch users for settings:", err);
                    toast({ title: "Error", description: "Could not load user data." });
                })
                .finally(() => setIsLoadingData(false));
        }
    }, [isSuperAdmin, toast]);
    
    const getInitials = (name?: string) => {
        if (!name) return "??";
        const names = name.split(' ');
        if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    };


    if (authLoading || isLoadingData || !isSuperAdmin) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold font-headline">Portal Settings</h1>
                <p className="text-muted-foreground">Manage roles, permissions, and system configurations.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-xl"><Shield className="mr-2 h-5 w-5 text-primary"/>Admin Permissions</CardTitle>
                    <CardDescription>Assign granular permissions to administrators for accessing different sections of the portal. Coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Administrator</TableHead>
                                    <TableHead>Permissions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.map(admin => (
                                    <TableRow key={admin.id}>
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={admin.photoUrl} alt={admin.name} data-ai-hint="profile avatar" />
                                                <AvatarFallback>{getInitials(admin.name)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p>{admin.name}</p>
                                                <p className="text-xs text-muted-foreground">{admin.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground italic">
                                            {admin.role === 'super_admin' ? 'Full Access' : 'Permission toggles coming soon...'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Separator />
            
            <Card className="opacity-50">
                 <CardHeader>
                    <CardTitle className="flex items-center text-xl"><Users className="mr-2 h-5 w-5 text-primary"/>Member Settings</CardTitle>
                    <CardDescription>Configure global settings related to members. Feature coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground italic">e.g., Set annual membership fee amount...</p>
                </CardContent>
            </Card>
            
            <Card className="opacity-50">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl"><Bell className="mr-2 h-5 w-5 text-primary"/>Notification Settings</CardTitle>
                    <CardDescription>Manage automated notifications for events and approvals. Feature coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground italic">e.g., Toggle welcome emails, event reminders...</p>
                </CardContent>
            </Card>
        </div>
    );
}
