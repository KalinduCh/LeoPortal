// src/app/login/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { loginAction } from "@/app/actions/auth"; // Assuming server action might be used for pre-validation or similar
import { Fingerprint, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [formLoading, setFormLoading] = React.useState(false);

  React.useEffect(() => {
    if (user && !authLoading) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    // Server action for validation (optional, can be client-only with useAuth)
    // const actionResult = await loginAction(null, formDataFromValues(values));
    // if (!actionResult.success) {
    //   toast({ title: "Login Error", description: actionResult.message || "Invalid credentials.", variant: "destructive" });
    //   setFormLoading(false);
    //   return;
    // }

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
        <Fingerprint className="h-8 w-8" />
        <h1 className="text-2xl font-bold font-headline">LeoPortal</h1>
      </div>
      <AuthForm mode="login" onSubmit={handleSubmit} loading={formLoading} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

// Helper to convert values to FormData if using server actions
// function formDataFromValues(values: any) {
//   const formData = new FormData();
//   Object.keys(values).forEach(key => formData.append(key, values[key]));
//   return formData;
// }
