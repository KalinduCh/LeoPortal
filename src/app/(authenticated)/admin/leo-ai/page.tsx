
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BrainCircuit, PlusCircle, Database, MessageSquare, 
  Search, Loader2, Edit, Trash2, Shield, Eye, Globe, 
  AlertCircle, ArrowRight, BarChart3, HelpCircle, 
  FileText, CheckCircle2, XCircle, Lock
} from 'lucide-react';
import { 
  getAllKnowledge, createKnowledge, updateKnowledge, deleteKnowledge 
} from '@/services/leoAiService';
import type { AiKnowledge, AiKnowledgeCategory, AiKnowledgeVisibility } from '@/types/leo-ai';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const CATEGORIES: { value: AiKnowledgeCategory; label: string }[] = [
  { value: 'club_history', label: 'Club History' },
  { value: 'club_leadership', label: 'Club Leadership' },
  { value: 'club_projects', label: 'Club Projects' },
  { value: 'club_awards', label: 'Club Awards' },
  { value: 'club_constitution', label: 'Club Constitution' },
  { value: 'leoism', label: 'Leoism' },
  { value: 'lions_international', label: 'Lions International' },
  { value: 'leadership_development', label: 'Leadership Development' },
  { value: 'community_service', label: 'Community Service' },
  { value: 'general', label: 'General Knowledge' },
];

export default function LeoAiAdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [knowledge, setKnowledge] = useState<AiKnowledge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as AiKnowledgeCategory,
    visibility: 'members' as AiKnowledgeVisibility,
    isActive: true,
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchKnowledge = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllKnowledge();
      setKnowledge(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load knowledge base.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!authLoading && user?.role !== 'super_admin') {
      router.replace('/dashboard');
    } else if (user) {
      fetchKnowledge();
    }
  }, [user, authLoading, router, fetchKnowledge]);

  const handleOpenDialog = (entry?: AiKnowledge) => {
    if (entry) {
      setEditingId(entry.id);
      setFormData({
        title: entry.title,
        content: entry.content,
        category: entry.category,
        visibility: entry.visibility,
        isActive: entry.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        category: 'general',
        visibility: 'members',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProcessing(true);

    try {
      if (editingId) {
        await updateKnowledge(editingId, formData);
        toast({ title: "Updated", description: "Knowledge entry refined." });
      } else {
        await createKnowledge({
          ...formData,
          createdBy: user.id,
        });
        toast({ title: "Success", description: "New knowledge added to LEO AI." });
      }
      setIsDialogOpen(false);
      fetchKnowledge();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save entry.", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently remove this knowledge entry? AI will lose access to this info.")) return;
    try {
      await deleteKnowledge(id);
      toast({ title: "Removed" });
      fetchKnowledge();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const filteredKnowledge = knowledge.filter(k => 
    k.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.category.includes(searchTerm.toLowerCase())
  );

  if (isLoading || authLoading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <BrainCircuit className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold font-headline text-slate-900 tracking-tight uppercase">LEO AI Center</h1>
          </div>
          <p className="text-slate-500 font-medium">Unified Knowledge Management & Assistant Intelligence.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="h-12 px-6 shadow-xl bg-primary hover:bg-primary/90 font-bold rounded-xl">
          <PlusCircle className="mr-2 h-5 w-5" /> Add Knowledge
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Knowledge Base" value={knowledge.length} icon={Database} color="text-blue-600" description="Total entries in brain" />
        <StatCard title="Active Brain" value={knowledge.filter(k => k.isActive).length} icon={CheckCircle2} color="text-emerald-600" description="Entries currently accessible" />
        <StatCard title="Public Reach" value={knowledge.filter(k => k.visibility === 'public').length} icon={Globe} color="text-amber-600" description="Available to visitors" />
      </div>

      <Tabs defaultValue="management" className="w-full">
        <TabsList className="h-12 bg-slate-100 p-1 rounded-xl mb-8">
          <TabsTrigger value="management" className="px-6 font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Brain Management</TabsTrigger>
          <TabsTrigger value="analytics" className="px-6 font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-slate-200 overflow-hidden rounded-2xl">
            <CardHeader className="bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Knowledge Entries</CardTitle>
                <CardDescription>Manage facts, history, and procedures fed to LEO AI.</CardDescription>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search brain..." 
                  className="pl-10 h-10 rounded-xl bg-white" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-black uppercase text-[10px] text-slate-400 tracking-widest">Entry Detail</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] text-slate-400 tracking-widest">Category</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] text-slate-400 tracking-widest">Visibility</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] text-slate-400 tracking-widest">Status</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] text-slate-400 tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKnowledge.map((k) => (
                      <tr key={k.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{k.title}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{k.content}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                            {k.category.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="capitalize flex items-center gap-1.5 w-fit text-[10px] font-black border-slate-200 text-slate-600 bg-white">
                            {k.visibility === 'public' && <Globe className="h-3 w-3" />}
                            {k.visibility === 'members' && <Shield className="h-3 w-3" />}
                            {k.visibility === 'admin_only' && <Lock className="h-3 w-3" />}
                            {k.visibility.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {k.isActive ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                              <CheckCircle2 className="h-3 w-3" /> Live
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <XCircle className="h-3 w-3" /> Draft
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleOpenDialog(k)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => handleDelete(k.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredKnowledge.length === 0 && (
                      <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">The brain is currently empty or no matches found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10">
             <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 opacity-50">
                <BarChart3 className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="font-bold text-slate-900">Traffic Analytics Coming Soon</h3>
                <p className="text-sm text-slate-500 text-center max-w-xs mt-1">We are building detailed tracking for popular questions and unanswered topics.</p>
             </div>
             <div className="space-y-6">
                <h3 className="text-xl font-bold font-headline uppercase tracking-tight flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" /> Training Queue
                </h3>
                <div className="p-6 bg-white border rounded-2xl shadow-sm">
                  <p className="text-sm text-slate-500 italic">No unanswered questions detected this week. LEO AI is operating at peak intelligence.</p>
                </div>
             </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-primary">
              {editingId ? 'Refine Knowledge' : 'Expand AI Brain'}
            </DialogTitle>
            <DialogDescription>Provide clear, factual information for LEO AI to process.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entry Title</Label>
              <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Club Founding History" className="h-12 rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                <Select value={formData.category} onValueChange={(v: any) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Visibility</Label>
                <Select value={formData.visibility} onValueChange={(v: any) => setFormData({...formData, visibility: v})}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">🌍 Public (Website)</SelectItem>
                    <SelectItem value="members">🛡️ Members (Portal)</SelectItem>
                    <SelectItem value="admin_only">🔒 Admin Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Content / Fact Details</Label>
              <Textarea 
                required 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})} 
                rows={6} 
                className="rounded-xl resize-none leading-relaxed" 
                placeholder="Describe the knowledge point in detail..." 
              />
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-xl ring-1 ring-slate-200">
               <input 
                type="checkbox" 
                id="isActive" 
                checked={formData.isActive} 
                onChange={e => setFormData({...formData, isActive: e.target.checked})}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
               />
               <Label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">Enable this entry for AI retrieval</Label>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-12 rounded-xl flex-1" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isProcessing} className="h-12 rounded-xl flex-1 font-black shadow-lg">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingId ? "Refine Entry" : "Feed Brain")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, description }: any) {
  return (
    <Card className="border-none shadow-lg ring-1 ring-slate-200 bg-white overflow-hidden group hover:ring-primary/20 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
            <p className={cn("text-4xl font-black tracking-tighter", color)}>{value}</p>
            <p className="text-[10px] text-slate-500 font-medium">{description}</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary/5 group-hover:text-primary transition-all duration-500">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
