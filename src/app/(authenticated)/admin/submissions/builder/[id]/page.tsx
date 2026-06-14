"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, PlusCircle, Trash2, Settings2, Eye, Save, Loader2, 
  GripVertical, Type, AlignLeft, Hash, Calendar, Clock, ChevronDown, 
  ListChecks, FileUp, Heading, Minus, Sparkles, Wand2, Search
} from 'lucide-react';
import { getForm, createForm, updateForm } from '@/services/formService';
import type { FormRecord, FormComponent, FormComponentType, FormVisibility } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { generateFormFromAi } from '@/ai/flows/generate-form-flow';
import { cn } from '@/lib/utils';

export default function FormBuilderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.id as string;
  const isNew = formId === 'new';
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [visibility, setVisibility] = useState<FormVisibility>('public');
  const [components, setComponents] = useState<FormComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  useEffect(() => {
    if (!isNew) {
      const loadForm = async () => {
        const data = await getForm(formId);
        if (data && data.type === 'native') {
          setTitle(data.title);
          setDescription(data.description || '');
          setShowDescription(!!data.description);
          setVisibility(data.visibility || 'public');
          setComponents(data.components || []);
        } else {
          toast({ title: "Error", description: "Form not found or incompatible type.", variant: "destructive" });
          router.push('/admin/submissions');
        }
        setIsLoading(false);
      };
      loadForm();
    } else {
        const mode = searchParams.get('mode');
        if (mode === 'manual') {
            setTitle('Untitled Form');
        } else {
            setIsAiDialogOpen(true);
        }
    }
  }, [formId, isNew, router, toast, searchParams]);

  const addComponent = (type: FormComponentType) => {
    const newComp: FormComponent = {
      id: `field-${Date.now()}`,
      type,
      label: `Untitled ${type}`,
      required: false,
      placeholder: type === 'text' || type === 'paragraph' ? 'Your answer' : undefined,
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? ['Option 1'] : undefined,
    };
    setComponents([...components, newComp]);
    setSelectedComponentId(newComp.id);
  };

  const removeComponent = (id: string) => {
    setComponents(components.filter(c => c.id !== id));
    if (selectedComponentId === id) setSelectedComponentId(null);
  };

  const updateComponent = (id: string, updates: Partial<FormComponent>) => {
    setComponents(components.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const result = await generateFormFromAi({ prompt: aiPrompt });
      setTitle(result.title);
      setDescription(result.description);
      setShowDescription(true);
      setComponents(result.components.map((c, i) => ({ ...c, id: `ai-${Date.now()}-${i}` } as FormComponent)));
      setIsAiDialogOpen(false);
      toast({ title: "Form Blueprint Ready", description: "AI has generated your form structure." });
    } catch (error) {
      toast({ title: "AI Error", description: "Failed to generate form. Try a different prompt.", variant: "destructive" });
    }
    setIsAiGenerating(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title Required", description: "Please enter a form title.", variant: "destructive" });
      return;
    }
    if (!user) return;

    setIsProcessing(true);
    const formData = {
      title,
      description,
      visibility,
      status: 'active' as FormStatus,
      components,
      type: 'native' as const,
      createdBy: user.id,
    };

    try {
      if (isNew) {
        await createForm(formData);
        toast({ title: "Form Created", description: "Your custom submission form is live." });
      } else {
        await updateForm(formId, formData);
        toast({ title: "Form Updated" });
      }
      router.push('/admin/submissions');
    } catch (error) {
      toast({ title: "Save Failed", description: "Could not persist changes to Firestore.", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/submissions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="font-black uppercase text-sm tracking-widest text-slate-900 leading-none">{isNew ? 'New Module' : 'Editor'}</h1>
            <p className="text-[10px] text-primary font-bold tracking-tighter mt-1">LeoPortal Form Builder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl h-9" onClick={() => window.open(`/submissions/${formId}`, '_blank')} disabled={isNew}>
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button className="rounded-xl h-9 px-6 font-bold shadow-lg" onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isNew ? 'Publish Form' : 'Save Changes'}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* COMPONENTS BAR */}
        <aside className="w-72 bg-white border-r p-6 overflow-y-auto hidden lg:block">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Standard Fields</h2>
          <div className="grid grid-cols-1 gap-2">
            <BuilderAction icon={Type} label="Text Field" onClick={() => addComponent('text')} />
            <BuilderAction icon={AlignLeft} label="Paragraph" onClick={() => addComponent('paragraph')} />
            <BuilderAction icon={Hash} label="Number" onClick={() => addComponent('number')} />
            <BuilderAction icon={Calendar} label="Date Picker" onClick={() => addComponent('date')} />
            <BuilderAction icon={Clock} label="Time Picker" onClick={() => addComponent('time')} />
            <BuilderAction icon={ChevronDown} label="Dropdown" onClick={() => addComponent('select')} />
            <BuilderAction icon={ListChecks} label="Selection" onClick={() => addComponent('radio')} />
            <BuilderAction icon={FileUp} label="File Upload" onClick={() => addComponent('file')} />
            
            <Separator className="my-4" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Layout</h2>
            <BuilderAction icon={Heading} label="Header" onClick={() => addComponent('header')} />
            <BuilderAction icon={Minus} label="Divider" onClick={() => addComponent('divider')} />
          </div>

          <div className="mt-8 pt-8 border-t">
             <Button variant="secondary" className="w-full h-12 rounded-xl text-primary font-bold bg-primary/5 hover:bg-primary/10" onClick={() => setIsAiDialogOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" /> Re-generate with AI
             </Button>
          </div>
        </aside>

        {/* CANVAS */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* FORM HEADER */}
            <Card className="border-t-8 border-t-primary shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-8 space-y-4">
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Form Title" 
                  className="text-3xl font-black font-headline border-none h-auto p-0 focus-visible:ring-0 placeholder:text-slate-200"
                />
                
                {showDescription ? (
                  <Textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Provide instructions or context for your respondents..." 
                    className="border-none p-0 focus-visible:ring-0 text-slate-500 resize-none min-h-[40px]"
                  />
                ) : (
                  <button 
                    onClick={() => setShowDescription(true)}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Add description
                  </button>
                )}
              </CardContent>
            </Card>

            {/* COMPONENTS LIST */}
            <div className="space-y-4">
              {components.map((comp, index) => (
                <Card 
                  key={comp.id} 
                  className={cn(
                    "group relative border-2 transition-all hover:border-primary/20",
                    selectedComponentId === comp.id ? "border-primary shadow-lg ring-1 ring-primary/20" : "border-transparent bg-white shadow-sm"
                  )}
                  onClick={() => setSelectedComponentId(comp.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                       <GripVertical className="h-4 w-4 text-slate-300 cursor-move" />
                       <Input 
                         value={comp.label} 
                         onChange={e => updateComponent(comp.id, { label: e.target.value })}
                         className="text-lg font-bold border-none p-0 h-auto focus-visible:ring-0 w-full"
                         placeholder="Question text"
                       />
                       <Badge variant="secondary" className="capitalize text-[9px] font-black h-5">{comp.type}</Badge>
                    </div>
                    
                    <div className="pl-8 opacity-60 pointer-events-none">
                       {comp.type === 'text' && <Input placeholder="Short answer" />}
                       {comp.type === 'paragraph' && <Textarea placeholder="Long answer" />}
                       {comp.type === 'select' && <div className="border rounded-lg p-3 flex justify-between items-center text-sm">Select an option <ChevronDown className="h-4 w-4" /></div>}
                       {(comp.type === 'radio' || comp.type === 'checkbox') && (
                         <div className="space-y-2">
                           {comp.options?.map((opt, i) => (
                             <div key={i} className="flex items-center gap-2">
                               <div className="h-4 w-4 border rounded-full" />
                               <span className="text-sm">{opt}</span>
                             </div>
                           ))}
                         </div>
                       )}
                       {comp.type === 'header' && <Separator />}
                    </div>

                    {/* COMPONENT SETTINGS (HIDDEN UNLESS SELECTED) */}
                    {selectedComponentId === comp.id && (
                      <div className="mt-8 pt-6 border-t grid grid-cols-1 gap-6">
                        {comp.options !== undefined && (
                          <div className="space-y-3">
                            <Label className="text-xs font-black uppercase text-slate-400">Options</Label>
                            <div className="space-y-2">
                              {comp.options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <Input 
                                    value={opt} 
                                    onChange={e => {
                                      const newOpts = [...comp.options!];
                                      newOpts[i] = e.target.value;
                                      updateComponent(comp.id, { options: newOpts });
                                    }}
                                    className="h-9 text-sm"
                                  />
                                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-rose-600" onClick={() => {
                                    const newOpts = comp.options!.filter((_, idx) => idx !== i);
                                    updateComponent(comp.id, { options: newOpts });
                                  }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button variant="link" className="p-0 h-auto text-primary text-xs font-bold" onClick={() => {
                                updateComponent(comp.id, { options: [...comp.options!, `Option ${comp.options!.length + 1}`] });
                              }}>Add another option</Button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                <Switch checked={comp.required} onCheckedChange={v => updateComponent(comp.id, { required: v })} />
                                <Label className="text-xs font-bold">Required</Label>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => removeComponent(comp.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {components.length === 0 && (
               <div className="py-24 text-center border-2 border-dashed rounded-3xl bg-white/50 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                    <PlusCircle className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">Your canvas is empty</p>
                    <p className="text-xs text-slate-400">Add fields from the sidebar or use the AI generator.</p>
                  </div>
               </div>
            )}

            {/* FORM SETTINGS CARD */}
            <Card className="shadow-lg rounded-2xl overflow-hidden border-none ring-1 ring-slate-200">
              <CardHeader className="bg-slate-50/50 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" /> Form Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex flex-col gap-4">
                   <Label className="text-xs font-black uppercase text-slate-400">Visibility & Access</Label>
                   <Select value={visibility} onValueChange={v => setVisibility(v as FormVisibility)}>
                     <SelectTrigger className="h-12 rounded-xl w-full sm:w-64">
                       <SelectValue placeholder="Who can fill this?" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="public">🌍 Public (Anyone with link)</SelectItem>
                       <SelectItem value="members">🛡️ Members Only (Login required)</SelectItem>
                     </SelectContent>
                   </Select>
                   <p className="text-[10px] text-slate-500 italic">
                      {visibility === 'public' 
                        ? 'Ideal for recruitment and public surveys. Respondents do not need an account.' 
                        : 'Secure data collection. Only approved Leo Portal members can submit responses.'}
                   </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* AI GENERATION DIALOG */}
      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl overflow-hidden p-0">
          <div className="bg-slate-900 p-8 text-white">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
              <Wand2 className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black font-headline uppercase tracking-tight">AI Form Architect</h2>
            <p className="text-slate-400 mt-1">Describe the form you want to create and let Gemini build the schema.</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <Label className="font-bold">Describe your form</Label>
              <Textarea 
                value={aiPrompt} 
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. Create a membership application form with personal details, previous volunteering experience, and a motivation statement."
                className="min-h-[120px] rounded-2xl"
              />
              <p className="text-[10px] text-slate-400">Tip: You can also paste a list of questions to convert them into fields.</p>
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setIsAiDialogOpen(false); if(isNew && !title) setTitle('Untitled Form'); }}>Build Manually</Button>
            <Button onClick={handleAiGenerate} disabled={isAiGenerating || !aiPrompt.trim()} className="rounded-xl h-11 px-8 font-bold shadow-lg">
              {isAiGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Structure
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BuilderAction({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-sm font-medium text-slate-600 group"
    >
      <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      {label}
    </button>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px bg-slate-100 w-full", className)} />;
}
