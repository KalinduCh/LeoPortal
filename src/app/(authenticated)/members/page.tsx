// src/app/(authenticated)/members/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { mockUsers } from '@/lib/data'; // Using mock data
import { Users as UsersIcon, Search, Edit, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

export default function MemberManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setMembers(mockUsers.filter(u => u.role === 'member')); // Only show members
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchMembers();
    }
  }, [user, fetchMembers]);

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleEditMember = (memberId: string) => {
    toast({title: "Feature Placeholder", description: `Edit action for member ${memberId} is not yet implemented.`});
  };
  
  const handleDeleteMember = async (memberId: string) => {
    if(confirm("Are you sure you want to remove this member? This action might be irreversible.")) {
        // Simulate API call for deletion
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setMembers(prev => prev.filter(m => m.id !== memberId));
        toast({title: "Member Removed", description: "The member has been removed (mock action)."});
        setIsLoading(false);
    }
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; 
  }
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }


  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">Member Management</h1>
        {/* Add "Add Member" button/dialog if needed */}
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UsersIcon className="mr-2 h-5 w-5 text-primary" /> Club Members
          </CardTitle>
          <CardDescription>View and manage club member details.</CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search members by name or email..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avatar</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  {/* Add more columns like Join Date, Status, etc. */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.photoUrl} alt={member.name} data-ai-hint="profile avatar" />
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                            {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleEditMember(member.id)} aria-label="Edit Member">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteMember(member.id)} aria-label="Delete Member">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm ? "No members match your search." : "No members found."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
