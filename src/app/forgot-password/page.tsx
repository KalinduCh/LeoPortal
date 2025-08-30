
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
import { Loader2, Mail, CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { sendPasswordResetEmail, isLoading: authLoading } = useAuth();
  const [formLoading, setFormLoading] = React.useState(false);
  const [formSubmitted, setFormSubmitted] = React.useState(false);
  const { toast } = useToast();
  const logoUrl = "https://i.imgur.com/aRktweQ.png";

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    setFormLoading(true);
    const result = await sendPasswordResetEmail(values.email);
    if (result.success) {
      setFormSubmitted(true);
    } else {
      toast({
        title: "Error",
        description: result.message || "Could not send password reset email. Please try again.",
        variant: "destructive",
      });
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
        <Link href="/">
          <Image 
              src={logoUrl} 
              alt="LEO Portal Logo" 
              width={32} 
              height={32} 
              className="h-8 w-8 rounded-sm"
              data-ai-hint="club logo"
          />
        </Link>
        <h1 className="text-2xl font-bold font-headline">LEO Portal</h1>
      </div>
      
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center font-headline">
            {formSubmitted ? "Check Your Email" : "Forgot Password"}
          </CardTitle>
          <CardDescription className="text-center">
            {formSubmitted 
              ? "A password reset link has been sent to the email address you provided."
              : "No problem. Enter your email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formSubmitted ? (
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="text-muted-foreground text-sm">
                If you don&apos;t see the email, please check your spam folder. The link will be valid for a limited time.
              </p>
              <Link href="/login" passHref>
                <Button className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                <Button type="submit" className="w-full" disabled={formLoading}>
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
      
      {!formSubmitted && (
         <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
        </p>
      )}

    </div>
  );
}
