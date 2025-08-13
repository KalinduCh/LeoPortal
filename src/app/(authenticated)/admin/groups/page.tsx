
// src/app/(authenticated)/admin/groups/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, CommunicationGroup } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, Loader2, Users, Search, ChevronRight } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getAllUsers } from '@/services/userService';
import { getGroups, createGroup, updateGroup, deleteGroup } from '@/services/groupService';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type GroupFormState = {
    id?: string;
    name: string;
    memberIds: string[];
}

export default function GroupManagementPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [groups, setGroups] = useState<CommunicationGroup[]>([]);
    const [allMembers, setAllMembers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GroupFormState | null>(null);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    
    const [groupToDelete, setGroupToDelete] = useState<CommunicationGroup | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedGroups, fetchedUsers] = await Promise.all([
                getGroups(),
                getAllUsers(),
            ]);
            setGroups(fetchedGroups);
            setAllMembers(fetchedUsers.filter(u => u.status === 'approved'));
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast({ title: "Error", description: "Could not load groups or members.", variant: "destructive"});
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        if (!authLoading && user?.role === 'admin') {
            fetchData();
        } else if (!authLoading && user?.role !== 'admin') {
            router.replace('/dashboard');
        }
    }, [user, authLoading, router, fetchData]);

    const handleOpenForm = (group?: CommunicationGroup) => {
        if (group) {
            setSelectedGroup({ id: group.id, name: group.name, memberIds: group.memberIds });
        } else {
            setSelectedGroup({ name: '', memberIds: [] });
        }
        setMemberSearchTerm('');
        setIsFormOpen(true);
    };

    const handleFormSubmit = async () => {
        if (!selectedGroup) return;
        setIsSubmitting(true);
        
        try {
            if (selectedGroup.id) {
                // Update existing group
                await updateGroup(selectedGroup.id, { name: selectedGroup.name, memberIds: selectedGroup.memberIds });
                toast({ title: "Group Updated", description: `The "${selectedGroup.name}" group has been updated.`});
            } else {
                // Create new group
                await createGroup(selectedGroup.name, selectedGroup.memberIds);
                toast({ title: "Group Created", description: `The "${selectedGroup.name}" group has been created.`});
            }
            fetchData();
            setIsFormOpen(false);
            setSelectedGroup(null);
        } catch (error: any) {
            toast({ title: "Error", description: `Could not save group: ${error.message}`, variant: "destructive"});
        }
        setIsSubmitting(false);
    };

    const handleDeleteGroup = async () => {
        if (!groupToDelete) return;
        setIsSubmitting(true);
        try {
            await deleteGroup(groupToDelete.id);
            toast({ title: "Group Deleted", description: `The "${groupToDelete.name}" group has been deleted.` });
            fetchData();
        } catch (error: any) {
             toast({ title: "Error", description: `Could not delete group: ${error.message}`, variant: "destructive"});
        }
        setIsSubmitting(false);
        setIsDeleteAlertOpen(false);
        setGroupToDelete(null);
    };

    const filteredMembers = useMemo(() => {
        return allMembers.filter(member => 
            member.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(memberSearchTerm.toLowerCase())
        );
    }, [allMembers, memberSearchTerm]);
    
    const getInitials = (name?: string) => {
        if (!name) return "??";
        const names = name.split(' ');
        if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    };

    if (isLoading || authLoading) {
        return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Communication Groups</h1>
                    <p className="text-muted-foreground mt-1">Create and manage recipient groups for easier communication.</p>
                </div>
                <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Existing Groups</CardTitle>
                    <CardDescription>Click a group to edit or delete it.</CardDescription>
                </CardHeader>
                <CardContent>
                    {groups.length > 0 ? (
                        <div className="space-y-3">
                            {groups.map(group => (
                                <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div>
                                        <h3 className="font-semibold text-primary">{group.name}</h3>
                                        <p className="text-sm text-muted-foreground">{group.memberIds.length} member(s)</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(group)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => { setGroupToDelete(group); setIsDeleteAlertOpen(true); }}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No groups created yet.</p>
                            <p>Click "Create New Group" to get started.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedGroup?.id ? 'Edit Group' : 'Create New Group'}</DialogTitle>
                    </DialogHeader>
                    {selectedGroup && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="group-name">Group Name</Label>
                                <Input 
                                    id="group-name"
                                    value={selectedGroup.name}
                                    onChange={(e) => setSelectedGroup({...selectedGroup, name: e.target.value})}
                                    placeholder="e.g., Executive Committee"
                                />
                            </div>
                             <div className="space-y-2">
                                <Label>Members</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search members to add..."
                                        value={memberSearchTerm}
                                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <ScrollArea className="h-72 border rounded-md p-2">
                                    {filteredMembers.length > 0 ? (
                                        <div className="space-y-2">
                                            {filteredMembers.map(member => (
                                                <div key={member.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted/30">
                                                    <Checkbox
                                                        id={`member-${member.id}`}
                                                        checked={selectedGroup.memberIds.includes(member.id)}
                                                        onCheckedChange={(checked) => {
                                                            const newMemberIds = checked
                                                                ? [...selectedGroup.memberIds, member.id]
                                                                : selectedGroup.memberIds.filter(id => id !== member.id);
                                                            setSelectedGroup({...selectedGroup, memberIds: newMemberIds});
                                                        }}
                                                    />
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={member.photoUrl} alt={member.name} data-ai-hint="profile avatar" />
                                                        <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">{getInitials(member.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <label htmlFor={`member-${member.id}`} className="text-sm font-medium leading-none cursor-pointer">
                                                        {member.name}
                                                        <p className="text-xs text-muted-foreground">{member.email}</p>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-sm text-muted-foreground py-4">No members match your search.</p>
                                    )}
                                </ScrollArea>
                                <Badge variant="secondary">Total Selected: {selectedGroup.memberIds.length}</Badge>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleFormSubmit} disabled={isSubmitting || !selectedGroup?.name.trim()}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {selectedGroup?.id ? 'Save Changes' : 'Create Group'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the "{groupToDelete?.name}" group. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

