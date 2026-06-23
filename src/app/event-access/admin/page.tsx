
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  PlusCircle, CalendarDays, MapPin, Settings, Loader2, 
  ExternalLink, QrCode, MoreVertical, Edit3, Eye, Image as ImageIcon, Mail, Paperclip, X, CalendarIcon, Clock, Trash2, AlertTriangle, Link as LinkIcon, Lock, Banknote, History
} from 'lucide-react';
import { getPlatformEvents, createPlatformEvent, updatePlatformEvent, deletePlatformEvent } from '@/services/accessPlatformService';
import type { AccessEvent, PricingTier } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { format, isValid, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<AccessEvent | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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
    isRegistrationClosed: false,
    registrationClosingDate: '',
    pricingTiers: [] as PricingTier[],
  });

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await getPlatformEvents();
      setEvents(data);
    } catch (error: any) {
      console.error("LEOENTRIVO_ERROR: Failed to load events:", error);
      toast({ title: "Error", description: "Failed to load events.", variant: "destructive" });
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
        date: event.date || '',
        time: event.time || '',
        location: event.location,
        description: event.description || '',
        capacity: event.capacity?.toString() || '',
        imageUrl: event.imageUrl || '',
        customEmailBody: event.customEmailBody || '',
        attachmentUrl: event.attachmentUrl || '',
        attachmentName: event.attachmentName || '',
        isRegistrationClosed: event.isRegistrationClosed || false,
        registrationClosingDate: event.registrationClosingDate || '',
        pricingTiers: event.pricingTiers || [],
      });
    } else {
      setEditingEvent(null);
      setFormData({ 
        name: '', date: '', time: '', location: '', description: '', capacity: '',
        imageUrl: '', customEmailBody: '', attachmentUrl: '', attachmentName: '',
        isRegistrationClosed: false, registrationClosingDate: '',
        pricingTiers: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (event: AccessEvent) => {
    setEventToDelete(event);
    setDeleteConfirmText("");
    setIsDeleteDialogOpen(true);
  };

  const handleCopyLink = (eventId: string) => {
    const url = `${window.location.origin}/event-access/register/${eventId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ 
        title: "Link Copied", 
        description: "Public registration URL copied to clipboard.",
      });
    }).catch(err => {
      toast({ 
        title: "Copy Failed", 
        description: "Could not copy link.",
        variant: "destructive"
      });
    });
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

  const handleAddTier = () => {
    const newTier: PricingTier = {
        id: `tier-${Date.now()}`,
        name: '',
        price: 0,
        startDate: '',
        endDate: '',
    };
    setFormData(prev => ({ ...prev, pricingTiers: [...prev.pricingTiers, newTier] }));
  };

  const handleRemoveTier = (id: string) => {
    setFormData(prev => ({ ...prev, pricingTiers: prev.pricingTiers.filter(t => t.id !== id) }));
  };

  const handleUpdateTier = (id: string, field: keyof PricingTier, value: any) => {
    setFormData(prev => ({
        ...prev,
        pricingTiers: prev.pricingTiers.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
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
        isRegistrationClosed: formData.isRegistrationClosed,
        registrationClosingDate: formData.registrationClosingDate,
        pricingTiers: formData.pricingTiers,
      };

      if (editingEvent) {
        await updatePlatformEvent(editingEvent.id, payload);
        toast({ title: "Event Updated", description: "Event details have been successfully changed." });
      } else {
        await createPlatformEvent({
          ...payload,
          organizerId: user.id,
        });
        toast({ title: "Event Created", description: "The LeoEntrivo registration pipeline is ready." });
      }
      
      setIsDialogOpen(false);
      fetchEvents();
    } catch (error: any) {
      console.error("LEOENTRIVO_ERROR: Save failed:", error);
      toast({ title: "Error", description: error.message || "Could not save the event.", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleDeleteEvent = async () => {
    if (deleteConfirmText !== "DELETE" || !eventToDelete) return;
    
    setIsProcessing(true);
    try {
      await deletePlatformEvent(eventToDelete.id);
      toast({ title: "Event Deleted", description: "The module has been permanently removed." });
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
      fetchEvents();
    } catch (error: any) {
      console.error("LEOENTRIVO_ERROR: Delete failed:", error);
      toast({ title: "Error", description: "Could not remove the event.", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const getSafeCalendarDate = (dateStr?: string) => {
    if (!dateStr) return undefined;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return undefined;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return isValid(d) ? d : undefined;
  };

  const PlatformDateTimePicker = ({ fieldName, label }: { fieldName: 'date' | 'registrationClosingDate', label: string }) => {
    const [calOpen, setCalOpen] = useState(false);
    const dateValue = formData[fieldName];
    const safeDate = getSafeCalendarDate(dateValue);
    
    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;
        setFormData(prev => ({ ...prev, [fieldName]: format(date, "yyyy-MM-dd") }));
        setCalOpen(false);
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        type="button"
                        className={cn(
                            "w-full justify-start text-left font-normal h-12 rounded-xl",
                            !dateValue && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {dateValue && safeDate ? (
                            <span>{format(safeDate, "PPP")} {fieldName === 'date' ? `at ${formData.time || "..."}` : ''}</span>
                        ) : (
                            <span>{fieldName === 'date' ? 'Select date and time' : 'Select closing date'}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={safeDate}
                        onSelect={handleDateSelect}
                        initialFocus
                    />
                    {fieldName === 'date' && (
                        <div className="p-3 border-t bg-slate-50/50">
                            <Label htmlFor="entrivo-time" className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Set Arrival Time</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
                                <Input 
                                    id="entrivo-time"
                                    type="time" 
                                    className="pl-9 h-10 rounded-lg bg-white"
                                    value={formData.time} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))} 
                                />
                            </div>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
  };

  const TierDatePicker = ({ tierId, field, label }: { tierId: string, field: 'startDate' | 'endDate', label: string }) => {
    const [calOpen, setCalOpen] = useState(false);
    const tier = formData.pricingTiers.find(t => t.id === tierId);
    const dateValue = tier?.[field];
    const safeDate = getSafeCalendarDate(dateValue);

    return (
        <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-full justify-start h-9 text-[10px]", !dateValue && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                    {dateValue && safeDate ? format(safeDate, "MMM dd, yyyy") : label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                    mode="single" 
                    selected={safeDate} 
                    onSelect={(d) => {
                        if(d) handleUpdateTier(tierId, field, format(d, "yyyy-MM-dd"));
                        setCalOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
  };

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b pb-8">
        <div>
          <h1 className="text-4xl font-bold font-headline text-slate-900 tracking-tight uppercase">LeoEntrivo Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage registration and entry passes for your district events.</p>
        </div>
        <Button size="lg" onClick={() => handleOpenDialog()} className="shadow-xl bg-primary hover:bg-primary/90 h-14 px-8 text-lg font-bold">
          <PlusCircle className="mr-2 h-6 w-6" /> Add New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.length > 0 ? (
          events.map(event => {
            const safeDate = getSafeCalendarDate(event.date);
            const formattedDate = safeDate ? format(safeDate, 'PPP') : 'Date TBD';
            const isManuallyClosed = event.isRegistrationClosed;
            const isPastClosingDate = event.registrationClosingDate && new Date() > new Date(event.registrationClosingDate + 'T23:59:59');
            const isLocked = isManuallyClosed || isPastClosingDate;

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
                    {isLocked && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                            <Badge variant="destructive" className="font-black px-4 py-1 uppercase tracking-widest shadow-lg">
                                <Lock className="h-3 w-3 mr-2" /> Registration Closed
                            </Badge>
                        </div>
                    )}
                </div>
                <CardHeader className="bg-slate-50/50 pb-4 border-t border-slate-100">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-4">
                      <CardTitle className="text-xl font-bold text-slate-900 truncate font-headline">{event.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 font-medium mt-1 text-xs">
                        <CalendarDays className="h-4 w-4 text-primary" /> {formattedDate} @ {event.time}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>Event Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleOpenDialog(event)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit Event Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyLink(event.id)}>
                          <LinkIcon className="mr-2 h-4 w-4" /> Copy Registration Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/event-access/admin/${event.id}`)}>
                          <Settings className="mr-2 h-4 w-4" /> View Admin Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            onClick={() => handleOpenDeleteDialog(event)}
                            className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Revoke Event Module
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
                        {event.pricingTiers && event.pricingTiers.length > 0 ? `${event.pricingTiers.length} Pricing Stages` : "Single Pricing"}
                     </Badge>
                     {event.attachmentUrl && (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-100">
                            <Paperclip className="h-2.5 w-2.5 mr-1" /> Attachment
                        </Badge>
                     )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 p-4 border-t bg-white">
                  <Button className="w-full h-11 font-bold shadow-md" onClick={() => router.push(`/event-access/admin/${event.id}`)}>
                    Open Dashboard
                  </Button>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button variant="outline" size="sm" className="font-bold" onClick={() => window.open(`/event-access/register/${event.id}`, '_blank')}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View Page
                    </Button>
                    <Button variant="outline" size="sm" className="font-bold" onClick={() => handleCopyLink(event.id)}>
                      <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> Copy Link
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <QrCode className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No Active Events</h3>
            <p className="text-slate-500">Add your first district event above.</p>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-600 mb-2">
                <AlertTriangle className="h-6 w-6" />
                <DialogTitle className="text-xl font-headline uppercase">Critical Action</DialogTitle>
            </div>
            <DialogDescription>You are about to permanently remove <strong>{eventToDelete?.name}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Type "DELETE" to confirm</Label>
            <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="h-12 border-rose-200 font-black text-center text-rose-600" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEvent} disabled={deleteConfirmText !== "DELETE" || isProcessing} className="flex-1 h-11 font-bold">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-primary">
              {editingEvent ? 'Edit Event Details' : 'Add New Event'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEvent} className="space-y-8 py-4">
            <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b pb-1">Basic Information</h3>
                <div className="space-y-2">
                    <Label>Event Name</Label>
                    <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. District Installation 2026" className="h-12 rounded-xl" />
                </div>
                <PlatformDateTimePicker fieldName="date" label="Event Schedule (Date & Time)" />
                <div className="space-y-2">
                    <Label>Venue Location</Label>
                    <Input required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Grand City Hall" className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Provide a brief overview for the registration page..." className="rounded-xl" />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b pb-1">Registration Controls</h3>
                {editingEvent && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-200">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold flex items-center gap-2"><Lock className="h-4 w-4 text-rose-600" /> Stop New Registrations</Label>
                            <p className="text-[10px] text-slate-500 font-medium">Manually close the registration form immediately.</p>
                        </div>
                        <Switch checked={formData.isRegistrationClosed} onCheckedChange={(v) => setFormData(prev => ({ ...prev, isRegistrationClosed: v }))} />
                    </div>
                )}
                <PlatformDateTimePicker fieldName="registrationClosingDate" label="Automatic Closing Date" />
                <p className="text-[10px] text-slate-500 font-medium italic mt-1 px-1">Registrations will automatically close at the end of this day.</p>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b pb-1">Branding & Automation</h3>
                <div className="space-y-2">
                    <Label>Event Logo / Image URL</Label>
                    <div className="flex gap-2">
                        <Input value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://imgur.com/image.png" className="flex-grow h-12 rounded-xl" />
                        <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => fileInputRef.current?.click()}>Upload</Button>
                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => handleFileChange(e, 'image')} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Custom Email Message</Label>
                    <Textarea value={formData.customEmailBody} onChange={e => setFormData({ ...formData, customEmailBody: e.target.value })} rows={3} className="rounded-xl" placeholder="Welcome to our event! Please find your ticket attached..." />
                </div>
                <div className="space-y-2">
                    <Label>Attach Document (Max 2MB)</Label>
                    <div className="flex gap-2">
                        <Input value={formData.attachmentName} readOnly placeholder="No file chosen" className="flex-grow h-12 rounded-xl" />
                        <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => attachmentInputRef.current?.click()}>Select</Button>
                        <input type="file" hidden ref={attachmentInputRef} onChange={(e) => handleFileChange(e, 'attachment')} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Attendee Capacity (Optional)</Label>
                    <Input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} placeholder="Unlimited" className="h-12 rounded-xl" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary">Pricing Strategy</h3>
                    <Button type="button" variant="ghost" size="sm" onClick={handleAddTier} className="text-primary font-bold h-8">
                        <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Pricing Stage
                    </Button>
                </div>
                
                <div className="space-y-3">
                    {formData.pricingTiers.map((tier) => (
                        <Card key={tier.id} className="relative group overflow-hidden border-dashed">
                            <CardContent className="p-4 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Stage Name</Label>
                                        <Input 
                                            value={tier.name} 
                                            onChange={(e) => handleUpdateTier(tier.id, 'name', e.target.value)} 
                                            placeholder="e.g., Early Bird" 
                                            className="h-9 text-xs rounded-lg"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Ticket Price (LKR)</Label>
                                        <div className="relative">
                                            <Banknote className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <Input 
                                                type="number" 
                                                value={tier.price} 
                                                onChange={(e) => handleUpdateTier(tier.id, 'price', parseFloat(e.target.value))} 
                                                placeholder="0.00" 
                                                className="h-9 text-xs rounded-lg pl-8"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Active From</Label>
                                        <TierDatePicker tierId={tier.id} field="startDate" label="Start Date" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Active Until</Label>
                                        <TierDatePicker tierId={tier.id} field="endDate" label="End Date" />
                                    </div>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-1 right-1 h-7 w-7 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                                    onClick={() => handleRemoveTier(tier.id)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    {formData.pricingTiers.length === 0 && (
                        <div className="text-center py-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200">
                            <Banknote className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 font-medium">No custom tiers defined. Registration will be free.</p>
                        </div>
                    )}
                </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setIsDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button type="submit" disabled={isProcessing} className="h-12 px-6 shadow-lg flex-1 bg-primary rounded-xl font-bold uppercase tracking-tight">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingEvent ? "Update Event" : "Create Event")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TierDatePicker({ tierId, field, label }: any) {
    const [calOpen, setCalOpen] = useState(false);
    return (
        <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start h-9 text-[10px] font-medium">
                    <CalendarIcon className="mr-1.5 h-3 w-3 text-primary" />
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" initialFocus onSelect={() => setCalOpen(false)} />
            </PopoverContent>
        </Popover>
    );
}
