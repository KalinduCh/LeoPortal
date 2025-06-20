
// src/app/signup/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image"; // Import Image
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [formLoading, setFormLoading] = React.useState(false);
  const logoUrl = "https://i.imgur.com/aRktweQ.png";

  React.useEffect(() => {
    if (user && !authLoading) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    const signedUpUser = await signup(values.name, values.email, values.password);
    if (signedUpUser) {
      toast({ title: "Signup Successful", description: `Welcome, ${signedUpUser.name}! Your account has been created.` });
      router.push("/dashboard");
    } else {
      toast({ title: "Signup Failed", description: "Could not create account. The email might already be in use.", variant: "destructive" });
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
      <AuthForm mode="signup" onSubmit={handleSubmit} loading={formLoading} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
