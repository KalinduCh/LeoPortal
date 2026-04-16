"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
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
  ExternalLink, Activity, QrCode, MoreVertical, Edit3, Eye, Image as ImageIcon, Mail, Paperclip, X
} from 'lucide-react';
import { getPlatformEvents, createPlatformEvent, updatePlatformEvent } from '@/services/accessPlatformService';
import type { AccessEvent } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { format, isValid, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024; // 2MB

export default function PlatformAdminOverview() {
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const [editingEvent, setEditingEvent] = useState<AccessEvent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    description: '',
    capacity: '',
    imageUrl: '',
    customEmailBody: '',
    attachmentUrl: '',
    attachmentName: '',
  });

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await getPlatformEvents();
      setEvents(data);
    } catch (error: any) {
      console.error("LEOENTRIVO_ERROR: Failed to load events:", error);
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
        imageUrl: event.imageUrl || '',
        customEmailBody: event.customEmailBody || '',
        attachmentUrl: event.attachmentUrl || '',
        attachmentName: event.attachmentName || '',
      });
    } else {
      setEditingEvent(null);
      setFormData({ 
        name: '', date: '', time: '', location: '', description: '', capacity: '',
        imageUrl: '', customEmailBody: '', attachmentUrl: '', attachmentName: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'attachment') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
        toast({ title: "File Too Large", description: "Maximum file size is 2MB.", variant: "destructive" });
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'image') {
            setFormData(prev => ({ ...prev, imageUrl: base64 }));
        } else {
            setFormData(prev => ({ ...prev, attachmentUrl: base64, attachmentName: file.name }));
        }
    };
    reader.readAsDataURL(file);
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
        imageUrl: formData.imageUrl,
        customEmailBody: formData.customEmailBody,
        attachmentUrl: formData.attachmentUrl,
        attachmentName: formData.attachmentName,
      };

      if (editingEvent) {
        await updatePlatformEvent(editingEvent.id, payload);
        toast({ title: "Module Updated", description: "Event details have been successfully changed." });
      } else {
        await createPlatformEvent({
          ...payload,
          organizerId: user.id,
        });
        toast({ title: "Module Activated", description: "The LeoEntrivo registration pipeline is ready." });
      }
      
      setIsDialogOpen(false);
      fetchEvents();
    } catch (error: any) {
      console.error("LEOENTRIVO_ERROR: Save failed:", error);
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
          <h1 className="text-4xl font-bold font-headline text-slate-900 tracking-tight uppercase">LeoEntrivo Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage registration and entry passes for your district event modules.</p>
        </div>
        <Button size="lg" onClick={() => handleOpenDialog()} className="shadow-xl bg-primary hover:bg-primary/90 h-14 px-8 text-lg font-bold">
          <PlusCircle className="mr-2 h-6 w-6" /> Deploy New Module
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.length > 0 ? (
          events.map(event => {
            const eventDate = parseISO(event.date);
            const formattedDate = isValid(eventDate) ? format(eventDate, 'PPP') : event.date;
            
            return (
              <Card key={event.id} className="hover:shadow-xl transition-all duration-300 border-none bg-white ring-1 ring-slate-200 overflow-hidden flex flex-col">
                <div className="h-32 bg-slate-100 relative overflow-hidden">
                    {event.imageUrl ? (
                        <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon className="h-10 w-10" />
                        </div>
                    )}
                </div>
                <CardHeader className="bg-slate-50/50 pb-4 border-t border-slate-100">
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
                          <Settings className="mr-2 h-4 w-4" /> View Admin Dashboard
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 pb-6 flex-grow">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> {event.location}
                  </div>
                  <div className="flex flex-wrap gap-2">
                     <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                        {event.customEmailBody ? "Custom Email Active" : "Default Email"}
                     </Badge>
                     {event.attachmentUrl && (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-100">
                            <Paperclip className="h-2.5 w-2.5 mr-1" /> Attachment
                        </Badge>
                     )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 p-4 border-t bg-white">
                  <Button 
                    className="w-full h-11 font-bold shadow-md" 
                    onClick={() => router.push(`/event-access/admin/${event.id}`)}
                  >
                    Open Dashboard
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full h-11 border-primary text-primary hover:bg-primary/5 font-bold" 
                    onClick={() => window.open(`/event-access/register/${event.id}`, '_blank')}
                  >
                    <Eye className="mr-2 h-4 w-4" /> View Public Page
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <QrCode className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No Active Modules</h3>
            <p className="text-slate-500">Deploy your first LeoEntrivo module above.</p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">
              {editingEvent ? 'Edit Module Details' : 'Deploy New Module'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEvent} className="space-y-6 py-4">
            <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary border-b pb-1">Basic Information</h3>
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
                    <Input required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Grand City Hall" />
                </div>
                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Provide a brief overview for the registration page..." />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary border-b pb-1">Creative & Branding</h3>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">Event Logo / Image URL <ImageIcon className="h-3 w-3 text-slate-400"/></Label>
                    <div className="flex gap-2">
                        <Input value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://imgur.com/image.png" className="flex-grow" />
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Upload</Button>
                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => handleFileChange(e, 'image')} />
                    </div>
                    {formData.imageUrl && (
                        <div className="relative w-full h-24 rounded-lg overflow-hidden border mt-2">
                            <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                            <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 rounded-full" onClick={() => setFormData({...formData, imageUrl: ''})}><X className="h-3 w-3"/></Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary border-b pb-1">Email Automation (Optional)</h3>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">Custom Email Body <Mail className="h-3 w-3 text-slate-400"/></Label>
                    <Textarea 
                        value={formData.customEmailBody} 
                        onChange={e => setFormData({ ...formData, customEmailBody: e.target.value })} 
                        rows={4} 
                        placeholder="Welcome to our event! Please find your ticket attached..." 
                    />
                    <p className="text-[10px] text-slate-400 italic">This will replace the default greeting in the confirmation email.</p>
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">Email Attachment (Max 2MB) <Paperclip className="h-3 w-3 text-slate-400"/></Label>
                    <div className="flex gap-2">
                        <Input value={formData.attachmentName} readOnly placeholder="No file chosen" className="flex-grow" />
                        <Button type="button" variant="outline" onClick={() => attachmentInputRef.current?.click()}>Select File</Button>
                        <input type="file" hidden ref={attachmentInputRef} onChange={(e) => handleFileChange(e, 'attachment')} />
                    </div>
                    {formData.attachmentUrl && (
                        <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                            <span className="text-xs font-medium text-emerald-800 truncate">{formData.attachmentName}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({...formData, attachmentUrl: '', attachmentName: ''})}><X className="h-3 w-3"/></Button>
                        </div>
                    )}
                </div>
            </div>

            <Separator />
            
            <div className="space-y-2">
              <Label>Attendee Capacity</Label>
              <Input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} placeholder="Unlimited if left empty" />
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isProcessing} className="h-12 px-6 shadow-lg flex-1">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingEvent ? "Save Changes" : "Start Module")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}