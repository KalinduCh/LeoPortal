
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, CheckCircle, Clock, Download, QrCode, Search, 
  Loader2, Trash2, ArrowLeft, BarChart3, Upload, Mail, ShieldAlert, Phone, Utensils, FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { getPlatformEvent, subscribeToPlatformRegistrations, deletePlatformRegistration } from '@/services/accessPlatformService';
import type { AccessEvent, AccessRegistration, AccessPlatformStats } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import Papa from 'papaparse';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

export default function PlatformEventDashboard() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<AccessEvent | null>(null);
  const [registrations, setRegistrations] = useState<AccessRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/event-access/login'); return; }

    const fetchEvent = async () => {
      const data = await getPlatformEvent(eventId);
      if (data) setEvent(data);
      else router.push('/event-access/admin');
    };

    fetchEvent();

    const unsubscribe = subscribeToPlatformRegistrations(eventId, (data) => {
      setRegistrations(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [eventId, user, authLoading, router]);

  const stats: AccessPlatformStats = useMemo(() => {
    const total = registrations.length;
    const checkedIn = registrations.filter(r => r.status === 'checked_in').length;
    return {
      total,
      checkedIn,
      remaining: total - checkedIn,
      percentage: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
    };
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.contactNumber.includes(searchTerm)
    );
  }, [registrations, searchTerm]);

  const handleExport = () => {
    const data = registrations.map(r => ({
      'Ticket ID': r.ticketId,
      'Name': r.name,
      'Email': r.email,
      'Contact': r.contactNumber,
      'Club': r.club,
      'Type': r.role,
      'Food': r.foodPreference === 'veg' ? 'Vegetarian' : 'Non-Vegetarian',
      'Status': r.status === 'checked_in' ? 'Checked In' : 'Registered',
      'Check-In Time': r.checkInTime ? format(parseISO(r.checkInTime), 'PPP p') : 'N/A'
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event?.name.replace(/\s+/g, '_')}_LeoEntrivo_Export.csv`;
    link.click();
  };

  const downloadSampleCsv = () => {
    const sampleData = [
      {
        Name: "John Doe",
        Email: "john.doe@example.com",
        Club: "Leo Club of Athugalpura",
        Contact: "0712345678",
        Type: "Leo",
        Food: "non_veg"
      },
      {
        Name: "Jane Smith",
        Email: "jane.smith@example.com",
        Club: "Lions Club of Athugalpura",
        Contact: "0771234567",
        Type: "Lion",
        Food: "veg"
      }
    ];
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "LeoEntrivo_Bulk_Import_Sample.csv";
    link.click();
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;
        let errorCount = 0;

        for (const row of results.data as any[]) {
          try {
            if (!row.Name || !row.Email) continue;
            
            const response = await fetch('/api/access-platform/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventId,
                eventName: event?.name,
                eventDate: event?.date,
                eventTime: event?.time,
                eventLocation: event?.location,
                name: row.Name,
                email: row.Email,
                club: row.Club || 'Individual',
                contactNumber: row.Contact || '',
                role: row.Type || 'Leo',
                foodPreference: (row.Food?.toLowerCase().includes('veg') && !row.Food?.toLowerCase().includes('non')) ? 'veg' : 'non_veg'
              }),
            });

            if (response.ok) successCount++;
            else errorCount++;
          } catch (err) {
            errorCount++;
          }
        }

        toast({
          title: "Import Finished",
          description: `Imported ${successCount} entries. ${errorCount > 0 ? `${errorCount} errors.` : ''}`
        });
        setIsImporting(false);
        e.target.value = '';
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Revoke this registration pass permanently?")) return;
    try {
      await deletePlatformRegistration(id);
      toast({ title: "Pass Revoked" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete registration.", variant: "destructive" });
    }
  };

  if (isLoading || !event) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push('/event-access/admin')} className="pl-0 text-primary font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold font-headline tracking-tight text-slate-900 uppercase">{event.name}</h1>
          <p className="text-slate-500 uppercase text-xs tracking-widest font-black">LeoEntrivo Command Center</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExport} className="h-12"><Download className="mr-2 h-4 w-4" /> Export Ledger</Button>
          <Button onClick={() => router.push(`/event-access/scan/${eventId}`)} className="h-12 bg-primary shadow-lg font-bold">
            <QrCode className="mr-2 h-4 w-4" /> Open Entrance Scanner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <PlatformStatCard title="Total Registrations" value={stats.total} icon={Users} color="text-blue-600" />
        <PlatformStatCard title="Checked In" value={stats.checkedIn} icon={CheckCircle} color="text-emerald-600" />
        <PlatformStatCard title="Remaining" value={stats.remaining} icon={Clock} color="text-amber-600" />
        <PlatformStatCard title="Attendance Rate" value={`${stats.percentage}%`} icon={BarChart3} color="text-violet-600" />
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-8 h-12 bg-slate-100 p-1.5 rounded-xl ring-1 ring-slate-200">
          <TabsTrigger value="list" className="font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Guest List</TabsTrigger>
          <TabsTrigger value="live" className="font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Live Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Attendee Registry</CardTitle>
                <CardDescription>Search and manage all issued passes.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={downloadSampleCsv}
                  className="text-xs text-primary font-bold hover:bg-primary/5"
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Format Sample
                </Button>
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search name, club..." className="pl-9 h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="relative">
                  <Input type="file" accept=".csv" className="hidden" id="bulk-import" onChange={handleBulkImport} disabled={isImporting} />
                  <Button variant="secondary" asChild disabled={isImporting} className="h-10">
                    <label htmlFor="bulk-import" className="cursor-pointer">
                      {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Bulk CSV
                    </label>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold">Guest Info</TableHead>
                      <TableHead className="font-bold">Club & Type</TableHead>
                      <TableHead className="font-bold">Meal</TableHead>
                      <TableHead className="font-bold">Ticket ID</TableHead>
                      <TableHead className="font-bold">Email Status</TableHead>
                      <TableHead className="font-bold">Entry Status</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map(r => (
                      <TableRow key={r.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <p className="font-bold text-slate-900">{r.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-tighter">
                            <Mail className="h-3 w-3" /> {r.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{r.club}</p>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">{r.role}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={r.foodPreference === 'veg' ? 'outline' : 'secondary'} className={r.foodPreference === 'veg' ? 'border-emerald-500 text-emerald-600' : ''}>
                                {r.foodPreference === 'veg' ? 'Veg' : 'Non-Veg'}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-primary font-bold">{r.ticketId}</TableCell>
                        <TableCell>
                            <Badge 
                                variant={r.emailStatus === 'success' ? 'outline' : 'destructive'} 
                                className={cn("text-[10px] font-bold uppercase", r.emailStatus === 'success' ? 'text-emerald-600 border-emerald-500' : '')}
                            >
                                {r.emailStatus === 'success' ? 'Delivered' : r.emailStatus === 'failed' ? 'Failed' : 'Sending...'}
                            </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'checked_in' ? 'default' : 'secondary'} className={r.status === 'checked_in' ? 'bg-emerald-600 text-white' : ''}>
                            {r.status === 'checked_in' ? 'Arrived' : 'Registered'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRegistrations.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400 italic">No guests found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-slate-200 bg-white">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-lg">Real-Time Arrivals</CardTitle>
              <CardDescription>Live check-in stream from entrance stations.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {registrations.filter(r => r.status === 'checked_in').slice(0, 12).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-4 border rounded-xl bg-emerald-50/30 border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{r.name}</p>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", r.foodPreference === 'veg' ? 'text-emerald-600' : 'text-slate-400')}>
                            {r.foodPreference === 'veg' ? 'Vegetarian' : 'Standard'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono font-bold text-emerald-600 bg-white px-2 py-1 rounded shadow-sm">
                      {r.checkInTime ? format(parseISO(r.checkInTime), 'h:mm a') : ''}
                    </p>
                  </div>
                ))}
                {registrations.filter(r => r.status === 'checked_in').length === 0 && (
                  <div className="col-span-full py-24 text-center text-slate-400">
                    <ShieldAlert className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="font-bold">Station Active. Waiting for entries...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlatformStatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="shadow-lg border-none ring-1 ring-slate-200 bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
          <div className={`p-4 rounded-2xl bg-slate-50 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
