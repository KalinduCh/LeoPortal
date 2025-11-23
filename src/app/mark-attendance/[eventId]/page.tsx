
// src/app/mark-attendance/[eventId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Event } from '@/types';
import { getEvent } from '@/services/eventService';
import { markUserAttendance } from '@/services/attendanceService';
import { getCurrentPosition, calculateDistanceInMeters, MAX_ATTENDANCE_DISTANCE_METERS } from '@/lib/geolocation';
import { Loader2, CheckCircle, XCircle, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type Status = 'processing' | 'success' | 'error' | 'redirecting';

export default function MarkAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';
  
  const { user, isLoading: authLoading } = useAuth();
  
  const [status, setStatus] = useState<Status>('processing');
  const [message, setMessage] = useState('Verifying your details...');
  const [event, setEvent] = useState<Event | null>(null);

  const handleAttendance = useCallback(async (userId: string, eventId: string) => {
    try {
      const fetchedEvent = await getEvent(eventId);
      if (!fetchedEvent) {
        throw new Error("The event could not be found or has been removed.");
      }
      setEvent(fetchedEvent);
      
      setMessage('Checking event status and location...');

      // Geo-restriction check
      if (typeof fetchedEvent.latitude === 'number' && typeof fetchedEvent.longitude === 'number') {
        const position = await getCurrentPosition();
        const distance = calculateDistanceInMeters(
          position.latitude, 
          position.longitude, 
          fetchedEvent.latitude, 
          fetchedEvent.longitude
        );
        if (distance > MAX_ATTENDANCE_DISTANCE_METERS) {
          throw new Error(`You are too far from the event. You need to be within ${MAX_ATTENDANCE_DISTANCE_METERS}m, but you are ~${Math.round(distance)}m away.`);
        }
      }
      
      setMessage('Marking your attendance...');
      const result = await markUserAttendance(eventId, userId);

      if (result.status === 'success' || result.status === 'already_marked') {
        setStatus('success');
        setMessage(result.message);
      } else {
        throw new Error(result.message || "An unknown error occurred while marking attendance.");
      }

    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'An unexpected error occurred.');
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      // Wait for authentication state to be resolved
      return;
    }

    if (!eventId) {
      setStatus('error');
      setMessage('No event ID was provided in the link.');
      return;
    }
    
    if (user) {
      // User is logged in, process their attendance
      setStatus('processing');
      handleAttendance(user.id, eventId);
    } else {
      // User is not logged in, redirect to visitor page
      setStatus('redirecting');
      setMessage('You are not logged in. Redirecting to visitor attendance form...');
      router.replace(`/visiting-leo?eventId=${eventId}`);
    }
  }, [user, authLoading, eventId, router, handleAttendance]);

  const StatusIcon = () => {
    switch (status) {
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
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <StatusIcon />
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'success' && `Attendance for ${event?.name || 'Event'}`}
            {status === 'error' && 'Attendance Failed'}
            {status !== 'success' && status !== 'error' && 'Processing Attendance'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        {(status === 'success' || status === 'error') && (
            <CardContent>
                 <Button onClick={() => router.push('/dashboard')} className="w-full">
                    <Home className="mr-2 h-4 w-4" /> Go to Dashboard
                </Button>
            </CardContent>
        )}
      </Card>
    </div>
  );
}
