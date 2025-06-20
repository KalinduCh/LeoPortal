
// src/app/(authenticated)/admin/communication/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import { Mail, Users, Send, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { sendBulkEmailAction, type SendBulkEmailState } from '@/app/actions/communicationActions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const emailFormSchema = z.object({
  subject: z.string().min(3, { message: "Subject must be at least 3 characters." }),
  body: z.string().min(10, { message: "Email body must be at least 10 characters." }),
  recipientUserIds: z.array(z.string()).min(1, { message: "Please select at least one recipient." }),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

const initialState: SendBulkEmailState = { success: false, message: "" };

export default function CommunicationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionState, setActionState] = useState<SendBulkEmailState>(initialState);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      subject: "",
      body: "",
      recipientUserIds: [],
    },
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const fetchMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "member"));
      const querySnapshot = await getDocs(q);
      const fetchedMembers: User[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedMembers.push({ id: docSnap.id, ...docSnap.data() } as User);
      });
      setMembers(fetchedMembers);
    } catch (error) {
      console.error("Error fetching members: ", error);
      toast({ title: "Error", description: "Could not load members for selection.", variant: "destructive" });
    }
    setIsLoadingMembers(false);
  }, [toast]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchMembers();
    }
  }, [user, fetchMembers]);

  const onSubmit = async (data: EmailFormValues) => {
    setFormSubmitting(true);
    setActionState(initialState);

    const recipientEmails = data.recipientUserIds.map(userId => {
      const member = members.find(m => m.id === userId);
      return member?.email;
    }).filter(email => !!email) as string[];

    if (recipientEmails.length === 0) {
      toast({ title: "Error", description: "No valid recipient emails found for selected users.", variant: "destructive" });
      setFormSubmitting(false);
      return;
    }
    
    const formData = new FormData();
    formData.append('subject', data.subject);
    formData.append('body', data.body);
    recipientEmails.forEach(email => formData.append('recipientEmails', email));

    const result = await sendBulkEmailAction(actionState, formData);
    setActionState(result);

    if (result.success) {
      toast({ title: "Email Processed (Simulation)", description: result.message });
      form.reset();
    } else {
      toast({ title: "Processing Failed", description: result.message || "Could not process the email request.", variant: "destructive" });
    }
    setFormSubmitting(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      form.setValue("recipientUserIds", members.map(m => m.id));
    } else {
      form.setValue("recipientUserIds", []);
    }
  };
  
  const watchedRecipients = form.watch("recipientUserIds");

  if (authLoading || (isLoadingMembers && members.length === 0)) {
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
        <h1 className="text-3xl font-bold font-headline">Send Communication</h1>
      </div>

      <Alert variant="default">
        <Mail className="h-4 w-4" />
        <AlertTitle>Developer Note: Email Sending Simulation</AlertTitle>
        <AlertDescription>
          This form currently <strong className="text-primary">simulates</strong> sending emails. The details (recipients, subject, body) will be logged to the server console.
          Actual email delivery requires upgrading your Firebase project to a paid plan (e.g., Blaze) to use Firebase Functions with an external email service (like SendGrid, Mailgun, etc.).
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> Select Recipients</CardTitle>
              <CardDescription>Choose which members will receive this email.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMembers ? (
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              ) : members.length > 0 ? (
                <>
                  <div className="flex items-center space-x-2 mb-4 p-2 border rounded-md bg-muted/50">
                    <Checkbox
                      id="select-all-members"
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      checked={watchedRecipients.length === members.length && members.length > 0}
                      disabled={members.length === 0}
                    />
                    <Label htmlFor="select-all-members" className="font-medium text-sm">
                      Select All Members ({watchedRecipients.length} / {members.length} selected)
                    </Label>
                  </div>
                  <ScrollArea className="h-60 border rounded-md p-4">
                    <FormField
                      control={form.control}
                      name="recipientUserIds"
                      render={() => (
                        <div className="space-y-2">
                          {members.map((member) => (
                            <FormField
                              key={member.id}
                              control={form.control}
                              name="recipientUserIds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={member.id}
                                    className="flex flex-row items-center space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(member.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), member.id])
                                            : field.onChange(
                                                (field.value || []).filter(
                                                  (value) => value !== member.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal text-sm">
                                      {member.name} ({member.email})
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                      )}
                    />
                  </ScrollArea>
                  <FormMessage>{form.formState.errors.recipientUserIds?.message}</FormMessage>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-4">No members found.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Mail className="mr-2 h-5 w-5 text-primary" /> Compose Email</CardTitle>
              <CardDescription>Write the subject and body of your email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Important Update: Upcoming Event" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Dear members, ..."
                        className="resize-y min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={formSubmitting || isLoadingMembers} size="lg">
              {formSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {formSubmitting ? "Processing..." : "Process Email (Simulated)"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
