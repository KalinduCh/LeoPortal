"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, CheckCircle, ArrowLeft, ShieldPlus } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export default function EntrivoSignupPage() {
  const router = useRouter();
  const { signup, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [formLoading, setFormLoading] = React.useState(false);
  const [signupSuccess, setSignupSuccess] = React.useState(false);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    setFormLoading(true);
    // Source: 'entrivo' marks this user for organizer access
    const result = await signup(values.name, values.email, values.password, 'entrivo');
    
    if (result) {
      setSignupSuccess(true);
    } else {
      toast({ title: "Registration Failed", description: "The email might already be in use.", variant: "destructive" });
    }
    setFormLoading(false);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
            <Image src="https://i.imgur.com/MP1YFNf.png" alt="LeoEntrivo Logo" width={80} height={80} className="mx-auto rounded-full shadow-lg mb-4" />
            <h1 className="text-3xl font-black font-headline text-primary tracking-tight uppercase">LeoEntrivo</h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Register as Organizer</p>
        </div>

        {signupSuccess ? (
          <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white">
            <div className="bg-emerald-600 p-8 text-white text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-4" />
              <CardTitle className="text-2xl font-black">Application Received</CardTitle>
            </div>
            <CardContent className="p-8 text-center space-y-6">
              <p className="text-slate-600 font-medium">
                Your request to join the <strong>District Access Platform</strong> has been submitted.
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-sm text-slate-500 italic">
                A Super Admin will review your credentials and grant access shortly. You will receive an email once approved.
              </div>
              <Button asChild className="w-full h-12 rounded-xl">
                <Link href="/event-access/login">Return to Login</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl border-none ring-1 ring-slate-200 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-900 p-8 text-white">
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldPlus className="h-5 w-5 text-primary" /> Create Account
              </CardTitle>
              <CardDescription className="text-slate-400">Join the district event management network.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} className="rounded-xl h-12" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Email</FormLabel>
                        <FormControl><Input placeholder="john@example.com" {...field} className="rounded-xl h-12" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secure Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} className="rounded-xl h-12" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-14 text-lg font-black shadow-lg rounded-xl mt-4" disabled={formLoading}>
                    {formLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Request Organizer Access"}
                  </Button>
                </form>
              </Form>
              
              <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500">
                    Already an organizer?{" "}
                    <Link href="/event-access/login" className="text-primary font-bold hover:underline">Log in</Link>
                  </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
