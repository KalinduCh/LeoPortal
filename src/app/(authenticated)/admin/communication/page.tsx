
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
import { Mail, Users, Send, Loader2, AlertTriangle, Info, Sparkles } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import emailjs from 'emailjs-com';
import { generateCommunication, type GenerateCommunicationInput } from '@/ai/flows/generate-communication-flow';

const emailFormSchema = z.object({
  subject: z.string().min(3, { message: "Subject must be at least 3 characters." }),
  body: z.string().min(10, { message: "Email body must be at least 10 characters." }),
  recipientUserIds: z.array(z.string()).min(1, { message: "Please select at least one recipient." }),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const USER_ID = process.env.NEXT_PUBLIC_EMAILJS_USER_ID;

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
    if (!SERVICE_ID || !TEMPLATE_ID || !USER_ID) {
      toast({
        title: "EmailJS Configuration Missing",
        description: "EmailJS credentials are not set up in environment variables. Emails cannot be sent. Please check your .env.local file and ensure it's loaded correctly by restarting your dev server.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    setFormSubmitting(true);
    let emailsSent = 0;
    let emailsFailed = 0;

    const recipientDetails = data.recipientUserIds.map(userId => {
      const member = members.find(m => m.id === userId);
      return { email: member?.email, name: member?.name };
    }).filter(detail => detail.email);

    if (recipientDetails.length === 0) {
      toast({ title: "Error", description: "No valid recipient emails found for selected users.", variant: "destructive" });
      setFormSubmitting(false);
      return;
    }

    const currentYear = new Date().getFullYear().toString();

    for (const recipient of recipientDetails) {
      if (!recipient.email) continue;

      const templateParams = {
        to_email: recipient.email,
        to_name: recipient.name || 'Member',
        subject: data.subject,
        body_content: data.body,
        current_year: currentYear, // Pass current year to template
      };

      try {
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, USER_ID);
        emailsSent++;
      } catch (error: any) {
        console.error("Failed to send email to " + recipient.email + ":", error);
        const errorText = error?.text || error?.message || (typeof error === 'object' ? JSON.stringify(error) : 'Unknown error');
        toast({ title: "EmailJS Send Error", description: "Failed for " + recipient.email + ": " + errorText, variant: "destructive", duration: 10000});
        emailsFailed++;
      }
    }

    if (emailsSent > 0 && emailsFailed === 0) {
      toast({ title: "Emails Sent", description: emailsSent + " email(s) sent successfully." });
      form.reset();
      setAiTopic("");
    } else if (emailsSent > 0 && emailsFailed > 0) {
      toast({ title: "Emails Partially Sent", description: emailsSent + " email(s) sent, " + emailsFailed + " failed. Check console for details.", variant: "destructive" });
       form.reset(); 
       setAiTopic("");
    } else if (emailsFailed > 0 && emailsSent === 0) {
      toast({ title: "Email Sending Failed", description: "All " + emailsFailed + " email(s) failed to send. Check console, EmailJS setup, and .env.local.", variant: "destructive" });
    } else { 
       toast({ title: "No Emails Processed", description: "No emails were attempted. This might be due to no valid recipients selected.", variant: "destructive" });
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
  
  const isEmailJsConfigured = SERVICE_ID && TEMPLATE_ID && USER_ID;

  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Send Communication</h1>
      </div>

      <Alert variant={isEmailJsConfigured ? "default" : "destructive"}>
        <Mail className="h-4 w-4" />
        <AlertTitle>{isEmailJsConfigured ? "Email Sending via EmailJS" : "EmailJS Not Configured"}</AlertTitle>
        <AlertDescription>
          {isEmailJsConfigured ? (
            <>
              This form uses <strong className="text-primary">EmailJS</strong> to send emails.
              Your EmailJS template should use variables like <code>to_email</code>, <code>to_name</code>, <code>subject</code>, <code>body_content</code>, and <code>current_year</code>.
            </>
          ) : (
            <>
              <strong className="text-destructive-foreground">EmailJS is not configured correctly.</strong> Emails cannot be sent.
              Please set <code>NEXT_PUBLIC_EMAILJS_SERVICE_ID</code>, <code>NEXT_PUBLIC_EMAILJS_TEMPLATE_ID</code>, and <code>NEXT_PUBLIC_EMAILJS_USER_ID</code> in your <code>.env.local</code> file and restart your development server.
            </>
          )}
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><Users className="mr-2 h-5 w-5 text-primary" /> Select Recipients</CardTitle>
              <CardDescription className="text-sm">Choose which members will receive this email.</CardDescription>
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
                <p className="text-center text-muted-foreground py-4">No members found.</p>
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
            <Button type="submit" className="w-full sm:w-auto" disabled={formSubmitting || isLoadingMembers || !isEmailJsConfigured} size="lg">
              {formSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {formSubmitting ? "Sending..." : `Send Email to ${watchedRecipients.length} Member(s)`}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
