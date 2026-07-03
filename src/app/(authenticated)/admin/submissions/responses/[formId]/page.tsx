"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, Download, Search, Loader2, RefreshCw, 
  FileSpreadsheet, Filter, AlertTriangle, FileText, LayoutGrid, User, Clock, CheckCircle, FileDown
} from 'lucide-react';
import { getForm, getFormResponses } from '@/services/formService';
import { getSubmissionsForForm } from '@/services/submissionService';
import type { FormRecord } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';

export default function UnifiedResponsesPage() {
  const params = useParams();
  const formId = params.formId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState<FormRecord | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAllData = async (formRecord: FormRecord) => {
    setIsRefreshing(true);
    let combinedData: any[] = [];

    try {
      // 1. Fetch Native Submissions (Firestore)
      const nativeSubs = await getSubmissionsForForm(formRecord.id);
      
      const formattedNative = nativeSubs.map(s => {
        const row: any = {
          'Submission Source': 'Leo Portal',
          'Timestamp': s.submittedAt ? format(parseISO(s.submittedAt), 'PPP p') : 'N/A',
          'Respondent': s.respondentName || 'Anonymous',
          'Email': s.respondentEmail || 'N/A',
        };
        
        if (s.data) {
            Object.entries(s.data).forEach(([key, val]) => {
              row[key] = Array.isArray(val) ? val.join(', ') : val;
            });
        }
        
        return row;
      });

      combinedData = [...formattedNative];

      // 2. Fetch External Data if Google Form
      if (formRecord.type === 'google_form' && formRecord.sheetApiUrl) {
        try {
          const externalResults = await getFormResponses(formRecord.sheetApiUrl);
          const formattedExternal = externalResults.map(r => ({
            ...r,
            'Submission Source': 'Google Forms'
          }));
          combinedData = [...combinedData, ...formattedExternal];
        } catch (e) {
          console.error("External fetch failed:", e);
        }
      }

      setResponses(combinedData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load response data.", variant: "destructive" });
    }
    
    setIsRefreshing(false);
    setIsLoading(false);
  };

  useEffect(() => {
    const loadForm = async () => {
      const data = await getForm(formId);
      if (data) {
        setForm(data);
        fetchAllData(data);
      } else {
        router.push('/admin/submissions');
      }
    };
    loadForm();
  }, [formId]);

  const headers = useMemo(() => {
    if (responses.length === 0) return [];
    const keys = new Set<string>();
    responses.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
    
    // Standard priority columns
    const priority = ['Submission Source', 'Timestamp', 'Respondent', 'Email'];
    const others = Array.from(keys).filter(k => !priority.includes(k));
    
    return [...priority.filter(p => keys.has(p)), ...others];
  }, [responses]);

  const filteredResponses = useMemo(() => {
    return responses.filter(r => 
      Object.values(r).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [responses, searchTerm]);

  const handleExportCsv = () => {
    const csv = Papa.unparse(responses);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${form?.title.replace(/\s+/g, '_')}_Responses.csv`;
    link.click();
  };

  const handleExportPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = form?.title || "Form Responses";
    
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on ${format(new Date(), 'PPP p')}`, 14, 28);

    const body = filteredResponses.map(row => headers.map(h => String(row[h] || '')));

    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`${title.replace(/\s+/g, '_')}_Report.pdf`);
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
          <p className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Submission Management</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => form && fetchAllData(form)} disabled={isRefreshing} className="rounded-xl h-11">
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Sync
          </Button>
          <Button variant="outline" onClick={handleExportPdf} disabled={responses.length === 0} className="rounded-xl h-11">
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button onClick={handleExportCsv} disabled={responses.length === 0} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11 px-6 shadow-lg font-bold">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="shadow-xl ring-1 ring-slate-200 border-none overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">{responses.length} Total Submissions</CardTitle>
              <CardDescription>Viewing responses for {form?.title}.</CardDescription>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Filter entries..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-10 h-12 rounded-2xl bg-white border-none ring-1 ring-slate-200"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  {headers.map(h => (
                    <TableHead key={h} className="font-black uppercase text-[10px] tracking-widest text-slate-500 py-6 px-6">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((row, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                    {headers.map(h => (
                      <TableCell key={h} className="py-6 px-6 text-sm font-medium text-slate-700">
                        {h === 'Submission Source' ? (
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase",
                            row[h] === 'Leo Portal' ? 'border-primary text-primary bg-primary/5' : 'border-amber-500 text-amber-600 bg-amber-50'
                          )}>
                            {row[h]}
                          </Badge>
                        ) : (
                          String(row[h] || '—')
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {filteredResponses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={headers.length || 1} className="text-center py-32">
                       <div className="flex flex-col items-center opacity-30">
                          <FileText className="h-12 w-12 mb-4" />
                          <p className="font-bold uppercase tracking-widest text-xs">No entries found</p>
                       </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/50 p-6 border-t flex justify-between items-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Secured LeoPortal Audit Trail
            </p>
            <div className="flex items-center gap-2">
               <Badge variant="secondary" className="bg-primary/10 text-primary font-black h-6">{responses.length} Total</Badge>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
