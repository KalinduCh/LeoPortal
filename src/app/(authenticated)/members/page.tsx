
// src/app/(authenticated)/members/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { User } from '@/types';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
<<<<<<< HEAD
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
=======
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { addTransaction } from '@/services/financeService';

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
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db, auth as firebaseAuth } from '@/lib/firebase/clientApp'; 
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
<<<<<<< HEAD
import { createUserProfile, updateUserProfile, approveUser as approveUserService, rejectUser as rejectUserService, deleteUserProfile, resetAllMemberFees } from '@/services/userService';
import { Users as UsersIcon, Search, Edit, Trash2, Loader2, UploadCloud, FileText, PlusCircle, Mail, Briefcase, UserCheck, UserX, CreditCard, CalendarClock, RotateCcw } from "lucide-react";
=======
import { createUserProfile, updateUserProfile, approveUser as approveUserService, rejectUser as rejectUserService, deleteUserProfile } from '@/services/userService';
import { Users as UsersIcon, Search, Edit, Trash2, Loader2, UploadCloud, FileText, PlusCircle, Mail, Briefcase, UserCheck, UserX, CreditCard, HandCoins } from "lucide-react";
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { MemberEditFormValues } from '@/components/members/member-edit-form';
import type { MemberAddFormValues } from '@/components/members/member-add-form';

const MemberEditForm = dynamic(() => import('@/components/members/member-edit-form').then(mod => mod.MemberEditForm), {
    ssr: false,
    loading: () => <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
});

const MemberAddForm = dynamic(() => import('@/components/members/member-add-form').then(mod => mod.MemberAddForm), {
    ssr: false,
    loading: () => <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
});


type FeeStatus = 'paid' | 'pending' | 'partial';

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
  
  const [memberToUpdateFee, setMemberToUpdateFee] = useState<User | null>(null);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeStatus, setFeeStatus] = useState<FeeStatus>('pending');
  const [feeAmount, setFeeAmount] = useState<number | string>('');
  
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);
  const [isSingleDeleteAlertOpen, setIsSingleDeleteAlertOpen] = useState(false);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
<<<<<<< HEAD
  const [isAnnualResetAlertOpen, setIsAnnualResetAlertOpen] = useState(false);
=======
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
  
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
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
<<<<<<< HEAD
        if(data.status !== 'rejected') { 
=======
        if(data.status !== 'rejected') { // Exclude rejected users from the list
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
            let role = data.role;
            if (data.email === 'check22@gmail.com') {
                role = 'super_admin';
            }
            fetchedMembers.push({
                id: docSnap.id, 
                name: data.name,
                email: data.email,
                photoUrl: data.photoUrl,
                role: role,
                status: data.status || 'approved',
                designation: data.designation,
                nic: data.nic,
                dateOfBirth: data.dateOfBirth,
                gender: data.gender,
                mobileNumber: data.mobileNumber,
                membershipFeeStatus: data.membershipFeeStatus || 'pending',
                membershipFeeAmountPaid: data.membershipFeeAmountPaid || 0,
            } as User);
        }
      });
      setMembers(fetchedMembers.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch (error) {
        console.error("Error fetching members: ", error);
        toast({ title: "Error", description: "Could not load members.", variant: "destructive"});
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) { 
      fetchMembers();
    }
  }, [user, fetchMembers]);

  const { approvedMembers, pendingMembers } = useMemo(() => {
    const approved = members.filter(m => m.status === 'approved');
    const pending = members.filter(m => m.status === 'pending');
    return { approvedMembers: approved, pendingMembers: pending };
  }, [members]);

  const filteredMembers = useMemo(() => approvedMembers.filter(memberItem => 
    (memberItem.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (memberItem.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (memberItem.designation?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  ), [approvedMembers, searchTerm]);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredMembers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredMembers, currentPage]);

  const totalPages = useMemo(() => Math.ceil(filteredMembers.length / rowsPerPage), [filteredMembers.length]);
  
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
<<<<<<< HEAD
        await createUserProfile(newAuthUser.uid, data.email, name, data.role, 'approved', undefined, undefined, undefined, undefined, undefined, data.designation);
=======
        await createUserProfile(newAuthUser.uid, data.email, data.name, data.role, 'approved', undefined, undefined, undefined, undefined, undefined, data.designation);
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
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
      if (error.code === 'auth/email-already-in-use') errorMessage = "This email address is already in use.";
      else if (error.code === 'auth/weak-password') errorMessage = "The password is too weak. It must be at least 6 characters.";
      else errorMessage = error.message || errorMessage;
      toast({ title: "Error Adding User", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
<<<<<<< HEAD
=======
      if (originalAuthUserUID && (!firebaseAuth.currentUser || firebaseAuth.currentUser.uid !== originalAuthUserUID)) {}
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
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
    if (confirm(`Are you sure you want to reject the application for ${memberEmail || 'this user'}? This will send a rejection email and remove their application.`)) {
        setIsSubmitting(true);
        try {
            await rejectUserService(memberId);
            toast({ title: "User Rejected", description: "The user's application has been rejected and will be removed."});
<<<<<<< HEAD
            fetchMembers(); 
=======
            fetchMembers(); // Re-fetches list, rejected user will be gone.
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
        } catch (error: any) {
            toast({ title: "Rejection Failed", description: `Could not reject user: ${error.message}`, variant: "destructive" });
        }
        setIsSubmitting(false);
    }
  };

  const handleSingleDelete = (member: User) => {
    if (member.id === user?.id) {
        toast({ title: "Action Denied", description: "You cannot delete your own profile from this interface.", variant: "destructive"});
        return;
    }
    setMemberToDelete(member);
    setIsSingleDeleteAlertOpen(true);
  }

  const confirmSingleDelete = async () => {
    if (!memberToDelete) return;
    setIsSubmitting(true); 
    try {
        await deleteUserProfile(memberToDelete.id);
        toast({title: "User Profile Removed", description: "The user's profile has been removed."});
        fetchMembers();
    } catch (error: any) {
        toast({title: "Error Deleting Profile", description: `Could not remove user profile. Error: ${error.message || 'Unknown Firestore error.'}`, variant: "destructive", duration: 7000});
    }
    setIsSubmitting(false);
    setIsSingleDeleteAlertOpen(false);
    setMemberToDelete(null);
  }
  
  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows(prev => 
        checked ? [...prev, id] : prev.filter(rowId => rowId !== id)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedRows(paginatedMembers.map(m => m.id));
    } else {
        const paginatedIds = paginatedMembers.map(m => m.id);
        setSelectedRows(prev => prev.filter(id => !paginatedIds.includes(id)));
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;
    
    const rowsToDelete = selectedRows.filter(id => id !== user?.id);
<<<<<<< HEAD
=======
    if (rowsToDelete.length < selectedRows.length) {
        toast({ title: "Action Denied", description: "Skipped deleting your own profile.", variant: "destructive"});
    }

>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
    for (const memberId of rowsToDelete) {
        try {
            await deleteUserProfile(memberId);
            successCount++;
        } catch (error) {
<<<<<<< HEAD
=======
            console.error(`Failed to delete user profile for ID ${memberId}:`, error);
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
            errorCount++;
        }
    }
    
    toast({
        title: "Bulk Deletion Complete",
        description: `${successCount} user(s) removed. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
    });
    
    fetchMembers();
    setSelectedRows([]);
    setIsSubmitting(false);
    setIsBulkDeleteAlertOpen(false);
  };
  
<<<<<<< HEAD
  const handleAnnualReset = async () => {
    setIsSubmitting(true);
    try {
        const count = await resetAllMemberFees();
        toast({ 
            title: "Annual Reset Complete", 
            description: `Successfully reset fee status for ${count} members for the new Leostic Year.` 
        });
        fetchMembers();
    } catch (error: any) {
        toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
    }
    setIsSubmitting(false);
    setIsAnnualResetAlertOpen(false);
  };

=======
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    setSelectedRows([]);
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

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      if (!csvText) {
        toast({ title: "Error Reading File", description: "Could not read the CSV file.", variant: "destructive" });
        setIsImporting(false); setAuthOperationInProgress(false);
        return;
      }
      const { header, data } = parseCSV(csvText);
      const requiredHeaders = ["Type", "Name", "Email", "NIC", "DateOfBirth", "Gender", "MobileNumber", "Designation"];
      if (!requiredHeaders.every(h => header.includes(h))) {
<<<<<<< HEAD
        toast({ title: "Invalid CSV Format", description: `CSV must contain headers: ${requiredHeaders.join(", ")}`, variant: "destructive" });
=======
        toast({ title: "Invalid CSV Format", description: `CSV must contain headers: ${requiredHeaders.join(", ")}. Found: ${header.join(", ")}`, variant: "destructive", duration: 10000 });
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
        setIsImporting(false); setAuthOperationInProgress(false);
        return;
      }

<<<<<<< HEAD
      let successCount = 0;
      for (const row of data) {
        const { Email: email, NIC: password, Name: name, Type: type, NIC: nic, DateOfBirth: dateOfBirth, Gender: gender, MobileNumber: mobileNumber, Designation: designation } = row;
        const role = type?.toLowerCase() === 'admin' ? 'admin' : 'member';
        try {
          const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          await createUserProfile(userCredential.user.uid, email, name, role, 'approved', undefined, nic, dateOfBirth, gender, mobileNumber, designation);
          successCount++;
        } catch (error) {}
      } 
      
      fetchMembers(); 
      toast({ title: "Import Complete", description: `${successCount} users imported.` });
=======
      let successCount = 0, skippedCount = 0, errorCount = 0;
      const importMessages: string[] = []; 

      for (const row of data) {
        const { Email: email, NIC: password, Name: name, Type: type, NIC: nic, DateOfBirth: dateOfBirth, Gender: gender, MobileNumber: mobileNumber, Designation: designation } = row;
        const role = type?.toLowerCase() === 'admin' ? 'admin' : 'member';
        if (!email || !password || !name || !type || !nic || !designation) {
          skippedCount++; importMessages.push(`Skipped (Missing Data): Row for ${email || 'Unknown Email'}.`);
          continue;
        }
        if (password.length < 6) {
          skippedCount++; importMessages.push(`Skipped (Weak Password for ${email}): NIC (password) must be at least 6 characters.`);
          continue;
        }
        
        try {
          const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          const newAuthUser = userCredential.user;
          await createUserProfile(newAuthUser.uid, email, name, role, 'approved', undefined, nic, dateOfBirth, gender, mobileNumber, designation);
          if (firebaseAuth.currentUser && firebaseAuth.currentUser.uid === newAuthUser.uid) {
            await signOut(firebaseAuth); importMessages.push(`Successfully imported and signed out ${email}.`);
          } else {
            importMessages.push(`Successfully imported ${email}.`);
          }
          successCount++;
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            skippedCount++; importMessages.push(`Skipped (Email Exists): ${email}`);
          } else if (error.code === 'auth/weak-password') {
            skippedCount++; importMessages.push(`Skipped (Weak Password for ${email}): NIC (password) must be at least 6 characters.`);
          } else {
            errorCount++; importMessages.push(`Error importing ${email}: ${error.message || String(error)}`);
            if (firebaseAuth.currentUser && firebaseAuth.currentUser.email === email) {
              try { await signOut(firebaseAuth); importMessages.push(`Defensive sign-out attempted for ${email}.`); } 
              catch (signOutError) { importMessages.push(`Error during defensive sign-out for ${email}.`); }
            }
          }
        }
      } 
      
      fetchMembers(); 
      await new Promise(resolve => setTimeout(resolve, 1000)); 

      let toastTitle = "Import Process Complete";
      let toastDescription = `${successCount} users imported.`;
      if (skippedCount > 0) toastDescription += ` ${skippedCount} skipped.`;
      if (errorCount > 0) toastDescription += ` ${errorCount} failed. Check console for details.`;
      
      const showSessionNotice = originalAuthUserUID && (!firebaseAuth.currentUser || firebaseAuth.currentUser.uid !== originalAuthUserUID);
      if (showSessionNotice) {
        toast({ title: "Session Notice (Import Related)", description: "Your admin session may have been affected. Please log out and log back in if issues arise.", variant: "destructive", duration: 15000 });
        setTimeout(() => { toast({ title: toastTitle, description: toastDescription, variant: errorCount > 0 ? "destructive" : "default", duration: 10000 }); }, 500); 
      } else {
        toast({ title: toastTitle, description: toastDescription, variant: errorCount > 0 ? "destructive" : "default", duration: 10000 });
      }

>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
      setCsvFile(null);
      setIsImporting(false);
      setAuthOperationInProgress(false);
    };
<<<<<<< HEAD
=======
    reader.onerror = () => {
        toast({ title: "Error Reading File", description: "An error occurred while trying to read the file.", variant: "destructive" });
        setIsImporting(false); setAuthOperationInProgress(false); 
    }
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
    reader.readAsText(csvFile);
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }

  const getFeeStatusVariant = (status?: FeeStatus) => {
    switch (status) {
        case 'paid': return 'bg-green-100 text-green-800 border-green-200';
        case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'pending':
        default:
            return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const handleOpenFeeModal = (member: User) => {
    setMemberToUpdateFee(member);
    setFeeStatus(member.membershipFeeStatus || 'pending');
    setFeeAmount(member.membershipFeeAmountPaid || '');
    setIsFeeModalOpen(true);
  };
  
  const handleUpdateFeeStatus = async () => {
    if (!memberToUpdateFee) return;
<<<<<<< HEAD
    const amountToRecord = Number(feeAmount);
=======
    
    const amountToRecord = Number(feeAmount);
    if ( (feeStatus === 'paid' || feeStatus === 'partial') && (isNaN(amountToRecord) || amountToRecord <= 0) ) {
        toast({ title: "Invalid Amount", description: "Please enter a valid positive number for the amount paid.", variant: "destructive"});
        return;
    }

>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
    setIsSubmitting(true);
    try {
        await updateUserProfile(memberToUpdateFee.id, {
            membershipFeeStatus: feeStatus,
            membershipFeeAmountPaid: feeStatus !== 'pending' ? amountToRecord : 0,
        });
        
<<<<<<< HEAD
        if ((feeStatus === 'paid' || feeStatus === 'partial') && amountToRecord > 0) {
=======
        if ((feeStatus === 'paid' || feeStatus === 'partial')) {
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
            await addTransaction({
                type: 'income',
                date: new Date().toISOString(),
                amount: amountToRecord,
                category: 'Membership Fees',
                source: `Fee from ${memberToUpdateFee.name}`,
<<<<<<< HEAD
                notes: `Annual membership payment.`,
            });
        }
        toast({ title: "Success", description: `Updated status for ${memberToUpdateFee.name}.` });
        fetchMembers();
        setIsFeeModalOpen(false);
    } catch(error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive"});
=======
                notes: `Membership fee status updated to ${feeStatus}.`,
            });
            toast({ title: "Fee Status & Income Updated", description: `Payment for ${memberToUpdateFee.name} has been recorded.` });
        } else {
            toast({ title: "Fee Status Updated", description: `Payment status for ${memberToUpdateFee.name} has been updated.`});
        }
        
        fetchMembers();
        setIsFeeModalOpen(false);
        setMemberToUpdateFee(null);
        setFeeAmount('');
    } catch(error: any) {
        toast({ title: "Error", description: `Could not update fee status: ${error.message}`, variant: "destructive"});
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
    }
    setIsSubmitting(false);
  };

<<<<<<< HEAD
  const getLeosticYearRange = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() >= 5 ? currentYear : currentYear - 1;
    return {
        start: `June 1, ${startYear}`,
        end: `June 1, ${startYear + 1}`
    };
  };

  const leosticRange = getLeosticYearRange();
  const isSuperAdmin = user?.role === 'super_admin';

=======
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
  if (authLoading || (isLoading && !isImporting && !members.length)) { 
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) { return null; }
  
  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
<<<<<<< HEAD
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline">Member Management</h1>
          <div className="flex items-center gap-2 mt-1 text-primary font-bold">
            <CalendarClock className="h-4 w-4" />
            <p className="text-sm">Leostic Period: {leosticRange.start} — {leosticRange.end}</p>
          </div>
        </div>
        {isSuperAdmin && (
           <Button variant="outline" className="border-primary text-primary hover:bg-primary/5 font-bold h-11" onClick={() => setIsAnnualResetAlertOpen(true)}>
             <RotateCcw className="mr-2 h-4 w-4" /> Start New Leostic Year
           </Button>
        )}
=======
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Member Management</h1>
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
      </div>
      
      {pendingMembers.length > 0 && (
         <Card className="shadow-lg border-yellow-500/50">
<<<<<<< HEAD
            <CardHeader><CardTitle className="flex items-center text-lg sm:text-xl text-yellow-600"><UserCheck className="mr-2 h-5 w-5" /> Pending Approvals ({pendingMembers.length})</CardTitle><CardDescription className="text-xs sm:text-sm">New registrations waiting for review.</CardDescription></CardHeader>
=======
            <CardHeader><CardTitle className="flex items-center text-lg sm:text-xl text-yellow-600"><UserCheck className="mr-2 h-5 w-5" /> Pending Approvals ({pendingMembers.length})</CardTitle><CardDescription className="text-xs sm:text-sm">These users have signed up and are waiting for your approval to log in.</CardDescription></CardHeader>
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
            <CardContent>
                <div className="space-y-3">
                    {pendingMembers.map((member) => (
                        <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md border bg-muted/30">
<<<<<<< HEAD
                            <div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback>{getInitials(member.name)}</AvatarFallback></Avatar><div><p className="font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.email}</p></div></div>
=======
                            <div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarImage src={member.photoUrl} alt={member.name} data-ai-hint="profile avatar" /><AvatarFallback className="bg-yellow-500/20 text-yellow-600 font-semibold">{getInitials(member.name)}</AvatarFallback></Avatar><div><p className="font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.email}</p></div></div>
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
                            <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                                <Button onClick={() => handleReject(member.id, member.email)} variant="destructive" size="sm" className="flex-1 sm:flex-none" disabled={isSubmitting}><UserX className="mr-1.5 h-4 w-4" /> Reject</Button>
                                <Button onClick={() => handleApprove(member.id)} variant="default" size="sm" className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" disabled={isSubmitting}><UserCheck className="mr-1.5 h-4 w-4" /> Approve</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
         </Card>
      )}

      <Card className="shadow-lg">
<<<<<<< HEAD
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <CardTitle className="flex items-center text-lg sm:text-xl"><UsersIcon className="mr-2 h-5 w-5 text-primary" /> Club Members</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Manage payment status for the current year cycle.</CardDescription>
                </div>
                <Button onClick={handleOpenAddForm} className="w-full sm:w-auto h-11 font-bold" disabled={isImporting || isSubmitting}><PlusCircle className="mr-2 h-4 w-4" /> Add Member</Button>
            </div>
          <div className="mt-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search by name, email, or designation..." className="pl-10 h-11" value={searchTerm} onChange={handleSearchChange} disabled={isImporting || isSubmitting || isLoading} /></div>
        </CardHeader>
        <CardContent>
=======
        <CardHeader><CardTitle className="flex items-center text-lg sm:text-xl"><UploadCloud className="mr-2 h-5 w-5 text-primary" /> Import Users from CSV</CardTitle><CardDescription className="text-xs sm:text-sm">Upload a CSV file to batch import user accounts. Imported users are automatically approved.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4"><Input type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} className="flex-grow file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-muted file:text-muted-foreground hover:file:bg-primary/10" disabled={isImporting || isSubmitting} /><Button onClick={handleImportMembers} disabled={!csvFile || isImporting || isSubmitting} className="w-full sm:w-auto">{isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}{isImporting ? "Importing..." : "Import Users"}</Button></div>
            <Alert><FileText className="h-4 w-4" /><AlertTitle>CSV Format Instructions</AlertTitle><AlertDescription className="text-xs leading-relaxed">CSV Headers: <strong>Type, Name, Email, NIC, DateOfBirth, Gender, MobileNumber, Designation</strong>.<ul className="list-disc list-inside mt-1 space-y-0.5"><li><strong>Type</strong>: "admin" or "member".</li><li><strong>Designation</strong>: e.g., "Club President", "Member".</li><li><strong>NIC</strong>: Used as initial password (min 6 chars).</li></ul>Emails already in use will be skipped.</AlertDescription></Alert>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <CardTitle className="flex items-center text-lg sm:text-xl"><UsersIcon className="mr-2 h-5 w-5 text-primary" /> Approved User Accounts</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">View, edit, or add user details. Sorted alphabetically by name.</CardDescription>
                </div>
                <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                    <DialogTrigger asChild><Button onClick={handleOpenAddForm} className="w-full sm:w-auto" disabled={isImporting || isSubmitting}><PlusCircle className="mr-2 h-4 w-4" /> Add New User</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Add New Approved User</DialogTitle></DialogHeader><MemberAddForm onSubmit={handleAddFormSubmit} onCancel={() => setIsAddFormOpen(false)} isLoading={isSubmitting} /></DialogContent>
                </Dialog>
            </div>
          <div className="mt-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input placeholder="Search approved users by name, email, or designation..." className="pl-10" value={searchTerm} onChange={handleSearchChange} disabled={isImporting || isSubmitting || isLoading} /></div>
        </CardHeader>
        <CardContent>
          {selectedRows.length > 0 && (
            <div className="flex items-center justify-between mb-4 p-3 border rounded-md bg-muted/50">
              <div className="text-sm font-medium">{selectedRows.length} user(s) selected.</div>
              <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" />Delete Selected</Button>
            </div>
          )}
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
          {isLoading ? (<div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : paginatedMembers.length > 0 ? (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
<<<<<<< HEAD
                      <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => handleSelectAll(checked as boolean)} checked={paginatedMembers.length > 0 && selectedRows.length === paginatedMembers.length} /></TableHead>
                      <TableHead>Member</TableHead><TableHead>Designation</TableHead><TableHead>Role</TableHead><TableHead>Fee Status</TableHead><TableHead className="text-right">Actions</TableHead>
=======
                      <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => handleSelectAll(checked as boolean)} checked={paginatedMembers.length > 0 && selectedRows.length === paginatedMembers.length} aria-label="Select all current page" /></TableHead>
                      <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Designation</TableHead><TableHead>Role</TableHead><TableHead>Fee Status</TableHead><TableHead className="text-right">Actions</TableHead>
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMembers.map((memberItem) => (
<<<<<<< HEAD
                      <TableRow key={memberItem.id}>
                        <TableCell><Checkbox onCheckedChange={(checked) => handleSelectRow(memberItem.id, checked as boolean)} checked={selectedRows.includes(memberItem.id)} /></TableCell>
                        <TableCell className="font-medium flex items-center gap-3">
                           <Avatar className="h-9 w-9"><AvatarImage src={memberItem.photoUrl} alt={memberItem.name} /><AvatarFallback>{getInitials(memberItem.name)}</AvatarFallback></Avatar>
                           <div><p className="text-sm font-bold">{memberItem.name}</p><p className="text-[10px] text-muted-foreground">{memberItem.email}</p></div>
                        </TableCell>
                        <TableCell className="capitalize text-xs">{memberItem.designation || 'N/A'}</TableCell>
                        <TableCell><Badge variant={memberItem.role === 'admin' || memberItem.role === 'super_admin' ? 'default' : 'secondary'} className="text-[10px] uppercase font-black">{memberItem.role.replace('_', ' ')}</Badge></TableCell>
                        <TableCell>
                            <Badge variant="outline" className={cn("capitalize text-[10px] font-black", getFeeStatusVariant(memberItem.membershipFeeStatus))}>
                                {memberItem.membershipFeeStatus || 'pending'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="outline" size="icon" onClick={() => handleOpenFeeModal(memberItem)} className="h-8 w-8 border-primary/20 text-primary"><CreditCard className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => handleOpenEditForm(memberItem)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="icon" onClick={() => handleSingleDelete(memberItem)} disabled={memberItem.id === user?.id} className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
=======
                      <TableRow key={memberItem.id} data-state={selectedRows.includes(memberItem.id) && "selected"}>
                        <TableCell><Checkbox onCheckedChange={(checked) => handleSelectRow(memberItem.id, checked as boolean)} checked={selectedRows.includes(memberItem.id)} aria-label="Select row" /></TableCell>
                        <TableCell className="font-medium flex items-center gap-3">
                           <Avatar className="h-9 w-9 sm:h-10 sm:w-10"><AvatarImage src={memberItem.photoUrl} alt={memberItem.name} data-ai-hint="profile avatar" /><AvatarFallback className="bg-primary/20 text-primary font-semibold">{getInitials(memberItem.name)}</AvatarFallback></Avatar>
                           {memberItem.name}
                        </TableCell>
                        <TableCell>{memberItem.email}</TableCell><TableCell className="capitalize">{memberItem.designation || 'N/A'}</TableCell>
                        <TableCell><Badge variant={memberItem.role === 'admin' || memberItem.role === 'super_admin' ? 'default' : 'secondary'} className={memberItem.role === 'admin' || memberItem.role === 'super_admin' ? 'bg-primary/80' : ''}>{memberItem.role.replace('_', ' ')}</Badge></TableCell>
                        <TableCell>
                            <Badge variant="outline" className={cn("capitalize", getFeeStatusVariant(memberItem.membershipFeeStatus))}>
                                {memberItem.membershipFeeStatus || 'pending'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1 sm:space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleOpenFeeModal(memberItem)} aria-label="Update Fee Status" disabled={isImporting || isSubmitting} className="h-8 w-8 sm:h-9 sm:w-9"><CreditCard className="h-4 w-4" /></Button>
                          <Button variant="outline" size="icon" onClick={() => handleOpenEditForm(memberItem)} aria-label="Edit Member" disabled={isImporting || isSubmitting} className="h-8 w-8 sm:h-9 sm:w-9"><Edit className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="icon" onClick={() => handleSingleDelete(memberItem)} aria-label="Delete Member" disabled={isImporting || isSubmitting || memberItem.id === user?.id} className="h-8 w-8 sm:h-9 sm:w-9"><Trash2 className="h-4 w-4" /></Button>
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="block md:hidden space-y-3">
                {paginatedMembers.map((memberItem) => (
<<<<<<< HEAD
                    <Card key={memberItem.id} className="shadow-sm">
                      <CardContent className="p-4 flex items-start space-x-3">
                        <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(memberItem.name)}</AvatarFallback></Avatar>
                        <div className="flex-grow min-w-0">
                            <p className="font-bold text-primary truncate">{memberItem.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate uppercase font-bold">{memberItem.designation || 'Member'}</p>
                            <div className="mt-2 flex items-center gap-2">
                                <Badge variant="outline" className={cn("capitalize text-[9px] font-black", getFeeStatusVariant(memberItem.membershipFeeStatus))}>{memberItem.membershipFeeStatus || 'pending'}</Badge>
                                <Badge variant="secondary" className="text-[9px] uppercase font-black">{memberItem.role.replace('_', ' ')}</Badge>
                            </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-1 pt-2 pb-3 px-3 border-t bg-muted/5">
                          <Button variant="outline" size="sm" onClick={() => handleOpenFeeModal(memberItem)} className="h-8 text-[10px] border-primary text-primary font-bold"><CreditCard className="mr-1 h-3.5 w-3.5" /> Fees</Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditForm(memberItem)} className="h-8 text-[10px] font-bold"><Edit className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
=======
                    <Card key={memberItem.id} className="shadow-sm data-[state=selected]:bg-muted/50" data-state={selectedRows.includes(memberItem.id) && "selected"}>
                      <CardContent className="p-4 flex items-start space-x-4">
                        <Checkbox onCheckedChange={(checked) => handleSelectRow(memberItem.id, checked as boolean)} checked={selectedRows.includes(memberItem.id)} aria-label="Select row" className="mt-2"/>
                        <div className="flex items-start space-x-3 flex-grow">
                            <Avatar className="h-10 w-10"><AvatarImage src={memberItem.photoUrl} alt={memberItem.name} data-ai-hint="profile avatar" /><AvatarFallback className="bg-primary/20 text-primary font-semibold">{getInitials(memberItem.name)}</AvatarFallback></Avatar>
                            <div className="flex-grow min-w-0">
                                <p className="font-semibold text-primary truncate">{memberItem.name}</p>
                                <p className="text-xs text-muted-foreground truncate flex items-center"><Mail className="h-3 w-3 mr-1"/> {memberItem.email}</p>
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs capitalize"><Briefcase className="mr-1 h-3 w-3" /> {memberItem.designation || 'Not Set'}</Badge>
                                    <Badge variant={memberItem.role === 'admin' || memberItem.role === 'super_admin' ? 'default' : 'secondary'} className={`text-xs ${memberItem.role === 'admin' || memberItem.role === 'super_admin' ? 'bg-primary/80' : ''}`}>{memberItem.role.replace('_', ' ')}</Badge>
                                    <Badge variant="outline" className={cn("capitalize text-xs", getFeeStatusVariant(memberItem.membershipFeeStatus))}>{memberItem.membershipFeeStatus || 'pending'}</Badge>
                                </div>
                            </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-2 pt-2 pb-3 px-3 border-t">
                          <Button variant="outline" size="sm" onClick={() => handleOpenFeeModal(memberItem)} disabled={isImporting || isSubmitting}><CreditCard className="mr-1 h-3.5 w-3.5" /> Update Fee</Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditForm(memberItem)} disabled={isImporting || isSubmitting}><Edit className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleSingleDelete(memberItem)} disabled={isImporting || isSubmitting || memberItem.id === user?.id}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
                      </CardFooter>
                    </Card>
                ))}
              </div>
<<<<<<< HEAD
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-muted-foreground">Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredMembers.length)} of {filteredMembers.length}</p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1 || isSubmitting}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || isSubmitting}>Next</Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12 italic">No members found.</p>
=======
              <div className="flex items-center justify-end space-x-2 pt-4">
                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1 || isSubmitting}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || isSubmitting}>Next</Button>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">{searchTerm ? "No approved users match your search." : "No approved users found."}</p>
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
          )}
        </CardContent>
      </Card>
      
<<<<<<< HEAD
      {/* Annual Reset Dialog */}
      <AlertDialog open={isAnnualResetAlertOpen} onOpenChange={setIsAnnualResetAlertOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-rose-600 mb-2">
                <RotateCcw className="h-6 w-6" />
                <AlertDialogTitle className="text-xl font-headline uppercase">Annual Cycle Reset</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-slate-600 font-medium">
                You are about to start a new Leostic Year cycle. This will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Reset all members to <span className="font-black text-rose-600">Pending</span> fee status.</li>
                  <li>Clear all "Amount Paid" values to 0.</li>
                  <li>Archive current data for the period <span className="font-bold">{leosticRange.start}</span>.</li>
                </ul>
                <p className="mt-4 font-black">This action is irreversible. Proceed?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-11 px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAnnualReset} className="bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl h-11 px-8 shadow-lg">
                Confirm & Start New Year
=======
      <AlertDialog open={isSingleDeleteAlertOpen} onOpenChange={setIsSingleDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently remove the user profile for <strong>{memberToDelete?.name}</strong> from the database.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmSingleDelete} className="bg-destructive hover:bg-destructive/90">Yes, delete profile</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Users?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the profiles for the <strong>{selectedRows.length} selected users</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive hover:bg-destructive/90">
              Yes, delete selected
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
<<<<<<< HEAD

      <AlertDialog open={isSingleDeleteAlertOpen} onOpenChange={setIsSingleDeleteAlertOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Member Profile?</AlertDialogTitle><AlertDialogDescription>This will permanently remove <strong>{memberToDelete?.name}</strong> from the system.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmSingleDelete} className="bg-destructive">Delete Profile</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={isFeeModalOpen} onOpenChange={setIsFeeModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
                <DialogTitle>Update Fee Status</DialogTitle>
                <DialogDescription>Cycle: {leosticRange.start} — {leosticRange.end}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Member: {memberToUpdateFee?.name}</Label>
                    <Select onValueChange={(value: FeeStatus) => setFeeStatus(value)} defaultValue={feeStatus}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="partial">Partial Payment</SelectItem>
                            <SelectItem value="paid">Fully Paid</SelectItem>
=======
      
      <Dialog open={isFeeModalOpen} onOpenChange={setIsFeeModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Update Fee Status for {memberToUpdateFee?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="fee-status">Status</Label>
                    <Select onValueChange={(value: FeeStatus) => setFeeStatus(value)} defaultValue={feeStatus}>
                        <SelectTrigger id="fee-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
                        </SelectContent>
                    </Select>
                </div>
                {(feeStatus === 'partial' || feeStatus === 'paid') && (
<<<<<<< HEAD
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label>Amount Paid (LKR)</Label>
                        <Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} placeholder="0.00" className="h-12 rounded-xl" />
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsFeeModalOpen(false)} className="rounded-xl h-11 px-6">Cancel</Button>
                    <Button onClick={handleUpdateFeeStatus} disabled={isSubmitting} className="rounded-xl h-11 px-8 font-bold">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Update Status'}
=======
                    <div className="space-y-2">
                        <Label htmlFor="fee-amount">Amount Paid (LKR)</Label>
                        <Input 
                            id="fee-amount" 
                            type="number" 
                            value={feeAmount} 
                            onChange={(e) => setFeeAmount(e.target.value)} 
                            placeholder="e.g., 500" 
                        />
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsFeeModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateFeeStatus} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Status'}
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {selectedMemberForEdit && (
        <Dialog open={isEditFormOpen} onOpenChange={(open) => {if (!open) setSelectedMemberForEdit(null); setIsEditFormOpen(open);}}>
<<<<<<< HEAD
          <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Edit Member Profile</DialogTitle></DialogHeader><MemberEditForm member={selectedMemberForEdit} onSubmit={handleEditFormSubmit} onCancel={() => {setIsEditFormOpen(false); setSelectedMemberForEdit(null);}} isLoading={isSubmitting} /></DialogContent>
=======
          <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Edit User: {selectedMemberForEdit.name}</DialogTitle></DialogHeader><MemberEditForm member={selectedMemberForEdit} onSubmit={handleEditFormSubmit} onCancel={() => {setIsEditFormOpen(false); setSelectedMemberForEdit(null);}} isLoading={isSubmitting} /></DialogContent>
>>>>>>> afdd58ef4c8924862d7464aa0f98299bd7ae03e7
        </Dialog>
      )}
      
      <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Register New Member</DialogTitle></DialogHeader><MemberAddForm onSubmit={handleAddFormSubmit} onCancel={() => setIsAddFormOpen(false)} isLoading={isSubmitting} /></DialogContent>
      </Dialog>
    </div>
  );
}
