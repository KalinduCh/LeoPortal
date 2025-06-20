// src/app/(authenticated)/members/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db, auth as firebaseAuth } from '@/lib/firebase/clientApp'; // Import auth for direct use
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { createUserProfile } from '@/services/userService'; // Import service
import { Users as UsersIcon, Search, Edit, Trash2, Loader2, UploadCloud, FileText } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function MemberManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "member")); // Initially fetch only members
      const querySnapshot = await getDocs(q);
      const fetchedMembers: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMembers.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            photoUrl: data.photoUrl,
            role: data.role,
        } as User);
      });
      setMembers(fetchedMembers);
    } catch (error) {
        console.error("Error fetching members: ", error);
        toast({ title: "Error", description: "Could not load members.", variant: "destructive"});
    }
    setIsLoading(false);
  }, [toast]);

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
    if(confirm("Are you sure you want to remove this member's profile from the database? This does not delete their login credentials but removes their app profile.")) {
        setIsLoading(true); 
        try {
            const memberDocRef = doc(db, "users", memberId);
            await deleteDoc(memberDocRef);
            toast({title: "Member Profile Removed", description: "The member's profile has been removed from Firestore."});
            fetchMembers(); 
        } catch (error) {
            console.error("Error deleting member profile:", error);
            toast({title: "Error", description: "Could not remove member profile.", variant: "destructive"});
        }
        setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCsvFile(event.target.files[0]);
    } else {
      setCsvFile(null);
    }
  };

  const parseCSV = (csvText: string): { header: string[], data: Record<string, string>[] } => {
    const lines = csvText.trim().split(/\r\n|\n/);
    if (lines.length === 0) return { header: [], data: [] };

    const header = lines[0].split(',').map(h => h.trim());
    const data: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === header.length) {
        const row: Record<string, string> = {};
        header.forEach((col, index) => {
          row[col] = values[index];
        });
        data.push(row);
      }
    }
    return { header, data };
  };

  const handleImportMembers = async () => {
    if (!csvFile) {
      toast({ title: "No File Selected", description: "Please select a CSV file to import.", variant: "destructive" });
      return;
    }
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      if (!csvText) {
        toast({ title: "Error Reading File", description: "Could not read the CSV file.", variant: "destructive" });
        setIsImporting(false);
        return;
      }

      const { header, data } = parseCSV(csvText);
      const requiredHeaders = ["Type", "Name", "Email", "NIC"];
      if (!requiredHeaders.every(h => header.includes(h))) {
        toast({
          title: "Invalid CSV Format",
          description: `CSV must contain headers: ${requiredHeaders.join(", ")}.`,
          variant: "destructive"
        });
        setIsImporting(false);
        return;
      }

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const row of data) {
        const email = row["Email"];
        const password = row["NIC"]; // Using NIC as password
        const name = row["Name"];
        const type = row["Type"]?.toLowerCase();
        const role = type === 'admin' ? 'admin' : 'member';

        if (!email || !password || !name || !type) {
          errors.push(`Skipping row due to missing data: ${JSON.stringify(row)}`);
          failureCount++;
          continue;
        }

        if (password.length < 6) {
          errors.push(`Password (NIC) for ${email} must be at least 6 characters long.`);
          failureCount++;
          continue;
        }
        
        try {
          const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          const uid = userCredential.user.uid;
          await createUserProfile(uid, email, name, role);
          successCount++;
        } catch (error: any) {
          failureCount++;
          const firebaseError = error.code ? `${error.code}: ${error.message}` : error.message;
          errors.push(`Failed to import ${email}: ${firebaseError}`);
          console.error(`Failed to import ${email}:`, error);
        }
      }

      toast({
        title: "Import Complete",
        description: `${successCount} users imported successfully. ${failureCount} users failed. Check console for details on failures.`,
        variant: successCount > 0 && failureCount === 0 ? "default" : "destructive",
        duration: 10000, 
      });
      
      if (errors.length > 0) {
        console.warn("Import errors:", errors);
         // For critical errors, you might want a more prominent display
      }

      setCsvFile(null);
      if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      fetchMembers(); // Refresh member list
      setIsImporting(false);
    };
    reader.onerror = () => {
        toast({ title: "Error Reading File", description: "An error occurred while trying to read the file.", variant: "destructive" });
        setIsImporting(false);
    }
    reader.readAsText(csvFile);
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }

  if (authLoading || (isLoading && !isImporting)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; 
  }
  
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Member Management</h1>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center">
                <UploadCloud className="mr-2 h-5 w-5 text-primary" /> Import Members from CSV
            </CardTitle>
            <CardDescription>Upload a CSV file to batch import member and admin accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange} 
                    ref={fileInputRef}
                    className="flex-grow"
                    disabled={isImporting}
                />
                <Button onClick={handleImportMembers} disabled={!csvFile || isImporting} className="w-full sm:w-auto">
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    {isImporting ? "Importing..." : "Import Members"}
                </Button>
            </div>
            <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>CSV Format Instructions</AlertTitle>
                <AlertDescription>
                    Ensure your CSV file has the following headers in the first row: <strong>Type, Name, Email, NIC</strong>.
                    <ul>
                        <li>- <strong>Type</strong>: "admin" or "member".</li>
                        <li>- <strong>Name</strong>: Full name of the user.</li>
                        <li>- <strong>Email</strong>: User's email (will be their login).</li>
                        <li>- <strong>NIC</strong>: Used as initial password (must be at least 6 characters).</li>
                    </ul>
                    Other columns will be ignored.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UsersIcon className="mr-2 h-5 w-5 text-primary" /> Club Members
          </CardTitle>
          <CardDescription>View and manage club member details. Member deletion here removes their profile data but not their login.</CardDescription>
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
          {isLoading && !isImporting ? (
             <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : filteredMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avatar</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
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
                      <Button variant="outline" size="icon" onClick={() => handleEditMember(member.id)} aria-label="Edit Member" disabled={isImporting}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteMember(member.id)} aria-label="Delete Member" disabled={isImporting || isLoading}>
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

