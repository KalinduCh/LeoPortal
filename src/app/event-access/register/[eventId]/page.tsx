
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, MapPin, Loader2, CheckCircle, 
  User, Mail, Building2, ArrowRight, Clock, Phone, Utensils, Users2, Upload, FileSpreadsheet, Download, AlertCircle, ShieldCheck, Lock, MessageCircle
} from 'lucide-react';
import { getPlatformEvent } from '@/services/accessPlatformService';
import type { AccessEvent, RegistrationSubmitter } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
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
      if (data) setEvent(data);
      setIsLoading(false);
    };
    fetchEvent();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    
    const finalClub = formData.club === 'Others' ? formData.otherClubName : formData.club;

    if (!formData.name || !formData.email || !finalClub || !formData.contactNumber) {
        toast({ title: "Required Fields", description: "Please fill in all contact details.", variant: "destructive" });
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
      toast({ title: "Error", description: err.message || "Submission failed. Please try again.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        Name: "John Doe",
        Email: "john.doe@sample.com",
        Club: "Leo Club of Athugalpura",
        Contact: "0712345678",
        Type: "Leo",
        Food: "non_veg"
      }
    ];
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "LeoEntrivo_Bulk_Template.csv";
    link.click();
  };

  const handleBulkCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;

    if (!submitterData.name || !submitterData.email || !submitterData.contact || !submitterData.club) {
        toast({ 
            title: "Submitter Identity Required", 
            description: "Please fill in your (the officer's) details before uploading the list.", 
            variant: "destructive" 
        });
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
                submitterInfo: submitterData
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
          toast({
            title: "Bulk Registration Complete",
            description: `Successfully generated ${successCount} entry passes.`
          });
        } else {
          toast({
            title: "Import Failed",
            description: "No registrations were successful. Please check the CSV format.",
            variant: "destructive"
          });
        }
        
        setIsBulkProcessing(false);
        e.target.value = '';
      }
    });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md text-center shadow-xl border-none">
          <CardHeader>
            <CardTitle>Pass Request Link Expired</CardTitle>
            <CardDescription>The registration link for this event is no longer active.</CardDescription>
          </CardHeader>
          <CardFooter><Button className="w-full" onClick={() => router.push('/')}>Return Home</Button></CardFooter>
        </Card>
      </div>
    );
  }

  const isManuallyClosed = event.isRegistrationClosed;
  const isPastClosingDate = event.registrationClosingDate && new Date() > new Date(event.registrationClosingDate + 'T23:59:59');
  const isRegistrationOver = isManuallyClosed || isPastClosingDate;

  const eventDateParsed = event.date ? parseISO(event.date) : null;
  const displayDate = (eventDateParsed && isValid(eventDateParsed)) ? format(eventDateParsed, 'PPP') : (event.date || 'TBD');

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        <header className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-white p-2 rounded-[2rem] shadow-xl ring-4 ring-white w-32 h-28 sm:w-40 sm:h-36 flex items-center justify-center overflow-hidden">
              {event.imageUrl ? (
                <img src={event.imageUrl} alt="Event Branding" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <Image src="https://i.imgur.com/MP1YFNf.png" alt="LeoEntrivo Logo" width={90} height={90} className="object-contain" />
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <h1 className="text-4xl font-black font-headline text-slate-900 tracking-tighter uppercase">{event.name}</h1>
            <p className="text-primary font-bold tracking-[0.2em] text-xs uppercase">LeoEntrivo Digital Pass System</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200"><Calendar className="h-4 w-4 text-primary" /> {displayDate}</div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200"><Clock className="h-4 w-4 text-primary" /> {event.time}</div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200"><MapPin className="h-4 w-4 text-primary" /> {event.location}</div>
          </div>
        </header>

        {success ? (
          <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
            <div className="bg-emerald-600 p-10 text-white text-center">
              <CheckCircle className="h-20 w-16 mx-auto mb-4" />
              <h2 className="text-3xl font-black font-headline">REGISTRATION SUCCESSFUL!</h2>
              <p className="opacity-90 font-medium">
                {bulkSuccessCount > 0 
                  ? `${bulkSuccessCount} digital entry passes have been generated.` 
                  : "Your digital entry pass is on its way."}
              </p>
            </div>
            <CardContent className="p-10 text-center space-y-6">
              <p className="text-slate-600 text-lg leading-relaxed">
                {bulkSuccessCount > 0 
                  ? "Unique QR passes have been sent to all email addresses provided." 
                  : `Thank you for registering. A unique QR entry pass has been sent to ${formData.email}.`}
              </p>
              <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500">
                Please ensure all guests have their passes ready on their phones for scanning at the venue entrance.
              </div>
              <Button variant="link" className="text-primary font-bold" onClick={() => window.location.reload()}>Need to register more people?</Button>
            </CardContent>
          </Card>
        ) : isRegistrationOver ? (
            <Card className="shadow-2xl border-none rounded-3xl bg-white overflow-hidden text-center">
                <div className="bg-rose-600 p-10 text-white">
                    <Lock className="h-20 w-16 mx-auto mb-4" />
                    <h2 className="text-3xl font-black font-headline">REGISTRATION CLOSED</h2>
                    <p className="opacity-90 font-medium">This event is no longer accepting new registrations.</p>
                </div>
                <CardContent className="p-10 space-y-8">
                    <div className="space-y-4">
                        <p className="text-slate-600 text-lg font-medium leading-relaxed">
                            Thank you for your interest in <strong>{event.name}</strong>. Unfortunately, the registration period has concluded.
                        </p>
                        <p className="text-slate-500 text-sm italic">
                            The deadline for entry pass requests has passed or the capacity has been reached.
                        </p>
                    </div>

                    <div className="p-8 bg-slate-50 rounded-3xl ring-1 ring-slate-200 space-y-4">
                        <div className="flex justify-center">
                            <div className="bg-white p-3 rounded-2xl shadow-sm text-primary">
                                <MessageCircle className="h-8 w-8" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-black uppercase tracking-widest text-xs text-slate-900">Have an enquiry?</h4>
                            <p className="text-sm text-slate-600">
                                If you have urgent questions or require assistance, please contact the organizing committee directly.
                            </p>
                        </div>
                        <Button asChild variant="outline" className="h-12 rounded-xl w-full border-primary/20 text-primary font-bold hover:bg-primary/5">
                            <a href="mailto:districtconference306d9@gmail.com">Contact Committee</a>
                        </Button>
                    </div>

                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.3em]">LeoDistrict 306 D9 &copy; 2026</p>
                </CardContent>
            </Card>
        ) : (
          <Card className="shadow-2xl border-none rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 p-8 text-white">
              <CardTitle className="text-2xl font-headline">Request Access Pass</CardTitle>
              <CardDescription className="text-slate-400 text-sm">Please choose how you would like to register.</CardDescription>
            </CardHeader>
            
            <Tabs defaultValue="single" className="w-full">
              <div className="px-8 pt-6">
                <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-100 rounded-2xl p-1.5 ring-1 ring-slate-200">
                  <TabsTrigger value="single" className="rounded-xl font-bold h-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Single Entry</TabsTrigger>
                  <TabsTrigger value="bulk" className="rounded-xl font-bold h-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">Club Bulk Upload</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="single">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-bold text-slate-700"><User className="h-4 w-4 text-primary" /> Full Name</Label>
                            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. John Doe" className="h-12 rounded-xl" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 font-bold text-slate-700"><Mail className="h-4 w-4 text-primary" /> Email Address</Label>
                                <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="john.doe@sample.com" className="h-12 rounded-xl" />
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
                                        <SelectValue placeholder="Choose your club" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CLUB_NAMES.map(name => (
                                          <SelectItem key={name} value={`Leo Club of ${name}`}>
                                            Leo Club of {name}
                                          </SelectItem>
                                        ))}
                                        <SelectItem value="Others">Others</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formData.club === 'Others' && (
                                    <Input 
                                        required 
                                        placeholder="Type your club name..." 
                                        className="mt-2 h-12 rounded-xl animate-in slide-in-from-top-2"
                                        value={formData.otherClubName}
                                        onChange={e => setFormData({...formData, otherClubName: e.target.value})}
                                    />
                                )}
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
                            <RadioGroup 
                                value={formData.foodPreference} 
                                onValueChange={(v: any) => setFormData({...formData, foodPreference: v})}
                                className="flex gap-6"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="non_veg" id="non_veg" />
                                    <Label htmlFor="non_veg" className="font-medium cursor-pointer">Non-Vegetarian</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="veg" id="veg" />
                                    <Label htmlFor="veg" className="font-medium cursor-pointer">Vegetarian</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full h-16 text-xl font-black shadow-xl bg-primary hover:scale-[1.01] transition-transform rounded-2xl" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Request Entry Pass"}
                      {!isSubmitting && <ArrowRight className="ml-2 h-6 w-6" />}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>

              <TabsContent value="bulk">
                <CardContent className="p-8 space-y-8">
                  <div className="bg-slate-50 ring-1 ring-slate-200 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center gap-3 text-slate-900 border-b pb-4">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                      <h3 className="font-black uppercase tracking-tight">Submitter Identification</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Name</Label>
                            <Input placeholder="John Doe" className="h-11 rounded-xl bg-white" value={submitterData.name} onChange={e => setSubmitterData({...submitterData, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Designation</Label>
                            <Input placeholder="Club President" className="h-11 rounded-xl bg-white" value={submitterData.designation} onChange={e => setSubmitterData({...submitterData, designation: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Club</Label>
                            <Select value={submitterData.club} onValueChange={v => setSubmitterData({...submitterData, club: v})}>
                                <SelectTrigger className="h-11 rounded-xl bg-white">
                                    <SelectValue placeholder="Choose club" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CLUB_NAMES.map(name => (
                                      <SelectItem key={name} value={`Leo Club of ${name}`}>
                                        Leo Club of {name}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="Others">Others</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contact Number</Label>
                            <Input placeholder="07X XXXXXXX" className="h-11 rounded-xl bg-white" value={submitterData.contact} onChange={e => setSubmitterData({...submitterData, contact: e.target.value})} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</Label>
                            <Input type="email" placeholder="officer@sample.com" className="h-11 rounded-xl bg-white" value={submitterData.email} onChange={e => setSubmitterData({...submitterData, email: e.target.value})} />
                        </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                      <FileSpreadsheet className="h-6 w-6" />
                      <h3 className="font-bold text-lg">Member List Portal</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Upload your club list to generate passes for multiple members at once. 
                      Each guest will receive their pass individually.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleDownloadSample} className="bg-white border-primary/20 text-primary hover:bg-primary/5 font-bold">
                      <Download className="mr-2 h-4 w-4" /> Download Formatting Sample
                    </Button>
                  </div>

                  {isBulkProcessing ? (
                    <div className="space-y-6 py-10 text-center animate-in fade-in">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                      <div className="space-y-2">
                        <p className="font-black text-slate-900 uppercase tracking-widest">Processing District List...</p>
                        <p className="text-sm text-slate-500">{processProgress}% complete</p>
                      </div>
                      <Progress value={processProgress} className="h-2 rounded-full bg-slate-100" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="relative group">
                        <Input 
                          type="file" 
                          accept=".csv" 
                          onChange={handleBulkCsvUpload}
                          className="hidden" 
                          id="bulk-csv-input" 
                        />
                        <label 
                          htmlFor="bulk-csv-input" 
                          className="flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-slate-100 hover:border-primary/30 cursor-pointer transition-all duration-300"
                        >
                          <div className="h-16 w-16 rounded-full bg-white shadow-md flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Upload className="h-8 w-8" />
                          </div>
                          <div className="text-center">
                            <p className="font-black text-slate-900 uppercase tracking-tighter text-lg">Upload Club Member List</p>
                            <p className="text-sm text-slate-500">Tap to browse .CSV files</p>
                          </div>
                        </label>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>Security Note: Your identification details will be logged as the registrant for this list.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>

            <CardFooter className="bg-slate-50 p-6 text-center justify-center">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.3em]">LeoEntrivo Pass System &copy; 2026</p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
