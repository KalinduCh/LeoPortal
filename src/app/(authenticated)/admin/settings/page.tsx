
// src/app/(authenticated)/admin/settings/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import type { User, AdminPermission } from '@/types';
import { getAllUsers, updateUserProfile } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { produce } from 'immer';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Shield, Users, Bell, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const PERMISSION_CONFIG: { id: AdminPermission; label: string }[] = [
    { id: 'members', label: 'Members' },
    { id: 'events', label: 'Events' },
    { id: 'finance', label: 'Finance' },
    { id: 'communication', label: 'Communication' },
    { id: 'project_ideas', label: 'Idea Review' },
    { id: 'reports', label: 'Reports' },
];

export default function SettingsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [admins, setAdmins] = useState<User[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const isSuperAdmin = user?.role === 'super_admin';

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
            router.replace('/dashboard');
        }
    }, [user, authLoading, router, isSuperAdmin, toast]);

    const fetchAdmins = async () => {
        setIsLoadingData(true);
        try {
            const allUsers = await getAllUsers();
            const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super_admin').sort((a, b) => a.role === 'super_admin' ? -1 : 1);
            setAdmins(adminUsers);
        } catch (err) {
            console.error("Failed to fetch users for settings:", err);
            toast({ title: "Error", description: "Could not load user data." });
        }
        setIsLoadingData(false);
    };

    useEffect(() => {
        if (isSuperAdmin) {
            fetchAdmins();
        }
    }, [isSuperAdmin]);
    
    const getInitials = (name?: string) => {
        if (!name) return "??";
        const names = name.split(' ');
        if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    };

    const handlePermissionChange = (adminId: string, permission: AdminPermission, value: boolean) => {
        setAdmins(
            produce(draft => {
                const admin = draft.find(a => a.id === adminId);
                if (admin) {
                    if (!admin.permissions) {
                        admin.permissions = {};
                    }
                    admin.permissions[permission] = value;
                }
            })
        );
    };
    
    const handleSaveChanges = async (admin: User) => {
        if (!admin.permissions) return;
        setIsSubmitting(admin.id);
        try {
            await updateUserProfile(admin.id, { permissions: admin.permissions });
            toast({ title: "Permissions Updated", description: `Successfully updated permissions for ${admin.name}.`});
        } catch(error: any) {
            toast({ title: "Update Failed", description: `Could not save permissions: ${error.message}`, variant: "destructive"});
            // Re-fetch to revert optimistic UI on failure
            fetchAdmins();
        } finally {
            setIsSubmitting(null);
        }
    };

    if (authLoading || isLoadingData) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="container mx-auto py-8 space-y-8 max-w-6xl">
            <div>
                <h1 className="text-3xl font-bold font-headline">Portal Settings</h1>
                <p className="text-muted-foreground">Manage roles, permissions, and system configurations.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-xl"><Shield className="mr-2 h-5 w-5 text-primary"/>Admin Permissions</CardTitle>
                    <CardDescription>Assign granular permissions to administrators for accessing different sections of the portal.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Desktop View */}
                    <div className="hidden md:block border rounded-lg overflow-x-auto">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Administrator</TableHead>
                                    {PERMISSION_CONFIG.map(p => <TableHead key={p.id}>{p.label}</TableHead>)}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.map(admin => (
                                    <TableRow key={admin.id}>
                                        <TableCell className="font-medium flex items-center gap-3 min-w-[200px]">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={admin.photoUrl} alt={admin.name} data-ai-hint="profile avatar" />
                                                <AvatarFallback>{getInitials(admin.name)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p>{admin.name}</p>
                                                <p className="text-xs text-muted-foreground">{admin.email}</p>
                                            </div>
                                        </TableCell>
                                        
                                        {PERMISSION_CONFIG.map(p => (
                                            <TableCell key={p.id}>
                                                {admin.role === 'super_admin' ? (
                                                     <Checkbox checked={true} disabled={true} />
                                                ) : (
                                                    <Checkbox
                                                        checked={admin.permissions?.[p.id] ?? false}
                                                        onCheckedChange={(value) => handlePermissionChange(admin.id, p.id, value as boolean)}
                                                        disabled={isSubmitting === admin.id}
                                                    />
                                                )}
                                            </TableCell>
                                        ))}
                                        
                                        <TableCell className="text-right">
                                           {admin.role !== 'super_admin' && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleSaveChanges(admin)} 
                                                    disabled={isSubmitting === admin.id}
                                                >
                                                    {isSubmitting === admin.id ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                    ) : (
                                                        <Save className="mr-2 h-4 w-4"/>
                                                    )}
                                                    Save
                                                </Button>
                                           )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-4">
                        {admins.map(admin => (
                            <Card key={admin.id} className="shadow-md">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={admin.photoUrl} alt={admin.name} data-ai-hint="profile avatar" />
                                            <AvatarFallback>{getInitials(admin.name)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-base">{admin.name}</CardTitle>
                                            <CardDescription className="text-xs">{admin.email}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {PERMISSION_CONFIG.map(p => (
                                            <div key={p.id} className="flex items-center space-x-2">
                                                {admin.role === 'super_admin' ? (
                                                    <Checkbox id={`${admin.id}-${p.id}`} checked={true} disabled={true} />
                                                ) : (
                                                    <Checkbox
                                                        id={`${admin.id}-${p.id}`}
                                                        checked={admin.permissions?.[p.id] ?? false}
                                                        onCheckedChange={(value) => handlePermissionChange(admin.id, p.id, value as boolean)}
                                                        disabled={isSubmitting === admin.id}
                                                    />
                                                )}
                                                <Label htmlFor={`${admin.id}-${p.id}`} className="text-sm font-normal">{p.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                {admin.role !== 'super_admin' && (
                                     <CardFooter className="border-t pt-4">
                                        <Button 
                                            size="sm" 
                                            className="w-full"
                                            onClick={() => handleSaveChanges(admin)} 
                                            disabled={isSubmitting === admin.id}
                                        >
                                            {isSubmitting === admin.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            ) : (
                                                <Save className="mr-2 h-4 w-4"/>
                                            )}
                                            Save Changes
                                        </Button>
                                    </CardFooter>
                                )}
                            </Card>
                        ))}
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
