
// src/app/(authenticated)/members/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db, auth as firebaseAuth } from '@/lib/firebase/clientApp'; 
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { createUserProfile, updateUserProfile, approveUser as approveUserService, deleteUserProfile } from '@/services/userService';
import { Users as UsersIcon, Search, Edit, Trash2, Loader2, UploadCloud, FileText, PlusCircle, Mail, Briefcase, UserCheck, UserX } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { MemberEditForm, type MemberEditFormValues } from '@/components/members/member-edit-form';
import { MemberAddForm, type MemberAddFormValues } from '@/components/members/member-add-form';

export default function MemberManagementPage() {
  const { user, isLoading: authLoading, performAdminAuthOperation, setAuthOperationInProgress } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<User | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);


  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef); 
      const querySnapshot = await getDocs(q);
      const fetchedMembers: User[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedMembers.push({
            id: docSnap.id, 
            name: data.name,
            email: data.email,
            photoUrl: data.photoUrl,
            role: data.role,
            status: data.status || 'approved', // Default to approved for older users
            designation: data.designation,
            nic: data.nic,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            mobileNumber: data.mobileNumber,
        } as User);
      });
      setMembers(fetchedMembers.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
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

  const { approvedMembers, pendingMembers } = useMemo(() => {
    const approved = members.filter(m => m.status === 'approved');
    const pending = members.filter(m => m.status === 'pending');
    return { approvedMembers: approved, pendingMembers: pending };
  }, [members]);

  const filteredMembers = approvedMembers.filter(memberItem => 
    (memberItem.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (memberItem.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (memberItem.designation?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );
  
  const handleOpenEditForm = (memberToEdit: User) => {
    setSelectedMemberForEdit(memberToEdit);
    setIsEditFormOpen(true);
  };
  
  const handleEditFormSubmit = async (data: MemberEditFormValues) => {
    if (!selectedMemberForEdit) return;
    setIsSubmitting(true);
    try {
      await updateUserProfile(selectedMemberForEdit.id, data); 
      toast({title: "User Updated", description: "User details have been successfully updated."});
      fetchMembers();
      setIsEditFormOpen(false);
      setSelectedMemberForEdit(null);
    } catch (error: any) {
      console.error("Failed to update user:", error);
      toast({ title: "Error", description: `Could not update user details: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleOpenAddForm = () => {
    setIsAddFormOpen(true);
  };

  const handleAddFormSubmit = async (data: MemberAddFormValues) => {
    setIsSubmitting(true);
    const originalAuthUserUID = firebaseAuth.currentUser?.uid;

    try {
      await performAdminAuthOperation(async () => {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
        const newAuthUser = userCredential.user;

        await createUserProfile(
          newAuthUser.uid,
          data.email,
          data.name,
          data.role,
          'approved', // Admins add pre-approved users
          undefined,
          undefined, 
          undefined, 
          undefined, 
          undefined, 
          data.designation 
        );
        
        if (firebaseAuth.currentUser && firebaseAuth.currentUser.uid === newAuthUser.uid) {
          await signOut(firebaseAuth);
        }
      });

      toast({ title: "User Created", description: `${data.name} has been successfully added as an approved user.` });
      fetchMembers(); 
      setIsAddFormOpen(false); 

    } catch (error: any) {
      console.error("Failed to add user:", error);
      let errorMessage = "Could not create user account.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak. It must be at least 6 characters.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      toast({ title: "Error Adding User", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      if (originalAuthUserUID && (!firebaseAuth.currentUser || firebaseAuth.currentUser.uid !== originalAuthUserUID)) {
        // This message is handled by performAdminAuthOperation and onAuthStateChanged in useAuth
      }
    }
  };
  
  const handleApprove = async (memberId: string) => {
    setIsSubmitting(true);
    try {
        await approveUserService(memberId);
        toast({ title: "User Approved", description: "The user can now log in."});
        fetchMembers();
    } catch (error: any) {
        toast({ title: "Approval Failed", description: `Could not approve user: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleReject = async (memberId: string, memberEmail?: string) => {
    if (!memberId) return;
    if (confirm(`Are you sure you want to reject and delete the profile for ${memberEmail || 'this user'}? This action cannot be undone.`)) {
        setIsSubmitting(true);
        try {
            await deleteUserProfile(memberId);
            toast({ title: "User Rejected", description: "The user's pending application has been deleted."});
            fetchMembers();
        } catch (error: any) {
            toast({ title: "Rejection Failed", description: `Could not delete user profile: ${error.message}`, variant: "destructive" });
        }
        setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!memberId) {
        toast({ title: "Error", description: "Cannot delete user: User ID is missing.", variant: "destructive"});
        return;
    }
    if (memberId === user?.id) {
        toast({ title: "Action Denied", description: "You cannot delete your own profile from this interface.", variant: "destructive"});
        return;
    }
    if (confirm("Are you sure you want to remove this user's profile from the database? This action cannot be undone.")) {
        setIsSubmitting(true); 
        try {
            await deleteUserProfile(memberId);
            toast({title: "User Profile Removed", description: "The user's profile has been removed."});
            setMembers(prevMembers => prevMembers.filter(m => m.id !== memberId)); 
        } catch (error: any) {
            console.error(`Failed to delete user profile for ID ${memberId}:`, error);
            toast({title: "Error Deleting Profile", description: `Could not remove user profile. Error: ${error.message || 'Unknown Firestore error.'}`, variant: "destructive", duration: 7000});
        }
        setIsSubmitting(false);
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
    setAuthOperationInProgress(true); 
    const originalAuthUserUID = firebaseAuth.currentUser?.uid;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      if (!csvText) {
        toast({ title: "Error Reading File", description: "Could not read the CSV file.", variant: "destructive" });
        setIsImporting(false);
        setAuthOperationInProgress(false);
        return;
      }

      const { header, data } = parseCSV(csvText);
      const requiredHeaders = ["Type", "Name", "Email", "NIC", "DateOfBirth", "Gender", "MobileNumber", "Designation"];
      if (!requiredHeaders.every(h => header.includes(h))) {
        toast({
          title: "Invalid CSV Format",
          description: `CSV must contain headers: ${requiredHeaders.join(", ")}. Found: ${header.join(", ")}`,
          variant: "destructive",
          duration: 10000,
        });
        setIsImporting(false);
        setAuthOperationInProgress(false);
        return;
      }

      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const importMessages: string[] = []; 

      for (const row of data) {
        const email = row["Email"];
        const password = row["NIC"]; 
        const name = row["Name"];
        const type = row["Type"]?.toLowerCase();
        const role = type === 'admin' ? 'admin' : 'member';
        const nic = row["NIC"];
        const dateOfBirth = row["DateOfBirth"];
        const gender = row["Gender"];
        const mobileNumber = row["MobileNumber"];
        const designation = row["Designation"];

        if (!email || !password || !name || !type || !nic || !designation) {
          skippedCount++;
          importMessages.push(`Skipped (Missing Data): Row for ${email || 'Unknown Email'} had missing essential data (Email, NIC, Name, Type, Designation).`);
          console.warn(`Skipped (Missing Data): Row for ${email || 'Unknown Email'} had missing essential data. Row:`, row);
          continue;
        }
        if (password.length < 6) {
          skippedCount++;
          importMessages.push(`Skipped (Weak Password for ${email}): NIC (password) must be at least 6 characters. Value: '${password}'`);
          console.warn(`Skipped (Weak Password for ${email}): NIC (password) must be at least 6 characters. Value: '${password}'`);
          continue;
        }
        
        try {
          const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          const newAuthUser = userCredential.user;
          
          await createUserProfile(
            newAuthUser.uid, 
            email, 
            name, 
            role, 
            'approved', // Users from CSV are pre-approved
            undefined, 
            nic,
            dateOfBirth,
            gender,
            mobileNumber,
            designation
          );
          
          if (firebaseAuth.currentUser && firebaseAuth.currentUser.uid === newAuthUser.uid) {
            await signOut(firebaseAuth); 
            importMessages.push(`Successfully imported and signed out ${email}.`);
          } else {
            importMessages.push(`Successfully imported ${email} (admin session was not current).`);
          }
          successCount++;
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            skippedCount++;
            importMessages.push(`Skipped (Email Exists): ${email}`);
            console.warn(`Skipped (Email Exists): ${email}`);
          } else if (error.code === 'auth/weak-password') {
            skippedCount++;
            importMessages.push(`Skipped (Weak Password for ${email}): NIC (password) must be at least 6 characters. Password provided: ${password}`);
            console.warn(`Skipped (Weak Password for ${email}): Password provided: ${password}`);
          } else {
            errorCount++;
            const firebaseErrorMsg = error.message || String(error);
            importMessages.push(`Error importing ${email}: ${firebaseErrorMsg.substring(0,150)}...`);
            console.error(`Full error for ${email}:`, error);

            if (firebaseAuth.currentUser && firebaseAuth.currentUser.email === email) {
              try {
                await signOut(firebaseAuth);
                importMessages.push(`Defensive sign-out attempted for ${email} after error.`);
              } catch (signOutError) {
                console.error(`Error during defensive sign-out for ${email} after main error:`, signOutError);
                importMessages.push(`Error during defensive sign-out for ${email} after main error.`);
              }
            }
          }
        }
      } 
      
      fetchMembers(); 
      await new Promise(resolve => setTimeout(resolve, 1000)); 

      let toastTitle = "Import Process Complete";
      let toastDescription = `${successCount} users imported.`;
      let toastVariant: "default" | "destructive" = "default";

      if (skippedCount > 0) toastDescription += ` ${skippedCount} skipped.`;
      if (errorCount > 0) {
        toastDescription += ` ${errorCount} failed.`;
        toastVariant = "destructive";
      }
      
      if (skippedCount > 0 || errorCount > 0) {
          toastDescription += " Check browser console for details.";
          console.warn("--- Import Summary & Details ---");
          importMessages.forEach(msg => console.log(msg));
          console.warn("--- End of Import Summary ---");
      }
      
      const showSessionNotice = originalAuthUserUID && (!firebaseAuth.currentUser || firebaseAuth.currentUser.uid !== originalAuthUserUID);

      if (showSessionNotice) {
        toast({
          title: "Session Notice (Import Related)",
          description: "Your admin session may have been affected by importing users. If you experience issues, please log out and log back in.",
          variant: "destructive", 
          duration: 15000, 
        });
        setTimeout(() => {
            toast({ title: toastTitle, description: toastDescription, variant: toastVariant, duration: 10000 });
        }, 500); 
      } else {
        toast({ title: toastTitle, description: toastDescription, variant: toastVariant, duration: 10000 });
      }

      setCsvFile(null);
      if(fileInputRef.current) fileInputRef.current.value = ""; 
      setIsImporting(false);
      setAuthOperationInProgress(false); // Reset flag here
    };
    reader.onerror = () => {
        toast({ title: "Error Reading File", description: "An error occurred while trying to read the file.", variant: "destructive" });
        setIsImporting(false);
        setAuthOperationInProgress(false); 
    }
    reader.readAsText(csvFile);
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }

  if (authLoading || (isLoading && !isImporting && !members.length)) { 
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') { 
    return null; 
  }
  
  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">User Management</h1>
      </div>
      
      {pendingMembers.length > 0 && (
         <Card className="shadow-lg border-yellow-500/50">
            <CardHeader>
                <CardTitle className="flex items-center text-lg sm:text-xl text-yellow-600">
                    <UserCheck className="mr-2 h-5 w-5" /> Pending Approvals ({pendingMembers.length})
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">These users have signed up and are waiting for your approval to log in.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {pendingMembers.map((member) => (
                        <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={member.photoUrl} alt={member.name} data-ai-hint="profile avatar" />
                                    <AvatarFallback className="bg-yellow-500/20 text-yellow-600 font-semibold">
                                        {getInitials(member.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                                <Button onClick={() => handleReject(member.id, member.email)} variant="destructive" size="sm" className="flex-1 sm:flex-none" disabled={isSubmitting}>
                                    <UserX className="mr-1.5 h-4 w-4" /> Reject
                                </Button>
                                <Button onClick={() => handleApprove(member.id)} variant="default" size="sm" className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                                    <UserCheck className="mr-1.5 h-4 w-4" /> Approve
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
         </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center text-lg sm:text-xl">
                <UploadCloud className="mr-2 h-5 w-5 text-primary" /> Import Users from CSV
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Upload a CSV file to batch import user accounts. Imported users are automatically approved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <Input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange} 
                    ref={fileInputRef}
                    className="flex-grow file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-muted file:text-muted-foreground hover:file:bg-primary/10"
                    disabled={isImporting || isSubmitting}
                />
                <Button onClick={handleImportMembers} disabled={!csvFile || isImporting || isSubmitting} className="w-full sm:w-auto">
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    {isImporting ? "Importing..." : "Import Users"}
                </Button>
            </div>
            <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>CSV Format Instructions</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed">
                    CSV Headers: <strong>Type, Name, Email, NIC, DateOfBirth, Gender, MobileNumber, Designation</strong>.
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li><strong>Type</strong>: "admin" or "member".</li>
                        <li><strong>Designation</strong>: e.g., "Club President", "Member".</li>
                        <li><strong>NIC</strong>: Used as initial password (min 6 chars).</li>
                    </ul>
                    Emails already in use will be skipped.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <CardTitle className="flex items-center text-lg sm:text-xl">
                        <UsersIcon className="mr-2 h-5 w-5 text-primary" /> Approved User Accounts
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">View, edit, or add user details. Deletion removes app profile data.</CardDescription>
                </div>
                <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenAddForm} className="w-full sm:w-auto" disabled={isImporting || isSubmitting}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Approved User</DialogTitle>
                        </DialogHeader>
                        <MemberAddForm
                            onSubmit={handleAddFormSubmit}
                            onCancel={() => setIsAddFormOpen(false)}
                            isLoading={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
            </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search approved users by name, email, or designation..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isImporting || isSubmitting || isLoading}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : filteredMembers.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Avatar</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((memberItem) => (
                      <TableRow key={memberItem.id}>
                        <TableCell>
                          <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                            <AvatarImage src={memberItem.photoUrl} alt={memberItem.name} data-ai-hint="profile avatar" />
                            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                {getInitials(memberItem.name)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{memberItem.name}</TableCell>
                        <TableCell>{memberItem.email}</TableCell>
                        <TableCell className="capitalize">{memberItem.designation || 'N/A'}</TableCell>
                        <TableCell>
                            <Badge variant={memberItem.role === 'admin' ? 'default' : 'secondary'} className={memberItem.role === 'admin' ? 'bg-primary/80' : ''}>
                                {memberItem.role}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1 sm:space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleOpenEditForm(memberItem)} aria-label="Edit Member" disabled={isImporting || isSubmitting} className="h-8 w-8 sm:h-9 sm:w-9">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteMember(memberItem.id)} aria-label="Delete Member" disabled={isImporting || isSubmitting || memberItem.id === user?.id} className="h-8 w-8 sm:h-9 sm:w-9">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {filteredMembers.map((memberItem) => (
                    <Card key={memberItem.id} className="shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={memberItem.photoUrl} alt={memberItem.name} data-ai-hint="profile avatar" />
                                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                        {getInitials(memberItem.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-grow min-w-0">
                                    <p className="font-semibold text-primary truncate">{memberItem.name}</p>
                                    <p className="text-xs text-muted-foreground truncate flex items-center">
                                        <Mail className="h-3 w-3 mr-1"/> {memberItem.email}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-xs capitalize">
                                          <Briefcase className="mr-1 h-3 w-3" /> {memberItem.designation || 'Not Set'}
                                        </Badge>
                                        <Badge variant={memberItem.role === 'admin' ? 'default' : 'secondary'} className={`text-xs ${memberItem.role === 'admin' ? 'bg-primary/80' : ''}`}>
                                            {memberItem.role}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end space-x-2 pt-2 pb-3 px-3 border-t">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditForm(memberItem)} disabled={isImporting || isSubmitting}>
                                <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteMember(memberItem.id)} disabled={isImporting || isSubmitting || memberItem.id === user?.id}>
                                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm ? "No approved users match your search." : "No approved users found."}
            </p>
          )}
        </CardContent>
      </Card>

      {selectedMemberForEdit && (
        <Dialog open={isEditFormOpen} onOpenChange={(open) => {
            if (!open) setSelectedMemberForEdit(null);
            setIsEditFormOpen(open);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User: {selectedMemberForEdit.name}</DialogTitle>
            </DialogHeader>
            <MemberEditForm
                member={selectedMemberForEdit}
                onSubmit={handleEditFormSubmit}
                onCancel={() => {
                    setIsEditFormOpen(false);
                    setSelectedMemberForEdit(null);
                }}
                isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
