
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, ArrowRight, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';

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
    
    if (result.success && result.user) {
      if (result.user.role === 'member' && result.user.source !== 'entrivo') {
          toast({ title: "Permission Denied", description: "Standard club members cannot access the organizer portal.", variant: "destructive" });
          setIsLoading(false);
          return;
      }
      toast({ title: "Authorized", description: "Welcome to the LeoEntrivo management portal." });
      router.push('/event-access/admin');
    } else {
      if (result.reason === 'pending') {
          toast({ title: "Account Pending", description: "Your organizer account is awaiting admin approval.", variant: "default" });
      } else {
          toast({ title: "Access Denied", description: "Invalid credentials or unauthorized account.", variant: "destructive" });
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="h-24 w-24 mx-auto rounded-full bg-white shadow-xl ring-4 ring-primary/10 flex items-center justify-center overflow-hidden border-2 border-slate-50">
            <Image src="https://i.imgur.com/j53LmxF.png" alt="Leo Logo" width={70} height={70} className="object-contain" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black font-headline text-primary tracking-tight uppercase">LeoEntrivo</h1>
            <p className="text-muted-foreground text-xs uppercase tracking-[0.3em] font-black">Organizer Command Portal</p>
          </div>
        </div>

        <Card className="shadow-2xl border-none ring-1 ring-slate-200 rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 p-8 text-white">
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Security Gateway
            </CardTitle>
            <CardDescription className="text-slate-400">Enter organizer credentials to manage registrations.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Admin Email</Label>
                <Input type="email" required className="h-12 rounded-xl bg-slate-50 border-slate-200" value={email} onChange={e => setEmail(e.target.value)} placeholder="organizer@leoentrivo.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Secure Password</Label>
                <Input type="password" required className="h-12 rounded-xl bg-slate-50 border-slate-200" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full h-14 text-lg font-black shadow-lg rounded-xl bg-primary hover:scale-[1.02] transition-transform" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Identity"}
                {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500 mb-4 font-medium">New organizer for a district event?</p>
                <Button asChild variant="outline" className="w-full h-12 rounded-xl border-dashed border-primary/40 text-primary font-bold hover:bg-primary/5">
                    <Link href="/event-access/signup">
                        <UserPlus className="mr-2 h-4 w-4" /> Request Access Pass
                    </Link>
                </Button>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-[10px] text-slate-400 uppercase font-black tracking-widest opacity-50">
          Authorized District Personnel Only
        </p>
      </div>
    </div>
  );
}
