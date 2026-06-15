"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getForm } from '@/services/formService';
import { submitForm } from '@/services/submissionService';
import type { FormRecord } from '@/types';
import { Loader2, ArrowLeft, Lock, CheckCircle, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

export default function PublicFormView() {
  const params = useParams();
  const formId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState<FormRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Native form responses state
  const [responses, setResponses] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchForm = async () => {
      const data = await getForm(formId);
      setForm(data);
      setIsLoading(false);
    };
    fetchForm();
  }, [formId]);

  const handleNativeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form?.visibility === 'members' && !user) {
        toast({ title: "Login Required", description: "This form is restricted to members.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    try {
        await submitForm(formId, responses, user ? { id: user.id, name: user.name, email: user.email } : undefined);
        setIsSuccess(true);
        toast({ title: "Submitted!", description: "Your response has been successfully recorded." });
    } catch (error) {
        toast({ title: "Error", description: "Failed to submit response. Please try again.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const updateResponse = (id: string, value: any) => {
    setResponses(prev => ({ ...prev, [id]: value }));
  };

  const getEmbedUrl = (input: string) => {
    if (!input) return "";
    if (input.includes("<iframe")) {
      const srcMatch = input.match(/src="([^"]+)"/);
      return srcMatch ? srcMatch[1] : "";
    }
    return input.trim();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initializing Secure Portal...</p>
        </div>
      </div>
    );
  }

  if (!form || form.status === 'draft') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md text-center shadow-xl border-none ring-1 ring-slate-200 rounded-[2rem]">
          <CardHeader className="pt-10">
            <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <Lock className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-black uppercase font-headline tracking-tight">Access Restricted</CardTitle>
            <CardDescription>This module is currently unavailable or set to private.</CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">Please ensure you have the correct link. For further assistance, contact the administration.</p>
            <Button className="w-full h-12 rounded-xl font-bold bg-primary shadow-lg" onClick={() => router.push('/')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (form.visibility === 'members' && !user) {
     return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md text-center shadow-xl border-none ring-1 ring-slate-200 rounded-[2rem]">
          <CardHeader className="pt-10">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
               <ShieldCheck className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-black uppercase font-headline tracking-tight">Members Only</CardTitle>
            <CardDescription>You must be signed in to fill out this form.</CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <Button className="w-full h-12 rounded-xl font-bold bg-primary shadow-lg" onClick={() => router.push('/login')}>Log In to Access</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
     return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md text-center shadow-xl border-none ring-1 ring-slate-200 rounded-[2rem]">
          <CardHeader className="pt-10">
            <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <CheckCircle className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-black uppercase font-headline tracking-tight">Response Recorded</CardTitle>
            <CardDescription>Thank you for your submission. We have successfully received your details.</CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <Button className="w-full h-12 rounded-xl font-bold bg-slate-900 shadow-lg text-white" onClick={() => router.push('/')}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="h-20 bg-white border-b sticky top-0 z-50 flex items-center shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none uppercase tracking-tight line-clamp-1 max-w-[200px] sm:max-w-none">{form.title}</h1>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Secured Submissions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex font-bold rounded-lg hover:bg-slate-100" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Exit
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-0 sm:px-4 max-w-3xl">
        {form.type === 'google_form' ? (
          <Card className="border-none shadow-2xl rounded-none sm:rounded-[2rem] overflow-hidden bg-white min-h-[900px]">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="relative w-full aspect-[3/1] bg-slate-100">
                {form.bannerUrl && (
                  <Image src={form.bannerUrl} alt="Form Banner" fill className="object-cover" />
                )}
              </div>
              <div className="p-6 sm:p-10 bg-slate-50/50 border-b">
                <h2 className="text-2xl font-black text-slate-900 uppercase font-headline tracking-tight">{form.title}</h2>
                {form.description && <p className="text-slate-500 mt-2 text-sm leading-relaxed whitespace-pre-wrap">{form.description}</p>}
              </div>
              <iframe
                  src={getEmbedUrl(form.embedUrl)}
                  width="100%"
                  height="1200"
                  frameBorder="0"
                  className="w-full"
                  title={form.title}
              >
                  Loading…
              </iframe>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleNativeSubmit} className="space-y-6">
            <Card className="shadow-xl rounded-2xl overflow-hidden border-none ring-1 ring-slate-200">
               {form.bannerUrl && (
                  <div className="relative w-full aspect-[3/1] bg-slate-100">
                    <Image src={form.bannerUrl} alt="Form Banner" fill className="object-cover" />
                  </div>
               )}
               <CardContent className="p-8 sm:p-10">
                 <h2 className="text-3xl font-black text-slate-900 uppercase font-headline tracking-tight">{form.title}</h2>
                 {form.description && (
                   <>
                    <p className="text-slate-500 mt-4 text-sm leading-relaxed whitespace-pre-wrap">{form.description}</p>
                    <Separator className="my-6 opacity-50" />
                   </>
                 )}
                 <div className="flex items-center gap-2 mt-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    Secure Data Submission
                 </div>
               </CardContent>
            </Card>

            <div className="space-y-4">
              {form.components?.map(comp => (
                <Card key={comp.id} className="shadow-md rounded-2xl border-none ring-1 ring-slate-200 overflow-hidden">
                  <CardContent className="p-8 space-y-4">
                    <Label className="text-lg font-bold text-slate-900 flex gap-1">
                      {comp.label}
                      {comp.required && <span className="text-rose-500">*</span>}
                    </Label>
                    {comp.description && <p className="text-xs text-slate-400 -mt-2">{comp.description}</p>}
                    
                    <div className="pt-2">
                       {comp.type === 'text' && (
                         <Input 
                           required={comp.required}
                           placeholder={comp.placeholder || "Your answer"} 
                           className="h-12 rounded-xl"
                           onChange={e => updateResponse(comp.id, e.target.value)}
                         />
                       )}
                       {comp.type === 'paragraph' && (
                         <Textarea 
                           required={comp.required}
                           placeholder={comp.placeholder || "Your answer"} 
                           className="rounded-xl min-h-[100px]"
                           onChange={e => updateResponse(comp.id, e.target.value)}
                         />
                       )}
                       {comp.type === 'select' && (
                         <Select onValueChange={v => updateResponse(comp.id, v)}>
                            <SelectTrigger className="h-12 rounded-xl">
                              <SelectValue placeholder="Choose an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {comp.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                         </Select>
                       )}
                       {comp.type === 'radio' && (
                          <RadioGroup onValueChange={v => updateResponse(comp.id, v)}>
                             {comp.options?.map(opt => (
                               <div key={opt} className="flex items-center space-x-2">
                                 <RadioGroupItem value={opt} id={`${comp.id}-${opt}`} />
                                 <Label htmlFor={`${comp.id}-${opt}`} className="cursor-pointer">{opt}</Label>
                               </div>
                             ))}
                          </RadioGroup>
                       )}
                       {comp.type === 'checkbox' && (
                          <div className="space-y-2">
                            {comp.options?.map(opt => (
                               <div key={opt} className="flex items-center space-x-2">
                                 <Checkbox 
                                   id={`${comp.id}-${opt}`} 
                                   onCheckedChange={(checked) => {
                                      const current = responses[comp.id] || [];
                                      const next = checked 
                                        ? [...current, opt]
                                        : current.filter((o: string) => o !== opt);
                                      updateResponse(comp.id, next);
                                   }}
                                 />
                                 <Label htmlFor={`${comp.id}-${opt}`} className="cursor-pointer">{opt}</Label>
                               </div>
                            ))}
                          </div>
                       )}
                       {comp.type === 'header' && <Separator className="bg-slate-100" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-4 pb-12">
               <Button type="submit" size="lg" className="w-full sm:w-auto h-14 px-12 text-lg font-black shadow-xl bg-primary rounded-2xl" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                  {isSubmitting ? 'Submitting...' : 'Send Response'}
               </Button>
            </div>
          </form>
        )}
      </main>

      <footer className="py-12 bg-slate-900 text-white text-center">
        <div className="container mx-auto px-4 space-y-6">
          <Separator className="max-w-[100px] mx-auto opacity-20" />
          <p className="text-[10px] opacity-30 uppercase font-medium tracking-tighter">Secured Submission Management Platform &copy; 2026</p>
        </div>
      </footer>
    </div>
  );
}
