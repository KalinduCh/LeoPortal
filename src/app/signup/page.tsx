// src/app/signup/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  
  const [formLoading, setFormLoading] = React.useState(false);
  const [signupSuccess, setSignupSuccess] = React.useState(false); // New state to control UI
  const [signedUpUserName, setSignedUpUserName] = React.useState("");

  const logoUrl = "https://i.imgur.com/aRktweQ.png";

  React.useEffect(() => {
    if (user && !authLoading && user.status === 'approved') {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    const signedUpUser = await signup(values.name, values.email, values.password);
    
    if (signedUpUser) {
      // On success, update state to show the success message UI
      setSignedUpUserName(signedUpUser.name);
      setSignupSuccess(true);
    } else {
      toast({ title: "Signup Failed", description: "Could not create account. The email might already be in use.", variant: "destructive" });
    }
    setFormLoading(false);
  };

  if (authLoading) {
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

      {signupSuccess ? (
        <Card className="w-full max-w-md shadow-xl text-center">
            <CardHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold mt-4">Registration Successful!</CardTitle>
                <CardDescription>
                    Welcome, {signedUpUserName}! Your account has been created and is now pending admin approval.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    You will receive a notification once your account is approved. After approval, you will be able to log in.
                </p>
                <Button onClick={() => router.push('/login')} className="w-full">
                    Proceed to Login <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardContent>
        </Card>
      ) : (
        <>
            <AuthForm mode="signup" onSubmit={handleSubmit} loading={formLoading} />
            <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                Log in
                </Link>
            </p>
        </>
      )}
    </div>
  );
}
