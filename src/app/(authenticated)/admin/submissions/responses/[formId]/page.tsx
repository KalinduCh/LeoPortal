"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, Download, Search, Loader2, RefreshCw, 
  FileSpreadsheet, Filter, AlertTriangle, FileText, LayoutGrid
} from 'lucide-react';
import { getForm, getFormResponses } from '@/services/formService';
import type { FormRecord } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from "@/components/ui/input";
import Papa from 'papaparse';

export default function FormResponsesPage() {
  const params = useParams();
  const formId = params.formId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState<FormRecord | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadForm = async () => {
      const data = await getForm(formId);
      if (data) setForm(data);
      else router.push('/admin/submissions');
    };
    loadForm();
  }, [formId, router]);

  const fetchResponses = async () => {
    if (!form?.sheetApiUrl) return;
    setIsRefreshing(true);
    try {
      const data = await getFormResponses(form.sheetApiUrl);
      setResponses(data);
      if (data.length > 0) {
        toast({ title: "Data Synced", description: `Fetched ${data.length} responses from Google Sheets.` });
      }
    } catch (error) {
      toast({ title: "Sync Failed", description: "Could not fetch responses from the external API.", variant: "destructive" });
    }
    setIsRefreshing(false);
    setIsLoading(false);
  };

  useEffect(() => {
    if (form?.sheetApiUrl) {
      fetchResponses();
    }
  }, [form]);

  const headers = useMemo(() => {
    if (responses.length === 0) return [];
    return Object.keys(responses[0]);
  }, [responses]);

  const filteredResponses = useMemo(() => {
    return responses.filter(r => 
      Object.values(r).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [responses, searchTerm]);

  const handleExport = () => {
    const csv = Papa.unparse(responses);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${form?.title.replace(/\s+/g, '_')}_Responses.csv`;
    link.click();
  };

  if (isLoading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/submissions')} className="pl-0 text-primary font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
          </Button>
          <h1 className="text-3xl font-bold font-headline uppercase text-slate-900 tracking-tight">{form?.title}</h1>
          <p className="text-slate-500 uppercase text-[10px] font-black tracking-widest">External Response Ledger</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={fetchResponses} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Sync Data
          </Button>
          <Button onClick={handleExport} disabled={responses.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {!form?.sheetApiUrl ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-10 flex flex-col items-center text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-xl font-bold text-amber-900">API Link Missing</h3>
            <p className="text-amber-700 max-w-md mt-2">
              You haven't configured a Response API URL for this form. Please create a Google Apps Script to serve your Sheet data as JSON.
            </p>
            <Button variant="outline" className="mt-6 border-amber-300 text-amber-900" onClick={() => router.push('/admin/submissions')}>
              Configure Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-xl ring-1 ring-slate-200 border-none overflow-hidden">
          <CardHeader className="bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{responses.length} Total Submissions</CardTitle>
                <CardDescription>Live data fetched from linked Google Sheet.</CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search rows..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-9 h-10 rounded-xl bg-white"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    {headers.map(h => (
                      <TableHead key={h} className="font-bold uppercase text-[10px] tracking-widest text-slate-500 py-4">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((row, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                      {headers.map(h => (
                        <TableCell key={h} className="py-4 text-sm font-medium text-slate-700">
                          {String(row[h])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {filteredResponses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={headers.length || 1} className="text-center py-24 text-slate-400 italic">
                        {responses.length === 0 ? "No data found. Ensure your Apps Script is returning JSON correctly." : "No results match your search."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}