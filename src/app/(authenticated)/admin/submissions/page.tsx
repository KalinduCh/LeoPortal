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
  Lightbulb, Search, MoreHorizontal, User, Calendar, MessageSquare
} from 'lucide-react';
import { getForms, deleteForm, updateForm, createForm } from '@/services/formService';
import { getProjectIdeasForAdmin, updateProjectIdea } from '@/services/projectIdeaService';
import type { FormRecord, FormStatus, ProjectIdea } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function SubmissionsAdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [forms, setForms] = useState<FormRecord[]>([]);
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formSearchTerm, setFormSearchTerm] = useState('');
  const [ideaSearchTerm, setIdeaSearchTerm] = useState('');

  const [formData, setFormData] = useState({
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
      f.title.toLowerCase().includes(formSearchTerm.toLowerCase()) ||
      f.description?.toLowerCase().includes(formSearchTerm.toLowerCase())
    );
  }, [forms, formSearchTerm]);

  const filteredIdeas = useMemo(() => {
    return ideas.filter(i => 
        i.projectName.toLowerCase().includes(ideaSearchTerm.toLowerCase()) ||
        i.authorName.toLowerCase().includes(ideaSearchTerm.toLowerCase())
    );
  }, [ideas, ideaSearchTerm]);

  const stats = useMemo(() => {
    return {
      totalForms: forms.length,
      pendingIdeas: ideas.filter(i => i.status === 'pending_review').length,
      activeModules: forms.filter(f => f.status === 'active').length,
    };
  }, [forms, ideas]);

  // --- Form Logic ---
  const handleOpenFormDialog = (form?: FormRecord) => {
    if (form) {
      setEditingFormId(form.id);
      setFormData({
        title: form.title,
        description: form.description || '',
        embedUrl: form.embedUrl,
        sheetApiUrl: form.sheetApiUrl || '',
        status: form.status,
      });
    } else {
      setEditingFormId(null);
      setFormData({ title: '', description: '', embedUrl: '', sheetApiUrl: '', status: 'active' });
    }
    setIsFormDialogOpen(true);
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
        toast({ title: "Form Connected", description: "Google Form is now linked to Leo Portal." });
      }
      setIsFormDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save form.", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm("Remove this form connection? This will not delete the actual Google Form.")) return;
    try {
      await deleteForm(id);
      toast({ title: "Connection Removed" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  // --- Idea Review Logic ---
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
          <h1 className="text-3xl font-bold font-headline text-primary">Submissions & Review</h1>
          <p className="text-muted-foreground">Manage connected Google Forms and AI-generated project proposals.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Connected Forms" value={stats.totalForms} icon={FileText} color="text-blue-600" />
        <StatCard title="Awaiting Review" value={stats.pendingIdeas} icon={Clock} color="text-amber-600" />
        <StatCard title="Active Modules" value={stats.activeModules} icon={CheckCircle} color="text-emerald-600" />
      </div>

      <Tabs defaultValue="forms" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-12 bg-muted p-1 mb-8">
          <TabsTrigger value="forms" className="font-bold"><LayoutGrid className="mr-2 h-4 w-4" /> Submission Forms</TabsTrigger>
          <TabsTrigger value="ideas" className="font-bold"><Lightbulb className="mr-2 h-4 w-4" /> Idea Review</TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Connected Submission Modules</CardTitle>
                <CardDescription>Forms linked via Google Forms integration.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search forms..." value={formSearchTerm} onChange={e => setFormSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <Button onClick={() => handleOpenFormDialog()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Connect New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created On</TableHead>
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
                          <Badge className={form.status === 'active' ? 'bg-emerald-600' : form.status === 'closed' ? 'bg-rose-600' : 'bg-slate-500'}>
                            {form.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(parseISO(form.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => window.open(`/submissions/${form.id}`, '_blank')}>
                            <Eye className="h-4 w-4 mr-1.5" /> View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/submissions/responses/${form.id}`)} disabled={!form.sheetApiUrl}>
                            <LayoutGrid className="h-4 w-4 mr-1.5" /> Responses
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenFormDialog(form)}>
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => handleDeleteForm(form.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredForms.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                          No forms match your criteria.
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
          <Card className="shadow-lg">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Project Idea Proposals</CardTitle>
                <CardDescription>Review and manage AI-assisted project ideas submitted by members.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search proposals..." value={ideaSearchTerm} onChange={e => setIdeaSearchTerm(e.target.value)} className="pl-9" />
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
                                    <Badge className={getIdeaStatusVariant(idea.status)}>
                                        {idea.status.replace(/_/g, ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => handleReviewIdea(idea)}>
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

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFormId ? 'Edit Form Connection' : 'Connect Google Form'}</DialogTitle>
            <DialogDescription>Link an existing Google Form to the Leo Portal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveForm} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Form Title</Label>
              <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Recruitment 2026" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="What is this form for?" />
            </div>
            <div className="space-y-2">
              <Label>Google Form Embed URL</Label>
              <Input required value={formData.embedUrl} onChange={e => setFormData({ ...formData, embedUrl: e.target.value })} placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true" />
            </div>
            <div className="space-y-2">
              <Label>Response API URL (Optional)</Label>
              <Input value={formData.sheetApiUrl} onChange={e => setFormData({ ...formData, sheetApiUrl: e.target.value })} placeholder="https://script.google.com/macros/s/.../exec" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select 
                className="w-full h-10 rounded-md border border-input bg-background px-3"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as FormStatus })}
              >
                <option value="active">Active (Visible to Public)</option>
                <option value="closed">Closed (Archive)</option>
                <option value="draft">Draft (Admin Only)</option>
              </select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isProcessing}>
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
    <Card className="bg-white shadow-sm border-none ring-1 ring-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
          <div className={`p-4 rounded-2xl bg-slate-50 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}