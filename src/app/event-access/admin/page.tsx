
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
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  PlusCircle, Calendar, MapPin, Settings, Loader2, 
  ExternalLink, Activity, QrCode, MoreVertical, Edit3, Eye
} from 'lucide-react';
import { getPlatformEvents, createPlatformEvent, updatePlatformEvent } from '@/services/accessPlatformService';
import type { AccessEvent } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { format, isValid, parseISO } from 'date-fns';

export default function PlatformAdminOverview() {
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [editingEvent, setEditingEvent] = useState<AccessEvent | null>(null);
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
    } catch (error: any) {
      console.error("DISTRICT_ACCESS_ERROR: Failed to load events:", error);
      toast({ title: "Error", description: "Failed to load event modules.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/event-access/login');
      } else {
        fetchEvents();
      }
    }
  }, [user, authLoading, router]);

  const handleOpenDialog = (event?: AccessEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name,
        date: event.date,
        time: event.time,
        location: event.location,
        description: event.description || '',
        capacity: event.capacity?.toString() || '',
      });
    } else {
      setEditingEvent(null);
      setFormData({ name: '', date: '', time: '', location: '', description: '', capacity: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProcessing(true);
    try {
      const capacityValue = formData.capacity ? parseInt(formData.capacity) : undefined;
      const payload = {
        name: formData.name,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        description: formData.description,
        capacity: isNaN(capacityValue as number) ? undefined : capacityValue,
      };

      if (editingEvent) {
        await updatePlatformEvent(editingEvent.id, payload);
        toast({ title: "Module Updated", description: "Event details have been successfully changed." });
      } else {
        await createPlatformEvent({
          ...payload,
          organizerId: user.id,
        });
        toast({ title: "Module Activated", description: "The district event registration pipeline is ready." });
      }
      
      setIsDialogOpen(false);
      fetchEvents();
    } catch (error: any) {
      console.error("DISTRICT_ACCESS_ERROR: Save failed:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Could not save the event module.", 
        variant: "destructive" 
      });
    }
    setIsProcessing(false);
  };

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b pb-8">
        <div>
          <h1 className="text-4xl font-bold font-headline text-slate-900 tracking-tight uppercase">District Access</h1>
          <p className="text-slate-500 mt-1">Manage registration and entry passes for district-level events.</p>
        </div>
        <Button size="lg" onClick={() => handleOpenDialog()} className="shadow-xl bg-primary hover:bg-primary/90 h-14 px-8 text-lg font-bold">
          <PlusCircle className="mr-2 h-6 w-6" /> Create New Module
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.length > 0 ? (
          events.map(event => {
            const eventDate = parseISO(event.date);
            const formattedDate = isValid(eventDate) ? format(eventDate, 'PPP') : event.date;
            
            return (
              <Card key={event.id} className="hover:shadow-xl transition-all duration-300 border-none bg-white ring-1 ring-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 pb-4">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-4">
                      <CardTitle className="text-xl font-bold text-slate-900 truncate font-headline">{event.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 font-medium mt-1">
                        <Calendar className="h-4 w-4 text-primary" /> {formattedDate}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Module Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleOpenDialog(event)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit Event Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/event-access/admin/${event.id}`)}>
                          <Settings className="mr-2 h-4 w-4" /> Go to Dashboard
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 pb-6">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> {event.location}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold uppercase tracking-wider">
                    <Activity className="h-3 w-3 animate-pulse" /> Live Module Active
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 p-4 border-t bg-white">
                  <Button 
                    className="w-full h-11 font-bold" 
                    onClick={() => router.push(`/event-access/admin/${event.id}`)}
                  >
                    Open Admin Dashboard
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full h-11 border-primary text-primary hover:bg-primary/5 font-bold" 
                    onClick={() => window.open(`/event-access/register/${event.id}`, '_blank')}
                  >
                    <Eye className="mr-2 h-4 w-4" /> View Public Reg Page
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <QrCode className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No Access Modules Yet</h3>
            <p className="text-slate-500">Deploy your first district event registration system above.</p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">
              {editingEvent ? 'Edit District Module' : 'Deploy New Module'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEvent} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. District Installation 2026" />
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
              <Input required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Venue address" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Registration page overview..." />
            </div>
            <div className="space-y-2">
              <Label>Capacity (Optional)</Label>
              <Input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} placeholder="Leave empty for unlimited" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isProcessing} className="h-12 px-6">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingEvent ? "Save Changes" : "Start Module")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
