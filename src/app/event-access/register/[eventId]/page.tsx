
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, MapPin, Loader2, CheckCircle, 
  User, Mail, Building2, ArrowRight, Clock, Phone, Utensils, Users2, Upload, FileSpreadsheet, Download, AlertCircle, ShieldCheck, Lock, MessageCircle, Banknote, Sparkles, Check
} from 'lucide-react';
import { getPlatformEvent } from '@/services/accessPlatformService';
import type { AccessEvent, RegistrationSubmitter, PricingTier } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid, isWithinInterval } from 'date-fns';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Papa from 'papaparse';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const CLUB_NAMES = [
  "Athugalpura", 
  "ESU Kandy", 
  "Kandy Girls’ High School", 
  "Kandy", 
  "Pilimathalawa", 
  "Polonnaruwa", 
  "St. Sylvester’s College", 
  "Trincomalee Elite", 
  "Trincomalee Heroes", 
  "University of Peradeniya", 
  "Seethadevi Girls College"
];

export default function PlatformPublicRegistration() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [event, setEvent] = useState<AccessEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bulkSuccessCount, setBulkSuccessCount] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    club: '',
    otherClubName: '',
    contactNumber: '',
    role: 'Leo',
    foodPreference: 'non_veg' as 'veg' | 'non_veg'
  });

  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  const [submitterData, setSubmitterData] = useState<RegistrationSubmitter>({
    name: '',
    designation: '',
    club: '',
    email: '',
    contact: ''
  });

  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);

  useEffect(() => {
    const fetchEvent = async () => {
      const data = await getPlatformEvent(eventId);
      if (data) {
        setEvent(data);
        // Pre-select the first active tier if available
        const active = getActiveTiers(data);
        if (active.length > 0) {
            setSelectedTierId(active[0].id);
        }
      }
      setIsLoading(false);
    };
    fetchEvent();
  }, [eventId]);

  const getActiveTiers = (eventObj: AccessEvent) => {
    if (!eventObj || !eventObj.pricingTiers || eventObj.pricingTiers.length === 0) return [];
    const now = new Date();
    return eventObj.pricingTiers.filter(tier => {
      const start = parseISO(tier.startDate + 'T00:00:00');
      const end = parseISO(tier.endDate + 'T23:59:59');
      if (!isValid(start) || !isValid(end)) return false;
      return now >= start && now <= end;
    });
  };

  const activeTiers = useMemo(() => event ? getActiveTiers(event) : [], [event]);
  
  const selectedTier = useMemo(() => 
    activeTiers.find(t => t.id === selectedTierId) || activeTiers[0] || null
  , [activeTiers, selectedTierId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    
    const finalClub = formData.club === 'Others' ? formData.otherClubName : formData.club;

    if (!formData.name || !formData.email || !finalClub || !formData.contactNumber) {
        toast({ title: "Required Fields", description: "Please fill in all contact details.", variant: "destructive" });
        return;
    }

    if (activeTiers.length > 0 && !selectedTierId) {
        toast({ title: "Ticket Required", description: "Please select a ticket type.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/access-platform/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          club: finalClub,
          eventId,
          eventName: event.name,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          customEmailBody: event.customEmailBody,
          attachmentUrl: event.attachmentUrl,
          attachmentName: event.attachmentName,
          tierName: selectedTier?.name || 'Standard',
          priceAtRegistration: selectedTier?.price || 0,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setBulkSuccessCount(0);
        toast({ title: "Pass Generated", description: "Check your email for your entry pass." });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to register.");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Submission failed.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleBulkCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;

    if (!submitterData.name || !submitterData.email || !submitterData.contact || !submitterData.club) {
        toast({ title: "Identification Required", description: "Please fill in your details first.", variant: "destructive" });
        e.target.value = '';
        return;
    }

    setIsBulkProcessing(true);
    setProcessProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let successCount = 0;

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          setProcessProgress(Math.round(((i + 1) / data.length) * 100));

          try {
            if (!row.Name || !row.Email) continue;
            
            // Tier Logic: 1. CSV Column "Ticket" or "Tier", 2. Default selected on UI
            const csvTierName = row.Ticket || row.Tier || row['Ticket Type'];
            const matchedTier = csvTierName 
                ? activeTiers.find(t => t.name.toLowerCase() === csvTierName.toString().toLowerCase()) 
                : selectedTier;

            const response = await fetch('/api/access-platform/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventId,
                eventName: event.name,
                eventDate: event.date,
                eventTime: event.time,
                eventLocation: event.location,
                customEmailBody: event.customEmailBody,
                attachmentUrl: event.attachmentUrl,
                attachmentName: event.attachmentName,
                name: row.Name,
                email: row.Email,
                club: row.Club || 'Individual',
                contactNumber: row.Contact || '',
                role: row.Type || 'Leo',
                foodPreference: (row.Food?.toLowerCase().includes('veg') && !row.Food?.toLowerCase().includes('non')) ? 'veg' : 'non_veg',
                submitterInfo: submitterData,
                tierName: matchedTier?.name || selectedTier?.name || 'Standard',
                priceAtRegistration: matchedTier?.price || selectedTier?.price || 0,
              }),
            });

            if (response.ok) successCount++;
          } catch (err) {
            console.error("Bulk Item Error:", err);
          }
        }

        if (successCount > 0) {
          setBulkSuccessCount(successCount);
          setSuccess(true);
          toast({ title: "Bulk Registration Complete", description: `${successCount} passes generated.` });
        }
        setIsBulkProcessing(false);
        e.target.value = '';
      }
    });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!event) return null;

  const isManuallyClosed = event.isRegistrationClosed;
  const isPastClosingDate = event.registrationClosingDate && new Date() > new Date(event.registrationClosingDate + 'T23:59:59');
  const isRegistrationOver = isManuallyClosed || isPastClosingDate;
  const isClubEvent = event.scope === 'club';

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        <header className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-white p-2 rounded-[2rem] shadow-xl ring-4 ring-white w-32 h-28 sm:w-40 sm:h-36 flex items-center justify-center overflow-hidden">
              {event.imageUrl ? (
                <img src={event.imageUrl} alt="Event Branding" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <Image src="https://i.imgur.com/MP1YFNf.png" alt="Logo" width={90} height={90} className="object-contain" />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black font-headline text-slate-900 tracking-tighter uppercase">{event.name}</h1>
            <p className="text-primary font-bold tracking-[0.2em] text-xs uppercase">LeoEntrivo Digital Pass System</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
             <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200 text-xs font-bold text-slate-500"><Calendar className="h-4 w-4 text-primary" /> {event.date}</div>
             <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200 text-xs font-bold text-slate-500"><Clock className="h-4 w-4 text-primary" /> {event.time}</div>
             <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200 text-xs font-bold text-slate-500"><MapPin className="h-4 w-4 text-primary" /> {event.location}</div>
          </div>
        </header>

        {success ? (
          <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
            <div className="bg-emerald-600 p-10 text-white text-center">
              <CheckCircle className="h-20 w-16 mx-auto mb-4" />
              <h2 className="text-3xl font-black font-headline uppercase">Success!</h2>
              <p className="opacity-90 font-medium">Registration complete. Your entry pass is in your inbox.</p>
            </div>
            <CardContent className="p-10 text-center space-y-6">
              <p className="text-slate-600 text-lg leading-relaxed">
                {bulkSuccessCount > 0 
                  ? `Successfully generated ${bulkSuccessCount} digital entry passes for your club.` 
                  : `Thank you for registering. A unique QR entry pass has been sent to ${formData.email}.`}
              </p>
              <Button variant="link" className="text-primary font-bold" onClick={() => window.location.reload()}>Register more people?</Button>
            </CardContent>
          </Card>
        ) : isRegistrationOver ? (
          <Card className="shadow-2xl border-none rounded-3xl bg-white overflow-hidden text-center p-10">
            <Lock className="h-16 w-16 mx-auto mb-4 text-rose-600" />
            <h2 className="text-2xl font-black uppercase text-slate-900">Registration Closed</h2>
            <p className="text-slate-500 mt-2">This event is no longer accepting new registrations.</p>
          </Card>
        ) : (
          <Card className="shadow-2xl border-none rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 p-8 text-white">
              <CardTitle className="text-2xl font-headline">Secure Entry Registration</CardTitle>
              <CardDescription className="text-slate-400 text-sm">Fill in the details below to receive your digital entry pass.</CardDescription>
            </CardHeader>
            
            <Tabs defaultValue="single" className="w-full">
              <div className="px-8 pt-6">
                <TabsList className={cn(
                    "grid w-full h-14 bg-slate-100 rounded-2xl p-1.5 ring-1 ring-slate-200",
                    isClubEvent ? "grid-cols-1" : "grid-cols-2"
                )}>
                  <TabsTrigger value="single" className="rounded-xl font-bold h-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Single Entry</TabsTrigger>
                  {!isClubEvent && <TabsTrigger value="bulk" className="rounded-xl font-bold h-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Club Bulk Upload</TabsTrigger>}
                </TabsList>
              </div>

              {/* TICKET SELECTION (Global for both tabs) */}
              {activeTiers.length > 0 && (
                <div className="px-8 pt-8 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Banknote className="h-3.5 w-3.5 text-primary" /> Select Ticket Type
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {activeTiers.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedTierId(tier.id)}
                        className={cn(
                            "relative flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 text-left group",
                            selectedTierId === tier.id 
                                ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20" 
                                : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                        )}
                      >
                        <div className="space-y-1">
                          <p className={cn("text-sm font-black uppercase tracking-tight", selectedTierId === tier.id ? "text-primary" : "text-slate-600")}>
                            {tier.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">Valid until: {format(parseISO(tier.endDate), 'MMM dd, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-xl font-black", selectedTierId === tier.id ? "text-primary" : "text-slate-900")}>
                            LKR {tier.price.toLocaleString()}
                          </p>
                          <div className={cn(
                            "absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white shadow-lg transition-all",
                            selectedTierId === tier.id ? "scale-100 opacity-100" : "scale-0 opacity-0"
                          )}>
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <TabsContent value="single">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-bold text-slate-700"><User className="h-4 w-4 text-primary" /> Full Name</Label>
                            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" className="h-12 rounded-xl" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 font-bold text-slate-700"><Mail className="h-4 w-4 text-primary" /> Email Address</Label>
                                <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" className="h-12 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 font-bold text-slate-700"><Phone className="h-4 w-4 text-primary" /> Contact Number</Label>
                                <Input required value={formData.contactNumber} onChange={e => setFormData({ ...formData, contactNumber: e.target.value })} placeholder="07X XXXXXXX" className="h-12 rounded-xl" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 font-bold text-slate-700"><Building2 className="h-4 w-4 text-primary" /> Select Club</Label>
                                <Select value={formData.club} onValueChange={v => setFormData({...formData, club: v})}>
                                    <SelectTrigger className="h-12 rounded-xl">
                                        <SelectValue placeholder="Choose club" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CLUB_NAMES.map(name => <SelectItem key={name} value={`Leo Club of ${name}`}>Leo Club of {name}</SelectItem>)}
                                        <SelectItem value="Others">Others</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 font-bold text-slate-700"><Users2 className="h-4 w-4 text-primary" /> Member Type</Label>
                                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                                    <SelectTrigger className="h-12 rounded-xl">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Leo">Leo Member</SelectItem>
                                        <SelectItem value="Lion">Lions Member</SelectItem>
                                        <SelectItem value="Other">Other Guest</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-3 p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-200">
                            <Label className="flex items-center gap-2 font-bold text-slate-700"><Utensils className="h-4 w-4 text-primary" /> Food Preference</Label>
                            <RadioGroup value={formData.foodPreference} onValueChange={(v: any) => setFormData({...formData, foodPreference: v})} className="flex gap-6">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="non_veg" id="non_veg" /><Label htmlFor="non_veg" className="font-medium cursor-pointer">Non-Vegetarian</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="veg" id="veg" /><Label htmlFor="veg" className="font-medium cursor-pointer">Vegetarian</Label></div>
                            </RadioGroup>
                        </div>
                    </div>
                    <Button type="submit" size="lg" className="w-full h-16 text-xl font-black shadow-xl bg-primary rounded-2xl" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Request Entry Pass"}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>

              {!isClubEvent && (
                <TabsContent value="bulk">
                    <CardContent className="p-8 space-y-8">
                    <div className="bg-slate-50 ring-1 ring-slate-200 rounded-3xl p-6 space-y-6">
                        <h3 className="font-black uppercase tracking-tight flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Submitter Identity</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input placeholder="Your Name" className="h-11 rounded-xl bg-white" value={submitterData.name} onChange={e => setSubmitterData({...submitterData, name: e.target.value})} />
                            <Input placeholder="Designation" className="h-11 rounded-xl bg-white" value={submitterData.designation} onChange={e => setSubmitterData({...submitterData, designation: e.target.value})} />
                            <Select value={submitterData.club} onValueChange={v => setSubmitterData({...submitterData, club: v})}>
                                <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue placeholder="Choose club" /></SelectTrigger>
                                <SelectContent>{CLUB_NAMES.map(name => <SelectItem key={name} value={`Leo Club of ${name}`}>Leo Club of {name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input placeholder="Contact Number" className="h-11 rounded-xl bg-white" value={submitterData.contact} onChange={e => setSubmitterData({...submitterData, contact: e.target.value})} />
                            <Input type="email" placeholder="Professional Email" className="h-11 rounded-xl bg-white sm:col-span-2" value={submitterData.email} onChange={e => setSubmitterData({...submitterData, email: e.target.value})} />
                        </div>
                    </div>

                    <div className="relative group">
                        <Input type="file" accept=".csv" onChange={handleBulkCsvUpload} className="hidden" id="bulk-csv-input" disabled={isBulkProcessing} />
                        <label htmlFor="bulk-csv-input" className="flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all">
                        <div className="h-16 w-16 rounded-full bg-white shadow-md flex items-center justify-center text-primary"><Upload className="h-8 w-8" /></div>
                        <p className="font-black text-slate-900 uppercase tracking-tighter">Upload Club CSV List</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Required Columns: Name, Email, Contact, Type, Food, Ticket Type (Optional)</p>
                        </label>
                    </div>
                    </CardContent>
                </TabsContent>
              )}
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
}
