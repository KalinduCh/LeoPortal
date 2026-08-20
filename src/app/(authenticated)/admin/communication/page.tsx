
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, CommunicationGroup } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Mail, Users, Send, Loader2, Sparkles, Search, Info, Edit, PlusCircle, Settings, Trash2, Paperclip, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { generateCommunication, type GenerateCommunicationInput } from '@/ai/flows/generate-communication-flow';
import { getGroups, createGroup, updateGroup, deleteGroup } from '@/services/groupService';
import { getAllUsers } from '@/services/userService';
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE_MB = 2;
const MAX_TOTAL_SIZE_MB = 7;

const fileSchema = z.custom<File>(f => f instanceof File, "Expected a file.")
    .refine(file => file.size <= MAX_FILE_SIZE_MB * 1024 * 1024, `Each file must be ${MAX_FILE_SIZE_MB}MB or less.`);

const emailFormSchema = z.object({
  subject: z.string().min(3, { message: "Subject must be at least 3 characters." }),
  body: z.string().min(10, { message: "Email body must be at least 10 characters." }),
  recipientUserIds: z.array(z.string()).min(1, { message: "Please select at least one recipient." }),
  attachments: z.array(fileSchema).optional()
    .refine(files => {
        if (!files) return true;
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        return totalSize <= MAX_TOTAL_SIZE_MB * 1024 * 1024;
    }, `Total attachments size must not exceed ${MAX_TOTAL_SIZE_MB}MB.`),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;
type GroupFormState = { id?: string; name: string; memberIds: string[]; color?: string; };

const SIGNATURE_TEMPLATES = {
    'none': { label: "No Signature", value: "\n\nBest Regards," },
    'president': { label: "President's Signature", value: "\n\nBest Regards,\nLeo Lion Menuka Wickramasinghe\nClub President\nLeo Club of Athugalpura" },
    'secretary': { label: "Secretary's Signature", value: "\n\nBest Regards,\nLeo Club Secretary\nLeo Club of Athugalpura" },
    'general': { label: "General Club Signature", value: "\n\nBest Regards,\nLeo Club of Athugalpura\nLEO District 306 D9" }
};

export default function CommunicationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [groups, setGroups] = useState<CommunicationGroup[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<GroupFormState | null>(null);
  const [groupMemberSearchTerm, setGroupMemberSearchTerm] = useState('');
  const [groupToDelete, setGroupToDelete] = useState<CommunicationGroup | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { subject: "", body: "", recipientUserIds: [], attachments: [] },
  });
  
  const watchedAttachments = form.watch('attachments') || [];
  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isSuperOrAdmin) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, isSuperOrAdmin]);

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
        const [fetchedGroups, fetchedUsers] = await Promise.all([getGroups(), getAllUsers()]);
        setGroups(fetchedGroups);
        const approvedMembers = fetchedUsers.filter(u => u.status === 'approved').sort((a,b) => (a.name || "").localeCompare(b.name || ""));
        setMembers(approvedMembers);
    } catch (error) {
        toast({ title: "Error", description: "Could not load data.", variant: "destructive"});
    }
    setIsLoadingData(false);
  }, [toast]);
  
  useEffect(() => { if (user && isSuperOrAdmin) fetchData(); }, [user, fetchData, isSuperOrAdmin]);

  const filteredMembers = useMemo(() => {
    return members.filter(member => 
        (member.name?.toLowerCase() || '').includes(recipientSearchTerm.toLowerCase()) ||
        (member.email?.toLowerCase() || '').includes(recipientSearchTerm.toLowerCase())
    );
  }, [members, recipientSearchTerm]);
  
  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    return (names.length === 1 ? names[0].substring(0, 2) : names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const handleGenerateContent = async () => {
    if (!aiTopic.trim()) {
        toast({ title: "Topic Required", variant: "destructive"});
        return;
    }
    setIsGenerating(true);
    try {
        const result = await generateCommunication({ topic: aiTopic });
        form.setValue("subject", result.subject, { shouldValidate: true });
        form.setValue("body", result.body, { shouldValidate: true });
    } catch (error) {
        toast({ title: "AI Failed", variant: "destructive"});
    }
    setIsGenerating(false);
  }

  const handleSignatureChange = (signatureKey: keyof typeof SIGNATURE_TEMPLATES) => {
    const currentBody = form.getValues("body");
    const bodyWithoutSignature = Object.values(SIGNATURE_TEMPLATES).reduce((body, sig) => body.replace(sig.value, ''), currentBody);
    form.setValue("body", bodyWithoutSignature.trim() + SIGNATURE_TEMPLATES[signatureKey].value, { shouldValidate: true });
  };
  
  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
  });

  const onSubmit = async (data: EmailFormValues) => {
    setFormSubmitting(true);
    const recipients = data.recipientUserIds.map(userId => members.find(m => m.id === userId)).filter(Boolean) as User[];
    const recipientEmails = recipients.map(r => r.email).filter(Boolean);
    if(recipientEmails.length === 0) {
        toast({ title: "No recipients", variant: "destructive"});
        setFormSubmitting(false);
        return;
    }
    let attachmentsForApi = [];
    if (data.attachments) {
        attachmentsForApi = await Promise.all(data.attachments.map(async (file) => ({
            filename: file.name,
            content: (await fileToBase64(file)).split(',')[1],
            contentType: file.type
        })));
    }
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipientEmails.join(','), subject: data.subject, body: data.body, attachments: attachmentsForApi }),
      });
      if (!response.ok) throw new Error("Failed to send");
      toast({ title: "Emails Sent", description: `Sent to ${recipients.length} member(s).` });
      form.reset();
      setAiTopic("");
    } catch (error: any) {
      toast({ title: "Send Error", description: error.message, variant: "destructive" });
    }
    setFormSubmitting(false);
  };

  const handleSelectAll = (checked: boolean) => {
    const currentSelection = new Set(form.getValues("recipientUserIds"));
    filteredMembers.forEach(m => checked ? currentSelection.add(m.id) : currentSelection.delete(m.id));
    form.setValue("recipientUserIds", Array.from(currentSelection));
  };
  
  const handleSelectGroup = (memberIds: string[]) => {
    const currentSelection = new Set(form.getValues("recipientUserIds"));
    memberIds.forEach(id => currentSelection.add(id));
    form.setValue("recipientUserIds", Array.from(currentSelection), { shouldValidate: true });
    toast({ title: "Group Selected" });
  };

  const handleOpenGroupForm = (group?: CommunicationGroup) => {
    setSelectedGroupForEdit(group ? { id: group.id, name: group.name, memberIds: group.memberIds, color: group.color || '#cccccc' } : { name: '', memberIds: [], color: '#cccccc' });
    setIsGroupFormOpen(true);
  };
  
  const handleGroupFormSubmit = async () => {
    if (!selectedGroupForEdit?.name.trim()) return;
    setIsGroupSubmitting(true);
    try {
        if (selectedGroupForEdit.id) await updateGroup(selectedGroupForEdit.id, selectedGroupForEdit);
        else await createGroup(selectedGroupForEdit.name, selectedGroupForEdit.memberIds, selectedGroupForEdit.color);
        fetchData();
        setIsGroupFormOpen(false);
    } catch (error: any) {
        toast({ title: "Error", variant: "destructive"});
    }
    setIsGroupSubmitting(false);
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsGroupSubmitting(true);
    try {
        await deleteGroup(groupToDelete.id);
        fetchData();
    } catch (error: any) {
         toast({ title: "Error", variant: "destructive"});
    }
    setIsGroupSubmitting(false);
    setIsDeleteAlertOpen(false);
  };
  
  if (authLoading || isLoadingData || !user || !isSuperOrAdmin) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold font-headline">Member Communication</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><Users className="mr-2 h-5 w-5 text-primary" /> Select Recipients</CardTitle>
              <CardDescription>Choose who will receive this official email.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {groups.map(group => (
                  <Button key={group.id} type="button" size="sm" variant="secondary" onClick={() => handleSelectGroup(group.memberIds)} style={{ backgroundColor: group.color + '33', color: group.color, border: `1px solid ${group.color}` }} className="font-bold">
                    {group.name} ({group.memberIds.length})
                  </Button>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => handleOpenGroupForm()}> <Settings className="mr-2 h-4 w-4"/>Manage Groups</Button>
              </div>
              <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Filter members..." value={recipientSearchTerm} onChange={(e) => setRecipientSearchTerm(e.target.value)} className="pl-10"/></div>
              <div className="flex items-center space-x-2 mb-4 p-3 border rounded-xl bg-muted/30">
                <Checkbox id="select-all" onCheckedChange={(c) => handleSelectAll(c as boolean)} checked={filteredMembers.length > 0 && filteredMembers.every(m => form.watch('recipientUserIds').includes(m.id))} />
                <Label htmlFor="select-all" className="font-bold cursor-pointer">Select All Visible ({filteredMembers.length})</Label>
              </div>
              <ScrollArea className="h-60 border rounded-xl p-4 bg-white">
                {filteredMembers.map(member => (
                  <FormField key={member.id} control={form.control} name="recipientUserIds" render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0 p-2 rounded-lg hover:bg-slate-50">
                      <FormControl><Checkbox checked={field.value?.includes(member.id)} onCheckedChange={(c) => c ? field.onChange([...field.value, member.id]) : field.onChange(field.value.filter(v => v !== member.id))} /></FormControl>
                      <FormLabel className="flex-1 cursor-pointer font-medium">{member.name} <span className="text-[10px] text-muted-foreground ml-2">({member.email})</span></FormLabel>
                    </FormItem>
                  )} />
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-primary/10">
            <CardHeader className="bg-primary/5"><CardTitle className="flex items-center text-xl text-primary"><Sparkles className="mr-2 h-5 w-5" /> AI Draft Assistant</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Label className="font-bold">Topic</Label>
              <div className="flex gap-2"><Input placeholder="e.g. beach cleanup reminder" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} /><Button type="button" onClick={handleGenerateContent} disabled={isGenerating}>{isGenerating ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>}Draft</Button></div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader><CardTitle className="flex items-center text-xl"><Mail className="mr-2 h-5 w-5 text-primary" /> Compose Email</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="body" render={({ field }) => (
                <FormItem><FormLabel>Body</FormLabel><FormControl><Textarea className="min-h-[200px] rounded-xl" {...field}/></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="space-y-2">
                <Label>Append Signature</Label>
                <Select onValueChange={(v) => handleSignatureChange(v as any)}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select signature" /></SelectTrigger>
                    <SelectContent>{Object.entries(SIGNATURE_TEMPLATES).map(([k, t]) => <SelectItem key={k} value={k}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <FormField control={form.control} name="attachments" render={({ field }) => (
                <FormItem>
                  <FormLabel>Attachments</FormLabel>
                  <div className="space-y-2">
                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => field.onChange([...(field.value || []), ...Array.from(e.target.files || [])])} />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl"><Paperclip className="mr-2 h-4 w-4"/>Choose Files</Button>
                    <div className="flex flex-wrap gap-2">{watchedAttachments.map((f, i) => <Badge key={i} variant="secondary" className="pr-1">{f.name}<X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => field.onChange(watchedAttachments.filter((_, idx) => idx !== i))}/></Badge>)}</div>
                  </div>
                </FormItem>
              )}/>
            </CardContent>
          </Card>
          <div className="flex justify-end"><Button type="submit" size="lg" className="h-14 px-10 text-lg font-black rounded-2xl shadow-xl" disabled={formSubmitting || form.watch('recipientUserIds').length === 0}>{formSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />} Dispatch</Button></div>
        </form>
      </Form>

      <Dialog open={isGroupFormOpen} onOpenChange={setIsGroupFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Mailing Groups</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <ScrollArea className="h-64 border rounded-lg p-2">
              {groups.map(g => (
                <div key={g.id} className="flex items-center justify-between p-2 mb-2 bg-slate-50 rounded-lg">
                  <span className="font-bold text-sm" style={{ color: g.color }}>{g.name}</span>
                  <div className="flex"><Button size="icon" variant="ghost" onClick={() => handleOpenGroupForm(g)}><Edit className="h-4 w-4"/></Button><Button size="icon" variant="ghost" className="text-rose-500" onClick={() => { setGroupToDelete(g); setIsDeleteAlertOpen(true); }}><Trash2 className="h-4 w-4"/></Button></div>
                </div>
              ))}
            </ScrollArea>
            <div className="space-y-3">
              <Input placeholder="Group Name" value={selectedGroupForEdit?.name} onChange={e => setSelectedGroupForEdit(p => p ? {...p, name: e.target.value} : null)} />
              <Input type="color" value={selectedGroupForEdit?.color} onChange={e => setSelectedGroupForEdit(p => p ? {...p, color: e.target.value} : null)} className="h-10 p-1" />
              <ScrollArea className="h-40 border rounded-lg p-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-1">
                    <Checkbox checked={selectedGroupForEdit?.memberIds.includes(m.id)} onCheckedChange={c => setSelectedGroupForEdit(p => p ? {...p, memberIds: c ? [...p.memberIds, m.id] : p.memberIds.filter(id => id !== m.id)} : null)} />
                    <span className="text-xs">{m.name}</span>
                  </div>
                ))}
              </ScrollArea>
              <Button className="w-full" onClick={handleGroupFormSubmit} disabled={isGroupSubmitting}>Save Group</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Group?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteGroup} className="bg-rose-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
