// src/app/attendance-scanner/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Event, User } from '@/types';
import { getEvent } from '@/services/eventService';
import { markUserAttendance } from '@/services/attendanceService';
import { getCurrentPosition, calculateDistanceInMeters, MAX_ATTENDANCE_DISTANCE_METERS } from '@/lib/geolocation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type ScanStatus = 'initializing' | 'processing' | 'success' | 'error' | 'redirecting';

export default function AttendanceScannerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    const { toast } = useToast();

    const [status, setStatus] = useState<ScanStatus>('initializing');
    const [statusMessage, setStatusMessage] = useState('Initializing...');
    const eventId = searchParams.get('eventId');

    const processMemberAttendance = useCallback(async (eventId: string, member: User) => {
        setStatus('processing');
        setStatusMessage('Event link detected. Processing your attendance...');
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
    }, []);

    useEffect(() => {
        if (authLoading) {
            return; // Wait until auth state is confirmed
        }

        if (!eventId) {
            setStatus('error');
            setStatusMessage("No Event ID provided in the link. Please scan a valid QR code.");
            return;
        }
        
        if (user) {
            // User is logged in, process their attendance
            processMemberAttendance(eventId, user);
        } else {
            // User is not logged in (visitor), redirect to the visitor form
            setStatus('redirecting');
            setStatusMessage("You are not logged in. Redirecting to visitor attendance form...");
            toast({
                title: "Visitor Detected",
                description: "Please fill out the form to mark your attendance.",
            });
            router.replace(`/visiting-leo?eventId=${eventId}`);
        }

    }, [authLoading, user, eventId, router, toast, processMemberAttendance]);
    
    const renderStatusIcon = () => {
        switch (status) {
            case 'initializing':
            case 'processing':
            case 'redirecting':
                return <Loader2 className="h-16 w-16 animate-spin text-primary" />;
            case 'success':
                return <CheckCircle className="h-16 w-16 text-green-500" />;
            case 'error':
                 return <XCircle className="h-16 w-16 text-destructive" />;
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Processing Attendance</CardTitle>
                    <CardDescription>{statusMessage}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-4 min-h-[200px]">
                    <div className="flex flex-col items-center justify-center text-center">
                        {renderStatusIcon()}
                        {(status === 'success' || status === 'error') && (
                            <Button onClick={() => router.push('/dashboard')} className="mt-6">
                                Back to Dashboard
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
