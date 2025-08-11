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
import { Mail, Users, Send, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { generateCommunication, type GenerateCommunicationInput } from '@/ai/flows/generate-communication-flow';

const emailFormSchema = z.object({
  subject: z.string().min(3, { message: "Subject must be at least 3 characters." }),
  body: z.string().min(10, { message: "Email body must be at least 10 characters." }),
  recipientUserIds: z.array(z.string()).min(1, { message: "Please select at least one recipient." }),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

export default function CommunicationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  
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
      const q = query(usersRef, where("role", "==", "member"), where("status", "==", "approved"));
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

  const handleGenerateContent = async () => {
    if (!aiTopic.trim()) {
        toast({ title: "Topic Required", description: "Please enter a topic for the AI to write about.", variant: "destructive"});
        return;
    }
    setIsGenerating(true);
    try {
        const input: GenerateCommunicationInput = { topic: aiTopic };
        const result = await generateCommunication(input);
        form.setValue("subject", result.subject, { shouldValidate: true });
        form.setValue("body", result.body, { shouldValidate: true });
        toast({ title: "Content Generated", description: "The email subject and body have been populated." });
    } catch (error) {
        console.error("Error generating AI content:", error);
        toast({ title: "AI Generation Failed", description: "Could not generate content. Please try again.", variant: "destructive"});
    }
    setIsGenerating(false);
  }

  const onSubmit = async (data: EmailFormValues) => {
    setFormSubmitting(true);
    
    const recipients = data.recipientUserIds.map(userId => members.find(m => m.id === userId)).filter(Boolean) as User[];
    
    // Send one API call with all recipient emails
    const recipientEmails = recipients.map(r => r.email).join(', ');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmails,
          subject: data.subject,
          body: data.body,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `API request failed with status ${response.status}`);
      }

      toast({
        title: "Emails Sent",
        description: `Successfully sent email to ${recipients.length} member(s).`
      });
      form.reset();
      form.setValue("recipientUserIds", []);
      setAiTopic("");

    } catch (error: any) {
      console.error("Failed to send email batch:", error);
      toast({
        title: "Email Send Error",
        description: `Failed to send emails: ${error.message}`,
        variant: "destructive",
        duration: 10000
      });
    } finally {
      setFormSubmitting(false);
    }
  };


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      form.setValue("recipientUserIds", members.map(m => m.id));
    } else {
      form.setValue("recipientUserIds", []);
    }
  };
  
  const watchedRecipients = form.watch("recipientUserIds");

  if (authLoading || (isLoadingMembers && members.length === 0 && !user)) {
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
    <div className="container mx-auto py-4 sm:py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Send Communication</h1>
      </div>

      <Alert>
        <Mail className="h-4 w-4" />
        <AlertTitle>Email Sending via Backend</AlertTitle>
        <AlertDescription>
          This form uses a secure backend API route with Nodemailer to send emails. Ensure your Gmail credentials are set in the environment variables.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><Users className="mr-2 h-5 w-5 text-primary" /> Select Recipients</CardTitle>
              <CardDescription className="text-sm">Choose which approved members will receive this email.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMembers ? (
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              ) : members.length > 0 ? (
                <>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0 mb-4 p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all-members"
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        checked={watchedRecipients.length === members.length && members.length > 0}
                        disabled={members.length === 0}
                      />
                      <Label htmlFor="select-all-members" className="font-medium text-sm cursor-pointer">
                        Select All Members
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground sm:ml-auto">
                      ({watchedRecipients.length} / {members.length} selected)
                    </span>
                  </div>
                  <ScrollArea className="h-60 border rounded-md p-2 sm:p-4">
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
                                    className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded hover:bg-muted/30"
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
                                    <FormLabel className="font-normal text-sm cursor-pointer flex-1">
                                      {member.name} <span className="text-xs text-muted-foreground">({member.email})</span>
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
                  <FormMessage className="mt-2">{form.formState.errors.recipientUserIds?.message}</FormMessage>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-4">No approved members found.</p>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Content Assistant</CardTitle>
              <CardDescription className="text-sm">Provide a topic and let the AI generate a draft for your email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
               <div>
                  <Label htmlFor="ai-topic">Email Topic</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      id="ai-topic"
                      placeholder="e.g., Monthly meeting reminder for August"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      disabled={isGenerating || formSubmitting}
                    />
                    <Button type="button" onClick={handleGenerateContent} disabled={isGenerating || formSubmitting}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate
                    </Button>
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><Mail className="mr-2 h-5 w-5 text-primary" /> Compose Email</CardTitle>
              <CardDescription className="text-sm">Write or edit the subject and body of your email.</CardDescription>
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
                        className="resize-y min-h-[150px] sm:min-h-[200px]"
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
            <Button type="submit" className="w-full sm:w-auto" disabled={formSubmitting || isLoadingMembers} size="lg">
              {formSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {formSubmitting ? "Sending..." : `Send Email to ${watchedRecipients.length} Member(s)`}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
