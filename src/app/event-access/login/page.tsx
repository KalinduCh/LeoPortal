
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function AccessLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await login(email, password);
    if (result.success) {
      toast({ title: "Welcome to Platform", description: "You are logged in as an event organizer." });
      router.push('/event-access/admin');
    } else {
      toast({ title: "Login Failed", description: "Invalid credentials or unauthorized access.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Image src="https://i.imgur.com/MP1YFNf.png" alt="District Logo" width={80} height={80} className="mx-auto rounded-full shadow-lg mb-4" />
          <h1 className="text-3xl font-bold font-headline text-primary tracking-tight">ORGANIZER LOGIN</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">District Event Management System</p>
        </div>

        <Card className="shadow-2xl border-primary/10">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Admin Portal
            </CardTitle>
            <CardDescription>Enter your credentials to manage district registrations.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="organizer@distict.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full h-12 text-lg shadow-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Access Platform"}
                {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground">
          This system is strictly for authorized District Event Organizers.
        </p>
      </div>
    </div>
  );
}
