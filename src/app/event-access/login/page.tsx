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
      toast({ title: "Authorized", description: "Welcome to the LeoEntrivo management portal." });
      router.push('/event-access/admin');
    } else {
      toast({ title: "Access Denied", description: "Invalid credentials or unauthorized account.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Image src="https://i.imgur.com/MP1YFNf.png" alt="LeoEntrivo Logo" width={80} height={80} className="mx-auto rounded-full shadow-lg mb-4" />
          <h1 className="text-3xl font-black font-headline text-primary tracking-tight uppercase">LeoEntrivo</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Organizer Command Portal</p>
        </div>

        <Card className="shadow-2xl border-none ring-1 ring-slate-200">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Security Gateway
            </CardTitle>
            <CardDescription>Enter organizer credentials to manage district registrations.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Admin Email</Label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="organizer@leoentrivo.com" />
              </div>
              <div className="space-y-2">
                <Label>Secure Password</Label>
                <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full h-14 text-lg font-black shadow-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Identity"}
                {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-[10px] text-slate-400 uppercase font-black tracking-widest">
          Authorized Event Personnel Only
        </p>
      </div>
    </div>
  );
}
