"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Archive, FolderOpen, ExternalLink, PlusCircle, 
    Loader2, Calendar, UploadCloud,
    Settings, RefreshCw, Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getReportsByYear, updateMonthlyReport } from '@/services/reportingService';
import type { MonthlyReport } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const MASTER_DRIVE_LINK = "https://drive.google.com/drive/folders/1I8Y0H9tN-jV05qU10QnbnxQLGwMRCpsC?usp=share_link";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function MonthlyReportingTab() {
    const { toast } = useToast();
    const [reports, setReports] = useState<MonthlyReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    // Dialog State
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configData, setConfigData] = useState({ month: 0, viewUrl: '', uploadUrl: '' });
    const [isSaving, setIsSaving] = useState(false);

    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getReportsByYear(selectedYear);
            setReports(data);
        } catch (error) {
            toast({ title: "Fetch Error", description: "Could not load reporting archive.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [selectedYear, toast]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            // Optimistic Update
            const reportId = `${selectedYear}-${configData.month}`;
            const updatedReport: MonthlyReport = {
                id: reportId,
                month: configData.month,
                year: selectedYear,
                viewUrl: configData.viewUrl,
                uploadUrl: configData.uploadUrl,
                updatedAt: new Date().toISOString()
            };
            
            setReports(prev => {
                const filtered = prev.filter(r => r.id !== reportId);
                return [...filtered, updatedReport].sort((a,b) => a.month - b.month);
            });

            await updateMonthlyReport(configData.month, selectedYear, { 
                viewUrl: configData.viewUrl, 
                uploadUrl: configData.uploadUrl 
            });
            
            toast({ title: "Module Updated", description: `Reporting links for ${MONTHS[configData.month]} have been synchronized.` });
            setIsConfigOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Operation failed. Check permissions.", variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleOpenSetup = (monthIndex: number, report?: MonthlyReport) => {
        setConfigData({
            month: monthIndex,
            viewUrl: report?.viewUrl || '',
            uploadUrl: report?.uploadUrl || ''
        });
        setIsConfigOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Periodic Reporting Hub</h2>
                    <p className="text-sm text-slate-500 font-medium">Configure easy-access links for monthly club documentation.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={fetchReports} disabled={isLoading} className="h-11 w-11 rounded-xl">
                        <RefreshCw className={cn("h-4 w-4 text-slate-400", isLoading && "animate-spin")} />
                    </Button>
                    <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-32 h-11 rounded-xl font-bold bg-white">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="h-11 rounded-xl font-bold border-primary text-primary hover:bg-primary/5 shadow-sm" onClick={() => window.open(MASTER_DRIVE_LINK, '_blank')}>
                        <FolderOpen className="mr-2 h-4 w-4" /> Open Master Drive
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="py-32 flex flex-col items-center justify-center space-y-4 text-slate-400">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-xs font-black uppercase tracking-widest">Syncing Archive Database...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {MONTHS.map((monthName, index) => {
                        const report = reports.find(r => r.month === index);
                        const isSet = report && (report.viewUrl || report.uploadUrl);

                        return (
                            <Card key={monthName} className="group hover:shadow-xl transition-all duration-300 border-none ring-1 ring-slate-200 bg-white rounded-[2rem] overflow-hidden flex flex-col">
                                <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <CardTitle className="text-lg font-black uppercase tracking-tight">{monthName}</CardTitle>
                                        </div>
                                        {isSet ? (
                                            <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase px-3 py-1 border-none shadow-sm">Archive Ready</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-slate-200 text-slate-500 font-black text-[9px] uppercase px-3 py-1 border-none">Awaiting Setup</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6 flex-grow">
                                    <div className="grid grid-cols-1 gap-3">
                                        <Button 
                                            className={cn("w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all", !report?.uploadUrl && "opacity-40 grayscale")}
                                            disabled={!report?.uploadUrl}
                                            onClick={() => report?.uploadUrl && window.open(report.uploadUrl, '_blank')}
                                        >
                                            <UploadCloud className="mr-2 h-4 w-4" /> Upload Report
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className={cn("w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest transition-all", !report?.viewUrl && "opacity-40 grayscale")}
                                            disabled={!report?.viewUrl}
                                            onClick={() => report?.viewUrl && window.open(report.viewUrl, '_blank')}
                                        >
                                            <FolderOpen className="mr-2 h-4 w-4 text-primary" /> View Folder
                                        </Button>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 border-t bg-slate-50/30">
                                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-primary/5 hover:text-primary transition-colors h-8" onClick={() => handleOpenSetup(index, report)}>
                                        <Settings className="mr-2 h-3.5 w-3.5" /> Configure Module
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Configuration Dialog */}
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-headline uppercase text-slate-900 tracking-tight">Configure Module</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">Link {MONTHS[configData.month]} {selectedYear} to the reporting repository.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="bg-primary/5 p-5 rounded-[1.5rem] border border-primary/10 flex gap-4">
                            <Info className="h-6 w-6 text-primary shrink-0" />
                            <p className="text-[11px] leading-relaxed text-slate-600 font-medium italic">
                                Admins: Please paste the Google Drive "Contributor" link for uploads and the "Viewer" link for viewing the archive.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Upload Link (Contributor)</Label>
                                <Input value={configData.uploadUrl} onChange={e => setConfigData(p => ({...p, uploadUrl: e.target.value}))} placeholder="https://drive.google.com/..." className="h-12 rounded-xl bg-slate-50" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">View Link (Viewer)</Label>
                                <Input value={configData.viewUrl} onChange={e => setConfigData(p => ({...p, viewUrl: e.target.value}))} placeholder="https://drive.google.com/..." className="h-12 rounded-xl bg-slate-50" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsConfigOpen(false)} className="rounded-xl h-12 flex-1">Cancel</Button>
                        <Button onClick={handleSaveConfig} disabled={isSaving} className="rounded-xl h-12 flex-1 font-black shadow-lg">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Links"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}