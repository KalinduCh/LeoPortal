// src/app/signup/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
// import { signupAction } from "@/app/actions/auth"; // Server action for validation
import { Fingerprint, Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [formLoading, setFormLoading] = React.useState(false);

  React.useEffect(() => {
    if (user && !authLoading) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);


  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    // const actionResult = await signupAction(null, formDataFromValues(values));
    // if (!actionResult.success) {
    //   toast({ title: "Signup Error", description: actionResult.message || "Please check your details.", variant: "destructive" });
    //   setFormLoading(false);
    //   return;
    // }

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
        <Fingerprint className="h-8 w-8" />
        <h1 className="text-2xl font-bold font-headline">LeoPortal</h1>
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

// function formDataFromValues(values: any) {
//   const formData = new FormData();
//   Object.keys(values).forEach(key => formData.append(key, values[key]));
//   return formData;
// }
