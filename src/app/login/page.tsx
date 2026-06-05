// src/app/login/page.tsx
"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, AlertTriangle, Info, Trophy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { markUserAttendance } from "@/services/attendanceService";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [formLoading, setFormLoading] = React.useState(false);
  const [loginMessage, setLoginMessage] = React.useState<{type: 'error' | 'info', text: string} | null>(null);
  const logoUrl = "https://i.imgur.com/aRktweQ.png";
  const eventId = searchParams.get('eventId');

  React.useEffect(() => {
    if (user && !authLoading) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    setLoginMessage(null);
    const result = await login(values.email, values.password);
    
    if (result.success && result.user) {
        toast({ title: "Login Successful", description: `Welcome back, ${result.user.name}!` });
        
        if (eventId) {
            try {
                toast({ title: "Marking Attendance...", description: "Please wait.", duration: 3000 });
                const attendanceResult = await markUserAttendance(eventId, result.user.id);
                if (attendanceResult.status === 'success' || attendanceResult.status === 'already_marked') {
                    toast({ title: "Attendance Marked", description: attendanceResult.message, duration: 5000 });
                } else {
                    toast({ title: "Attendance Error", description: attendanceResult.message, variant: "destructive", duration: 8000 });
                }
            } catch (error: any) {
                console.error("Auto-attendance error:", error);
            }
        }
    } else {
      if (result.reason === 'pending') {
          setLoginMessage({ 
              type: 'info', 
              text: 'Your account is awaiting admin approval. Please check back later.' 
          });
      } else {
          setLoginMessage({ type: 'error', text: 'Invalid email or password. Please try again.' });
      }
      setFormLoading(false);
    }
  };
  
  if (authLoading || (user && !authLoading)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
       {/* Award Badge for Login Page */}
       <div className="absolute top-8 right-8 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-right duration-1000">
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full text-[10px] font-black text-yellow-600 tracking-widest shadow-sm">
             <Trophy className="h-3 w-3" /> BEST INNOVATIVE PROJECT
          </div>
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full text-[10px] font-black text-primary tracking-widest shadow-sm">
             <Trophy className="h-3 w-3" /> BEST IT ENABLED CLUB
          </div>
       </div>

       <div className="absolute top-8 left-8 flex items-center space-x-2 text-primary">
        <Image 
            src={logoUrl} 
            alt="LEO Portal Logo" 
            width={32} 
            height={32} 
            className="h-8 w-8 rounded-sm"
            data-ai-hint="club logo"
        />
        <h1 className="text-2xl font-bold font-headline text-slate-900 tracking-tighter">LEO Portal</h1>
      </div>
      <div className="w-full max-w-md space-y-4">
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

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
