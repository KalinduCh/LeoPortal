"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Calendar, MapPin, Users, Loader2, ExternalLink, Settings } from 'lucide-react';
import { getAccessEvents, createAccessEvent } from '@/services/accessManagementService';
import type { AccessEvent } from '@/types/access-management';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

export default function AccessManagementOverview() {
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      const data = await getAccessEvents();
      setEvents(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load events.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await createAccessEvent({
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      });
      toast({ title: "Event Created", description: "The access management pipeline is ready." });
      setIsDialogOpen(false);
      setFormData({ name: '', date: '', time: '', location: '', description: '', capacity: '' });
      fetchEvents();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create event.", variant: "destructive" });
    }
    setIsCreating(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Event Access System</h1>
          <p className="text-muted-foreground">Manage registration, ticketing, and scanning for major club events.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-md">
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Module
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Event Module</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Installation 2026" />
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
                <Label>Location</Label>
                <Input required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Venue address" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Short overview..." />
              </div>
              <div className="space-y-2">
                <Label>Capacity (Optional)</Label>
                <Input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} placeholder="Unlimited if empty" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Start Module"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
        ) : events.length > 0 ? (
          events.map(event => (
            <Card key={event.id} className="hover:shadow-lg transition-all border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-xl">{event.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> {format(new Date(event.date), 'PPP')} @ {event.time}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" /> {event.location}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" /> {event.capacity ? `${event.capacity} Capacity` : 'Unlimited Capacity'}
                </div>
              </CardContent>
              <DialogFooter className="p-4 border-t bg-muted/10">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/access-management/register/${event.id}`)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Registration Page
                </Button>
                <Button size="sm" className="flex-1" onClick={() => router.push(`/admin/access-management/${event.id}`)}>
                  <Settings className="mr-2 h-4 w-4" /> Dashboard
                </Button>
              </DialogFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-muted/20 rounded-lg border-2 border-dashed">
            <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-semibold">No Event Modules Yet</h3>
            <p className="text-muted-foreground">Click the button above to start your first event registration system.</p>
          </div>
        )}
      </div>
    </div>
  );
}