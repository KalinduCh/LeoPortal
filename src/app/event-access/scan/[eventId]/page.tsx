
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  CheckCircle2, XCircle, AlertTriangle, ArrowLeft, 
  Loader2, Camera, ShieldCheck, Utensils, RefreshCw, StopCircle, LogOut, UserCheck
} from 'lucide-react';
import { getPlatformEvent, getRegistrationByTicket, markPlatformCheckIn } from '@/services/accessPlatformService';
import type { AccessEvent, AccessRegistration } from '@/types/access-platform';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

type ScanStatus = 'idle' | 'scanning' | 'processing' | 'valid' | 'already_scanned' | 'invalid' | 'wrong_event' | 'error';

export default function PlatformQRScanner() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<AccessEvent | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [lastGuest, setLastGuest] = useState<AccessRegistration | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = "reader";

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/event-access/login'); return; }

    const fetchEvent = async () => {
      try {
        const data = await getPlatformEvent(eventId);
        if (data) setEvent(data);
        else router.push('/event-access/admin');
      } catch (err) {
        toast({ title: "Load Error", description: "Failed to load event data.", variant: "destructive" });
      }
    };
    fetchEvent();

    return () => {
      stopScanner();
    };
  }, [eventId, user, authLoading, router]);

  const startScanner = async () => {
    if (scannerRef.current?.isScanning) return;
    
    setErrorMessage(null);
    setLastGuest(null);
    setStatus('scanning');

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerId);
      }

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewHeight);
            const boxSize = Math.floor(minEdge * 0.7);
            return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
      );
    } catch (err: any) {
      console.error("Scanner Start Error:", err);
      setErrorMessage(err.message || "Could not access camera. Ensure you have granted permissions.");
      setStatus('error');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Scanner Stop Error:", err);
      }
    }
  };

  async function onScanSuccess(decodedText: string) {
    if (status === 'processing') return;

    setStatus('processing');
    
    // Stop camera immediately after capture for better UX
    await stopScanner();

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    try {
      let ticketId = decodedText;
      let targetEventId = eventId;

      try {
        const parsed = JSON.parse(decodedText);
        ticketId = parsed.ticketId;
        targetEventId = parsed.eventId;
      } catch (e) {
        // Handle raw ticket string
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
        await markPlatformCheckIn(registration.id);
        setStatus('valid');
        toast({ title: "Check-in Successful", description: `${registration.name} verified.` });
      }

    } catch (error) {
      setStatus('invalid');
    }
  }

  function onScanFailure(error: any) {
    // Noise is common during scanning
  }

  const statusConfig: Record<ScanStatus, { bg: string; icon: any; title: string; color: string; desc: string }> = {
    idle: { bg: 'bg-slate-100', icon: Camera, title: 'Scanner Ready', color: 'text-slate-400', desc: 'Tap below to start check-in.' },
    scanning: { bg: 'bg-primary/10', icon: Loader2, title: 'Scanning...', color: 'text-primary', desc: 'Align QR code in the frame.' },
    processing: { bg: 'bg-blue-50', icon: Loader2, title: 'Verifying...', color: 'text-blue-600', desc: 'Validating ticket details.' },
    valid: { bg: 'bg-emerald-500', icon: CheckCircle2, title: 'ACCESS GRANTED', color: 'text-white', desc: 'Guest is verified.' },
    already_scanned: { bg: 'bg-amber-500', icon: AlertTriangle, title: 'ALREADY ENTERED', color: 'text-white', desc: 'This pass has been used.' },
    invalid: { bg: 'bg-rose-600', icon: XCircle, title: 'INVALID PASS', color: 'text-white', desc: 'Pass not found in system.' },
    wrong_event: { bg: 'bg-rose-600', icon: XCircle, title: 'WRONG EVENT', color: 'text-white', desc: 'Pass is for a different event.' },
    error: { bg: 'bg-rose-50', icon: AlertTriangle, title: 'Hardware Error', color: 'text-rose-600', desc: 'Camera access failed.' },
  };

  const current = statusConfig[status];
  const isShowingResult = ['valid', 'already_scanned', 'invalid', 'wrong_event'].includes(status);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Exit
        </Button>
        <div className="text-right">
          <p className="text-primary font-bold text-[10px] uppercase tracking-widest truncate max-w-[150px]">{event?.name}</p>
          <p className="text-white/40 text-[9px] uppercase font-bold">Check-in Station</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        <Card className="w-full max-w-sm overflow-hidden border-none shadow-2xl bg-white rounded-[2rem]">
          <CardHeader className={cn("text-center transition-colors duration-500 py-8", current.bg)}>
            <div className="flex justify-center mb-3">
              <current.icon className={cn("h-12 w-12", current.color, (status === 'processing' || status === 'scanning') && 'animate-spin')} />
            </div>
            <CardTitle className={cn("text-2xl font-black font-headline tracking-tight uppercase", current.color)}>{current.title}</CardTitle>
            <CardDescription className={cn("font-bold text-xs", (status === 'idle' || status === 'error') ? 'text-slate-400' : 'text-slate-600')}>
              {current.desc}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0 bg-black relative">
            <div id={readerId} className={cn("w-full aspect-square overflow-hidden bg-slate-900 transition-opacity duration-300", isShowingResult ? 'opacity-0 h-0' : 'opacity-100')}></div>
            
            {status === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                    <Button size="lg" onClick={startScanner} className="h-16 px-10 text-lg font-black shadow-2xl rounded-2xl bg-primary">
                        <Camera className="mr-3 h-6 w-6" /> Start Camera
                    </Button>
                </div>
            )}

            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/90 p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-rose-400 mb-4" />
                    <p className="text-white text-sm font-bold mb-6">{errorMessage}</p>
                    <Button variant="outline" onClick={startScanner} className="text-white border-white/20 hover:bg-white/10">
                        <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                    </Button>
                </div>
            )}

            {isShowingResult && lastGuest && (
              <div className="p-8 space-y-6 bg-white animate-in zoom-in-95 duration-300">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Guest Details</p>
                  <h3 className="text-3xl font-black text-slate-900 leading-tight">{lastGuest.name}</h3>
                  <p className="text-sm font-medium text-slate-500">{lastGuest.club}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pass Type</p>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <p className="text-sm font-bold text-slate-700">{lastGuest.role}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Meal Plan</p>
                    <div className="flex items-center gap-2">
                      <Utensils className={cn("h-4 w-4", lastGuest.foodPreference === 'veg' ? 'text-emerald-600' : 'text-slate-600')} />
                      <p className={cn("text-sm font-bold", lastGuest.foodPreference === 'veg' ? 'text-emerald-700' : 'text-slate-700')}>
                          {lastGuest.foodPreference === 'veg' ? 'Veg' : 'Non-Veg'}
                      </p>
                    </div>
                  </div>
                </div>

                {status === 'already_scanned' && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                    <p className="text-[9px] uppercase font-black text-amber-600 tracking-tighter">Original Check-in</p>
                    <p className="text-xs font-bold text-slate-900">{lastGuest.checkInTime ? format(parseISO(lastGuest.checkInTime), 'PPP p') : 'Already Logged'}</p>
                  </div>
                )}
              </div>
            )}

            {isShowingResult && !lastGuest && (
               <div className="p-12 text-center bg-white space-y-4">
                  <XCircle className="h-16 w-16 text-rose-600 mx-auto" />
                  <p className="font-bold text-slate-900">No registration record found for this pass.</p>
               </div>
            )}
          </CardContent>

          {/* Action Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
            {isShowingResult ? (
              <Button size="lg" onClick={startScanner} className="w-full h-14 text-lg font-black shadow-xl rounded-2xl bg-primary">
                <RefreshCw className="mr-2 h-5 w-5" /> Scan Next Guest
              </Button>
            ) : status === 'scanning' ? (
              <Button variant="outline" size="lg" onClick={stopScanner} className="w-full h-14 text-lg font-bold rounded-2xl border-slate-200">
                <StopCircle className="mr-2 h-5 w-5 text-rose-600" /> Cancel Scanning
              </Button>
            ) : null}
            
            {(status === 'idle' || isShowingResult) && (
              <Button variant="ghost" onClick={() => router.back()} className="w-full text-slate-500 font-bold">
                <LogOut className="mr-2 h-4 w-4" /> Close Entry Platform
              </Button>
            )}
          </div>
        </Card>

        <div className="text-center space-y-1 py-4">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">District Access Platform</p>
            <p className="text-[8px] text-white/10">v2.1 Secured Entry System</p>
        </div>
      </div>
    </div>
  );
}
