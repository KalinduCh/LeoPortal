
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, MapPin, Loader2, CheckCircle, 
  User, Mail, Building2, ArrowRight, Clock, Phone, Utensils, Users2
} from 'lucide-react';
import { getPlatformEvent } from '@/services/accessPlatformService';
import type { AccessEvent } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function PlatformPublicRegistration() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [event, setEvent] = useState<AccessEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    club: '',
    contactNumber: '',
    role: 'Leo', // Member Type
    foodPreference: 'non_veg' as 'veg' | 'non_veg'
  });

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
    
    if (!formData.name || !formData.email || !formData.club || !formData.contactNumber) {
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
          eventId,
          eventName: event.name,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location
        }),
      });

      if (response.ok) {
        setSuccess(true);
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

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        <header className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-3xl shadow-xl ring-1 ring-slate-200">
              <Image src="https://i.imgur.com/MP1YFNf.png" alt="Platform Logo" width={80} height={80} />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black font-headline text-slate-900 tracking-tighter uppercase">{event.name}</h1>
            <p className="text-primary font-bold tracking-[0.2em] text-xs uppercase">Official Entry Registration</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200"><Calendar className="h-4 w-4 text-primary" /> {format(new Date(event.date), 'PPP')}</div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200"><Clock className="h-4 w-4 text-primary" /> {event.time}</div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-200"><MapPin className="h-4 w-4 text-primary" /> {event.location}</div>
          </div>
        </header>

        {success ? (
          <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
            <div className="bg-emerald-600 p-10 text-white text-center">
              <CheckCircle className="h-20 w-16 mx-auto mb-4" />
              <h2 className="text-3xl font-black font-headline">SEE YOU THERE!</h2>
              <p className="opacity-90 font-medium">Your digital entry pass is on its way.</p>
            </div>
            <CardContent className="p-10 text-center space-y-6">
              <p className="text-slate-600 text-lg leading-relaxed">
                Thank you for registering. A unique QR entry pass has been sent to <strong>{formData.email}</strong>.
              </p>
              <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500">
                Please have your pass ready on your phone for scanning at the venue entrance.
              </div>
              <Button variant="link" className="text-primary font-bold" onClick={() => window.location.reload()}>Need to register another person?</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl border-none rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 p-8 text-white">
              <CardTitle className="text-2xl font-headline">Request Access Pass</CardTitle>
              <CardDescription className="text-slate-400">Please provide your details below to receive your digital ticket.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 font-bold text-slate-700"><User className="h-4 w-4 text-primary" /> Full Name</Label>
                        <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Leo Kavindya Gimhani" className="h-12 rounded-xl" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-bold text-slate-700"><Mail className="h-4 w-4 text-primary" /> Email Address</Label>
                            <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="you@example.com" className="h-12 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-bold text-slate-700"><Phone className="h-4 w-4 text-primary" /> Contact Number</Label>
                            <Input required value={formData.contactNumber} onChange={e => setFormData({ ...formData, contactNumber: e.target.value })} placeholder="07X XXXXXXX" className="h-12 rounded-xl" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-bold text-slate-700"><Building2 className="h-4 w-4 text-primary" /> Club Name</Label>
                            <Input required value={formData.club} onChange={e => setFormData({ ...formData, club: e.target.value })} placeholder="Leo/Lions Club of..." className="h-12 rounded-xl" />
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
                  {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Request My Entry Pass"}
                  {!isSubmitting && <ArrowRight className="ml-2 h-6 w-6" />}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="bg-slate-50 p-6 text-center justify-center">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.3em]">District Access Platform &copy; 2026</p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
