"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getForm } from '@/services/formService';
import type { FormRecord } from '@/types';
import { Loader2, ArrowLeft, Info, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';

export default function PublicFormView() {
  const params = useParams();
  const formId = params.id as string;
  const router = useRouter();

  const [form, setForm] = useState<FormRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchForm = async () => {
      const data = await getForm(formId);
      setForm(data);
      setIsLoading(false);
    };
    fetchForm();
  }, [formId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Submission Portal...</p>
        </div>
      </div>
    );
  }

  if (!form || form.status === 'draft') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md text-center shadow-xl border-none ring-1 ring-slate-200">
          <CardHeader className="pt-8">
            <Lock className="h-12 w-12 text-rose-500 mx-auto mb-2" />
            <CardTitle className="text-2xl font-black uppercase font-headline">Access Denied</CardTitle>
            <CardDescription>This submission module is either inactive or restricted.</CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <p className="text-slate-500 text-sm mb-6">If you believe this is an error, please contact the Leo Club of Athugalpura board.</p>
            <Button className="w-full h-12 rounded-xl font-bold" onClick={() => router.push('/')}>Return to Portal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (form.status === 'closed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md text-center shadow-xl border-none ring-1 ring-slate-200">
          <CardHeader className="pt-8">
            <Info className="h-12 w-12 text-amber-500 mx-auto mb-2" />
            <CardTitle className="text-2xl font-black uppercase font-headline">Submissions Closed</CardTitle>
            <CardDescription>The window for submitting this form has expired.</CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <p className="text-slate-500 text-sm mb-6">Thank you for your interest. Please check our dashboard for other active opportunities.</p>
            <Button className="w-full h-12 rounded-xl font-bold" onClick={() => router.push('/')}>Return to Portal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="h-20 bg-white border-b sticky top-0 z-50 flex items-center">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="https://i.imgur.com/MP1YFNf.png" alt="Logo" width={44} height={44} className="rounded-full shadow-md" />
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none uppercase tracking-tight">{form.title}</h1>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">LeoPortal Submissions</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="hidden sm:flex font-bold" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-0 sm:px-4 max-w-4xl">
        <Card className="border-none shadow-2xl rounded-none sm:rounded-[2rem] overflow-hidden bg-white min-h-[800px]">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="p-6 sm:p-10 bg-slate-50/50 border-b">
              <h2 className="text-2xl font-black text-slate-900 uppercase font-headline tracking-tight">{form.title}</h2>
              {form.description && <p className="text-slate-500 mt-2 text-sm leading-relaxed">{form.description}</p>}
            </div>
            <div className="flex-1 bg-white relative">
              <iframe
                src={form.embedUrl}
                width="100%"
                height="1200"
                frameBorder="0"
                marginHeight={0}
                marginWidth={0}
                className="w-full"
              >
                Loading…
              </iframe>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="py-10 bg-slate-900 text-white text-center">
        <div className="container mx-auto px-4">
          <Image src="https://i.imgur.com/MP1YFNf.png" alt="Logo" width={50} height={50} className="mx-auto mb-4 opacity-50 grayscale invert" />
          <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Leo Club of Athugalpura</p>
          <p className="text-[10px] opacity-40 mt-1 uppercase font-medium">Secured Submission Management Platform &copy; 2026</p>
        </div>
      </footer>
    </div>
  );
}