// src/app/login/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { markUserAttendance } from '@/services/attendanceService';
import { getCurrentPosition, calculateDistanceInMeters, MAX_ATTENDANCE_DISTANCE_METERS } from '@/lib/geolocation';
import { getEvent } from "@/services/eventService";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [formLoading, setFormLoading] = React.useState(false);
  const [loginMessage, setLoginMessage] = React.useState<{type: 'error' | 'info', text: string} | null>(null);
  const logoUrl = "https://i.imgur.com/aRktweQ.png";
  const eventId = searchParams.get('eventId');

  React.useEffect(() => {
    // If a user is already logged in and there's no eventId, redirect them.
    if (user && !authLoading && !eventId) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router, eventId]);

  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    setLoginMessage(null);
    const result = await login(values.email, values.password);
    
    if (result.success && result.user) {
      // If login is successful, check if there's an eventId from a QR code scan
      if (eventId) {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${result.user.name}! Marking your attendance...`,
          icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
          duration: 5000,
        });
        
        try {
          const event = await getEvent(eventId);
          if (!event) throw new Error("Event not found.");
          
          let userLatitude, userLongitude;
          if (typeof event.latitude === 'number' && typeof event.longitude === 'number') {
             const position = await getCurrentPosition();
             userLatitude = position.latitude;
             userLongitude = position.longitude;
             const distance = calculateDistanceInMeters(userLatitude, userLongitude, event.latitude, event.longitude);
             if (distance > MAX_ATTENDANCE_DISTANCE_METERS) {
                throw new Error(`You are too far from the event. You need to be within ${MAX_ATTENDANCE_DISTANCE_METERS}m.`);
             }
          }

          const attendanceResult = await markUserAttendance(eventId, result.user.id, userLatitude, userLongitude);
          if (attendanceResult.status === 'success' || attendanceResult.status === 'already_marked') {
            toast({
              title: "Attendance Marked!",
              description: attendanceResult.message,
              icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
          } else {
             throw new Error(attendanceResult.message);
          }
        } catch (error: any) {
            toast({ title: "Attendance Failed", description: error.message || "Could not mark attendance.", variant: "destructive" });
        } finally {
            router.push("/dashboard");
        }
      } else {
        toast({ title: "Login Successful", description: `Welcome back, ${result.user.name}!` });
        router.push("/dashboard");
      }
    } else {
      if (result.reason === 'pending') {
          setLoginMessage({ 
              type: 'info', 
              text: 'Your account is awaiting admin approval. Please check back later or contact an administrator if you believe this is an error.' 
          });
      } else {
          setLoginMessage({ type: 'error', text: 'Invalid email or password. Please try again.' });
      }
      setFormLoading(false);
    }
  };
  
  if (authLoading || (user && !eventId)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
       <div className="absolute top-8 left-8 flex items-center space-x-2 text-primary">
        <Image 
            src={logoUrl} 
            alt="LEO Portal Logo" 
            width={32} 
            height={32} 
            className="h-8 w-8 rounded-sm"
            data-ai-hint="club logo"
        />
        <h1 className="text-2xl font-bold font-headline">LEO Portal</h1>
      </div>
      <div className="w-full max-w-md space-y-4">
        {eventId && (
             <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle>Event Attendance</AlertTitle>
                <AlertDescription>Please log in to automatically mark your attendance for the event.</AlertDescription>
            </Alert>
        )}
        {loginMessage && (
            <Alert variant={loginMessage.type === 'error' ? 'destructive' : 'default'} className={loginMessage.type === 'info' ? 'border-primary/20 bg-primary/5' : ''}>
                {loginMessage.type === 'error' ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Info className="h-4 w-4 text-primary" />}
                <AlertTitle>{loginMessage.type === 'error' ? 'Login Failed' : 'Account Status'}</AlertTitle>
                <AlertDescription>{loginMessage.text}</AlertDescription>
            </Alert>
        )}
        <AuthForm mode="login" onSubmit={handleSubmit} loading={formLoading} />
      </div>
       <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
        <p>
          Visiting Leo?{" "}
          <Link href={`/visiting-leo${eventId ? `?eventId=${eventId}`: ''}`} className="font-medium text-primary hover:underline flex items-center justify-center">
            <UserCheck className="mr-1 h-4 w-4" /> Mark Your Attendance
          </Link>
        </p>
      </div>
    </div>
  );
}
