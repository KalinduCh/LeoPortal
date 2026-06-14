"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, PlusCircle, ExternalLink, Settings, 
  Loader2, Trash2, Eye, LayoutGrid, CheckCircle, Clock, XCircle, 
  Lightbulb, Search, MoreHorizontal, User, Calendar, MessageSquare, ClipboardCopy, Wand2, ImageIcon, FileJson, MousePointer2, Sparkles
} from 'lucide-react';
import { getForms, deleteForm, updateForm, createForm } from '@/services/formService';
import { getProjectIdeasForAdmin, updateProjectIdea } from '@/services/projectIdeaService';
import type { FormRecord, FormStatus, ProjectIdea } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function SubmissionsAdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [forms, setForms] = useState<FormRecord[]>([]);
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isNewFormDialogOpen, setIsNewFormDialogOpen] = useState(false);
  const [isExternalFormDialogOpen, setIsExternalFormDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formSearchTerm, setFormSearchTerm] = useState('');
  const [ideaSearchTerm, setIdeaSearchTerm] = useState('');

  const [externalFormData, setExternalFormData] = useState({
    title: '',
    description: '',
    embedUrl: '',
    sheetApiUrl: '',
    status: 'active' as FormStatus,
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
      toast({ title: "Error", description: "Failed to load module data.", variant: "destructive" });
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

  const filteredForms = useMemo(() => {
    return forms.filter(f => 
      (f.title || '').toLowerCase().includes(formSearchTerm.toLowerCase()) ||
      (f.description || '').toLowerCase().includes(formSearchTerm.toLowerCase())
    );
  }, [forms, formSearchTerm]);

  const filteredIdeas = useMemo(() => {
    return ideas.filter(i => 
        (i.projectName || '').toLowerCase().includes(ideaSearchTerm.toLowerCase()) ||
        (i.authorName || '').toLowerCase().includes(ideaSearchTerm.toLowerCase())
    );
  }, [ideas, ideaSearchTerm]);

  const stats = useMemo(() => {
    return {
      totalForms: forms.length,
      pendingIdeas: ideas.filter(i => i.status === 'pending_review').length,
      activeModules: forms.filter(f => f.status === 'active').length,
    };
  }, [forms, ideas]);

  const handleOpenExternalFormDialog = (form?: FormRecord) => {
    if (form) {
      setEditingFormId(form.id);
      setExternalFormData({
        title: form.title || '',
        description: form.description || '',
        embedUrl: form.embedUrl || '',
        sheetApiUrl: form.sheetApiUrl || '',
        status: form.status || 'active',
      });
    } else {
      setEditingFormId(null);
      setExternalFormData({ title: '', description: '', embedUrl: '', sheetApiUrl: '', status: 'active' });
    }
    setIsExternalFormDialogOpen(true);
  };

  const handleCopyLink = (formId: string) => {
    const url = `${window.location.origin}/submissions/${formId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link Copied", description: "Public submission URL copied to clipboard." });
    }).catch(() => {
      toast({ title: "Copy Failed", description: "Could not copy link to clipboard.", variant: "destructive" });
    });
  };

  const handleSaveExternalForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProcessing(true);

    try {
      if (editingFormId) {
        await updateForm(editingFormId, externalFormData);
        toast({ title: "Form Updated" });
      } else {
        await createForm({
          ...externalFormData,
          type: 'google_form',
          createdBy: user.id,
          visibility: 'public',
        });
        toast({ title: "Form Connected", description: "Google Form is now linked to Leo Portal." });
      }
      setIsExternalFormDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save form.", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm("Remove this form connection? This will not delete the actual Google Form data.")) return;
    try {
      await deleteForm(id);
      toast({ title: "Connection Removed" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleReviewIdea = (idea: ProjectIdea) => {
      sessionStorage.setItem('selectedProjectIdea', JSON.stringify(idea));
      router.push(`/project-ideas/view?id=${idea.id}&mode=review`);
  };
    
  const handleUpdateIdeaStatus = async (ideaId: string, status: ProjectIdea['status']) => {
      try {
          await updateProjectIdea(ideaId, { status });
          toast({ title: "Status Updated", description: `Project status changed to "${status.replace(/_/g, ' ')}".`});
          fetchData(); 
      } catch (error) {
          console.error("Failed to update status:", error);
          toast({ title: "Error", description: "Could not update project status.", variant: "destructive" });
      }
  };

  const getIdeaStatusVariant = (status: ProjectIdea['status']) => {
    switch (status) {
        case 'pending_review': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
        case 'approved': return 'bg-green-600 hover:bg-green-700 text-white';
        case 'declined': return 'bg-red-600 hover:bg-red-700 text-white';
        case 'needs_revision': return 'bg-blue-500 hover:bg-blue-600 text-white';
        default: return 'secondary';
    }
  };

  if (isLoading || authLoading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary uppercase">Submissions & Review</h1>
          <p className="text-muted-foreground">Manage AI forms, connected Google Forms, and member proposals.</p>
        </div>
        <Button onClick={() => setIsNewFormDialogOpen(true)} className="rounded-xl h-12 px-6 shadow-lg">
          <PlusCircle className="mr-2 h-5 w-5" /> Create Form
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Active Modules" value={stats.activeModules} icon={CheckCircle} color="text-emerald-600" />
        <StatCard title="Awaiting Review" value={stats.pendingIdeas} icon={Clock} color="text-amber-600" />
        <StatCard title="Total Forms" value={stats.totalForms} icon={FileText} color="text-blue-600" />
      </div>

      <Tabs defaultValue="forms" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-12 bg-muted p-1 mb-8">
          <TabsTrigger value="forms" className="font-bold"><LayoutGrid className="mr-2 h-4 w-4" /> Form Modules</TabsTrigger>
          <TabsTrigger value="ideas" className="font-bold"><Lightbulb className="mr-2 h-4 w-4" /> Idea Review</TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-6">
          <Card className="shadow-lg border-none ring-1 ring-slate-200">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Connected Submission Modules</CardTitle>
                <CardDescription>Native AI forms and Google Form integrations.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search forms..." value={formSearchTerm || ''} onChange={e => setFormSearchTerm(e.target.value)} className="pl-9 h-10 rounded-xl" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form Details</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredForms.map(form => (
                      <TableRow key={form.id} className="hover:bg-muted/30">
                        <TableCell>
                          <p className="font-bold text-slate-900">{form.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{form.description}</p>
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className="capitalize text-[10px]">
                              {form.type === 'native' ? <Sparkles className="h-2.5 w-2.5 mr-1 text-primary" /> : <FileText className="h-2.5 w-2.5 mr-1" />}
                              {(form.type || 'google_form').replace('_', ' ')}
                           </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("uppercase text-[10px] font-black tracking-widest", form.status === 'active' ? 'bg-emerald-600' : form.status === 'closed' ? 'bg-rose-600' : 'bg-slate-500')}>
                            {form.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleCopyLink(form.id)} className="h-8 hover:text-primary">
                             <ClipboardCopy className="h-4 w-4 mr-1.5" /> Link
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => window.open(`/submissions/${form.id}`, '_blank')} className="h-8 hover:text-primary">
                            <Eye className="h-4 w-4 mr-1.5" /> View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/submissions/responses/${form.id}`)} className="h-8 hover:text-primary">
                            <LayoutGrid className="h-4 w-4 mr-1.5" /> Data
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Options</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => {
                                   if (form.type === 'native') router.push(`/admin/submissions/builder/${form.id}`);
                                   else handleOpenExternalFormDialog(form);
                                }}>
                                    <Settings className="mr-2 h-4 w-4" /> Edit Configuration
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteForm(form.id)} className="text-rose-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Connection
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredForms.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                          No modules found. Create one to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas" className="space-y-6">
          <Card className="shadow-lg border-none ring-1 ring-slate-200">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Project Idea Proposals</CardTitle>
                <CardDescription>Review and manage AI-assisted project ideas submitted by members.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search proposals..." value={ideaSearchTerm || ''} onChange={e => setIdeaSearchTerm(e.target.value)} className="pl-9 h-10 rounded-xl" />
              </div>
            </CardHeader>
            <CardContent>
               <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Project Name</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Submitted On</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredIdeas.map((idea) => (
                            <TableRow key={idea.id} className="hover:bg-muted/30">
                                <TableCell className="font-bold text-slate-900 max-w-xs truncate">{idea.projectName}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <User className="h-3 w-3 text-primary" />
                                        <span className="text-sm">{idea.authorName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{format(parseISO(idea.createdAt), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>
                                    <Badge className={cn("uppercase text-[10px] font-black tracking-widest", getIdeaStatusVariant(idea.status))}>
                                        {(idea.status || 'draft').replace(/_/g, ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => handleReviewIdea(idea)} className="h-8 rounded-lg">
                                        Review <ExternalLink className="ml-2 h-3 w-3" />
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleUpdateIdeaStatus(idea.id, 'approved')}>
                                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> Approve
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleUpdateIdeaStatus(idea.id, 'needs_revision')}>
                                                <Clock className="mr-2 h-4 w-4 text-blue-500" /> Needs Revision
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleUpdateIdeaStatus(idea.id, 'declined')}>
                                                <XCircle className="mr-2 h-4 w-4 text-rose-500" /> Decline
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredIdeas.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">No proposals found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* NEW FORM SELECTION DIALOG */}
      <Dialog open={isNewFormDialogOpen} onOpenChange={setIsNewFormDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-slate-900 p-8 text-white">
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Launch Submission Module</h2>
            <p className="text-slate-400 mt-1">Choose your preferred workflow to start collecting data.</p>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => router.push('/admin/submissions/builder/new')}
              className="flex flex-col items-start text-left p-6 rounded-2xl border-2 border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                <Wand2 className="h-6 w-6" />
              </div>
              <h3 className="font-black uppercase text-xs tracking-widest text-slate-900 mb-1">Generate with AI</h3>
              <p className="text-xs text-slate-500">Describe your form or paste questions to build it in seconds.</p>
            </button>

            <button 
              onClick={() => router.push('/admin/submissions/builder/new?mode=manual')}
              className="flex flex-col items-start text-left p-6 rounded-2xl border-2 border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-4 group-hover:scale-110 transition-transform">
                <MousePointer2 className="h-6 w-6" />
              </div>
              <h3 className="font-black uppercase text-xs tracking-widest text-slate-900 mb-1">Build Manually</h3>
              <p className="text-xs text-slate-500">Drag and drop fields to create your custom submission form.</p>
            </button>

            <button 
              onClick={() => { setIsNewFormDialogOpen(false); setIsExternalFormDialogOpen(true); }}
              className="flex flex-col items-start text-left p-6 rounded-2xl border-2 border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-4 group-hover:scale-110 transition-transform">
                <FileJson className="h-6 w-6" />
              </div>
              <h3 className="font-black uppercase text-xs tracking-widest text-slate-900 mb-1">Import Google Form</h3>
              <p className="text-xs text-slate-500">Embed an existing Google Form and sync results via API.</p>
            </button>

            <button 
              onClick={() => router.push('/admin/submissions/builder/new?mode=vision')}
              className="flex flex-col items-start text-left p-6 rounded-2xl border-2 border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-4 group-hover:scale-110 transition-transform">
                <ImageIcon className="h-6 w-6" />
              </div>
              <h3 className="font-black uppercase text-xs tracking-widest text-slate-900 mb-1">Vision to Form</h3>
              <p className="text-xs text-slate-500">Upload a screenshot or PDF of a form to convert it to components.</p>
            </button>
          </div>
          <div className="p-6 bg-slate-50 border-t flex justify-end">
            <Button variant="ghost" onClick={() => setIsNewFormDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EXTERNAL FORM DIALOG (GOOGLE FORMS) */}
      <Dialog open={isExternalFormDialogOpen} onOpenChange={setIsExternalFormDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingFormId ? 'Edit External Connection' : 'Connect Google Form'}</DialogTitle>
            <DialogDescription>Link an existing Google Form or external submission tool.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveExternalForm} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Form Title</Label>
              <Input required value={externalFormData.title || ''} onChange={e => setExternalFormData({ ...externalFormData, title: e.target.value })} placeholder="e.g. Recruitment 2026" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={externalFormData.description || ''} onChange={e => setExternalFormData({ ...externalFormData, description: e.target.value })} placeholder="What is this form for?" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Embed URL or Code</Label>
              <Input required value={externalFormData.embedUrl || ''} onChange={e => setExternalFormData({ ...externalFormData, embedUrl: e.target.value })} placeholder="Paste URL or <iframe> embed code..." className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Response API URL (Optional)</Label>
              <Input value={externalFormData.sheetApiUrl || ''} onChange={e => setExternalFormData({ ...externalFormData, sheetApiUrl: e.target.value })} placeholder="Apps Script API URL for Sheet data..." className="h-11 rounded-xl" />
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsExternalFormDialogOpen(false)} className="h-11 rounded-xl flex-1">Cancel</Button>
              <Button type="submit" disabled={isProcessing} className="h-11 rounded-xl flex-1 font-bold">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {editingFormId ? 'Update Connection' : 'Connect Form'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-white shadow-sm border-none ring-1 ring-slate-200 rounded-2xl group hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
          <div className={cn("p-4 rounded-2xl bg-slate-50 transition-colors group-hover:bg-slate-100", color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
