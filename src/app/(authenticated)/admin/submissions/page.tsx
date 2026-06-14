"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, PlusCircle, ExternalLink, Settings, 
  Loader2, Trash2, Eye, LayoutGrid, CheckCircle, Clock, XCircle
} from 'lucide-react';
import { getForms, deleteForm, updateForm, createForm } from '@/services/formService';
import type { FormRecord, FormStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectItem } from '@/components/ui/select';

export default function SubmissionsAdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [forms, setForms] = useState<FormRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    embedUrl: '',
    sheetApiUrl: '',
    status: 'active' as FormStatus,
  });

  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getForms();
      setForms(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load forms list.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!authLoading && user?.role === 'member') {
      router.replace('/dashboard');
    } else if (user) {
      fetchForms();
    }
  }, [user, authLoading, router, fetchForms]);

  const filteredForms = useMemo(() => {
    return forms.filter(f => 
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [forms, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: forms.length,
      active: forms.filter(f => f.status === 'active').length,
      closed: forms.filter(f => f.status === 'closed').length,
    };
  }, [forms]);

  const handleOpenDialog = (form?: FormRecord) => {
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
    setIsDialogOpen(true);
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
      setIsDialogOpen(false);
      fetchForms();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save form.", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this form connection? This will not delete the actual Google Form.")) return;
    try {
      await deleteForm(id);
      toast({ title: "Connection Removed" });
      fetchForms();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: FormStatus) => {
    switch(status) {
      case 'active': return <Badge className="bg-emerald-600">Active</Badge>;
      case 'closed': return <Badge variant="destructive">Closed</Badge>;
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
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
          <p className="text-muted-foreground">Connect and manage Google Forms for recruitment, surveys, and more.</p>
        </div>
        <Button size="lg" onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-5 w-5" /> Connect New Form
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Forms" value={stats.total} icon={FileText} color="text-blue-600" />
        <StatCard title="Active Modules" value={stats.active} icon={CheckCircle} color="text-emerald-600" />
        <StatCard title="Closed / Past" value={stats.closed} icon={XCircle} color="text-slate-600" />
      </div>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Connected Modules</CardTitle>
            <CardDescription>All linked submission forms in the portal.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Input 
              placeholder="Search forms..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-4"
            />
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
                    <TableCell>{getStatusBadge(form.status)}</TableCell>
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
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(form)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => handleDelete(form.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredForms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                      No forms found. Connect a Google Form to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <p className="text-[10px] text-muted-foreground italic">Use the 'Send' button in Google Forms → '&lt; &gt;' icon → Copy the 'src' link.</p>
            </div>
            <div className="space-y-2">
              <Label>Response API URL (Optional)</Label>
              <Input value={formData.sheetApiUrl} onChange={e => setFormData({ ...formData, sheetApiUrl: e.target.value })} placeholder="https://script.google.com/macros/s/.../exec" />
              <p className="text-[10px] text-muted-foreground italic">Required to view responses inside Leo Portal via Apps Script JSON.</p>
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
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