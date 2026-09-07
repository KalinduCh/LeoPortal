
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Archive, FolderOpen, ExternalLink, PlusCircle, 
    Loader2, Search, Calendar, ChevronRight, FileText,
    UploadCloud, Trash2, Edit3, Settings, AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getReportsByYear, updateMonthlyReport, addFileToReport } from '@/services/reportingService';
import type { MonthlyReport, ReportFile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const ROOT_FOLDER_URL = "https://drive.google.com/drive/folders/1I8Y0H9tN-jV05qU10QnbnxQLGwMRCpsC?usp=share_link";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function MonthlyReportingTab() {
    const { toast } = useToast();
    const [reports, setReports] = useState<MonthlyReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    // Manage Folder Dialog
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configData, setConfigConfig] = useState({ month: 0, folderUrl: '' });
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    // Manage Files Dialog
    const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
    const [isFilesOpen, setIsFilesOpen] = useState(false);
    const [newFileData, setNewFileData] = useState({ name: '', url: '' });
    const [isAddingFile, setIsAddingFile] = useState(false);

    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getReportsByYear(selectedYear);
            setReports(data);
        } catch (error) {
            toast({ title: "Error", description: "Failed to load reports.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [selectedYear, toast]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        try {
            await updateMonthlyReport(configData.month, selectedYear, { folderUrl: configData.folderUrl });
            toast({ title: "Folder Configured", description: "Monthly repository link updated successfully." });
            setIsConfigOpen(false);
            fetchReports();
        } catch (error) {
            toast({ title: "Error", description: "Could not save configuration.", variant: "destructive" });
        }
        setIsSavingConfig(false);
    };

    const handleAddFile = async () => {
        if (!selectedReport || !newFileData.name || !newFileData.url) return;
        setIsAddingFile(true);
        try {
            const newFile: ReportFile = {
                ...newFileData,
                uploadedAt: new Date().toISOString()
            };
            await addFileToReport(selectedReport.id, newFile);
            toast({ title: "File Added", description: "Report file link registered." });
            setNewFileData({ name: '', url: '' });
            fetchReports();
            // Update local state for immediate feedback
            setSelectedReport(prev => prev ? { ...prev, files: [...prev.files, newFile] } : null);
        } catch (error) {
            toast({ title: "Error", description: "Could not add file.", variant: "destructive" });
        }
        setIsAddingFile(false);
    };

    const years = [2024, 2025, 2026];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Monthly Reporting Archive</h2>
                    <p className="text-sm text-slate-500 font-medium">Manage and organize periodic club reports in Google Drive.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-32 h-11 rounded-xl font-bold bg-white">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="h-11 rounded-xl font-bold border-primary text-primary hover:bg-primary/5 shadow-sm" onClick={() => window.open(ROOT_FOLDER_URL, '_blank')}>
                        <FolderOpen className="mr-2 h-4 w-4" /> Open Master Drive
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {MONTHS.map((monthName, index) => {
                        const report = reports.find(r => r.month === index);
                        return (
                            <Card key={monthName} className="group hover:shadow-xl transition-all duration-300 border-none ring-1 ring-slate-200 bg-white rounded-3xl overflow-hidden flex flex-col">
                                <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <CardTitle className="text-lg font-black uppercase tracking-tight">{monthName}</CardTitle>
                                        </div>
                                        {report && report.folderUrl && (
                                            <Badge className="bg-emerald-500 text-white font-black text-[9px] uppercase px-2 py-0.5 border-none shadow-sm">Configured</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4 flex-grow">
                                    <div className="flex flex-col gap-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Status</p>
                                        {report ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                                                    <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" /> {report.files.length} Files Tracked</span>
                                                    <span className="text-[9px] text-slate-400 font-medium">Last: {new Date(report.updatedAt).toLocaleDateString()}</span>
                                                </div>
                                                <Button variant="ghost" className="w-full justify-start text-xs font-bold text-primary hover:bg-primary/5 h-9 rounded-lg" onClick={() => { setSelectedReport(report); setIsFilesOpen(true); }}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Manage Report Files
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="py-4 text-center space-y-2">
                                                <p className="text-xs text-slate-400 italic">No configuration found for this month.</p>
                                                <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/5 h-8" onClick={() => { setConfigConfig({ month: index, folderUrl: '' }); setIsConfigOpen(true); }}>
                                                    Setup Module
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 border-t bg-slate-50/30 gap-2">
                                    <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold text-xs" disabled={!report?.folderUrl} onClick={() => report?.folderUrl && window.open(report.folderUrl, '_blank')}>
                                        <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Folder
                                    </Button>
                                    <Button variant="secondary" size="icon" className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200" onClick={() => { setConfigConfig({ month: index, folderUrl: report?.folderUrl || '' }); setIsConfigOpen(true); }}>
                                        <Settings className="h-4 w-4 text-slate-600" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Folder Configuration Dialog */}
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-headline uppercase text-slate-900 tracking-tight">Setup Reporting Folder</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">Link this month to a specific Google Drive repository.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex gap-3">
                            <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                            <p className="text-[10px] leading-relaxed text-slate-600 font-medium">
                                Paste the direct Google Drive link for the <strong>{MONTHS[configData.month]} {selectedYear}</strong> sub-folder here. This ensures all report uploads are centralized.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Drive Folder URL</Label>
                            <Input value={configData.folderUrl} onChange={e => setConfigConfig(p => ({...p, folderUrl: e.target.value}))} placeholder="https://drive.google.com/..." className="h-12 rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsConfigOpen(false)} className="rounded-xl h-12 flex-1">Cancel</Button>
                        <Button onClick={handleSaveConfig} disabled={isSavingConfig} className="rounded-xl h-12 flex-1 font-black shadow-lg">
                            {isSavingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Configuration"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* File Management Dialog */}
            <Dialog open={isFilesOpen} onOpenChange={setIsFilesOpen}>
                <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden">
                    <div className="bg-slate-900 p-8 text-white">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Month Files Registry</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium">{selectedReport ? `${MONTHS[selectedReport.month]} ${selectedReport.year}` : ''} Reporting Dashboard</DialogDescription>
                    </div>
                    <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Track New File Link</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-700">File Description</Label>
                                    <Input value={newFileData.name} onChange={e => setNewFileData(p => ({...p, name: e.target.value}))} placeholder="e.g. Secretary Report" className="h-11 rounded-xl" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-700">Drive URL</Label>
                                    <Input value={newFileData.url} onChange={e => setNewFileData(p => ({...p, url: e.target.value}))} placeholder="Paste link..." className="h-11 rounded-xl" />
                                </div>
                                <Button className="sm:col-span-2 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg" onClick={handleAddFile} disabled={isAddingFile || !newFileData.name || !newFileData.url}>
                                    {isAddingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Register File Link
                                </Button>
                            </div>
                        </div>

                        <Separator className="bg-slate-100" />

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Registered Files ({selectedReport?.files.length || 0})</h3>
                            <div className="space-y-3">
                                {selectedReport?.files.map((file, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white hover:shadow-md transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{file.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Added: {new Date(file.uploadedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/5 rounded-xl" onClick={() => window.open(file.url, '_blank')}>
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {(!selectedReport || selectedReport.files.length === 0) && (
                                    <div className="py-10 text-center space-y-2 opacity-30">
                                        <Archive className="h-10 w-10 mx-auto" />
                                        <p className="text-xs font-bold uppercase tracking-widest">No links registered</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 border-t flex justify-end">
                        <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsFilesOpen(false)}>Close Registry</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
