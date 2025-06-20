
// src/app/login/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image"; // Import Image
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
// import { loginAction } from "@/app/actions/auth"; // Not directly used for submission logic here
import { Loader2, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading, user } = useAuth();
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
    const loggedInUser = await login(values.email, values.password);
    if (loggedInUser) {
      toast({ title: "Login Successful", description: `Welcome back, ${loggedInUser.name}!` });
      router.push("/dashboard");
    } else {
      toast({ title: "Login Failed", description: "Invalid email or password. Please try again.", variant: "destructive" });
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
      <AuthForm mode="login" onSubmit={handleSubmit} loading={formLoading} />
      <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
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
