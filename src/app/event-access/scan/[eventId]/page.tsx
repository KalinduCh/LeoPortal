
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  CheckCircle2, XCircle, AlertTriangle, ArrowLeft, 
  Loader2, Camera, User, Club, ShieldCheck
} from 'lucide-react';
import { getPlatformEvent, getRegistrationByTicket, markPlatformCheckIn } from '@/services/accessPlatformService';
import type { AccessEvent, AccessRegistration } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

type ScanStatus = 'idle' | 'processing' | 'valid' | 'already_scanned' | 'invalid' | 'wrong_event';

export default function PlatformQRScanner() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<AccessEvent | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [lastGuest, setLastGuest] = useState<AccessRegistration | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/event-access/login'); return; }

    const fetchEvent = async () => {
      const data = await getPlatformEvent(eventId);
      if (data) setEvent(data);
      else router.push('/event-access/admin');
    };
    fetchEvent();

    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 280, height: 280 } },
      false
    );

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [eventId, user, authLoading]);

  async function onScanSuccess(decodedText: string) {
    if (status === 'processing') return;

    setStatus('processing');
    try {
      let ticketId = decodedText;
      let targetEventId = eventId;

      try {
        const parsed = JSON.parse(decodedText);
        ticketId = parsed.ticketId;
        targetEventId = parsed.eventId;
      } catch (e) {}

      if (targetEventId !== eventId) {
        setStatus('wrong_event');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }

      const registration = await getRegistrationByTicket(ticketId);

      if (!registration) {
        setStatus('invalid');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }

      setLastGuest(registration);

      if (registration.status === 'checked_in') {
        setStatus('already_scanned');
      } else {
        await markPlatformCheckIn(registration.id);
        setStatus('valid');
        toast({ title: "Valid Pass", description: `${registration.name} has entered.` });
      }

    } catch (error) {
      setStatus('invalid');
    }

    setTimeout(() => setStatus('idle'), 4000);
  }

  function onScanFailure(error: any) {}

  const statusConfig: Record<ScanStatus, { bg: string; icon: any; title: string; color: string }> = {
    idle: { bg: 'bg-slate-100', icon: Camera, title: 'Waiting for pass...', color: 'text-slate-400' },
    processing: { bg: 'bg-blue-50', icon: Loader2, title: 'Validating...', color: 'text-blue-600' },
    valid: { bg: 'bg-emerald-500', icon: CheckCircle2, title: 'Access Granted', color: 'text-white' },
    already_scanned: { bg: 'bg-amber-500', icon: AlertTriangle, title: 'Already Entered', color: 'text-white' },
    invalid: { bg: 'bg-rose-600', icon: XCircle, title: 'Invalid Pass', color: 'text-white' },
    wrong_event: { bg: 'bg-rose-600', icon: XCircle, title: 'Wrong Event', color: 'text-white' },
  };

  const current = statusConfig[status];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-4">
      <div className="container mx-auto max-w-lg flex-1 flex flex-col justify-center space-y-6 py-10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Exit Scanner
          </Button>
          <div className="text-right">
            <p className="text-primary font-bold text-xs uppercase tracking-widest">{event?.name}</p>
            <p className="text-white/50 text-[10px] uppercase font-bold">Scanning Station Active</p>
          </div>
        </div>

        <Card className="overflow-hidden border-none shadow-2xl bg-white rounded-3xl">
          <CardHeader className={cn("text-center transition-colors duration-500 py-8", current.bg)}>
            <div className="flex justify-center mb-2">
              <current.icon className={cn("h-12 w-12", current.color, status === 'processing' && 'animate-spin')} />
            </div>
            <CardTitle className={cn("text-3xl font-black font-headline uppercase tracking-tight", current.color)}>{current.title}</CardTitle>
            <CardDescription className={cn("font-bold text-xs", status === 'idle' ? 'text-slate-400' : 'text-white/80')}>
              {status === 'idle' ? "Point your camera at the digital pass QR code." : "Processing result..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 bg-black">
            <div id="reader" className="w-full aspect-square overflow-hidden"></div>
          </CardContent>
        </Card>

        {lastGuest && (
          <Card className={cn("border-none shadow-2xl rounded-2xl animate-in zoom-in-95", status === 'valid' ? 'bg-emerald-50' : 'bg-amber-50')}>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-none">{lastGuest.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{lastGuest.email}</p>
                </div>
                <Badge className="bg-white text-slate-900 border-none shadow-sm font-mono">{lastGuest.ticketId}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Club</p>
                  <p className="text-sm font-bold text-slate-700">{lastGuest.club}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</p>
                  <p className="text-sm font-bold text-slate-700">{lastGuest.role}</p>
                </div>
              </div>
              {status === 'already_scanned' && (
                <div className="p-3 bg-white rounded-lg text-center shadow-sm">
                  <p className="text-[10px] uppercase font-black text-amber-600 tracking-tighter">Original Check-in</p>
                  <p className="text-sm font-bold text-slate-900">{lastGuest.checkInTime ? format(parseISO(lastGuest.checkInTime), 'PPP p') : 'Already Logged'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-[10px] font-black text-white/20 uppercase tracking-[0.5em] py-4">
          Powered by Access Management Platform
        </p>
      </div>
    </div>
  );
}
