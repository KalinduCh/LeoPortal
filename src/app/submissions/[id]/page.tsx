"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getForm } from '@/services/formService';
import type { FormRecord } from '@/types';
import { Loader2, ArrowLeft, Info, Lock, ExternalLink } from 'lucide-react';
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

  /**
   * Intelligently extracts the source URL from potentially dirty input (raw URL or full <iframe> code)
   */
  const getEmbedUrl = (input: string) => {
    if (!input) return "";
    
    // Check if it's an iframe tag
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
            <CardDescription>This submission module is currently unavailable or set to private.</CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">Please ensure you have the correct link. For further assistance, contact the Leo Club of Athugalpura administration.</p>
            <Button className="w-full h-12 rounded-xl font-bold bg-primary shadow-lg" onClick={() => router.push('/')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (form.status === 'closed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md text-center shadow-xl border-none ring-1 ring-slate-200 rounded-[2rem]">
          <CardHeader className="pt-10">
            <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <Info className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-black uppercase font-headline tracking-tight">Submissions Closed</CardTitle>
            <CardDescription>The submission window for this module has expired.</CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">Thank you for your interest. You can check the main portal dashboard for other active opportunities and events.</p>
            <Button className="w-full h-12 rounded-xl font-bold bg-primary shadow-lg" onClick={() => router.push('/')}>Return to Portal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const finalEmbedUrl = getEmbedUrl(form.embedUrl);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="h-20 bg-white border-b sticky top-0 z-50 flex items-center shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="https://i.imgur.com/MP1YFNf.png" alt="Logo" width={48} height={48} className="rounded-full shadow-md" />
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none uppercase tracking-tight line-clamp-1 max-w-[200px] sm:max-w-none">{form.title}</h1>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">LeoPortal Secured Submissions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex font-bold rounded-lg hover:bg-slate-100" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Exit
            </Button>
            <Button variant="outline" size="sm" className="font-bold rounded-lg border-primary/20 text-primary" onClick={() => window.open(finalEmbedUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Direct Link</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-0 sm:px-4 max-w-4xl">
        <Card className="border-none shadow-2xl rounded-none sm:rounded-[2rem] overflow-hidden bg-white min-h-[900px]">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="p-6 sm:p-10 bg-slate-50/50 border-b">
              <h2 className="text-2xl font-black text-slate-900 uppercase font-headline tracking-tight">{form.title}</h2>
              {form.description && <p className="text-slate-500 mt-2 text-sm leading-relaxed whitespace-pre-wrap">{form.description}</p>}
              <div className="flex items-center gap-2 mt-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active & Verified Secure</span>
              </div>
            </div>
            <div className="flex-1 bg-white relative">
              {finalEmbedUrl ? (
                <iframe
                    src={finalEmbedUrl}
                    width="100%"
                    height="1200"
                    frameBorder="0"
                    marginHeight={0}
                    marginWidth={0}
                    className="w-full"
                    title={form.title}
                >
                    Loading…
                </iframe>
              ) : (
                <div className="p-20 text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
                    <p className="font-bold text-slate-900">Module Configuration Error</p>
                    <p className="text-sm text-slate-500">The embed source for this form is invalid. Please contact the administrator.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="py-12 bg-slate-900 text-white text-center">
        <div className="container mx-auto px-4 space-y-6">
          <Image src="https://i.imgur.com/MP1YFNf.png" alt="Logo" width={50} height={50} className="mx-auto opacity-50 grayscale invert" />
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-[0.2em]">Leo Club of Athugalpura</p>
            <p className="text-[10px] opacity-40 uppercase font-bold tracking-widest">District 306 D9 | Sri Lanka</p>
          </div>
          <Separator className="max-w-[100px] mx-auto opacity-20" />
          <p className="text-[10px] opacity-30 uppercase font-medium tracking-tighter">Secured Submission Management Platform &copy; 2026</p>
        </div>
      </footer>
    </div>
  );
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}