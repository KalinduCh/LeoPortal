"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getForm } from '@/services/formService';
import type { FormRecord } from '@/types';
import { Loader2, ArrowLeft } from 'lucide-react';
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

  const getEmbedUrl = (input: string) => {
    if (!input) return "";
    // If user pasted <iframe> embed code, extract the src
    if (input.includes("<iframe")) {
      const srcMatch = input.match(/src="([^"]+)"/);
      return srcMatch ? srcMatch[1] : "";
    }
    return input.trim();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!form || form.status === 'closed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Form Unavailable</CardTitle>
            <CardDescription>This form is either closed or does not exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/')}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b sticky top-0 z-50 flex items-center shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">{form.title}</h1>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Secured Submissions</p>
          </div>
          <Button variant="ghost" size="sm" className="font-bold" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Exit
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-0 sm:px-4 max-w-4xl">
        <Card className="border-none shadow-xl rounded-none sm:rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            {form.bannerUrl && (
              <div className="relative w-full aspect-[3/1] bg-slate-200">
                <Image 
                  src={form.bannerUrl} 
                  alt="Form Banner" 
                  fill 
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-6 sm:p-10 border-b bg-slate-50/50">
                <h2 className="text-2xl font-bold text-slate-900">{form.title}</h2>
                {form.description && <p className="text-slate-500 mt-2 text-sm leading-relaxed">{form.description}</p>}
            </div>
            <div className="w-full min-h-[800px] bg-white">
              <iframe
                src={getEmbedUrl(form.embedUrl)}
                width="100%"
                height="1000"
                frameBorder="0"
                className="w-full"
                title={form.title}
              >
                Loading form...
              </iframe>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="py-8 text-center text-slate-400 text-[10px] uppercase font-black tracking-widest">
        Secured Submission Platform &copy; 2026
      </footer>
    </div>
  );
}
