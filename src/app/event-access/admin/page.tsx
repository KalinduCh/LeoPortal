
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Calendar, MapPin, Settings, Loader2, ExternalLink, Activity, QrCode } from 'lucide-react';
import { getPlatformEvents, createPlatformEvent } from '@/services/accessPlatformService';
import type { AccessEvent } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function PlatformAdminOverview() {
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    description: '',
    capacity: '',
  });

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await getPlatformEvents();
      setEvents(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load event modules.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/event-access/login');
      return;
    }
    fetchEvents();
  }, [user, authLoading]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsCreating(true);
    try {
      await createPlatformEvent({
        ...formData,
        organizerId: user.id,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      });
      toast({ title: "Module Activated", description: "The district event registration pipeline is ready." });
      setIsDialogOpen(false);
      setFormData({ name: '', date: '', time: '', location: '', description: '', capacity: '' });
      fetchEvents();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create module.", variant: "destructive" });
    }
    setIsCreating(false);
  };

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b pb-8">
        <div>
          <h1 className="text-4xl font-bold font-headline text-slate-900 tracking-tight">DISTRICT ACCESS MODULES</h1>
          <p className="text-slate-500 mt-1">Manage registration and entry passes for high-profile district events.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-xl bg-primary hover:bg-primary/90 h-14 px-8 text-lg font-bold">
              <PlusCircle className="mr-2 h-6 w-6" /> Create Event Module
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline">Setup District Module</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Event Name (e.g. District Installation)</Label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Venue Location</Label>
                <Input required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Capacity (Optional)</Label>
                <Input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCreating} className="h-12 px-6">
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deploy Module"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.length > 0 ? (
          events.map(event => (
            <Card key={event.id} className="hover:shadow-2xl transition-all duration-300 border-none bg-white ring-1 ring-slate-200">
              <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold text-slate-900">{event.name}</CardTitle>
                  <Activity className="h-5 w-5 text-emerald-500 animate-pulse" />
                </div>
                <CardDescription className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4 text-primary" /> {format(new Date(event.date), 'PPP')} @ {event.time}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> {event.location}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 italic">{event.description}</p>
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-2 border-t pt-4 bg-slate-50/30">
                <Button variant="outline" size="sm" onClick={() => window.open(`/event-access/register/${event.id}`, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Reg Page
                </Button>
                <Button size="sm" onClick={() => router.push(`/event-access/admin/${event.id}`)}>
                  <Settings className="mr-2 h-4 w-4" /> Dashboard
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <QrCode className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No Access Modules Yet</h3>
            <p className="text-slate-500">Create your first district event module to start accepting registrations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
