"use client";

import React, { useState, useEffect, useMemo, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, CheckCircle, Clock, Download, QrCode, Search, 
  Loader2, Trash2, ArrowLeft, BarChart3, Upload, Mail
} from 'lucide-react';
import { getAccessEvent, subscribeToRegistrations, deleteRegistration } from '@/services/accessManagementService';
import type { AccessEvent, AccessRegistration, RegistrationStats, ClubBreakdown } from '@/types/access-management';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function EventDashboard() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [event, setEvent] = useState<AccessEvent | null>(null);
  const [registrations, setRegistrations] = useState<AccessRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      const data = await getAccessEvent(eventId);
      if (data) setEvent(data);
      else router.push('/admin/access-management');
    };

    fetchEvent();

    const unsubscribe = subscribeToRegistrations(eventId, (data) => {
      setRegistrations(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [eventId]);

  const stats: RegistrationStats = useMemo(() => {
    const total = registrations.length;
    const checkedIn = registrations.filter(r => r.status === 'checked_in').length;
    return {
      total,
      checkedIn,
      remaining: total - checkedIn,
      percentage: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
    };
  }, [registrations]);

  const clubBreakdown: ClubBreakdown[] = useMemo(() => {
    const map: Record<string, { reg: number; check: number }> = {};
    registrations.forEach(r => {
      const club = r.club || 'Individual';
      if (!map[club]) map[club] = { reg: 0, check: 0 };
      map[club].reg++;
      if (r.status === 'checked_in') map[club].check++;
    });
    return Object.entries(map)
      .map(([club, counts]) => ({ club, registered: counts.reg, checkedIn: counts.check }))
      .sort((a, b) => b.registered - a.registered);
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.club.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [registrations, searchTerm]);

  const handleExport = () => {
    const data = registrations.map(r => ({
      'Ticket ID': r.ticketId,
      'Name': r.name,
      'Email': r.email,
      'Club': r.club,
      'Role': r.role,
      'Status': r.status === 'checked_in' ? 'Checked In' : 'Registered',
      'Check-In Time': r.checkInTime ? format(parseISO(r.checkInTime), 'PPP p') : 'N/A'
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event?.name.replace(/\s+/g, '_')}_registrations.csv`;
    link.click();
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;
        let errorCount = 0;

        for (const row of results.data as any[]) {
          try {
            if (!row.Name || !row.Email) continue;
            
            const response = await fetch('/api/access-management/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventId,
                name: row.Name,
                email: row.Email,
                club: row.Club || 'Default',
                role: row.Role || 'Member'
              }),
            });

            if (response.ok) successCount++;
            else errorCount++;
          } catch (err) {
            errorCount++;
          }
        }

        toast({
          title: "Import Complete",
          description: `Successfully imported ${successCount} guests. ${errorCount > 0 ? `${errorCount} errors.` : ''}`
        });
        setIsSubmitting(false);
        e.target.value = '';
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this registration?")) return;
    try {
      await deleteRegistration(id);
      toast({ title: "Registration Removed" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  if (isLoading || !event) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/access-management')} className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to modules
          </Button>
          <h1 className="text-3xl font-bold font-headline">{event.name}</h1>
          <p className="text-muted-foreground">Access Management & Check-in Dashboard</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button onClick={() => router.push(`/admin/access-management/${eventId}/scan`)} className="bg-primary">
            <QrCode className="mr-2 h-4 w-4" /> Start Scanning
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Registered" value={stats.total} icon={Users} color="text-blue-600" />
        <StatCard title="Checked In" value={stats.checkedIn} icon={CheckCircle} color="text-green-600" />
        <StatCard title="Remaining" value={stats.remaining} icon={Clock} color="text-orange-600" />
        <StatCard title="Attendance Rate" value={`${stats.percentage}%`} icon={BarChart3} color="text-purple-600" />
      </div>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px] mb-6">
          <TabsTrigger value="live">Live Check-in</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Recent Check-ins</CardTitle>
                <CardDescription>Real-time updates of scanned tickets.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {registrations.filter(r => r.status === 'checked_in').slice(0, 10).map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900/30">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.club} • {r.role}</p>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">
                        {r.checkInTime ? format(parseISO(r.checkInTime), 'h:mm:ss a') : ''}
                      </p>
                    </div>
                  ))}
                  {registrations.filter(r => r.status === 'checked_in').length === 0 && (
                    <p className="text-center py-10 text-muted-foreground italic">No check-ins logged yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Club-wise Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Club</TableHead>
                      <TableHead className="text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clubBreakdown.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium pl-6">{c.club}</TableCell>
                        <TableCell className="text-right pr-6">
                          <span className="text-primary font-bold">{c.checkedIn}</span>
                          <span className="text-muted-foreground"> / {c.registered}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="registrations">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Master Guest List</CardTitle>
                <CardDescription>Search and manage all registrants.</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search name, club..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="relative">
                  <Input type="file" accept=".csv" className="hidden" id="csv-import" onChange={handleCsvImport} disabled={isProcessing} />
                  <Button variant="outline" asChild disabled={isProcessing}>
                    <label htmlFor="csv-import" className="cursor-pointer">
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Bulk Import
                    </label>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest Info</TableHead>
                      <TableHead>Club & Role</TableHead>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{r.club}</p>
                          <p className="text-xs text-muted-foreground">{r.role}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-primary">{r.ticketId}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'checked_in' ? 'default' : 'secondary'} className={r.status === 'checked_in' ? 'bg-green-600 text-white' : ''}>
                            {r.status === 'checked_in' ? 'Scanned' : 'Registered'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Check-in Progress</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clubBreakdown.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="club" type="category" width={100} fontSize={12} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="registered" fill="#e2e8f0" radius={[0, 4, 4, 0]} name="Registered" />
                    <Bar dataKey="checkedIn" fill="#2563eb" radius={[0, 4, 4, 0]} name="Checked In" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Role Distribution</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground text-sm italic">Visual breakdown of roles (President, Secretary, etc.) coming soon.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-full bg-muted/50 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}