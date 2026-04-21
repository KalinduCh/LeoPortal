"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, CheckCircle, Clock, Download, QrCode, Search, 
  Loader2, Trash2, ArrowLeft, BarChart3, Mail, ShieldAlert, 
  ShieldCheck, PieChart as PieChartIcon, Utensils, Zap, AlertTriangle
} from 'lucide-react';
import { getPlatformEvent, subscribeToPlatformRegistrations, deletePlatformRegistration } from '@/services/accessPlatformService';
import type { AccessEvent, AccessRegistration, AccessPlatformStats } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import Papa from 'papaparse';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from 'recharts';

const CHART_COLORS = ["#2563eb", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"];

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  // Basic Stats
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

  // Visual Data: Club Breakdown
  const clubData = useMemo(() => {
    const map: Record<string, { reg: number, check: number }> = {};
    registrations.forEach(r => {
      const clubName = r.club || 'Other';
      if (!map[clubName]) map[clubName] = { reg: 0, check: 0 };
      map[clubName].reg++;
      if (r.status === 'checked_in') map[clubName].check++;
    });

    return Object.entries(map)
      .map(([name, counts]) => ({ 
        name: name.replace('Leo Club of ', ''), 
        registered: counts.reg, 
        arrived: counts.check 
      }))
      .sort((a, b) => b.registered - a.registered)
      .slice(0, 8);
  }, [registrations]);

  // Visual Data: Role Mix
  const roleMixData = useMemo(() => {
    const map: Record<string, number> = {};
    registrations.forEach(r => {
      map[r.role] = (map[r.role] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [registrations]);

  // Visual Data: Meal Distribution
  const mealData = useMemo(() => {
    let veg = 0;
    let nonVeg = 0;
    registrations.forEach(r => {
      if (r.foodPreference === 'veg') veg++;
      else nonVeg++;
    });
    return [
      { name: 'Vegetarian', value: veg, color: '#10b981' },
      { name: 'Non-Vegetarian', value: nonVeg, color: '#f59e0b' }
    ];
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
    const data = registrations.map(r => {
      const checkInParsed = r.checkInTime ? parseISO(r.checkInTime) : null;
      return {
        'Ticket ID': r.ticketId,
        'Name': r.name,
        'Email': r.email,
        'Contact': r.contactNumber,
        'Club': r.club,
        'Type': r.role,
        'Food': r.foodPreference === 'veg' ? 'Vegetarian' : 'Non-Vegetarian',
        'Status': r.status === 'checked_in' ? 'Checked In' : 'Registered',
        'Check-In Time': (checkInParsed && isValid(checkInParsed)) ? format(checkInParsed, 'PPP p') : 'N/A',
        'Registered By': r.registeredBy ? `${r.registeredBy.name} (${r.registeredBy.club})` : 'Self'
      };
    });
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event?.name.replace(/\s+/g, '_')}_LeoEntrivo_Export.csv`;
    link.click();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Revoke this registration pass permanently?")) return;
    try {
      await deletePlatformRegistration(id);
      setSelectedIds(prev => prev.filter(item => item !== id));
      toast({ title: "Pass Revoked" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete registration.", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to permanently revoke ${selectedIds.length} registration passes? This cannot be undone.`)) return;
    
    setIsBulkDeleting(true);
    let successCount = 0;
    
    for (const id of selectedIds) {
        try {
            await deletePlatformRegistration(id);
            successCount++;
        } catch (error) {
            console.error("Bulk Delete Item Error:", id, error);
        }
    }
    
    toast({ 
        title: "Bulk Revoke Complete", 
        description: `Successfully removed ${successCount} entries.` 
    });
    
    setSelectedIds([]);
    setIsBulkDeleting(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedIds(filteredRegistrations.map(r => r.id));
    } else {
        setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
        setSelectedIds(prev => [...prev, id]);
    } else {
        setSelectedIds(prev => prev.filter(item => item !== id));
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
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
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
        <PlatformStatCard title="Attendance Rate" value={`${stats.percentage}%`} icon={Zap} color="text-violet-600" />
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[500px] mb-8 h-12 bg-slate-100 p-1.5 rounded-xl ring-1 ring-slate-200">
          <TabsTrigger value="list" className="font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Guest List</TabsTrigger>
          <TabsTrigger value="live" className="font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Live Feed</TabsTrigger>
          <TabsTrigger value="analytics" className="font-bold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-lg animate-in slide-in-from-top-4">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <span className="font-bold">{selectedIds.length} entries selected</span>
                </div>
                <Button 
                    variant="destructive" 
                    size="sm" 
                    className="font-bold px-6 h-10 shadow-lg"
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                >
                    {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Revoke Selected Passes
                </Button>
            </div>
          )}

          <Card className="shadow-xl border-none ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Attendee Registry</CardTitle>
                <CardDescription>Manage and search all issued passes.</CardDescription>
              </div>
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search name, club..." className="pl-9 h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-12 px-6">
                        <Checkbox 
                            checked={filteredRegistrations.length > 0 && selectedIds.length === filteredRegistrations.length}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                      </TableHead>
                      <TableHead className="font-bold">Guest Info</TableHead>
                      <TableHead className="font-bold">Club & Type</TableHead>
                      <TableHead className="font-bold">Meal</TableHead>
                      <TableHead className="font-bold">Ticket ID</TableHead>
                      <TableHead className="font-bold">Entry Status</TableHead>
                      <TableHead className="text-right font-bold pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map(r => (
                        <TableRow key={r.id} className={cn("hover:bg-slate-50/50 transition-colors", selectedIds.includes(r.id) && "bg-slate-100")}>
                          <TableCell className="px-6">
                            <Checkbox 
                                checked={selectedIds.includes(r.id)}
                                onCheckedChange={(checked) => handleSelectRow(r.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{r.name}</p>
                              {r.registeredBy && (
                                <TooltipProvider>
                                  <UITooltip>
                                    <TooltipTrigger>
                                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs font-bold">Bulk Registration</p>
                                      <p className="text-[10px] opacity-70">Officer: {r.registeredBy.name} ({r.registeredBy.club})</p>
                                    </TooltipContent>
                                  </UITooltip>
                                </TooltipProvider>
                              )}
                            </div>
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
                            <Badge variant={r.status === 'checked_in' ? 'default' : 'secondary'} className={r.status === 'checked_in' ? 'bg-emerald-600 text-white' : ''}>
                              {r.status === 'checked_in' ? 'Arrived' : 'Registered'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                    ))}
                    {filteredRegistrations.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400 italic">No guests found matching search criteria.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-slate-200 bg-white">
            <CardHeader className="bg-slate-50/50 flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Real-Time Arrivals</CardTitle>
                <CardDescription>Live check-in stream from entrance stations.</CardDescription>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Station Active</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {registrations.filter(r => r.status === 'checked_in').slice(0, 15).map(r => {
                  const checkInParsed = r.checkInTime ? parseISO(r.checkInTime) : null;
                  return (
                    <div key={r.id} className="group flex items-center justify-between p-4 border rounded-2xl bg-white hover:border-primary/30 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                          <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{r.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-tighter truncate max-w-[120px]">{r.club.replace('Leo Club of ', '')}</p>
                          <div className="flex gap-1.5 mt-1">
                             <Badge variant="outline" className={cn("text-[8px] font-black px-1.5 h-4", r.foodPreference === 'veg' ? 'border-emerald-500 text-emerald-600' : 'text-slate-400')}>
                                {r.foodPreference === 'veg' ? 'VEG' : 'NON-VEG'}
                             </Badge>
                             <Badge variant="secondary" className="text-[8px] font-black px-1.5 h-4">{r.role.toUpperCase()}</Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        {(checkInParsed && isValid(checkInParsed)) ? format(checkInParsed, 'h:mm a') : 'Now'}
                      </p>
                    </div>
                  );
                })}
                {registrations.filter(r => r.status === 'checked_in').length === 0 && (
                  <div className="col-span-full py-24 text-center text-slate-400">
                    <ShieldAlert className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">Waiting for first entry...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-xl border-none ring-1 ring-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" /> Top Clubs by Registration
                    </CardTitle>
                    <CardDescription>Breakdown of participation density across district clubs.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={clubData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" axisLine={false} tickLine={false} fontSize={10} stroke="#94a3b8" />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} width={100} stroke="#475569" />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="registered" fill="#e2e8f0" radius={[0, 4, 4, 0]} name="Total Reg" barSize={12} />
                            <Bar dataKey="arrived" fill="#2563eb" radius={[0, 4, 4, 0]} name="Actual Arrivals" barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6">
                <Card className="shadow-xl border-none ring-1 ring-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-primary" /> Registration Mix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px] pt-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={roleMixData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={50} outerRadius={80} 
                                    paddingAngle={5} dataKey="value"
                                >
                                    {roleMixData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Legend verticalAlign="bottom" align="center" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-xl border-none ring-1 ring-slate-200 bg-slate-900 text-white">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-primary">
                            <Utensils className="h-5 w-5" /> Catering Estimates
                        </CardTitle>
                        <CardDescription className="text-slate-400">Projected meal requirements for standard catering.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {mealData.map(meal => (
                            <div key={meal.name} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{meal.name}</p>
                                    <p className="text-xl font-black">{meal.value} <span className="text-[10px] text-slate-500 font-medium">Guests</span></p>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full transition-all duration-1000" 
                                        style={{ width: `${(meal.value / (stats.total || 1)) * 100}%`, backgroundColor: meal.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlatformStatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="shadow-lg border-none ring-1 ring-slate-200 bg-white group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
          <div className={cn("p-4 rounded-2xl bg-slate-50 transition-colors duration-300 group-hover:bg-slate-100", color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
