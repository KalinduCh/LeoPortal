"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, MapPin, Loader2, CheckCircle, 
  User, Mail, Building2, Shield, ArrowRight
} from 'lucide-react';
import { getAccessEvent } from '@/services/accessManagementService';
import type { AccessEvent } from '@/types/access-management';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Image from 'next/image';

export default function PublicRegistration() {
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
    role: 'Member'
  });

  useEffect(() => {
    const fetchEvent = async () => {
      const data = await getAccessEvent(eventId);
      if (data) setEvent(data);
      setIsLoading(false);
    };
    fetchEvent();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/access-management/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, eventId }),
      });

      if (response.ok) {
        setSuccess(true);
        toast({ title: "Registration Successful", description: "Your entry pass has been sent to your email." });
      } else {
        throw new Error("Failed to register.");
      }
    } catch (err) {
      toast({ title: "Registration Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-muted/30"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
            <CardDescription>The registration link you followed is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push('/')}>Return Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background py-12 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="flex justify-center">
            <Image src="https://i.imgur.com/MP1YFNf.png" alt="Club Logo" width={80} height={80} className="rounded-full shadow-md" />
          </div>
          <h1 className="text-3xl font-bold font-headline text-primary uppercase tracking-tight">{event.name}</h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {format(new Date(event.date), 'PPP')}</div>
            <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {event.location}</div>
          </div>
        </header>

        {success ? (
          <Card className="border-2 border-green-500/30 shadow-xl overflow-hidden">
            <div className="bg-green-500 p-6 text-white text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-2" />
              <h2 className="text-2xl font-bold">You're Registered!</h2>
            </div>
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-muted-foreground">
                Thank you for registering for <strong>{event.name}</strong>. We've sent a unique QR code entry pass to <strong>{formData.email}</strong>.
              </p>
              <div className="p-4 bg-muted/50 rounded-lg text-sm italic">
                Please present the QR code at the entrance for verification.
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/')}>Return to Portal</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl border-primary/10 overflow-hidden">
            <CardHeader className="bg-primary p-6 text-white">
              <CardTitle className="text-xl">Registration Form</CardTitle>
              <CardDescription className="text-primary-foreground/80">Complete your details to receive your access pass.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Full Name</Label>
                  <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Leo John Doe" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email Address</Label>
                  <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" className="h-12" />
                  <p className="text-[10px] text-muted-foreground">Your QR pass will be sent here.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Club Name</Label>
                    <Input required value={formData.club} onChange={e => setFormData({ ...formData, club: e.target.value })} placeholder="Leo Club of..." className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Current Role</Label>
                    <Input required value={formData.role} onChange={setFormData as any} placeholder="e.g. Member / IPP" className="h-12" />
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold shadow-lg" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Complete Registration"}
                  {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="bg-muted/30 p-4 text-center justify-center">
              <p className="text-xs text-muted-foreground">LeoPortal Event Ticketing System &copy; 2026</p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}