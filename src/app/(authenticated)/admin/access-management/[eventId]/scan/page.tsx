"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, XCircle, AlertTriangle, ArrowLeft, 
  Loader2, Camera, User, Club, ShieldCheck
} from 'lucide-react';
import { getAccessEvent, getRegistrationByTicket, markCheckIn } from '@/services/accessManagementService';
import type { AccessEvent, AccessRegistration } from '@/types/access-management';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

type ScanStatus = 'idle' | 'processing' | 'valid' | 'already_scanned' | 'invalid' | 'wrong_event';

export default function QRScannerPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [event, setEvent] = useState<AccessEvent | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [lastGuest, setLastGuest] = useState<AccessRegistration | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      const data = await getAccessEvent(eventId);
      if (data) setEvent(data);
      else router.push('/admin/access-management');
    };
    fetchEvent();

    // Start Scanner
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [eventId]);

  async function onScanSuccess(decodedText: string) {
    if (status === 'processing') return;

    setStatus('processing');
    try {
      // Data expected: JSON.stringify({ ticketId, eventId })
      let ticketId = decodedText;
      let targetEventId = eventId;

      try {
        const parsed = JSON.parse(decodedText);
        ticketId = parsed.ticketId;
        targetEventId = parsed.eventId;
      } catch (e) {
        // Fallback for raw ticket ID strings
      }

      if (targetEventId !== eventId) {
        setStatus('wrong_event');
        return;
      }

      const registration = await getRegistrationByTicket(ticketId);

      if (!registration) {
        setStatus('invalid');
        return;
      }

      setLastGuest(registration);

      if (registration.status === 'checked_in') {
        setStatus('already_scanned');
      } else {
        await markCheckIn(registration.id);
        setStatus('valid');
        toast({ title: "Valid Pass", description: `Guest: ${registration.name} checked in.` });
      }

    } catch (error) {
      console.error(error);
      setStatus('invalid');
    }

    // Reset status after a delay
    setTimeout(() => setStatus('idle'), 3000);
  }

  function onScanFailure(error: any) {
    // Silently ignore scanner noise
  }

  const statusConfig: Record<ScanStatus, { bg: string; icon: any; title: string; color: string }> = {
    idle: { bg: 'bg-muted', icon: Camera, title: 'Scanning for Pass...', color: 'text-muted-foreground' },
    processing: { bg: 'bg-blue-50', icon: Loader2, title: 'Validating Ticket...', color: 'text-blue-600' },
    valid: { bg: 'bg-green-100', icon: CheckCircle2, title: 'Valid Check-In', color: 'text-green-600' },
    already_scanned: { bg: 'bg-orange-100', icon: AlertTriangle, title: 'Already Scanned', color: 'text-orange-600' },
    invalid: { bg: 'bg-red-100', icon: XCircle, title: 'Invalid Ticket', color: 'text-red-600' },
    wrong_event: { bg: 'bg-red-100', icon: XCircle, title: 'Wrong Event Pass', color: 'text-red-600' },
  };

  const current = statusConfig[status];

  return (
    <div className="container mx-auto py-8 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        {event && <Badge variant="outline" className="text-xs uppercase tracking-wider">{event.name}</Badge>}
      </div>

      <Card className="overflow-hidden border-2 border-primary/20">
        <CardHeader className={cn("text-center transition-colors duration-300", current.bg)}>
          <div className="flex justify-center mb-2">
            <current.icon className={cn("h-10 w-10", current.color, status === 'processing' && 'animate-spin')} />
          </div>
          <CardTitle className={cn("text-2xl font-headline", current.color)}>{current.title}</CardTitle>
          <CardDescription>Point the camera at the guest's QR code pass.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div id="reader" className="w-full"></div>
        </CardContent>
      </Card>

      {lastGuest && (
        <Card className={cn("border-l-4 shadow-lg", status === 'valid' ? 'border-l-green-500' : 'border-l-orange-500')}>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{lastGuest.name}</h3>
                <p className="text-sm text-muted-foreground">{lastGuest.email}</p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">{lastGuest.ticketId}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Club className="h-4 w-4 text-primary" /> <span>{lastGuest.club}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" /> <span>{lastGuest.role}</span>
              </div>
            </div>
            {lastGuest.status === 'checked_in' && (
              <p className="text-xs text-muted-foreground italic text-center pt-2">
                Original Check-in: {lastGuest.checkInTime ? format(parseISO(lastGuest.checkInTime), 'PPP p') : 'Just now'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-center text-xs text-muted-foreground">
        Powered by LeoPortal Access Management Module.
      </div>
    </div>
  );
}