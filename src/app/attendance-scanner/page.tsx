
// src/app/attendance-scanner/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { Event, User } from '@/types';
import { getEvent } from '@/services/eventService';
import { markUserAttendance } from '@/services/attendanceService';
import { getCurrentPosition, calculateDistanceInMeters, MAX_ATTENDANCE_DISTANCE_METERS } from '@/lib/geolocation';
import { Loader2, CameraOff, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type ScanStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

export default function AttendanceScannerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    const { toast } = useToast();

    const [status, setStatus] = useState<ScanStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('Initializing scanner...');
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const eventIdFromUrl = searchParams.get('eventId');

    const onScanSuccess = useCallback(async (decodedText: string, decodedResult: any) => {
        if (status !== 'scanning') return;
        
        setStatus('processing');
        setStatusMessage('QR Code detected. Processing attendance...');

        try {
            const url = new URL(decodedText);
            const eventId = url.searchParams.get('eventId');
            
            if (!eventId) {
                throw new Error("Invalid QR Code: Event ID not found.");
            }

            if (scannerRef.current) {
                await scannerRef.current.stop();
            }

            // If user is logged in, mark their attendance directly.
            if (user) {
                await processMemberAttendance(eventId, user);
            } else {
                // If not logged in, redirect to the visitor page for that event.
                toast({
                    title: "Visitor Detected",
                    description: "Redirecting you to the visitor attendance form...",
                });
                router.push(`/visiting-leo?eventId=${eventId}`);
            }

        } catch (error: any) {
            console.error("Scan processing error:", error);
            setStatus('error');
            setStatusMessage(error.message || "Failed to process QR Code. Please try again.");
        }
    }, [status, user, router, toast]);

    const processMemberAttendance = async (eventId: string, member: User) => {
        try {
            const event = await getEvent(eventId);
            if (!event) {
                throw new Error("Event not found. The QR code may be for an invalid or deleted event.");
            }

            const isGeoRestrictionActive = typeof event.latitude === 'number' && typeof event.longitude === 'number';
            let userLatitude: number | undefined;
            let userLongitude: number | undefined;

            if (isGeoRestrictionActive && event.latitude && event.longitude) {
                setStatusMessage("Verifying your location...");
                const position = await getCurrentPosition();
                userLatitude = position.latitude;
                userLongitude = position.longitude;

                const distance = calculateDistanceInMeters(userLatitude, userLongitude, event.latitude, event.longitude);

                if (distance > MAX_ATTENDANCE_DISTANCE_METERS) {
                    throw new Error(`You are too far from the event. You are ~${Math.round(distance)}m away, but need to be within ${MAX_ATTENDANCE_DISTANCE_METERS}m.`);
                }
                setStatusMessage("Location verified. Marking attendance...");
            }

            const result = await markUserAttendance(eventId, member.id, userLatitude, userLongitude);
            if (result.status === 'success' || result.status === 'already_marked') {
                setStatus('success');
                setStatusMessage(result.message);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Member attendance processing error:", error);
            setStatus('error');
            setStatusMessage(error.message || "An unexpected error occurred while marking attendance.");
        }
    };

    useEffect(() => {
        const startScanner = async () => {
            if (authLoading) return;
            // If eventId is in URL and user is logged in, process immediately without scanning
            if (eventIdFromUrl && user) {
                setStatus('processing');
                setStatusMessage('Event link detected. Processing attendance...');
                await processMemberAttendance(eventIdFromUrl, user);
                return;
            }
            if (eventIdFromUrl && !user) {
                setStatus('processing');
                setStatusMessage('Redirecting to visitor form...');
                router.push(`/visiting-leo?eventId=${eventIdFromUrl}`);
                return;
            }


            // Otherwise, start the scanner
            if (scannerRef.current) return;
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedformats: [Html5QrcodeSupportedFormats.QR_CODE]
            };
            const html5QrCode = new Html5Qrcode("qr-reader");
            scannerRef.current = html5QrCode;

            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    onScanSuccess,
                    (errorMessage) => { /* Ignore scan errors */ }
                );
                setStatus('scanning');
                setStatusMessage('Point your camera at an event QR Code.');
                setHasCameraPermission(true);
            } catch (err) {
                console.error("Failed to start QR scanner:", err);
                setStatus('error');
                setStatusMessage("Could not access camera. Please grant permission and refresh the page.");
                setHasCameraPermission(false);
            }
        };
        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Failed to stop scanner on cleanup:", err));
            }
        };
    }, [authLoading, user, eventIdFromUrl, onScanSuccess, router]);
    
    const renderStatusIcon = () => {
        switch (status) {
            case 'idle':
            case 'processing':
                return <Loader2 className="h-16 w-16 animate-spin text-primary" />;
            case 'scanning':
                return null; // The video feed is the main content
            case 'success':
                return <CheckCircle className="h-16 w-16 text-green-500" />;
            case 'error':
                 return <XCircle className="h-16 w-16 text-destructive" />;
            case 'camera_denied':
                return <CameraOff className="h-16 w-16 text-muted-foreground" />;
            default:
                return null;
        }
    };


    return (
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Scan Attendance QR Code</CardTitle>
                    <CardDescription>{statusMessage}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-4 min-h-[300px]">
                    <div id="qr-reader" className={cn("w-full max-w-[300px]", status !== 'scanning' && 'hidden')}></div>
                     {status !== 'scanning' && (
                        <div className="flex flex-col items-center justify-center text-center">
                            {renderStatusIcon()}
                            {hasCameraPermission === false && (
                                 <Alert variant="destructive" className="mt-4">
                                  <AlertTitle>Camera Access Required</AlertTitle>
                                  <AlertDescription>
                                    Please allow camera access in your browser settings to use the scanner.
                                  </AlertDescription>
                                </Alert>
                            )}
                            {status === 'success' && (
                                <Button onClick={() => router.push('/dashboard')} className="mt-6">Back to Dashboard</Button>
                            )}
                             {status === 'error' && (
                                <Button variant="outline" onClick={() => window.location.reload()} className="mt-6">Try Again</Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
