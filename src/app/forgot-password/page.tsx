
// src/app/forgot-password/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, MailCheck, ArrowLeft, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { sendPasswordResetEmail, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = React.useState("");
  const logoUrl = "https://i.imgur.com/aRktweQ.png";

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setLoading(true);
    setError(null);
    setSubmitted(false);
    const result = await sendPasswordResetEmail(values.email);

    if (result.success) {
      setSubmitted(true);
      setSubmittedEmail(values.email);
    } else {
      let errorMessage = "An unknown error occurred. Please try again.";
      if (result.error?.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
      }
      setError(errorMessage);
    }
    setLoading(false);
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
      <div className="w-full max-w-md">
        {submitted ? (
            <Card className="w-full max-w-md shadow-xl text-center">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                        <MailCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold mt-4">Check Your Email</CardTitle>
                    <CardDescription>
                        A password reset link has been sent to your inbox.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        If an account exists for <strong>{submittedEmail}</strong>, you will receive an email with instructions on how to reset your password. Please check your spam folder if you don't see it.
                    </p>
                    <Button asChild className="w-full">
                        <Link href="/login">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Login
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        ) : (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center font-headline">Reset Password</CardTitle>
              <CardDescription className="text-center">
                Enter your email and we&apos;ll send you a link to get back into your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
      {!submitted && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      )}
    </div>
  );
}
