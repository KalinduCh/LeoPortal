"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusCircle, ExternalLink, Settings, 
  Loader2, Trash2, Eye, LayoutGrid, CheckCircle, Clock, XCircle, 
  Lightbulb, Search, MoreHorizontal, User, ClipboardCopy, FileText, ImageIcon, X, UploadCloud, Share2, Globe, Shield
} from 'lucide-react';
import { getForms, deleteForm, updateForm, createForm } from '@/services/formService';
import { getProjectIdeasForAdmin, updateProjectIdea } from '@/services/projectIdeaService';
import type { FormRecord, FormStatus, FormVisibility, ProjectIdea } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const MAX_BANNER_SIZE = 1 * 1024 * 1024; // 1MB

export default function SubmissionsAdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [forms, setForms] = useState<FormRecord[]>([]);
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    embedUrl: '',
    sheetApiUrl: '',
    bannerUrl: '',
    status: 'active' as FormStatus,
    visibility: 'public' as FormVisibility,
  });

  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [formsData, ideasData] = await Promise.all([
        getForms(),
        getProjectIdeasForAdmin()
      ]);
      setForms(formsData);
      setIdeas(ideasData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!authLoading && user?.role === 'member') {
      router.replace('/dashboard');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  const handleOpenDialog = (form?: FormRecord) => {
    if (form) {
      setEditingFormId(form.id);
      setFormData({
        title: form.title,
        description: form.description || '',
        embedUrl: form.embedUrl,
        sheetApiUrl: form.sheetApiUrl || '',
        bannerUrl: form.bannerUrl || '',
        status: form.status,
        visibility: form.visibility || 'public',
      });
    } else {
      setEditingFormId(null);
      setFormData({ title: '', description: '', embedUrl: '', sheetApiUrl: '', bannerUrl: '', status: 'active', visibility: 'public' });
    }
    setIsDialogOpen(true);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BANNER_SIZE) {
        toast({ title: "File Too Large", description: "Banner image must be less than 1MB.", variant: "destructive" });
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        setFormData(prev => ({ ...prev, bannerUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/submissions/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link Copied", description: "The public form link is in your clipboard." });
    });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProcessing(true);

    try {
      if (editingFormId) {
        await updateForm(editingFormId, formData);
        toast({ title: "Form Updated" });
      } else {
        await createForm({
          ...formData,
          type: 'google_form',
          createdBy: user.id,
        });
        toast({ title: "Form Added", description: "Google Form integration is ready." });
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to save form.", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm("Remove this form integration?")) return;
    try {
      await deleteForm(id);
      toast({ title: "Removed" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleReviewIdea = (idea: ProjectIdea) => {
      sessionStorage.setItem('selectedProjectIdea', JSON.stringify(idea));
      router.push(`/project-ideas/view?id=${idea.id}&mode=review`);
  };

  if (isLoading || authLoading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary uppercase">Submissions & Review</h1>
          <p className="text-muted-foreground">Manage external Google Forms and member proposals.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="h-12 rounded-xl shadow-lg font-bold">
          <PlusCircle className="mr-2 h-5 w-5" /> Add Form
        </Button>
      </div>

      <Tabs defaultValue="forms" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-12 bg-muted p-1 mb-8">
          <TabsTrigger value="forms" className="font-bold"><LayoutGrid className="mr-2 h-4 w-4" /> Form Modules</TabsTrigger>
          <TabsTrigger value="ideas" className="font-bold"><Lightbulb className="mr-2 h-4 w-4" /> Idea Review</TabsTrigger>
        </TabsList>

        <TabsContent value="forms">
          <Card className="shadow-lg border-none ring-1 ring-slate-200">
            <CardHeader>
              <CardTitle>Google Form Integrations</CardTitle>
              <CardDescription>Manage embedded forms and their response sources.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Details</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map(form => (
                    <TableRow key={form.id}>
                      <TableCell>
                        <p className="font-bold text-slate-900">{form.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{form.description}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize flex items-center w-fit gap-1 text-[10px]">
                           {form.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                           {form.visibility || 'public'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("uppercase text-[10px]", form.status === 'active' ? 'bg-emerald-600' : 'bg-slate-500')}>
                          {form.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/submissions/${form.id}`, '_blank')}>
                          <Eye className="h-4 w-4 mr-1.5" /> View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/submissions/responses/${form.id}`)}>
                          <LayoutGrid className="h-4 w-4 mr-1.5" /> Data
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCopyLink(form.id)}><Share2 className="mr-2 h-4 w-4" /> Copy Share Link</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenDialog(form)}><Settings className="mr-2 h-4 w-4" /> Edit Config</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteForm(form.id)} className="text-rose-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {forms.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground">No integrated forms found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas">
          <Card className="shadow-lg border-none ring-1 ring-slate-200">
            <CardHeader><CardTitle>Project Idea Review</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Project Name</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ideas.map((idea) => (
                            <TableRow key={idea.id}>
                                <TableCell className="font-bold">{idea.projectName}</TableCell>
                                <TableCell>{idea.authorName}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">{idea.status.replace(/_/g, ' ')}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleReviewIdea(idea)}>Review</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingFormId ? 'Edit Form Module' : 'Add New Form'}</DialogTitle>
            <DialogDescription>Configure your Google Form integration.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveForm} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Form Title</Label>
              <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Recruitment 2026" className="h-11 rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Visibility</Label>
                    <Select value={formData.visibility} onValueChange={v => setFormData({ ...formData, visibility: v as FormVisibility })}>
                        <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Visibility" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="public">🌍 Public</SelectItem>
                            <SelectItem value="members">🛡️ Members Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as FormStatus })}>
                        <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Cover Banner (Max 1MB)</Label>
                <div className="flex gap-2">
                    <div className="relative h-12 w-20 bg-slate-100 rounded-lg overflow-hidden border">
                        {formData.bannerUrl ? (
                            <Image src={formData.bannerUrl} alt="Preview" fill className="object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full"><ImageIcon className="h-5 w-5 text-slate-300" /></div>
                        )}
                    </div>
                    <Button type="button" variant="outline" className="h-12 rounded-xl flex-grow" onClick={() => bannerInputRef.current?.click()}>
                        <UploadCloud className="h-4 w-4 mr-2" /> Upload Banner
                    </Button>
                    {formData.bannerUrl && (
                        <Button type="button" variant="ghost" size="icon" className="h-12 w-12 text-rose-500" onClick={() => setFormData(p => ({...p, bannerUrl: ''}))}><X className="h-5 w-5" /></Button>
                    )}
                    <input type="file" hidden ref={bannerInputRef} accept="image/*" onChange={handleBannerUpload} />
                </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Short overview..." className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Google Form Link or Embed Code</Label>
              <Input required value={formData.embedUrl} onChange={e => setFormData({ ...formData, embedUrl: e.target.value })} placeholder="Paste URL or <iframe> code..." className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Apps Script API URL (for responses)</Label>
              <Input value={formData.sheetApiUrl} onChange={e => setFormData({ ...formData, sheetApiUrl: e.target.value })} placeholder="https://script.google.com/..." className="h-11 rounded-xl" />
              <p className="text-[10px] text-slate-400 italic">This allows the portal to fetch and show submission data in the dashboard.</p>
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11 rounded-xl flex-1">Cancel</Button>
              <Button type="submit" disabled={isProcessing} className="h-11 rounded-xl flex-1 font-bold">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (editingFormId ? 'Update' : 'Save Form')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

