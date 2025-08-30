
// src/app/login/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [formLoading, setFormLoading] = React.useState(false);
  const [loginMessage, setLoginMessage] = React.useState<{type: 'error' | 'info', text: string} | null>(null);
  const logoUrl = "https://i.imgur.com/aRktweQ.png";

  React.useEffect(() => {
    if (user && !authLoading) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    setLoginMessage(null); // Clear previous messages
    const result = await login(values.email, values.password);
    
    if (result.success && result.user) {
      toast({ title: "Login Successful", description: `Welcome back, ${result.user.name}!` });
      router.push("/dashboard");
    } else {
      if (result.reason === 'pending') {
          setLoginMessage({ 
              type: 'info', 
              text: 'Your account is awaiting admin approval. Please check back later or contact an administrator if you believe this is an error.' 
          });
      } else {
          // For 'not_found' or 'invalid_credentials'
          setLoginMessage({ type: 'error', text: 'Invalid email or password. Please try again.' });
      }
    }
    setFormLoading(false);
  };
  
  if (authLoading || user) {
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
          <Link href="/forgot-password" passHref>
             <span className="font-medium text-primary hover:underline cursor-pointer">Forgot your password?</span>
          </Link>
        </p>
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
        <p>
          Visiting Leo?{" "}
          <Link href="/visiting-leo" className="font-medium text-primary hover:underline flex items-center justify-center">
            <UserCheck className="mr-1 h-4 w-4" /> Mark Your Attendance
          </Link>
        </p>
      </div>
    </div>
  );
}
